<?php
declare(strict_types=1);
namespace MiUsittel;
require_once __DIR__.'/../server/Payments.php';
final class PaymentFixture implements SiroGateway {
    public string $scenario='pending';
    public array $requests=[];
    public int $creates=0;
    public function __construct(private ?string $dir=null) {}
    private function scenario(): string {
        if(!$this->dir) return $this->scenario;
        // Keep SIRO failures independent from the selected Phantom contract.
        $file=is_file($this->dir.'/siro-scenario')?'/siro-scenario':'/scenario';
        return trim(file_get_contents($this->dir.$file));
    }
    public function create(array $request): array {
        $this->creates++;$this->requests[]=$request;
        if($this->dir) {
            file_put_contents($this->dir.'/siro-fixture-request.json',json_encode($request));
            $file=$this->dir.'/siro-fixture-requests.json';$history=is_file($file)?json_decode(file_get_contents($file),true):[];
            $history[]=$request;file_put_contents($file,json_encode($history));
        }
        if($this->scenario()==='timeout') throw new Failure('SIRO_TIMEOUT');
        if($this->scenario()==='session-error') throw new Failure('SIRO_SESSION');
        $hash=hash('sha256',$request['nro_comprobante']);
        return ['Hash'=>$hash,'Url'=>$this->scenario()==='checkout-error'?'https://evil.invalid/':siroCheckout($hash)];
    }
    public function row(array $request): array {
        $s=$this->scenario();
        if($s==='cancel-next-check' || ($this->dir && is_file($this->dir.'/siro-cancelled-receipt') && trim(file_get_contents($this->dir.'/siro-cancelled-receipt'))===$request['nro_comprobante'])) $s='cancelled';
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
        if($this->dir) $this->requests=json_decode(file_get_contents($this->dir.'/siro-fixture-requests.json'),true);
        if($this->scenario()==='empty') return [];
        $rows=array_map(fn($r)=>$this->row($r),$this->requests);
        if($this->scenario()==='ambiguous') $rows[]=$rows[0];
        return $rows;
    }
    public function result(string $hash,string $id): array {
        if($id!=='11111111-1111-4111-8111-111111111111') throw new Failure('PAYMENT_MISMATCH');
        if($this->dir) $this->requests=json_decode(file_get_contents($this->dir.'/siro-fixture-requests.json'),true);
        foreach($this->requests as $request) if(hash('sha256',$request['nro_comprobante'])===$hash) {
            $row=$this->row($request);
            if($this->dir && $this->scenario()==='cancel-next-check') {
                file_put_contents($this->dir.'/siro-cancelled-receipt',$request['nro_comprobante']);
                file_put_contents($this->dir.'/siro-scenario','normal');
            }
            return $row;
        }
        throw new Failure('PAYMENT_MISMATCH');
    }
}
