<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Wifi.php';require __DIR__.'/Inspector.php';
set_error_handler(static function(){throw new \MiUsittel\Failure('INSPECTOR_RUNTIME');});
try {
    $args=array_slice($argv,1);
    if(count($args)<1 || count($args)>3) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $ids=[];foreach($args as $arg) {
        if(!preg_match('/^[1-9][0-9]{0,9}$/D',$arg) || !in_array((int)$arg,[5122,19,2124],true))
            throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
        $ids[]=(int)$arg;
    }
    if(count($ids)!==count(array_unique($ids))) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $c=\MiUsittel\config();if($c['mode']!=='phantom' || $c['customer_id_field']!=='ID') throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));
    $report=\MiUsittel\inspectServiceCatalogRows($ph,$c,$ids);
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE).PHP_EOL;
    echo 'Solo IDA, campos técnicos candidatos saneados y labels públicos confirmados. No realizó escrituras.'.PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('service_catalog',$e));}
finally {unset($report);}
