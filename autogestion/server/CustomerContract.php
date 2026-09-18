<?php
declare(strict_types=1);
namespace MiUsittel;

function identityMatches(mixed $value,int $ida): bool {
    // IDs must be decimal strings; no float coercion, trimming or ID/IDAx fallback.
    return is_string($value) && preg_match('/^[0-9]{1,10}$/D',$value)===1
        && (ltrim($value,'0')?:'0')===(string)$ida;
}
function resolveCustomerRecord(array $rows,int $ida,string $field): array {
    if($ida<1 || $ida>9999999999 || $field!=='ID') throw new Failure('FORBIDDEN',403);
    if(!array_is_list($rows) || count($rows)!==1) throw new Failure('CUSTOMER_IDENTITY');
    $record=$rows[0];
    if(!is_array($record) || array_is_list($record) || !identityMatches($record[$field]??null,$ida)) throw new Failure('CUSTOMER_IDENTITY');
    return $record;
}
function inspectCustomerIdentity(array $rows,int $ida): array {
    $list=array_is_list($rows);
    $report=['structure'=>$list?'array':'object','records'=>$list?count($rows):null,'single_object'=>false];
    // Never enumerate multiple records or return identity/credential values.
    if(!$list || count($rows)!==1 || !is_array($rows[0]) || array_is_list($rows[0])) return $report;
    $report['single_object']=true;$record=$rows[0];
    foreach(['ID','IDAx','Autogestion_User','Autogestion_Pass'] as $key) {
        $present=array_key_exists($key,$record);
        $entry=['present'=>$present,'type'=>$present?get_debug_type($record[$key]):'absent'];
        if(in_array($key,['ID','IDAx'],true)) $entry['matches_requested_ida']=$present && identityMatches($record[$key],$ida);
        $report[$key]=$entry;
    }
    return $report;
}
