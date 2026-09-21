<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}

require_once __DIR__.'/Core.php';
require_once __DIR__.'/Siro.php';
require_once __DIR__.'/PhantomPayments.php';

$root=(string)realpath(__DIR__.'/../..');
$inside=static function(string $path) use ($root): bool {
    $root=strtolower(str_replace('\\','/',$root));
    $path=strtolower(str_replace('\\','/',$path));
    return $path===$root || str_starts_with($path,$root.'/');
};
$checks=[];
$add=static function(string $status,string $label,string $detail='') use (&$checks): void {
    $checks[]=['status'=>$status,'label'=>$label,'detail'=>$detail];
};

$add(version_compare(PHP_VERSION,'8.2.0','>=')?'ok':'fail','PHP',PHP_VERSION.' (se requiere 8.2 o superior)');
$add(extension_loaded('curl')?'ok':'fail','cURL',extension_loaded('curl')?'extensión habilitada':'extensión faltante');
$add(extension_loaded('json')?'ok':'fail','JSON',extension_loaded('json')?'soporte habilitado':'soporte faltante');

$configPath=getenv('MI_USITTEL_CONFIG');
if(!$configPath) {
    $add('warn','Configuración privada','MI_USITTEL_CONFIG no está definida; el servidor iniciará en demo');
} else {
    $real=realpath($configPath);
    if(!$real || !is_file($real) || !is_readable($real)) {
        $add('fail','Configuración privada','el archivo definido no existe o no es legible');
    } elseif($inside($real)) {
        $add('fail','Configuración privada','el archivo debe estar fuera del repositorio');
    } else {
        try {
            ob_start();
            $config=require $real;
            ob_end_clean();
            if(!is_array($config)) throw new RuntimeException('shape');
            $mode=$config['mode']??null;
            if(!in_array($mode,['demo','phantom'],true)) {
                $add('fail','Configuración privada','mode debe ser demo o phantom');
            } else {
                $add('ok','Configuración privada','archivo fuera del repositorio; mode='.$mode);
                if($mode==='phantom') {
                    $url=parse_url(is_string($config['phantom_url']??null)?$config['phantom_url']:'');
                    $urlOk=($url['scheme']??'')==='https' && !empty($url['host'])
                        && !isset($url['user']) && !isset($url['pass']) && !isset($url['query']) && !isset($url['fragment']);
                    $add($urlOk?'ok':'fail','URL Phantom',$urlOk?'HTTPS válida':'falta una URL HTTPS válida y sin credenciales/query');
                    $idas=$config['allowed_idas']??null;
                    $idasOk=is_array($idas) && $idas!==[] && array_diff($idas,[1,5])===[];
                    $idasOk=$idasOk && in_array(1,$idas,true);
                    $loginIdas=$config['service_login_idas']??[1];
                    $loginIdasOk=\MiUsittel\validLoginScope($loginIdas);
                    $accountsOk=$idasOk && $loginIdasOk;
                    $loginCount=is_array($loginIdas)?count($loginIdas):0;
                    $loginDetail=$loginIdas==='all'?'Todos los contratos; credenciales exactas obligatorias; servicios autorizados en servidor':$loginCount.' contrato'.($loginCount===1?'':'s').' inicial'.($loginCount===1?'':'es').' configurado'.($loginCount===1?'':'s').'; servicios asociados se autorizan en servidor';
                    $add($accountsOk?'ok':'fail','Cuentas de laboratorio',$accountsOk?$loginDetail:'revisar allowed_idas y service_login_idas');
                    $authOk=($config['phantom_auth_mode']??'get-query-lab')==='get-query-lab';
                    $add($authOk?'ok':'fail','Autenticación técnica',$authOk?'GET explícito de laboratorio; lecturas POST':'usar get-query-lab');
                    $identity=$config['customer_id_field']??null;
                    $add($identity===null?'warn':(in_array($identity,['ID','IDAx'],true)?'ok':'fail'),'Identidad del abonado',
                        $identity===null?'pendiente de validación; login bloqueado':(in_array($identity,['ID','IDAx'],true)?'campo configurado; requiere confirmación real':'campo no permitido'));
                    $userOk=is_string($config['api_user']??null) && $config['api_user']!=='';
                    $passOk=is_string($config['api_pass']??null) && $config['api_pass']!=='';
                    $add($userOk&&$passOk?'ok':'warn','Credenciales Phantom',$userOk&&$passOk?'presentes (valores ocultos)':'faltan api_user y/o api_pass');
                }
                try {
                    $si=\MiUsittel\siroConfig($config+['mode'=>'demo']);
                    $add($si===null?'warn':'ok','SIRO laboratorio',$si===null?'deshabilitado; no se consulta SIRO':'configuración presente y rango definido; valores ocultos');
                    if($si!==null && !getenv('MI_USITTEL_RUNTIME')) $add('fail','Persistencia SIRO','definir MI_USITTEL_RUNTIME privado y persistente; no usar carpeta temporal');
                } catch(Throwable) {$add('fail','SIRO laboratorio','revisar estructura, credenciales privadas, retorno propio y rango reservado');}
                try {
                    $posting=\MiUsittel\phantomPostingConfig($config+['mode'=>'demo']);
                    $add($posting===null?'warn':'ok','Imputación Phantom',$posting===null?'deshabilitada; no se realizan escrituras':'habilitada para un único IDA de laboratorio; valores ocultos');
                    if($posting!==null && !getenv('MI_USITTEL_RUNTIME'))$add('fail','Persistencia de imputación','definir MI_USITTEL_RUNTIME privado y persistente');
                } catch(Throwable) {$add('fail','Imputación Phantom','revisar HTTPS, host, ruta CRM, IDA y originante');}
                $shapeErrors=[];
                foreach(['wifi','tickets'] as $feature) {
                    $s=$config[$feature]??[];$enabled=($s['enabled']??false)===true;
                    $valid=is_array($s) && (!$enabled || is_int($s['lab_ida']??null) && $s['lab_ida']>0);
                    $add(!$valid?'fail':($enabled?'warn':'ok'),$feature==='wifi'?'Cambios Wi-Fi':'Solicitudes de servicio',
                        !$valid?'requiere un único contrato de laboratorio':($enabled?'habilitado solo para laboratorio; falta confirmar compatibilidad real':'deshabilitado; sin escrituras'));
                    if($enabled && !getenv('MI_USITTEL_RUNTIME'))$add('fail','Persistencia de servicio','definir MI_USITTEL_RUNTIME privado y persistente');
                }
                $add('warn','Upgrade automático','bloqueado hasta validar perfil, facturación y aprovisionamiento; SOAP solo lectura');
                $add('warn','Avisos de solicitudes','eventos locales; email y Webchat no conectados');
                if(isset($config['lab_users']) && !is_array($config['lab_users'])) $shapeErrors[]='lab_users';
                if(isset($config['service_login_idas']) && (!isset($loginIdasOk) || !$loginIdasOk)) $shapeErrors[]='service_login_idas';
                if(isset($config['customer_path']) && !is_array($config['customer_path'])) $shapeErrors[]='customer_path';
                if(isset($config['profile_fields']) && !is_array($config['profile_fields'])) $shapeErrors[]='profile_fields';
                if(array_key_exists('balance_path',$config) && $config['balance_path']!==null && !is_array($config['balance_path'])) $shapeErrors[]='balance_path';
                foreach(['idle_seconds','max_seconds','timeout_seconds','connect_timeout_seconds'] as $key) {
                    if(isset($config[$key]) && (!is_int($config[$key]) || $config[$key]<1)) $shapeErrors[]=$key;
                }
                $add($shapeErrors===[]?'ok':'fail','Estructura de configuración',$shapeErrors===[]?'estructura mínima reconocida':'revisar: '.implode(', ',$shapeErrors));
            }
        } catch(Throwable) {
            while(ob_get_level()>0) ob_end_clean();
            $add('fail','Configuración privada','no se pudo cargar como array PHP');
        }
    }
}

$runtimePath=getenv('MI_USITTEL_RUNTIME');
if(!$runtimePath) {
    $add('warn','Runtime privado','MI_USITTEL_RUNTIME no está definido; el servidor usaría la carpeta temporal del sistema');
} else {
    $real=realpath($runtimePath);
    if(!$real || !is_dir($real)) $add('fail','Runtime privado','la carpeta definida no existe');
    elseif($inside($real)) $add('fail','Runtime privado','la carpeta debe estar fuera del repositorio');
    elseif(!is_writable($real)) $add('fail','Runtime privado','la carpeta no permite escritura');
    else $add('ok','Runtime privado','carpeta externa y escribible');
}

echo json_encode(['checks'=>$checks],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
