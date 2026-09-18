<?php
declare(strict_types=1);
namespace MiUsittel;
// Deliberately synthetic schema. Never included by the production router.
final class FixtureTransport implements Transport {
    public function __construct(private string $dir) {}
    public function post(string $url,array $body): array {
        parse_str(parse_url($url,PHP_URL_QUERY),$query);
        $action=$query['action'];
        if(!in_array($action,['autentificar','Consulta_Cliente_Avanzada','Phantom_Ultima_Factura','Phantom_Mi_Estado_Cuenta'],true)) throw new \RuntimeException('Non-read action');
        file_put_contents($this->dir.'/trace.txt',$action.':'.($query['IDA']??'-')."\n",FILE_APPEND);
        $scenario=trim(@file_get_contents($this->dir.'/scenario')?:'normal');
        if($scenario==='timeout') throw new Failure('PHANTOM_TIMEOUT',504);
        if($scenario==='http') throw new Failure('PHANTOM_HTTP');
        if($action==='autentificar') return ['token'=>'fixture-technical-token'];
        if(($body['token']??'')!=='fixture-technical-token') throw new \RuntimeException('Token absent');
        if($scenario==='expired-always') throw new Failure('TOKEN_EXPIRED');
        if(!in_array((int)($query['IDA']??0),[1,5],true)) throw new \RuntimeException('Unapproved IDA');
        if($scenario==='expired-once' && !file_exists($this->dir.'/expired')) {touch($this->dir.'/expired');throw new Failure('TOKEN_EXPIRED');}
        if($scenario==='functional') return ['code'=>500,'message'=>'Private upstream failure'];
        if($action==='Consulta_Cliente_Avanzada') {
            if($scenario==='missing-credentials') return ['Estado_Servicio'=>'Activo'];
            return ['Autogestion_User'=>(int)$query['IDA']===1?'000001':'laboratorio', 'Autogestion_Pass'=>' 00Lab-fixture! ',
                'Estado_Servicio'=>'Suspendido',
                'test_name'=>$scenario==='missing'?null:'Cliente de pruebas', 'test_address'=>'Calle ficticia 123', 'test_plan'=>'Plan de laboratorio',
                'Conexiones_Asociadas'=>[['IDA'=>999,'Autogestion_Pass'=>'do-not-expose']], 'DNI'=>'do-not-expose', 'Tarjeta'=>'do-not-expose'];
        }
        if($action==='Phantom_Mi_Estado_Cuenta') {
            if($scenario==='balance-error') return ['code'=>500,'message'=>'Private balance failure'];
            return ['test_balance'=>match($scenario) {'missing'=>null,'credit'=>'150.50',default=>'-12500.75'}];
        }
        if($scenario==='empty') return ['code'=>400,'message'=>'Error: No se encontró factura para el cliente (400)'];
        if($scenario==='invoices-error') return ['code'=>400,'message'=>'Some other error'];
        if($scenario==='malformed-invoices') return ['unrecognized'=>[]];
        $row=['IDT'=>123,'Estado'=>'IMPAGA','Tipo'=>'Factura','Periodo'=>'2026-09','Total'=>'20000.25','Comp_ID'=>'1-123','Primer_Vto'=>'2026-09-20','Segundo_Vto'=>'2026-09-25','Hash_Descarga'=>'do-not-expose','URL_PAGO'=>'https://do-not-expose.invalid'];
        if($scenario==='missing') $row=['IDT'=>123];
        if($scenario==='pagination') { $rows=[];for($i=0;$i<20;$i++) $rows[]=array_replace($row,['IDT'=>1000-(int)$query['Offset']-$i]);return $rows; }
        return [$row];
    }
}
