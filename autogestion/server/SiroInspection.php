<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/Payments.php';

// Snapshot only: reconcile can change this in-memory copy, never the runtime.
final class SiroInspectionStore implements PaymentAttempts {
    public function __construct(private array $state) {
        if(($state['version']??null)!==1 || !is_array($state['attempts']??null)) throw new Failure('PAYMENT_STORAGE');
    }
    public function transaction(callable $callback): mixed {return $callback($this->state,static function(): void {});}
    public function reason(string $id): string {
        $reason=$this->state['attempts'][$id]['check_reason']??'NOT_CHECKED';
        return is_string($reason) && preg_match('/^(?:VERIFIED|CONSULT_NO_MATCH|NOT_CHECKED|(?:CONSULT|RESULT)_(?:SIRO_(?:FORMAT|TIMEOUT|NETWORK|HTTP|SESSION|DATE)|PAYMENT_(?:MISMATCH|AMBIGUOUS|AMOUNT)|UNEXPECTED))$/D',$reason)?$reason:'NOT_CHECKED';
    }
}
function siroInspectionReport(array $snapshot,SiroGateway $gateway,array $settings,int $ida,string $id): array {
    $store=new SiroInspectionStore($snapshot);
    $payment=new Payments($store,$gateway,$settings);
    $result=$payment->reconcile($ida,$id,true);
    // Fixed local codes and flags only. No hash, URL, customer, amount or raw SIRO data.
    $posting=in_array($result['phantom_posting_state'],['NOT_POSTED','POSTING','POST_UNCONFIRMED','POSTED','NEEDS_REVIEW','ALREADY_SETTLED'],true)?$result['phantom_posting_state']:'UNKNOWN';
    return ['state'=>$result['state'],'check'=>$store->reason($id),'intent_created'=>$result['intent_created'],
        'siro_payment_confirmed'=>$result['siro_payment_confirmed'],'can_resume'=>$result['can_resume'],
        'phantom_posting_state'=>$posting];
}
