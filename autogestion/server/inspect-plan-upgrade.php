<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('zend.exception_ignore_args','1');
require __DIR__.'/Core.php';require __DIR__.'/Phantom.php';require __DIR__.'/PhantomSoap.php';require __DIR__.'/Inspector.php';require __DIR__.'/Wifi.php';
set_error_handler(static function(){throw new \MiUsittel\Failure('INSPECTOR_RUNTIME');});
try {
    if(count($argv)!==2 || !preg_match('/^[1-9][0-9]{0,9}$/D',$argv[1])) throw new \MiUsittel\Failure('INSPECTOR_ARGUMENTS');
    $ida=(int)$argv[1];$c=\MiUsittel\config();if($c['mode']!=='phantom')throw new \MiUsittel\Failure('CONFIGURATION');
    $ph=new \MiUsittel\Phantom($c,\MiUsittel\privateDir(),new \MiUsittel\CurlTransport($c));$ph->scope([$ida]);
    $raw=$ph->upgradeInspectionRecord($ida);$plans=\MiUsittel\upgradeCatalog($c);
    $plan=$raw['Producto_Internet']??null;
    if(!is_string($plan) || strlen($plan)>160 || preg_match('/[<>@\x00-\x1f]|https?:/i',$plan)) $plan=null;
    if($plan!==null) $plan=trim(preg_replace('/^\s*(?:\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*)?(?:[A-Z]{2,12}\s*\(\s*\$\s*\)\s*-\s*)?/i','',$plan));
    $r=['ida'=>$ida,'code'=>'NOT_READY_FOR_UPGRADE_WRITE','administrative_plan_present'=>is_string($raw['Producto_Internet']??null),
        'commercial_plan_status'=>$plan!==null && $plan!=='' && $plan!=='-'?'COMMERCIAL_PLAN_KNOWN':'COMMERCIAL_PLAN_UNKNOWN',
        'technical_profile_status'=>'TECHNICAL_PROFILE_UNKNOWN',
        'billing_status'=>'BILLING_RELATION_UNKNOWN','provisioning_status'=>'PROVISIONING_RELATION_UNKNOWN',
        'administrative_plan'=>$plan,'technical_profile'=>null,
        'technical_profile_confirmed'=>false,'billing_confirmed'=>false,'provisioning_confirmed'=>false,
        'chipset'=>\MiUsittel\wifiChipset($raw)?:null,'model'=>\MiUsittel\wifiDeviceModel($raw,$c)?:null,
        'technology'=>in_array($raw['TipoCliente']??null,['FTTH','EOC','W','Satelite','METRO'],true)?$raw['TipoCliente']:null,
        'products'=>\MiUsittel\inspectServiceRecord($raw),'configured_targets'=>array_values(array_map(fn($p)=>$p['public_name'],$plans)),
        'soap'=>['enabled'=>($c['soap']['read_enabled']??false)===true,'extension_available'=>extension_loaded('soap'),
            'auth_status'=>'SOAP_AUTH_NOT_CHECKED','profile_lookup_status'=>'PROFILE_LOOKUP_NOT_REQUESTED']];
    try {\MiUsittel\soapReadEndpoint($c);$r['soap']['endpoint_status']='HTTPS_SAME_HOST_PORT_OK';}
    catch(\MiUsittel\Failure $e) {$r['soap']['endpoint_status']='SOAP_CONFIGURATION_REQUIRED';}
    if(($c['soap']['read_enabled']??false)===true && ($c['soap']['lab_ida']??null)===$ida) {
        try {$ids=$c['soap']['profile_ids']??[];
            if(!is_array($ids)||!array_is_list($ids))throw new \MiUsittel\Failure('SOAP_CONFIGURATION');
            $names=$ids===[]?($c['soap']['profile_names']??array_values(array_unique(array_column($plans,'phantom_profile')))):[];
            if(!is_array($names)||!array_is_list($names))throw new \MiUsittel\Failure('SOAP_CONFIGURATION');
            $r['soap']=array_replace($r['soap'],(new \MiUsittel\PhantomSoapClient(new \MiUsittel\NativeSoapReadTransport($c),$c))->inspect($ida,$names,$ids));
            $r['technical_profile_status']=$r['soap']['technical_profile_status'];
            $r['technical_profile_confirmed']=$r['technical_profile_status']==='TECHNICAL_PROFILE_KNOWN';}
        catch(\Throwable $e) {$r['soap']['failure_code']=\MiUsittel\safeDiagnosticCode($e);}
    }
    echo json_encode($r,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
    echo 'Solo lectura. No se modificaron perfil, facturación ni aprovisionamiento.'.PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('plan_upgrade',$e));}
finally {unset($raw,$c);}
