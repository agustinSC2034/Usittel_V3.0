<?php
declare(strict_types=1);
namespace MiUsittel;

interface Transport { public function post(string $url, array $body): array; }
final class CurlTransport implements Transport {
    public function __construct(private array $config) {}
    public function post(string $url, array $body): array {
        if (!extension_loaded('curl')) throw new Failure('CONFIGURATION');
        try { $encoded=json_encode($body,JSON_THROW_ON_ERROR); }
        catch(\JsonException) { throw new Failure('PHANTOM_REQUEST_FORMAT'); }
        $ca=null;
        if($this->config['ca_file']!==null) {
            if(!is_string($this->config['ca_file']) || ($ca=realpath($this->config['ca_file']))===false || !is_file($ca) || !is_readable($ca)) throw new Failure('PHANTOM_CA_FILE');
        }
        $ch=null;$response='';$ok=false;$code=0;$errno=0;$curlError='';
        try {
            $ch=curl_init($url);
            if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
            $options=[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$encoded,
                CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json'],
                CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
                CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
                CURLOPT_CONNECTTIMEOUT=>$this->config['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$this->config['timeout_seconds'],
                CURLOPT_WRITEFUNCTION=>static function($handle,$chunk) use (&$response) { if(strlen($response)+strlen($chunk)>2097152) return 0; $response.=$chunk; return strlen($chunk); }];
            if(!curl_setopt_array($ch,$options)) throw new Failure('PHANTOM_CURL_SETUP');
            if($ca!==null && !curl_setopt($ch,CURLOPT_CAINFO,$ca)) throw new Failure('PHANTOM_CA_FILE');
            $ok=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);$curlError=curl_error($ch);
        } catch(Failure $e) { throw $e; }
        catch(\Throwable) { throw new Failure('PHANTOM_CURL_RUNTIME'); }
        finally { if($ch instanceof \CurlHandle) curl_close($ch); }
        if ($ok===false) throw new Failure(self::diagnosticCodeForCurlFailure($errno,$curlError),$errno===CURLE_OPERATION_TIMEDOUT?504:503);
        return self::decodeHttpResponse($code,$response);
    }
    public static function decodeHttpResponse(int $code,string $response): array {
        if (in_array($code,[401,403],true)) throw new Failure('TOKEN_EXPIRED',503,$code);
        if ($code<200 || $code>=300) throw new Failure('PHANTOM_HTTP',503,$code);
        try { $json=json_decode($response,true,32,JSON_THROW_ON_ERROR); } catch (\JsonException) { throw new Failure('PHANTOM_FORMAT',503,$code); }
        if (!is_array($json)) throw new Failure('PHANTOM_FORMAT',503,$code);
        return $json;
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
        $data=$this->transport->post($this->config['phantom_url'].'?'.http_build_query(['action'=>$action,'JSON'=>1]+$params),$body);
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
        $key=hash('sha256',$this->config['phantom_url'].'|'.$this->config['api_user'].'|'.$this->config['api_pass']);
        return locked($this->dir.'/token-'.$key.'.json',function($f) use ($refresh) {
            $cached=json_decode(stream_get_contents($f),true);
            if (!$refresh && is_array($cached) && ($cached['until']??0)>time() && is_string($cached['token']??null)) return $cached['token'];
            writeFileHandle($f,[]);
            $data=$this->raw('autentificar',[],['api_user'=>$this->config['api_user'],'api_pass'=>$this->config['api_pass']]);
            if (!is_string($data['token']??null) || $data['token']==='') throw new Failure('PHANTOM_TOKEN');
            writeFileHandle($f,['token'=>$data['token'],'until'=>time()+840]);
            return $data['token'];
        });
    }
    private function read(string $action,int $ida,array $params=[]): array {
        if (!in_array($ida,$this->config['allowed_idas'],true)) throw new Failure('FORBIDDEN',403);
        if (!in_array($action,['Consulta_Cliente_Avanzada','Phantom_Ultima_Factura','Phantom_Mi_Estado_Cuenta'],true)) throw new Failure('FORBIDDEN',403);
        for($attempt=0;$attempt<2;$attempt++) {
            $token=$this->token($attempt===1);
            try { return $this->raw($action,['IDA'=>$ida]+$params,['token'=>$token]); }
            catch(Failure $e) { if($e->kind!=='TOKEN_EXPIRED' || $attempt===1) throw $e; }
        }
        throw new Failure('PHANTOM_TOKEN');
    }
    public function customer(int $ida): array {
        $data=atPath($this->read('Consulta_Cliente_Avanzada',$ida),$this->config['customer_path']);
        if (!is_array($data) || array_is_list($data)) throw new Failure('PHANTOM_FORMAT');
        // Never expand Conexiones_Asociadas or search other records.
        return $data;
    }
    public function verify(int $ida,string $user,string $password): bool {
        $c=$this->customer($ida);
        $u=$c['Autogestion_User']??null; $p=$c['Autogestion_Pass']??null;
        // Exact strings only; no trimming, numeric conversion, DNI fallback.
        return is_string($u) && $u!=='' && is_string($p) && $p!=='' && hash_equals($u,$user) && hash_equals($p,$password);
    }
    public function profile(int $ida): array {
        $raw=$this->customer($ida); $out=[];
        foreach(['name','address','plan','city','email','phone'] as $key) $out[$key]=publicField($raw,$this->config['profile_fields'][$key]??null);
        $out['serviceStatus']=textValue($raw['Estado_Servicio']??null);
        $out['network']=null; $out['speed']=null;
        return $out;
    }
    public function balance(int $ida): array {
        if ($this->config['balance_path']===null) return ['balance'=>null,'debt'=>null,'credit'=>null];
        $value=amount(atPath($this->read('Phantom_Mi_Estado_Cuenta',$ida),$this->config['balance_path']));
        if($value===null) throw new Failure('BALANCE_SCHEMA');
        return ['balance'=>$value,'debt'=>max(0,-$value),'credit'=>max(0,$value)];
    }
    public function inspectSchema(int $ida): array {
        // Names and types only. Lists inspect at most one representative item;
        // nesting and total field count are bounded so this cannot dump records.
        $remaining=120;
        $shape=function(mixed $value,int $depth=0) use (&$shape,&$remaining): mixed {
            if(!is_array($value)) return get_debug_type($value);
            if($depth>=4 || $remaining<=0) return ['type'=>array_is_list($value)?'array':'object','truncated'=>true];
            if(array_is_list($value)) return ['type'=>'array','items'=>$value===[]?'unknown':$shape($value[0],$depth+1)];
            $fields=[];
            foreach($value as $key=>$child) {
                if($remaining--<=0) break;
                if(!is_string($key) || !preg_match('/^[A-Za-z_][A-Za-z_0-9]*$/D',$key)) continue;
                if(preg_match('/(?:^|_)(?:autogestion|pass(?:word)?|token|secret|hash|url|link|archivo|documento|pdf|dni|cuit|cuil|tarjeta|cbu|alias)(?:_|$)|conexiones_asociadas/i',$key)) continue;
                $fields[$key]=$shape($child,$depth+1);
            }
            return ['type'=>'object','fields'=>$fields];
        };
        if(!in_array($ida,$this->config['allowed_idas'],true)) throw new InspectionFailure('configuracion','FORBIDDEN',new Failure('FORBIDDEN',403));
        $token=$this->inspectionStep('autenticacion',fn()=>$this->token(true));
        $customer=$this->inspectionStep('cliente',function() use ($ida,$token) {
            $data=atPath($this->raw('Consulta_Cliente_Avanzada',['IDA'=>$ida],['token'=>$token]),$this->config['customer_path']);
            if(!is_array($data) || array_is_list($data)) throw new Failure('PHANTOM_FORMAT');
            return $data;
        });
        $account=$this->inspectionStep('estado_cuenta',fn()=>$this->raw('Phantom_Mi_Estado_Cuenta',['IDA'=>$ida],['token'=>$token]));
        $invoice=$this->inspectionStep('factura',fn()=>$this->raw('Phantom_Ultima_Factura',['IDA'=>$ida,'Limit'=>1,'Offset'=>0],['token'=>$token]));
        return ['customer'=>$shape($customer),'account'=>$shape($account),'invoice'=>$shape($invoice)];
    }
    private function inspectionStep(string $stage,callable $callback): mixed {
        try { return $callback(); }
        catch(InspectionFailure $e) { throw $e; }
        catch(\Throwable $e) { throw new InspectionFailure($stage,$e instanceof Failure?$e->kind:'UNEXPECTED',$e); }
    }
    public function invoices(int $ida,int $offset=0): array {
        $data=$this->read('Phantom_Ultima_Factura',$ida,['Limit'=>20,'Offset'=>$offset]);
        if(!array_is_list($data)) throw new Failure('INVOICES_SCHEMA');
        $out=[];
        foreach($data as $row) {
            if(!is_array($row) || !isset($row['IDT']) || !preg_match('/^\d+$/D',(string)$row['IDT'])) throw new Failure('INVOICES_SCHEMA');
            $out[]=['id'=>(string)$row['IDT'],'period'=>textValue($row['Periodo']??null), 'amount'=>amount($row['Total']??null),
                'due'=>dateValue($row['Primer_Vto']??null),'secondDue'=>dateValue($row['Segundo_Vto']??null),
                'status'=>match($row['Estado']??null) {'PAGADA'=>'Pagada','IMPAGA'=>'Pendiente',default=>'No disponible'},
                'type'=>textValue($row['Tipo']??null),'number'=>textValue($row['Comp_ID']??null),'paidAt'=>null,'outstanding'=>null];
        }
        return ['items'=>$out,'offset'=>$offset,'nextOffset'=>count($out)===20?$offset+20:null];
    }
}
