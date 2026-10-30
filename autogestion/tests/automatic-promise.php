<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';
require __DIR__.'/../server/Phantom.php';
require __DIR__.'/PaymentFixture.php';
function demandPromise(bool $ok): void {if(!$ok) throw new \RuntimeException('Automatic promise assertion failed');}
$dir=sys_get_temp_dir().'/promise-'.bin2hex(random_bytes(8));mkdir($dir);
$settings=['return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70099];
$invoice=fn()=>['IDT'=>'123','IDA'=>'1','Estado'=>'IMPAGA','Total'=>'121.00','SIRO_CE'=>str_repeat('1',19)];
foreach(['confirmed','pending','rejected','amount-mismatch','query-timeout','client-mismatch','reference-mismatch','ambiguous'] as $scenario) {
    foreach([false,true] as $failPromise) {
        $path=$dir.'/'.bin2hex(random_bytes(5));mkdir($path);$store=new PaymentStore($path);$bank=new PaymentFixture();$calls=0;
        $payments=new Payments($store,$bank,$settings,function($ida,$idt)use(&$calls,$failPromise){$calls++;demandPromise($ida===1 && $idt==='123');if($failPromise)throw new Failure('PHANTOM_TIMEOUT');return 'CREATED';});
        $a=$payments->create(1,'123',$invoice);$bank->scenario=$scenario;
        for($i=0;$i<3;$i++)$r=$payments->reconcile(1,$a['attempt_id'],true);
        demandPromise($calls===($scenario==='confirmed'?1:0));
        if($scenario==='confirmed') {
            demandPromise($r['state']==='CONFIRMED' && $r['phantom_payment_posted']===false);
            $stored=$store->transaction(fn(&$s)=>$s['attempts'][$a['attempt_id']]);
            demandPromise($stored['auto_promise']['state']===($failPromise?'REVIEW_REQUIRED':'CREATED'));
            demandPromise(!isset($r['auto_promise']));
        }
    }
}
// Legacy attempts cannot acquire a promise merely by being revisited.
$path=$dir.'/legacy';mkdir($path);$store=new PaymentStore($path);$bank=new PaymentFixture();
$old=new Payments($store,$bank,$settings);$a=$old->create(1,'123',$invoice);$bank->scenario='confirmed';$calls=0;
$new=new Payments($store,$bank,$settings,function()use(&$calls){$calls++;return 'CREATED';});
$new->reconcile(1,$a['attempt_id'],true);demandPromise($calls===0);
// A durable in-flight marker survives a process restart without a second write.
$path=$dir.'/interrupted';mkdir($path);$store=new PaymentStore($path);$bank=new PaymentFixture();$calls=0;
$payments=new Payments($store,$bank,$settings,function()use(&$calls){$calls++;return 'CREATED';});
$a=$payments->create(1,'123',$invoice);
$store->transaction(function(&$s,$save)use($a){$s['attempts'][$a['attempt_id']]['state']='CONFIRMED';$s['attempts'][$a['attempt_id']]['auto_promise']=['state'=>'REQUESTING','requested_at'=>gmdate('c')];$save();});
$payments->reconcile(1,$a['attempt_id'],true);demandPromise($calls===0);
echo "Automatic promise scenarios passed (17 scenarios, repeated confirmations and failure isolation).\n";
// Exercise the real Phantom method with a local transport, never a live contract.
$wire=new class implements Transport {
    public string $status='Suspendido';public string $invoice='IMPAGA';public int $writes=0;public mixed $active=0;public array $reply=['code'=>200,'message'=>'Promesa-PrepagoExito'];
    public function authenticate(string $url,array $credentials): array {return ['token'=>'fixture'];}
    public function post(string $url,array $body): array {
        parse_str(parse_url($url,PHP_URL_QUERY),$q);
        if($q['action']==='Consulta_Cliente_Avanzada')return [['ID'=>'1','Estado_Servicio'=>$this->status,'Promesa_Activa'=>$this->active]];
        if($q['action']==='Phantom_Ultima_Factura')return [['IDT'=>'123','IDA'=>'1','Estado'=>$this->invoice]];
        demandPromise($q['action']==='Generar_Promesa_Pago' && $q['IDA']==='1' && $q['horas']==='72' && $body===['token'=>'fixture']);
        $this->writes++;return $this->reply;
    }
};
$ph=new Phantom(['phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture','api_pass'=>'fixture','customer_id_field'=>'ID'],$dir,$wire);$ph->scope([1]);
foreach(['Activo','Baja','Pendiente',''] as $status){$wire->status=$status;demandPromise($ph->confirmedPaymentPromise(1,'123')==='NOT_SUSPENDED');}
demandPromise($wire->writes===0);$wire->status='Suspendido';$wire->invoice='PAGADA';
demandPromise($ph->confirmedPaymentPromise(1,'123')==='ALREADY_SETTLED' && $wire->writes===0);
$wire->invoice='IMPAGA';demandPromise($ph->confirmedPaymentPromise(1,'123')==='CREATED' && $wire->writes===1);
$wire->reply=['code'=>400,'message'=>'Error: limite'];
try{$ph->confirmedPaymentPromise(1,'123');throw new \RuntimeException('Expected rejection');}catch(Failure $e){demandPromise($e->kind==='PHANTOM_FUNCTIONAL' && $wire->writes===2);}
try{$ph->confirmedPaymentPromise(2,'123');throw new \RuntimeException('Expected scope rejection');}catch(Failure $e){demandPromise($e->kind==='FORBIDDEN' && $wire->writes===2);}
echo "Phantom promise transport: active/baja/paid excluded, 72 hours, functional rejection, exact contract isolation passed.\n";
foreach([1,'1',true] as $active){$wire->active=$active;$profile=$ph->profile(1);demandPromise($profile['serviceStatus']==='Activo' && $profile['serviceRestoring']===true);demandPromise($ph->confirmedPaymentPromise(1,'123')==='CREATED' && $wire->writes===2);}
foreach([0,'0',null,'false','yes'] as $active){$wire->active=$active;$profile=$ph->profile(1);demandPromise($profile['serviceStatus']==='Suspendido' && $profile['serviceRestoring']===false);}
echo "Live promise mapping and no repeated native write passed.\n";
