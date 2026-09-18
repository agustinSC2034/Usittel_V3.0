<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';
require __DIR__.'/../server/Phantom.php';
$transport=new \MiUsittel\CurlTransport(['connect_timeout_seconds'=>1,'timeout_seconds'=>1,'ca_file'=>__DIR__.'/missing-ca.pem']);
try { $transport->post('https://fixture.invalid',[]); }
catch(\MiUsittel\Failure $e) {echo $e->kind;exit(0);}
exit(1);
