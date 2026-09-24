<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';require __DIR__.'/../server/Wifi.php';require __DIR__.'/../server/InvoiceDocuments.php';
$count=0;
function verifyFeature(bool $ok): void {global $count;if(!$ok)throw new \RuntimeException('Feature assertion failed');$count++;}
final class ServiceCatalogTransport implements Transport {
    public function authenticate(string $url,array $credentials): array {return ['token'=>'fixture-token'];}
    public function post(string $url,array $body): array {return [['ID'=>'23','Nombre'=>'private-person','DNI'=>'private-dni','ONU_Modelo'=>'Fixture-ONU','Productos_Television'=>'TV Sensa','Productos_Otros'=>[['Nombre'=>'Set top box','Cantidad'=>'2','Password'=>'private-secret']]]];}
}
$c=['service_product_fields'=>['Productos_Television']];
foreach(['Productos_Telefonia','Producto_Telefonia','Productos_Bonificaciones'] as $excluded) {
    verifyFeature(serviceProducts([$excluded=>'fixture-hidden'],['service_product_fields'=>[$excluded]])===null);
    verifyFeature(serviceProducts([$excluded=>[['Nombre'=>'fixture-hidden']]],['service_product_fields'=>[['field'=>$excluded,'label'=>'Nombre']]])===null);
}
$realFields=['service_product_fields'=>['Productos_Television','Productos_Otros']];
verifyFeature(serviceProducts(['Productos_Television'=>'TV Sensa','Productos_Otros'=>'Set top box','Productos_Telefonia'=>'fixture-hidden','Productos_Bonificaciones'=>'fixture-hidden'],$realFields)===['TV Sensa','Set top box']);
verifyFeature(serviceProducts(['Productos_Television'=>'','Productos_Otros'=>[]],$realFields)===[]);
verifyFeature(serviceProducts(['Productos_Television'=>''],$realFields)===null);
verifyFeature(serviceProducts(['Productos_Television'=>'TV Sensa'],[])===null);
verifyFeature(serviceProducts(['Productos_Television'=>'TV Sensa'],$c)===['TV Sensa']);
verifyFeature(serviceProducts(['Productos_Television'=>['TV Sensa','Pack Fútbol','TV Sensa']],$c)===['TV Sensa','Pack Fútbol']);
verifyFeature(serviceProducts(['Productos_Television'=>[]],$c)===[]);
verifyFeature(serviceProducts([],$c)===null);
foreach([['secret'=>'private'],[['name'=>'TV Sensa']],['TV Sensa',34],['private@example.com'],['<script>'],[str_repeat('x',161)]] as $value)verifyFeature(serviceProducts(['Productos_Television'=>$value],$c)===null);
verifyFeature(serviceProducts(['Autogestion_Pass'=>'test-private'],['service_product_fields'=>['Autogestion_Pass']])===null);
verifyFeature(serviceProducts(['Otros_Servicios'=>['Set top box'],'Adicionales'=>['TV Sensa']],['service_product_fields'=>['Otros_Servicios','Adicionales']])===['Set top box','TV Sensa']);
$mapped=['service_product_fields'=>[['field'=>'Otros_Servicios','label'=>'Nombre','quantity'=>'Cantidad']]];
verifyFeature(serviceProducts(['Otros_Servicios'=>[['Nombre'=>'Set top box','Cantidad'=>'2','Password'=>'fixture-do-not-expose']]],$mapped)===['Set top box × 2']);
verifyFeature(serviceProducts(['Otros_Servicios'=>[['Nombre'=>'Set top box','Cantidad'=>0]]],$mapped)===null);
verifyFeature(serviceProducts(['Otros_Servicios'=>[['Nombre'=>'Set top box','Cantidad'=>2]]],['service_product_fields'=>['Otros_Servicios']])===null);
$catalogConfig=['service_catalog'=>[
    'sensa'=>['type'=>'sensa','public_name'=>'Sensa','aliases'=>['TV Sensa']],
    'pack_hbo'=>['type'=>'sensa_pack','public_name'=>'Pack HBO','aliases'=>['HBO Exacto']],
    'stb'=>['type'=>'stb','public_name'=>'Set Top Box','aliases'=>['Set top box']],
    'mesh'=>['type'=>'mesh','public_name'=>'Wi-Fi Mesh','aliases'=>['Mesh Exacto']],
],'commercial_catalog'=>[
    ['id'=>'sensa','type'=>'sensa','public_name'=>'Sensa','description'=>'TV para todos tus dispositivos.','price_monthly'=>19999,'price_once'=>null,'currency'=>'ARS','requires'=>[],'excludes'=>['sensa'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
    ['id'=>'pack_hbo','type'=>'sensa_pack','public_name'=>'Pack HBO','description'=>'Canales premium y acceso a MAX.','price_monthly'=>8999,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>['pack_hbo'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
    ['id'=>'stb','type'=>'stb','public_name'=>'Set Top Box','description'=>'Convertí tu TV en Smart TV.','price_monthly'=>7750,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>['stb'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
    ['id'=>'mesh','type'=>'mesh','public_name'=>'Wi-Fi Mesh','description'=>'Mejorá la cobertura de tu hogar.','price_monthly'=>6999,'price_once'=>null,'currency'=>'ARS','requires'=>[],'excludes'=>['mesh'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
    ['id'=>'internet_500','type'=>'speed','public_name'=>'Internet 500 Mbps','description'=>'Más velocidad para tu conexión.','price_monthly'=>43999,'price_once'=>null,'currency'=>'ARS','requires'=>[],'excludes'=>[],'enabled'=>true,'current_plans'=>['Plan 300 exacto'=>300],'target_speed'=>500],
]];
verifyFeature(serviceProductState(null,$catalogConfig)===['known'=>false,'items'=>[],'ids'=>[]]);
verifyFeature(serviceProductState([],$catalogConfig)===['known'=>true,'items'=>[],'ids'=>[]]);
$state=serviceProductState(['TV Sensa','Set top box × 2','Producto desconocido','TV Sensa'],$catalogConfig);
verifyFeature($state['ids']===['sensa','stb'] && $state['items']===[['label'=>'Sensa','quantity'=>null],['label'=>'Set Top Box','quantity'=>2],['label'=>'Producto desconocido','quantity'=>null]]);
verifyFeature(serviceProductState(['Otro exacto × 1','Otro exacto × 3','Otro exacto × 3'],$catalogConfig)['items']===[['label'=>'Otro exacto','quantity'=>3]]);
verifyFeature(serviceProductState(['tv sensa'],$catalogConfig)['ids']===[]); // exact aliases only
verifyFeature(array_column(commercialOffers('Plan 300 exacto',null,$catalogConfig),'id')===['internet_500']);
verifyFeature(array_column(commercialOffers('Plan 300 exacto',[],$catalogConfig),'id')===['sensa','mesh','internet_500']);
verifyFeature(array_column(commercialOffers('Plan 300 exacto',['TV Sensa'],$catalogConfig),'id')===['pack_hbo','stb','mesh','internet_500']);
verifyFeature(array_column(commercialOffers('Plan 300 exacto',['TV Sensa','HBO Exacto','Set top box','Mesh Exacto'],$catalogConfig),'id')===['internet_500']);
verifyFeature(commercialOffers('Plan 500 exacto',[], $catalogConfig)[0]['id']==='sensa');
$noAliases=$catalogConfig;$noAliases['service_catalog']['mesh']['aliases']=[];
verifyFeature(!in_array('mesh',array_column(commercialOffers('Otro',['Producto desconocido'],$noAliases),'id'),true));
$labels=inspectPublicProductLabels(['Productos_Television'=>'TV Sensa','Productos_Otros'=>[['Nombre'=>'Set top box','Cantidad'=>'2','Password'=>'private']],'DNI'=>'private']);
verifyFeature($labels===[['field'=>'Productos_Television','label'=>'TV Sensa','quantity'=>null],['field'=>'Productos_Otros','label'=>'Set top box','quantity'=>2]] && !str_contains(json_encode($labels),'private'));
$inspectorConfig=['phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture','api_pass'=>'fixture','customer_id_field'=>'ID',
    'wifi'=>['enabled'=>true,'models'=>['Fixture-ONU'],'dual_band_models'=>['Fixture-ONU']]];
$inspectorRows=inspectServiceCatalogRows(new Phantom($inspectorConfig,sys_get_temp_dir(),new ServiceCatalogTransport()),$inspectorConfig,[23]);
verifyFeature($inspectorRows===[['ida'=>23,'model'=>'Fixture-ONU','dual_band_known'=>true,'wifi_eligible'=>true,'products'=>$labels]]);
verifyFeature(!preg_match('/private-person|private-dni|private-secret/',json_encode($inspectorRows)));
verifyFeature(!validWifiModelLists(['models'=>['Fixture-ONU'],'dual_band_models'=>['Other-ONU']]));
verifyFeature((new PhantomInvoiceDocuments(['mode'=>'phantom']))->available());
verifyFeature(!(new PhantomInvoiceDocuments(['mode'=>'demo']))->available());
$report=inspectServiceRecord(['Nombre'=>'fixture-person','Autogestion_Pass'=>'test-private','Otros_Servicios'=>[['Nombre'=>'fixture-product','Cantidad'=>2,'Password'=>'fixture-secret']],'Producto_Adicional'=>'fixture-extra']);
verifyFeature(isset($report['Producto_Adicional']));
verifyFeature(!preg_match('/fixture-|test-private|Password|Autogestion/',json_encode($report)));
verifyFeature(speedtestConfig([])===null);
verifyFeature(speedtestConfig(['speedtest_server'=>'https://speed.example.com/speedtest/backend/'])===['base'=>'https://speed.example.com/speedtest/backend/','origin'=>'https://speed.example.com']);
foreach(['http://speed.example.com/','https://127.0.0.1/','https://localhost/','https://speed.local/','https://user:pass@speed.example.com/','https://speed.example.com/?token=x','https://speed.example.com/#x','https://speed.example.com:8000/','https://speed.example.com/../'] as $url) {
    try {speedtestConfig(['speedtest_server'=>$url]);throw new \RuntimeException('Accepted bad URL');}catch(Failure $e){verifyFeature($e->kind==='SPEEDTEST_CONFIGURATION');}
}
$_SESSION=[];serviceReadLimit('feature-test');
try{serviceReadLimit('feature-test');throw new \RuntimeException('Accepted fast retry');}catch(Failure $e){verifyFeature($e->http===429);}
$_SESSION['feature-test']=time()-11;serviceReadLimit('feature-test');verifyFeature(true);
echo $count;
