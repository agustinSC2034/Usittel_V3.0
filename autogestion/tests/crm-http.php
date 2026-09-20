<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';
$scenario=$argv[1]??'ok';$calls=0;$authCalls=0;$unpaidCalls=0;$urls=[];$opts=[];
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls']++;$ch=\curl_init();$GLOBALS['urls'][spl_object_id($ch)]=$url;return $ch;
}
function curl_setopt_array(\CurlHandle $ch,array $options): bool {
    $url=$GLOBALS['urls'][spl_object_id($ch)];$parts=parse_url($url);parse_str($parts['query']??'',$query);
    if(($parts['scheme']??null)!=='https' || ($parts['path']??null)!=='/PHANTOM/Includes/CRM/API_CRM.php'
        || $options[CURLOPT_FOLLOWLOCATION]!==false || $options[CURLOPT_SSL_VERIFYPEER]!==true || $options[CURLOPT_SSL_VERIFYHOST]!==2
        || $options[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS || !isset($options[CURLOPT_CAINFO])) throw new \RuntimeException('CRM TLS regression');
    if(($query['action']??null)==='autentificar') {
        $GLOBALS['authCalls']++;if(($query['JSON']??null)!=='1' || ($query['api_user']??null)!=='fixture-api' || ($query['api_pass']??null)!=='fixture-secret' || isset($query['token'])) throw new \RuntimeException('CRM auth contract');
        if(($options[CURLOPT_HTTPGET]??null)!==true) throw new \RuntimeException('CRM auth method');
    } elseif(($query['action']??null)==='Consultar_Impagos') {
        $GLOBALS['unpaidCalls']++;$body=json_decode($options[CURLOPT_POSTFIELDS]??'',true);
        if(($query['token']??null)!==($body['token']??null) || ($body['IDT']??null)!=='123' || isset($body['api_user'],$body['api_pass'])) throw new \RuntimeException('CRM unpaid contract');
    } else throw new \RuntimeException('Unexpected CRM action');
    $GLOBALS['opts'][spl_object_id($ch)]=$options;return true;
}
function curl_exec(\CurlHandle $ch): bool {
    if($GLOBALS['scenario']==='timeout') return false;
    $url=$GLOBALS['urls'][spl_object_id($ch)];parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
    $body=($query['action']??null)==='autentificar'?json_encode(['token'=>'crm-fixture-'.$GLOBALS['authCalls']]):json_encode([['123','Fixture','1','2026-09-01','2026-09','1-123','121.00']]);
    if($GLOBALS['scenario']==='malformed' && ($query['action']??null)==='Consultar_Impagos')$body='<html>private</html>';
    if(($query['action']??null)==='Consultar_Impagos') $body=match($GLOBALS['scenario']) {
        'empty'=>'','null'=>'null','text'=>'Error private-secret','string'=>'"private-secret"',default=>$body
    };
    $GLOBALS['opts'][spl_object_id($ch)][CURLOPT_WRITEFUNCTION]($ch,$body);return true;
}
function curl_getinfo(\CurlHandle $ch,?int $option=null): int {
    $url=$GLOBALS['urls'][spl_object_id($ch)];parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
    if($GLOBALS['scenario']==='expired' && ($query['action']??null)==='Consultar_Impagos' && $GLOBALS['unpaidCalls']===1)return 401;
    return 200;
}
function curl_errno(\CurlHandle $ch): int {return CURLE_OPERATION_TIMEDOUT;}
function curl_error(\CurlHandle $ch): string {return '';}
$dir=getenv('MI_USITTEL_RUNTIME');$config=['phantom_url'=>'https://fixture.invalid/PHANTOM/Includes/API_Rest.php','api_user'=>'fixture-api','api_pass'=>'fixture-secret',
    'ca_file'=>__FILE__,'connect_timeout_seconds'=>4,'timeout_seconds'=>10];
$settings=['enabled'=>false,'crm_url'=>'https://fixture.invalid/PHANTOM/Includes/CRM/API_CRM.php','lab_ida'=>1,'origin'=>'SIRO Mi USITTEL'];
try {
    $crm=new PhantomCrmHttp($config,$settings,$dir);$rows=$crm->unpaid('123');
    if($scenario==='ok' && ($authCalls!==1 || $unpaidCalls!==1 || count($rows)!==1)) throw new \RuntimeException('CRM cache/request failure');
    if($scenario==='expired' && ($authCalls!==2 || $unpaidCalls!==2 || count($rows)!==1)) throw new \RuntimeException('CRM renewal failure');
    echo 'CRM_HTTP_OK';
} catch(Failure $e) {
    if(in_array($scenario,['malformed','empty','null','text','string'],true)) {
        $expected=match($scenario) {'malformed'=>'html','empty','text'=>'non_json','null'=>'json_null','string'=>'json_string'};
        $diagnostic=$crm->formatDiagnostic();
        if(($diagnostic['format']??null)!==$expected || $diagnostic['http']!==200 || $diagnostic['empty']!==($scenario==='empty')
            || str_contains(json_encode($diagnostic),'private')) throw new \RuntimeException('unsafe or incorrect metadata');
    }
    echo $e->kind;
}
