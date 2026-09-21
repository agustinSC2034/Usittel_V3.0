<?php
declare(strict_types=1);
namespace MiUsittel;

// Product fields must be confirmed by an operator before being mapped. A missing
// or unfamiliar structure means unknown, never 'not contracted'. No recursive dump.
function serviceProducts(array $record,array $config): ?array {
    $fields=$config['service_product_fields']??[];
    // USITTEL no ofrece telefonía desde Mi USITTEL; ese campo nunca se mapea a la UI.
    $allowed=['Productos_Television','Producto_Television','Productos_Otros','Producto_Otros','Otros_Servicios','Servicios_Otros','Adicionales','Productos_Adicionales','Producto_Adicional','Set_Top_Box','STB'];
    if(!is_array($fields) || !array_is_list($fields) || !$fields || count($fields)>15) return null;
    $out=[];
    foreach($fields as $mapping) {
        $field=is_string($mapping)?$mapping:(is_array($mapping)?($mapping['field']??null):null);
        if(!is_string($field) || !in_array($field,$allowed,true)) return null;
        $labelKey=null;$quantityKey=null;
        if(is_array($mapping)) {
            if(array_diff(array_keys($mapping),['field','label','quantity']) || !in_array($mapping['label']??null,['Nombre','Descripcion','Producto','Nombre_Producto'],true)) return null;
            $labelKey=$mapping['label'];$quantityKey=$mapping['quantity']??null;
            if($quantityKey!==null && $quantityKey!=='Cantidad') return null;
        }
        if(!array_key_exists($field,$record)) return null;
        $value=$record[$field];
        if($value===null || $value==='') continue;
        $items=is_string($value)?[$value]:$value;
        if(!is_array($items) || !array_is_list($items) || count($items)>20) return null;
        foreach($items as $item) {
            $quantity=null;
            if($labelKey!==null) {
                if(!is_array($item) || array_is_list($item)) return null;
                if($quantityKey!==null) {
                    $quantity=$item[$quantityKey]??null;
                    if(!(is_int($quantity) || is_string($quantity) && ctype_digit($quantity)) || (int)$quantity<1 || (int)$quantity>99) return null;
                    $quantity=(int)$quantity;
                }
                $item=$item[$labelKey]??null;
            }
            if(!is_string($item) || strlen($item)>160 || preg_match('/[<>@\x00-\x1f]|https?:/i',$item)) return null;
            $item=trim($item);if($item==='' || $item==='-') continue;
            $out[]=$item.($quantity!==null?' × '.$quantity:'');
        }
    }
    return array_values(array_unique($out));
}

// Shape only, no product values, network secrets, personal identifiers or recursion into customers.
function serviceFeatureShape(mixed $value,int $depth=0): array {
    $out=['type'=>get_debug_type($value),'nonempty'=>$value!==null && $value!=='' && $value!==[]];
    if(!is_array($value)) return $out;
    $out+=['list'=>array_is_list($value),'count'=>count($value)];
    if($depth>=2) return $out;
    if(array_is_list($value)) $out['sample']=array_map(fn($v)=>serviceFeatureShape($v,$depth+1),array_slice($value,0,2));
    else {
        foreach(['ID','Nombre','Descripcion','Producto','Nombre_Producto','Cantidad','Estado','Importe'] as $key)
            if(array_key_exists($key,$value)) $out['fields'][$key]=serviceFeatureShape($value[$key],$depth+1);
    }
    return $out;
}
function inspectServiceRecord(array $record): array {
    $keys=['Producto_Internet','Productos_Internet','Producto_Television','Productos_Television','Producto_Telefonia','Productos_Telefonia','Productos_Otros','Producto_Otros','Otros_Servicios','Servicios_Otros','Adicionales','Productos_Adicionales','Set_Top_Box','STB'];
    foreach(array_keys($record) as $key)
        if(is_string($key) && preg_match('/^(?:Producto[s]?|Servicio[s]?|Adicional(?:es)?|Otros|Sensa|STB|Set_Top_Box)(?:[ _][a-zA-Z_ ]{1,45})?$/D',$key)) $keys[]=$key;
    $out=[];
    foreach(array_unique($keys) as $key) $out[$key]=['present'=>array_key_exists($key,$record)]+serviceFeatureShape($record[$key]??null);
    return $out;
}

// Only an operator-configured HTTPS measurement endpoint. This is not a proxy:
// cookies, credentials and subscriber data are never sent to the measurement host.
function speedtestConfig(array $config): ?array {
    $url=$config['speedtest_server']??null;
    if($url===null || $url==='') return null;
    if(!is_string($url) || strlen($url)>300 || !preg_match('~^https://[a-z0-9.-]+(?::443)?/[a-zA-Z0-9/_-]*/?$~D',$url)) throw new Failure('SPEEDTEST_CONFIGURATION');
    $host=parse_url($url,PHP_URL_HOST);
    if(!is_string($host) || !filter_var($host,FILTER_VALIDATE_DOMAIN,FILTER_FLAG_HOSTNAME) || !str_contains($host,'.') || filter_var($host,FILTER_VALIDATE_IP) || preg_match('/(?:^|\.)(localhost|local|internal|invalid)$/D',$host)) throw new Failure('SPEEDTEST_CONFIGURATION');
    $base=rtrim($url,'/').'/';
    return ['base'=>$base,'origin'=>'https://'.$host];
}

function serviceReadLimit(string $key,int $seconds=10): void {
    if(($_SESSION[$key]??0)>time()-$seconds) throw new Failure('SERVICE_RATE_LIMIT',429);
    $_SESSION[$key]=time();
}
