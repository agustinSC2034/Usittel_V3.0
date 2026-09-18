<?php
declare(strict_types=1);
namespace MiUsittel;

// Never print arbitrary response headers: even a path or MIME can contain a token.
function documentProbeRedirect(string $location,string $origin): array {
    $allowed=false;$path=null;
    if(!preg_match('/[\x00-\x20\x7f\\\\]/',$location)) {
        $p=parse_url($location);
        if(is_array($p) && !isset($p['user']) && !isset($p['pass'])) {
            $base=parse_url($origin);
            $allowed=(!isset($p['scheme']) || $p['scheme']==='https')
                && (!isset($p['host']) || strtolower($p['host'])===strtolower($base['host']))
                && ($p['port']??(isset($p['host'])?443:($base['port']??443)))===($base['port']??443);
            $candidate=$p['path']??DOCUMENT_PROBE_PATH;
            if($candidate==='Comprobante_Factura.php') $candidate=DOCUMENT_PROBE_PATH;
            // Known static paths only; unknown paths can themselves be capabilities.
            $safe=[DOCUMENT_PROBE_PATH,'/PHANTOM/index.php','/PHANTOM/login.php','/login','/'];
            if(in_array($candidate,$safe,true)) $path=$candidate;
        }
    }
    return ['allowed'=>$allowed,'path'=>$path??'[omitido: ruta no reconocida]'];
}

function inspectDocumentGet(array $c,string $hash): array {
    $origin=documentProbeOrigin($c['phantom_url']);
    $response=requestInvoiceDocument($c,$hash);
    $headers=$response['headers'];$bytes=$response['size'];$prefix=$response['prefix'];$http=$response['http'];
    $mime=strtolower(trim(explode(';',$headers['content-type']??'',2)[0]));
    $mime=in_array($mime,['application/pdf','text/html','application/xhtml+xml','text/plain','application/octet-stream'],true)?$mime:'no reconocido';
    $length=$headers['content-length']??'';
    $pdf=(bool)preg_match('/^%PDF-[12]\.[0-9]/',$prefix);
    $html=(bool)preg_match('/^(?:\xEF\xBB\xBF)?\s*(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/i',$prefix);
    $redirect=$http>=300 && $http<400;
    $result=['Endpoint'=>'Comprobante_Factura.php','HTTP'=>$http>=100 && $http<=599?$http:0,
        'Content-Type'=>$mime,'Content-Length'=>preg_match('/^[0-9]{1,19}$/D',$length)?$length:'no informado',
        'Bytes recibidos'=>$bytes,'Firma PDF'=>$pdf?'sí':'no',
        'Tipo detectado'=>$bytes===0?'VACÍO':($pdf?'PDF':($html?'HTML':'OTRO')),'Redirect'=>$redirect?'sí':'no'];
    if($redirect) {
        $target=documentProbeRedirect($headers['location']??'', $origin);
        $result['Destino host permitido']=isset($headers['location']) && $target['allowed']?'sí':'no';
        $result['Destino path']=$target['path'];
    }
    return $result;
}

function runInvoiceDocumentProbe(array $c,string $selection): int {
    $stage='autenticacion';$failure=null;$result=null;
    ob_start();set_error_handler(static function(){throw new Failure('PROBE_PHP');});
    try {
        if(PHP_SAPI!=='cli' || $c['mode']!=='phantom' || !in_array(1,$c['allowed_idas'],true)) throw new Failure('CONFIGURATION');
        if($selection!=='--latest' && !preg_match('/^[1-9][0-9]{0,19}$/D',$selection)) throw new Failure('INSPECTOR_ARGUMENTS');
        $token=inspectionAuthGetToken($c);$transport=new CurlTransport($c);$selected=null;$previous=null;$seen=[];
        // Bounded to the two pages already verified for this laboratory (11 rows).
        // Validate both pages before resolving a selected hash; never scan indefinitely.
        $stage='facturas';
        foreach([0,INVOICE_PAGE_SIZE] as $offset) {
            $rows=$transport->post($c['phantom_url'].'?'.http_build_query(['action'=>'Phantom_Ultima_Factura','JSON'=>1,'IDA'=>1,'Limit'=>INVOICE_PAGE_SIZE,'Offset'=>$offset]),['token'=>$token]);
            if((int)($rows['code']??0)===400 && ($rows['message']??null)==='Error: No se encontró factura para el cliente (400)') $rows=[];
            $rows=validateInvoiceRows($rows,INVOICE_PAGE_SIZE);
            foreach($rows as $row) {
                $id=invoiceId($row['IDT']??null);
                if(isset($seen[$id])) throw new Failure('INVOICES_DUPLICATE');
                if($previous!==null && compareInvoiceIds($previous,$id)<=0) throw new Failure('INVOICES_ORDER');
                if(($selection==='--latest' && $previous===null) || $selection===$id) $selected=$row;
                $seen[$id]=true;$previous=$id;
            }
            if(count($rows)<INVOICE_PAGE_SIZE) break;
        }
        if($selected===null) throw new Failure(count($seen)>=20?'INVOICE_PROBE_LIMIT':'INVOICE_NOT_FOUND',404);
        if(!validInvoiceHash($selected['Hash_Descarga']??null)) throw new Failure('DOCUMENT_UNAVAILABLE',404);
        $stage='documento';$result=inspectDocumentGet($c,$selected['Hash_Descarga']);
    } catch(\Throwable $e) {$failure=$e;}
    finally {unset($token,$rows,$selected);restore_error_handler();ob_end_clean();}
    if($failure!==null) return writeInspectorFailure($stage,$failure);
    foreach($result as $key=>$value) echo $key.': '.$value.PHP_EOL;
    return 0;
}
