<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';
require __DIR__.'/AuthGetProbe.php';require __DIR__.'/InvoiceDocuments.php';require __DIR__.'/InvoiceDocumentProbe.php';
$failure=null;ob_start();set_error_handler(static function(){throw new \MiUsittel\Failure('PROBE_PHP');});
try {
    if(count($argv)!==3 || $argv[1]!=='1' || ($argv[2]!=='--latest' && !preg_match('/^[1-9][0-9]{0,19}$/D',$argv[2]))) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $c=\MiUsittel\config();
    if($c['mode']!=='phantom' || !in_array(1,$c['allowed_idas'],true)) throw new \MiUsittel\Failure('CONFIGURATION');
} catch(\Throwable $e) {$failure=$e;}
finally {restore_error_handler();ob_end_clean();}
if($failure!==null) exit(\MiUsittel\writeInspectorFailure('configuracion',$failure));
exit(\MiUsittel\runInvoiceDocumentProbe($c,$argv[2]));
