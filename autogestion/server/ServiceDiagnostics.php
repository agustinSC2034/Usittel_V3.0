<?php
declare(strict_types=1);
namespace MiUsittel;

// CLI-only consumer. Literal field allowlists: never enumerate arbitrary keys or values.
function serviceFieldMetadata(array $record,string $field): array {
    return ['present'=>array_key_exists($field,$record),'type'=>array_key_exists($field,$record)?get_debug_type($record[$field]):'absent'];
}
function serviceAssociationShape(mixed $value,int $depth=0): array {
    $out=['type'=>get_debug_type($value)];
    if(!is_array($value)) return $out;
    $out['structure']=array_is_list($value)?'list':'object';$out['count']=count($value);
    if(array_is_list($value)) {
        if($depth<2) $out['sample']=array_map(fn($v)=>serviceAssociationShape($v,$depth+1),array_slice($value,0,3));
    } else {
        foreach(['ID','IDA','IDAx','Id','id','Direccion','Dir_Numero','Producto_Internet'] as $key) $out['fields'][$key]=serviceFieldMetadata($value,$key);
    }
    return $out;
}
function serviceRootDiagnostics(array $root): array {
    $out=['association'=>serviceFieldMetadata($root,'Conexiones_Asociadas')];
    if(array_key_exists('Conexiones_Asociadas',$root)) $out['association']['shape']=serviceAssociationShape($root['Conexiones_Asociadas']);
    foreach(['Documento','DNI','dni','Cuit','CUIT','Cuit_Cuil'] as $field) $out['document_fields'][$field]=serviceFieldMetadata($root,$field);
    return $out;
}
