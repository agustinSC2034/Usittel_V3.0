<?php
// This separate fixture harness is never reachable through server/router.php.
if(PHP_SAPI!=='cli-server' || getenv('MI_USITTEL_TEST')!=='1') {http_response_code(404);exit;}
require_once __DIR__.'/../server/Core.php';
require_once __DIR__.'/../server/Phantom.php';
require_once __DIR__.'/../server/Api.php';
require_once __DIR__.'/FixtureTransport.php';
require_once __DIR__.'/PaymentFixture.php';
require_once __DIR__.'/PaymentHistoryFixture.php';
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$physical=str_ends_with($path,'/server/production-router.php');
$mount=str_starts_with($path,'/autogestion/')?'/autogestion':'';
if($physical) {
    $route=$_GET['route']??null;
    if(!is_string($route) || strlen($route)>64 || !preg_match('/\A[a-z][a-z0-9-]*\z/D',$route)) {http_response_code(400);exit;}
    if($route==='payment-return') {
        $attempt=$_GET['attempt']??null;$result=$_GET['result']??null;
        if(!is_string($attempt) || !is_string($result) || !preg_match('/\A[a-f0-9]{32}\z/D',$attempt) || !in_array($result,['ok','error'],true)) {http_response_code(400);exit;}
        header('Location: '.$mount.'/#/facturas?attempt='.$attempt,true,303);exit;
    }
    unset($_GET['route']);
    try {
        $c=\MiUsittel\config(); $dir=\MiUsittel\privateDir();
        $transport=new \MiUsittel\FixtureTransport($dir);
        $ph=new \MiUsittel\Phantom($c,$dir,$transport,new \MiUsittel\FixtureCrm($dir));
        \MiUsittel\api($c,$dir,$ph,$route,new \MiUsittel\FixtureDocuments($dir),new \MiUsittel\PaymentFixture($dir),new \MiUsittel\PaymentHistoryFixture($dir));
    } catch(\Throwable $e) {\MiUsittel\fail($e);}
    exit;
}
$prefix=str_starts_with($path,'/autogestion/api/')?'/autogestion/api/':(str_starts_with($path,'/api/')?'/api/':null);
if($prefix===null) {require __DIR__.'/../server/router.php';exit;}
try {
    $c=\MiUsittel\config(); $dir=\MiUsittel\privateDir();
    $transport=new \MiUsittel\FixtureTransport($dir);
    $ph=new \MiUsittel\Phantom($c,$dir,$transport,new \MiUsittel\FixtureCrm($dir));
    \MiUsittel\api($c,$dir,$ph,substr($path,strlen($prefix)),new \MiUsittel\FixtureDocuments($dir),new \MiUsittel\PaymentFixture($dir),new \MiUsittel\PaymentHistoryFixture($dir));
} catch(\Throwable $e) {\MiUsittel\fail($e);}
