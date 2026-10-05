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
function crmRow(string $idt='123',string $ida='1',string $total='121.00'): array {return [[$idt,'Fixture',$ida,'2026-09-01','2026-09','1-123',$total]];}
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
ok(siroServiceEnabled(['lab_ida'=>1],[1],1));
ok(siroServiceEnabled(['lab_ida'=>1],[1,5],1));
ok(siroServiceEnabled(['lab_ida'=>1],[1,5],5));
ok(siroServiceEnabled(['lab_ida'=>1],[5],5));
ok(siroServiceEnabled(['lab_ida'=>5],[5],5));
ok(!siroServiceEnabled(['lab_ida'=>5],[1],5));
ok(!siroServiceEnabled(['lab_ida'=>1],[1,5],7));
ok(!siroServiceEnabled(['lab_ida'=>1],[1,5],null));
ok(!siroServiceEnabled(null,[1],1));
ok(phantomPostingServiceEnabled(['lab_ida'=>1],[1,5],5));
ok(phantomPostingServiceEnabled(['lab_ida'=>1],[5],5));
ok(!phantomPostingServiceEnabled(['lab_ida'=>1],[1,5],7));
ok(!phantomPostingServiceEnabled(null,[1],1));
$postingConfig=['phantom_url'=>'https://fixture.invalid/API_Rest.php','phantom_posting'=>[
    'enabled'=>true,'lab_ida'=>1,'crm_url'=>'https://fixture.invalid/PHANTOM/Includes/CRM/API_CRM.php','origin'=>'SIRO Mi USITTEL']];
$unusedTransport=new class implements Transport {
    public function post(string $url,array $body): array {throw new \RuntimeException('No Phantom fixture network');}
    public function authenticate(string $url,array $credentials): array {throw new \RuntimeException('No Phantom fixture network');}
};
$crm=new class implements PhantomCrmGateway {
    public int $writes=0;
    public function authenticate(bool $refresh=false): void {}
    public function unpaid(string $idt): array {return [[$idt,'fixture','5','2026-09-01','2026-09','5-500','10.00']];}
    public function impute(string $idt,int $cents,string $origin,string $reference): string {$this->writes++;return 'SUCCESS';}
};
$postingPhantom=new Phantom($postingConfig,$root,$unusedTransport,$crm);$postingPhantom->scope([5]);
ok($postingPhantom->crmUnpaidRows(5,'500')[0][2]==='5');
ok($postingPhantom->imputePayment(5,'500',1000,'SIRO fixture')==='SUCCESS' && $crm->writes===1);
failure(fn()=>$postingPhantom->crmUnpaidRows(7,'700'),'FORBIDDEN');
failure(fn()=>$postingPhantom->imputePayment(7,'700',1000,'SIRO fixture'),'FORBIDDEN');
$postingConfig['phantom_posting']['enabled']=false;
failure(fn()=>(new Phantom($postingConfig,$root,$unusedTransport,$crm))->imputePayment(5,'500',1000,'SIRO fixture'),'PHANTOM_POSTING_DISABLED');
$validConfig=['mode'=>'phantom','siro'=>['enabled'=>true,'user'=>'fixture-user','password'=>'fixture-password','return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70001]];
$rootConfig=['mode'=>'phantom','siro'=>['enabled'=>true,'user'=>'fixture-user','password'=>'fixture-password','return_base'=>'https://mi.usittel.com.ar/','receipt_start'=>70000,'receipt_end'=>70001]];
$rootSiro=siroCandidateConfig($rootConfig);
ok($rootSiro!==null && $rootSiro['return_base']==='https://mi.usittel.com.ar');
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
$resumed=$p->resume(1,$a['attempt_id'],fn()=>row());
ok($resumed['attempt_id']===$a['attempt_id'] && $resumed['checkout_url']===$a['checkout_url'] && $g->creates===1);
failure(fn()=>$p->resume(5,$a['attempt_id'],fn()=>row()),'PAYMENT_NOT_FOUND');
failure(fn()=>$p->resume(1,$a['attempt_id'],fn()=>array_replace(row(),['Total'=>'122.00'])),'PAYMENT_INVOICE_CHANGED');
failure(fn()=>$p->resume(1,$a['attempt_id'],fn()=>array_replace(row(),['Estado'=>'PAGADA'])),'PAYMENT_NOT_UNPAID');
$g->scenario='query-timeout';$timedResume=$p->resume(1,$a['attempt_id'],fn()=>row());
ok($timedResume['state']==='UNCONFIRMED' && $timedResume['checkout_url']===$a['checkout_url']);ok($g->creates===1);
// Closing SIRO, empty queries, transport failures and a new login never create a second checkout.
foreach(['empty','query-timeout','malformed','ambiguous','amount-mismatch','processed-false'] as $scenario) {
    [$recovery,$recoveryStore,$recoveryGateway,$recoveryDir]=setup();
    $original=$recovery->create(1,'123',fn()=>row());$recoveryGateway->scenario=$scenario;
    $unknown=$recovery->reconcile(1,$original['attempt_id'],true);
    ok($unknown['state']==='UNCONFIRMED' && $unknown['can_resume']);
    $recovery=new Payments(new PaymentStore($recoveryDir),$recoveryGateway,['return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70004]);
    $list=$recovery->list(1);ok(count($list)===1 && $list[0]['can_resume'] && !isset($list[0]['checkout_url']));
    $resumed=$recovery->resume(1,$original['attempt_id'],fn()=>row());
    ok($resumed['state']==='UNCONFIRMED' && $resumed['attempt_id']===$original['attempt_id'] && $resumed['checkout_url']===$original['checkout_url']);
    $duplicate=$recovery->create(1,'123',fn()=>row());
    ok($duplicate['attempt_id']===$original['attempt_id'] && $duplicate['checkout_url']===$original['checkout_url'] && $recoveryGateway->creates===1);
    failure(fn()=>$recovery->resume(5,$original['attempt_id'],fn()=>row()),'PAYMENT_NOT_FOUND');
    foreach([['IDT'=>'999'],['IDA'=>'5']] as $change) failure(fn()=>$recovery->resume(1,$original['attempt_id'],fn()=>array_replace(row(),$change)),'INVOICE_OWNERSHIP');
    foreach([['Total'=>'122.00'],['SIRO_CE'=>str_repeat('2',19)]] as $change) failure(fn()=>$recovery->resume(1,$original['attempt_id'],fn()=>array_replace(row(),$change)),'PAYMENT_INVOICE_CHANGED');
    failure(fn()=>$recovery->resume(1,$original['attempt_id'],fn()=>array_replace(row(),['Estado'=>'PAGADA'])),'PAYMENT_NOT_UNPAID');
    ok($recoveryGateway->creates===1 && count($recovery->list(1))===1);
    $recoveryGateway->scenario='confirmed';
    $blocked=$recovery->resume(1,$original['attempt_id'],fn()=>row());
    ok($blocked['state']==='CONFIRMED' && !$blocked['can_resume'] && !isset($blocked['checkout_url']) && $recoveryGateway->creates===1);
}
[$noHash,$noHashStore,$noHashGateway]=setup();$noHashGateway->scenario='timeout';
$missing=$noHash->create(1,'123',fn()=>row());
ok(!$missing['can_resume'] && !$missing['intent_created']);
ok(!isset($noHash->resume(1,$missing['attempt_id'],fn()=>row())['checkout_url']) && $noHashGateway->creates===1);
// Posting evidence and malformed stored hashes may never authorize checkout.
foreach(['POSTED','POSTING','POST_UNCONFIRMED','NEEDS_REVIEW','ALREADY_SETTLED'] as $posting) {
    ok(!paymentPublic(['attempt_id'=>str_repeat('a',32),'idt'=>'123','cents'=>12100,'hash'=>str_repeat('a',64),'state'=>'UNCONFIRMED','posting_state'=>$posting,'created_at'=>'fixture','updated_at'=>'fixture'])['can_resume']);
}
ok(!paymentPublic(['attempt_id'=>str_repeat('a',32),'idt'=>'123','cents'=>12100,'hash'=>'invalid','state'=>'UNCONFIRMED','created_at'=>'fixture','updated_at'=>'fixture'])['can_resume']);
$g->scenario='pending';ok($p->reconcile(1,$a['attempt_id'],true)['state']==='PENDING');
$g->scenario='cancelled';ok($p->reconcile(1,$a['attempt_id'],true)['state']==='CANCELLED');
ok(!isset($p->resume(1,$a['attempt_id'],fn()=>row())['checkout_url']));
[$confirmedP,$confirmedStore,$confirmedGateway]=setup();$confirmedAttempt=$confirmedP->create(1,'123',fn()=>row());
$confirmedGateway->scenario='confirmed';$confirmedResume=$confirmedP->resume(1,$confirmedAttempt['attempt_id'],fn()=>row());
ok($confirmedResume['state']==='CONFIRMED' && !isset($confirmedResume['checkout_url']) && $confirmedGateway->creates===1);
$confirmedGateway->scenario='pending';ok(!isset($confirmedP->resume(1,$confirmedAttempt['attempt_id'],fn()=>row())['checkout_url']));
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
$confirmAttempt=function() {
    [$p,$store,$g,$dir]=setup();$a=$p->create(1,'123',fn()=>row());$g->scenario='confirmed';$a=$p->reconcile(1,$a['attempt_id']);
    return [$p,$store,$g,$dir,$a];
};
ok(phantomCrmAcknowledgement('OK')==='SUCCESS');
ok(phantomCrmAcknowledgement("OK - pago recibido")==='SUCCESS');
ok(phantomCrmAcknowledgement('Error: referencia duplicada')==='ERROR');
ok(phantomCrmAcknowledgement('texto inesperado')==='UNKNOWN');
ok(phantomCrmUnpaidRecord(crmRow(),'123',1,12100)===['idt'=>'123','ida'=>1,'cents'=>12100]);
foreach([[[], 'PHANTOM_CRM_UNPAID_SCHEMA'],[crmRow('999'),'PHANTOM_CRM_IDT_MISMATCH'],[crmRow('123','5'),'PHANTOM_CRM_IDA_MISMATCH'],[crmRow('123','1','1.00'),'PHANTOM_CRM_AMOUNT_MISMATCH']] as [$rows,$code]) failure(fn()=>phantomCrmUnpaidRecord($rows,'123',1,12100),$code);
[$p,$store,$g,$dir,$a]=$confirmAttempt();
$ready=$p->postingPreflight(1,fn()=>row(),fn()=>crmRow());
ok($ready['code']==='READY_FOR_CONTROLLED_POST' && $ready['siro_confirmed'] && $ready['rest_unpaid'] && $ready['crm_unpaid']);
failure(fn()=>$p->postingPreflight(5,fn()=>row(),fn()=>crmRow()),'CANDIDATE_NOT_FOUND');
failure(fn()=>$p->postingPreflight(1,fn()=>array_replace(row(),['Estado'=>'PAGADA']),fn()=>[]),'PHANTOM_ALREADY_SETTLED');
failure(fn()=>$p->postingPreflight(1,fn()=>row(),fn()=>crmRow('999')),'PHANTOM_CRM_IDT_MISMATCH');
$g->scenario='pending';failure(fn()=>$p->postingPreflight(1,fn()=>row(),fn()=>crmRow()),'PAYMENT_NOT_CONFIRMED');$g->scenario='confirmed';
$store->transaction(function(&$state,$save){$copy=reset($state['attempts']);$copy['attempt_id']=str_repeat('b',32);$state['attempts'][$copy['attempt_id']]=$copy;$save();});
failure(fn()=>$p->postingPreflight(1,fn()=>row(),fn()=>crmRow()),'CANDIDATE_AMBIGUOUS');
[$p,$store,$g,$dir,$a]=$confirmAttempt();$posts=0;$invoiceState='IMPAGA';
$posted=$p->postToPhantom(1,$a['attempt_id'],function(string $idt) use (&$invoiceState){ok($idt==='123');return array_replace(row(),['Estado'=>$invoiceState]);},
    function(string $idt) use (&$invoiceState){return $invoiceState==='IMPAGA'?crmRow():[];},function(string $idt,int $cents,string $reference) use (&$posts,&$invoiceState){ok($idt==='123' && $cents===12100);ok((bool)preg_match('/^SIRO [a-f0-9-]{36}$/D',$reference));$posts++;$invoiceState='PAGADA';return 'SUCCESS';});
ok($posted['phantom_payment_posted']===true && $posted['phantom_posting_state']==='POSTED' && $posts===1 && !$posted['can_post_to_phantom']);
ok($p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['Estado'=>'PAGADA']),fn()=>[],fn()=>$posts++)['phantom_payment_posted']===true && $posts===1);
[$p,$store,$g,$dir,$a]=$confirmAttempt();$posts=0;
$uncertain=$p->postToPhantom(1,$a['attempt_id'],fn()=>row(),fn()=>crmRow(),function()use(&$posts){$posts++;return 'UNKNOWN';});
ok($uncertain['phantom_posting_state']==='POST_UNCONFIRMED' && !$uncertain['phantom_payment_posted'] && $posts===1);
ok($p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['Estado'=>'PAGADA']),fn()=>throw new Failure('PHANTOM_CRM_FORMAT'),fn()=>$posts++)['phantom_posting_state']==='POST_UNCONFIRMED' && $posts===1);
ok($p->postToPhantom(1,$a['attempt_id'],fn()=>row(),fn()=>crmRow(),fn()=>$posts++)['phantom_posting_state']==='POST_UNCONFIRMED' && $posts===1);
ok($p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['Estado'=>'PAGADA']),fn()=>[],fn()=>$posts++)['phantom_payment_posted']===true && $posts===1);
[$p,$store,$g,$dir,$a]=$confirmAttempt();$posts=0;
$failed=$p->postToPhantom(1,$a['attempt_id'],fn()=>row(),fn()=>crmRow(),function()use(&$posts){$posts++;throw new Failure('PHANTOM_TIMEOUT');});
ok($failed['phantom_posting_state']==='POST_UNCONFIRMED' && $posts===1);
ok($p->postToPhantom(1,$a['attempt_id'],fn()=>row(),fn()=>crmRow(),fn()=>$posts++)['phantom_posting_state']==='POST_UNCONFIRMED' && $posts===1);
[$p,$store,$g,$dir,$a]=$confirmAttempt();$posts=0;
$rejected=$p->postToPhantom(1,$a['attempt_id'],fn()=>row(),fn()=>crmRow(),function()use(&$posts){$posts++;return 'ERROR';});
ok($rejected['phantom_posting_state']==='NEEDS_REVIEW' && $posts===1);
[$p,$store,$g,$dir,$a]=$confirmAttempt();$afterState='IMPAGA';
$extended=$p->postToPhantom(1,$a['attempt_id'],function()use(&$afterState){return array_replace(row(),['Estado'=>$afterState]);},function()use(&$afterState){return $afterState==='IMPAGA'?crmRow():[];},function()use(&$afterState){$afterState='PAGADA';return 'SUCCESS';});
ok($extended['phantom_posting_state']==='POSTED');
[$p,$store,$g,$dir,$a]=$confirmAttempt();$afterState='IMPAGA';
$timedButPosted=$p->postToPhantom(1,$a['attempt_id'],function()use(&$afterState){return array_replace(row(),['Estado'=>$afterState]);},function()use(&$afterState){return $afterState==='IMPAGA'?crmRow():[];},function()use(&$afterState){$afterState='PAGADA';throw new Failure('PHANTOM_TIMEOUT');});
ok($timedButPosted['phantom_posting_state']==='POSTED');
[$p,$store,$g,$dir,$a]=$confirmAttempt();$posts=0;
ok($p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['Estado'=>'PAGADA']),fn()=>[],fn()=>$posts++)['phantom_posting_state']==='ALREADY_SETTLED' && $posts===0);
[$p,$store,$g,$dir]=setup();$pending=$p->create(1,'123',fn()=>row());
failure(fn()=>$p->postToPhantom(1,$pending['attempt_id'],fn()=>row(),fn()=>crmRow(),fn()=>null),'PAYMENT_NOT_CONFIRMED');
[$p,$store,$g,$dir,$a]=$confirmAttempt();
failure(fn()=>$p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['Total'=>'122.00']),fn()=>crmRow(),fn()=>null),'PAYMENT_INVOICE_CHANGED');
failure(fn()=>$p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['IDT'=>'999']),fn()=>crmRow(),fn()=>null),'INVOICE_OWNERSHIP');
failure(fn()=>$p->postToPhantom(1,$a['attempt_id'],fn()=>array_replace(row(),['IDA'=>'5']),fn()=>crmRow(),fn()=>null),'INVOICE_OWNERSHIP');
failure(fn()=>$p->postToPhantom(5,$a['attempt_id'],fn()=>row(),fn()=>crmRow(),fn()=>null),'PAYMENT_NOT_FOUND');
$saved=file_get_contents($dir.'/siro-attempts.json');
ok(!preg_match('/Password|api_pass|Autogestion|access_token|Request|fixture-password|fixture-token/',$saved));
echo 'PAYMENT_CHECKS='.$count.PHP_EOL;
