<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/Inspector.php';require __DIR__.'/AuthGetProbe.php';
$stage='configuracion';$failure=null;$output=null;
ob_start();
set_error_handler(static function() {throw new \MiUsittel\Failure('PROBE_PHP');});
try {
    if(count($argv)!==2 || $argv[1]!=='1') throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $config=\MiUsittel\config();
    if($config['mode']!=='phantom' || !in_array(1,$config['allowed_idas'],true)) throw new \MiUsittel\Failure('CONFIGURATION');
    $stage='autenticacion';
    $token=\MiUsittel\inspectionAuthGetToken($config);
    $stage='cliente';
    // Single read, token in JSON body; no retries or fallback to query parameters.
    $data=(new \MiUsittel\CurlTransport($config,inspectResponseFormat:true))->post($config['phantom_url'].'?'.http_build_query([
        'action'=>'Consulta_Cliente_Avanzada','JSON'=>1,'IDA'=>1]),['token'=>$token]);
    if((isset($data['code']) && (int)$data['code']!==200) || isset($data['error'])
        || (isset($data['message']) && is_string($data['message']) && str_starts_with($data['message'],'Error:'))) throw new \MiUsittel\Failure('PHANTOM_FUNCTIONAL');
    // Inspect the raw envelope without inferring profile mappings or field semantics.
    $remaining=120;
    $output=json_encode(['customer'=>\MiUsittel\inspectionShape($data,$remaining)],JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
} catch(\Throwable $e) {$failure=$e;}
finally {unset($token,$data);restore_error_handler();ob_end_clean();}
if($failure!==null) exit(\MiUsittel\writeInspectorFailure($stage,$failure));
echo $output.PHP_EOL;
