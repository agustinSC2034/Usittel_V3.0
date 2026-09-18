<?php
declare(strict_types=1);
namespace MiUsittel;

const DOCUMENT_PROBE_PATH='/PHANTOM/Includes/CRM/Comprobante_Factura.php';

function documentProbeOrigin(string $url): string {
    $p=parse_url($url);
    if(!$p || ($p['scheme']??null)!=='https' || empty($p['host']) || isset($p['user']) || isset($p['pass']) || isset($p['fragment'])) throw new Failure('CONFIGURATION');
    return 'https://'.$p['host'].(isset($p['port'])?':'.$p['port']:'');
}

function requestInvoiceDocument(array $c,string $hash,bool $retainBody=false): array {
    if(!validInvoiceHash($hash)) throw new Failure('DOCUMENT_UNAVAILABLE',404);
    $origin=documentProbeOrigin($c['phantom_url']);
    $url=$origin.DOCUMENT_PROBE_PATH.'?'.http_build_query(['IDT'=>$hash],'','&',PHP_QUERY_RFC3986);
    $ca=null;
    if($c['ca_file']!==null && (($ca=realpath($c['ca_file']))===false || !is_file($ca) || !is_readable($ca))) throw new Failure('PHANTOM_CA_FILE');
    $headers=[];$headerBytes=0;$bytes=0;$prefix='';$body='';$tooLarge=false;$ch=null;
    set_error_handler(static function(){throw new Failure('PHANTOM_CURL_RUNTIME');});
    try {
        $ch=curl_init($url);
        if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
        $options=[CURLOPT_HTTPGET=>true,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
            CURLOPT_VERBOSE=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
            CURLOPT_CONNECTTIMEOUT=>$c['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$c['timeout_seconds'],
            CURLOPT_HTTPHEADER=>['Accept: application/pdf, text/html;q=0.9, */*;q=0.1','Accept-Encoding: identity'],
            CURLOPT_HEADERFUNCTION=>static function($handle,string $line) use (&$headers,&$headerBytes,&$tooLarge) {
                $headerBytes+=strlen($line);
                if($headerBytes>32768) {$tooLarge=true;return 0;}
                if(preg_match('/^HTTP\//',$line)) $headers=[];
                elseif(str_contains($line,':')) {
                    [$key,$value]=explode(':',$line,2);$key=strtolower(trim($key));
                    if(in_array($key,['content-type','content-length','location'],true)) $headers[$key]=trim($value);
                }
                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION=>static function($handle,string $chunk) use (&$bytes,&$prefix,&$tooLarge,&$body,$retainBody) {
                $bytes+=strlen($chunk);
                if($bytes>INVOICE_PDF_MAX_BYTES) {$tooLarge=true;return 0;}
                if($retainBody) $body.=$chunk;
                if(strlen($prefix)<1024) $prefix.=substr($chunk,0,1024-strlen($prefix));
                return strlen($chunk);
            }];
        if($ca!==null) $options[CURLOPT_CAINFO]=$ca;
        if(!curl_setopt_array($ch,$options)) throw new Failure('PHANTOM_CURL_SETUP');
        $ok=curl_exec($ch);$http=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);
        if($tooLarge) throw new Failure('DOCUMENT_SIZE');
        if($ok===false) throw new Failure(CurlTransport::diagnosticCodeForCurlFailure($errno,curl_error($ch)));
    } catch(Failure $e) {throw $e;}
    catch(\Throwable) {throw new Failure('PHANTOM_CURL_RUNTIME');}
    finally {if($ch instanceof \CurlHandle) curl_close($ch);restore_error_handler();}
    return ['http'=>$http,'headers'=>$headers,'size'=>$bytes,'prefix'=>$prefix,'bytes'=>$body];
}
