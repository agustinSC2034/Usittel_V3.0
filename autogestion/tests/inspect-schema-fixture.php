<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';
require __DIR__.'/../server/Phantom.php';
require __DIR__.'/../server/Inspector.php';
require __DIR__.'/FixtureTransport.php';
$config=\MiUsittel\config();
$phantom=new \MiUsittel\Phantom($config,\MiUsittel\privateDir(),new \MiUsittel\FixtureTransport(\MiUsittel\privateDir()));
exit(\MiUsittel\runInspector($phantom,1));
