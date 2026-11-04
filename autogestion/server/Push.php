<?php
declare(strict_types=1);
namespace MiUsittel;

function pushAllowed(array $config, int $owner, bool $forTestSend=false): bool {
    $pilot=$config['push']['pilot_owners']??null;
    return $owner>0 && $config['mode']==='phantom' && getenv('MI_USITTEL_RUNTIME')
        && ($config['push']['enabled']??false)===true
        && ((!$forTestSend && ($config['push']['registration_open']??false)===true)
            || (is_array($pilot) && in_array($owner,$pilot,true)));
}

function pushDeviceKey(): ?string {
    $secret=$_COOKIE['MIUSITTEL_PUSH']??null;
    return is_string($secret) && preg_match('/\A[a-f0-9]{64}\z/',$secret) ? hash('sha256',$secret) : null;
}

function pushStore(string $dir, callable $operation): mixed {
    return locked($dir.'/push.lock',static function() use ($dir,$operation) {
        $path=$dir.'/push.json';
        $state=is_file($path) ? json_decode(file_get_contents($path),true,16,JSON_THROW_ON_ERROR) : ['devices'=>[],'attempts'=>[]];
        $before=$state;
        $result=$operation($state);
        if($before!==$state) {
            $tmp=tempnam($dir,'push-');
            if($tmp===false) throw new Failure('PRIVATE_STORAGE');
            try {
                chmod($tmp,0600);
                $json=json_encode($state,JSON_THROW_ON_ERROR);
                if(file_put_contents($tmp,$json)!==strlen($json) || !rename($tmp,$path)) throw new Failure('PRIVATE_STORAGE');
            } finally { if(is_file($tmp)) unlink($tmp); }
        }
        return $result;
    });
}

function pushDetach(string $dir, ?int $newOwner=null): void {
    $key=pushDeviceKey();
    if($key===null || !is_file($dir.'/push.json')) return;
    pushStore($dir,static function(array &$state) use ($key,$newOwner) {
        if(($state['devices'][$key]['owner']??null)!==$newOwner || $newOwner===null) unset($state['devices'][$key]);
    });
}

function pushEndpoint(array $config,string $dir,string $route): never {
    $owner=(int)($_SESSION['authenticated_ida']??0);
    if(!pushAllowed($config,$owner)) throw new Failure('PUSH_DISABLED',404);
    $key=pushDeviceKey();
    if($route==='push-status') {
        $device=$key===null ? null : pushStore($dir,static fn(array $state)=>$state['devices'][$key]??null);
        $active=($device['owner']??null)===$owner;
        jsonReply(['active'=>$active,'device'=>$active ? $key : null]);
    }
    $input=body();
    if($route==='push-remove') {
        if($input!==[]) throw new Failure('BAD_REQUEST',400);
        pushStore($dir,static function(array &$state) use ($key,$owner) {
            if(($state['devices'][$key]['owner']??null)===$owner) unset($state['devices'][$key]);
        });
        jsonReply(['ok'=>true]);
    }
    $fid=$input['fid']??null;
    $refresh=$input['refresh']??null;
    if(count($input)!==2 || !is_bool($refresh) || !is_string($fid)
        || !preg_match('/\A[A-Za-z0-9_-]{22}\z/',$fid)) throw new Failure('BAD_REQUEST',400);
    if($key===null) {
        if($refresh) throw new Failure('PUSH_DISABLED',409);
        $secret=bin2hex(random_bytes(32));
        $key=hash('sha256',$secret);
        setcookie('MIUSITTEL_PUSH',$secret,['expires'=>time()+31536000,'path'=>sessionCookiePath(),
            'secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off','httponly'=>true,'samesite'=>'Strict']);
    }
    $contracts=array_map('intval',array_column(serviceSession()['services'],'id'));
    pushStore($dir,static function(array &$state) use ($key,$owner,$fid,$contracts,$refresh) {
        $previous=$state['devices'][$key]??null;
        if(($refresh || $previous!==null) && ($previous['owner']??null)!==$owner) throw new Failure('PUSH_DISABLED',409);
        foreach($state['devices'] as $other=>$device) {
            if($other===$key || $device['fid']!==$fid) continue;
            if($device['owner']!==$owner) throw new Failure('PUSH_DISABLED',409);
            unset($state['devices'][$other]);
        }
        $now=time();
        $state['devices'][$key]=['owner'=>$owner,'contracts'=>$contracts,'fid'=>$fid,'permission'=>'granted',
            'preferences'=>['enabled'=>true],'registered_at'=>$previous['registered_at']??$now,'updated_at'=>$now];
    });
    jsonReply(['active'=>true,'device'=>$key]);
}
