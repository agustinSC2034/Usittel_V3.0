<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli'||getenv('MI_USITTEL_TEST')!=='1')exit(2);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';
$scenario=$argv[1];$writes=0;$urls=[];$opts=[];
function curl_init(?string $url=null): \CurlHandle|false {$h=\curl_init();$GLOBALS['urls'][spl_object_id($h)]=$url;return $h;}
function curl_setopt_array(\CurlHandle $h,array $o): bool {
    parse_str((string)parse_url($GLOBALS['urls'][spl_object_id($h)],PHP_URL_QUERY),$q);
    if($o[CURLOPT_SSL_VERIFYPEER]!==true||$o[CURLOPT_SSL_VERIFYHOST]!==2||$o[CURLOPT_FOLLOWLOCATION]!==false||$o[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS||!isset($o[CURLOPT_CAINFO]))throw new \RuntimeException('TLS invariant');
    if($q['action']==='Phantom_Generar_TT') {
        $GLOBALS['writes']++;$body=json_decode($o[CURLOPT_POSTFIELDS],true);
        if(($q['IDA']??null)!=='1'||isset($q['token'])||($body['token']??null)!=='fixture-token'||($o[CURLOPT_POST]??null)!==true)throw new \RuntimeException('Ticket request invariant');
    }
    $GLOBALS['opts'][spl_object_id($h)]=$o;return true;
}
function curl_exec(\CurlHandle $h): bool {
    parse_str((string)parse_url($GLOBALS['urls'][spl_object_id($h)],PHP_URL_QUERY),$q);
    $s=$GLOBALS['scenario'];
    if($q['action']==='autentificar')$body='{"token":"fixture-token"}';
    else {
        if($s==='timeout')return false;
        $body=match($s){'plain'=>'321','quoted'=>'"321"','zero'=>'0','html'=>'<html>private secret</html>',
            'error'=>'{"code":400,"message":"Error IDTicket: 321"}','array'=>'[321]','large'=>str_repeat('x',2097153),default=>'321'};
    }
    return $GLOBALS['opts'][spl_object_id($h)][CURLOPT_WRITEFUNCTION]($h,$body)===strlen($body);
}
function curl_getinfo(\CurlHandle $h,?int $option=null): int {
    parse_str((string)parse_url($GLOBALS['urls'][spl_object_id($h)],PHP_URL_QUERY),$q);
    return $q['action']==='autentificar'?200:match($GLOBALS['scenario']){'redirect'=>302,'expired'=>401,'http'=>500,default=>200};
}
function curl_errno(\CurlHandle $h): int {return $GLOBALS['scenario']==='large'?CURLE_WRITE_ERROR:CURLE_OPERATION_TIMEDOUT;}
function curl_error(\CurlHandle $h): string {return 'private upstream URL or text';}
$c=['phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture-api','api_pass'=>'fixture-secret','ca_file'=>__FILE__,'connect_timeout_seconds'=>4,'timeout_seconds'=>10,'tickets'=>['enabled'=>true,'lab_ida'=>1]];
$ph=new Phantom($c,getenv('MI_USITTEL_RUNTIME'),new CurlTransport($c));$ph->scope([1]);
try {$id=$ph->createTicket(1,['Categoria'=>'Fixture','Delegacion'=>'Fixture','Prioridad'=>2,'Asunto'=>'Fixture','Detalle'=>'Fixture']);if($id!=='321')throw new \RuntimeException('Wrong ticket');echo 'TICKET_OK';}
catch(Failure $e) {echo $e->kind;}
if($writes!==1)throw new \RuntimeException('Write repeated');
