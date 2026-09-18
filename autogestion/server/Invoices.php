<?php
declare(strict_types=1);
namespace MiUsittel;

const INVOICE_PAGE_SIZE=10;
const INVOICE_MAX_OFFSET=100000;

function invoiceId(mixed $value): string {
    if(!(is_string($value) || is_int($value)) || !preg_match('/^[0-9]{1,20}$/D',(string)$value)) throw new Failure('INVOICES_SCHEMA');
    $id=ltrim((string)$value,'0');
    if($id==='') throw new Failure('INVOICES_SCHEMA');
    return $id;
}
function compareInvoiceIds(string $a,string $b): int {
    return strlen($a)<=>strlen($b) ?: strcmp($a,$b);
}
function validateInvoiceRows(array $rows,int $limit,int $ida=1): array {
    if(!array_is_list($rows) || count($rows)>$limit) throw new Failure('INVOICES_SCHEMA');
    $previous=null;$seen=[];
    foreach($rows as $row) {
        if(!is_array($row) || array_is_list($row)) throw new Failure('INVOICES_SCHEMA');
        $id=invoiceId($row['IDT']??null);
        if(isset($seen[$id])) throw new Failure('INVOICES_DUPLICATE');
        if($previous!==null && compareInvoiceIds($previous,$id)<=0) throw new Failure('INVOICES_ORDER');
        // If Phantom supplies an owner, never ignore a contradictory owner.
        if(array_key_exists('IDA',$row) && !in_array($row['IDA'],[$ida,(string)$ida],true)) throw new Failure('INVOICE_OWNERSHIP');
        $previous=$id;$seen[$id]=true;
    }
    return $rows;
}
function publicInvoice(array $row): array {
    return ['id'=>invoiceId($row['IDT']??null),'period'=>textValue($row['Periodo']??null),
        'amount'=>amount($row['Total']??null),'detail'=>textValue($row['Detalle']??null),
        'due'=>dateValue($row['Primer_Vto']??null),'secondDue'=>dateValue($row['Segundo_Vto']??null),
        'status'=>match($row['Estado']??null) {'PAGADA'=>'Pagada','IMPAGA'=>'Pendiente',default=>'No disponible'},
        'type'=>textValue($row['Tipo']??null),'number'=>textValue($row['Comp_ID']??null),
        'paidAt'=>null,'outstanding'=>null,'downloadAvailable'=>false];
}
function invoicePage(array $rows,int $offset,int $ida=1): array {
    $rows=validateInvoiceRows($rows,INVOICE_PAGE_SIZE,$ida);
    $end=count($rows)<INVOICE_PAGE_SIZE;
    return ['items'=>array_map(__NAMESPACE__.'\\publicInvoice',$rows),'offset'=>$offset,'limit'=>INVOICE_PAGE_SIZE,
        'nextOffset'=>$end || $offset>=INVOICE_MAX_OFFSET?null:$offset+INVOICE_PAGE_SIZE,
        'endReached'=>$end,'historyComplete'=>false];
}
function checkInvoiceOffset(int $offset): void {
    if($offset<0 || $offset>INVOICE_MAX_OFFSET || $offset%INVOICE_PAGE_SIZE!==0) throw new Failure('BAD_REQUEST',400);
    if($offset!==0 && $offset!==($_SESSION['invoice_history']['nextOffset']??null)
        && !isset($_SESSION['invoice_history']['pages'][$offset])) throw new Failure('INVOICE_PAGE_SEQUENCE',409);
}
function rememberInvoicePage(array $page): array {
    $offset=$page['offset'];$ids=array_column($page['items'],'id');
    $state=$offset===0?['pages'=>[],'positions'=>[]]:($_SESSION['invoice_history']??['pages'=>[],'positions'=>[]]);
    if($offset!==0) {
        $previous=$state['pages'][$offset-INVOICE_PAGE_SIZE]??null;
        if($previous===null || count($previous)!==INVOICE_PAGE_SIZE) throw new Failure('INVOICE_PAGE_SEQUENCE',409);
        if($ids!==[] && compareInvoiceIds(end($previous),$ids[0])<=0) throw new Failure('INVOICE_HISTORY_CHANGED',409);
        if(isset($state['pages'][$offset]) && $state['pages'][$offset]!==$ids) throw new Failure('INVOICE_HISTORY_CHANGED',409);
        foreach($ids as $id) if(isset($state['positions'][$id]) && intdiv($state['positions'][$id],INVOICE_PAGE_SIZE)*INVOICE_PAGE_SIZE!==$offset) throw new Failure('INVOICE_HISTORY_CHANGED',409);
    }
    $state['pages'][$offset]=$ids;
    foreach($ids as $index=>$id) $state['positions'][$id]=$offset+$index;
    // A retry of an older page must not erase the continuation of a newer page.
    if($offset===0 || $offset>=($state['lastOffset']??0)) {
        $state['nextOffset']=$page['nextOffset'];$state['lastOffset']=$offset;$state['endReached']=$page['endReached'];
    }
    $_SESSION['invoice_history']=$state;
    return $page;
}
function authorizedInvoice(Phantom $phantom,int $ida,string $id): array {
    if(($_SESSION['selected_ida']??null)!==$ida || !in_array((string)$ida,array_column($_SESSION['authorized_services']??[],'id'),true)) throw new Failure('FORBIDDEN',403);
    if(!preg_match('/^[1-9][0-9]{0,19}$/D',$id)) throw new Failure('BAD_REQUEST',400);
    $position=$_SESSION['invoice_history']['positions'][$id]??null;
    if(!is_int($position)) throw new Failure('INVOICE_NOT_FOUND',404);
    // Re-read exactly one position for this session's IDA. Never scan other clients
    // or trust an IDT/hash supplied by the browser as proof of ownership.
    $rows=$phantom->invoiceRows($ida,$position,1);
    if(count($rows)!==1 || invoiceId($rows[0]['IDT']??null)!==$id) throw new Failure('INVOICE_HISTORY_CHANGED',409);
    return $rows[0];
}
