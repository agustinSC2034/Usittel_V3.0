<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';
require __DIR__.'/../server/Phantom.php';
require __DIR__.'/../server/Inspector.php';

// Intercept cURL in this process only: no network request can be executed.
$calls=[];$options=[];$status=200;
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls'][]=$url;
    return \curl_init();
}
function curl_setopt_array(\CurlHandle $handle,array $options): bool {
    $GLOBALS['options']=$options;
    return true;
}
function curl_exec(\CurlHandle $handle): bool {
    $payload=$GLOBALS['status']===200?'{"token":"fixture-token"}':'sensitive upstream body';
    ($GLOBALS['options'][CURLOPT_WRITEFUNCTION])($handle,$payload);
    return true;
}
function curl_getinfo(\CurlHandle $handle,?int $option=null): int {return $GLOBALS['status'];}
function curl_errno(\CurlHandle $handle): int {return 0;}
function curl_error(\CurlHandle $handle): string {return '';}
function ensure(bool $condition,string $label): void {if(!$condition) throw new \RuntimeException($label);}

ensure(inspectorArguments(['inspect-schema.php','1'])===['ida'=>1,'authForm'=>false,'authGet'=>false],'default CLI arguments');
ensure(inspectorArguments(['inspect-schema.php','5','--auth-form'])===['ida'=>5,'authForm'=>true,'authGet'=>false],'form CLI arguments');
ensure(inspectorArguments(['inspect-schema.php','1','--auth-get'])===['ida'=>1,'authForm'=>false,'authGet'=>true],'GET CLI arguments');
$config=config();$config['ca_file']=null;
$url='https://fixture.invalid/API_Rest.php?action=autentificar&JSON=1';
$credentials=['api_user'=>'fixture +&=%á','api_pass'=>'fixture %&=+#? /á'];
$default=new CurlTransport($config);
$default->post($url,$credentials);
ensure(json_decode($options[CURLOPT_POSTFIELDS],true)===$credentials,'default JSON');
ensure($options[CURLOPT_HTTPHEADER][0]==='Content-Type: application/json','default content type');
$form=new CurlTransport($config,true);
$form->post($url,$credentials);
parse_str($options[CURLOPT_POSTFIELDS],$decoded);
ensure($decoded===$credentials,'form special characters');
ensure($options[CURLOPT_HTTPHEADER][0]==='Content-Type: application/x-www-form-urlencoded','form content type');
ensure($calls===[$url,$url],'credentials absent from URL');
ensure($options[CURLOPT_POST]===true && $options[CURLOPT_SSL_VERIFYPEER]===true
    && $options[CURLOPT_SSL_VERIFYHOST]===2 && $options[CURLOPT_PROTOCOLS]===CURLPROTO_HTTPS
    && $options[CURLOPT_FOLLOWLOCATION]===false,'secure POST options');
$form->post('https://fixture.invalid/API_Rest.php?action=Consulta_Cliente_Avanzada&JSON=1&IDA=1',['token'=>'fixture-token']);
ensure(json_decode($options[CURLOPT_POSTFIELDS],true)===['token'=>'fixture-token'],'reads remain JSON');
ensure($options[CURLOPT_HTTPHEADER][0]==='Content-Type: application/json','reads content type');

$before=count($calls);$status=400;
$phantom=new Phantom($config,privateDir(),$form);
ensure(runInspector($phantom,1)===1,'inspector failure');
ensure(count($calls)===$before+1,'no retry or customer call after rejection');
echo json_encode(['default_json'=>true,'form_roundtrip'=>true,'secure_post'=>true,'reads_json'=>true,'single_auth'=>true],JSON_THROW_ON_ERROR);
