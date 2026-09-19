<?php
declare(strict_types=1);
namespace MiUsittel;

interface PhantomPaymentGateway {
    public function impute(string $token,string $idt,int $cents,string $origin,string $reference): void;
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

final class PhantomCrmHttp implements PhantomPaymentGateway {
    public function __construct(private array $config,private array $settings) {}
    public function impute(string $token,string $idt,int $cents,string $origin,string $reference): void {
        if(!extension_loaded('curl') || !preg_match('/^[1-9][0-9]{0,19}$/D',$idt) || $cents<1
            || !preg_match('/^[A-Za-z0-9 _.-]{3,40}$/D',$origin) || !preg_match('/^SIRO [a-f0-9-]{36}$/D',$reference)) throw new Failure('PHANTOM_PAYMENT_REQUEST');
        $url=$this->settings['crm_url'].'?'.http_build_query(['action'=>'Imputar_Pago','token'=>$token],'','&',PHP_QUERY_RFC3986);
        try {$body=json_encode(['token'=>$token,'IDT'=>$idt,'Monto'=>paymentDecimal($cents),'Originante'=>$origin,'Referencia'=>$reference],JSON_THROW_ON_ERROR);}
        catch(\JsonException) {throw new Failure('PHANTOM_PAYMENT_REQUEST');}
        $ca=null;
        if($this->config['ca_file']!==null) {
            if(!is_string($this->config['ca_file']) || ($ca=realpath($this->config['ca_file']))===false || !is_file($ca) || !is_readable($ca)) throw new Failure('PHANTOM_CA_FILE');
        }
        $ch=null;$response='';$ok=false;$code=0;$errno=0;$curlError='';
        set_error_handler(static function(){throw new Failure('PHANTOM_CURL_RUNTIME');});
        try {
            $ch=curl_init($url);if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
            $options=[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: text/plain'],
                CURLOPT_VERBOSE=>false,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
                CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_CONNECTTIMEOUT=>$this->config['connect_timeout_seconds'],
                CURLOPT_TIMEOUT=>$this->config['timeout_seconds'],CURLOPT_WRITEFUNCTION=>static function($handle,$chunk) use (&$response){if(strlen($response)+strlen($chunk)>65536)return 0;$response.=$chunk;return strlen($chunk);}];
            if($ca!==null)$options[CURLOPT_CAINFO]=$ca;
            if(!curl_setopt_array($ch,$options)) throw new Failure('PHANTOM_CURL_SETUP');
            $ok=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);$curlError=curl_error($ch);
        } catch(Failure $e){throw $e;} catch(\Throwable){throw new Failure('PHANTOM_CURL_RUNTIME');}
        finally {if($ch instanceof \CurlHandle)curl_close($ch);restore_error_handler();}
        if($ok===false) throw new Failure(CurlTransport::diagnosticCodeForCurlFailure($errno,$curlError),$errno===CURLE_OPERATION_TIMEDOUT?504:503);
        if($code===401 || $code===403) throw new Failure('TOKEN_EXPIRED',503,$code);
        if($code<200 || $code>=300) throw new Failure('PHANTOM_PAYMENT_HTTP',503,$code);
        if(str_starts_with($response,"\xEF\xBB\xBF"))$response=substr($response,3);
        if(trim($response)!=='OK') throw new Failure('PHANTOM_PAYMENT_REJECTED');
    }
}
