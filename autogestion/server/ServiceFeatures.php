<?php
declare(strict_types=1);
namespace MiUsittel;

// Product fields must be confirmed by an operator before being mapped. A missing
// or unfamiliar structure means unknown, never 'not contracted'. No recursive dump.
function serviceProducts(array $record,array $config): ?array {
    $fields=$config['service_product_fields']??[];
    $allowed=['Productos_Television','Producto_Television','Productos_Telefonia','Producto_Telefonia','Productos_Otros'];
    if(!is_array($fields) || !array_is_list($fields) || !$fields || array_diff($fields,$allowed)) return null;
    $out=[];
    foreach($fields as $field) {
        if(!array_key_exists($field,$record)) return null;
        $value=$record[$field];
        if($value===null || $value==='') continue;
        $items=is_string($value)?[$value]:$value;
        if(!is_array($items) || !array_is_list($items) || count($items)>20) return null;
        foreach($items as $item) {
            if(!is_string($item) || strlen($item)>160 || preg_match('/[<>@\x00-\x1f]|https?:/i',$item)) return null;
            $item=trim($item);if($item==='' || $item==='-') continue;
            $out[]=$item;
        }
    }
    return array_values(array_unique($out));
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
