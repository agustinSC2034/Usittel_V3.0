<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
ini_set('display_errors','0');ini_set('zend.exception_ignore_args','1');
try {
    $args=\MiUsittel\inspectorArguments($argv);
    $c=\MiUsittel\config();
    if($c['mode']!=='phantom' || !in_array($args['ida'],$c['allowed_idas'],true)) throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c,$args['authForm']));
    exit(\MiUsittel\runInspector($ph,$args['ida']));
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('configuracion',$e));}
