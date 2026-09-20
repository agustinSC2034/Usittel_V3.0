<?php
declare(strict_types=1);
namespace MiUsittel;
if(PHP_SAPI!=='cli' || getenv('MI_USITTEL_TEST')!=='1') exit(2);
require_once __DIR__.'/../server/PaymentHistory.php';

$count=0;
function expect(bool $condition): void {global $count;if(!$condition)throw new \RuntimeException('payment history fixture failed');$count++;}
function fails(string $kind,callable $fn): void {global $count;try{$fn();throw new \RuntimeException('failure expected');}catch(Failure $e){if($e->kind!==$kind)throw $e;$count++;}}
function item(string $id,string $amount,string $period,string $date,string $method,string $capability): string {
    return '<div class="timeline-item"><div class="timeline-icon"></div><div class="timeline-text"><div class="sidebar-left-small">'
        .'<h3 class="title"><span>PAGO</span></h3><h3 class="title">$ '.$amount.'</h3><em><strong>'.$period.'</strong></em></div>'
        .'<div class="sidebar-right-big"><div class="sidebar-left-big"><p>Fecha de Pago: '.$date.'<br>Comprobante: (P) '.$id.'<br>Medio de Pago: '.$method.'<br></p></div>'
        .'<div><a onclick="window.open(\'../../CRM/Comprobante_Pago.php?IDT='.$capability.'\');" class="button button-red button-round">Descargar</a></div></div></div></div>';
}
$cap=base64_encode('0123456789abcdef');$other=base64_encode('fedcba9876543210');
$html='<!doctype html><html><body><div class="pageapp-timeline-2">'.item('00053321','121.00','2026-09','2026-09-16','Siro',$cap).item('00052001','8750,50','2026-08','2026-08-10','Efectivo',$other).'</div></body></html>';
$rows=paymentHistoryRows($html);
expect(count($rows)===2);expect($rows[0]['id']==='00053321');expect($rows[0]['cents']===12100);expect($rows[1]['cents']===875050);expect($rows[1]['method']==='Efectivo');expect($rows[0]['capability']===$cap);
$public=publicPaymentHistory($rows);expect($public[0]['id']==='00053321');expect($public[0]['period']==='2026-09');expect($public[0]['date']==='2026-09-16');expect($public[0]['amount']==121.0);expect($public[0]['method']==='Siro');expect($public[0]['downloadAvailable']===true);
expect(!str_contains(json_encode($public,JSON_THROW_ON_ERROR),$cap));
fails('PAYMENT_HISTORY_DUPLICATE',fn()=>paymentHistoryRows('<html><body>'.item('1','1.00','2026-09','2026-09-16','Siro',$cap).item('1','1.00','2026-09','2026-09-17','Efectivo',$other).'</body></html>'));
fails('PAYMENT_HISTORY_SCHEMA',fn()=>paymentHistoryRows('<html><body>'.item('1','1.00','2026-09','2026-09-16','Siro','arbitrary').'</body></html>'));
fails('PAYMENT_HISTORY_SCHEMA',fn()=>paymentHistoryRows('<html><body>'.item('1','1.00','2026-09','2026-09-16','<script>alert(1)</script>',$cap).'</body></html>'));
fails('PAYMENT_HISTORY_SCHEMA',fn()=>paymentHistoryRows('<html><body>'.str_replace('Comprobante: (P)','Otra etiqueta:',item('1','1.00','2026-09','2026-09-16','Siro',$cap)).'</body></html>'));
fails('PAYMENT_HISTORY_FORMAT',fn()=>paymentHistoryRows(''));
expect(PAYMENT_RECEIPT_PATH==='/PHANTOM/Includes/CRM/Comprobante_Pago.php');
echo 'PAYMENT_HISTORY_CHECKS='.$count;
