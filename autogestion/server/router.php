<?php
declare(strict_types=1);
require_once __DIR__.'/Core.php';
require_once __DIR__.'/Phantom.php';
require_once __DIR__.'/Api.php';
ini_set('display_errors','0'); ini_set('zend.exception_ignore_args','1');
set_error_handler(static function() {throw new \MiUsittel\Failure('INTERNAL');});
header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'");
header('Cache-Control: no-store');
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
// Return is a navigation hint only. Discard all provider query fields, never mark payment here.
if($_SERVER['REQUEST_METHOD']==='GET' && preg_match('~^/autogestion/pago-(?:ok|error)/([a-f0-9]{32})$~D',$path,$returnMatch)) {
    header('Location: /autogestion/#/facturas?attempt='.$returnMatch[1],true,303);exit;
}
if(in_array($path,['/','/autogestion'],true)) {header('Location: /autogestion/');exit;}
if(str_starts_with($path,'/autogestion/api/')) {
    try {
        $c=\MiUsittel\config();$dir=\MiUsittel\privateDir();
        $posting=\MiUsittel\phantomPostingConfig($c);
        $ph=new \MiUsittel\Phantom($c,$dir,new \MiUsittel\CurlTransport($c),$posting===null?null:new \MiUsittel\PhantomCrmHttp($c,$posting));
        \MiUsittel\api($c,$dir,$ph,substr($path,strlen('/autogestion/api/')));
    } catch(\Throwable $e) {\MiUsittel\fail($e);}
}
if(!in_array($_SERVER['REQUEST_METHOD'],['GET','HEAD'],true)) {http_response_code(405);exit;}
$relative=substr($path,strlen('/autogestion/'));
if($path==='/autogestion/') $relative='index.html';
if(!str_starts_with($path,'/autogestion/') || !preg_match('~^(index\.html|js/[a-z-]+\.js|assets/[a-zA-Z0-9_.-]+\.(css|png|svg|woff2))$~D',$relative)) {http_response_code(404);exit;}
$file=__DIR__.'/../'.$relative;
if(!is_file($file)) {http_response_code(404);exit;}
$types=['html'=>'text/html','css'=>'text/css','js'=>'text/javascript','png'=>'image/png','svg'=>'image/svg+xml','woff2'=>'font/woff2'];
header('Content-Type: '.$types[pathinfo($file,PATHINFO_EXTENSION)].'; charset=utf-8');
if($_SERVER['REQUEST_METHOD']!=='HEAD') readfile($file);
