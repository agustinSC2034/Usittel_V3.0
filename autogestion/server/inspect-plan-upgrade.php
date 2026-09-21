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
    $r=['ida'=>$ida,'code'=>'NOT_READY','administrative_plan_present'=>is_string($raw['Producto_Internet']??null),
        'administrative_plan'=>$plan,'technical_profile'=>null,
        'technical_profile_confirmed'=>false,'billing_confirmed'=>false,'provisioning_confirmed'=>false,
        'model'=>\MiUsittel\wifiModel($raw)?:null,'technology'=>in_array($raw['TipoCliente']??null,['FTTH','EOC','W','Satelite','METRO'],true)?$raw['TipoCliente']:null,
        'products'=>\MiUsittel\inspectServiceRecord($raw),'configured_targets'=>array_values(array_map(fn($p)=>$p['public_name'],$plans)),
        'soap'=>['enabled'=>($c['soap']['read_enabled']??false)===true,'extension_available'=>extension_loaded('soap')]];
    if(($c['soap']['read_enabled']??false)===true && ($c['soap']['lab_ida']??null)===$ida) {
        try {$names=$c['soap']['profile_names']??array_values(array_unique(array_column($plans,'phantom_profile')));
            if(!is_array($names)||!array_is_list($names))throw new \MiUsittel\Failure('SOAP_CONFIGURATION');
            $r['soap']+=(new \MiUsittel\PhantomSoapClient(new \MiUsittel\NativeSoapReadTransport($c),$c))->inspect($ida,$names);}
        catch(\Throwable $e) {$r['soap']['failure_code']=$e instanceof \MiUsittel\Failure?$e->kind:'SOAP_RESPONSE';}
    }
    echo json_encode($r,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR).PHP_EOL;
    echo 'Solo lectura. No se modificaron perfil, facturación ni aprovisionamiento.'.PHP_EOL;
} catch(\Throwable $e) {exit(\MiUsittel\writeInspectorFailure('plan_upgrade',$e));}
finally {unset($raw,$c);}
