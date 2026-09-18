<?php
declare(strict_types=1);
namespace MiUsittel;

function startSession(array $c,string $dir): void {
    ini_set('session.use_strict_mode','1'); ini_set('session.use_only_cookies','1'); ini_set('session.use_trans_sid','0');
    ini_set('session.gc_maxlifetime',(string)$c['max_seconds']);
    session_save_path($dir); session_name('MIUSITTEL_'.strtoupper($c['mode']));
    session_set_cookie_params(['lifetime'=>0,'path'=>'/autogestion/','secure'=>(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off'), 'httponly'=>true,'samesite'=>'Strict']);
    session_start();
    $fingerprint=hash('sha256',json_encode([$c['mode'],$c['allowed_idas'],$c['lab_users'],$c['phantom_url']??'',$c['api_user']??'',
        $c['customer_id_field']??null,$c['phantom_auth_mode']??null,'lab-v2']));
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
function api(array $c,string $dir,Phantom $ph,string $route): never {
    startSession($c,$dir);
    $method=$_SERVER['REQUEST_METHOD'];
    $expected=['bootstrap'=>'GET','login'=>'POST','logout'=>'POST','overview'=>'GET','invoices'=>'GET'];
    if(!isset($expected[$route])) throw new Failure('NOT_FOUND',404);
    if($method!==$expected[$route]) throw new Failure('METHOD',405);
    $allowedQuery=$route==='invoices'?['offset']:[];
    if(array_diff(array_keys($_GET),$allowedQuery)) throw new Failure('BAD_REQUEST',400);
    if($route==='bootstrap') jsonReply(['mode'=>$c['mode'],'authenticated'=>isset($_SESSION['ida']),'csrf'=>$_SESSION['csrf']]);
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
            $valid=$c['mode']==='demo' ? hash_equals('agustin.demo',$b['username']) && hash_equals('usittel-demo',$b['password']) : $candidate!==null && $ph->verify($candidate,$b['username'],$b['password']);
        } catch(\Throwable $e) {
            // Provider/configuration failures are not credential failures.
            rateLimitRelease($dir,$b['username'],$remote,$candidate); unset($b); throw $e;
        }
        if(!$valid) { unset($b); throw new Failure('INVALID_CREDENTIALS',401); }
        rateLimitRelease($dir,$b['username'],$remote,$candidate);
        unset($b);
        $fingerprint=$_SESSION['config']; $_SESSION=[]; session_regenerate_id(true);
        $_SESSION=['ida'=>$c['mode']==='demo'?0:$candidate,'started'=>time(),'last'=>time(),'config'=>$fingerprint,'csrf'=>bin2hex(random_bytes(32))];
        jsonReply(['authenticated'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    if(!isset($_SESSION['ida'])) throw new Failure('UNAUTHENTICATED',401);
    if($c['mode']!=='phantom') throw new Failure('DEMO_ONLY',409);
    $ida=$_SESSION['ida'];
    if($ida!==1 || !in_array($ida,$c['allowed_idas'],true)) throw new Failure('FORBIDDEN',403);
    if($route==='invoices') {
        $offset=$_GET['offset']??'0';
        if($offset!=='0') throw new Failure('BAD_REQUEST',400);
        jsonReply($ph->invoices($ida,(int)$offset));
    }
    // Profile failure is recoverable, never replaced by fixtures. Optional sections
    // fail independently so an invoice outage cannot become a zero-debt account.
    $profile=$ph->profile($ida); $warnings=[];
    try {$balance=$ph->balance($ida);} catch(Failure $e) {$balance=['balance'=>null,'debt'=>null,'credit'=>null];$warnings[]='BALANCE_UNAVAILABLE';diagnostic($e);}
    try {$invoices=$ph->invoices($ida);} catch(Failure $e) {$invoices=['items'=>[],'offset'=>0,'nextOffset'=>null];$warnings[]='INVOICES_UNAVAILABLE';diagnostic($e);}
    if($balance['balance']===null && !in_array('BALANCE_UNAVAILABLE',$warnings,true)) $warnings[]='BALANCE_UNAVAILABLE';
    if($balance['balance']!==null && $balance['balance']>=0 && array_filter($invoices['items'],fn($i)=>$i['status']==='Pendiente')) {
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
        'BAD_REQUEST','FORBIDDEN'=>'La consulta no está permitida.',
        default=>'No pudimos consultar la información. Podés volver a intentar.',
    };
    if($f->http===429) header('Retry-After: 900');
    jsonReply(['error'=>['code'=>$f->kind,'message'=>$message]],$f->http);
}
