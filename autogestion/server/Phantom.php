<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/Schema.php';
require_once __DIR__.'/CustomerContract.php';
require_once __DIR__.'/Invoices.php';

interface Transport {
    public function post(string $url, array $body): array;
    public function authenticate(string $url,array $credentials): array;
}
final class CurlTransport implements Transport {
    public function __construct(private array $config, private bool $inspectorAuthForm=false, private bool $inspectResponseFormat=false) {}
    public function authenticate(string $url,array $credentials): array {
        // Explicit laboratory contract: GET only for technical authentication.
        parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
        if($query!==['action'=>'autentificar','JSON'=>'1'] || array_keys($credentials)!==['api_user','api_pass']) throw new Failure('CONFIGURATION');
        return $this->request($url.'&'.http_build_query($credentials,'','&',PHP_QUERY_RFC3986),[CURLOPT_HTTPGET=>true,CURLOPT_HTTPHEADER=>['Accept: application/json']]);
    }
    public function post(string $url, array $body): array {
        if (!extension_loaded('curl')) throw new Failure('CONFIGURATION');
        // Explicit inspector experiment only; account reads and the portal stay JSON.
        parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
        $form=$this->inspectorAuthForm && ($query['action']??null)==='autentificar';
        try { $encoded=$form?http_build_query($body,'','&',PHP_QUERY_RFC3986):json_encode($body,JSON_THROW_ON_ERROR); }
        catch(\JsonException) { throw new Failure('PHANTOM_REQUEST_FORMAT'); }
        return $this->request($url,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$encoded,
            CURLOPT_HTTPHEADER=>['Content-Type: '.($form?'application/x-www-form-urlencoded':'application/json'),'Accept: application/json']]);
    }
    private function request(string $url,array $methodOptions): array {
        if(!extension_loaded('curl')) throw new Failure('CONFIGURATION');
        $parts=parse_url($url);
        if(($parts['scheme']??null)!=='https' || empty($parts['host']) || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment'])) throw new Failure('CONFIGURATION');
        $ca=null;
        if($this->config['ca_file']!==null) {
            if(!is_string($this->config['ca_file']) || ($ca=realpath($this->config['ca_file']))===false || !is_file($ca) || !is_readable($ca)) throw new Failure('PHANTOM_CA_FILE');
        }
        $ch=null;$response='';$ok=false;$code=0;$errno=0;$curlError='';
        // cURL warnings may contain the URL; never send their raw text to logs.
        set_error_handler(static function() {throw new Failure('PHANTOM_CURL_RUNTIME');});
        try {
            $ch=curl_init($url);
            if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
            $options=$methodOptions+[
                CURLOPT_VERBOSE=>false,
                CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
                CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
                CURLOPT_CONNECTTIMEOUT=>$this->config['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$this->config['timeout_seconds'],
                CURLOPT_WRITEFUNCTION=>static function($handle,$chunk) use (&$response) { if(strlen($response)+strlen($chunk)>2097152) return 0; $response.=$chunk; return strlen($chunk); }];
            if($ca!==null) $options[CURLOPT_CAINFO]=$ca;
            if(!curl_setopt_array($ch,$options)) throw new Failure('PHANTOM_CURL_SETUP');
            $ok=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);$curlError=curl_error($ch);
        } catch(Failure $e) { throw $e; }
        catch(\Throwable) { throw new Failure('PHANTOM_CURL_RUNTIME'); }
        finally { if($ch instanceof \CurlHandle) curl_close($ch); restore_error_handler(); }
        if ($ok===false) throw new Failure(self::diagnosticCodeForCurlFailure($errno,$curlError),$errno===CURLE_OPERATION_TIMEDOUT?504:503);
        return self::decodeHttpResponse($code,$response,$this->inspectResponseFormat);
    }
    public static function decodeHttpResponse(int $code,string $response,bool $diagnoseFormat=false): array {
        if (in_array($code,[401,403],true)) throw new Failure('TOKEN_EXPIRED',503,$code);
        if ($code<200 || $code>=300) throw new Failure('PHANTOM_HTTP',503,$code);
        // Tolerate exactly one UTF-8 BOM at byte zero; never trim arbitrary output.
        if(str_starts_with($response,"\xEF\xBB\xBF")) $response=substr($response,3);
        try { $json=json_decode($response,true,32,JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new Failure('PHANTOM_FORMAT',503,$code,$diagnoseFormat?self::invalidFormat($response,$e):null); }
        if (!is_array($json)) {
            $format=match(true) {is_string($json)=>'JSON_STRING',is_bool($json)=>'JSON_BOOLEAN',is_null($json)=>'JSON_NULL',default=>'JSON_NUMBER'};
            if($diagnoseFormat && is_string($json)) {
                try {if(is_array(json_decode($json,true,32,JSON_THROW_ON_ERROR))) $format='JSON_DENTRO_DE_STRING';}
                catch(\JsonException) {} // Classify only; do not accept or expose the inner response.
            }
            throw new Failure('PHANTOM_FORMAT',503,$code,$diagnoseFormat?$format:null);
        }
        return $json;
    }
    private static function invalidFormat(string $response,\JsonException $error): string {
        if(trim($response)==='') return 'RESPUESTA_VACIA';
        if(str_starts_with($response,"\xEF\xBB\xBF")) return 'PREFIJO_BOM_UTF8';
        if(preg_match('/^\s*(?:<!doctype\s+html\b|<html\b|<head\b|<body\b|<br\s*\/?\s*>)/i',$response)) return 'APARIENCIA_HTML';
        if($error->getCode()===JSON_ERROR_UTF8) return 'UTF8_INVALIDO';
        if($error->getCode()===JSON_ERROR_DEPTH) return 'JSON_PROFUNDIDAD_EXCEDIDA';
        return 'TEXTO_O_JSON_INVALIDO';
    }
    public static function diagnosticCodeForCurlErrno(int $errno): string {
        $map=[CURLE_OPERATION_TIMEDOUT=>'PHANTOM_TIMEOUT',CURLE_COULDNT_RESOLVE_HOST=>'PHANTOM_DNS',
            CURLE_COULDNT_CONNECT=>'PHANTOM_CONNECT',CURLE_SSL_CONNECT_ERROR=>'PHANTOM_TLS_HANDSHAKE',
            CURLE_WRITE_ERROR=>'PHANTOM_RESPONSE_TOO_LARGE'];
        // Stable CURLE values; some Windows PHP builds omit the named constants.
        foreach([77,82] as $code) $map[$code]='PHANTOM_CA_FILE';
        foreach([60,83,90] as $code) $map[$code]='PHANTOM_TLS_VERIFY';
        foreach([35,58,59,64] as $code) $map[$code]='PHANTOM_TLS_HANDSHAKE';
        return $map[$errno]??'PHANTOM_NETWORK';
    }
    public static function diagnosticCodeForCurlFailure(int $errno,string $error): string {
        if(!in_array($errno,[60,83,90],true)) return self::diagnosticCodeForCurlErrno($errno);
        $error=strtolower($error);
        $details=[
            'PHANTOM_TLS_ISSUER'=>['unable to get local issuer certificate','unable to get issuer certificate'],
            'PHANTOM_TLS_HOSTNAME'=>['no alternative certificate subject name matches','does not match target host name','hostname mismatch'],
            'PHANTOM_TLS_EXPIRED'=>['certificate has expired','certificate expired'],
            'PHANTOM_TLS_NOT_YET_VALID'=>['certificate is not yet valid','certificate not yet valid'],
            'PHANTOM_TLS_REVOKED'=>['certificate revoked','certificate has been revoked'],
            'PHANTOM_TLS_SELF_SIGNED'=>['self-signed certificate','self signed certificate'],
        ];
        foreach($details as $code=>$fragments) foreach($fragments as $fragment) if(str_contains($error,$fragment)) return $code;
        return 'PHANTOM_TLS_VERIFY';
    }
}
final class Phantom {
    public function __construct(private array $config, private string $dir, private Transport $transport) {}
    private function raw(string $action, array $params, array $body): array {
        $url=$this->config['phantom_url'].'?'.http_build_query(['action'=>$action,'JSON'=>1]+$params);
        $data=$action==='autentificar'?$this->transport->authenticate($url,$body):$this->transport->post($url,$body);
        if (isset($data['code']) && (int)$data['code']!==200) {
            if (in_array((int)$data['code'],[401,403],true)) throw new Failure('TOKEN_EXPIRED');
            if ($action==='Phantom_Ultima_Factura' && (int)$data['code']===400 && ($data['message']??null)==='Error: No se encontró factura para el cliente (400)') return [];
            throw new Failure('PHANTOM_FUNCTIONAL');
        }
        if (isset($data['error']) || (isset($data['message']) && is_string($data['message']) && str_starts_with($data['message'],'Error:'))) throw new Failure('PHANTOM_FUNCTIONAL');
        return $data;
    }
    private function token(bool $refresh=false): string {
        // Separate cache when credentials/host change, no token in PHP session.
        $key=hash('sha256','get-query-lab|'.$this->config['phantom_url'].'|'.$this->config['api_user'].'|'.$this->config['api_pass']);
        return locked($this->dir.'/token-'.$key.'.json',function($f) use ($refresh) {
            $cached=json_decode(stream_get_contents($f),true);
            if (!$refresh && is_array($cached) && ($cached['until']??0)>time() && is_string($cached['token']??null)) return $cached['token'];
            writeFileHandle($f,[]);
            $data=$this->raw('autentificar',[],['api_user'=>$this->config['api_user'],'api_pass'=>$this->config['api_pass']]);
            if (!is_string($data['token']??null) || trim($data['token'])==='') throw new Failure('PHANTOM_TOKEN');
            writeFileHandle($f,['token'=>$data['token'],'until'=>time()+840]);
            return $data['token'];
        });
    }
    private ?array $scope=null;
    public function scope(array $ids): void { $this->scope=$ids; }
    private function read(string $action,int $ida,array $params=[]): array {
        if (!in_array($ida,$this->scope ?? ($this->config['service_login_idas']??array_values(array_intersect([1],$this->config['allowed_idas']))),true)) throw new Failure('FORBIDDEN',403);
        if (!in_array($action,['Consulta_Cliente_Avanzada','Phantom_Ultima_Factura','Phantom_Mi_Estado_Cuenta'],true)) throw new Failure('FORBIDDEN',403);
        return $this->readAuthorized($action,['IDA'=>$ida]+$params);
    }
    private function readAuthorized(string $action,array $params): array {
        for($attempt=0;$attempt<2;$attempt++) {
            $token=$this->token($attempt===1);
            try { return $this->raw($action,$params,['token'=>$token]); }
            catch(Failure $e) { if($e->kind!=='TOKEN_EXPIRED' || $attempt===1) throw $e; }
        }
        throw new Failure('PHANTOM_TOKEN');
    }
    public function customersByDocument(string $document): array {
        if(!in_array(strlen($document),[7,8,11],true) || !ctype_digit($document)) throw new Failure('SERVICES_DOCUMENT_SCHEMA');
        return $this->readAuthorized('Consulta_Cliente_Avanzada',['Documento'=>$document]);
    }
    public function customer(int $ida): array {
        $field=$this->config['customer_id_field']??null;
        if(!in_array($field,['ID','IDAx'],true)) throw new Failure('LAB_IDENTITY_PENDING');
        return resolveCustomerRecord($this->read('Consulta_Cliente_Avanzada',$ida),$ida,$field);
    }
    public function verify(int $ida,string $user,string $password): bool {
        $c=$this->customer($ida);
        $u=$c['Autogestion_User']??null; $p=$c['Autogestion_Pass']??null;
        // Exact strings only; no trimming, numeric conversion, DNI fallback.
        return is_string($u) && $u!=='' && is_string($p) && $p!=='' && hash_equals($u,$user) && hash_equals($p,$password);
    }
    public function profile(int $ida): array {
        return $this->publicProfile($this->customer($ida));
    }
    public function publicProfile(array $raw): array {
        $out=[];
        $defaults=['name'=>['join'=>[['Nombre'],['Apellido']]],'address'=>['join'=>[['Direccion'],['Dir_Numero']]],
            'plan'=>['Producto_Internet'],'city'=>['Ciudad'],'email'=>['Email'],'phone'=>['Telefono']];
        foreach($defaults as $key=>$mapping) $out[$key]=publicField($raw,$this->config['profile_fields'][$key]??$mapping);
        if(empty($this->config['profile_fields']['name'])) $out['name']=textValue($raw['Razon_Social']??null)??$out['name'];
        if(empty($this->config['profile_fields']['phone'])) $out['phone']=$out['phone']??textValue($raw['Movil']??null);
        if(empty($this->config['profile_fields']['address'])) {
            $extra=[];
            foreach(['Dir_Lote'=>'Lote','Dir_Manzana'=>'Manzana','Dir_Referencia'=>'Referencia','Barrio'=>'Barrio'] as $key=>$label) {
                $value=textValue($raw[$key]??null);if($value!==null) $extra[]=$label.': '.$value;
            }
            $out['address']=implode(' · ',array_filter([$out['address'],...$extra],fn($v)=>$v!==null))?:null;
        }
        $out['serviceStatus']=textValue($raw['Estado_Servicio']??null);
        $out['network']=null; $out['speed']=null;
        return $out;
    }
    public function balance(int $ida): array {
        $data=$this->read('Phantom_Mi_Estado_Cuenta',$ida);
        $value=amount($data['Balance']??null);
        if($value===null) throw new Failure('BALANCE_SCHEMA');
        // USITTEL laboratory verified against Phantom: positive Balance is debt.
        // Preserve the raw sign; never derive account balance from invoices.
        return ['balance'=>$value,'debt'=>max(0,$value),'credit'=>max(0,-$value)];
    }
    public function inspectSchema(int $ida): array {
        // Names and types only. Lists inspect at most one representative item;
        // nesting and total field count are bounded so this cannot dump records.
        $remaining=120;
        if($ida!==1 || !in_array($ida,$this->config['allowed_idas'],true)) throw new InspectionFailure('configuracion','FORBIDDEN',new Failure('FORBIDDEN',403));
        $token=$this->inspectionStep('autenticacion',fn()=>$this->token(true));
        $customer=$this->inspectionStep('cliente',function() use ($ida,$token) {
            $data=$this->raw('Consulta_Cliente_Avanzada',['IDA'=>$ida],['token'=>$token]);
            return $data;
        });
        $account=$this->inspectionStep('estado_cuenta',fn()=>$this->raw('Phantom_Mi_Estado_Cuenta',['IDA'=>$ida],['token'=>$token]));
        $invoice=$this->inspectionStep('factura',fn()=>$this->raw('Phantom_Ultima_Factura',['IDA'=>$ida,'Limit'=>1,'Offset'=>0],['token'=>$token]));
        return ['customer'=>inspectionShape($customer,$remaining),'account'=>inspectionShape($account,$remaining),'invoice'=>inspectionShape($invoice,$remaining)];
    }
    private function inspectionStep(string $stage,callable $callback): mixed {
        try { return $callback(); }
        catch(InspectionFailure $e) { throw $e; }
        catch(\Throwable $e) { throw new InspectionFailure($stage,$e instanceof Failure?$e->kind:'UNEXPECTED',$e); }
    }
    public function invoiceRows(int $ida,int $offset=0,int $limit=INVOICE_PAGE_SIZE): array {
        if($offset<0 || $offset>INVOICE_MAX_OFFSET || !in_array($limit,[1,INVOICE_PAGE_SIZE],true)) throw new Failure('BAD_REQUEST',400);
        return validateInvoiceRows($this->read('Phantom_Ultima_Factura',$ida,['Limit'=>$limit,'Offset'=>$offset]),$limit,$ida);
    }
    public function invoices(int $ida,int $offset=0): array {
        if($offset<0 || $offset>INVOICE_MAX_OFFSET || $offset%INVOICE_PAGE_SIZE!==0) throw new Failure('BAD_REQUEST',400);
        return invoicePage($this->invoiceRows($ida,$offset),$offset,$ida);
    }
}
