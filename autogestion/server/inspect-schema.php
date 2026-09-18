<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
$failure=null;
ob_start();
set_error_handler(static function() {throw new \MiUsittel\Failure('PROBE_PHP');});
try {
    $args=\MiUsittel\inspectorArguments($argv);
    $c=\MiUsittel\config();
    if($c['mode']!=='phantom' || !in_array($args['ida'],$c['allowed_idas'],true)) throw new \MiUsittel\Failure('CONFIGURATION');
} catch(\Throwable $e) {$failure=$e;}
finally {restore_error_handler();ob_end_clean();}
if($failure!==null) exit(\MiUsittel\writeInspectorFailure('configuracion',$failure));
if($args['authGet']) {
    require __DIR__.'/AuthGetProbe.php';require __DIR__.'/SchemaProbe.php';
    exit(\MiUsittel\runGetSchemaInspector($c));
}
try {
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c,$args['authForm']));
    exit(\MiUsittel\runInspector($ph,$args['ida']));
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('configuracion',$e));}
