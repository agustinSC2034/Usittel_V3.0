<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
$scenario=$argv[1]??'success';$calls=0;$options=[];
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls']++;
    $queries=[['action'=>'autentificar','JSON'=>'1','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret'],
        ['action'=>'Consulta_Cliente_Avanzada','JSON'=>'1','IDA'=>'1'],
        ['action'=>'Phantom_Mi_Estado_Cuenta','JSON'=>'1','IDA'=>'1'],
        ['action'=>'Phantom_Ultima_Factura','JSON'=>'1','IDA'=>'1','Limit'=>'1','Offset'=>'0']];
    parse_str((string)parse_url($url,PHP_URL_QUERY),$query);
    if($query!==($queries[$GLOBALS['calls']-1]??null) || parse_url($url,PHP_URL_SCHEME)!=='https'
        || parse_url($url,PHP_URL_HOST)!=='fixture.invalid') throw new \RuntimeException('fixture request mismatch');
    return \curl_init();
}
function curl_setopt_array(\CurlHandle $handle,array $options): bool {
    $GLOBALS['options']=$options;
    if($options[CURLOPT_FOLLOWLOCATION]!==false || $options[CURLOPT_SSL_VERIFYPEER]!==true
        || $options[CURLOPT_SSL_VERIFYHOST]!==2 || $options[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS) throw new \RuntimeException('fixture TLS mismatch');
    if($GLOBALS['calls']===1) {
        if(($options[CURLOPT_HTTPGET]??null)!==true || isset($options[CURLOPT_POSTFIELDS])) throw new \RuntimeException('fixture auth mismatch');
    } elseif(($options[CURLOPT_POST]??null)!==true || $options[CURLOPT_HTTPHEADER][0]!=='Content-Type: application/json'
        || json_decode($options[CURLOPT_POSTFIELDS],true)!==['token'=>'fixture-token']) throw new \RuntimeException('fixture body mismatch');
    return true;
}
function curl_exec(\CurlHandle $handle): bool {
    $responses=[['token'=>'fixture-token'],[['Nombre'=>'private-person','Autogestion_Pass'=>'fixture-password'],['Another_Record'=>'private-other']],
        ['Saldo'=>'private-balance','details'=>[['Monto'=>123,'URL_PAGO'=>'private-url']]],
        [['IDT'=>'private-invoice','Total'=>'private-amount','Hash_Descarga'=>'private-hash']]];
    $body="\xEF\xBB\xBF".json_encode($responses[$GLOBALS['calls']-1]);
    if($GLOBALS['scenario']==='malformed-account' && $GLOBALS['calls']===3) $body='<html>private upstream</html>';
    if($GLOBALS['scenario']==='no-invoice' && $GLOBALS['calls']===4) $body=json_encode(['code'=>'400','message'=>'Error: No se encontró factura para el cliente (400)']);
    if($GLOBALS['scenario']==='other-invoice-error' && $GLOBALS['calls']===4) $body='{"code":400,"message":"private upstream"}';
    if($GLOBALS['scenario']==='warning-invoice' && $GLOBALS['calls']===4) trigger_error('private URL token',E_USER_WARNING);
    ($GLOBALS['options'][CURLOPT_WRITEFUNCTION])($handle,$body);
    return true;
}
function curl_getinfo(\CurlHandle $handle,?int $option=null): int {
    return $GLOBALS['scenario']==='fail-'.$GLOBALS['calls']?401:200;
}
function curl_errno(\CurlHandle $handle): int {return 0;}
function curl_error(\CurlHandle $handle): string {return '';}
register_shutdown_function(static function() {
    $s=$GLOBALS['scenario'];
    $expected=in_array($s,['args','demo','forbidden'],true)?0:($s==='malformed-account'?3:(str_starts_with($s,'fail-')?(int)substr($s,5):4));
    if($GLOBALS['calls']!==$expected) {fwrite(STDERR,'FIXTURE_CALL_COUNT_FAILED');exit(90);}
});
$argv=['inspect-schema.php',$scenario==='args'?'5':'1','--auth-get'];
require __DIR__.'/../server/inspect-schema.php';
