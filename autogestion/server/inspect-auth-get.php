<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';require __DIR__.'/AuthGetProbe.php';
$stage='configuracion';$failure=null;
// Suppress accidental output from private configuration and redact PHP warnings.
ob_start();
set_error_handler(static function() {throw new \MiUsittel\Failure('PROBE_PHP');});
try {
    if(count($argv)!==1) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $config=\MiUsittel\config();
    if($config['mode']!=='phantom') throw new \MiUsittel\Failure('CONFIGURATION');
    $stage='autenticacion';
    \MiUsittel\probeAuthGet($config);
} catch(\Throwable $e) {$failure=$e;}
finally {restore_error_handler();ob_end_clean();}
if($failure!==null) exit(\MiUsittel\writeInspectorFailure($stage,$failure));
echo 'Etapa: autenticacion'.PHP_EOL.'Código: TOKEN_RECIBIDO'.PHP_EOL.'Token oculto; sin guardar ni consultar clientes.'.PHP_EOL;
