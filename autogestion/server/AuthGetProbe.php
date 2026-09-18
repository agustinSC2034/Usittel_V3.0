<?php
declare(strict_types=1);
namespace MiUsittel;

function probeAuthGet(array $config): void { inspectionAuthGetToken($config); }
// Reuse the portal's transport/decoder. Inspectors never persist this token.
function inspectionAuthGetToken(array $config): string {
    if(PHP_SAPI!=='cli' || ($config['mode']??null)!=='phantom') throw new Failure('CONFIGURATION');
    $data=(new CurlTransport($config))->authenticate($config['phantom_url'].'?action=autentificar&JSON=1',
        ['api_user'=>$config['api_user'],'api_pass'=>$config['api_pass']]);
    if((isset($data['code']) && (int)$data['code']!==200) || isset($data['error'])
        || (isset($data['message']) && is_string($data['message']) && str_starts_with($data['message'],'Error:'))) throw new Failure('PHANTOM_FUNCTIONAL',503,200);
    if(!is_string($data['token']??null) || trim($data['token'])==='') throw new Failure('PHANTOM_TOKEN',503,200);
    return $data['token'];
}
