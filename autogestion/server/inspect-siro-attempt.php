<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/Core.php';
require_once __DIR__.'/SiroInspection.php';
try {
    set_error_handler(static function(): never {throw new MiUsittel\Failure('PAYMENT_STORAGE');});
    if($argc!==3 || !preg_match('/^[1-9][0-9]{0,9}$/D',$argv[1]) || !preg_match('/^[a-f0-9]{32}$/D',$argv[2])) throw new MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $config=MiUsittel\config();$settings=MiUsittel\siroConfig($config);
    if($settings===null) throw new MiUsittel\Failure('SIRO_CONFIGURATION');
    $dir=getenv('MI_USITTEL_RUNTIME');$real=$dir?realpath($dir):false;
    if(!$real || !is_dir($real) || MiUsittel\insideRepo($real)) throw new MiUsittel\Failure('PAYMENT_STORAGE');
    // Atomic runtime replacement means the captured file is a complete snapshot.
    $state=json_decode(file_get_contents($real.'/siro-attempts.json'),true,64,JSON_THROW_ON_ERROR);
    $report=MiUsittel\siroInspectionReport($state,new MiUsittel\SiroHttp($config,$settings),$settings,(int)$argv[1],$argv[2]);
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)."\nSolo consulta SIRO; sin crear pagos, imputar ni modificar el runtime.\n";
} catch(Throwable $error) {
    $codes=['INSPECTOR_ARGUMENTS','CONFIGURATION','SIRO_CONFIGURATION','PAYMENT_STORAGE','FORBIDDEN','PAYMENT_NOT_FOUND'];
    $code=$error instanceof MiUsittel\Failure && in_array($error->kind,$codes,true)?$error->kind:'INSPECTOR_FAILED';
    fwrite(STDERR,"Código: {$code}\nSin crear pagos ni imputar.\n");exit(1);
}
