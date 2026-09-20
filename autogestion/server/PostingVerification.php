<?php
declare(strict_types=1);
namespace MiUsittel;

// Read-only diagnostics: never infer settlement from the account balance.
function postingVerificationReport(string $idt,int $ida,callable $invoice,callable $crm): array {
    $report=[];
    try {
        $row=$invoice();
        if(invoiceId($row['IDT']??null)!==$idt || (isset($row['IDA']) && !in_array($row['IDA'],[$ida,(string)$ida],true))) throw new Failure('PAYMENT_INVOICE_CHANGED');
        $report['rest_state']=in_array($row['Estado']??null,['IMPAGA','PAGADA'],true)?$row['Estado']:'UNKNOWN';
    } catch(Failure $error) {$report['rest_error']=$error->kind;}
    catch(\Throwable) {$report['rest_error']='UNEXPECTED';}
    try {
        $rows=$crm();
        $report['crm_structure']=array_is_list($rows)?'list':'object';
        $report['crm_records']=count($rows);
        $report['crm_empty']=$rows===[];
    } catch(Failure $error) {$report['crm_error']=$error->kind;}
    catch(\Throwable) {$report['crm_error']='UNEXPECTED';}
    return $report;
}
