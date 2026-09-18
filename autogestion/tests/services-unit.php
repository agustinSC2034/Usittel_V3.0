<?php
declare(strict_types=1);
namespace MiUsittel;
if(getenv('MI_USITTEL_TEST')!=='1') exit(1);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Services.php';
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
echo $count;
