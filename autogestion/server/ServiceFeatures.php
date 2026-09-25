<?php
declare(strict_types=1);
namespace MiUsittel;

// Product fields must be confirmed by an operator before being mapped. A missing
// or unfamiliar structure means unknown, never 'not contracted'. No recursive dump.
function serviceProductEntries(array $record,array $config): ?array {
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
            if(!is_string($item)) return null;
            foreach(parseServiceProductText($field,$item,$quantity)??[null] as $entry) {
                if($entry===null) return null;
                if($entry['label']==='WiFi +') continue;
                $out[$entry['field']."\0".($entry['category']??'')."\0".$entry['label']."\0".($entry['quantity']??'')]=$entry;
            }
        }
    }
    return array_values($out);
}
// Only Productos_Otros has a confirmed dated multi-product format. An invalid
// string retains the previous literal-label semantics; it provides no category.
function parseServiceProductText(string $field,string $text,?int $quantity=null): ?array {
    if(strlen($text)>2048 || preg_match('/[<>@\x00-\x1f]|https?:/i',$text)) return null;
    $text=trim($text);if($text==='' || $text==='-') return [];
    if(in_array($field,['Productos_Television','Productos_Otros'],true) && $quantity===null) {
        $segments=explode(';',$text);$parsed=[];$valid=count($segments)<=20;
        foreach($segments as $segment) {
            $segment=trim($segment);if($segment==='') continue;
            if(!preg_match('/\A(\d{1,2})\/(\d{1,2})\/(\d{2}) - ([^;]+?) - (.+)\z/uD',$segment,$m)
                || !checkdate((int)$m[2],(int)$m[1],2000+(int)$m[3])
                || !publicCatalogText(trim($m[4]),80) || !publicCatalogText(trim($m[5]),160)) {$valid=false;break;}
            $label=trim($m[5]);$amount=null;
            if(preg_match('/\A([1-9][0-9]?) (.+)\z/uD',$label,$qty)) {$amount=(int)$qty[1];$label=$qty[2];}
            $parsed[]=['field'=>$field,'category'=>trim($m[4]),'label'=>$label,'quantity'=>$amount];
        }
        if($valid && $parsed!==[]) return $parsed;
    }
    if(!publicCatalogText($text,160)) return null;
    return [['field'=>$field,'category'=>null,'label'=>$text,'quantity'=>$quantity]];
}
function serviceProducts(array $record,array $config): ?array {
    $entries=serviceProductEntries($record,$config);
    if($entries===null) return null;
    $out=[];
    foreach($entries as $entry) {
        if($entry['category']==='IPTV' && $entry['label']==='Abono Básico') continue;
        $label=$entry['category']==='Punto WiFi'?'Punto WiFi - '.$entry['label']:$entry['label'];
        $out[]=$label.($entry['quantity']!==null?' × '.$entry['quantity']:'');
    }
    return array_values(array_unique($out));
}

function serviceCatalog(array $config): array {
    $raw=$config['service_catalog']??[];
    if(!is_array($raw) || array_is_list($raw) && $raw!==[] || count($raw)>30) throw new Failure('SERVICE_CATALOG_CONFIGURATION');
    $out=[];$seenAliases=[];
    foreach($raw as $id=>$entry) {
        if(!is_string($id) || !preg_match('/^[a-z][a-z0-9_]{0,39}$/D',$id) || !is_array($entry) || array_is_list($entry)
            || array_diff(array_keys($entry),['type','public_name','aliases'])) throw new Failure('SERVICE_CATALOG_CONFIGURATION');
        $type=$entry['type']??null;$name=$entry['public_name']??null;$aliases=$entry['aliases']??null;
        if(!in_array($type,['sensa','sensa_pack','stb','mesh'],true) || !publicCatalogText($name,80)
            || !is_array($aliases) || !array_is_list($aliases) || count($aliases)>20) throw new Failure('SERVICE_CATALOG_CONFIGURATION');
        $clean=[];
        foreach($aliases as $alias) {
            if(!publicCatalogText($alias,160) || isset($seenAliases[$alias])) throw new Failure('SERVICE_CATALOG_CONFIGURATION');
            $seenAliases[$alias]=true;$clean[]=$alias;
        }
        $out[$id]=['type'=>$type,'public_name'=>$name,'aliases'=>$clean];
    }
    return $out;
}
function publicCatalogText(mixed $value,int $max): bool {
    return is_string($value) && $value!=='' && strlen($value)<=$max && trim($value)===$value
        && !preg_match('/[<>@\x00-\x1f]|https?:/i',$value);
}
function productLabelParts(string $value): array {
    if(preg_match('/\A(.+?) × ([1-9][0-9]?)\z/u',$value,$match)) return ['label'=>$match[1],'quantity'=>(int)$match[2]];
    return ['label'=>$value,'quantity'=>null];
}
function serviceProductState(?array $products,array $config,?array $entries=null): array {
    if($products===null) return ['known'=>false,'items'=>[],'ids'=>[]];
    $catalog=serviceCatalog($config);$byAlias=[];
    foreach($catalog as $id=>$entry) foreach($entry['aliases'] as $alias) $byAlias[$alias]=$id;
    $known=[];$unknown=[];$ids=[];$derivedSensaId=null;
    foreach($products as $value) {
        if(!is_string($value)) throw new Failure('SERVICE_CATALOG_CONFIGURATION');
        $parts=productLabelParts($value);
        if($parts['label']==='WiFi +') continue;
        $id=$byAlias[$parts['label']]??null;
        if($id===null) {
            $item=['label'=>$parts['label'],'quantity'=>$parts['quantity']];
            if(!isset($unknown[$parts['label']]) || ($item['quantity']??0)>($unknown[$parts['label']]['quantity']??0)) $unknown[$parts['label']]=$item;
            continue;
        }
        $ids[$id]=true;$item=['label'=>$catalog[$id]['public_name'],'quantity'=>$parts['quantity']];
        if(!isset($known[$id]) || ($item['quantity']??0)>($known[$id]['quantity']??0)) $known[$id]=$item;
    }
    // Exact administrative category, confirmed by USITTEL as SENSA evidence.
    // This sidecar is never added to the raw public products list.
    if($entries!==null) foreach($entries as $entry) {
        if(!in_array($entry['field']??null,['Productos_Television','Productos_Otros'],true) || ($entry['category']??null)!=='IPTV') continue;
        foreach($catalog as $id=>$definition) if($definition['type']==='sensa') {
            $ids[$id]=true;
            $derivedSensaId=$id;
            $known[$id]=['label'=>$definition['public_name'],'quantity'=>null];
            unset($unknown[$definition['public_name']]);
        }
    }
    if($derivedSensaId!==null && isset($known[$derivedSensaId])) $known=[$derivedSensaId=>$known[$derivedSensaId]]+$known;
    return ['known'=>true,'items'=>array_values([...$known,...$unknown]),'ids'=>array_keys($ids)];
}
function commercialCatalog(array $config): array {
    $raw=$config['commercial_catalog']??[];
    if(!is_array($raw) || !array_is_list($raw) || count($raw)>40) throw new Failure('COMMERCIAL_CONFIGURATION');
    $out=[];$ids=[];
    foreach($raw as $entry) {
        $allowed=['id','type','public_name','description','price_monthly','price_once','currency','requires','excludes','enabled','current_plans','target_speed'];
        if(!is_array($entry) || array_is_list($entry) || array_diff(array_keys($entry),$allowed)) throw new Failure('COMMERCIAL_CONFIGURATION');
        $id=$entry['id']??null;$type=$entry['type']??null;$monthly=$entry['price_monthly']??null;$once=$entry['price_once']??null;
        if(!is_string($id) || !preg_match('/^[a-z][a-z0-9_]{0,39}$/D',$id) || isset($ids[$id])
            || !in_array($type,['sensa','sensa_pack','stb','mesh','speed'],true)
            || !publicCatalogText($entry['public_name']??null,100) || !publicCatalogText($entry['description']??null,240)
            || ($entry['currency']??null)!=='ARS' || !is_bool($entry['enabled']??null)
            || !validCommercialPrice($monthly) || !validCommercialPrice($once) || ($monthly===null && $once===null)
            || !validCatalogIds($entry['requires']??null) || !validCatalogIds($entry['excludes']??null)) throw new Failure('COMMERCIAL_CONFIGURATION');
        $plans=$entry['current_plans']??[];$target=$entry['target_speed']??null;
        if(!is_array($plans) || array_is_list($plans) && $plans!==[] || count($plans)>30) throw new Failure('COMMERCIAL_CONFIGURATION');
        foreach($plans as $label=>$speed) if(!publicCatalogText($label,160) || !is_int($speed) || $speed<1 || $speed>100000) throw new Failure('COMMERCIAL_CONFIGURATION');
        if($type==='speed' && (!is_int($target) || $target<1 || $target>100000)) throw new Failure('COMMERCIAL_CONFIGURATION');
        if($type!=='speed' && ($plans!==[] || $target!==null)) throw new Failure('COMMERCIAL_CONFIGURATION');
        $ids[$id]=true;$out[]=$entry;
    }
    return $out;
}
function validCommercialPrice(mixed $value): bool {return $value===null || is_int($value) && $value>0 && $value<100000000;}
function validCatalogIds(mixed $ids): bool {
    if(!is_array($ids) || !array_is_list($ids) || count($ids)>15) return false;
    foreach($ids as $id) if(!is_string($id) || !preg_match('/^[a-z][a-z0-9_]{0,39}$/D',$id)) return false;
    return count($ids)===count(array_unique($ids));
}
function commercialOffers(?string $plan,?array $products,array $config,?array $entries=null): array {
    $catalog=serviceCatalog($config);$state=serviceProductState($products,$config,$entries);$contracted=array_fill_keys($state['ids'],true);$offers=[];
    $relevantProducts=$products===null?null:array_values(array_filter($products,fn($value)=>productLabelParts($value)['label']!=='WiFi +'));
    $iptv=false;
    if($entries!==null) foreach($entries as $entry) if(in_array($entry['field']??null,['Productos_Television','Productos_Otros'],true) && ($entry['category']??null)==='IPTV') $iptv=true;
    foreach(commercialCatalog($config) as $offer) {
        if($offer['enabled']!==true) continue;
        if($offer['type']==='speed') {
            $current=is_string($plan)?($offer['current_plans'][$plan]??null):null;
            if(!is_int($current) || $offer['target_speed']<=$current) continue;
        } else {
            if(!$state['known']) continue;
            $references=array_unique([...$offer['requires'],...$offer['excludes']]);$evidence=true;
            foreach($references as $id) {
                if(!isset($catalog[$id]) || ($relevantProducts!==[] && $catalog[$id]['aliases']===[] && !($iptv && $catalog[$id]['type']==='sensa'))) {$evidence=false;break;}
            }
            if(!$evidence) continue;
            foreach($offer['requires'] as $id) if(!isset($contracted[$id])) {$evidence=false;break;}
            foreach($offer['excludes'] as $id) if(isset($contracted[$id])) {$evidence=false;break;}
            if(!$evidence) continue;
        }
        $offers[]=['id'=>$offer['id'],'type'=>$offer['type'],'public_name'=>$offer['public_name'],'description'=>$offer['description'],
            'price_monthly'=>$offer['price_monthly'],'price_once'=>$offer['price_once'],'currency'=>$offer['currency']];
    }
    return $offers;
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
// Read-only operator output: only public labels from the two confirmed fields.
function inspectPublicProductLabels(array $record): array {
    $out=[];
    foreach(['Productos_Television','Productos_Otros'] as $field) {
        if(!array_key_exists($field,$record)) continue;
        $value=$record[$field];$items=is_string($value)?[$value]:(is_array($value)&&array_is_list($value)?$value:[]);
        foreach(array_slice($items,0,20) as $item) {
            $quantity=null;$label=$item;
            if(is_array($item) && !array_is_list($item)) {
                $label=$item['Nombre']??$item['Descripcion']??$item['Producto']??$item['Nombre_Producto']??null;
                $rawQuantity=$item['Cantidad']??null;
                if(is_int($rawQuantity) || is_string($rawQuantity) && ctype_digit($rawQuantity)) {
                    $number=(int)$rawQuantity;if($number>=1 && $number<=99) $quantity=$number;
                }
            }
            if(!is_string($label)) continue;
            foreach(parseServiceProductText($field,$label,$quantity)??[] as $entry) if($entry['label']!=='WiFi +') $out[]=$entry;
        }
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
