<?php
declare(strict_types=1);
use MiUsittel\Failure;
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/Core.php';
require_once __DIR__.'/Phantom.php';
require_once __DIR__.'/PostingVerification.php';
try {
    if($argc!==2 || !preg_match('/^[1-9][0-9]{0,19}$/D',$argv[1])) throw new Failure('INSPECTOR_ARGUMENTS');
    $config=MiUsittel\config();
    $posting=MiUsittel\phantomPostingCandidateConfig($config);
    if($config['mode']!=='phantom' || $posting===null) throw new Failure('PHANTOM_POSTING_CONFIGURATION');
    $dir=MiUsittel\privateDir();$ida=$posting['lab_ida'];$idt=$argv[1];
    $crm=new MiUsittel\PhantomCrmHttp($config,$posting,$dir);
    $phantom=new MiUsittel\Phantom($config,$dir,new MiUsittel\CurlTransport($config),$crm);
    $phantom->scope([$ida]);
    $report=MiUsittel\postingVerificationReport($idt,$ida,
        fn()=>$phantom->invoiceById($ida,$idt),fn()=>$phantom->crmUnpaidRows($ida,$idt));
    if(($report['crm_error']??null)==='PHANTOM_CRM_FORMAT' && $crm->formatDiagnostic()!==null) $report['crm_format']=$crm->formatDiagnostic();
    echo json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR)."\nSin escritura en Phantom.\n";
} catch(Throwable $error) {
    $code=$error instanceof Failure?$error->kind:'UNEXPECTED';
    fwrite(STDERR,"Código: {$code}\nSin escritura en Phantom.\n");exit(1);
}
