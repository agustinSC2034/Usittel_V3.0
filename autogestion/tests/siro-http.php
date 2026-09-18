<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Siro.php';
$calls=0;$url='';$options=[];$scenario=$argv[1]??'ok';
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['url']=$url;$GLOBALS['calls']++;
    if(!in_array($url,['https://apisesion.bancoroela.com.ar/auth/Sesion','https://siropagos.bancoroela.com.ar/api/Pago','https://siropagos.bancoroela.com.ar/api/Pago/Consulta','https://siropagos.bancoroela.com.ar/api/Pago/'.str_repeat('a',64).'/11111111-1111-4111-8111-111111111111'],true)) throw new \RuntimeException('Bad endpoint');
    $ch=\curl_init();$GLOBALS['urls'][spl_object_id($ch)]=$url;return $ch;
}
function curl_setopt_array(\CurlHandle $ch,array $options): bool {
    if($options[CURLOPT_FOLLOWLOCATION]!==false || $options[CURLOPT_SSL_VERIFYPEER]!==true || $options[CURLOPT_SSL_VERIFYHOST]!==2 || $options[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS || !isset($options[CURLOPT_CAINFO])) throw new \RuntimeException('TLS regression');
    $auth=str_contains($GLOBALS['urls'][spl_object_id($ch)],'/auth/');
    if(!$auth && !in_array('Authorization: Bearer fixture-token',$options[CURLOPT_HTTPHEADER],true)) throw new \RuntimeException('Missing bearer');
    if($auth && json_decode($options[CURLOPT_POSTFIELDS],true)!==['Usuario'=>'fixture-user','Password'=>'fixture-password']) throw new \RuntimeException('Session contract');
    $GLOBALS['opts'][spl_object_id($ch)]=$options;return true;
}
function curl_exec(\CurlHandle $ch): bool {
    if($GLOBALS['scenario']==='timeout') return false;
    $body=str_contains($GLOBALS['urls'][spl_object_id($ch)],'/auth/')?'{"access_token":"fixture-token"}':'[]';
    if($GLOBALS['scenario']==='malformed') $body='<html>private-token</html>';
    $GLOBALS['opts'][spl_object_id($ch)][CURLOPT_WRITEFUNCTION]($ch,$body);return true;
}
function curl_getinfo(\CurlHandle $ch,?int $option=null): int {return match($GLOBALS['scenario']){'session'=>401,'redirect'=>302,default=>200};}
function curl_errno(\CurlHandle $ch): int {return CURLE_OPERATION_TIMEDOUT;}
$client=new SiroHttp(['ca_file'=>__FILE__],['user'=>'fixture-user','password'=>'fixture-password']);
try {
    $client->create([]);$client->consult(['created_at'=>gmdate('c'),'reference'=>'123;121.00;']);
    $client->result(str_repeat('a',64),'11111111-1111-4111-8111-111111111111');
    if($calls!==4) throw new \RuntimeException('Token not request-local reused');
    echo 'SIRO_HTTP_OK';
} catch(Failure $e) {echo $e->kind;}
