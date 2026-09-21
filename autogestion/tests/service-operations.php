<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';require __DIR__.'/../server/ServiceRequests.php';require __DIR__.'/../server/PhantomSoap.php';require __DIR__.'/../server/Wifi.php';
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
        return match($method){'autentificar'=>$this->scenario==='auth'?'Error': 'fixture-token','consulta_abonado'=>['ID'=>8,'perfil'=>'fixture-only','Password'=>'never-output'], 'consulta_perfiles'=>['Nombre'=>'fixture-only','Down'=>400], 'desconectar'=>null};
    }
}
$soap=new TestSoap();$sc=['api_user'=>'fixture-api','api_pass'=>'fixture-api-secret','soap'=>['read_enabled'=>true,'lab_ida'=>8]];
rejectOp(fn()=>(new PhantomSoapClient($soap,[]))->inspect(8,[]),'SOAP_DISABLED');checkOp($soap->calls===[]);
rejectOp(fn()=>(new PhantomSoapClient($soap,$sc))->inspect(9,[]),'SOAP_DISABLED');
$result=(new PhantomSoapClient($soap,$sc))->inspect(8,['Fixture target']);
checkOp(array_column($soap->calls,0)===['autentificar','consulta_abonado','consulta_perfiles','desconectar']);
checkOp($soap->calls[1][1]===['token'=>'fixture-token','Id'=>8]);
checkOp(!preg_match('/fixture|never-output|Password|token/',json_encode($result)));
$soap=new TestSoap();$soap->scenario='auth';rejectOp(fn()=>(new PhantomSoapClient($soap,$sc))->inspect(8,[]),'SOAP_AUTH');checkOp(count($soap->calls)===1);
$soap=new TestSoap();$soap->scenario='timeout';rejectOp(fn()=>(new PhantomSoapClient($soap,$sc))->inspect(8,[]),'SOAP_TIMEOUT');checkOp(array_column($soap->calls,0)===['autentificar','consulta_abonado','desconectar']);
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
foreach(['modificar_abonado','modificar_perfiles','alta_abonado'] as $method)rejectOp(fn()=>$native->invoke($method,[]),'SOAP_METHOD_FORBIDDEN');
echo $count;
