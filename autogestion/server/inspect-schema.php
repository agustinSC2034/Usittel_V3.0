<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';
ini_set('display_errors','0');ini_set('zend.exception_ignore_args','1');
try {
    $c=\MiUsittel\config();
    if($c['mode']!=='phantom' || !isset($argv[1]) || !in_array($argv[1],['1','5'],true)) throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));
    echo json_encode($ph->inspectSchema((int)$argv[1]),JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
} catch(\Throwable $e) {fwrite(STDERR,'No se pudo verificar el esquema. Código: '.($e instanceof \MiUsittel\Failure?$e->kind:'INTERNAL').PHP_EOL);exit(1);}
