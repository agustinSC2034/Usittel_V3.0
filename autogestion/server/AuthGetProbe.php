<?php
declare(strict_types=1);
namespace MiUsittel;

// CLI experiment only, explicitly accepted by the user. Never used by the portal.
// Query credentials may be recorded by upstream servers even with HTTPS.
function probeAuthGet(array $config): void {
    inspectionAuthGetToken($config);
}
// Token stays in process memory only, for the explicitly invoked CLI inspectors.
function inspectionAuthGetToken(array $config): string {
    if(PHP_SAPI!=='cli' || ($config['mode']??null)!=='phantom') throw new Failure('CONFIGURATION');
    $base=$config['phantom_url']??'';
    $parts=parse_url($base);
    if(($parts['scheme']??null)!=='https' || empty($parts['host'])
        || isset($parts['query']) || isset($parts['fragment']) || isset($parts['user']) || isset($parts['pass'])) throw new Failure('CONFIGURATION');
    if(!extension_loaded('curl')) throw new Failure('CONFIGURATION');
    $ca=null;
    if(($config['ca_file']??null)!==null) {
        if(!is_string($config['ca_file']) || ($ca=realpath($config['ca_file']))===false || !is_file($ca) || !is_readable($ca)) throw new Failure('PHANTOM_CA_FILE');
    }
    // Preserve JSON=1 from the POST probes: change only the credential transport.
    $url=$base.'?'.http_build_query(['action'=>'autentificar','JSON'=>1,
        'api_user'=>$config['api_user'],'api_pass'=>$config['api_pass']],'','&',PHP_QUERY_RFC3986);
    $ch=null;$response='';$code=0;$errno=0;$curlError='';$ok=false;
    try {
        $ch=curl_init($url);
        if($ch===false) throw new Failure('PHANTOM_CURL_INIT');
        $options=[CURLOPT_HTTPGET=>true,CURLOPT_HTTPHEADER=>['Accept: application/json'],
            CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,
            CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_VERBOSE=>false,
            CURLOPT_CONNECTTIMEOUT=>$config['connect_timeout_seconds'],CURLOPT_TIMEOUT=>$config['timeout_seconds'],
            CURLOPT_WRITEFUNCTION=>static function($handle,$chunk) use (&$response) {
                if(strlen($response)+strlen($chunk)>2097152) return 0;
                $response.=$chunk;return strlen($chunk);
            }];
        if($ca!==null) $options[CURLOPT_CAINFO]=$ca;
        if(!curl_setopt_array($ch,$options)) throw new Failure('PHANTOM_CURL_SETUP');
        $ok=curl_exec($ch);
        $code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);$errno=curl_errno($ch);$curlError=curl_error($ch);
    } catch(Failure $e) {throw $e;}
    catch(\Throwable) {throw new Failure('PHANTOM_CURL_RUNTIME');}
    finally {if($ch instanceof \CurlHandle) curl_close($ch);}
    if($ok===false) throw new Failure(CurlTransport::diagnosticCodeForCurlFailure($errno,$curlError));
    $data=CurlTransport::decodeHttpResponse($code,$response);
    if((isset($data['code']) && (int)$data['code']!==200) || isset($data['error'])
        || (isset($data['message']) && is_string($data['message']) && str_starts_with($data['message'],'Error:'))) throw new Failure('PHANTOM_FUNCTIONAL',503,$code);
    if(!is_string($data['token']??null) || trim($data['token'])==='') throw new Failure('PHANTOM_TOKEN',503,$code);
    return $data['token'];
}
