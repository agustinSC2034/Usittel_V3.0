<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require __DIR__.'/../server/Core.php';require __DIR__.'/../server/Phantom.php';require __DIR__.'/PaymentFixture.php';
$root=$argv[1];$count=0;
function ok(bool $value): void {if(!$value) throw new \RuntimeException('Payment fixture assertion failed');$GLOBALS['count']++;}
function failure(callable $fn,string $code): void {try {$fn();}catch(Failure $e){ok($e->kind===$code);return;}throw new \RuntimeException('Expected payment failure');}
function setup(): array {
    $dir=$GLOBALS['root'].'/payment-'.bin2hex(random_bytes(5));mkdir($dir);
    $s=['return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70004];
    $store=new PaymentStore($dir);$gateway=new PaymentFixture();
    return [new Payments($store,$gateway,$s),$store,$gateway,$dir];
}
function row(): array {return ['IDT'=>'123','IDA'=>'1','Estado'=>'IMPAGA','Total'=>'121.00','SIRO_CE'=>str_repeat('1',19)];}
function unlock(PaymentStore $store): void {$store->transaction(function(&$s,$save){foreach($s['attempts'] as &$a)$a['checked_at']=0;$save();});}
if(($argv[2]??null)==='worker') {
    $gateway=new class($root) implements SiroGateway {
        public function __construct(private string $dir){}
        public function create(array $request): array {file_put_contents($this->dir.'/calls','1',FILE_APPEND);usleep(200000);return ['Hash'=>str_repeat('a',64),'Url'=>siroCheckout(str_repeat('a',64))];}
        public function consult(array $a): array {return [];}
        public function result(string $h,string $i): array {return [];}
    };
    $p=new Payments(new PaymentStore($root),$gateway,['return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70001]);
    echo $p->create(1,'123',fn()=>row())['attempt_id'];exit;
}
// The POC uses local wall time with a literal Z, not UTC conversion.
ok(siroLabService(['lab_ida'=>1],[1],1));
ok(!siroLabService(['lab_ida'=>1],[1,5],1));
ok(!siroLabService(['lab_ida'=>1],[5],5));
ok(siroLabService(['lab_ida'=>5],[5],5));
ok(!siroLabService(['lab_ida'=>5],[1],5));
ok(!siroLabService(null,[1],1));
$validConfig=['mode'=>'phantom','siro'=>['enabled'=>true,'user'=>'fixture-user','password'=>'fixture-password','return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70001]];
ok(siroConfig($validConfig)['lab_ida']===1);
$validConfig['siro']['lab_ida']='5';failure(fn()=>siroConfig($validConfig),'SIRO_CONFIGURATION');
$validConfig['siro']['lab_ida']=0;failure(fn()=>siroConfig($validConfig),'SIRO_CONFIGURATION');
ok(siroDate(new \DateTimeImmutable('2026-09-19T03:01:02.345+00:00'))==='2026-09-19T00:01:02.345Z');
ok(siroDate(new \DateTimeImmutable('2026-09-19T01:00:00+00:00'))==='2026-09-18T22:00:00.000Z');
ok(siroDate(new \DateTimeImmutable('2026-09-19T00:01:02.345-03:00'))==='2026-09-19T00:01:02.345Z');
$window=siroQueryWindow(['created_at'=>'2026-09-18T16:00:00+00:00'],new \DateTimeImmutable('2026-09-19T03:00:30+00:00'));
ok($window===['FechaDesde'=>'2026-09-18T01:00:00.000Z','FechaHasta'=>'2026-09-18T23:59:30.000Z']);
failure(fn()=>siroQueryWindow(['created_at'=>'invalid']),'SIRO_DATE');
failure(fn()=>siroQueryWindow(['created_at'=>'2026-02-30T00:00:00+00:00']),'SIRO_DATE');
failure(fn()=>siroQueryWindow(['created_at'=>'2026-09-20T00:00:00+00:00'],new \DateTimeImmutable('2026-09-19T00:00:00+00:00')),'SIRO_DATE');
foreach(['CANCELLED'=>'cancelled','REJECTED'=>'rejected','CONFIRMED'=>'confirmed','PENDING'=>'pending','UNCONFIRMED'=>'processed-false'] as $expected=>$scenario) {
    [$p,$store,$g,$dir]=setup();$a=$p->create(1,'123',fn()=>row());ok($a['state']==='PENDING');
    $g->scenario=$scenario;$r=$p->reconcile(1,$a['attempt_id']);ok($r['state']===$expected);ok($r['phantom_payment_posted']===false);
    ok($r['siro_payment_confirmed']===($expected==='CONFIRMED'));
}
foreach(['true-pending','amount-mismatch','reference-mismatch','client-mismatch','malformed','query-timeout','empty','ambiguous'] as $scenario) {
    [$p,$store,$g]=setup();$a=$p->create(1,'123',fn()=>row());$g->scenario=$scenario;ok($p->reconcile(1,$a['attempt_id'])['state']==='UNCONFIRMED');
    ok(!isset($p->list(1)[0]['hash']));
}
foreach(['timeout','session-error','checkout-error'] as $scenario) {
    [$p,$store,$g]=setup();$g->scenario=$scenario;$a=$p->create(1,'123',fn()=>row());ok($a['state']==='UNCONFIRMED');
    $b=$p->create(1,'123',fn()=>row());ok($a['attempt_id']===$b['attempt_id'] && $g->creates===1);ok(!isset($b['checkout_url']));
}
[$p,$store,$g,$dir]=setup();$a=$p->create(1,'123',fn()=>row());$b=$p->create(1,'123',fn()=>row());ok($a===$b && $g->creates===1);
$g->scenario='cancelled';ok($p->reconcile(1,$a['attempt_id'])['state']==='CANCELLED');
$b=$p->create(1,'123',fn()=>row());ok($a['attempt_id']!==$b['attempt_id']);ok($g->requests[0]['IdReferenciaOperacion']===$g->requests[1]['IdReferenciaOperacion']);
ok(substr($g->requests[0]['nro_comprobante'],-5)!==substr($g->requests[1]['nro_comprobante'],-5));
ok((bool)preg_match('/^[0-9]{20}$/D',$g->requests[1]['nro_comprobante']));
// A new service instance represents browser closure and later login, same durable store.
$p=new Payments(new PaymentStore($dir),$g,['return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70004]);
$g->scenario='confirmed';ok($p->reconcile(1,$b['attempt_id'])['state']==='CONFIRMED');
$c=$p->create(1,'123',fn()=>row());ok($c['state']==='CONFIRMED' && $g->creates===2 && !isset($c['checkout_url']));
ok(count($p->list(1))===2 && count($p->list(5))===0);
failure(fn()=>$p->reconcile(5,$b['attempt_id']),'PAYMENT_NOT_FOUND');failure(fn()=>$p->reconcile(1,str_repeat('0',32)),'PAYMENT_NOT_FOUND');
[$p,$store,$g]=setup();
foreach([['Estado'=>'PAGADA'],['IDA'=>'5'],['Total'=>'0'],['Total'=>'1,21'],['SIRO_CE'=>'']] as $change) {
    $expected=isset($change['Estado'])?'PAYMENT_NOT_UNPAID':(isset($change['IDA'])?'INVOICE_OWNERSHIP':(isset($change['SIRO_CE'])?'PAYMENT_CPE':'PAYMENT_AMOUNT'));
    failure(fn()=>$p->create(1,'123',fn()=>array_replace(row(),$change)),$expected);
}
failure(fn()=>$p->create(1,'999',fn()=>row()),'INVOICE_OWNERSHIP');ok($g->creates===0);
failure(fn()=>$p->create(1,'123',fn()=>throw new Failure('INVOICE_NOT_FOUND')),'INVOICE_NOT_FOUND');
[$p,$store,$g,$dir]=setup();file_put_contents($dir.'/siro-attempts.json','broken');failure(fn()=>$p->list(1),'PAYMENT_STORAGE');
ok(paymentCents('121.00')===12100);failure(fn()=>paymentCents('1e2'),'PAYMENT_AMOUNT');failure(fn()=>paymentCents('121.001'),'PAYMENT_AMOUNT');
[$p,$store,$g,$dir]=setup();
$single=new Payments($store,$g,['return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70000]);
$a=$single->create(1,'123',fn()=>row());$g->scenario='cancelled';$single->reconcile(1,$a['attempt_id']);
failure(fn()=>$single->create(1,'123',fn()=>row()),'PAYMENT_SEQUENCE_EXHAUSTED');ok($g->creates===1);
// A crash after durable CREATING reservation is never permission to repeat the POST.
$store->transaction(function(&$state,$save){foreach($state['attempts'] as &$a)$a['state']='CREATING';$save();});
ok($single->create(1,'123',fn()=>row())['state']==='CREATING' && $g->creates===1);
// Selected IDA is a domain argument from the server, not a hardcoded client.
// HTTP still blocks multi-contract sessions and every IDA except the lab account.
[$p,$store,$g,$dir]=setup();
$other=$p->create(5,'123',fn()=>array_replace(row(),['IDA'=>'5']));
ok(count($p->list(5))===1 && $p->list(1)===[]);
failure(fn()=>$p->reconcile(1,$other['attempt_id']),'PAYMENT_NOT_FOUND');
failure(fn()=>$p->create(5,'124',fn()=>array_replace(row(),['IDT'=>'124'])),'INVOICE_OWNERSHIP');
$g->scenario='confirmed';$confirmed=$p->reconcile(5,$other['attempt_id']);
ok($confirmed['phase']==='SIRO_CONFIRMED' && $confirmed['phantom_payment_posted']===false);
[$p,$store,$g,$dir]=setup();$a=$p->create(1,'123',fn()=>row());
failure(fn()=>$p->create(1,'123',fn()=>array_replace(row(),['Total'=>'122.00'])),'PAYMENT_INVOICE_CHANGED');
failure(fn()=>$p->create(1,'123',fn()=>array_replace(row(),['SIRO_CE'=>str_repeat('2',19)])),'PAYMENT_INVOICE_CHANGED');
ok($g->creates===1 && count($p->list(1))===1);
$saved=file_get_contents($dir.'/siro-attempts.json');
ok(!preg_match('/Password|api_pass|Autogestion|access_token|Request|fixture-password|fixture-token/',$saved));
echo 'PAYMENT_CHECKS='.$count.PHP_EOL;
