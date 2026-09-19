<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Services.php';require __DIR__.'/Inspector.php';
require_once __DIR__.'/ServiceDiagnostics.php';
// Explicit operator-selected account only; exact document lookup stays internal and prints metadata only.
if(count($argv)>2) exit(1);
$input=$argv[1]??null;
if($input===null) {echo "Número del contrato inicial de la cuenta de prueba: ";$input=trim((string)fgets(STDIN));}
set_error_handler(static function(){throw new \MiUsittel\Failure('INSPECTOR_RUNTIME');});
try {
    if(!preg_match('/^[1-9][0-9]{0,9}$/D',$input)) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $c=\MiUsittel\config();if($c['mode']!=='phantom' || $c['customer_id_field']!=='ID') throw new \MiUsittel\Failure('CONFIGURATION');
    $c['service_login_idas']=[(int)$input];
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));
    $diagnostics=['failure_stage'=>null,'failure_code'=>null];$rootRecord=null;$documentLookup=null;
    $result=\MiUsittel\discoverServices($ph,(int)$input,static function($stage,$data) use (&$diagnostics,&$rootRecord,&$documentLookup) {
        if($stage==='root') {$rootRecord=$data;$diagnostics+=\MiUsittel\serviceRootDiagnostics($data);}
        elseif($stage==='document_lookup') $documentLookup=$data;
        else {$diagnostics['failure_stage']=$stage;$diagnostics['failure_code']=$data['code'];}
    });
    $report=['services_found'=>count($result['services']),'association_unavailable'=>$result['servicesUnavailable'],'services'=>[]];
    foreach($result['services'] as $s) $report['services'][]=['ID_present'=>true,'address_present'=>$s['address']!==null,'plan_present'=>$s['plan']!==null];
    $documents=\MiUsittel\recordDocuments($rootRecord);$source=$documents['Cuit']??$documents['CUIT']??$documents['Cuit_Cuil']??$documents['Documento']??$documents['DNI']??$documents['dni']??null;
    $documentAttempted=$source!==null;
    $report['document_lookup']=['source_available'=>$source!==null,'source_kind'=>\MiUsittel\documentKind($source),'performed'=>$documentAttempted,'available'=>$documentLookup!==null];
    if($documentLookup!==null) $report['document_lookup']=array_merge($report['document_lookup'],$documentLookup);
    elseif($documentAttempted && $diagnostics['failure_stage']==='document_search') $report['document_lookup']['failure_code']=$diagnostics['failure_code'];
    $report['diagnostics']=$diagnostics;
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('servicios',$e));}
finally {unset($source,$documents,$rootRecord,$documentLookup);}
