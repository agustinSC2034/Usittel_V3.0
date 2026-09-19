<?php
declare(strict_types=1);
namespace MiUsittel;
if(getenv('MI_USITTEL_TEST')!=='1') exit(1);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Services.php';
require __DIR__.'/../server/ServiceDiagnostics.php';
$count=0;
function expect(bool $ok): void {global $count;if(!$ok)throw new \RuntimeException('service assertion');$count++;}
expect(serviceCandidates([])===[]);
expect(serviceCandidates(['Conexiones_Asociadas'=>[['ID'=>'9'],[['ID'=>'3']],['ID'=>'9']]])===[9,3]);
// Document candidates, even exact duplicates, are not an authorization source.
foreach([['Documento'=>'fixture-doc','results'=>[['ID'=>'3'],['ID'=>'3']]],['DNI'=>'fixture-doc','Cuit'=>'other-fixture-doc','results'=>[['ID'=>'3'],['ID'=>'4']]]] as $root) expect(serviceCandidates($root)===[]);
foreach([['IDAx'=>'3'],['ID'=>3],['ID'=>'3x'],['ID'=>''],['ID'=>'0']] as $entry) {
    try {serviceCandidates(['Conexiones_Asociadas'=>[$entry]]);throw new \RuntimeException('accepted');}
    catch(Failure $e) {expect($e->kind==='SERVICES_SCHEMA');}
}
$_SESSION=['authenticated_ida'=>9,'selected_ida'=>88,'authorized_services'=>[['id'=>'3'],['id'=>'9']],'service_revision'=>'old','invoice_history'=>['private'=>'old']];
$s=serviceSession();expect($s['selectedServiceId']==='9');expect(!isset($_SESSION['invoice_history']));expect($s['serviceRevision']!=='old');
$_SESSION['authorized_services']=[['id'=>'3']];
try {serviceSession();throw new \RuntimeException('lost root accepted');}catch(Failure $e){expect($e->http===401);}
$_SESSION=[];expect(serviceSession()['services']===[]);
foreach([null,'fixture-private-value',7,[['ID'=>7,'secret-private-key'=>'fixture-private-value']],[['ID'=>'fixture-private-value']],[[['IDAx'=>'fixture-private-value']]]] as $value) {
    $d=serviceRootDiagnostics(['Conexiones_Asociadas'=>$value,'DNI'=>'fixture-private-value','Autogestion_Pass'=>'fixture-private-value']);
    expect(!str_contains(json_encode($d),'fixture-private-value') && !str_contains(json_encode($d),'secret-private-key') && !str_contains(json_encode($d),'Autogestion'));
}
$d=serviceRootDiagnostics(['Conexiones_Asociadas'=>[['ID'=>7]]]);expect($d['association']['shape']['sample'][0]['fields']['ID']['type']==='int');
$d=serviceRootDiagnostics([]);expect($d['association']===['present'=>false,'type'=>'absent']);
expect(count(serviceAssociationShape(array_fill(0,100,['ID'=>'1']))['sample'])===3);
$shape=serviceAssociationShape(['123','[{"ID":"5"}]','private;value']);
expect($shape['sample'][0]['decimal_id']===true && $shape['sample'][0]['length_bucket']==='1-10');
expect($shape['sample'][1]['looks_like_json']===true && $shape['sample'][1]['decoded']['structure']==='list');
expect($shape['sample'][2]['separator']==='semicolon' && !str_contains(json_encode($shape),'private'));
expect(normalizedIdentityDocument('20-12345678-6')==='20123456786');
expect(normalizedIdentityDocument('private')===null && normalizedIdentityDocument('12/34')===null);
expect(validCuit('20123456786') && documentKind('20123456786')==='personal_cuit');
expect(documentsEquivalent('12345678','20123456786'));
expect(!documentsEquivalent('12345678','30123456780'));
$documentReport=documentSearchDiagnostics([
    ['ID'=>'1','Cuit'=>'20-12345678-6','Direccion'=>'Uno'],
    ['ID'=>'5','DNI'=>'12345678','Producto_Internet'=>'Plan'],
],'20123456786');
expect($documentReport['records']===2 && $documentReport['unique_ids']===2 && $documentReport['document_matches']===2 && !$documentReport['ambiguous']);
$ambiguous=documentSearchDiagnostics([['ID'=>'1','Cuit'=>'20-12345678-6'],['ID'=>'1','Cuit'=>'private']], '20123456786');
expect($ambiguous['ambiguous'] && !str_contains(json_encode($ambiguous),'private'));
require __DIR__.'/../server/Phantom.php';require __DIR__.'/FixtureTransport.php';
$dir=privateDir().'/service-diagnostic-fixtures';mkdir($dir);$c=config();
foreach(['services-bad'=>'association_structure','services-wrong'=>'associated_customer','services-two'=>null] as $scenario=>$expected) {
    file_put_contents($dir.'/scenario',$scenario);$stages=[];
    $ph=new Phantom($c,$dir,new FixtureTransport($dir));
    $result=discoverServices($ph,1,static function($stage,$data) use (&$stages) {$stages[]=$stage;});
    expect($expected===null ? $stages===['root'] && count($result['services'])===2 : $stages===['root',$expected] && $result['servicesUnavailable']);
}
echo $count;
