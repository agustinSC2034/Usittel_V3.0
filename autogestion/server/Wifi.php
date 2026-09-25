<?php
declare(strict_types=1);
namespace MiUsittel;

function wifiGate(array $config,string $model): bool {
    $wifi=$config['wifi']??[];
    return is_array($wifi) && ($wifi['enabled']??false)===true
        && validWifiModelLists($wifi) && $model!=='' && in_array($model,$wifi['models'],true);
}
function validWifiModelLists(array $wifi): bool {
    $models=$wifi['models']??null;$dual=$wifi['dual_band_models']??null;
    if(!is_array($models) || !is_array($dual) || !array_is_list($models) || !array_is_list($dual)) return false;
    foreach(array_merge($models,$dual) as $model) if(!is_string($model) || !wifiSafeEquipmentValue($model)) return false;
    return count($models)===count(array_unique($models)) && count($dual)===count(array_unique($dual))
        && !array_diff($dual,$models);
}
function wifiSafeEquipmentValue(mixed $value): bool {
    return is_string($value) && (bool)preg_match('/^[A-Za-z0-9][A-Za-z0-9._+\/-]{0,79}$/D',$value);
}
function wifiChipset(array $record): string {
    $value=$record['ONU_Modelo']??null;
    return wifiSafeEquipmentValue($value) ? $value : '';
}
// The production model key is not confirmed. A missing mapping always fails closed.
// ONU_Modelo is the observed chipset and can never be used as a model source.
function wifiCandidateField(mixed $key): bool {
    return is_string($key) && $key!=='ONU_Modelo' && (bool)preg_match(
        '/^(?:(?:ONU|ONT|FTTH)_(?:Modelo|Model|Software|SW|Firmware|Chipset|Hardware|Version(?:SW|HW)?)|(?:Modelo|Model|Software|SW|Firmware|Chipset|Hardware|Version(?:SW|HW)?)_(?:ONU|ONT|FTTH))$/D',
        $key
    );
}
function wifiModelField(mixed $key): bool {
    return wifiCandidateField($key) && (bool)preg_match(
        '/^(?:(?:ONU|ONT|FTTH)_(?:Modelo|Model|Software|SW)|(?:Modelo|Model|Software|SW)_(?:ONU|ONT|FTTH))$/D',
        $key
    );
}
function wifiDeviceModel(array $record,array $config): string {
    $field=$config['wifi']['model_field']??null;
    if(!wifiModelField($field)) return '';
    $value=$record[$field]??null;
    return wifiSafeEquipmentValue($value) && !preg_match('/^V[0-9]+R[0-9]+C[0-9]+S[0-9]+$/D',$value) ? $value : '';
}
function wifiEquipmentCandidates(array $record): array {
    $out=[];
    foreach($record as $field=>$value) {
        if(!wifiCandidateField($field) || !wifiSafeEquipmentValue($value)) continue;
        $out[$field]=$value;
    }
    return $out;
}
function wifiDualBand(array $config,string $model): bool {
    $wifi=$config['wifi']??[];
    return is_array($wifi) && validWifiModelLists($wifi) && in_array($model,$wifi['dual_band_models'],true);
}
function inspectServiceCatalogRows(Phantom $phantom,array $config,array $ids): array {
    $phantom->scope($ids);$report=[];
    foreach($ids as $ida) {
        $record=$phantom->serviceRecord($ida);$model=wifiDeviceModel($record,$config);
        $products=inspectPublicProductLabels($record);
        $report[]=['ida'=>$ida,'chipset'=>wifiChipset($record)?:null,'model'=>$model?:null,
            'equipment_candidates'=>wifiEquipmentCandidates($record),'dual_band_known'=>$model!==''&&wifiDualBand($config,$model),
            'wifi_eligible'=>$model!==''&&wifiGate($config,$model),'products'=>$products,
            'derived'=>['sensa'=>in_array('IPTV',array_column($products,'category'),true)]];
    }
    return $report;
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
