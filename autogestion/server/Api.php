<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/InvoiceDocuments.php';
require_once __DIR__.'/Payments.php';
require_once __DIR__.'/Services.php';
require_once __DIR__.'/PaymentHistory.php';
require_once __DIR__.'/Wifi.php';

function startSession(array $c,string $dir): void {
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1'); ini_set('session.use_trans_sid','0');
    ini_set('session.gc_maxlifetime',(string)$c['max_seconds']);
    session_save_path($dir); session_name('MIUSITTEL_'.strtoupper($c['mode']));
    session_set_cookie_params(['lifetime'=>0,'path'=>'/autogestion/','secure'=>(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off'), 'httponly'=>true,'samesite'=>'Strict']);
    session_start();
    $fingerprint=hash('sha256',json_encode([$c['mode'],$c['allowed_idas'],$c['lab_users'],$c['phantom_url']??'',$c['api_user']??'',
        $c['customer_id_field']??null,$c['phantom_auth_mode']??null,$c['service_login_idas']??[1],'services-v2-payment-history']));
    $now=time();
    if (isset($_SESSION['ida']) && (($_SESSION['config']??'')!==$fingerprint || $now-($_SESSION['last']??0)>=$c['idle_seconds'] || $now-($_SESSION['started']??0)>=$c['max_seconds'])) {
        $_SESSION=[]; session_regenerate_id(true);
    }
    $_SESSION['config']=$fingerprint;
    $_SESSION['csrf']??=bin2hex(random_bytes(32));
    if(isset($_SESSION['ida'])) $_SESSION['last']=$now;
}
function jsonReply(array $data,int $code=200): never {
    http_response_code($code); header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private'); header('Pragma: no-cache');
    echo json_encode($data,JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE); exit;
}
function body(): array {
    if(!str_starts_with($_SERVER['CONTENT_TYPE']??'','application/json')) throw new Failure('BAD_REQUEST',400);
    if((int)($_SERVER['CONTENT_LENGTH']??0)>4096) throw new Failure('BAD_REQUEST',400);
    $raw=file_get_contents('php://input',false,null,0,4097);
    if(strlen($raw)>4096) throw new Failure('BAD_REQUEST',400);
    try {$data=json_decode($raw,true,8,JSON_THROW_ON_ERROR);} catch(\JsonException) {throw new Failure('BAD_REQUEST',400);}
    if(!is_array($data) || array_is_list($data) && $data!==[]) throw new Failure('BAD_REQUEST',400);
    return $data;
}
function csrf(): void {
    $sent=$_SERVER['HTTP_X_CSRF_TOKEN']??'';
    if(!is_string($sent) || !hash_equals($_SESSION['csrf'],$sent)) throw new Failure('CSRF',403);
    if(isset($_SERVER['HTTP_ORIGIN'])) {
        $scheme=(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off')?'https':'http';
        if($_SERVER['HTTP_ORIGIN']!==$scheme.'://'.($_SERVER['HTTP_HOST']??'')) throw new Failure('CSRF',403);
    }
    if(($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site') throw new Failure('CSRF',403);
}
function api(array $c,string $dir,Phantom $ph,string $route,?InvoiceDocumentSource $documents=null,?SiroGateway $siro=null,?PaymentHistorySource $paymentHistory=null): never {
    startSession($c,$dir);
    $method=$_SERVER['REQUEST_METHOD'];
    $expected=['bootstrap'=>'GET','login'=>'POST','logout'=>'POST','select-service'=>'POST','overview'=>'GET','invoices'=>'GET','invoice'=>'GET','invoice-document'=>'GET','payment-history'=>'GET','payment-receipt'=>'GET','payments'=>'GET','payment-create'=>'POST','payment-reconcile'=>'POST','payment-post'=>'POST'];
    $expected+=['service-connection'=>'POST','speedtest-start'=>'POST'];
    $expected+=['wifi-prepare'=>'POST','wifi-change'=>'POST'];
    if(!isset($expected[$route])) throw new Failure('NOT_FOUND',404);
    if($method!==$expected[$route]) throw new Failure('METHOD',405);
    $allowedQuery=match($route) {'invoices'=>['offset'],'invoice','invoice-document','payment-receipt'=>['id'],default=>[]};
    if(array_diff(array_keys($_GET),$allowedQuery)) throw new Failure('BAD_REQUEST',400);
    if($route==='bootstrap') {
        $sessionIds=array_map('intval',array_column($_SESSION['authorized_services']??[],'id'));$selected=$_SESSION['selected_ida']??null;
        jsonReply(['mode'=>$c['mode'],'authenticated'=>isset($_SESSION['ida']),'csrf'=>$_SESSION['csrf'],
            'payments_enabled'=>siroLabService(siroConfig($c),$sessionIds,$selected),
            'phantom_posting_enabled'=>phantomPostingLabService(phantomPostingConfig($c),$sessionIds,$selected),
            'payment_history_enabled'=>paymentHistoryEnabledForSession()]+serviceSession());
    }
    if($method==='POST') csrf();
    if($route==='logout') {
        if(body()!==[]) throw new Failure('BAD_REQUEST',400);
        $_SESSION=[]; session_destroy();
        $p=session_get_cookie_params(); setcookie(session_name(),'', ['expires'=>time()-3600,'path'=>$p['path'],'secure'=>$p['secure'],'httponly'=>true,'samesite'=>'Strict']);
        jsonReply(['ok'=>true]);
    }
    if($route==='login') {
        $b=body();
        if(array_diff(array_keys($b),['username','password']) || !is_string($b['username']??null) || !is_string($b['password']??null)
            || strlen($b['username'])>128 || strlen($b['password'])>512 || $b['username']==='' || $b['password']==='') throw new Failure('INVALID_CREDENTIALS',401);
        $candidate=resolveUser($b['username'],$c);
        $remote=$_SERVER['REMOTE_ADDR']??'unknown';
        rateLimitBegin($dir,$b['username'],$remote,$candidate);
        try {
            // Login eligibility is not session authorization: read only this candidate.
            if($c['mode']==='phantom' && $candidate!==null) $ph->scope([$candidate]);
            $valid=$c['mode']==='demo' ? hash_equals('agustin.demo',$b['username']) && hash_equals('usittel-demo',$b['password']) : $candidate!==null && $ph->verify($candidate,$b['username'],$b['password']);
        } catch(\Throwable $e) {
            // Provider/configuration failures are not credential failures.
            rateLimitRelease($dir,$b['username'],$remote,$candidate); unset($b); throw $e;
        }
        if(!$valid) { unset($b); throw new Failure('INVALID_CREDENTIALS',401); }
        rateLimitRelease($dir,$b['username'],$remote,$candidate);
        $portalState=null;
        if($c['mode']==='phantom' && $paymentHistory!==null) {
            try {$portalState=$paymentHistory->authenticate($b['username'],$b['password']);}
            catch(\Throwable $e) {diagnostic($e instanceof Failure?$e:new Failure('PAYMENT_PORTAL_AUTH'));}
        }
        unset($b);
        $discovery=$c['mode']==='phantom'?discoverServices($ph,$candidate):['services'=>[],'servicesUnavailable'=>false];
        $fingerprint=$_SESSION['config']; $_SESSION=[]; session_regenerate_id(true);
        $_SESSION=['ida'=>$c['mode']==='demo'?0:$candidate,'started'=>time(),'last'=>time(),'config'=>$fingerprint,'csrf'=>bin2hex(random_bytes(32))];
        if($c['mode']==='phantom') {
            $_SESSION['authenticated_ida']=$candidate;$_SESSION['selected_ida']=$candidate;
            $_SESSION['authorized_services']=$discovery['services'];$_SESSION['services_unavailable']=$discovery['servicesUnavailable'];
            $_SESSION['service_revision']=bin2hex(random_bytes(16));
            if(is_array($portalState)) $_SESSION['payment_portal']=['ida'=>$candidate,'state'=>$portalState];
        }
        $sessionIds=array_map('intval',array_column($_SESSION['authorized_services']??[],'id'));$selected=$_SESSION['selected_ida']??null;
        jsonReply(['authenticated'=>true,'csrf'=>$_SESSION['csrf'],
            'payments_enabled'=>siroLabService(siroConfig($c),$sessionIds,$selected),
            'phantom_posting_enabled'=>phantomPostingLabService(phantomPostingConfig($c),$sessionIds,$selected),
            'payment_history_enabled'=>paymentHistoryEnabledForSession()]+serviceSession());
    }
    if(!isset($_SESSION['ida'])) throw new Failure('UNAUTHENTICATED',401);
    if($c['mode']!=='phantom') throw new Failure('DEMO_ONLY',409);
    $context=serviceSession();
    $ids=array_map('intval',array_column($context['services'],'id'));
    $ph->scope($ids);$ida=$_SESSION['selected_ida'];
    // A revision is a precondition, never authorization. PHP's session lock serializes selection and reads.
    if(count($ids)>1 && ($_SERVER['HTTP_X_SERVICE_REVISION']??'')!==$_SESSION['service_revision']) throw new Failure('SERVICE_CHANGED',409);
    if($route==='service-connection') {
        if(body()!==[]) throw new Failure('BAD_REQUEST',400);
        serviceReadLimit('connection_checked');
        jsonReply($ph->connection($ida));
    }
    if($route==='wifi-prepare') {
        if(body()!==[]) throw new Failure('BAD_REQUEST',400);
        serviceReadLimit('wifi_prepared',10);
        $model=wifiModel($ph->serviceRecord($ida));
        if(!wifiGate($c,$ida,$model)) throw new Failure('WIFI_UNAVAILABLE',409);
        $challenge=['id'=>bin2hex(random_bytes(16)),'ida'=>$ida,'model'=>$model,'until'=>time()+600];
        $_SESSION['wifi_challenge']=$challenge;
        jsonReply(['requestId'=>$challenge['id']]);
    }
    if($route==='wifi-change') {
        $b=body();$settings=wifiInput($b);$challenge=$_SESSION['wifi_challenge']??[];
        if(($challenge['id']??null)!==$b['requestId'] || ($challenge['ida']??null)!==$ida || ($challenge['until']??0)<time()) throw new Failure('WIFI_EXPIRED',409);
        $model=wifiModel($ph->serviceRecord($ida));
        if($model!==$challenge['model'] || !wifiGate($c,$ida,$model)) throw new Failure('WIFI_UNAVAILABLE',409);
        $identity=$_SESSION['authenticated_ida'];$remote=$_SERVER['REMOTE_ADDR']??'unknown';
        rateLimitBegin($dir,'wifi',$remote,$identity);
        try { $account=$ph->customer($identity); }
        catch(\Throwable $error) {rateLimitRelease($dir,'wifi',$remote,$identity);throw $error;}
        if(!is_string($account['Autogestion_Pass']??null) || !hash_equals($account['Autogestion_Pass'],$b['accountPassword'])) throw new Failure('WIFI_AUTH',403);
        rateLimitRelease($dir,'wifi',$remote,$identity);unset($account,$b['accountPassword']);
        $payloadHash=hash_hmac('sha256',json_encode($settings,JSON_THROW_ON_ERROR),$c['api_pass']);
        $result=applyWifiOnce($dir,$ida,$b['requestId'],$payloadHash,fn()=>$ph->configureWifi($ida,$settings));
        unset($b,$settings);jsonReply($result);
    }
    if($route==='speedtest-start') {
        if(body()!==[]) throw new Failure('BAD_REQUEST',400);
        $speed=speedtestConfig($c);
        if($speed===null) throw new Failure('SPEEDTEST_UNAVAILABLE',409);
        serviceReadLimit('speedtest_started',60);
        jsonReply(['server'=>$speed['base']]);
    }
    if($route==='select-service') {
        $b=body();$id=$b['serviceId']??null;
        if(array_keys($b)!==['serviceId'] || !is_string($id) || !preg_match('/^[1-9][0-9]{0,9}$/D',$id)) throw new Failure('BAD_REQUEST',400);
        if(!in_array((int)$id,$ids,true)) throw new Failure('FORBIDDEN',403);
        $_SESSION['selected_ida']=(int)$id;$_SESSION['service_revision']=bin2hex(random_bytes(16));unset($_SESSION['invoice_history']);
        jsonReply(['payment_history_enabled'=>paymentHistoryEnabledForSession()]+serviceSession());
    }
    if(in_array($route,['payment-history','payment-receipt'],true)) {
        if($paymentHistory===null) throw new Failure('PAYMENT_HISTORY_DISABLED',409);
        if($route==='payment-history') jsonReply(['items'=>paymentHistoryForSession($paymentHistory)]);
        $id=$_GET['id']??null;if(!is_string($id))throw new Failure('BAD_REQUEST',400);
        paymentPdfReply($id,paymentReceiptForSession($paymentHistory,$id));
    }
    if(in_array($route,['payments','payment-create','payment-reconcile','payment-post'],true)) {
        $settings=siroConfig($c);
        if(!siroLabService($settings,$ids,$ida)) throw new Failure('SIRO_DISABLED',409);
        $posting=phantomPostingConfig($c);
        if($route==='payment-post' && !phantomPostingLabService($posting,$ids,$ida)) throw new Failure('PHANTOM_POSTING_DISABLED',409);
        if(!getenv('MI_USITTEL_RUNTIME')) throw new Failure('PAYMENT_STORAGE');
        set_time_limit(100);
        $payments=new Payments(new PaymentStore($dir),$siro??new SiroHttp($c,$settings),$settings);
        if($route==='payments') jsonReply(['items'=>$payments->list($ida)]);
        $b=body();$field=$route==='payment-create'?'idt':'attempt_id';
        if(array_keys($b)!==[$field] || !is_string($b[$field])) throw new Failure('BAD_REQUEST',400);
        if($route==='payment-create') {
            if(!preg_match('/^[1-9][0-9]{0,19}$/D',$b['idt'])) throw new Failure('BAD_REQUEST',400);
            jsonReply($payments->create($ida,$b['idt'],fn()=>authorizedInvoice($ph,$ida,$b['idt'])));
        }
        if($route==='payment-post') jsonReply($payments->postToPhantom($ida,$b['attempt_id'],fn(string $idt)=>authorizedInvoice($ph,$ida,$idt),
            fn(string $idt)=>$ph->crmUnpaidRows($ida,$idt),fn(string $idt,int $cents,string $reference)=>$ph->imputePayment($ida,$idt,$cents,$reference)));
        jsonReply($payments->reconcile($ida,$b['attempt_id']));
    }
    $documents??=new PhantomInvoiceDocuments($c);
    if(in_array($route,['invoice','invoice-document'],true)) {
        $id=$_GET['id']??null;
        if(!is_string($id) || !preg_match('/^[1-9][0-9]{0,19}$/D',$id)) throw new Failure('BAD_REQUEST',400);
        if($route==='invoice-document') pdfReply($id,invoiceDocument($ph,$documents,$ida,$id));
        $row=authorizedInvoice($ph,$ida,$id);$item=publicInvoice($row);
        $item['downloadAvailable']=$documents->available() && validInvoiceHash($row['Hash_Descarga']??null);
        jsonReply(['item'=>$item]);
    }
    if($route==='invoices') {
        $offset=$_GET['offset']??'0';
        if(!is_string($offset) || !preg_match('/^(0|[1-9][0-9]{0,5})$/D',$offset)) throw new Failure('BAD_REQUEST',400);
        checkInvoiceOffset((int)$offset);
        jsonReply(invoiceDocumentAvailability(rememberInvoicePage($ph->invoices($ida,(int)$offset)),$documents));
    }
    // Profile failure is recoverable, never replaced by fixtures. Optional sections
    // fail independently so an invoice outage cannot become a zero-debt account.
    $profile=$ph->profile($ida); $warnings=[];
    try {$balance=$ph->balance($ida);} catch(Failure $e) {$balance=['balance'=>null,'debt'=>null,'credit'=>null];$warnings[]='BALANCE_UNAVAILABLE';diagnostic($e);}
    unset($_SESSION['invoice_history']);
    try {$invoices=invoiceDocumentAvailability(rememberInvoicePage($ph->invoices($ida)),$documents);} catch(Failure $e) {$invoices=['items'=>[],'offset'=>0,'nextOffset'=>null,'endReached'=>false];$warnings[]='INVOICES_UNAVAILABLE';diagnostic($e);}
    if($balance['balance']===null && !in_array('BALANCE_UNAVAILABLE',$warnings,true)) $warnings[]='BALANCE_UNAVAILABLE';
    if($balance['debt']!==null && $balance['debt']==0 && array_filter($invoices['items'],fn($i)=>$i['status']==='Pendiente')) {
        $warnings[]='ACCOUNT_RECONCILIATION'; diagnostic(new Failure('ACCOUNT_RECONCILIATION'));
    }
    jsonReply(['customer'=>$profile,'account'=>$balance,'invoices'=>$invoices,'nextDue'=>null,'warnings'=>$warnings]);
}
function diagnostic(Failure $e): void { error_log('mi-usittel event='.$e->kind); }
function fail(\Throwable $e): never {
    $f=$e instanceof Failure?$e:new Failure('INTERNAL'); diagnostic($f);
    $message=match($f->kind) {
        'INVALID_CREDENTIALS'=>'Usuario o contraseña incorrectos, o cuenta no habilitada para este laboratorio.',
        'UNAUTHENTICATED'=>'Tu sesión venció. Volvé a ingresar.',
        'RATE_LIMIT'=>'Se alcanzó el límite de intentos. Intentá nuevamente en 15 minutos.',
        'CSRF'=>'La sesión del formulario cambió. Recargá la página.',
        'CONFIGURATION'=>'El entorno necesita completar su configuración privada.',
        'LAB_IDENTITY_PENDING'=>'Falta confirmar el identificador del cliente de laboratorio antes de ingresar.',
        'INVOICE_PAGE_SEQUENCE','INVOICE_HISTORY_CHANGED'=>'El historial cambió o la página ya no es válida. Recargá para volver a empezar.',
        'INVOICES_ORDER','INVOICES_DUPLICATE'=>'No pudimos validar el orden del historial. Recargá para volver a intentar.',
        'INVOICE_NOT_FOUND'=>'La factura no pertenece al historial consultado en esta sesión.',
        'DOCUMENT_NOT_CONFIGURED'=>'La descarga real todavía espera confirmar el endpoint de Phantom.',
        'DOCUMENT_UNAVAILABLE'=>'Esta factura no tiene un documento disponible.',
        'PAYMENT_HISTORY_DISABLED'=>'Los movimientos no están disponibles para este servicio.',
        'PAYMENT_PORTAL_EXPIRED'=>'Tu sesión venció. Volvé a ingresar.',
        'PAYMENT_RECEIPT_UNAVAILABLE'=>'Este movimiento no tiene un comprobante disponible.',
        'PAYMENT_RECEIPT_HTTP','PAYMENT_RECEIPT_FORMAT','PAYMENT_HISTORY_FORMAT','PAYMENT_HISTORY_SCHEMA','PAYMENT_HISTORY_DUPLICATE'=>'No pudimos consultar los movimientos. Volvé a intentar.',
        'SERVICE_CHANGED'=>'El servicio cambió en otra pestaña. Recargá para continuar.',
        'WIFI_UNAVAILABLE'=>'El cambio de Wi-Fi todavía no está habilitado para este equipo. Podemos ayudarte por WhatsApp.',
        'WIFI_INPUT'=>'Usá de 8 a 20 caracteres: letras, números, @, _ o punto. La clave también admite # y $. Sin espacios.',
        'WIFI_AUTH'=>'La contraseña de Mi USITTEL no es correcta.',
        'WIFI_EXPIRED'=>'Volvé a abrir la configuración de Wi-Fi para continuar.',
        'WIFI_REVIEW'=>'No pudimos confirmar el cambio anterior. Contactanos antes de volver a intentarlo.',
        'WIFI_RATE_LIMIT'=>'Esperá cinco minutos antes de realizar otro cambio de Wi-Fi.',
        'SERVICE_RATE_LIMIT'=>'Esperá unos segundos antes de volver a consultar.',
        'SPEEDTEST_UNAVAILABLE','SPEEDTEST_CONFIGURATION'=>'La prueba de velocidad todavía no está disponible. Volvé a intentar más adelante.',
        'BAD_REQUEST','FORBIDDEN'=>'La consulta no está permitida.',
        'PAYMENT_NOT_UNPAID'=>'Esta factura no está pendiente de pago.',
        'PAYMENT_INVOICE_CHANGED'=>'La factura cambió. Actualizamos sus datos; el intento anterior necesita revisión.',
        'PAYMENT_RATE_LIMIT'=>'Esperá unos minutos antes de crear otro intento.',
        'SIRO_DISABLED','SIRO_CONFIGURATION'=>'Los pagos SIRO no están habilitados en este laboratorio.',
        'PAYMENT_CPE','PAYMENT_AMOUNT'=>'La factura no tiene datos válidos para iniciar el pago.',
        'PAYMENT_SEQUENCE_EXHAUSTED'=>'No se pueden crear más intentos con la configuración actual.',
        'PAYMENT_NOT_CONFIRMED'=>'SIRO todavía no confirmó este pago.',
        'PHANTOM_POSTING_DISABLED','PHANTOM_POSTING_CONFIGURATION'=>'La actualización en Phantom no está habilitada en este laboratorio.',
        'PHANTOM_PAYMENT_REJECTED','PHANTOM_PAYMENT_HTTP'=>'Phantom no confirmó la actualización. El pago queda pendiente de revisión.',
        default=>'No pudimos consultar la información. Podés volver a intentar.',
    };
    if($f->http===429) header('Retry-After: 900');
    jsonReply(['error'=>['code'=>$f->kind,'message'=>$message]],$f->http);
}
