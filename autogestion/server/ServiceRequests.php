<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/ServiceFeatures.php';

const REQUEST_NAMES=['TV_SENSA'=>'TV Sensa','SENSA_PACK'=>'Pack Sensa','STB'=>'Set Top Box adicional','MESH'=>'Mejora de cobertura Wi-Fi','WIFI_HELP'=>'Ayuda con mi Wi-Fi'];
function ticketMapping(array $c,int $ida,string $type): array {
    $s=$c['tickets']??[];$m=$s['products'][$type]??null;
    if(($s['enabled']??false)!==true || ($s['lab_ida']??null)!==$ida || !isset(REQUEST_NAMES[$type]) || !is_array($m)) throw new Failure('TICKETS_DISABLED',409);
    foreach(['category','delegation','subject'] as $key)
        if(!is_string($m[$key]??null) || trim($m[$key])==='' || strlen($m[$key])>120 || preg_match('/[\x00-\x1f<>]/',$m[$key])) throw new Failure('TICKETS_CONFIGURATION');
    if($m['delegation']==='Creado como Resuelto' || !is_int($m['priority']??null) || $m['priority']<1 || $m['priority']>5
        || !is_array($m['states']??null) || !$m['states'] || !is_array($m['contracted_labels']??null) || !array_is_list($m['contracted_labels'])) throw new Failure('TICKETS_CONFIGURATION');
    foreach($m['states'] as $key=>$state) if(!is_string($key) || $key==='' || !in_array($state,['RECEIVED','PREPARING','READY','REJECTED'],true)) throw new Failure('TICKETS_CONFIGURATION');
    foreach($m['contracted_labels'] as $label) if(!is_string($label) || trim($label)==='' || strlen($label)>160) throw new Failure('TICKETS_CONFIGURATION');
    // An exact product mapping is needed to distinguish contracted from available.
    if($type!=='WIFI_HELP' && !$m['contracted_labels']) throw new Failure('TICKETS_CONFIGURATION');
    foreach($s['products'] as $other=>$mapping) if($other!==$type && ($mapping['category']??null)===$m['category']) throw new Failure('TICKETS_CONFIGURATION');
    return $m;
}
function productContracted(?array $products,array $mapping): bool {
    foreach($products??[] as $product) if(in_array(preg_replace('/ × [1-9][0-9]?$/u','',$product),$mapping['contracted_labels'],true)) return true;
    return false;
}
function requestOptions(array $c,int $ida,?array $products): array {
    $options=[];
    foreach(REQUEST_NAMES as $type=>$name) {
        try {$m=ticketMapping($c,$ida,$type);$enabled=true;$contracted=productContracted($products,$m);}
        catch(Failure) {$enabled=false;$contracted=false;}
        $options[]=['type'=>$type,'name'=>$name,'enabled'=>$enabled&&!$contracted,'contracted'=>$contracted,'availabilityUnknown'=>$products===null];
    }
    return $options;
}

// Independent journal; same exclusive-lock + atomic-replacement pattern as payments.
final class ServiceRequestStore {
    public function __construct(private string $dir) {}
    public function transaction(callable $fn): mixed {
        return locked($this->dir.'/service-requests.lock',function() use($fn) {
            $path=$this->dir.'/service-requests.json';
            try {$s=is_file($path)?json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR):['version'=>1,'requests'=>[],'events'=>[]];}
            catch(\Throwable) {throw new Failure('REQUEST_STORAGE');}
            if(($s['version']??null)!==1 || !is_array($s['requests']??null) || !is_array($s['events']??null)) throw new Failure('REQUEST_STORAGE');
            foreach($s['requests'] as $key=>$r) if(!is_array($r) || ($r['id']??null)!==$key || !is_int($r['ida']??null) || !isset(REQUEST_NAMES[$r['type']??''])
                || !is_string($r['id']) || !preg_match('/^[a-f0-9]{32}$/D',$r['id']) || $r['ida']<1
                || !is_string($r['category']??null) || !is_string($r['createdAt']??null) || !array_key_exists('ticket',$r)
                || ($r['ticket']!==null && (!is_string($r['ticket']) || !preg_match('/^[1-9][0-9]{0,9}$/D',$r['ticket'])))
                || !in_array($r['state']??null,['SUBMITTING','UNKNOWN','RECEIVED','PREPARING','READY','REJECTED'],true)) throw new Failure('REQUEST_STORAGE');
            $save=function() use(&$s,$path) {
                $temp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';$h=null;
                try {$json=json_encode($s,JSON_THROW_ON_ERROR);$h=fopen($temp,'xb');
                    if(!$h || !chmod($temp,0600) || fwrite($h,$json)!==strlen($json) || !fflush($h) || !fsync($h)) throw new Failure('REQUEST_STORAGE');
                    fclose($h);$h=null;if(!rename($temp,$path)) throw new Failure('REQUEST_STORAGE');
                } finally {if(is_resource($h))fclose($h);if(is_file($temp))unlink($temp);}
            };
            return $fn($s,$save);
        });
    }
}
interface TicketGateway {
    public function open(int $ida): array;
    public function clear(int $ida): bool;
    public function detail(int $ida,string $ticket): array;
    public function create(int $ida,array $body): string;
}
final class PhantomTickets implements TicketGateway {
    public function __construct(private Phantom $ph,private array $c) {}
    private function rows(array $rows): array {
        if(!array_is_list($rows) || count($rows)>=500) throw new Failure('TICKETS_RESPONSE');
        foreach($rows as $r) if(!is_array($r) || array_is_list($r)) throw new Failure('TICKETS_RESPONSE');
        return $rows;
    }
    public function open(int $ida): array {
        $rows=[];
        foreach(['Abierto','Pendiente'] as $state) {
            $batch=$this->rows($this->ph->ticketRead($ida,'Tickets_Help_Desk',['Periodo'=>'01/01/1900-'.date('d/m/Y'),'Estado'=>$state]));
            foreach($batch as $r) if(($r['Estado']??null)!==$state) throw new Failure('TICKETS_RESPONSE');
            $rows=array_merge($rows,$batch);
        }
        return $rows;
    }
    public function clear(int $ida): bool {
        $expected=$this->c['tickets']['clear_response']??null;
        // The wiki does not specify the no-ticket shape. Require an operator-confirmed pair.
        if(!is_array($expected) || array_keys($expected)!==['IDTT','Permitir'] || !in_array($expected['IDTT'],[null,0,'0',''],true)
            || !in_array($expected['Permitir'],[0,1,'0','1'],true)) throw new Failure('TICKETS_CONFIGURATION');
        $r=$this->ph->ticketRead($ida,'Phantom_Consultar_Estado_TT');
        if(array_is_list($r) || !array_key_exists('IDTT',$r) || !array_key_exists('Permitir',$r)) throw new Failure('TICKETS_RESPONSE');
        return $r['IDTT']===$expected['IDTT'] && $r['Permitir']===$expected['Permitir'];
    }
    public function detail(int $ida,string $ticket): array {
        $rows=$this->rows($this->ph->ticketRead($ida,'Tickets_Help_Desk',['IDTT'=>$ticket]));
        if(count($rows)!==1) throw new Failure('TICKETS_RESPONSE');
        return $rows[0];
    }
    public function create(int $ida,array $body): string {return $this->ph->createTicket($ida,$body);}
}
function ticketIdentity(array $row,int $ida,?string $ticket=null): string {
    $id=$row['ID']??null;
    if(!(is_int($id)||is_string($id)) || !preg_match('/^[1-9][0-9]{0,9}$/D',(string)$id)
        || !in_array($row['IDA']??null,[$ida,(string)$ida],true) || ($ticket!==null && (string)$id!==$ticket)
        || !is_string($row['Categoria']??null) || !is_string($row['Estado']??null)) throw new Failure('TICKET_OWNERSHIP',403);
    return (string)$id;
}
function requestPublic(array $r): array {
    return ['id'=>$r['id'],'type'=>$r['type'],'name'=>REQUEST_NAMES[$r['type']],'state'=>$r['state'],
        'createdAt'=>$r['createdAt'],'checkedAt'=>$r['checkedAt']??null];
}
interface NotificationAdapter {public function send(array $event): void;}
// No customer address, Botmaker identity or credentials are guessed here.
final class EmailNotificationAdapter implements NotificationAdapter {public function send(array $event): void {throw new Failure('NOTIFICATIONS_DISABLED');}}
final class BotmakerNotificationAdapter implements NotificationAdapter {public function send(array $event): void {throw new Failure('NOTIFICATIONS_DISABLED');}}
final class NotificationService {
    public static function record(array &$s,array $r,string $event): void {
        $key=$r['ida'].':'.$r['ticket'].':'.$event;
        $s['events'][$key]??=['event'=>$event,'request'=>$r['id'],'ida'=>$r['ida'],'at'=>gmdate('c'),'delivery'=>'DISABLED'];
    }
    public static function deliver(ServiceRequestStore $store,NotificationAdapter $adapter,string $channel,bool $enabled=false): void {
        if(!$enabled)return;
        if(!in_array($channel,['email','botmaker'],true)) throw new Failure('NOTIFICATIONS_DISABLED');
        $store->transaction(function(&$s,$save) use($adapter,$channel) {
            foreach($s['events'] as &$event) {
                if(isset($event['deliveries'][$channel])) continue;
                $event['deliveries'][$channel]='SENDING';$save();
                try {$adapter->send(array_intersect_key($event,array_flip(['event','request','ida','at'])));$event['deliveries'][$channel]='SENT';}
                catch(\Throwable) {$event['deliveries'][$channel]='UNKNOWN';}
                $save(); // No retry after a possible delivery, including process interruption.
            }
            unset($event);
        });
    }
}
final class ServiceRequests {
    public function __construct(private ServiceRequestStore $store,private TicketGateway $gateway,private array $c) {}
    public function list(int $ida): array {
        return $this->store->transaction(fn(&$s)=>array_map(__NAMESPACE__.'\\requestPublic',array_values(array_reverse(array_filter($s['requests'],fn($r)=>$r['ida']===$ida)))));
    }
    public function create(int $ida,string $type,string $nonce,callable $products): array {
        $m=ticketMapping($this->c,$ida,$type);
        if(!preg_match('/^[a-f0-9]{32}$/D',$nonce)) throw new Failure('BAD_REQUEST',400);
        return $this->store->transaction(function(&$s,$save) use($ida,$type,$nonce,$products,$m) {
            if(isset($s['requests'][$nonce])) {
                $r=$s['requests'][$nonce];if($r['ida']!==$ida || $r['type']!==$type) throw new Failure('FORBIDDEN',403);
                return requestPublic($r);
            }
            foreach($s['requests'] as $r) if($r['ida']===$ida && $r['type']===$type && !in_array($r['state'],['READY','REJECTED'],true)) return requestPublic($r);
            if(count($s['requests'])>=1000) throw new Failure('REQUEST_STORAGE');
            $known=$products();if($type!=='WIFI_HELP' && productContracted($known,$m)) throw new Failure('ALREADY_CONTRACTED',409);
            $ticket=null;$remote=null;
            foreach($this->gateway->open($ida) as $row) {
                $id=ticketIdentity($row,$ida);
                if($row['Categoria']===$m['category']) {if($ticket!==null) throw new Failure('TICKETS_REVIEW',409);$ticket=$id;$remote=$row;}
            }
            if($ticket===null && !$this->gateway->clear($ida)) throw new Failure('TICKETS_REVIEW',409);
            $r=['id'=>$nonce,'ida'=>$ida,'type'=>$type,'category'=>$m['category'],'ticket'=>$ticket,'state'=>'SUBMITTING','createdAt'=>gmdate('c'),'checkedAt'=>null];
            $s['requests'][$nonce]=$r;$save(); // durable BEFORE the single creation call
            if($ticket===null) {
                try {
                    $ticket=$this->gateway->create($ida,['Categoria'=>$m['category'],'Delegacion'=>$m['delegation'],'Prioridad'=>$m['priority'],'Asunto'=>$m['subject'],
                        'Detalle'=>$type==='WIFI_HELP'?'El cliente solicita asistencia para cambio de configuración Wi-Fi desde Mi USITTEL.':
                        ($known===null?'Consulta de disponibilidad: ':'Solicitud comercial: ').REQUEST_NAMES[$type].'. Confirmar precio y condiciones con el cliente antes de contratar.']);
                    if(!preg_match('/^[1-9][0-9]{0,9}$/D',$ticket)) throw new Failure('TICKETS_RESPONSE');
                    $r['ticket']=$ticket;$s['requests'][$nonce]=$r;$save();
                    $remote=$this->gateway->detail($ida,$ticket);
                } catch(\Throwable) {$r['state']='UNKNOWN';$s['requests'][$nonce]=$r;$save();return requestPublic($r);}
            }
            try {$this->applyRemote($s,$r,$remote,$m);}
            catch(\Throwable) {$r['state']='UNKNOWN';}
            $s['requests'][$nonce]=$r;$save();return requestPublic($r);
        });
    }
    private function applyRemote(array &$s,array &$r,array $row,array $m): void {
        ticketIdentity($row,$r['ida'],$r['ticket']);
        if($row['Categoria']!==$r['category'] || $m['category']!==$r['category']) throw new Failure('TICKET_OWNERSHIP',403);
        $r['state']=$m['states'][$row['Estado']]??'UNKNOWN';$r['checkedAt']=gmdate('c');
        if($r['state']!=='UNKNOWN') NotificationService::record($s,$r,'TicketCreated');
        if($r['state']==='READY') NotificationService::record($s,$r,'TicketReady');
        if($r['state']==='REJECTED') NotificationService::record($s,$r,'TicketRejected');
    }
    public function refresh(int $ida,string $nonce): array {
        return $this->store->transaction(function(&$s,$save) use($ida,$nonce) {
            $r=$s['requests'][$nonce]??null;if(!$r || $r['ida']!==$ida) throw new Failure('FORBIDDEN',403);
            $m=ticketMapping($this->c,$ida,$r['type']);
            if($r['ticket']===null) throw new Failure('TICKETS_REVIEW',409); // unknown creation is NEVER replayed
            $this->applyRemote($s,$r,$this->gateway->detail($ida,$r['ticket']),$m);
            $s['requests'][$nonce]=$r;$save();return requestPublic($r);
        });
    }
}
