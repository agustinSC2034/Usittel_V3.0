<?php
declare(strict_types=1);
namespace MiUsittel;
require __DIR__.'/../server/Core.php';
require __DIR__.'/../server/Invoices.php';
require __DIR__.'/../server/PostingVerification.php';
$count=0;
foreach([
    [['IDT'=>'123','Estado'=>'PAGADA'],[],['rest_state'=>'PAGADA','crm_structure'=>'list','crm_records'=>0,'crm_empty'=>true]],
    [['IDT'=>'123','Estado'=>'IMPAGA'],[],['rest_state'=>'IMPAGA','crm_structure'=>'list','crm_records'=>0,'crm_empty'=>true]],
    [['IDT'=>'123','Estado'=>'PAGADA'],['private'=>'secret'],['rest_state'=>'PAGADA','crm_structure'=>'object','crm_records'=>1,'crm_empty'=>false]],
    [['IDT'=>'123','Estado'=>'PAGADA'],[['secret']],['rest_state'=>'PAGADA','crm_structure'=>'list','crm_records'=>1,'crm_empty'=>false]],
    [['IDT'=>'123','IDA'=>2],[],['rest_error'=>'PAYMENT_INVOICE_CHANGED','crm_structure'=>'list','crm_records'=>0,'crm_empty'=>true]],
    [['IDT'=>'999'],[],['rest_error'=>'PAYMENT_INVOICE_CHANGED','crm_structure'=>'list','crm_records'=>0,'crm_empty'=>true]],
] as [$row,$rows,$expected]) {
    if(postingVerificationReport('123',1,fn()=>$row,fn()=>$rows)!==$expected) throw new \RuntimeException('diagnostic mismatch');
    $count++;
}
$result=postingVerificationReport('123',1,fn()=>throw new Failure('PHANTOM_TIMEOUT'),fn()=>throw new Failure('PHANTOM_CRM_FORMAT'));
if($result!==['rest_error'=>'PHANTOM_TIMEOUT','crm_error'=>'PHANTOM_CRM_FORMAT']) throw new \RuntimeException('diagnostic error mismatch');
echo $count+1;
