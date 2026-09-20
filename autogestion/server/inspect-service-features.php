<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
set_error_handler(static function(){throw new \MiUsittel\Failure('INSPECTOR_RUNTIME');});
try {
    if(count($argv)!==2 || !preg_match('/^[1-9][0-9]{0,9}$/D',$argv[1])) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $c=\MiUsittel\config();if($c['mode']!=='phantom' || $c['customer_id_field']!=='ID')throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));$ph->scope([(int)$argv[1]]);
    $raw=$ph->customer((int)$argv[1]);$report=[];
    foreach(['Producto_Internet','Productos_Internet','Producto_Television','Productos_Television','Producto_Telefonia','Productos_Telefonia','Productos_Otros','Estado_Conexion','ONU_Status'] as $key) {
        $value=$raw[$key]??null;
        $meta=['present'=>array_key_exists($key,$raw),'type'=>get_debug_type($value),'nonempty'=>$value!==null && $value!=='' && $value!==[]];
        if(is_array($value)) {$meta['list']=array_is_list($value);$meta['count']=count($value);$meta['all_strings']=count(array_filter($value,'is_string'))===count($value);}
        $report[$key]=$meta;
    }
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
    echo 'Solo estructura. Sin datos personales ni cambios en el servicio.'.PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('service_features',$e));}
finally {unset($raw,$value);}
