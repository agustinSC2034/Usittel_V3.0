<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
$scenario=$argv[1]??'normal';$calls=0;$options=[];
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls']++;parse_str((string)parse_url($url,PHP_URL_QUERY),$q);
    $expected=$GLOBALS['calls']===1?['action'=>'autentificar','JSON'=>'1','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret']
        :['action'=>'Phantom_Ultima_Factura','JSON'=>'1','IDA'=>'1','Limit'=>'10','Offset'=>$GLOBALS['calls']===2?'0':'10'];
    if($GLOBALS['calls']>3 || $q!==$expected || parse_url($url,PHP_URL_HOST)!=='fixture.invalid') throw new \RuntimeException('fixture bounded calls');
    return \curl_init();
}
function curl_setopt_array(\CurlHandle $ch,array $options): bool {
    $GLOBALS['options']=$options;
    if($options[CURLOPT_SSL_VERIFYPEER]!==true || $options[CURLOPT_SSL_VERIFYHOST]!==2 || $options[CURLOPT_FOLLOWLOCATION]!==false) throw new \RuntimeException('fixture TLS');
    if($GLOBALS['calls']>1 && (json_decode($options[CURLOPT_POSTFIELDS],true)!==['token'=>'fixture-token']
        || $options[CURLOPT_HTTPHEADER][0]!=='Content-Type: application/json')) throw new \RuntimeException('fixture POST');
    return true;
}
function curl_exec(\CurlHandle $ch): bool {
    $rows=[];$s=$GLOBALS['scenario'];$offset=$GLOBALS['calls']===2?0:10;
    $n=$s==='empty'?0:($s==='one'?1:15);
    for($i=$offset;$i<min($n,$offset+10);$i++) $rows[]=['IDT'=>(string)(1000-$i),'Total'=>'private-amount','Detalle'=>'private-description','Hash_Descarga'=>'private-hash'];
    if($s==='duplicate' && count($rows)>1) $rows[1]=$rows[0];
    if($s==='repeat' && $GLOBALS['calls']===3) {
        $rows=[];for($i=0;$i<10;$i++) $rows[]=['IDT'=>(string)(1000-$i)];
    }
    if($s==='html' && $GLOBALS['calls']===2) $body='<html>private-response</html>';
    else $body="\xEF\xBB\xBF".json_encode($GLOBALS['calls']===1?['token'=>'fixture-token']:$rows);
    ($GLOBALS['options'][CURLOPT_WRITEFUNCTION])($ch,$body);return true;
}
function curl_getinfo(\CurlHandle $ch,?int $option=null): int {return $GLOBALS['scenario']==='http' && $GLOBALS['calls']===3?500:200;}
function curl_errno(\CurlHandle $ch): int {return 0;}
function curl_error(\CurlHandle $ch): string {return '';}
register_shutdown_function(static function() {
    $expected=match($GLOBALS['scenario']) {'args'=>0,'duplicate','html'=>2,default=>3};
    if($GLOBALS['calls']!==$expected) {fwrite(STDERR,'FIXTURE_CALL_COUNT_FAILED');exit(90);}
});
$argv=['inspect-invoices.php',$scenario==='args'?'5':'1'];
require __DIR__.'/../server/inspect-invoices.php';
