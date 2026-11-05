<?php
declare(strict_types=1);
namespace MiUsittel;

// This integration names only the dedicated Mi USITTEL chat account.
const CENTRAL_CHAT_BUSINESS = 'wiOT-40q9iiyNBb8NahcAg';
const CENTRAL_CHAT_ACCOUNT = '-6VqjB9Gh2bDQwOp5CME1w';

function centralChatOwner(array $session): ?int {
    $owner=$session['authenticated_ida']??null;
    return isset($session['ida']) && is_int($owner) && $owner>0 && $owner<=9999999999 ? $owner : null;
}

final class CentralAppEntry {
    public function __construct(private array $bundle) {
        if (($bundle['iss']??null)!==CENTRAL_CHAT_BUSINESS || ($bundle['kid']??null)!==CENTRAL_CHAT_ACCOUNT
            || !is_array($bundle['privateJwk']??null) || !is_array($bundle['centralEncryptionKey']??null)) {
            throw new \RuntimeException('CENTRAL_CERTIFICATE');
        }
    }

    public function mint(int $owner, ?string $name, ?int $now=null): string {
        if($owner<1 || $owner>9999999999) throw new \RuntimeException('CENTRAL_IDENTITY');
        require_once __DIR__.'/central-auth-libs/vendor/autoload.php';
        $b=$this->bundle;$e=$b['centralEncryptionKey'];$now??=time();
        $sign=match($b['alg']??null) {
            'ES256'=>new \Jose\Component\Signature\Algorithm\ES256(),
            'RS256'=>new \Jose\Component\Signature\Algorithm\RS256(),
            'EdDSA'=>new \Jose\Component\Signature\Algorithm\EdDSA(),
            default=>throw new \RuntimeException('CENTRAL_SIGNING_ALGORITHM'),
        };
        $encrypt=match($e['alg']??null) {
            'RSA-OAEP-256'=>new \Jose\Component\Encryption\Algorithm\KeyEncryption\RSAOAEP256(),
            'ECDH-ES'=>new \Jose\Component\Encryption\Algorithm\KeyEncryption\ECDHES(),
            'ECDH-ES+A256KW'=>new \Jose\Component\Encryption\Algorithm\KeyEncryption\ECDHESA256KW(),
            default=>throw new \RuntimeException('CENTRAL_ENCRYPTION_ALGORITHM'),
        };
        $claims=['chat_account'=>$b['kid'],'iss'=>$b['iss'],'sub'=>'mi-usittel:'.$owner,
            'aud'=>'central:app-entry','iat'=>$now,'exp'=>$now+300];
        if(is_string($name) && trim($name)!=='') $claims['name']=mb_substr(trim($name),0,200);
        $jws=(new \Jose\Component\Signature\JWSBuilder(new \Jose\Component\Core\AlgorithmManager([$sign])))
            ->create()->withPayload(json_encode($claims,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE))
            ->addSignature(new \Jose\Component\Core\JWK($b['privateJwk']),['alg'=>$b['alg'],'kid'=>$b['kid'],'typ'=>'JWT'])->build();
        $signed=(new \Jose\Component\Signature\Serializer\CompactSerializer())->serialize($jws,0);
        $jwe=(new \Jose\Component\Encryption\JWEBuilder(new \Jose\Component\Core\AlgorithmManager([
            $encrypt,new \Jose\Component\Encryption\Algorithm\ContentEncryption\A256GCM(),
        ])))->create()->withPayload($signed)->withSharedProtectedHeader([
            'alg'=>$e['alg'],'enc'=>'A256GCM','cty'=>'JWT','kid'=>$e['kid'],'bid'=>$b['iss'],'cid'=>$b['kid'],
        ])->addRecipient(new \Jose\Component\Core\JWK($e['publicJwk']))->build();
        return (new \Jose\Component\Encryption\Serializer\CompactSerializer())->serialize($jwe,0);
    }
}

function centralChatEntry(array $config, Phantom $ph): array {
    $anonymous=['authenticated'=>false,'identity'=>'anonymous'];
    $owner=centralChatOwner($_SESSION);
    if($config['mode']!=='phantom' || $owner===null) return $anonymous;
    // Enabling the feature requires the channel's certificate OUTSIDE public_html.
    // No new .htaccess/environment settings or edits to the existing private config.
    $configPath=realpath(getenv('MI_USITTEL_CONFIG')?:'');
    if(!$configPath) return $anonymous;
    $certificate=dirname($configPath).'/central-mi-usittel.json';
    $real=realpath($certificate);
    if(!$real || insideRepo($real) || !is_readable($real) || filesize($real)>32768) return $anonymous;
    try {
        $bundle=json_decode(file_get_contents($real),true,16,JSON_THROW_ON_ERROR);
        if(!is_array($bundle)) return $anonymous;
        $issuer=new CentralAppEntry($bundle);
        // The login owner, never a request parameter or the currently selected contract.
        $ph->scope([$owner]);$profile=$ph->profile($owner);
        $now=time();
        return ['authenticated'=>true,'identity'=>hash_hmac('sha256','central:'.$owner,$_SESSION['csrf']),
            'appJwt'=>$issuer->mint($owner,$profile['name']??null,$now),'expiresAt'=>$now+300];
    } catch(\Throwable) {
        // Identity/SDK/provider failures affect only this chat; manual capture stays available.
        return $anonymous;
    }
}
