<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/../server/PaymentHistory.php';

final class PaymentHistoryFixture implements PaymentHistorySource {
    private string $capability;
    public function __construct(private string $dir) {$this->capability=base64_encode('0123456789abcdef');}
    private function scenario(): string {return trim(@file_get_contents($this->dir.'/scenario')?:'normal');}
    public function authenticate(string $username,string $password): array {
        if($this->scenario()==='portal-auth-failure') throw new Failure('PAYMENT_PORTAL_AUTH');
        if($username!=='000001' || $password!==' 00Lab-fixture! ') throw new Failure('PAYMENT_PORTAL_AUTH');
        return ['cookies'=>['FIXTURE'=>'opaque-session'],'authenticated_at'=>time()];
    }
    public function history(array $state): array {
        if(($state['cookies']['FIXTURE']??null)!=='opaque-session') throw new Failure('PAYMENT_PORTAL_EXPIRED',401);
        if($this->scenario()==='payment-history-error') throw new Failure('PAYMENT_HISTORY_FORMAT');
        return ['state'=>$state,'rows'=>[
            ['id'=>'00053321','period'=>'2026-09','date'=>'2026-09-16','cents'=>12100,'method'=>'Siro','capability'=>$this->capability],
            ['id'=>'00052001','period'=>'2026-08','date'=>'2026-08-10','cents'=>875050,'method'=>'Efectivo','capability'=>base64_encode('fedcba9876543210')],
        ]];
    }
    public function receipt(array $state,string $capability): array {
        if($capability!==$this->capability) throw new Failure('PAYMENT_RECEIPT_UNAVAILABLE',404);
        return ['state'=>$state,'document'=>['contentType'=>'application/pdf','bytes'=>"%PDF-1.7\nfixture payment receipt\n%%EOF"]];
    }
}
