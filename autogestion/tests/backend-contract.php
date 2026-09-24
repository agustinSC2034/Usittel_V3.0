<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';
require __DIR__.'/../server/Phantom.php';
$calls=[];$options=[];$query=[];
function demand(bool $ok): void {if(!$ok) throw new \RuntimeException('fixture contract failed');}
function curl_init(?string $url=null): \CurlHandle|false {
    parse_str((string)parse_url($url,PHP_URL_QUERY),$GLOBALS['query']);
    demand(parse_url($url,PHP_URL_HOST)==='fixture.invalid' && parse_url($url,PHP_URL_SCHEME)==='https');
    $GLOBALS['calls'][]=$GLOBALS['query']['action'];
    return \curl_init(); // Only allocate: curl_exec below is a local fixture.
}
function curl_setopt_array(\CurlHandle $ch,array $options): bool {
    $GLOBALS['options']=$options;$q=$GLOBALS['query'];
    demand($options[CURLOPT_SSL_VERIFYPEER]===true && $options[CURLOPT_SSL_VERIFYHOST]===2 && $options[CURLOPT_FOLLOWLOCATION]===false);
    if($q['action']==='autentificar') {
        demand($q===['action'=>'autentificar','JSON'=>'1','api_user'=>'fixture +&?','api_pass'=>'fixture &=# secret']);
        demand(($options[CURLOPT_HTTPGET]??false)===true && !isset($options[CURLOPT_POSTFIELDS]));
    } else {
        demand($q['JSON']==='1' && $q['IDA']==='1' && array_intersect(array_keys($q),['token','api_user','api_pass'])===[]);
        demand(($options[CURLOPT_POST]??false)===true && $options[CURLOPT_HTTPHEADER][0]==='Content-Type: application/json');
        demand(json_decode($options[CURLOPT_POSTFIELDS],true)===['token'=>'fixture technical token']);
        if($q['action']==='Phantom_Ultima_Factura') demand($q['Limit']==='10' && $q['Offset']==='0');
    }
    return true;
}
function curl_exec(\CurlHandle $ch): bool {
    $payload=match($GLOBALS['query']['action']) {
        'autentificar'=>['token'=>'fixture technical token'],
        'Consulta_Cliente_Avanzada'=>[['ID'=>'1','IDAx'=>'44','Autogestion_User'=>'000001','Autogestion_Pass'=>' 00fixture ',
            'Nombre'=>'Persona','Apellido'=>'Prueba','Razon_Social'=>'Empresa de prueba','Direccion'=>'Calle ficticia','Dir_Numero'=>'100',
            'Dir_Lote'=>'3','Ciudad'=>'Ciudad de prueba','Producto_Internet'=>'Fibra / texto compuesto sin interpretar',
            'Email'=>null,'Telefono'=>[],'Movil'=>'5550000','Estado_Servicio'=>'SUSPENDIDO','Estado_Conexion'=>'Online','Estado_ONU'=>'Offline','Balance_CC'=>'999999']],
        'Phantom_Mi_Estado_Cuenta'=>['Balance'=>'12500.75'],
        'Phantom_Ultima_Factura'=>[['IDT'=>'12','Estado'=>'IMPAGA','Total'=>'12500.75','Periodo'=>'202609','Primer_Vto'=>'2026-09-20']],
    };
    ($GLOBALS['options'][CURLOPT_WRITEFUNCTION])($ch,"\xEF\xBB\xBF".json_encode($payload));
    return true;
}
function curl_getinfo(\CurlHandle $ch,?int $option=null): int {return 200;}
function curl_errno(\CurlHandle $ch): int {return 0;}
function curl_error(\CurlHandle $ch): string {return '';}
$c=config();$c['api_user']='fixture +&?';$c['api_pass']='fixture &=# secret';$c['profile_fields']=[];
demand(resolveUser('000006',$c)===6 && resolveUser('004242',$c)===4242);
foreach(['0','000000','-6','6e0','6.0',' 6','10000000000'] as $invalid) demand(resolveUser($invalid,$c)===null);
$dir=privateDir().'/wire-fixture';if(!is_dir($dir)) mkdir($dir);
$ph=new Phantom($c,$dir,new CurlTransport($c));
$ph->scope([1]);
demand($ph->verify(1,'000001',' 00fixture '));
$p=$ph->profile(1);demand($p['name']==='Empresa de prueba' && $p['address']==='Calle ficticia 100 · Lote: 3');
demand($p['plan']==='Fibra / texto compuesto sin interpretar' && $p['speed']===null && $p['email']===null && $p['phone']==='5550000');
demand($p['serviceStatus']==='SUSPENDIDO');
demand($p['connectionState']==='online' && $p['equipmentState']==='offline');
demand($ph->balance(1)['debt']===12500.75);
$invoices=$ph->invoices(1);demand($invoices['historyComplete']===false && $invoices['items'][0]['outstanding']===null);
demand($calls===['autentificar','Consulta_Cliente_Avanzada','Consulta_Cliente_Avanzada','Phantom_Mi_Estado_Cuenta','Phantom_Ultima_Factura']);
try {resolveCustomerRecord([['ID'=>'9','IDAx'=>'1']],1,'IDAx');throw new \RuntimeException('IDAx accepted');} catch(Failure $e) {demand($e->kind==='FORBIDDEN');}
demand(compareInvoiceIds('9007199254740993','9007199254740992')>0);
demand(compareInvoiceIds('10000000000000000000','9999999999999999999')>0);
try {validateInvoiceRows([['IDT'=>'12'],['IDT'=>'00012']],10);throw new \RuntimeException('duplicate accepted');}
catch(Failure $e) {demand($e->kind==='INVOICES_DUPLICATE');}
echo json_encode(['get_auth'=>true,'post_reads'=>true,'shared_bom_decoder'=>true,'exact_login'=>true,'public_mappings'=>true,'explicit_identity'=>true]);
