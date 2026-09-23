<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/Siro.php';

interface PaymentAttempts {
    // Callback receives state and a durable save operation inside one exclusive transaction.
    public function transaction(callable $callback): mixed;
}
final class PaymentStore implements PaymentAttempts {
    public function __construct(private string $dir) {}
    public function transaction(callable $callback): mixed {
        return locked($this->dir.'/siro-attempts.lock',function() use ($callback) {
            $path=$this->dir.'/siro-attempts.json';
            try {$state=is_file($path)?json_decode(file_get_contents($path),true,64,JSON_THROW_ON_ERROR):['version'=>1,'attempts'=>[],'counters'=>[]];}
            catch(\Throwable) {throw new Failure('PAYMENT_STORAGE');}
            if(($state['version']??null)!==1 || !is_array($state['attempts']??null) || !is_array($state['counters']??null)) throw new Failure('PAYMENT_STORAGE');
            $save=function() use (&$state,$path) {
                $temp=$path.'.'.bin2hex(random_bytes(8)).'.tmp';$h=null;
                try {
                    $json=json_encode($state,JSON_THROW_ON_ERROR);$h=fopen($temp,'xb');
                    if(!$h || !chmod($temp,0600) || fwrite($h,$json)!==strlen($json) || !fflush($h) || !fsync($h)) throw new Failure('PAYMENT_STORAGE');
                    fclose($h);$h=null;if(!rename($temp,$path)) throw new Failure('PAYMENT_STORAGE');
                } finally {if(is_resource($h))fclose($h);if(is_file($temp))unlink($temp);}
            };
            return $callback($state,$save);
        });
    }
}
function paymentRequest(array $a,array $s): array {
    $returnBase=rtrim($s['return_base'],'/');
    $returnQuery='route=payment-return&attempt='.$a['attempt_id'];
    return ['nro_cliente_empresa'=>$a['cpe'],'nro_comprobante'=>$a['receipt'],'Concepto'=>'Factura'.$a['idt'],
        'Importe'=>$a['cents']/100,'URL_OK'=>$returnBase.'/api.php?'.$returnQuery.'&result=ok',
        'URL_ERROR'=>$returnBase.'/api.php?'.$returnQuery.'&result=error','IdReferenciaOperacion'=>$a['reference']];
}
function paymentPublic(array $a,bool $checkout=false): array {
    $posting=$a['posting_state']??'NOT_POSTED';
    $r=['attempt_id'=>$a['attempt_id'],'idt'=>$a['idt'],'amount'=>$a['cents']/100,'state'=>$a['state'],
        'intent_created'=>$a['hash']!==null,'siro_payment_confirmed'=>$a['state']==='CONFIRMED','phantom_payment_posted'=>$posting==='POSTED',
        'phantom_posting_state'=>$posting,'can_post_to_phantom'=>$a['state']==='CONFIRMED' && $posting==='NOT_POSTED',
        'created_at'=>$a['created_at'],'updated_at'=>$a['updated_at'],'can_resume'=>$a['state']==='PENDING' && $a['hash']!==null,
        'phase'=>match($a['state']) {'CREATING'=>'SIRO_INTENT_CREATING','PENDING'=>'SIRO_PENDING','CONFIRMED'=>'SIRO_CONFIRMED','CANCELLED'=>'SIRO_CANCELLED','REJECTED'=>'SIRO_REJECTED',default=>'SIRO_UNKNOWN'}];
    if($checkout && $r['can_resume']) $r['checkout_url']=siroCheckout($a['hash']);
    return $r;
}
function paymentResult(array $row,array $a,array $s): array {
    $request=$row['Request']??null;
    if(!is_array($request) || array_is_list($request) || !is_bool($row['PagoExitoso']??null) || !is_string($row['Estado']??null)
        || !is_string($row['IdOperacion']??null) || !preg_match('/^[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/D',$row['IdOperacion'])) throw new Failure('SIRO_FORMAT');
    $ref=$row['idReferenciaOperacion']??$row['IdReferenciaOperacion']??null;
    if($ref!==$a['reference'] || (isset($row['IdReferenciaOperacion']) && $row['IdReferenciaOperacion']!==$a['reference'])) throw new Failure('PAYMENT_MISMATCH');
    $expected=paymentRequest($a,$s);
    foreach(['nro_cliente_empresa','nro_comprobante','IdReferenciaOperacion','URL_OK','URL_ERROR'] as $field) if(($request[$field]??null)!==$expected[$field]) throw new Failure('PAYMENT_MISMATCH');
    if(paymentCents($request['Importe']??null)!==$a['cents'] || (isset($row['Hash']) && $a['hash']!==null && $row['Hash']!==$a['hash'])) throw new Failure('PAYMENT_MISMATCH');
    $state=match(true) {
        $row['PagoExitoso']===true && $row['Estado']==='PROCESADA'=>'CONFIRMED',
        $row['PagoExitoso']===false && $row['Estado']==='CANCELADA'=>'CANCELLED',
        $row['PagoExitoso']===false && $row['Estado']==='RECHAZADA'=>'REJECTED',
        $row['PagoExitoso']===false && in_array($row['Estado'],['GENERADA','REGISTRADA'],true)=>'PENDING',
        default=>'UNCONFIRMED',
    };
    return ['state'=>$state,'result_id'=>$row['IdOperacion']];
}
final class Payments {
    public function __construct(private PaymentAttempts $store,private SiroGateway $siro,private array $s) {}
    public function list(int $ida): array {
        return $this->store->transaction(function(&$state) use($ida) {
            $items=array_values(array_filter($state['attempts'],fn($a)=>$a['ida']===$ida));
            return array_map(__NAMESPACE__.'\\paymentPublic',array_reverse($items));
        });
    }
    public function create(int $ida,string $idt,callable $invoice): array {
        if($ida<1) throw new Failure('FORBIDDEN',403);
        return $this->store->transaction(function(&$state,$save) use($ida,$idt,$invoice) {
            // Never clear a pending/unknown/confirmed attempt merely because Phantom is still IMPAGA.
            $row=$invoice();
            if(invoiceId($row['IDT']??null)!==$idt || (isset($row['IDA']) && !in_array($row['IDA'],[$ida,(string)$ida],true))) throw new Failure('INVOICE_OWNERSHIP',403);
            if(($row['Estado']??null)!=='IMPAGA') throw new Failure('PAYMENT_NOT_UNPAID',409);
            $cents=paymentCents($row['Total']??null);$cpe=$row['SIRO_CE']??null;
            if(!is_string($cpe) || !preg_match('/^[0-9]{19}$/D',$cpe)) throw new Failure('PAYMENT_CPE');
            foreach(array_reverse($state['attempts']) as $a) if($a['ida']===$ida && $a['idt']===$idt && !in_array($a['state'],['CANCELLED','REJECTED'],true)) {
                if($a['cents']!==$cents || $a['cpe']!==$cpe) throw new Failure('PAYMENT_INVOICE_CHANGED',409);
                return paymentPublic($a,true);
            }
            if(count($state['attempts'])>=1000) throw new Failure('PAYMENT_STORAGE_LIMIT');
            $recent=array_filter($state['attempts'],fn($a)=>strtotime($a['created_at'])>time()-900);
            if(count($recent)>=5) throw new Failure('PAYMENT_RATE_LIMIT',429);
            $next=max($this->s['receipt_start'],($state['counters'][$cpe]??($this->s['receipt_start']-1))+1);
            if($next>$this->s['receipt_end']) throw new Failure('PAYMENT_SEQUENCE_EXHAUSTED');
            do {$id=bin2hex(random_bytes(16));} while(isset($state['attempts'][$id]));
            do {$receipt=(string)random_int(100000000000000,999999999999999).str_pad((string)$next,5,'0',STR_PAD_LEFT);} while(in_array($receipt,array_column($state['attempts'],'receipt'),true));
            $now=gmdate('c');$a=['attempt_id'=>$id,'ida'=>$ida,'idt'=>$idt,'cents'=>$cents,'cpe'=>$cpe,'receipt'=>$receipt,
                'reference'=>$idt.';'.paymentDecimal($cents).';','hash'=>null,'result_id'=>null,'state'=>'CREATING','posting_state'=>'NOT_POSTED',
                'posting_reference'=>null,'posted_at'=>null,'created_at'=>$now,'updated_at'=>$now,'checked_at'=>0];
            $state['counters'][$cpe]=$next;$state['attempts'][$id]=$a;$save(); // Durable reservation BEFORE the external POST.
            try {
                $r=$this->siro->create(paymentRequest($a,$this->s));
                $hash=$r['Hash']??null;$url=$r['Url']??$r['URL']??null;
                if(!is_string($hash) || !is_string($url) || $url!==siroCheckout($hash)) throw new Failure('SIRO_CHECKOUT');
                $a['hash']=$hash;$a['state']='PENDING';
            } catch(\Throwable) {$a['state']='UNCONFIRMED';}
            $a['updated_at']=gmdate('c');$state['attempts'][$id]=$a;$save();
            return paymentPublic($a,true);
        });
    }
    public function reconcile(int $ida,string $id): array {
        if($ida<1 || !preg_match('/^[a-f0-9]{32}$/D',$id)) throw new Failure('FORBIDDEN',403);
        return $this->store->transaction(function(&$state,$save) use($ida,$id) {
            $a=$state['attempts'][$id]??null;
            if(!$a || $a['ida']!==$ida) throw new Failure('PAYMENT_NOT_FOUND',404);
            if($a['state']==='CONFIRMED' || time()-$a['checked_at']<5) return paymentPublic($a);
            $a['checked_at']=time();
            try {
                $rows=$this->siro->consult($a);
                if(!array_is_list($rows) || count($rows)>100) throw new Failure('SIRO_FORMAT');
                $matches=[];
                foreach($rows as $row) {
                    if(!is_array($row) || !is_array($row['Request']??null)) throw new Failure('SIRO_FORMAT');
                    if(($row['Request']['nro_comprobante']??null)===$a['receipt']) $matches[]=$row;
                }
                if(count($matches)>1) throw new Failure('PAYMENT_AMBIGUOUS');
                if(count($matches)===1) {
                    $v=paymentResult($matches[0],$a,$this->s);
                    if($a['hash']!==null) {
                        $verified=paymentResult($this->siro->result($a['hash'],$v['result_id']),$a,$this->s);
                        if($verified['result_id']!==$v['result_id']) throw new Failure('PAYMENT_MISMATCH');
                        $v=$verified;
                    }
                    $a['state']=$v['state'];$a['result_id']=$v['result_id'];
                } else $a['state']='UNCONFIRMED'; // Absence never proves a failed creation or authorizes a retry.
            } catch(\Throwable) {$a['state']='UNCONFIRMED';}
            $a['updated_at']=gmdate('c');$state['attempts'][$id]=$a;$save();return paymentPublic($a);
        });
    }
    public function postingPreflight(int $ida,callable $invoice,callable $crmUnpaid): array {
        if($ida<1) throw new Failure('FORBIDDEN',403);
        return $this->store->transaction(function(&$state) use($ida,$invoice,$crmUnpaid) {
            $candidates=array_values(array_filter($state['attempts'],static fn($a)=>($a['ida']??null)===$ida && ($a['state']??null)==='CONFIRMED'
                && ($a['posting_state']??'NOT_POSTED')==='NOT_POSTED'));
            if($candidates===[]) throw new Failure('CANDIDATE_NOT_FOUND',404);
            if(count($candidates)!==1) throw new Failure('CANDIDATE_AMBIGUOUS',409);
            $a=$candidates[0];
            $this->assertConfirmedAttempt($a);
            $row=$invoice($a['idt']);$this->assertPostingInvoice($row,$a,$ida);
            if(($row['Estado']??null)!=='IMPAGA') throw new Failure('PHANTOM_ALREADY_SETTLED',409);
            phantomCrmUnpaidRecord($crmUnpaid($a['idt']),$a['idt'],$ida,$a['cents']);
            return ['siro_confirmed'=>true,'rest_unpaid'=>true,'crm_unpaid'=>true,'ida_matches'=>true,
                'idt_matches'=>true,'amount_matches'=>true,'posting_previous'=>false,'code'=>'READY_FOR_CONTROLLED_POST'];
        });
    }
    public function postToPhantom(int $ida,string $id,callable $invoice,callable $crmUnpaid,callable $post): array {
        if($ida<1 || !preg_match('/^[a-f0-9]{32}$/D',$id)) throw new Failure('FORBIDDEN',403);
        return $this->store->transaction(function(&$state,$save) use($ida,$id,$invoice,$crmUnpaid,$post) {
            $a=$state['attempts'][$id]??null;
            if(!$a || $a['ida']!==$ida) throw new Failure('PAYMENT_NOT_FOUND',404);
            $a['posting_state']??='NOT_POSTED';$a['posting_reference']??=null;$a['posted_at']??=null;
            if($a['posting_state']==='POSTED') return paymentPublic($a);
            $this->assertConfirmedAttempt($a);
            $row=$invoice($a['idt']);$this->assertPostingInvoice($row,$a,$ida);
            if(($row['Estado']??null)!=='IMPAGA') {
                if(in_array($a['posting_state'],['POSTING','POST_UNCONFIRMED'],true)) {
                    try {$a['posting_state']=$crmUnpaid($a['idt'])===[]?'POSTED':'POST_UNCONFIRMED';}
                    catch(\Throwable) {$a['posting_state']='POST_UNCONFIRMED';}
                } else $a['posting_state']='ALREADY_SETTLED';
                if($a['posting_state']==='POSTED')$a['posted_at']=gmdate('c');
                $a['updated_at']=gmdate('c');$state['attempts'][$id]=$a;$save();return paymentPublic($a);
            }
            // An uncertain previous POST is reconciled by reading Phantom; it is never repeated blindly.
            if(in_array($a['posting_state'],['POSTING','POST_UNCONFIRMED','NEEDS_REVIEW','ALREADY_SETTLED'],true)) return paymentPublic($a);
            try {phantomCrmUnpaidRecord($crmUnpaid($a['idt']),$a['idt'],$ida,$a['cents']);}
            catch(\Throwable) {$a['posting_state']='NEEDS_REVIEW';$a['updated_at']=gmdate('c');$state['attempts'][$id]=$a;$save();return paymentPublic($a);}
            $a['posting_reference']='SIRO '.strtolower($a['result_id']);$a['posting_state']='POSTING';$a['updated_at']=gmdate('c');
            $state['attempts'][$id]=$a;$save();
            $ack='UNKNOWN';$transportFailed=false;
            try {$ack=$post($a['idt'],$a['cents'],$a['posting_reference']);}
            catch(\Throwable) {$transportFailed=true;}
            try {
                $after=$invoice($a['idt']);$this->assertPostingInvoice($after,$a,$ida);
                if(($after['Estado']??null)!=='IMPAGA') {
                    $rows=$crmUnpaid($a['idt']);
                    $a['posting_state']=$rows===[]?'POSTED':'POST_UNCONFIRMED';
                } else $a['posting_state']=$ack==='ERROR' && !$transportFailed?'NEEDS_REVIEW':'POST_UNCONFIRMED';
            } catch(\Throwable) {$a['posting_state']='POST_UNCONFIRMED';}
            if($a['posting_state']==='POSTED')$a['posted_at']=gmdate('c');
            $a['updated_at']=gmdate('c');$state['attempts'][$id]=$a;$save();return paymentPublic($a);
        });
    }
    private function assertConfirmedAttempt(array $a): void {
        if(($a['state']??null)!=='CONFIRMED' || !is_string($a['hash']??null) || !is_string($a['result_id']??null)) throw new Failure('PAYMENT_NOT_CONFIRMED',409);
        $verified=paymentResult($this->siro->result($a['hash'],$a['result_id']),$a,$this->s);
        if($verified['state']!=='CONFIRMED' || $verified['result_id']!==$a['result_id']) throw new Failure('PAYMENT_NOT_CONFIRMED',409);
    }
    private function assertPostingInvoice(array $row,array $a,int $ida): void {
        if(invoiceId($row['IDT']??null)!==$a['idt'] || (isset($row['IDA']) && !in_array($row['IDA'],[$ida,(string)$ida],true))) throw new Failure('INVOICE_OWNERSHIP',403);
        if(paymentCents($row['Total']??null)!==$a['cents']) throw new Failure('PAYMENT_INVOICE_CHANGED',409);
        if(!is_string($row['Estado']??null) || !in_array($row['Estado'],['IMPAGA','PAGADA'],true)) throw new Failure('PAYMENT_INVOICE_CHANGED',409);
    }
}
