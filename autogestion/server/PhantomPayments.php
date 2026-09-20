<?php
declare(strict_types=1);
namespace MiUsittel;

interface PhantomCrmGateway {
    public function authenticate(bool $refresh=false): void;
    public function unpaid(string $idt): array;
    // Diagnostic acknowledgement only. Phantom reads decide the final state.
    public function impute(string $idt,int $cents,string $origin,string $reference): string;
}

function phantomPostingCandidateConfig(array $config): ?array {
    $settings=$config['phantom_posting']??null;
    if($settings===null) return null;
    if(!is_array($settings) || !is_bool($settings['enabled']??null)) throw new Failure('PHANTOM_POSTING_CONFIGURATION');
    $crm=$settings['crm_url']??null;$lab=$settings['lab_ida']??null;$origin=$settings['origin']??null;
    $base=parse_url(is_string($config['phantom_url']??null)?$config['phantom_url']:'');
    $url=parse_url(is_string($crm)?$crm:'');
    if(!is_int($lab) || $lab<1 || $lab>9999999999 || !is_string($origin) || !preg_match('/^[A-Za-z0-9 _.-]{3,40}$/D',$origin)
        || ($url['scheme']??null)!=='https' || empty($url['host']) || strcasecmp((string)($url['host']??''),(string)($base['host']??''))!==0
        || ($url['port']??443)!==($base['port']??443)
        || ($url['path']??null)!=='/PHANTOM/Includes/CRM/API_CRM.php' || isset($url['user']) || isset($url['pass'])
        || isset($url['query']) || isset($url['fragment'])) throw new Failure('PHANTOM_POSTING_CONFIGURATION');
    return ['enabled'=>$settings['enabled'],'crm_url'=>$crm,'lab_ida'=>$lab,'origin'=>$origin];
}
function phantomPostingConfig(array $config): ?array {
    $settings=phantomPostingCandidateConfig($config);
    return $settings!==null && $settings['enabled']?$settings:null;
}
function phantomPostingLabService(?array $settings,array $authorized,?int $selected): bool {
    return $settings!==null && count($authorized)===1 && $selected===$settings['lab_ida'] && $authorized[0]===$settings['lab_ida'];
}

function phantomCrmAcknowledgement(string $response): string {
    if(str_starts_with($response,"\xEF\xBB\xBF")) $response=substr($response,3);
    $text=trim($response);
    if($text!=='' && preg_match('/\bError\b/iu',$text)) return 'ERROR';
    if($text==='OK' || preg_match('/^OK(?:\s*[-:;,.]\s*|\s+).{1,2048}$/su',$text)) return 'SUCCESS';
    return 'UNKNOWN';
}

function phantomCrmUnpaidRecord(array $rows,string $idt,int $ida,int $cents): array {
    if(!array_is_list($rows) || count($rows)!==1 || !is_array($rows[0]) || !array_is_list($rows[0]) || count($rows[0])<7) throw new Failure('PHANTOM_CRM_UNPAID_SCHEMA');
    $row=$rows[0];
    try {$actualId=invoiceId($row[0]??null);} catch(Failure) {throw new Failure('PHANTOM_CRM_UNPAID_SCHEMA');}
    if($actualId!==$idt) throw new Failure('PHANTOM_CRM_IDT_MISMATCH',409);
    if(!in_array($row[2]??null,[$ida,(string)$ida],true)) throw new Failure('PHANTOM_CRM_IDA_MISMATCH',409);
    try {$actualCents=paymentCents($row[6]??null);} catch(Failure) {throw new Failure('PHANTOM_CRM_UNPAID_SCHEMA');}
    if($actualCents!==$cents) throw new Failure('PHANTOM_CRM_AMOUNT_MISMATCH',409);
    return ['idt'=>$actualId,'ida'=>$ida,'cents'=>$actualCents];
}

final class PhantomCrmHttp implements PhantomCrmGateway {
    private ?array $formatDiagnostic=null;
    // Metadata only, consumed by the CLI inspector; never returned by the portal.
    public function formatDiagnostic(): ?array {return $this->formatDiagnostic;}
    public function __construct(private array $config,private array $settings,private string $dir) {}
    public function authenticate(bool $refresh=false): void {$this->token($refresh);}
    public function unpaid(string $idt): array {
        $this->formatDiagnostic=null;
        if(!preg_match('/^[1-9][0-9]{0,19}$/D',$idt)) throw new Failure('PHANTOM_PAYMENT_REQUEST');
        return $this->authorized('Consultar_Impagos',['IDT'=>$idt],true);
    }
    public function impute(string $idt,int $cents,string $origin,string $reference): string {
        if(!preg_match('/^[1-9][0-9]{0,19}$/D',$idt) || $cents<1
            || !preg_match('/^[A-Za-z0-9 _.-]{3,40}$/D',$origin) || !preg_match('/^SIRO [a-f0-9-]{36}$/D',$reference)) throw new Failure('PHANTOM_PAYMENT_REQUEST');
        return $this->authorized('Imputar_Pago',['IDT'=>$idt,'Monto'=>paymentDecimal($cents),'Originante'=>$origin,'Referencia'=>$reference],false);
    }
    private function token(bool $refresh=false): string {
        $key=hash('sha256','crm|get-query|'.$this->settings['crm_url'].'|'.$this->config['api_user'].'|'.$this->config['api_pass']);
        return locked($this->dir.'/crm-token-'.$key.'.json',function($f) use($refresh) {
            $cached=json_decode(stream_get_contents($f),true);
            if(!$refresh && is_array($cached) && ($cached['until']??0)>time() && is_string($cached['token']??null)) return $cached['token'];
            writeFileHandle($f,[]);
            $response=$this->request($this->url('autentificar',null),['api_user'=>$this->config['api_user'],'api_pass'=>$this->config['api_pass']],true,true);
            if(!is_array($response) || !is_string($response['token']??null) || trim($response['token'])==='') throw new Failure('PHANTOM_CRM_TOKEN');
            writeFileHandle($f,['token'=>$response['token'],'until'=>time()+600]);
            return $response['token'];
        });
    }
    private function authorized(string $action,array $body,bool $json): mixed {
        for($attempt=0;$attempt<2;$attempt++) {
            $token=$this->token($attempt===1);$payload=['token'=>$token]+$body;
            try {return $this->request($this->url($action,$token),$payload,$json,false);}
            catch(Failure $e) {if($e->kind!=='TOKEN_EXPIRED' || $attempt===1) throw $e;}
        }
        throw new Failure('PHANTOM_CRM_TOKEN');
    }
    private function url(string $action,?string $token): string {
        $query=['action'=>$action];
        if($action==='autentificar') $query['JSON']=1;
        if($token!==null) $query['token']=$token;
        return $this->settings['crm_url'].'?'.http_build_query($query,'','&',PHP_QUERY_RFC3986);
    }
    private function request(string $url,array $body,bool $json,bool $get): mixed {
        if(!extension_loaded('curl')) throw new Failure('CONFIGURATION');
        $ca=null;
        if($this->config['ca_file']!==null) {
            if(!is_string($this->config['ca_file']) || ($ca=realpath($this->config['ca_file']))===false || !is_file($ca) || !is_readable($ca)) throw new Failure('PHANTOM_CA_FILE');
        }
        if($get) $url.='&'.http_build_query($body,'','&',PHP_QUERY_RFC3986);
        $ch=null;$response='';$ok=false;$code=0;$errno=0;$curlError='';
        set_error_handler(static function(){throw new Failure('PHANTOM_CURL_RUNTIME');});
        try {
            $ch=curl_init($url);if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
            $options=[CURLOPT_VERBOSE=>false,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
                CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_CONNECTTIMEOUT=>$this->config['connect_timeout_seconds'],
                CURLOPT_TIMEOUT=>$this->config['timeout_seconds'],CURLOPT_HTTPHEADER=>['Accept: '.($json?'application/json':'text/plain'),'Content-Type: application/json'],
                CURLOPT_WRITEFUNCTION=>static function($handle,$chunk) use (&$response){if(strlen($response)+strlen($chunk)>1048576)return 0;$response.=$chunk;return strlen($chunk);}];
            if($get) $options[CURLOPT_HTTPGET]=true;
            else {$options[CURLOPT_POST]=true;$options[CURLOPT_POSTFIELDS]=json_encode($body,JSON_THROW_ON_ERROR);}
            if($ca!==null)$options[CURLOPT_CAINFO]=$ca;
            if(!curl_setopt_array($ch,$options)) throw new Failure('PHANTOM_CURL_SETUP');
            $ok=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);$curlError=curl_error($ch);
        } catch(Failure $e){throw $e;} catch(\Throwable){throw new Failure('PHANTOM_CURL_RUNTIME');}
        finally {if($ch instanceof \CurlHandle)curl_close($ch);restore_error_handler();}
        if($ok===false) throw new Failure(CurlTransport::diagnosticCodeForCurlFailure($errno,$curlError),$errno===CURLE_OPERATION_TIMEDOUT?504:503);
        if($code===401 || $code===403) throw new Failure('TOKEN_EXPIRED',503,$code);
        if($code<200 || $code>=300) throw new Failure('PHANTOM_CRM_HTTP',503,$code);
        if(!$json) return phantomCrmAcknowledgement($response);
        if(str_starts_with($response,"\xEF\xBB\xBF"))$response=substr($response,3);
        try {$decoded=json_decode($response,true,32,JSON_THROW_ON_ERROR);} catch(\Throwable){
            if(!$get) $this->formatDiagnostic=['http'=>$code,'bytes'=>strlen($response),'empty'=>trim($response)==='',
                'format'=>preg_match('/^\s*(?:<!doctype\s+html|<html\b)/i',$response)?'html':'non_json'];
            throw new Failure('PHANTOM_CRM_FORMAT');
        }
        if(!is_array($decoded)) {
            if(!$get) $this->formatDiagnostic=['http'=>$code,'bytes'=>strlen($response),'empty'=>false,'format'=>'json_'.get_debug_type($decoded)];
            throw new Failure('PHANTOM_CRM_FORMAT');
        }
        return $decoded;
    }
}
