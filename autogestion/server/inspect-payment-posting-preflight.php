<?php
declare(strict_types=1);
use MiUsittel\Failure;

if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/Core.php';
require_once __DIR__.'/Phantom.php';
require_once __DIR__.'/Payments.php';

try {
    if($argc!==1) throw new Failure('INSPECTOR_ARGUMENTS',400);
    $config=MiUsittel\config();
    if(($config['mode']??null)!=='phantom') throw new Failure('CONFIGURATION');
    $posting=MiUsittel\phantomPostingCandidateConfig($config);
    if($posting===null) throw new Failure('PHANTOM_POSTING_CONFIGURATION');
    $siro=MiUsittel\siroCandidateConfig($config);
    if($siro===null || ($siro['lab_ida']??null)!==$posting['lab_ida']) throw new Failure('SIRO_CONFIGURATION');
    $dir=MiUsittel\privateDir();
    $crm=new MiUsittel\PhantomCrmHttp($config,$posting,$dir);
    $phantom=new MiUsittel\Phantom($config,$dir,new MiUsittel\CurlTransport($config),$crm);
    $phantom->scope([$posting['lab_ida']]);
    $payments=new MiUsittel\Payments(new MiUsittel\PaymentStore($dir),new MiUsittel\SiroHttp($config,$siro),$siro);
    $result=$payments->postingPreflight($posting['lab_ida'],
        fn(string $idt)=>$phantom->invoiceById($posting['lab_ida'],$idt),
        fn(string $idt)=>$phantom->crmUnpaidRows($posting['lab_ida'],$idt));
    fwrite(STDOUT,"Etapa: payment_posting_preflight\n");
    fwrite(STDOUT,"SIRO confirmado: sí\nFactura Phantom REST impaga: sí\nFactura CRM impaga: sí\n");
    fwrite(STDOUT,"IDA coincide: sí\nIDT coincide: sí\nImporte coincide: sí\nPosting previo: no\n");
    fwrite(STDOUT,"Código: {$result['code']}\nSin escritura en Phantom.\n");
    exit(0);
} catch(Throwable $error) {
    $code=$error instanceof Failure?$error->kind:'UNEXPECTED';
    fwrite(STDERR,"Etapa: payment_posting_preflight\nCódigo: {$code}\nSin escritura en Phantom.\n");
    exit(1);
}
