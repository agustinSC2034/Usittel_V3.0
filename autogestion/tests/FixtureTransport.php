<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/../server/InvoiceDocuments.php';
// Deliberately synthetic schema. Never included by the production router.
final class FixtureTransport implements Transport, TicketTransport {
    public function __construct(private string $dir) {}
    public function ticketGet(string $url): array {
        parse_str((string)parse_url($url,PHP_URL_QUERY),$q);
        if(($q['token']??null)!=='fixture-technical-token' || !in_array($q['IDA']??null,['1','5'],true)) throw new Failure('FORBIDDEN',403);
        if($q['action']==='Phantom_Consultar_Estado_TT') return ['IDTT'=>null,'Permitir'=>1];
        if($q['action']!=='Tickets_Help_Desk') throw new Failure('FORBIDDEN',403);
        $row=['ID'=>'321','IDA'=>$q['IDA'],'Categoria'=>'Fixture TV','Estado'=>'Abierto'];
        $scenario=trim(file_get_contents($this->dir.'/scenario'));
        if(isset($q['IDTT'])) {
            if($scenario==='ticket-foreign')$row['IDA']='999';
            if($scenario==='ticket-ready')$row['Estado']='Resuelto';
            if($scenario==='wifi-timeout')$row['Categoria']='Fixture WiFi';
            return [$row];
        }
        return [];
    }
    public function ticketPost(string $url,array $body): array {
        parse_str((string)parse_url($url,PHP_URL_QUERY),$q);
        if($q['action']!=='Phantom_Generar_TT' || ($body['token']??null)!=='fixture-technical-token' || !in_array($q['IDA']??null,['1','5'],true)) throw new Failure('FORBIDDEN',403);
        file_put_contents($this->dir.'/trace.txt','Phantom_Generar_TT:'.$q['IDA']."\n",FILE_APPEND);
        if(array_keys($body)!==['token','Categoria','Delegacion','Prioridad','Asunto','Detalle'] || preg_match('/TestWifi|Casa_test|SSID|Password/',$body['Detalle'])) throw new Failure('FIXTURE_SECRET');
        if(trim(file_get_contents($this->dir.'/scenario'))==='ticket-timeout') throw new Failure('PHANTOM_TIMEOUT');
        return ['ticket_id'=>'321'];
    }
    public function authenticate(string $url,array $credentials): array {
        parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
        if($query!==['action'=>'autentificar','JSON'=>'1'] || $credentials!==['api_user'=>'fixture-api','api_pass'=>'fixture-api-secret']) throw new \RuntimeException('Invalid fixture auth');
        return $this->post($url,$credentials);
    }
    public function post(string $url,array $body): array {
        parse_str(parse_url($url,PHP_URL_QUERY),$query);
        $action=$query['action'];
        if(!in_array($action,['autentificar','Consulta_Cliente_Avanzada','Phantom_Ultima_Factura','Phantom_Mi_Estado_Cuenta','Configurar_Wifi'],true)) throw new \RuntimeException('Unexpected fixture action');
        file_put_contents($this->dir.'/trace.txt',$action.':'.($query['IDA']??'-')."\n",FILE_APPEND);
        if(isset($query['InfoFTTH'])) file_put_contents($this->dir.'/trace.txt','InfoFTTH:'.$query['InfoFTTH']."\n",FILE_APPEND);
        $scenario=trim(@file_get_contents($this->dir.'/scenario')?:'normal');
        if($action==='Configurar_Wifi') {
            if(($query['IDA']??null)!=='1' || !in_array(array_keys($body),[['token','Ticket','SSID','SSID_5G','Password'],['token','Ticket','SSID','Password']],true) || $body['Ticket']!==0) throw new \RuntimeException('Invalid fixture Wi-Fi contract');
            if($scenario==='wifi-timeout') throw new Failure('PHANTOM_TIMEOUT',504);
            if($scenario==='wifi-expired') throw new Failure('TOKEN_EXPIRED');
            if($scenario==='wifi-ticket') return ['code'=>200,'message'=>'Ticket para cambio de Wifi generado correctamente'];
            if($scenario==='wifi-malformed') return ['ok'=>true];
            return ['code'=>200,'message'=>'Cambio Wifi aplicado exitosamente'];
        }
        if($scenario==='auth-failure' && $action==='autentificar') throw new Failure('PHANTOM_AUTH_TEST');
        if($scenario==='timeout') throw new Failure('PHANTOM_TIMEOUT',504);
        if($scenario==='http') return CurlTransport::decodeHttpResponse(502,'Private upstream failure');
        if(preg_match('/^http-status-(\d{1,3})$/D',$scenario,$match)) {
            return CurlTransport::decodeHttpResponse((int)$match[1],'<html>Private upstream: api_pass=fixture-api-secret token=fixture-technical-token https://fixture.invalid/?secret=do-not-expose</html>');
        }
        if($action==='autentificar') return ['token'=>'fixture-technical-token'];
        if(($body['token']??'')!=='fixture-technical-token') throw new \RuntimeException('Token absent');
        if($scenario==='expired-always') throw new Failure('TOKEN_EXPIRED');
        $documentRead=$action==='Consulta_Cliente_Avanzada' && isset($query['Documento']);
        if(!$documentRead && !in_array((int)($query['IDA']??0),[1,5,6,7],true)) throw new \RuntimeException('Unapproved IDA');
        if($scenario==='expired-once' && !file_exists($this->dir.'/expired')) {touch($this->dir.'/expired');throw new Failure('TOKEN_EXPIRED');}
        if($scenario==='functional') return ['code'=>500,'message'=>'Private upstream failure'];
        if(str_starts_with($scenario,'services-')) {
            $ida=(int)($query['IDA']??0);
            if($action==='Consulta_Cliente_Avanzada') {
                if($documentRead) {
                    if(in_array($scenario,['services-document-timeout','services-document-only-timeout'],true)) throw new Failure('PHANTOM_TIMEOUT',504);
                    if($scenario!=='services-document' || $query['Documento']!=='12345678') throw new Failure('PHANTOM_CUSTOMER_TEST');
                    return [
                        ['ID'=>'1','Cuit'=>'12345678','Direccion'=>'Calle fixture 1','Producto_Internet'=>'Plan fixture 1'],
                        ['ID'=>'5','DNI'=>'12345678','Direccion'=>'Calle fixture 5','Producto_Internet'=>'Plan fixture 5'],
                    ];
                }
                $links=match($scenario) {'services-one'=>[], 'services-three'=>[['ID'=>'1'],['ID'=>'5'],['ID'=>'5'],[['ID'=>'7']]], 'services-bad'=>[['ID'=>'5x']], default=>[['ID'=>'5'],['ID'=>'1'],['ID'=>'5']]};
                if(in_array($scenario,['services-document','services-document-only-timeout'],true)) $links=[''];
                return [['ID'=>$scenario==='services-wrong' && $ida===5?'8':(string)$ida,'IDAx'=>'999',
                    'Autogestion_User'=>$ida===6?'000006':'000001','Autogestion_Pass'=>' 00Lab-fixture! ',
                    'Direccion'=>$scenario==='services-missing'?null:'Calle fixture '.$ida,'Producto_Internet'=>'Plan fixture '.$ida,
                    'Estado_Servicio'=>'Activo','ONU_Modelo'=>'Fixture-ONU','Conexiones_Asociadas'=>$ida===1?$links:[],
                    'DNI'=>$scenario==='services-document'?'12345678':'do-not-expose', 'Cuit'=>in_array($scenario,['services-document','services-document-timeout','services-document-only-timeout'],true)?'12345678':null]];
            }
            if($action==='Phantom_Mi_Estado_Cuenta') return ['Balance'=>(string)($ida*10)];
            return [['IDA'=>(string)$ida,'IDT'=>(string)($ida*100),'Estado'=>'IMPAGA','Total'=>'10.00','Periodo'=>'2026-09','Hash_Descarga'=>'do-not-expose']];
        }
        if($action==='Consulta_Cliente_Avanzada') {
            if($scenario==='customer-failure') throw new Failure('PHANTOM_CUSTOMER_TEST');
            $record=['ID'=>'1','IDAx'=>'99','Autogestion_User'=>$scenario==='custom-user'?'laboratorio':'000001', 'Autogestion_Pass'=>' 00Lab-fixture! ',
                'Estado_Servicio'=>'Suspendido','Estado_Conexion'=>'Online','Estado_ONU'=>'Offline','ONU_Status'=>$scenario==='unknown-connectivity'?'Loss':'Offline','ONU_Modelo'=>$scenario==='wifi-unknown-model'?'Other-ONU':'Fixture-ONU',
                'Nombre'=>$scenario==='missing'?null:'Cliente de pruebas','Apellido'=>null,'Razon_Social'=>null,
                'Direccion'=>'Calle ficticia','Dir_Numero'=>'123','Ciudad'=>'Tandil','Producto_Internet'=>'Plan de laboratorio',
                'Email'=>'cliente@example.invalid','Telefono'=>'fixture-phone','Balance_CC'=>'9999999',
                'test_name'=>$scenario==='missing'?null:'Cliente de pruebas', 'test_address'=>'Calle ficticia 123', 'test_plan'=>'Plan de laboratorio',
                'technical_meta'=>['connection'=>['state'=>'fixture-state','ports'=>[['kind'=>'ethernet','enabled'=>true]]]],
                'Conexiones_Asociadas'=>[['IDA'=>999,'Autogestion_Pass'=>'do-not-expose']], 'DNI'=>'do-not-expose', 'Tarjeta'=>'do-not-expose'];
            if($scenario==='missing-credentials') unset($record['Autogestion_User'],$record['Autogestion_Pass']);
            if($scenario==='missing') {$record['Estado_Conexion']=null;$record['Estado_ONU']=null;}
            if($scenario==='unknown-connectivity') {$record['Estado_Conexion']='SYNCING';$record['Estado_ONU']=['unexpected'];}
            if($scenario==='numeric-password') $record['Autogestion_Pass']=123;
            if($scenario==='numeric-user') $record['Autogestion_User']=1;
            if($scenario==='empty-password') $record['Autogestion_Pass']='';
            if($scenario==='wrong-identity') $record['ID']='2';
            if($scenario==='missing-identity') unset($record['ID']);
            if($scenario==='numeric-identity') $record['ID']=1;
            if($scenario==='alternate-identity') {$record['ID']='2';$record['IDAx']='1';}
            if($scenario==='empty-customer') return [];
            if($scenario==='object-customer') return $record;
            if($scenario==='duplicate-customer') return [$record,$record];
            if($scenario==='ambiguous-customer') return [$record,array_replace($record,['ID'=>'2'])];
            return [$record];
        }
        if($action==='Phantom_Mi_Estado_Cuenta') {
            if($scenario==='account-failure') throw new Failure('PHANTOM_ACCOUNT_TEST');
            if($scenario==='balance-error') return ['code'=>500,'message'=>'Private balance failure'];
            return ['Balance'=>match($scenario) {'missing'=>null,'credit'=>'-150.50','zero'=>'0.00','lab-debt'=>'121','invalid-balance'=>'$ 12.500,75',default=>'12500.75'},
                'breakdown'=>['charges'=>[['kind'=>'fixture','amount'=>'1.00']]]];
        }
        if($scenario==='invoice-failure') throw new Failure('PHANTOM_INVOICE_TEST');
        if($scenario==='unexpected-invoice') throw new \TypeError('sensitive-value-do-not-print');
        if($scenario==='empty') return ['code'=>400,'message'=>'Error: No se encontró factura para el cliente (400)'];
        if($scenario==='invoices-error') return ['code'=>400,'message'=>'Some other error'];
        if($scenario==='malformed-invoices') return ['unrecognized'=>[]];
        $row=['SIRO_CE'=>'1111111111111111111','IDT'=>123,'Estado'=>is_file($this->dir.'/phantom-posted')?'PAGADA':'IMPAGA','Tipo'=>'Factura','Periodo'=>'2026-09','Total'=>'20000.25','Comp_ID'=>'1-123','Primer_Vto'=>'2026-09-20','Segundo_Vto'=>'2026-09-25',
            'Metadata'=>['currency'=>'ARS','items'=>[['description'=>'fixture-item','quantity'=>1]]],
            'Hash_Descarga'=>'do-not-expose','URL_PAGO'=>'https://do-not-expose.invalid'];
        if($scenario==='missing') $row=['IDT'=>123];
        if($scenario==='lab-debt') $row=array_replace($row,['Total'=>'121','Estado'=>'PAGADA']);
        if($scenario==='invalid-invoice') $row=array_replace($row,['Total'=>'12.500,75','Primer_Vto'=>'2026-02-30','Segundo_Vto'=>"2026-09-20\0",'Estado'=>'UNKNOWN']);
        if($scenario==='invalid-invoice-id') $row['IDT']=true;
        if($scenario==='duplicate-invoice') return [$row,$row];
        if($scenario==='foreign-invoice') $row['IDA']='5';
        if($scenario==='document-missing-hash') unset($row['Hash_Descarga']);
        if($scenario==='document-invalid-hash') $row['Hash_Descarga']=['private-hash'];
        if(str_starts_with($scenario,'history-') || $scenario==='pagination') {
            $total=match($scenario) {'history-zero'=>0,'history-one'=>1,'history-short'=>7,'history-exact'=>10,default=>25};
            $rows=[];for($i=0;$i<$total;$i++) $rows[]=array_replace($row,['IDT'=>(string)(1000-$i)]);
            $offset=(int)$query['Offset'];$limit=(int)$query['Limit'];
            if($scenario==='history-repeat' && $offset>=10) $offset=0;
            if($scenario==='history-changed-detail' && $limit===1) $offset++;
            $rows=array_slice($rows,$offset,$limit);
            if($scenario==='history-order') $rows=array_reverse($rows);
            if($scenario==='history-duplicate' && count($rows)>1) $rows[1]=$rows[0];
            return $rows;
        }
        return array_slice([$row],(int)($query['Offset']??0),(int)($query['Limit']??1));
    }
}

final class FixtureCrm implements PhantomCrmGateway {
    private bool $authenticated=false;
    public function __construct(private string $dir) {}
    private function scenario(): string {return trim(@file_get_contents($this->dir.'/scenario')?:'normal');}
    public function authenticate(bool $refresh=false): void {
        file_put_contents($this->dir.'/crm-auth-calls','1',FILE_APPEND);$this->authenticated=true;
    }
    public function unpaid(string $idt): array {
        if(!$this->authenticated)$this->authenticate();
        $scenario=$this->scenario();
        if($scenario==='crm-token-expired' && !is_file($this->dir.'/crm-expired')) {touch($this->dir.'/crm-expired');$this->authenticate(true);}
        if(is_file($this->dir.'/phantom-posted') || $scenario==='crm-unpaid-missing') return [];
        $row=[$idt,'Fixture abonado','1','2026-09-01','2026-09','1-123','20000.25',[],'','','0','2026-09-20','2026-09-25'];
        if($scenario==='crm-idt-mismatch')$row[0]='999';
        if($scenario==='crm-ida-mismatch')$row[2]='5';
        if($scenario==='crm-amount-mismatch')$row[6]='1.00';
        if($scenario==='crm-malformed')return [['private']];
        return [$row];
    }
    public function impute(string $idt,int $cents,string $origin,string $reference): string {
        if(!$this->authenticated)$this->authenticate();
        if($idt!=='123' || $cents!==2000025 || $origin!=='SIRO Mi USITTEL' || !preg_match('/^SIRO [a-f0-9-]{36}$/D',$reference)) throw new \RuntimeException('invalid safe fixture payment');
        file_put_contents($this->dir.'/phantom-post-calls','1',FILE_APPEND);$scenario=$this->scenario();
        if($scenario==='phantom-post-timeout') throw new Failure('PHANTOM_TIMEOUT');
        if($scenario==='phantom-post-timeout-after-write'){touch($this->dir.'/phantom-posted');throw new Failure('PHANTOM_TIMEOUT');}
        if($scenario==='crm-post-error')return 'ERROR';
        if($scenario==='crm-post-error-after-write'){touch($this->dir.'/phantom-posted');return 'ERROR';}
        if($scenario==='crm-post-unknown')return 'UNKNOWN';
        touch($this->dir.'/phantom-posted');
        return $scenario==='crm-post-extended'?'SUCCESS':'SUCCESS';
    }
}

final class FixtureDocuments implements InvoiceDocumentSource {
    public function __construct(private string $dir) {}
    public function available(): bool {return str_starts_with(trim(file_get_contents($this->dir.'/scenario')),'document-') || str_starts_with(trim(file_get_contents($this->dir.'/scenario')),'services-');}
    public function fetch(int $ida,string $idt,string $hash): array {
        if((!str_starts_with(trim(file_get_contents($this->dir.'/scenario')),'services-') && ($ida!==1 || $idt!=='123')) || (str_starts_with(trim(file_get_contents($this->dir.'/scenario')),'services-') && $idt!==(string)($ida*100)) || $hash!=='do-not-expose') throw new \RuntimeException('fixture document ownership');
        file_put_contents($this->dir.'/document-calls','call\n',FILE_APPEND);
        $scenario=trim(file_get_contents($this->dir.'/scenario'));
        if($scenario==='document-error') throw new Failure('PHANTOM_HTTP');
        if($scenario==='document-unsafe-error') throw new \RuntimeException('private hash do-not-expose');
        return ['contentType'=>$scenario==='document-mime'?'text/html':'application/pdf',
            'bytes'=>match($scenario) {'document-size'=>str_repeat('x',INVOICE_PDF_MAX_BYTES+1),
                'document-format'=>'<html>private body</html>',default=>"%PDF-1.4\nfixture document\n%%EOF\n"}];
    }
}
