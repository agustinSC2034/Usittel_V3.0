<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
set_error_handler(static function(){throw new \MiUsittel\Failure('INSPECTOR_RUNTIME');});
try {
    if(count($argv)!==2 || !preg_match('/^[1-9][0-9]{0,9}$/D',$argv[1])) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $ida=(int)$argv[1];$c=\MiUsittel\config();if($c['mode']!=='phantom')throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));$ph->scope([$ida]);$report=[];
    foreach(['existence','open','pending'] as $step) {
        try {
            $data=$step==='existence'?$ph->ticketRead($ida,'Phantom_Consultar_Estado_TT'):
                $ph->ticketRead($ida,'Tickets_Help_Desk',['Periodo'=>'01/01/1900-'.date('d/m/Y'),'Estado'=>$step==='open'?'Abierto':'Pendiente']);
            $report[$step]=\MiUsittel\ticketInspectionShape($data,$step);
        } catch(\MiUsittel\Failure $e) {
            $report[$step]=['failure_code'=>\MiUsittel\safeDiagnosticCode($e),'http'=>$e->upstreamHttp];
            if($e->kind==='TICKETS_RESPONSE' && $e->safeDiagnostic!==null) $report[$step]['response']=$e->safeDiagnostic;
        }
    }
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
    echo 'Solo estructura y permiso de creación informado. No se crearon tickets.'.PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('service_requests',$e));}
finally {unset($data,$c);}
