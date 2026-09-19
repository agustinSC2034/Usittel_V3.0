<?php
declare(strict_types=1);
namespace MiUsittel;

// CLI-only consumer. Literal field allowlists: never enumerate arbitrary keys or values.
function serviceFieldMetadata(array $record,string $field): array {
    return ['present'=>array_key_exists($field,$record),'type'=>array_key_exists($field,$record)?get_debug_type($record[$field]):'absent'];
}
function serviceAssociationShape(mixed $value,int $depth=0): array {
    $out=['type'=>get_debug_type($value)];
    if(is_string($value)) {
        $out['empty']=$value==='';
        $out['length_bucket']=match(true) {strlen($value)===0=>'0',strlen($value)<=10=>'1-10',strlen($value)<=50=>'11-50',default=>'>50'};
        $out['decimal_id']=preg_match('/^[1-9][0-9]{0,9}$/D',$value)===1;
        $out['looks_like_json']=preg_match('/^\s*[\[{]/',$value)===1;
        $out['separator']=match(true) {str_contains($value,';')=>'semicolon',str_contains($value,',')=>'comma',str_contains($value,'|')=>'pipe',default=>'none'};
        if($out['looks_like_json']) {
            try {$decoded=json_decode($value,true,4,JSON_THROW_ON_ERROR);$out['decoded']=serviceAssociationShape($decoded,$depth+1);}
            catch(\JsonException) {$out['decoded']=['type'=>'invalid_json'];}
        }
        return $out;
    }
    if(!is_array($value)) return $out;
    $out['structure']=array_is_list($value)?'list':'object';$out['count']=count($value);
    if(array_is_list($value)) {
        if($depth<2) $out['sample']=array_map(fn($v)=>serviceAssociationShape($v,$depth+1),array_slice($value,0,3));
    } else {
        foreach(['ID','IDA','IDAx','Id','id','Direccion','Dir_Numero','Producto_Internet'] as $key) $out['fields'][$key]=serviceFieldMetadata($value,$key);
    }
    return $out;
}
function normalizedIdentityDocument(mixed $value): ?string {
    if(!is_string($value) || $value==='' || preg_match('/^[0-9 .-]+$/D',$value)!==1) return null;
    $digits=preg_replace('/\D/','',$value);
    return in_array(strlen($digits),[7,8,11],true)?$digits:null;
}
function validCuit(string $value): bool {
    if(!preg_match('/^[0-9]{11}$/D',$value)) return false;
    $sum=0;foreach([5,4,3,2,7,6,5,4,3,2] as $i=>$weight) $sum+=(int)$value[$i]*$weight;
    $check=11-($sum%11);if($check===11)$check=0;elseif($check===10)$check=9;
    return $check===(int)$value[10];
}
function documentKind(?string $value): string {
    if($value===null) return 'unavailable';
    if(strlen($value)<=8) return 'dni';
    if(!validCuit($value)) return 'cuit_invalid';
    return in_array(substr($value,0,2),['20','23','24','27'],true)?'personal_cuit':'other_cuit';
}
function documentsEquivalent(?string $a,?string $b): bool {
    if($a===null || $b===null) return false;
    if($a===$b) return true;
    $dni=strlen($a)<=8?$a:(strlen($b)<=8?$b:null);$cuit=strlen($a)===11?$a:(strlen($b)===11?$b:null);
    if($dni===null || $cuit===null || documentKind($cuit)!=='personal_cuit') return false;
    return str_pad($dni,8,'0',STR_PAD_LEFT)===substr($cuit,2,8);
}
function recordDocuments(array $record): array {
    $out=[];foreach(['Documento','DNI','dni','Cuit','CUIT','Cuit_Cuil'] as $field) {
        $value=normalizedIdentityDocument($record[$field]??null);if($value!==null)$out[$field]=$value;
    }
    return $out;
}
function documentSearchDiagnostics(array $rows,string $source): array {
    $report=['structure'=>array_is_list($rows)?'list':'object','records'=>array_is_list($rows)?count($rows):null,
        'valid_objects'=>0,'unique_ids'=>0,'document_matches'=>0,'ambiguous'=>true,'candidates'=>[]];
    if(!array_is_list($rows) || count($rows)>20) return $report;
    $ids=[];
    foreach($rows as $row) {
        $entry=['object'=>is_array($row)&&!array_is_list($row),'ID_present'=>false,'ID_type'=>'absent','document_match'=>false,
            'address_present'=>false,'plan_present'=>false];
        if($entry['object']) {
            $report['valid_objects']++;$entry['ID_present']=array_key_exists('ID',$row);$entry['ID_type']=$entry['ID_present']?get_debug_type($row['ID']):'absent';
            if(is_string($row['ID']??null)&&preg_match('/^[1-9][0-9]{0,9}$/D',$row['ID']))$ids[$row['ID']]=true;
            foreach(recordDocuments($row) as $candidate) if(documentsEquivalent($source,$candidate)){$entry['document_match']=true;break;}
            $entry['address_present']=textValue($row['Direccion']??null)!==null;$entry['plan_present']=textValue($row['Producto_Internet']??null)!==null;
            if($entry['document_match'])$report['document_matches']++;
        }
        if(count($report['candidates'])<10)$report['candidates'][]=$entry;
    }
    $report['unique_ids']=count($ids);
    $report['ambiguous']=$report['records']!==$report['valid_objects'] || $report['unique_ids']!==$report['records'] || $report['document_matches']!==$report['records'];
    return $report;
}
function serviceRootDiagnostics(array $root): array {
    $out=['association'=>serviceFieldMetadata($root,'Conexiones_Asociadas')];
    if(array_key_exists('Conexiones_Asociadas',$root)) $out['association']['shape']=serviceAssociationShape($root['Conexiones_Asociadas']);
    foreach(['Documento','DNI','dni','Cuit','CUIT','Cuit_Cuil'] as $field) $out['document_fields'][$field]=serviceFieldMetadata($root,$field);
    return $out;
}
