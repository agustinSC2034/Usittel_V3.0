<?php
declare(strict_types=1);
namespace MiUsittel;

interface Transport { public function post(string $url, array $body): array; }
final class CurlTransport implements Transport {
    public function __construct(private array $config) {}
    public function post(string $url, array $body): array {
        if (!extension_loaded('curl')) throw new Failure('CONFIGURATION');
        $ch=curl_init($url); $response='';
        curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($body,JSON_THROW_ON_ERROR),
            CURLOPT_HTTPHEADER=>['Content-Type: application/json','Accept: application/json'],
            CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
            CURLOPT_CONNECTTIMEOUT=>$this->config['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$this->config['timeout_seconds'],
            CURLOPT_WRITEFUNCTION=>static function($ch,$chunk) use (&$response) { if(strlen($response)+strlen($chunk)>2097152) return 0; $response.=$chunk; return strlen($chunk); }]);
        if ($this->config['ca_file']) curl_setopt($ch,CURLOPT_CAINFO,$this->config['ca_file']);
        $ok=curl_exec($ch); $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE); $errno=curl_errno($ch); curl_close($ch);
        if ($ok===false) throw new Failure($errno===CURLE_OPERATION_TIMEDOUT?'PHANTOM_TIMEOUT':'PHANTOM_NETWORK', $errno===CURLE_OPERATION_TIMEDOUT?504:503);
        if (in_array($code,[401,403],true)) throw new Failure('TOKEN_EXPIRED');
        if ($code<200 || $code>=300) throw new Failure('PHANTOM_HTTP');
        try { $json=json_decode($response,true,32,JSON_THROW_ON_ERROR); } catch (\JsonException) { throw new Failure('PHANTOM_FORMAT'); }
        if (!is_array($json)) throw new Failure('PHANTOM_FORMAT');
        return $json;
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
        // CLI helper returns names/types only, not values or linked records.
        $shape=static function(array $data): array {
            $out=[];
            foreach($data as $key=>$value) {
                if(!is_string($key) || !preg_match('/^[A-Za-z_][A-Za-z_0-9]*$/D',$key)) continue;
                if(preg_match('/pass|token|secret|conexiones_asociadas/i',$key)) continue;
                $out[$key]=get_debug_type($value);
            }
            return $out;
        };
        return ['customer'=>$shape($this->customer($ida)), 'account'=>$shape($this->read('Phantom_Mi_Estado_Cuenta',$ida))];
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
