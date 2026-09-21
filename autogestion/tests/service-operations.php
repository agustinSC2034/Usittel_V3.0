<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';require __DIR__.'/../server/ServiceRequests.php';require __DIR__.'/../server/PhantomSoap.php';require __DIR__.'/../server/Wifi.php';
require __DIR__.'/../server/Inspector.php';
$count=0;
function checkOp(bool $ok): void {global $count;$count++;if(!$ok)throw new \RuntimeException('Operation check '.$count.' failed');}
function rejectOp(callable $fn,string $code): void {try {$fn();throw new \RuntimeException('Accepted '.$code);}catch(Failure $e){checkOp($e->kind===$code);}}
function operationConfig(): array {return ['tickets'=>['enabled'=>true,'lab_ida'=>8,'products'=>[
    'TV_SENSA'=>['category'=>'Fixture TV','delegation'=>'Fixture Sales','subject'=>'TV request','priority'=>2,'contracted_labels'=>['Fixture Sensa'],'states'=>['Abierto'=>'RECEIVED','Pendiente'=>'PREPARING','Resuelto'=>'READY','Rechazado'=>'REJECTED']],
    'WIFI_HELP'=>['category'=>'Fixture WiFi','delegation'=>'Fixture Help','subject'=>'WiFi help','priority'=>2,'contracted_labels'=>[],'states'=>['Abierto'=>'RECEIVED','Resuelto'=>'READY']]]]];}
final class TestTickets implements TicketGateway {
    public int $writes=0;public bool $timeout=false;public bool $clear=true;public array $opened=[];public array $sent=[];
    public array $row=['ID'=>'321','IDA'=>'8','Categoria'=>'Fixture TV','Estado'=>'Abierto'];
    public function open(int $ida): array {return $this->opened;}
    public function clear(int $ida): bool {return $this->clear;}
    public function detail(int $ida,string $ticket): array {return $this->row;}
    public function create(int $ida,array $body): string {$this->writes++;$this->sent=$body;if($this->timeout)throw new Failure('PHANTOM_TIMEOUT');return '321';}
}
$root=getenv('MI_USITTEL_RUNTIME');$case=0;
function newRequests(?array $config=null): array {global $root,$case;$dir=$root.'/operations-'.(++$case);mkdir($dir);$gateway=new TestTickets();return [new ServiceRequests(new ServiceRequestStore($dir),$gateway,$config??operationConfig()),$gateway,$dir];}
$c=operationConfig();
rejectOp(fn()=>ticketMapping([],8,'TV_SENSA'),'TICKETS_DISABLED');
rejectOp(fn()=>ticketMapping($c,9,'TV_SENSA'),'TICKETS_DISABLED');
rejectOp(fn()=>ticketMapping($c,8,'STB'),'TICKETS_DISABLED');
$bad=$c;$bad['tickets']['products']['TV_SENSA']['delegation']='Creado como Resuelto';rejectOp(fn()=>ticketMapping($bad,8,'TV_SENSA'),'TICKETS_CONFIGURATION');
$bad=$c;$bad['tickets']['products']['TV_SENSA']['contracted_labels']=[];rejectOp(fn()=>ticketMapping($bad,8,'TV_SENSA'),'TICKETS_CONFIGURATION');
$bad=$c;$bad['tickets']['products']['WIFI_HELP']['category']='Fixture TV';rejectOp(fn()=>ticketMapping($bad,8,'TV_SENSA'),'TICKETS_CONFIGURATION');
checkOp(productContracted(['Fixture Sensa × 2'],ticketMapping($c,8,'TV_SENSA')));
checkOp(requestOptions($c,8,null)[0]['availabilityUnknown']===true);
checkOp(requestOptions($c,8,[])[0]['availabilityUnknown']===false);
checkOp(requestOptions($c,8,['Fixture Sensa'])[0]['enabled']===false);
[$service,$gateway,$dir]=newRequests();$nonce=str_repeat('a',32);
$r=$service->create(8,'TV_SENSA',$nonce,fn()=>[]);checkOp($r['state']==='RECEIVED' && $gateway->writes===1);
checkOp(!preg_match('/321|Fixture TV|Delegacion|IDA|ticket/',json_encode($r)));
checkOp($service->create(8,'TV_SENSA',$nonce,fn()=>[])===$r && $gateway->writes===1);
checkOp($service->create(8,'TV_SENSA',str_repeat('b',32),fn()=>[])===$r && $gateway->writes===1);
checkOp($service->list(9)===[]);rejectOp(fn()=>$service->refresh(9,$nonce),'FORBIDDEN');
$gateway->row['Estado']='Pendiente';checkOp($service->refresh(8,$nonce)['state']==='PREPARING');
$gateway->row['Estado']='Resuelto';checkOp($service->refresh(8,$nonce)['state']==='READY');$service->refresh(8,$nonce);
$journal=json_decode(file_get_contents($dir.'/service-requests.json'),true);checkOp(count($journal['events'])===2);
checkOp(array_column($journal['events'],'event')===['TicketCreated','TicketReady']);
checkOp(array_unique(array_column($journal['events'],'delivery'))===['DISABLED']);
final class TestNotification implements NotificationAdapter {public int $count=0;public bool $fail=false;public function send(array $event): void {$this->count++;if($this->fail)throw new Failure('FIXTURE_TIMEOUT');}}
$adapter=new TestNotification();$store=new ServiceRequestStore($dir);
NotificationService::deliver($store,$adapter,'email');checkOp($adapter->count===0);
NotificationService::deliver($store,$adapter,'email',true);NotificationService::deliver($store,$adapter,'email',true);checkOp($adapter->count===2);
$adapter->fail=true;NotificationService::deliver($store,$adapter,'botmaker',true);NotificationService::deliver($store,$adapter,'botmaker',true);checkOp($adapter->count===4);
$notified=json_decode(file_get_contents($dir.'/service-requests.json'),true);
checkOp(array_column(array_column($notified['events'],'deliveries'),'email')===['SENT','SENT']);
checkOp(array_column(array_column($notified['events'],'deliveries'),'botmaker')===['UNKNOWN','UNKNOWN']);
$gateway->row['IDA']='9';rejectOp(fn()=>$service->refresh(8,$nonce),'TICKET_OWNERSHIP');
$gateway->row['IDA']='8';$gateway->row['ID']='322';rejectOp(fn()=>$service->refresh(8,$nonce),'TICKET_OWNERSHIP');
$gateway->row['ID']='321';$gateway->row['Categoria']='Foreign';rejectOp(fn()=>$service->refresh(8,$nonce),'TICKET_OWNERSHIP');
[$service,$gateway]=newRequests();rejectOp(fn()=>$service->create(8,'TV_SENSA',$nonce,fn()=>['Fixture Sensa']),'ALREADY_CONTRACTED');checkOp($gateway->writes===0);
[$service,$gateway]=newRequests();$gateway->opened=[$gateway->row];$r=$service->create(8,'TV_SENSA',$nonce,fn()=>[]);checkOp($r['state']==='RECEIVED'&&$gateway->writes===0);
[$service,$gateway]=newRequests();$gateway->opened=[$gateway->row,$gateway->row];rejectOp(fn()=>$service->create(8,'TV_SENSA',$nonce,fn()=>[]),'TICKETS_REVIEW');checkOp($gateway->writes===0);
[$service,$gateway]=newRequests();$gateway->opened=[array_replace($gateway->row,['IDA'=>'99'])];rejectOp(fn()=>$service->create(8,'TV_SENSA',$nonce,fn()=>[]),'TICKET_OWNERSHIP');checkOp($gateway->writes===0);
[$service,$gateway]=newRequests();$gateway->clear=false;rejectOp(fn()=>$service->create(8,'TV_SENSA',$nonce,fn()=>[]),'TICKETS_REVIEW');checkOp($gateway->writes===0);
[$service,$gateway,$dir]=newRequests();$gateway->timeout=true;$r=$service->create(8,'TV_SENSA',$nonce,fn()=>null);checkOp($r['state']==='UNKNOWN'&&$gateway->writes===1);
$service->create(8,'TV_SENSA',str_repeat('b',32),fn()=>null);checkOp($gateway->writes===1);rejectOp(fn()=>$service->refresh(8,$nonce),'TICKETS_REVIEW');
checkOp(str_starts_with($gateway->sent['Detalle'],'Consulta de disponibilidad:'));
$journal=json_decode(file_get_contents($dir.'/service-requests.json'),true);checkOp($journal['events']===[]);
[$service,$gateway]=newRequests();$gateway->row['IDA']='99';checkOp($service->create(8,'TV_SENSA',$nonce,fn()=>[])['state']==='UNKNOWN');checkOp($gateway->writes===1);
[$service,$gateway,$dir]=newRequests();$gateway->row['Categoria']='Fixture WiFi';$r=$service->create(8,'WIFI_HELP',$nonce,fn()=>null);checkOp($r['state']==='RECEIVED');
checkOp(array_keys($gateway->sent)===['Categoria','Delegacion','Prioridad','Asunto','Detalle']);
checkOp($gateway->sent['Detalle']==='El cliente solicita asistencia para cambio de configuración Wi-Fi desde Mi USITTEL.');
checkOp(!preg_match('/Password|SSID|password|TestWifi/',file_get_contents($dir.'/service-requests.json')));
[$service,$gateway,$dir]=newRequests();file_put_contents($dir.'/service-requests.json','broken');rejectOp(fn()=>$service->create(8,'TV_SENSA',$nonce,fn()=>[]),'REQUEST_STORAGE');checkOp($gateway->writes===0);

final class TestSoap implements SoapReadTransport {
    public array $calls=[];public string $scenario='ok';
    public function invoke(string $method,array $parameters): mixed {
        $this->calls[]=[$method,$parameters];
        if($this->scenario==='timeout' && $method==='consulta_abonado')throw new Failure('SOAP_TIMEOUT');
        return match($method){'autentificar'=>$this->scenario==='auth'?'Error': 'fixture-token','consulta_abonado'=>['ID'=>$this->scenario==='foreign'?9:8,'perfil'=>'fixture-only','Password'=>'never-output'], 'consulta_perfiles'=>$this->scenario==='unknown'?'fixture-unknown':['Nombre'=>$parameters['Nombre'],'Down'=>400], 'desconectar'=>null};
    }
}
$soap=new TestSoap();$sc=['api_user'=>'fixture-api','api_pass'=>'fixture-api-secret','soap'=>['read_enabled'=>true,'lab_ida'=>8]];
rejectOp(fn()=>(new PhantomSoapClient($soap,[]))->inspect(8,[]),'SOAP_DISABLED');checkOp($soap->calls===[]);
rejectOp(fn()=>(new PhantomSoapClient($soap,$sc))->inspect(9,[]),'SOAP_DISABLED');
$result=(new PhantomSoapClient($soap,$sc))->inspect(8,['Fixture target']);
checkOp(array_column($soap->calls,0)===['autentificar','consulta_abonado','consulta_perfiles','desconectar']);
checkOp($soap->calls[1][1]===['token'=>'fixture-token','Id'=>8]);
checkOp(!preg_match('/fixture|never-output|Password|token/',json_encode($result)));
checkOp($result['auth_status']==='SOAP_AUTH_OK' && $result['technical_profile_status']==='TECHNICAL_PROFILE_KNOWN' && $result['profile_lookup_status']==='PROFILE_LOOKUP_OK');
checkOp($result['subscriber_identity_status']==='SUBSCRIBER_IDENTITY_MATCH' && $result['subscriber_identity_matches']===true);
$soap=new TestSoap();$soap->scenario='foreign';$result=(new PhantomSoapClient($soap,$sc))->inspect(8,[]);
checkOp($result['technical_profile_status']==='TECHNICAL_PROFILE_UNKNOWN' && $result['profile_lookup_status']==='PROFILE_LOOKUP_NOT_REQUESTED');
checkOp($result['subscriber_identity_status']==='SUBSCRIBER_IDENTITY_UNCONFIRMED' && $result['subscriber_identity_matches']===false);
$soap=new TestSoap();$soap->scenario='unknown';$result=(new PhantomSoapClient($soap,$sc))->inspect(8,['Fixture target']);
checkOp($result['profile_lookup_status']==='PROFILE_LOOKUP_UNCONFIRMED');
$soap=new TestSoap();$soap->scenario='auth';rejectOp(fn()=>(new PhantomSoapClient($soap,$sc))->inspect(8,[]),'SOAP_AUTH');checkOp(count($soap->calls)===1);
$soap=new TestSoap();$soap->scenario='timeout';$partial=(new PhantomSoapClient($soap,$sc))->inspect(8,[]);
checkOp($partial['failure_code']==='SOAP_TIMEOUT' && $partial['auth_status']==='SOAP_AUTH_OK' && $partial['technical_profile_status']==='TECHNICAL_PROFILE_UNKNOWN');
checkOp(array_column($soap->calls,0)===['autentificar','consulta_abonado','desconectar']);
checkOp(upgradeCatalog([])===[]);
$p=['current'=>'Fixture 100','target'=>'Fixture 200','phantom_profile'=>'Fixture 200 technical','public_name'=>'Internet 200 Mbps','current_down'=>100,'current_up'=>100,'speed_down'=>200,'speed_up'=>200,'price_cents'=>10000];
checkOp(upgradeCatalog(['upgrade'=>['plans'=>['TEST'=>$p]]])===['TEST'=>$p]);
foreach([['speed_down'=>50],['speed_up'=>50],['speed_down'=>100,'speed_up'=>100],['target'=>'Fixture 100']] as $override)
    rejectOp(fn()=>upgradeCatalog(['upgrade'=>['plans'=>['TEST'=>array_replace($p,$override)]]]),'UPGRADE_NOT_UPWARD');
rejectOp(fn()=>upgradeCatalog(['upgrade'=>['plans'=>['free profile'=>$p]]]),'UPGRADE_CONFIGURATION');
rejectOp(fn()=>upgradeCatalog(['upgrade'=>['plans'=>['TEST'=>array_replace($p,['price_cents'=>1.1])]]]),'UPGRADE_CONFIGURATION');
$wifi=['requestId'=>str_repeat('d',32),'ssid'=>'Fixture24','ssid5'=>'Fixture_5G','password'=>'Fixture#123','accountPassword'=>'fixture-only','confirmed'=>true];
checkOp(wifiInput($wifi)===['SSID'=>'Fixture24','SSID_5G'=>'Fixture_5G','Password'=>'Fixture#123']);
checkOp(wifiInput(array_replace($wifi,['ssid5'=>'Fixture24']))['SSID_5G']==='Fixture24');
rejectOp(fn()=>wifiInput(array_replace($wifi,['ssid5'=>''])),'WIFI_INPUT');
checkOp(wifiInput(array_replace($wifi,['ssid5'=>'']),false)===['SSID'=>'Fixture24','Password'=>'Fixture#123']);
$native=(new \ReflectionClass(NativeSoapReadTransport::class))->newInstanceWithoutConstructor();
foreach(['modificar_abonado','modificar_perfiles','alta_abonado','suspender','eliminar_abonado','unknown'] as $method)rejectOp(fn()=>$native->invoke($method,[]),'SOAP_METHOD_FORBIDDEN');
$endpoint=['phantom_url'=>'https://fixture.example/PHANTOM/Includes/API_Rest.php','soap'=>['url'=>'https://fixture.example/PHANTOM/Includes/API.php']];
checkOp(soapReadEndpoint($endpoint)===$endpoint['soap']['url']);
foreach(['http://fixture.example/PHANTOM/Includes/API.php','https://foreign.example/PHANTOM/Includes/API.php','https://fixture.example:8443/PHANTOM/Includes/API.php','https://fixture.example/PHANTOM/Includes/API_Rest.php','https://fixture.example/PHANTOM/Includes/API.php?token=fixture','https://fixture.example/PHANTOM/Includes/API.php#fragment','https://user:pass@fixture.example/PHANTOM/Includes/API.php'] as $url) {
    $bad=$endpoint;$bad['soap']['url']=$url;rejectOp(fn()=>soapReadEndpoint($bad),'SOAP_CONFIGURATION');
}
checkOp(soapInspectionRecord('fixture-free-text')===null);
checkOp(soapInspectionRecord([['ID'=>8],['ID'=>9]])===null);
$shape=soapSafeShape(array_fill(0,90,'fixture-private'));
checkOp($shape['count']===90 && $shape['list'] && $shape['element_types']===['string'=>90]);
checkOp(!str_contains(json_encode($shape),'fixture-private'));
$soap=new class implements SoapReadTransport {
    public function invoke(string $method,array $parameters): mixed {return match($method) {
        'autentificar'=>'fixture-token','consulta_abonado'=>array_fill(0,90,'fixture-private'),'desconectar'=>null,
        default=>throw new Failure('FIXTURE_UNEXPECTED'),
    };}
};
$positional=(new PhantomSoapClient($soap,$sc))->inspect(8,[]);
checkOp($positional['subscriber_identity_status']==='SUBSCRIBER_IDENTITY_UNKNOWN_POSITIONAL');
checkOp($positional['subscriber_identity_matches']===null && $positional['technical_profile_status']==='TECHNICAL_PROFILE_UNKNOWN');
checkOp(!str_contains(json_encode($positional),'fixture-private'));
foreach([null,0,'0',''] as $empty) {
    $shape=ticketInspectionShape(['IDTT'=>$empty,'Permitir'=>'1','Detalle'=>'fixture-private'],'existence');
    checkOp($shape['no_ticket_id'] && $shape['id_type']===get_debug_type($empty) && $shape['permit_value']==='1');
    checkOp(!str_contains(json_encode($shape),'fixture-private'));
}
$shape=ticketInspectionShape([],'existence');checkOp(!$shape['id_present'] && !$shape['permit_present'] && !$shape['no_ticket_id']);
$shape=ticketInspectionShape(['IDTT'=>'321','Permitir'=>'fixture-private'],'existence');checkOp(!$shape['no_ticket_id'] && $shape['permit_value']===null);
$shape=ticketInspectionShape([['ID'=>'321','Estado'=>'Abierto','Categoria'=>'fixture-private','Delegacion'=>'fixture-private','Detalle'=>'fixture-private'],['Estado'=>'fixture-private']],'open');
checkOp($shape['ticket_count']===2 && $shape['states']===['Abierto'] && $shape['unknown_state_count']===1);
checkOp($shape['sample']['Delegacion']['present'] && !preg_match('/fixture-private|321/',json_encode($shape)));
checkOp(ticketInspectionShape(['message'=>'fixture-error'],'open')['ticket_count']===null);
checkOp(ticketInspectionShape([],'open')['ticket_count']===0);
$safe=safeTicketFailureShape(['code'=>400,'message'=>'fixture-private ticket 321','Detalle'=>'fixture-private']);
checkOp($safe['code_value']===400 && $safe['code_type']==='int' && $safe['message_present'] && $safe['message_type']==='string');
checkOp(!preg_match('/fixture-private|321|Detalle/',json_encode($safe)));
$safe=safeTicketFailureShape(['code'=>'500','message'=>['fixture-private']]);
checkOp($safe['code_value']==='500' && $safe['code_type']==='string' && $safe['message_type']==='array');
$safe=safeTicketFailureShape(['code'=>'private-code','message'=>'fixture-private']);
checkOp(!array_key_exists('code_value',$safe));
foreach([
    'No hay datos de retorno para la consulta'=>'NO_DATA',
    'No se ha definido correctamente parametro Periodo'=>'PERIOD_REQUIRED',
    'Periodo inválido (formato)'=>'PERIOD_INVALID_FORMAT',
    'Periodo inválido (inicio mayor que fin)'=>'PERIOD_INVERTED',
    'IDTT inválido'=>'IDTT_INVALID','IDA inválido'=>'IDA_INVALID',
] as $message=>$reason) checkOp(safeTicketFailureShape(['code'=>400,'message'=>$message])['documented_reason']===$reason);
checkOp(!array_key_exists('documented_reason',safeTicketFailureShape(['code'=>400,'message'=>'fixture-private'])));
echo $count;
