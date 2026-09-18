<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
$scenario=$argv[1]??'success';$calls=0;$options=[];
$statuses=['redirect'=>302,'http'=>400,'unauthorized'=>401];
$status=$statuses[$scenario]??200;
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls']++;
    parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
    if(parse_url($url,PHP_URL_SCHEME)!=='https' || parse_url($url,PHP_URL_HOST)!=='fixture.invalid'
        || $query!==['action'=>'autentificar','JSON'=>'1','api_user'=>'fixture +&=%á','api_pass'=>'fixture %&=+#? /á']) throw new \RuntimeException('fixture request mismatch');
    return \curl_init(); // Allocate only. The real curl_exec is never invoked.
}
function curl_setopt_array(\CurlHandle $handle,array $options): bool {
    $GLOBALS['options']=$options;
    if(($options[CURLOPT_HTTPGET]??null)!==true || isset($options[CURLOPT_POST]) || isset($options[CURLOPT_POSTFIELDS])
        || $options[CURLOPT_FOLLOWLOCATION]!==false || $options[CURLOPT_SSL_VERIFYPEER]!==true
        || $options[CURLOPT_SSL_VERIFYHOST]!==2 || $options[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS
        || $options[CURLOPT_VERBOSE]!==false || !is_file($options[CURLOPT_CAINFO]??'')) throw new \RuntimeException('fixture options mismatch');
    return true;
}
function curl_exec(\CurlHandle $handle): bool {
    if($GLOBALS['scenario']==='tls') return false;
    if($GLOBALS['scenario']==='warning') trigger_error('sensitive URL token fixture-api-secret',E_USER_WARNING);
    if($GLOBALS['scenario']==='exception') throw new \RuntimeException('sensitive URL token fixture-api-secret');
    $bodies=['malformed'=>'sensitive response fixture-api-secret','empty'=>'{"token":""}',
        'functional'=>'{"code":400,"token":"fixture-token","message":"sensitive response"}',
        'scalar'=>'"fixture-token"'];
    $body=$bodies[$GLOBALS['scenario']]??'{"token":"fixture-token","private":"fixture-api-secret"}';
    if($GLOBALS['scenario']==='large') $body=str_repeat('x',2097153);
    return ($GLOBALS['options'][CURLOPT_WRITEFUNCTION])($handle,$body)===strlen($body);
}
function curl_getinfo(\CurlHandle $handle,?int $option=null): int {return $GLOBALS['status'];}
function curl_errno(\CurlHandle $handle): int {return $GLOBALS['scenario']==='large'?23:60;}
function curl_error(\CurlHandle $handle): string {return 'unable to get local issuer certificate; sensitive URL fixture-api-secret';}
register_shutdown_function(static function() {
    $expected=in_array($GLOBALS['scenario'],['args','demo','insecure','missing-ca'],true)?0:1;
    if($GLOBALS['calls']!==$expected) {fwrite(STDERR,'FIXTURE_CALL_COUNT_FAILED');exit(90);}
});
$argv=$scenario==='args'?['inspect-auth-get.php','unexpected']:['inspect-auth-get.php'];
require __DIR__.'/../server/inspect-auth-get.php';
