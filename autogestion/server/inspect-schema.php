<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
ini_set('display_errors','0');ini_set('zend.exception_ignore_args','1');
try {
    $c=\MiUsittel\config();
    if($c['mode']!=='phantom' || !isset($argv[1]) || !in_array($argv[1],['1','5'],true) || !in_array((int)$argv[1],$c['allowed_idas'],true)) throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));
    exit(\MiUsittel\runInspector($ph,(int)$argv[1]));
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('configuracion',$e));}
