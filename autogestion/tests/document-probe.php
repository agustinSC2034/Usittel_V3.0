<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
$scenario=$argv[1]??'pdf';$calls=0;$options=[];$document=false;$headers=[];
function curl_init(?string $url=null): \CurlHandle|false {
    $GLOBALS['calls']++;$p=parse_url($url);parse_str($p['query']??'',$q);
    $GLOBALS['document']=($p['path']??'')==='/PHANTOM/Includes/CRM/Comprobante_Factura.php';
    if(($p['scheme']??'')!=='https' || ($p['host']??'')!=='fixture.invalid' || $GLOBALS['calls']>4) throw new \RuntimeException('fixture URL');
    if($GLOBALS['document']) {
        // Numeric IDT 990 is historical, but endpoint IDT must carry its own hash.
        $hash=$GLOBALS['scenario']==='latest'?'private-hash-1000+/=&?':'private-hash-990+/=&?';
        if($q!==['IDT'=>$hash] || $GLOBALS['calls']!==4) throw new \RuntimeException('fixture selected hash');
    } else {
        $expected=$GLOBALS['calls']===1?['action'=>'autentificar','JSON'=>'1','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret']
            :['action'=>'Phantom_Ultima_Factura','JSON'=>'1','IDA'=>'1','Limit'=>'10','Offset'=>$GLOBALS['calls']===2?'0':'10'];
        if($q!==$expected || $p['path']!=='/API_Rest.php') throw new \RuntimeException('fixture API query');
    }
    return \curl_init(); // Allocate only. No real curl_exec is ever called.
}
function curl_setopt_array(\CurlHandle $ch,array $options): bool {
    $GLOBALS['options']=$options;
    if($options[CURLOPT_SSL_VERIFYPEER]!==true || $options[CURLOPT_SSL_VERIFYHOST]!==2 || $options[CURLOPT_FOLLOWLOCATION]!==false
        || $options[CURLOPT_PROTOCOLS]!==CURLPROTO_HTTPS || !isset($options[CURLOPT_CAINFO])) throw new \RuntimeException('fixture TLS');
    if($GLOBALS['document']) {
        if(($options[CURLOPT_HTTPGET]??false)!==true || isset($options[CURLOPT_POSTFIELDS]) || isset($options[CURLOPT_COOKIE]) || isset($options[CURLOPT_COOKIEJAR])) throw new \RuntimeException('fixture GET');
        if(str_contains(json_encode($options[CURLOPT_HTTPHEADER]),'fixture-token')) throw new \RuntimeException('fixture token');
    } elseif($GLOBALS['calls']>1 && json_decode($options[CURLOPT_POSTFIELDS]??'',true)!==['token'=>'fixture-token']) throw new \RuntimeException('fixture POST');
    return true;
}
function curl_exec(\CurlHandle $ch): bool {
    $s=$GLOBALS['scenario'];$o=$GLOBALS['options'];
    if(!$GLOBALS['document']) {
        $offset=$GLOBALS['calls']===2?0:10;$rows=[];
        for($i=$offset;$i<min(11,$offset+10);$i++) $rows[]=['IDT'=>(string)(1000-$i),'IDA'=>'1','Hash_Descarga'=>'private-hash-'.(1000-$i).'+/=&?','Detalle'=>'private-person'];
        if($GLOBALS['calls']===3) {
            if($s==='foreign') $rows[0]['IDA']='5';
            if($s==='missing-hash') unset($rows[0]['Hash_Descarga']);
            if($s==='empty-hash') $rows[0]['Hash_Descarga']='';
            if($s==='duplicate') $rows[0]['IDT']='1000';
        }
        $body="\xEF\xBB\xBF".json_encode($GLOBALS['calls']===1?['token'=>'fixture-token']:$rows);
        $o[CURLOPT_WRITEFUNCTION]($ch,$body);return true;
    }
    if($s==='timeout') return false;
    if($s==='runtime') throw new \RuntimeException('private-hash https://fixture.invalid/?token=private-token');
    $mime=match($s){'html'=>'text/html; charset=UTF-8','mime'=>'application/private-token','empty'=>'text/plain',default=>'application/pdf'};
    $body=match($s){'html'=>'<!doctype html><html>private-person</html>','empty'=>'','mime'=>'private-body','truncated'=>"%PDF-1.7\nprivate-person",default=>"%PDF-1.7\nprivate-person\n%%EOF"};
    $location=match($s){'redirect'=>'/PHANTOM/login.php?token=private-token','external'=>'https://external.invalid/PHANTOM/login.php?token=private-token',
        'unsafe-path'=>'/private-hash/secret?token=private-token','relative'=>'Comprobante_Factura.php?IDT=private-hash',
        'http-redirect'=>'http://fixture.invalid/PHANTOM/login.php','userinfo'=>'https://private-user:private-pass@fixture.invalid/PHANTOM/login.php',default=>null};
    $redirect=$location!==null || $s==='no-location';
    $GLOBALS['headers']=['Content-Type: '.$mime,'Content-Length: '.strlen($body),'Set-Cookie: private-cookie','X-Private: private-token'];
    if($s==='no-length') $GLOBALS['headers']=array_values(array_filter($GLOBALS['headers'],static fn($h)=>!str_starts_with($h,'Content-Length:')));
    if($location!==null) $GLOBALS['headers'][]='Location: '.$location;
    $status=$redirect?302:($s==='http-error'?500:200);
    $GLOBALS['status']=$status;
    $o[CURLOPT_HEADERFUNCTION]($ch,'HTTP/1.1 '.$status." fixture\r\n");
    foreach($GLOBALS['headers'] as $header) $o[CURLOPT_HEADERFUNCTION]($ch,$header."\r\n");
    if($s==='header-size') return $o[CURLOPT_HEADERFUNCTION]($ch,str_repeat('x',33000))!==0;
    if($s==='size') {
        for($i=0;$i<11;$i++) if($o[CURLOPT_WRITEFUNCTION]($ch,str_repeat('x',1048576))===0) return false;
        throw new \RuntimeException('fixture size not bounded');
    }
    $o[CURLOPT_WRITEFUNCTION]($ch,$body);return true;
}
function curl_getinfo(\CurlHandle $ch,?int $option=null): int {return $GLOBALS['document']?($GLOBALS['status']??0):200;}
function curl_errno(\CurlHandle $ch): int {return $GLOBALS['document'] && $GLOBALS['scenario']==='timeout'?CURLE_OPERATION_TIMEDOUT:0;}
function curl_error(\CurlHandle $ch): string {return 'private-token private-url';}
register_shutdown_function(static function(){
    $expected=match($GLOBALS['scenario']) {'args','hash-argument'=>0,'foreign','missing-hash','empty-hash','not-found','duplicate'=>3,default=>4};
    if($GLOBALS['calls']!==$expected) {fwrite(STDERR,'FIXTURE_CALL_COUNT_FAILED');exit(90);}
});
if(($argv[2]??null)==='source') {
    require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';
    require __DIR__.'/../server/InvoiceDocuments.php';require __DIR__.'/../server/Inspector.php';
    $GLOBALS['calls']=3;
    try {
        $source=new PhantomInvoiceDocuments(config());
        $pdf=$source->fetch(1,'990','private-hash-990+/=&?');
        if(!str_starts_with($pdf['bytes'],'%PDF-')) throw new \RuntimeException('fixture result');
        echo 'VALIDATED_PDF';exit;
    } catch(\Throwable $e) {exit(writeInspectorFailure('documento',$e));}
}
$argv=['inspect-invoice-document.php',$scenario==='args'?'5':'1',match($scenario){'latest'=>'--latest','not-found'=>'989','hash-argument'=>'private-hash',default=>'990'}];
require __DIR__.'/../server/inspect-invoice-document.php';
