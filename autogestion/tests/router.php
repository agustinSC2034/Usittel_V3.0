<?php
// This separate fixture harness is never reachable through server/router.php.
if(PHP_SAPI!=='cli-server' || getenv('MI_USITTEL_TEST')!=='1') {http_response_code(404);exit;}
require_once __DIR__.'/../server/Core.php';
require_once __DIR__.'/../server/Phantom.php';
require_once __DIR__.'/../server/Api.php';
require_once __DIR__.'/FixtureTransport.php';
require_once __DIR__.'/PaymentFixture.php';
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(!str_starts_with($path,'/autogestion/api/')) {require __DIR__.'/../server/router.php';exit;}
try {
    $c=\MiUsittel\config(); $dir=\MiUsittel\privateDir();
    $transport=new \MiUsittel\FixtureTransport($dir);
    $ph=new \MiUsittel\Phantom($c,$dir,$transport,$transport);
    \MiUsittel\api($c,$dir,$ph,substr($path,strlen('/autogestion/api/')),new \MiUsittel\FixtureDocuments($dir),new \MiUsittel\PaymentFixture($dir));
} catch(\Throwable $e) {\MiUsittel\fail($e);}
