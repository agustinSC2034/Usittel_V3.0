<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';
$count=0;
function verifyFeature(bool $ok): void {global $count;if(!$ok)throw new \RuntimeException('Feature assertion failed');$count++;}
$c=['service_product_fields'=>['Productos_Television']];
verifyFeature(serviceProducts(['Productos_Television'=>'TV Sensa'],[])===null);
verifyFeature(serviceProducts(['Productos_Television'=>'TV Sensa'],$c)===['TV Sensa']);
verifyFeature(serviceProducts(['Productos_Television'=>['TV Sensa','Pack Fútbol','TV Sensa']],$c)===['TV Sensa','Pack Fútbol']);
verifyFeature(serviceProducts(['Productos_Television'=>[]],$c)===[]);
verifyFeature(serviceProducts([],$c)===null);
foreach([['secret'=>'private'],[['name'=>'TV Sensa']],['TV Sensa',34],['private@example.com'],['<script>'],[str_repeat('x',161)]] as $value)verifyFeature(serviceProducts(['Productos_Television'=>$value],$c)===null);
verifyFeature(serviceProducts(['Autogestion_Pass'=>'test-private'],['service_product_fields'=>['Autogestion_Pass']])===null);
verifyFeature(speedtestConfig([])===null);
verifyFeature(speedtestConfig(['speedtest_server'=>'https://speed.example.com/speedtest/backend/'])===['base'=>'https://speed.example.com/speedtest/backend/','origin'=>'https://speed.example.com']);
foreach(['http://speed.example.com/','https://127.0.0.1/','https://localhost/','https://speed.local/','https://user:pass@speed.example.com/','https://speed.example.com/?token=x','https://speed.example.com/#x','https://speed.example.com:8000/','https://speed.example.com/../'] as $url) {
    try {speedtestConfig(['speedtest_server'=>$url]);throw new \RuntimeException('Accepted bad URL');}catch(Failure $e){verifyFeature($e->kind==='SPEEDTEST_CONFIGURATION');}
}
$_SESSION=[];serviceReadLimit('feature-test');
try{serviceReadLimit('feature-test');throw new \RuntimeException('Accepted fast retry');}catch(Failure $e){verifyFeature($e->http===429);}
$_SESSION['feature-test']=time()-11;serviceReadLimit('feature-test');verifyFeature(true);
echo $count;
