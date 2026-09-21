<?php
declare(strict_types=1);
namespace MiUsittel;

interface SoapReadTransport {public function invoke(string $method,array $parameters): mixed;}
// No WSDL, trace, external entity fetching, redirects or arbitrary method names.
// The only production SOAP capability in this delivery is read-only inspection.
if(class_exists('SoapClient')) {
    final class BoundedSoapClient extends \SoapClient {
        public function __construct(private array $settings,private string $endpoint) {
            parent::__construct(null,['location'=>$endpoint,'uri'=>'PHANTOMAPI','trace'=>false,'exceptions'=>true,'cache_wsdl'=>WSDL_CACHE_NONE]);
        }
        public function __doRequest(string $request,string $location,string $action,int $version,bool $oneWay=false): ?string {
            if($location!==$this->endpoint) throw new Failure('SOAP_CONFIGURATION');
            $response='';$ch=curl_init($location);
            $options=[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$request,CURLOPT_HTTPHEADER=>['Content-Type: text/xml; charset=utf-8','SOAPAction: "'.$action.'"'],
                CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
                CURLOPT_CONNECTTIMEOUT=>$this->settings['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$this->settings['timeout_seconds'],
                CURLOPT_WRITEFUNCTION=>static function($ch,$chunk) use(&$response) {if(strlen($response)+strlen($chunk)>2097152)return 0;$response.=$chunk;return strlen($chunk);}];
            if($this->settings['ca_file']!==null) $options[CURLOPT_CAINFO]=$this->settings['ca_file'];
            try {
                curl_setopt_array($ch,$options);$ok=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);
                if($ok===false) throw new Failure($errno===CURLE_OPERATION_TIMEDOUT?'SOAP_TIMEOUT':'SOAP_NETWORK');
                if($status!==200 || preg_match('/<!DOCTYPE|<!ENTITY/i',$response)) throw new Failure('SOAP_RESPONSE');
                return $response;
            } finally {curl_close($ch);}
        }
    }
}
final class NativeSoapReadTransport implements SoapReadTransport {
    private mixed $client;
    public function __construct(array $c) {
        if(!extension_loaded('soap') || !extension_loaded('curl')) throw new Failure('SOAP_EXTENSION_REQUIRED');
        $url=$c['soap']['url']??null;$p=is_string($url)?parse_url($url):[];
        $rest=parse_url($c['phantom_url']);
        if(($p['scheme']??null)!=='https' || ($p['host']??null)!==($rest['host']??null) || ($p['port']??443)!==($rest['port']??443)
            || ($p['path']??null)!==preg_replace('~/API_Rest\.php$~','/API.php',$rest['path']??'')
            || isset($p['query']) || isset($p['fragment']) || isset($p['user']) || isset($p['pass'])) throw new Failure('SOAP_CONFIGURATION');
        if($c['ca_file']!==null && (!is_string($c['ca_file']) || !is_readable($c['ca_file']))) throw new Failure('SOAP_CONFIGURATION');
        $this->client=new BoundedSoapClient($c,$url);
    }
    public function invoke(string $method,array $parameters): mixed {
        if(!in_array($method,['autentificar','consulta_abonado','consulta_perfiles','desconectar'],true)) throw new Failure('SOAP_METHOD_FORBIDDEN',403);
        try {return $this->client->__soapCall($method,$parameters===[]?[]:[$parameters]);}
        catch(Failure $e) {throw $e;} catch(\Throwable) {throw new Failure('SOAP_RESPONSE');}
    }
}
final class PhantomSoapClient {
    public function __construct(private SoapReadTransport $transport,private array $c) {}
    public function inspect(int $ida,array $profiles): array {
        if($ida<1 || ($this->c['soap']['read_enabled']??false)!==true || ($this->c['soap']['lab_ida']??null)!==$ida) throw new Failure('SOAP_DISABLED',409);
        if(count($profiles)>10) throw new Failure('UPGRADE_CONFIGURATION');
        foreach($profiles as $name) if(!is_string($name) || $name==='' || strlen($name)>160) throw new Failure('UPGRADE_CONFIGURATION');
        $token=$this->transport->invoke('autentificar',['API_User'=>$this->c['api_user'],'API_Pass'=>$this->c['api_pass']]);
        if(!is_string($token) || trim($token)==='' || strlen($token)>512 || preg_match('/error|[<>\s]/i',$token)) throw new Failure('SOAP_AUTH');
        try {
            $subscriber=$this->transport->invoke('consulta_abonado',['token'=>$token,'Id'=>$ida]);
            $results=[];
            foreach($profiles as $name) $results[]=soapSafeShape($this->transport->invoke('consulta_perfiles',['token'=>$token,'Nombre'=>$name]));
            return ['authenticated'=>true,'subscriber'=>soapSafeShape($subscriber),'profiles'=>$results];
        } finally {
            unset($token,$subscriber);
            try {$this->transport->invoke('desconectar',[]);} catch(\Throwable) {}
        }
    }
}
function soapSafeShape(mixed $value,int $depth=0): array {
    if(is_object($value)) $value=get_object_vars($value);
    $r=['type'=>get_debug_type($value)];
    if(!is_array($value)) return $r;
    $r+=['count'=>count($value),'list'=>array_is_list($value)];
    if($depth>=2)return $r;
    if(array_is_list($value)) $r['sample']=array_map(fn($v)=>soapSafeShape($v,$depth+1),array_slice($value,0,1));
    else foreach(['Id','ID','IDA','perfil','Perfil','Perfil_Internet','Producto_Internet','Productos_Internet','TipoCliente','ONU_Modelo','Phantom_Provissioning','Nombre','Down','Up','Precio','Importe'] as $field)
        if(array_key_exists($field,$value)) $r['fields'][$field]=soapSafeShape($value[$field],$depth+1);
    return $r;
}
function upgradeCatalog(array $c): array {
    $plans=$c['upgrade']['plans']??[];
    if(!is_array($plans) || count($plans)>10) throw new Failure('UPGRADE_CONFIGURATION');
    foreach($plans as $key=>$p) {
        if(!is_string($key) || !preg_match('/^[A-Z][A-Z0-9_]{0,39}$/D',$key) || !is_array($p)) throw new Failure('UPGRADE_CONFIGURATION');
        foreach(['current','target','phantom_profile','public_name'] as $field)
            if(!is_string($p[$field]??null) || trim($p[$field])==='' || strlen($p[$field])>160 || preg_match('/[<>\x00-\x1f]/',$p[$field])) throw new Failure('UPGRADE_CONFIGURATION');
        foreach(['current_down','current_up','speed_down','speed_up','price_cents'] as $field)
            if(!is_int($p[$field]??null) || $p[$field]<1 || $p[$field]>100000000) throw new Failure('UPGRADE_CONFIGURATION');
        if($p['current']===$p['target'] || $p['speed_down']<$p['current_down'] || $p['speed_up']<$p['current_up']
            || $p['speed_down']===$p['current_down'] && $p['speed_up']===$p['current_up']) throw new Failure('UPGRADE_NOT_UPWARD',409);
    }
    return $plans;
}
