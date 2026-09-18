<?php
declare(strict_types=1);
namespace MiUsittel;

final class Failure extends \RuntimeException {
    // Upstream status is diagnostic metadata, never the status of our public API.
    public function __construct(public string $kind, public int $http = 503, public ?int $upstreamHttp = null, public ?string $responseFormat = null) { parent::__construct($kind); }
}
final class InspectionFailure extends \RuntimeException {
    public function __construct(public string $stage, public string $safeCode, \Throwable $previous) {
        parent::__construct($safeCode,0,$previous);
    }
}
function config(): array {
    $c = ['mode'=>'demo', 'allowed_idas'=>[], 'lab_users'=>[], 'idle_seconds'=>900, 'max_seconds'=>28800,
        'timeout_seconds'=>10, 'connect_timeout_seconds'=>4, 'customer_path'=>[], 'profile_fields'=>[],
        'balance_path'=>null, 'ca_file'=>null];
    $path = getenv('MI_USITTEL_CONFIG');
    if ($path) {
        $real = realpath($path);
        if (!$real || insideRepo($real)) throw new Failure('CONFIGURATION');
        $loaded = require $real;
        if (!is_array($loaded)) throw new Failure('CONFIGURATION');
        $c = array_replace($c, $loaded);
    }
    if (!in_array($c['mode'], ['demo','phantom'], true)) throw new Failure('CONFIGURATION');
    foreach (['idle_seconds','max_seconds','timeout_seconds','connect_timeout_seconds'] as $key) {
        if (!is_int($c[$key]) || $c[$key] < 1) throw new Failure('CONFIGURATION');
    }
    if ($c['timeout_seconds'] > 30 || $c['connect_timeout_seconds'] > 10) throw new Failure('CONFIGURATION');
    if (!is_array($c['allowed_idas']) || array_diff($c['allowed_idas'], [1,5])) throw new Failure('CONFIGURATION');
    $c['allowed_idas'] = array_map('intval', $c['allowed_idas']);
    if ($c['mode'] === 'phantom') {
        $url = parse_url($c['phantom_url'] ?? '');
        if (($url['scheme'] ?? '') !== 'https' || empty($url['host']) || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment'])
            || !is_string($c['api_user'] ?? null) || $c['api_user'] === '' || !is_string($c['api_pass'] ?? null) || $c['api_pass'] === '' || !$c['allowed_idas']) throw new Failure('CONFIGURATION');
    }
    return $c;
}
function insideRepo(string $path): bool {
    $root = str_replace('\\','/', (string)realpath(__DIR__.'/../..'));
    $path = str_replace('\\','/', $path);
    return strcasecmp($path, $root) === 0 || str_starts_with(strtolower($path), strtolower($root).'/');
}
function privateDir(): string {
    $path = getenv('MI_USITTEL_RUNTIME') ?: sys_get_temp_dir().'/mi-usittel-runtime';
    if (!is_dir($path) && !mkdir($path, 0700, true)) throw new Failure('PRIVATE_STORAGE');
    $real = realpath($path);
    if (!$real || insideRepo($real) || !is_writable($real)) throw new Failure('PRIVATE_STORAGE');
    return $real;
}
function locked(string $path, callable $callback): mixed {
    $f = fopen($path, 'c+');
    if (!$f || !flock($f, LOCK_EX)) throw new Failure('PRIVATE_STORAGE');
    @chmod($path, 0600);
    try { return $callback($f); } finally { flock($f, LOCK_UN); fclose($f); }
}
function writeFileHandle($f, array $value): void {
    rewind($f); ftruncate($f, 0); fwrite($f, json_encode($value, JSON_THROW_ON_ERROR)); fflush($f);
}
function rateLimitKeys(string $user, string $ip, ?int $candidate): array {
    return [['ip:'.$ip,30], ['user:'.($candidate === null ? $user : 'ida:'.$candidate),5]];
}
function rateLimitBegin(string $dir, string $user, string $ip, ?int $candidate): void {
    locked($dir.'/attempts.json', function($f) use ($user,$ip,$candidate) {
        $state = json_decode(stream_get_contents($f), true) ?: ['salt'=>bin2hex(random_bytes(32)), 'buckets'=>[]];
        $now = time();
        foreach ($state['buckets'] as $k=>$v) if ($v['until'] <= $now) unset($state['buckets'][$k]);
        foreach (rateLimitKeys($user,$ip,$candidate) as [$key,$max]) {
            $hash = hash_hmac('sha256',$key,$state['salt']);
            $v = $state['buckets'][$hash] ?? ['count'=>0,'until'=>$now+900];
            if ($v['count'] >= $max) throw new Failure('RATE_LIMIT',429);
            $v['count']++; $state['buckets'][$hash]=$v;
        }
        writeFileHandle($f,$state);
    });
}
function rateLimitRelease(string $dir, string $user, string $ip, ?int $candidate): void {
    locked($dir.'/attempts.json', function($f) use ($user,$ip,$candidate) {
        $state = json_decode(stream_get_contents($f), true) ?: ['salt'=>bin2hex(random_bytes(32)), 'buckets'=>[]];
        foreach (rateLimitKeys($user,$ip,$candidate) as [$key]) {
            $hash = hash_hmac('sha256',$key,$state['salt']);
            if(!isset($state['buckets'][$hash])) continue;
            $state['buckets'][$hash]['count']--;
            if($state['buckets'][$hash]['count']<=0) unset($state['buckets'][$hash]);
        }
        writeFileHandle($f,$state);
    });
}
function resolveUser(string $user, array $c): ?int {
    $candidate = $c['lab_users'][$user] ?? null;
    if ($candidate === null && preg_match('/^[0-9]{1,10}$/D', $user)) $candidate = (int)$user;
    return is_int($candidate) && in_array($candidate,$c['allowed_idas'],true) ? $candidate : null;
}
function atPath(array $value, ?array $path): mixed {
    if ($path === null) return null;
    foreach ($path as $key) {
        if (!is_array($value) || !array_key_exists($key,$value)) return null;
        $value = $value[$key];
    }
    return $value;
}
function publicField(array $raw, mixed $mapping): ?string {
    if ($mapping === null) return null;
    // Only explicitly configured, scalar presentation fields. Never credentials,
    // billing IDs of other contracts or linked customer records.
    $paths = isset($mapping['join']) ? $mapping['join'] : [$mapping];
    $parts=[];
    foreach($paths as $path) {
        if(!is_array($path) || !$path) throw new Failure('PROFILE_MAPPING');
        foreach($path as $key) if(!is_string($key) || preg_match('/autogestion|pass|token|secret|conexiones_asociadas|dni|cuit|tarjeta/i',$key)) throw new Failure('PROFILE_MAPPING');
        $part=textValue(atPath($raw,$path)); if($part!==null) $parts[]=$part;
    }
    return $parts ? implode(' ', $parts) : null;
}
function textValue(mixed $v): ?string { return is_string($v) && trim($v) !== '' ? mbSafeCut($v) : null; }
function mbSafeCut(string $v): string { return strlen($v) <= 1000 ? $v : ''; }
function amount(mixed $v): ?float {
    if (!(is_int($v) || is_float($v) || (is_string($v) && preg_match('/^-?\d+(?:\.\d{1,2})?$/D',$v)))) return null;
    $n=(float)$v; return is_finite($n) && abs($n)<1e12 ? $n : null;
}
function dateValue(mixed $v): ?string {
    if (!is_string($v)) return null;
    $d=\DateTimeImmutable::createFromFormat('!Y-m-d',$v);
    return $d && $d->format('Y-m-d')===$v ? $d->format('d/m/Y') : null;
}
