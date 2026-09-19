<?php
declare(strict_types=1);
namespace MiUsittel;

function siroCandidateConfig(array $c): ?array {
    $s=$c['siro']??[];
    if(!is_array($s)) throw new Failure('SIRO_CONFIGURATION');
    if(!array_key_exists('enabled',$s) || !is_bool($s['enabled']) || $c['mode']!=='phantom') return null;
    foreach(['user','password','return_base'] as $key) if(!is_string($s[$key]??null) || $s[$key]==='') throw new Failure('SIRO_CONFIGURATION');
    $p=parse_url($s['return_base']);
    if(!$p || !in_array($p['scheme']??null,['https','http'],true) || empty($p['host']) || isset($p['user'],$p['pass']) || isset($p['query']) || isset($p['fragment'])
        || ($p['path']??'')!=='/autogestion' || strlen($s['return_base'])>75
        || ($p['scheme']==='http' && !in_array($p['host'],['127.0.0.1','localhost'],true))) throw new Failure('SIRO_CONFIGURATION');
    if(isset($p['user']) || isset($p['pass'])) throw new Failure('SIRO_CONFIGURATION');
    foreach(['receipt_start','receipt_end'] as $key) if(!is_int($s[$key]??null) || $s[$key]<0 || $s[$key]>99999) throw new Failure('SIRO_CONFIGURATION');
    if($s['receipt_start']>$s['receipt_end']) throw new Failure('SIRO_CONFIGURATION');
    $s['lab_ida']??=1;
    if(!is_int($s['lab_ida']) || $s['lab_ida']<1 || $s['lab_ida']>9999999999) throw new Failure('SIRO_CONFIGURATION');
    return $s;
}
function siroConfig(array $c): ?array {
    $raw=$c['siro']??null;
    if($raw===null || (is_array($raw) && ($raw['enabled']??false)===false)) return null;
    $s=siroCandidateConfig($c);
    return $s!==null && $s['enabled']?$s:null;
}
function siroLabService(?array $s,array $ids,?int $selected): bool {
    return $s!==null && count($ids)===1 && $selected===($s['lab_ida']??1) && in_array($selected,$ids,true);
}
function paymentCents(mixed $value): int {
    if(is_int($value)) $value=(string)$value;
    if(is_float($value) && is_finite($value)) $value=json_encode($value,JSON_PRESERVE_ZERO_FRACTION);
    if(!is_string($value) || !preg_match('/^(0|[1-9][0-9]{0,8})(?:\.([0-9]{1,2}))?$/D',$value,$m)) throw new Failure('PAYMENT_AMOUNT');
    $cents=((int)$m[1])*100+(int)str_pad($m[2]??'',2,'0');
    if($cents<=0) throw new Failure('PAYMENT_AMOUNT');
    return $cents;
}
function paymentDecimal(int $cents): string {return intdiv($cents,100).'.'.str_pad((string)($cents%100),2,'0',STR_PAD_LEFT);}
function siroCheckout(string $hash): string {
    if(!preg_match('/^[a-f0-9]{64}$/D',$hash)) throw new Failure('SIRO_FORMAT');
    return 'https://siropagos.bancoroela.com.ar/Home/Pago/'.$hash;
}
// Verified POC contract: Buenos Aires wall time + milliseconds + literal Z.
// This is SIRO's query convention, NOT an ISO UTC instant. Internal storage stays UTC.
function siroDate(\DateTimeImmutable $date): string {
    return $date->setTimezone(new \DateTimeZone('America/Argentina/Buenos_Aires'))->format('Y-m-d\TH:i:s.v\Z');
}
function siroQueryWindow(array $attempt,?\DateTimeImmutable $now=null): array {
    $now??=new \DateTimeImmutable('now',new \DateTimeZone('UTC'));
    $value=$attempt['created_at']??null;
    if(!is_string($value)) throw new Failure('SIRO_DATE');
    $created=\DateTimeImmutable::createFromFormat(\DateTimeInterface::ATOM,$value);
    if(!$created || $created->format(\DateTimeInterface::ATOM)!==$value || $created>$now) throw new Failure('SIRO_DATE');
    // Preserve the POC's one-minute lag. Anchor the start to creation for later recovery.
    return ['FechaDesde'=>siroDate($created->modify('-12 hours')),'FechaHasta'=>siroDate($now->modify('-1 minute'))];
}
interface SiroGateway {
    public function create(array $request): array;
    public function consult(array $attempt): array;
    public function result(string $hash,string $id): array;
}
final class SiroHttp implements SiroGateway {
    private ?string $token=null;
    public function __construct(private array $c,private array $s) {}
    private function send(string $url,?array $body,bool $auth=false): array {
        // URLs are constructed only by methods below, never from browser/config/upstream.
        $ch=null;$response='';$tooLarge=false;
        set_error_handler(static function(){throw new Failure('SIRO_NETWORK');});
        try {
            $ch=curl_init($url);if($ch===false) throw new Failure('SIRO_NETWORK');
            $headers=['Accept: application/json','Content-Type: application/json'];
            if(!$auth) $headers[]='Authorization: Bearer '.$this->sessionToken();
            $options=[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
                CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>25,CURLOPT_VERBOSE=>false,CURLOPT_HTTPHEADER=>$headers,
                CURLOPT_WRITEFUNCTION=>static function($h,$chunk) use (&$response,&$tooLarge) {if(strlen($response)+strlen($chunk)>1048576){$tooLarge=true;return 0;}$response.=$chunk;return strlen($chunk);}];
            if($body!==null) {$options[CURLOPT_POST]=true;$options[CURLOPT_POSTFIELDS]=json_encode($body,JSON_THROW_ON_ERROR);}
            else $options[CURLOPT_HTTPGET]=true;
            if(($this->c['ca_file']??null)!==null) $options[CURLOPT_CAINFO]=$this->c['ca_file'];
            if(!curl_setopt_array($ch,$options)) throw new Failure('SIRO_NETWORK');
            $ok=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);
            if($tooLarge) throw new Failure('SIRO_FORMAT');
            if($ok===false) throw new Failure($errno===CURLE_OPERATION_TIMEDOUT?'SIRO_TIMEOUT':'SIRO_NETWORK');
            if($status===401 || $status===403) throw new Failure('SIRO_SESSION');
            if($status!==200) throw new Failure('SIRO_HTTP');
            try {$json=json_decode($response,true,32,JSON_THROW_ON_ERROR);} catch(\Throwable) {throw new Failure('SIRO_FORMAT');}
            if(!is_array($json)) throw new Failure('SIRO_FORMAT');
            return $json;
        } catch(Failure $e) {throw $e;} catch(\Throwable) {throw new Failure('SIRO_NETWORK');}
        finally {if($ch instanceof \CurlHandle) curl_close($ch);restore_error_handler();}
    }
    private function sessionToken(): string {
        if($this->token!==null) return $this->token;
        $r=$this->send('https://apisesion.bancoroela.com.ar/auth/Sesion',['Usuario'=>$this->s['user'],'Password'=>$this->s['password']],true);
        if(!is_string($r['access_token']??null) || !preg_match('/^[A-Za-z0-9._~+\/=\-]{1,8192}$/D',$r['access_token'])) throw new Failure('SIRO_SESSION');
        return $this->token=$r['access_token']; // Request-local only. Never persisted.
    }
    public function create(array $request): array {return $this->send('https://siropagos.bancoroela.com.ar/api/Pago',$request);}
    public function consult(array $attempt): array {
        return $this->send('https://siropagos.bancoroela.com.ar/api/Pago/Consulta',siroQueryWindow($attempt)+[
            'idReferenciaOperacion'=>$attempt['reference']]);
    }
    public function result(string $hash,string $id): array {
        siroCheckout($hash);
        if(!preg_match('/^[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/D',$id)) throw new Failure('SIRO_FORMAT');
        return $this->send('https://siropagos.bancoroela.com.ar/api/Pago/'.$hash.'/'.$id,null);
    }
}
