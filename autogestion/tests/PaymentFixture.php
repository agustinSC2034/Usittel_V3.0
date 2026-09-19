<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/../server/Payments.php';
final class PaymentFixture implements SiroGateway {
    public string $scenario='pending';
    public array $requests=[];
    public int $creates=0;
    public function __construct(private ?string $dir=null) {}
    private function scenario(): string {return $this->dir?trim(file_get_contents($this->dir.'/scenario')):$this->scenario;}
    public function create(array $request): array {
        $this->creates++;$this->requests[]=$request;
        if($this->dir) file_put_contents($this->dir.'/siro-fixture-request.json',json_encode($request));
        if($this->scenario()==='timeout') throw new Failure('SIRO_TIMEOUT');
        if($this->scenario()==='session-error') throw new Failure('SIRO_SESSION');
        $hash=str_repeat('a',64);
        return ['Hash'=>$hash,'Url'=>$this->scenario()==='checkout-error'?'https://evil.invalid/':siroCheckout($hash)];
    }
    public function row(array $request): array {
        $s=$this->scenario();
        $state=match($s) {'cancelled'=>'CANCELADA','rejected'=>'RECHAZADA','confirmed','processed-false','amount-mismatch','reference-mismatch','client-mismatch'=>'PROCESADA',default=>'GENERADA'};
        $r=['PagoExitoso'=>in_array($s,['confirmed','true-pending','amount-mismatch','reference-mismatch','client-mismatch'],true),'Estado'=>$state,
            'IdOperacion'=>'11111111-1111-4111-8111-111111111111','idReferenciaOperacion'=>$request['IdReferenciaOperacion'],'Request'=>$request];
        if($s==='amount-mismatch') $r['Request']['Importe']=1;
        if($s==='reference-mismatch') $r['idReferenciaOperacion']='wrong';
        if($s==='client-mismatch') $r['Request']['nro_cliente_empresa']=str_repeat('9',19);
        if($s==='malformed') unset($r['PagoExitoso']);
        return $r;
    }
    public function consult(array $attempt): array {
        if($this->scenario()==='query-timeout') throw new Failure('SIRO_TIMEOUT');
        if($this->dir) $this->requests=[json_decode(file_get_contents($this->dir.'/siro-fixture-request.json'),true)];
        if($this->scenario()==='empty') return [];
        $rows=array_map(fn($r)=>$this->row($r),$this->requests);
        if($this->scenario()==='ambiguous') $rows[]=$rows[0];
        return $rows;
    }
    public function result(string $hash,string $id): array {
        if($hash!==str_repeat('a',64) || $id!=='11111111-1111-4111-8111-111111111111') throw new Failure('PAYMENT_MISMATCH');
        return $this->row(end($this->requests));
    }
}
