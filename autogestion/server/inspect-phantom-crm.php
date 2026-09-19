<?php
declare(strict_types=1);
use MiUsittel\Failure;

if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/Core.php';
require_once __DIR__.'/Phantom.php';

try {
    if($argc!==1) throw new Failure('INSPECTOR_ARGUMENTS',400);
    $config=MiUsittel\config();
    if(($config['mode']??null)!=='phantom') throw new Failure('CONFIGURATION');
    $posting=MiUsittel\phantomPostingCandidateConfig($config);
    if($posting===null) {
        $base=parse_url($config['phantom_url']);
        $posting=['crm_url'=>'https://'.$base['host'].'/PHANTOM/Includes/CRM/API_CRM.php'];
    }
    $crm=new MiUsittel\PhantomCrmHttp($config,$posting,MiUsittel\privateDir());
    $crm->authenticate(true);
    fwrite(STDOUT,"Etapa: crm_autenticacion\nCódigo: CRM_AUTH_OK\nSin escritura en Phantom.\n");
    exit(0);
} catch(Throwable $error) {
    $code=$error instanceof Failure?$error->kind:'UNEXPECTED';
    fwrite(STDERR,"Etapa: crm_autenticacion\nCódigo: {$code}\n");
    exit(1);
}
