<?php
declare(strict_types=1);
// CLI-only synthetic data; never included by the production router.
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(1);
require_once __DIR__.'/../server/Core.php';
require_once __DIR__.'/../server/Phantom.php';
require_once __DIR__.'/../server/CentralChat.php';
require_once __DIR__.'/FixtureTransport.php';
$input=json_decode(stream_get_contents(STDIN),true,16,JSON_THROW_ON_ERROR);
if($input['action']==='mint') {
    echo (new \MiUsittel\CentralAppEntry($input['bundle']))->mint($input['owner'],$input['name'],$input['now']);
} elseif($input['action']==='owner') {
    echo json_encode(\MiUsittel\centralChatOwner($input['session']));
} else {
    $_SESSION=$input['session'];
    $c=\MiUsittel\config();$dir=\MiUsittel\privateDir();
    $ph=new \MiUsittel\Phantom($c,$dir,new \MiUsittel\FixtureTransport($dir));
    echo json_encode(\MiUsittel\centralChatEntry($c,$ph),JSON_THROW_ON_ERROR);
}
