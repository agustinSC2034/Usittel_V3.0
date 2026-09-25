<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';require __DIR__.'/../server/Wifi.php';require __DIR__.'/../server/InvoiceDocuments.php';
$count=0;
function verifyFeature(bool $ok): void {global $count;if(!$ok)throw new \RuntimeException('Feature assertion failed');$count++;}
final class ServiceCatalogTransport implements Transport {
    public function __construct(private ?array $record=null) {}
    public function authenticate(string $url,array $credentials): array {return ['token'=>'fixture-token'];}
    public function post(string $url,array $body): array {return [$this->record??['ID'=>'23','Nombre'=>'private-person','DNI'=>'private-dni','ONU_Modelo'=>'V5R022C00S408','ONU_SW'=>'EG8145X6-10','Productos_Television'=>'TV Sensa','Productos_Otros'=>[['Nombre'=>'Set top box','Cantidad'=>'2','Password'=>'private-secret']]]];}
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
verifyFeature($labels===[['field'=>'Productos_Television','category'=>null,'label'=>'TV Sensa','quantity'=>null],['field'=>'Productos_Otros','category'=>null,'label'=>'Set top box','quantity'=>2]] && !str_contains(json_encode($labels),'private'));
$inspectorConfig=['phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture','api_pass'=>'fixture','customer_id_field'=>'ID',
    'wifi'=>['enabled'=>true,'model_field'=>'ONU_SW','models'=>['EG8145X6-10'],'dual_band_models'=>[]]];
$inspectorRows=inspectServiceCatalogRows(new Phantom($inspectorConfig,sys_get_temp_dir(),new ServiceCatalogTransport()),$inspectorConfig,[23]);
verifyFeature($inspectorRows===[['ida'=>23,'chipset'=>'V5R022C00S408','model'=>'EG8145X6-10',
    'equipment_candidates'=>['ONU_SW'=>'EG8145X6-10'],'dual_band_known'=>false,'wifi_eligible'=>true,
    'products'=>$labels,'derived'=>['sensa'=>false]]]);
// Confirmed real Phantom strings: dated administrative category is metadata,
// not part of the public label. IPTV means SENSA, not a guessed pack alias.
$realRecord=['Productos_Television'=>'-','Productos_Otros'=>'1/3/26 - RES - 4 USITTEL MESH;1/3/26 - IPTV - Pack GOLF Channel;'];
$realEntries=serviceProductEntries($realRecord,$realFields);
verifyFeature($realEntries===[
    ['field'=>'Productos_Otros','category'=>'RES','label'=>'USITTEL MESH','quantity'=>4],
    ['field'=>'Productos_Otros','category'=>'IPTV','label'=>'Pack GOLF Channel','quantity'=>null],
]);
verifyFeature(serviceProducts($realRecord,$realFields)===['USITTEL MESH × 4','Pack GOLF Channel']);
verifyFeature(inspectPublicProductLabels($realRecord)===$realEntries);
$realInspector=inspectServiceCatalogRows(new Phantom($inspectorConfig,sys_get_temp_dir(),new ServiceCatalogTransport(['ID'=>'23','Nombre'=>'private-person','DNI'=>'private-dni']+$realRecord)),$inspectorConfig,[23]);
verifyFeature($realInspector[0]['products']===$realEntries && $realInspector[0]['derived']===['sensa'=>true] && !str_contains(json_encode($realInspector),'private-person'));
$profileConfig=$inspectorConfig+$realFields;
$profilePhantom=new Phantom($profileConfig,sys_get_temp_dir(),new ServiceCatalogTransport(['ID'=>'23','Nombre'=>'private-person','DNI'=>'private-dni']+$realRecord));
$profilePhantom->scope([23]);$profileDetails=$profilePhantom->profileWithServiceEntries(23);
verifyFeature($profileDetails['profile']['products']===['USITTEL MESH × 4','Pack GOLF Channel'] && $profileDetails['entries']===$realEntries && !isset($profileDetails['profile']['entries']));
$derived=serviceProductState(serviceProducts($realRecord,$realFields),$catalogConfig,$realEntries);
verifyFeature($derived['ids']===['sensa'] && $derived['items']===[['label'=>'Sensa','quantity'=>null],['label'=>'USITTEL MESH','quantity'=>4],['label'=>'Pack GOLF Channel','quantity'=>null]]);
$noSensaAlias=$catalogConfig;$noSensaAlias['service_catalog']['sensa']['aliases']=[];
$derivedOffers=array_column(commercialOffers('Otro',serviceProducts($realRecord,$realFields),$noSensaAlias,$realEntries),'id');
verifyFeature(!in_array('sensa',$derivedOffers,true) && in_array('pack_hbo',$derivedOffers,true) && in_array('stb',$derivedOffers,true));
$withMeshAlias=$noSensaAlias;$withMeshAlias['service_catalog']['mesh']['aliases']=['USITTEL MESH'];
verifyFeature(!in_array('mesh',array_column(commercialOffers('Otro',serviceProducts($realRecord,$realFields),$withMeshAlias,$realEntries),'id'),true));
$wifiPlus=['Productos_Television'=>'-','Productos_Otros'=>'15/3/24 - RES & COM ($) - WiFi +'];
verifyFeature(serviceProducts($wifiPlus,$realFields)===[] && serviceProductEntries($wifiPlus,$realFields)===[] && inspectPublicProductLabels($wifiPlus)===[]);
verifyFeature(serviceProductState([], $catalogConfig,serviceProductEntries($wifiPlus,$realFields))['ids']===[]);
verifyFeature(serviceProductState(['WiFi +'],$catalogConfig)['items']===[]);
verifyFeature(array_column(commercialOffers('Otro',['WiFi +'],$noSensaAlias),'id')===['sensa','mesh']);
$unknownPack=['Productos_Television'=>'-','Productos_Otros'=>'1/3/26 - IPTV - Pack Ejemplo Nuevo'];
$unknownEntries=serviceProductEntries($unknownPack,$realFields);
$unknownState=serviceProductState(serviceProducts($unknownPack,$realFields),$catalogConfig,$unknownEntries);
verifyFeature($unknownState['ids']===['sensa'] && $unknownState['items']===[['label'=>'Sensa','quantity'=>null],['label'=>'Pack Ejemplo Nuevo','quantity'=>null]]);
verifyFeature(!in_array('pack_hbo',$unknownState['ids'],true));
verifyFeature(serviceProducts(['Productos_Television'=>'-','Productos_Otros'=>'WiFi +'],$realFields)===[]);
foreach(['1/3/26 - iptv - Pack Ejemplo Nuevo','32/3/26 - IPTV - Pack Ejemplo Nuevo','1/3/26 - IPTV Pack Ejemplo Nuevo','1/3/26 - IPTV - Pack Ejemplo Nuevo;bad'] as $invalid) {
    $entries=serviceProductEntries(['Productos_Television'=>'-','Productos_Otros'=>$invalid],$realFields);
    verifyFeature($entries===null || !in_array('IPTV',array_column($entries,'category'),true));
}
verifyFeature(serviceProducts(['Productos_Television'=>'-','Productos_Otros'=>'Mesh 4'],$realFields)===['Mesh 4']);
$confirmedCatalog=$catalogConfig;
$confirmedCatalog['service_catalog']['pack_hbo']['aliases']=['HBO'];
$confirmedCatalog['service_catalog']['pack_futbol']['aliases']=['Pack Futbol'];
$confirmedCatalog['service_catalog']['pack_universal']['aliases']=['Universal+'];
$confirmedCatalog['service_catalog']['stb']['aliases']=['Set Top Box'];
$confirmedCatalog['service_catalog']['mesh']['aliases']=['USITTEL MESH'];
$exampleCatalog=serviceCatalog(require __DIR__.'/../server/config.example.php');
verifyFeature($exampleCatalog['pack_futbol']['aliases']===['Pack Futbol'] && $exampleCatalog['pack_hbo']['aliases']===['HBO']
    && $exampleCatalog['pack_universal']['aliases']===['Universal+'] && $exampleCatalog['stb']['aliases']===['Set Top Box']
    && $exampleCatalog['mesh']['aliases']===['USITTEL MESH'] && $exampleCatalog['sensa']['aliases']===[]);
foreach(['pack_futbol'=>['Pack Fútbol','Pack Futbol'],'pack_universal'=>['Universal+','Universal+']] as $id=>$definition) {
    $confirmedCatalog['service_catalog'][$id]=['type'=>'sensa_pack','public_name'=>$definition[0],'aliases'=>[$definition[1]]];
    $confirmedCatalog['commercial_catalog'][]=['id'=>$id,'type'=>'sensa_pack','public_name'=>$definition[0],'description'=>'Fixture comercial.',
        'price_monthly'=>1000,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>[$id],
        'enabled'=>true,'current_plans'=>[],'target_speed'=>null];
}
$parseRealProduct=static function(string $field,string $raw) use ($realFields,$confirmedCatalog): array {
    $record=['Productos_Television'=>'-','Productos_Otros'=>''];$record[$field]=$raw;
    $entries=serviceProductEntries($record,$realFields);
    $products=serviceProducts($record,$realFields);
    return [$entries,$products,serviceProductState($products,$confirmedCatalog,$entries),commercialOffers(null,$products,$confirmedCatalog,$entries)];
};
[$entries,$products,$state,$offers]=$parseRealProduct('Productos_Television','1/8/25 - IPTV - Abono Básico');
verifyFeature($products===[] && $state['items']===[['label'=>'Sensa','quantity'=>null]] && $state['ids']===['sensa']);
verifyFeature(!in_array('sensa',array_column($offers,'id'),true));
$confirmedPackCases=[
    'Pack Futbol'=>['Pack Fútbol','pack_futbol'],
    'HBO'=>['Pack HBO','pack_hbo'],
    'Universal+'=>['Universal+','pack_universal'],
];
foreach($confirmedPackCases as $raw=>$expected) {
    [$entries,$products,$state,$offers]=$parseRealProduct('Productos_Otros','1/4/25 - IPTV - '.$raw);
    verifyFeature($state['items']===[['label'=>'Sensa','quantity'=>null],['label'=>$expected[0],'quantity'=>null]] && in_array($expected[1],$state['ids'],true));
    verifyFeature(!in_array($expected[1],array_column($offers,'id'),true) && !in_array('sensa',array_column($offers,'id'),true));
}
foreach(['Hot Go Play','Pack GOLF Channel'] as $unknownIptvPack) {
    [$entries,$products,$state]=$parseRealProduct('Productos_Otros','1/4/25 - IPTV - '.$unknownIptvPack);
    verifyFeature($state['items']===[['label'=>'Sensa','quantity'=>null],['label'=>$unknownIptvPack,'quantity'=>null]] && $state['ids']===['sensa']);
}
foreach([1,2] as $quantity) {
    [$entries,$products,$state,$offers]=$parseRealProduct('Productos_Otros','1/4/25 - IPTV - '.$quantity.' Set Top Box');
    verifyFeature($products===['Set Top Box × '.$quantity] && $state['items']===[['label'=>'Sensa','quantity'=>null],['label'=>'Set Top Box','quantity'=>$quantity]]);
    verifyFeature(!in_array('stb',array_column($offers,'id'),true));
}
[$entries,$products,$state,$offers]=$parseRealProduct('Productos_Otros','1/3/26 - RES - 4 USITTEL MESH');
verifyFeature($entries===[['field'=>'Productos_Otros','category'=>'RES','label'=>'USITTEL MESH','quantity'=>4]] && $state['items']===[['label'=>'Wi-Fi Mesh','quantity'=>4]] && $state['ids']===['mesh']);
verifyFeature(!in_array('mesh',array_column($offers,'id'),true));
[$entries,$products,$state]=$parseRealProduct('Productos_Otros','15/6/24 - RES & COM ($) - WiFi +');
verifyFeature($products===[] && $entries===[] && $state['items']===[] && $state['ids']===[]);
[$entries,$products,$state]=$parseRealProduct('Productos_Otros','1/4/25 - Punto WiFi - ESTACIÓN TANDIL');
verifyFeature($products===['Punto WiFi - ESTACIÓN TANDIL'] && $state['items']===[['label'=>'Punto WiFi - ESTACIÓN TANDIL','quantity'=>null]] && $state['ids']===[]);
verifyFeature(!in_array('mesh',$state['ids'],true) && !in_array('sensa',$state['ids'],true) && !in_array('stb',$state['ids'],true));
$ida2505=['Productos_Television'=>'1/8/25 - IPTV - Abono Básico','Productos_Otros'=>'15/6/24 - RES & COM ($) - WiFi +;1/4/25 - IPTV - 1 Set Top Box;1/8/25 - IPTV - Pack Futbol'];
$ida2505Entries=serviceProductEntries($ida2505,$realFields);$ida2505Products=serviceProducts($ida2505,$realFields);
$ida2505State=serviceProductState($ida2505Products,$confirmedCatalog,$ida2505Entries);
$ida2505Offers=array_column(commercialOffers('Plan', $ida2505Products,$confirmedCatalog,$ida2505Entries),'id');
verifyFeature($ida2505Products===['Set Top Box × 1','Pack Futbol'] && $ida2505State['items']===[
    ['label'=>'Sensa','quantity'=>null],['label'=>'Set Top Box','quantity'=>1],['label'=>'Pack Fútbol','quantity'=>null],
]);
verifyFeature(!array_intersect($ida2505Offers,['sensa','pack_futbol','stb']) && count(array_intersect($ida2505Offers,['pack_hbo','pack_universal','mesh']))===3);
$ida4950=['Productos_Television'=>'-','Productos_Otros'=>'1/3/26 - RES - 4 USITTEL MESH;1/8/25 - IPTV - Pack GOLF Channel'];
$ida4950Entries=serviceProductEntries($ida4950,$realFields);$ida4950Products=serviceProducts($ida4950,$realFields);
$ida4950State=serviceProductState($ida4950Products,$confirmedCatalog,$ida4950Entries);
$ida4950Offers=array_column(commercialOffers('Plan', $ida4950Products,$confirmedCatalog,$ida4950Entries),'id');
verifyFeature($ida4950State['items']===[
    ['label'=>'Sensa','quantity'=>null],['label'=>'Wi-Fi Mesh','quantity'=>4],['label'=>'Pack GOLF Channel','quantity'=>null],
]);
verifyFeature(!array_intersect($ida4950Offers,['sensa','mesh']) && count(array_intersect($ida4950Offers,['pack_futbol','pack_hbo','pack_universal','stb']))===4);
verifyFeature(!preg_match('/private-person|private-dni|private-secret/',json_encode($inspectorRows)));
verifyFeature(!validWifiModelLists(['models'=>['Fixture-ONU'],'dual_band_models'=>['Other-ONU']]));
// ONU_SW is a fixture-only candidate name, not a confirmed Phantom production key.
$wifiCases=[
    ['V5R022C00S408','EG8145X6-10'],
    ['V5R020C10S214','HG8145V5'],
    ['V5R022C10S232','EG8041V5'],
];
foreach($wifiCases as [$chipset,$model]) {
    $record=['ONU_Modelo'=>$chipset,'ONU_SW'=>$model,'ONU_Firmware'=>'V5R022C10S232',
        'ONU_Password'=>'private-secret','DNI'=>'private-dni','Nombre'=>'private-person'];
    $configured=['wifi'=>['enabled'=>true,'model_field'=>'ONU_SW','models'=>[$model],'dual_band_models'=>[]]];
    verifyFeature(wifiChipset($record)===$chipset && wifiDeviceModel($record,$configured)===$model && wifiGate($configured,$model));
    verifyFeature(!wifiGate($configured,$chipset) && !wifiDualBand($configured,$model));
    verifyFeature(wifiDeviceModel($record,['wifi'=>['model_field'=>null]])==='');
    verifyFeature(wifiDeviceModel($record,['wifi'=>['model_field'=>'ONU_Modelo']])==='');
    verifyFeature(wifiDeviceModel($record,['wifi'=>['model_field'=>'ONU_Firmware']])==='');
    verifyFeature(wifiDeviceModel(['ONU_SW'=>$chipset],$configured)==='');
    verifyFeature(wifiDeviceModel(['ONU_SW'=>''],$configured)==='' && !wifiGate($configured,''));
    verifyFeature(!wifiGate($configured,$model.'-other') && !wifiGate($configured,strtolower($model)));
    verifyFeature(wifiEquipmentCandidates($record)===['ONU_SW'=>$model,'ONU_Firmware'=>'V5R022C10S232']);
    verifyFeature(!str_contains(json_encode(wifiEquipmentCandidates($record)),'private'));
}
verifyFeature(!validWifiModelLists(['models'=>['EG8145X6-10'],'dual_band_models'=>['HG8145V5']]));
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
