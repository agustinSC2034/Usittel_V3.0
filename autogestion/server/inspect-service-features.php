<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
require __DIR__.'/Wifi.php';
set_error_handler(static function(){throw new \MiUsittel\Failure('INSPECTOR_RUNTIME');});
try {
    if(count($argv)!==2 || !preg_match('/^[1-9][0-9]{0,9}$/D',$argv[1])) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $c=\MiUsittel\config();if($c['mode']!=='phantom' || $c['customer_id_field']!=='ID')throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));$ph->scope([(int)$argv[1]]);
    $raw=$ph->serviceRecord((int)$argv[1]);
    $report=['equipment'=>['model_present'=>array_key_exists('ONU_Modelo',$raw),'model'=>\MiUsittel\wifiModel($raw)?:null],
        'products'=>\MiUsittel\inspectServiceRecord($raw)];
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
    echo 'Solo modelo de equipo y estructura de productos. Sin datos personales ni cambios en el servicio.'.PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('service_features',$e));}
finally {unset($raw,$value);}
