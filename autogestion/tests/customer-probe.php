<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
$scenario=$argv[1]??'success';$calls=0;$options=[];
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls']++;
    parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
    $expected=$GLOBALS['calls']===1?['action'=>'autentificar','JSON'=>'1','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret']
        :['action'=>'Consulta_Cliente_Avanzada','JSON'=>'1','IDA'=>'1'];
    if($GLOBALS['calls']>2 || $query!==$expected || parse_url($url,PHP_URL_SCHEME)!=='https'
        || parse_url($url,PHP_URL_HOST)!=='fixture.invalid') throw new \RuntimeException('fixture request mismatch');
    return \curl_init();
}
function curl_setopt_array(\CurlHandle $handle,array $options): bool {
    $GLOBALS['options']=$options;
    if($options[CURLOPT_FOLLOWLOCATION]!==false || $options[CURLOPT_SSL_VERIFYPEER]!==true
        || $options[CURLOPT_SSL_VERIFYHOST]!==2 || $options[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS) throw new \RuntimeException('fixture TLS mismatch');
    if($GLOBALS['calls']===1) {
        if(($options[CURLOPT_HTTPGET]??null)!==true || isset($options[CURLOPT_POSTFIELDS])) throw new \RuntimeException('fixture GET mismatch');
    } elseif(($options[CURLOPT_POST]??null)!==true || $options[CURLOPT_HTTPHEADER][0]!=='Content-Type: application/json'
        || json_decode($options[CURLOPT_POSTFIELDS],true)!==['token'=>'fixture-token']) throw new \RuntimeException('fixture POST mismatch');
    return true;
}
function curl_exec(\CurlHandle $handle): bool {
    $body=$GLOBALS['calls']===1?'{"token":"fixture-token"}':json_encode([
        'Nombre'=>'private-person','Estado_Servicio'=>'private-status','Autogestion_Pass'=>'fixture-password',
        'nested'=>['token'=>'private-token','DNI'=>'private-document','ports'=>[['number'=>7]],'URL_PAGO'=>'https://private.invalid'],
        'Conexiones_Asociadas'=>[['Nombre'=>'private-other']],
    ]);
    if($GLOBALS['calls']===2 && $GLOBALS['scenario']==='malformed') $body='private raw body';
    if($GLOBALS['calls']===2) {
        $formats=['html'=>'<!doctype html><html>private URL token</html>','empty'=>" \r\n",'string'=>'"private-token"',
            'nested-json'=>json_encode('{"Nombre":"private-person"}'),'null'=>'null','boolean'=>'false','number'=>'12345',
            'bom'=>"\xEF\xBB\xBF".$body,'bom-html'=>"\xEF\xBB\xBF<html>private token</html>",
            'bom-invalid'=>"\xEF\xBB\xBF{private",'bom-only'=>"\xEF\xBB\xBF",
            'bom-double'=>"\xEF\xBB\xBF\xEF\xBB\xBF".$body,'bom-after-space'=>" \xEF\xBB\xBF".$body,
            'bom-string'=>"\xEF\xBB\xBF\"private-token\"",'bom-functional'=>"\xEF\xBB\xBF".'{"code":400,"message":"private upstream"}',
            'utf8'=>"\xFF",'deep'=>str_repeat('[',40).'0'.str_repeat(']',40)];
        $body=$formats[$GLOBALS['scenario']]??$body;
        if($GLOBALS['scenario']==='unsafe-format') throw new Failure('PHANTOM_FORMAT',503,200,'private-token');
    }
    if($GLOBALS['calls']===2 && $GLOBALS['scenario']==='functional') $body='{"code":400,"message":"private upstream"}';
    if($GLOBALS['calls']===2 && $GLOBALS['scenario']==='warning') trigger_error('private token or URL',E_USER_WARNING);
    if($GLOBALS['calls']===2 && str_starts_with($GLOBALS['scenario'],'identity')) {
        $record=json_decode($body,true);$record['ID']=$GLOBALS['scenario']==='identity-wrong'?'2':'1';$record['IDAx']='99';
        $record['Autogestion_User']='fixture-login';
        if($GLOBALS['scenario']==='identity-type') $record['Autogestion_Pass']=123;
        $body=json_encode($GLOBALS['scenario']==='identity-duplicate'?[$record,$record]:[$record]);
    }
    ($GLOBALS['options'][CURLOPT_WRITEFUNCTION])($handle,$body);
    return true;
}
function curl_getinfo(\CurlHandle $handle,?int $option=null): int {
    if($GLOBALS['scenario']==='auth-failure') return 400;
    return $GLOBALS['calls']===2?(['http'=>400,'expired'=>401,'redirect'=>302][$GLOBALS['scenario']]??200):200;
}
function curl_errno(\CurlHandle $handle): int {return 0;}
function curl_error(\CurlHandle $handle): string {return '';}
register_shutdown_function(static function() {
    $expected=in_array($GLOBALS['scenario'],['args','forbidden','demo'],true)?0:($GLOBALS['scenario']==='auth-failure'?1:2);
    if($GLOBALS['calls']!==$expected) {fwrite(STDERR,'FIXTURE_CALL_COUNT_FAILED');exit(90);}
});
$argv=['inspect-customer.php',$scenario==='args'?'5':'1'];
if(str_starts_with($scenario,'identity')) $argv[]='--validate-identity';
require __DIR__.'/../server/inspect-customer.php';
