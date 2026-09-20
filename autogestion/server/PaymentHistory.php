<?php
declare(strict_types=1);
namespace MiUsittel;

require_once __DIR__.'/Core.php';
require_once __DIR__.'/InvoiceDocuments.php';

const PAYMENT_PORTAL_LOGIN='/PHANTOM/Includes/CRM/CRM_APP/login.php';
const PAYMENT_PORTAL_HISTORY='/PHANTOM/Includes/CRM/CRM_APP/estado_cuenta.php?filter=P%2A';
const PAYMENT_RECEIPT_PATH='/PHANTOM/Includes/CRM/Comprobante_Pago.php';

interface PaymentHistorySource {
    /** Opaque provider state only. The password must never be returned or retained. */
    public function authenticate(string $username,string $password): array;
    /** Returns provider state plus private rows. Capability values stay server-side. */
    public function history(array $state): array;
    public function receipt(array $state,string $capability): array;
}

function paymentHistoryEnabledForSession(): bool {
    return isset($_SESSION['payment_portal']) && is_array($_SESSION['payment_portal'])
        && isset($_SESSION['authenticated_ida'],$_SESSION['selected_ida'])
        && $_SESSION['authenticated_ida']===$_SESSION['selected_ida']
        && ($_SESSION['payment_portal']['ida']??null)===$_SESSION['selected_ida'];
}

function publicPaymentHistory(array $rows): array {
    $public=[];
    foreach($rows as $row) {
        if(!is_array($row) || !isset($row['id'],$row['period'],$row['date'],$row['cents'],$row['method'],$row['capability'])) throw new Failure('PAYMENT_HISTORY_SCHEMA');
        $public[]=['id'=>$row['id'],'period'=>$row['period'],'date'=>$row['date'],'amount'=>$row['cents']/100,
            'method'=>$row['method'],'downloadAvailable'=>true];
    }
    return $public;
}

function paymentHistoryRows(string $html): array {
    if($html==='' || strlen($html)>2097152) throw new Failure('PAYMENT_HISTORY_FORMAT');
    if(!class_exists(\DOMDocument::class)) throw new Failure('PAYMENT_HISTORY_FORMAT');
    $previous=libxml_use_internal_errors(true);
    try {
        $dom=new \DOMDocument();
        if(!$dom->loadHTML($html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING)) throw new Failure('PAYMENT_HISTORY_FORMAT');
        $xpath=new \DOMXPath($dom);
        $nodes=$xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' timeline-item ')]");
        if($nodes===false) throw new Failure('PAYMENT_HISTORY_FORMAT');
        $rows=[];$seen=[];
        foreach($nodes as $node) {
            $headings=$xpath->query(".//h3",$node);$periods=$xpath->query(".//strong",$node);$paragraphs=$xpath->query(".//p",$node);
            $links=$xpath->query(".//a[contains(concat(' ', normalize-space(@class), ' '), ' button-red ')]",$node);
            if($headings===false || $headings->length<2 || $periods===false || $periods->length!==1 || $paragraphs===false || $paragraphs->length!==1 || $links===false || $links->length!==1) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            if(trim((string)$headings->item(0)?->textContent)!=='PAGO') throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $amount=preg_replace('/\s+/u','',trim((string)$headings->item(1)?->textContent));
            if(!is_string($amount) || !preg_match('/^\$([0-9]{1,15})(?:[.,]([0-9]{2}))?$/D',$amount,$am)) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $cents=(int)$am[1]*100+(int)($am[2]??'00');
            if($cents<1 || $cents>9007199254740991) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $period=trim((string)$periods->item(0)?->textContent);
            if(!preg_match('/^20[0-9]{2}-(?:0[1-9]|1[0-2])$/D',$period)) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $detailHtml=$dom->saveHTML($paragraphs->item(0));
            if(!is_string($detailHtml)) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $detailElements=$xpath->query('.//*',$paragraphs->item(0));
            if($detailElements===false) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            foreach($detailElements as $element) if(strtolower($element->nodeName)!=='br') throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $detailHtml=preg_replace('~<br\s*/?>~i',' ',$detailHtml);
            $details=preg_replace('/\s+/u',' ',trim(html_entity_decode(strip_tags((string)$detailHtml),ENT_QUOTES|ENT_HTML5,'UTF-8')));
            if(!is_string($details) || !preg_match('/^Fecha de Pago:\s*(20[0-9]{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01]))\s*Comprobante:\s*\(P\)\s*([0-9]{1,20})\s*Medio de Pago:\s*(.{1,40})$/uD',$details,$m)) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $method=trim($m[3]);
            if($method==='' || preg_match('/[\x00-\x1f\x7f<>]/u',$method)) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $onclick=trim((string)$links->item(0)?->getAttribute('onclick'));
            if(!preg_match("~^window\\.open\\(['\"]\\.\\./\\.\\./CRM/Comprobante_Pago\\.php\\?IDT=([^'\"]+)['\"]\\);?$~D",$onclick,$link)) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $capability=html_entity_decode($link[1],ENT_QUOTES|ENT_HTML5,'UTF-8');
            $decoded=base64_decode($capability,true);
            if(!preg_match('~^[A-Za-z0-9+/]{22}==$~D',$capability) || !is_string($decoded) || strlen($decoded)!==16) throw new Failure('PAYMENT_HISTORY_SCHEMA');
            $id=$m[2];if(isset($seen[$id])) throw new Failure('PAYMENT_HISTORY_DUPLICATE');$seen[$id]=true;
            $rows[]=['id'=>$id,'period'=>$period,'date'=>$m[1],'cents'=>$cents,'method'=>$method,'capability'=>$capability];
        }
        return $rows;
    } finally {libxml_clear_errors();libxml_use_internal_errors($previous);}
}

final class PhantomPaymentHistory implements PaymentHistorySource {
    private string $origin;
    public function __construct(private array $config) {$this->origin=documentProbeOrigin($config['phantom_url']);}
    public function authenticate(string $username,string $password): array {
        $cookies=[];$login=$this->request(PAYMENT_PORTAL_LOGIN,'GET',null,$cookies,2097152,'text/html');$cookies=$login['cookies'];
        if($login['http']!==200 || !preg_match('/<input\b[^>]*name=["\']LOGIN_TOKEN["\'][^>]*value=["\']([a-f0-9]{32})["\']/i',$login['bytes'],$token)) throw new Failure('PAYMENT_PORTAL_AUTH');
        $body=http_build_query(['txt_user'=>$username,'txt_pass'=>$password,'LOGIN_TOKEN'=>$token[1],'text_mercado'=>'0'],'','&',PHP_QUERY_RFC3986);
        $result=$this->request(PAYMENT_PORTAL_LOGIN,'POST',$body,$cookies,2097152,'text/html');$cookies=$result['cookies'];
        for($i=0;$i<2 && in_array($result['http'],[301,302,303],true);$i++) {
            $path=$this->redirectPath($result['location']??'');
            $result=$this->request($path,'GET',null,$cookies,2097152,'text/html');$cookies=$result['cookies'];
        }
        if($result['http']<200 || $result['http']>=400 || preg_match('/name=["\']txt_pass["\']/i',$result['bytes'])) throw new Failure('PAYMENT_PORTAL_AUTH');
        $history=$this->request(PAYMENT_PORTAL_HISTORY,'GET',null,$cookies,2097152,'text/html');
        if($history['http']!==200 || preg_match('/name=["\']txt_pass["\']/i',$history['bytes'])) throw new Failure('PAYMENT_PORTAL_AUTH');
        paymentHistoryRows($history['bytes']);
        return ['cookies'=>$history['cookies'],'authenticated_at'=>time()];
    }
    public function history(array $state): array {
        $cookies=$this->cookies($state);$result=$this->request(PAYMENT_PORTAL_HISTORY,'GET',null,$cookies,2097152,'text/html');
        if($result['http']!==200 || preg_match('/name=["\']txt_pass["\']/i',$result['bytes'])) throw new Failure('PAYMENT_PORTAL_EXPIRED',409);
        return ['state'=>['cookies'=>$result['cookies'],'authenticated_at'=>$state['authenticated_at']??time()],'rows'=>paymentHistoryRows($result['bytes'])];
    }
    public function receipt(array $state,string $capability): array {
        $decoded=base64_decode($capability,true);
        if(!preg_match('~^[A-Za-z0-9+/]{22}==$~D',$capability) || !is_string($decoded) || strlen($decoded)!==16) throw new Failure('PAYMENT_RECEIPT_UNAVAILABLE',404);
        $path=PAYMENT_RECEIPT_PATH.'?'.http_build_query(['IDT'=>$capability],'','&',PHP_QUERY_RFC3986);
        $result=$this->request($path,'GET',null,$this->cookies($state),INVOICE_PDF_MAX_BYTES,'application/pdf');
        if($result['http']!==200) throw new Failure('PAYMENT_RECEIPT_HTTP',503,$result['http']);
        $document=['contentType'=>$result['contentType'],'bytes'=>$result['bytes']];validateInvoicePdf($document);
        return ['state'=>['cookies'=>$result['cookies'],'authenticated_at'=>$state['authenticated_at']??time()],'document'=>$document];
    }
    private function cookies(array $state): array {
        $cookies=$state['cookies']??null;
        if(!is_array($cookies) || $cookies===[]) throw new Failure('PAYMENT_PORTAL_EXPIRED',409);
        foreach($cookies as $name=>$value) if(!is_string($name)||!is_string($value)||!preg_match('/^[!#$%&\'*+.^_`|~0-9A-Za-z-]{1,128}$/D',$name)||$value===''||strlen($value)>4096||preg_match('/[;\x00-\x20\x7f]/',$value)) throw new Failure('PAYMENT_PORTAL_EXPIRED',409);
        return $cookies;
    }
    private function redirectPath(string $location): string {
        if($location==='') throw new Failure('PAYMENT_PORTAL_AUTH');
        $absolute=parse_url($location);$base=parse_url($this->origin);
        if(isset($absolute['scheme']) && (($absolute['scheme']??null)!=='https' || strcasecmp((string)($absolute['host']??''),(string)($base['host']??''))!==0 || ($absolute['port']??443)!==($base['port']??443))) throw new Failure('PAYMENT_PORTAL_AUTH');
        $path=$absolute['path']??$location;
        if(!str_starts_with($path,'/')) $path='/PHANTOM/Includes/CRM/CRM_APP/'.ltrim($path,'./');
        if(!str_starts_with($path,'/PHANTOM/Includes/CRM/CRM_APP/') || str_contains($path,'..')) throw new Failure('PAYMENT_PORTAL_AUTH');
        return $path.(isset($absolute['query'])?'?'.$absolute['query']:'');
    }
    private function request(string $path,string $method,?string $body,array $cookies,int $limit,string $accept): array {
        if(!in_array($method,['GET','POST'],true) || !str_starts_with($path,'/PHANTOM/Includes/CRM/')) throw new Failure('PAYMENT_PORTAL_REQUEST');
        $ca=null;if($this->config['ca_file']!==null && (($ca=realpath($this->config['ca_file']))===false || !is_file($ca) || !is_readable($ca))) throw new Failure('PHANTOM_CA_FILE');
        $bytes='';$headers=[];$newCookies=$cookies;$tooLarge=false;$ch=null;
        set_error_handler(static function(){throw new Failure('PHANTOM_CURL_RUNTIME');});
        try {
            $ch=curl_init($this->origin.$path);if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
            $requestHeaders=['Accept: '.$accept,'Accept-Encoding: identity'];
            if($cookies!==[]) $requestHeaders[]='Cookie: '.implode('; ',array_map(fn($k,$v)=>$k.'='.$v,array_keys($cookies),$cookies));
            $options=[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
                CURLOPT_CONNECTTIMEOUT=>$this->config['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$this->config['timeout_seconds'],CURLOPT_HTTPHEADER=>$requestHeaders,
                CURLOPT_HEADERFUNCTION=>static function($handle,string $line) use (&$headers,&$newCookies) {
                    if(preg_match('/^HTTP\//',$line)) $headers=[];
                    elseif(str_contains($line,':')) {[$key,$value]=explode(':',$line,2);$key=strtolower(trim($key));$value=trim($value);if(in_array($key,['content-type','location'],true))$headers[$key]=$value;
                        if($key==='set-cookie' && preg_match('/^([!#$%&\'*+.^_`|~0-9A-Za-z-]{1,128})=([^;\x00-\x20\x7f]{1,4096})/D',$value,$m))$newCookies[$m[1]]=$m[2];}
                    return strlen($line);
                },CURLOPT_WRITEFUNCTION=>static function($handle,string $chunk) use (&$bytes,&$tooLarge,$limit){if(strlen($bytes)+strlen($chunk)>$limit){$tooLarge=true;return 0;}$bytes.=$chunk;return strlen($chunk);}];
            if($method==='POST') {$options[CURLOPT_POST]=true;$options[CURLOPT_POSTFIELDS]=$body??'';$options[CURLOPT_HTTPHEADER][]='Content-Type: application/x-www-form-urlencoded';}
            else $options[CURLOPT_HTTPGET]=true;
            if($ca!==null)$options[CURLOPT_CAINFO]=$ca;if(!curl_setopt_array($ch,$options))throw new Failure('PHANTOM_CURL_SETUP');
            $ok=curl_exec($ch);$http=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);$error=curl_error($ch);
            if($tooLarge)throw new Failure('DOCUMENT_SIZE');if($ok===false)throw new Failure(CurlTransport::diagnosticCodeForCurlFailure($errno,$error),$errno===CURLE_OPERATION_TIMEDOUT?504:503);
        } finally {if($ch instanceof \CurlHandle)curl_close($ch);restore_error_handler();}
        return ['http'=>$http,'contentType'=>$headers['content-type']??'','location'=>$headers['location']??null,'cookies'=>$newCookies,'bytes'=>$bytes];
    }
}

function paymentHistoryForSession(PaymentHistorySource $source): array {
    if(!paymentHistoryEnabledForSession()) throw new Failure('PAYMENT_HISTORY_DISABLED',409);
    $result=$source->history($_SESSION['payment_portal']['state']);
    if(!is_array($result['state']??null)||!is_array($result['rows']??null))throw new Failure('PAYMENT_HISTORY_SCHEMA');
    $_SESSION['payment_portal']['state']=$result['state'];
    return publicPaymentHistory($result['rows']);
}

function paymentReceiptForSession(PaymentHistorySource $source,string $id): string {
    if(!preg_match('/^[0-9]{1,20}$/D',$id)) throw new Failure('BAD_REQUEST',400);
    if(!paymentHistoryEnabledForSession()) throw new Failure('PAYMENT_HISTORY_DISABLED',409);
    $result=$source->history($_SESSION['payment_portal']['state']);$matches=[];
    foreach($result['rows']??[] as $row) if(is_array($row)&&($row['id']??null)===$id)$matches[]=$row;
    if(count($matches)!==1) throw new Failure('PAYMENT_RECEIPT_UNAVAILABLE',404);
    $_SESSION['payment_portal']['state']=$result['state'];
    $receipt=$source->receipt($result['state'],$matches[0]['capability']);
    if(!is_array($receipt['state']??null)||!is_array($receipt['document']??null))throw new Failure('PAYMENT_RECEIPT_FORMAT');
    $_SESSION['payment_portal']['state']=$receipt['state'];
    return validateInvoicePdf($receipt['document']);
}

function paymentPdfReply(string $id,string $bytes): never {
    header('Content-Type: application/pdf');header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: attachment; filename="comprobante-pago-'.$id.'.pdf"');
    header('Content-Length: '.strlen($bytes));header('Cache-Control: no-store, private');header('Pragma: no-cache');
    header("Content-Security-Policy: sandbox; default-src 'none'");echo $bytes;exit;
}
