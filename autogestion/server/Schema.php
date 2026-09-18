<?php
declare(strict_types=1);
namespace MiUsittel;

// Structural diagnostics only; never return response values.
function inspectionShape(mixed $value,int &$remaining,int $depth=0): mixed {
    if(!is_array($value)) return get_debug_type($value);
    if($depth>=4 || $remaining<=0) return ['type'=>array_is_list($value)?'array':'object','truncated'=>true];
    if(array_is_list($value)) return ['type'=>'array','items'=>$value===[]?'unknown':inspectionShape($value[0],$remaining,$depth+1)];
    $fields=[];
    foreach($value as $key=>$child) {
        if($remaining--<=0) break;
        if(!is_string($key) || !preg_match('/^[A-Za-z_][A-Za-z_0-9]*$/D',$key)) continue;
        if(preg_match('/(?:^|_)(?:autogestion|pass(?:word)?|token|secret|hash|url|link|archivo|documento|pdf|dni|cuit|cuil|tarjeta|cbu|alias)(?:_|$)|conexiones_asociadas/i',$key)) continue;
        $fields[$key]=inspectionShape($child,$remaining,$depth+1);
    }
    return ['type'=>'object','fields'=>$fields];
}
