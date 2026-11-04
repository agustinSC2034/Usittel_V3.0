<?php
declare(strict_types=1);
namespace MiUsittel;

if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/Core.php';
require_once __DIR__.'/Push.php';
ini_set('display_errors','0');
ini_set('zend.exception_ignore_args','1');

function fcmRequest(string $url,string $body,array $headers): array {
    $curl=curl_init($url);
    curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$body,CURLOPT_HTTPHEADER=>$headers,
        CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,
        CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
    $response=curl_exec($curl);
    $code=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);
    $error=curl_errno($curl);
    curl_close($curl);
    return [$code,is_string($response)?json_decode($response,true):null,$error];
}

function fcmAccessToken(string $project,string $path): string {
    $real=realpath($path);
    if(!$real || insideRepo($real) || !is_readable($real)) throw new Failure('FCM_CREDENTIAL_FILE');
    $account=json_decode(file_get_contents($real),true,8,JSON_THROW_ON_ERROR);
    if(($account['type']??null)!=='service_account' || ($account['project_id']??null)!==$project
        || !is_string($account['client_email']??null) || !is_string($account['private_key']??null)) throw new Failure('FCM_CREDENTIAL_FILE');
    $encode=static fn(string $value)=>rtrim(strtr(base64_encode($value),'+/','-_'),'=');
    $now=time();
    $audience='https://oauth2.googleapis.com/token';
    $claims=['iss'=>$account['client_email'],'scope'=>'https://www.googleapis.com/auth/firebase.messaging',
        'aud'=>$audience,'iat'=>$now,'exp'=>$now+300];
    $unsigned=$encode('{"alg":"RS256","typ":"JWT"}').'.'.$encode(json_encode($claims,JSON_THROW_ON_ERROR));
    if(!@openssl_sign($unsigned,$signature,$account['private_key'],OPENSSL_ALGO_SHA256)) throw new Failure('FCM_SIGN');
    $form=http_build_query(['grant_type'=>'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion'=>$unsigned.'.'.$encode($signature)]);
    [$status,$data,$error]=fcmRequest($audience,$form,['Content-Type: application/x-www-form-urlencoded']);
    if($status!==200 || !is_string($data['access_token']??null)) throw new Failure('FCM_OAUTH_HTTP_'.$status.'_CURL_'.$error);
    return $data['access_token'];
}

function testPush(array $config,string $dir,string $device,string $attempt): string {
    $settings=$config['push']??[];
    $project=$settings['project_id']??'';
    if(!preg_match('/\A[a-z][a-z0-9-]{4,28}[a-z0-9]\z/',$project)
        || !is_string($settings['service_account_file']??null) || !getenv('MI_USITTEL_RUNTIME')) throw new Failure('FCM_CONFIGURATION');
    $key=hash('sha256',"test:$device:$attempt");
    $target=pushStore($dir,static function(array &$state) use ($config,$device,$key) {
        if(isset($state['attempts'][$key])) throw new Failure('FCM_DUPLICATE_'.$state['attempts'][$key]);
        $record=$state['devices'][$device]??null;
        if(!$record || !pushAllowed($config,$record['owner'],forTestSend:true) || $record['updated_at']<time()-2592000) throw new Failure('FCM_DEVICE_UNAVAILABLE');
        return $record;
    });
    $access=fcmAccessToken($project,$settings['service_account_file']);
    pushStore($dir,static function(array &$state) use ($device,$key,$target) {
        if(isset($state['attempts'][$key])) throw new Failure('FCM_DUPLICATE_'.$state['attempts'][$key]);
        if(($state['devices'][$device]??null)!==$target) throw new Failure('FCM_DEVICE_CHANGED');
        $state['attempts'][$key]='RESERVED';
    });
    return pushStore($dir,static function(array &$state) use ($project,$device,$key,$target,$access) {
        if(($state['devices'][$device]??null)!==$target) return $state['attempts'][$key]='DEVICE_CHANGED';
        $message=[
            'fid'=>$target['fid'],
            'notification'=>['title'=>'Mi USITTEL','body'=>'¡Las notificaciones ya están funcionando!'],
            'webpush'=>[
                'headers'=>['TTL'=>'60','Urgency'=>'high'],
                'notification'=>['tag'=>$key,'icon'=>'https://mi.usittel.com.ar/assets/pwa-icon-192.png'],
                'fcm_options'=>['link'=>'https://mi.usittel.com.ar/?notificacion=inicio#/inicio'],
            ],
        ];
        [$status,$result,$error]=fcmRequest('https://fcm.googleapis.com/v1/projects/'.$project.'/messages:send',
            json_encode(['message'=>$message],JSON_THROW_ON_ERROR),['Content-Type: application/json','Authorization: Bearer '.$access]);
        if($status===200 && is_string($result['name']??null)) return $state['attempts'][$key]='ACCEPTED';
        foreach($result['error']['details']??[] as $detail) {
            if(($detail['errorCode']??null)==='UNREGISTERED') unset($state['devices'][$device]);
        }
        return $state['attempts'][$key]='HTTP_'.$status.'_CURL_'.$error;
    });
}

try {
    if($argc!==3 || !preg_match('/\A[a-f0-9]{64}\z/',$argv[1]) || !preg_match('/\A[a-zA-Z0-9_-]{1,40}\z/',$argv[2])) {
        throw new Failure('USO: php send-push-test.php ID_DISPOSITIVO ID_INTENTO');
    }
    $status=testPush(config(),privateDir(),$argv[1],$argv[2]);
    fwrite($status==='ACCEPTED'?STDOUT:STDERR,$status.PHP_EOL);
    exit($status==='ACCEPTED'?0:1);
} catch(\Throwable $error) {
    fwrite(STDERR,($error instanceof Failure ? $error->kind : 'FCM_INTERNAL').PHP_EOL);
    exit(1);
}
