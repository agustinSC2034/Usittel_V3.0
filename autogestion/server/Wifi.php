<?php
declare(strict_types=1);
namespace MiUsittel;

function wifiGate(array $config,int $ida,string $model): bool {
    $wifi=$config['wifi']??[];
    return is_array($wifi) && ($wifi['enabled']??false)===true
        && ($wifi['lab_ida']??null)===$ida && $model!==''
        && is_array($wifi['models']??null) && in_array($model,$wifi['models'],true);
}
function wifiModel(array $record): string {
    $value=$record['ONU_Modelo']??null;
    return is_string($value) && preg_match('/^[a-zA-Z0-9][a-zA-Z0-9 ._()+\/-]{0,79}$/D',$value) ? $value : '';
}
function wifiDualBand(array $config,string $model): bool {
    $models=$config['wifi']['dual_band_models']??[];
    return is_array($models) && in_array($model,$models,true);
}
function wifiInput(array $body,bool $dualBand=true): array {
    $keys=['requestId','ssid','ssid5','password','accountPassword','confirmed'];
    if(array_diff(array_keys($body),$keys) || count($body)!==count($keys)
        || !is_string($body['requestId']??null) || !preg_match('/^[a-f0-9]{32}$/D',$body['requestId'])
        || ($body['confirmed']??null)!==true) throw new Failure('BAD_REQUEST',400);
    foreach(['ssid','ssid5','password'] as $key) {
        if($key==='ssid5' && !$dualBand) {
            if($body[$key]!=='') throw new Failure('WIFI_INPUT',400);
            continue;
        }
        $pattern=$key==='password'?'/^[a-zA-Z0-9@_.#$]{8,20}$/D':'/^[a-zA-Z0-9@_.]{8,20}$/D';
        if(!is_string($body[$key]??null) || !preg_match($pattern,$body[$key])) throw new Failure('WIFI_INPUT',400);
    }
    if(!is_string($body['accountPassword']) || $body['accountPassword']==='' || strlen($body['accountPassword'])>512) throw new Failure('WIFI_INPUT',400);
    return ['SSID'=>$body['ssid']]+($dualBand?['SSID_5G'=>$body['ssid5']]:[])+['Password'=>$body['password']];
}

// Shared per-contract lock and durable outcome. Never store SSIDs or passwords.
// An uncertain result blocks subsequent writes until operator reconciliation.
function applyWifiOnce(string $dir,int $ida,string $requestId,string $payloadHash,callable $write): array {
    $path=$dir.'/wifi-change-'.$ida.'.json';
    return locked($path.'.lock',function() use($path,$requestId,$payloadHash,$write) {
        $contents=is_file($path)?file_get_contents($path):'';
        if(is_file($path) && $contents==='') throw new Failure('WIFI_REVIEW',409);
        $last=$contents===''?[]:json_decode($contents,true);
        if(!is_array($last)) throw new Failure('WIFI_REVIEW',409);
        if($last && (!is_string($last['requestId']??null) || !preg_match('/^[a-f0-9]{32}$/D',$last['requestId']) || !is_int($last['at']??null)
            || !is_string($last['payloadHash']??null) || !preg_match('/^[a-f0-9]{64}$/D',$last['payloadHash'])
            || !in_array($last['state']??null,['APPLIED','UNKNOWN'],true))) throw new Failure('WIFI_REVIEW',409);
        if(($last['requestId']??null)===$requestId) {
            if(!is_string($last['payloadHash']??null) || !hash_equals($last['payloadHash'],$payloadHash)) throw new Failure('WIFI_EXPIRED',409);
            return ['state'=>$last['state']];
        }
        if(($last['state']??null)==='UNKNOWN') throw new Failure('WIFI_REVIEW',409);
        if(($last['at']??0)>time()-300) throw new Failure('WIFI_RATE_LIMIT',429);
        $record=['requestId'=>$requestId,'payloadHash'=>$payloadHash,'state'=>'UNKNOWN','at'=>time()];
        saveWifiState($path,$record);
        try {
            $result=$write();
            // A ticket creation also uses code 200. Only this exact response confirms a change.
            if(($result['code']??null)===200 && ($result['message']??null)==='Cambio Wifi aplicado exitosamente') $record['state']='APPLIED';
        } catch(\Throwable) { /* Unknown delivery: no retry, no upstream text or credentials in logs. */ }
        saveWifiState($path,$record);
        return ['state'=>$record['state']];
    });
}
function saveWifiState(string $path,array $record): void {
    // A crash while persisting the result must not erase the UNKNOWN reservation.
    $temp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';$handle=null;
    try {
        $json=json_encode($record,JSON_THROW_ON_ERROR);$handle=fopen($temp,'xb');
        if(!$handle || !chmod($temp,0600) || fwrite($handle,$json)!==strlen($json) || !fflush($handle) || !fsync($handle)) throw new Failure('WIFI_REVIEW',409);
        fclose($handle);$handle=null;if(!rename($temp,$path)) throw new Failure('WIFI_REVIEW',409);
    } finally {if(is_resource($handle))fclose($handle);if(is_file($temp))unlink($temp);}
}
