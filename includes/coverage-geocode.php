<?php
/** Same-origin geocoding gateway; commercial coverage never depends on this API. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function coverageReply(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    coverageReply(405, ['error' => 'method']);
}
if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') coverageReply(403, ['error' => 'origin']);
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = parse_url($_SERVER['HTTP_ORIGIN']);
    $host = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!$origin || strcasecmp($origin['host'] ?? '', $host ?: '') !== 0) coverageReply(403, ['error' => 'origin']);
}
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) coverageReply(415, ['error' => 'content_type']);
$raw = file_get_contents('php://input', false, null, 0, 1025);
if ($raw === false || strlen($raw) > 1024) coverageReply(400, ['error' => 'input']);
$input = json_decode($raw, true);
$street = is_array($input) && is_string($input['street'] ?? null) ? trim($input['street']) : '';
$number = is_array($input) ? ($input['number'] ?? null) : null;
if (strlen($street) < 2 || strlen($street) > 240 || !preg_match("/^[\\p{L}\\p{N} .'’°º-]+$/u", $street) ||
    !preg_match('/\p{L}/u', $street) || !is_int($number) || $number < 1 || $number > 999999) {
    coverageReply(400, ['error' => 'input']);
}
if (!function_exists('curl_init')) coverageReply(503, ['error' => 'unavailable']);

// Bounded cache outside the document root. No user IP or raw query is logged.
$directory = getenv('COVERAGE_CACHE_DIR') ?: sys_get_temp_dir() . '/usittel-geocode-' . substr(hash('sha256', __DIR__), 0, 16);
if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) coverageReply(503, ['error' => 'storage']);
$key = hash('sha256', strtolower($street) . '|' . $number);
$cacheFile = $directory . '/' . substr($key, 0, 2) . '.json'; // At most 256 entries.
$lock = @fopen($directory . '/rate.lock', 'c+');
if (!$lock) coverageReply(503, ['error' => 'storage']);
// Shared across all visitors and both public pages, including slow upstream requests.
if (!flock($lock, LOCK_EX | LOCK_NB)) {
    header('Retry-After: 2');
    coverageReply(429, ['error' => 'busy']);
}
$cached = is_file($cacheFile) ? json_decode((string) @file_get_contents($cacheFile), true) : null;
if (is_array($cached) && ($cached['key'] ?? '') === $key && ($cached['expires'] ?? 0) > time() && is_array($cached['results'] ?? null)) {
    coverageReply(200, ['results' => $cached['results']]);
}
$last = (float) stream_get_contents($lock);
if (microtime(true) - $last < 1.1) {
    header('Retry-After: 2');
    coverageReply(429, ['error' => 'busy']);
}
rewind($lock);
if (!ftruncate($lock, 0) || fwrite($lock, (string) microtime(true)) === false || !fflush($lock)) coverageReply(503, ['error' => 'storage']);

// Operator can switch a compatible provider through server environment configuration.
$provider = getenv('COVERAGE_GEOCODER_URL') ?: 'https://nominatim.openstreetmap.org/search';
if (parse_url($provider, PHP_URL_SCHEME) !== 'https') coverageReply(503, ['error' => 'configuration']);
$query = http_build_query([
    'format' => 'json', 'street' => $number . ' ' . $street, 'city' => 'Tandil',
    'state' => 'Buenos Aires', 'countrycodes' => 'ar', 'addressdetails' => 1, 'limit' => 5,
    'viewbox' => '-59.35,-37.15,-58.95,-37.45', 'bounded' => 1,
]);
$curl = curl_init($provider . '?' . $query);
$payload = '';
curl_setopt_array($curl, [
    CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 6,
    CURLOPT_USERAGENT => 'UsittelCoverage/2.0 (+https://usittel.com.ar; contacto@usittel.com.ar)',
    CURLOPT_HTTPHEADER => ['Accept: application/json', 'Accept-Language: es'],
    CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use (&$payload): int {
        if (strlen($payload) + strlen($chunk) > 131072) return 0;
        $payload .= $chunk;
        return strlen($chunk);
    },
]);
$ok = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$transportError = function_exists('curl_errno') ? curl_errno($curl) : 0;
curl_close($curl);
if ($ok === false || $status !== 200) {
    // Operational diagnostics only: never log submitted addresses or provider URLs.
    error_log(sprintf('Coverage geocoder failed: http=%d curl=%d', $status, $transportError));
    // Back off globally after a provider rejection or outage; never retry in a loop.
    rewind($lock); ftruncate($lock, 0); fwrite($lock, (string) (microtime(true) + 30)); fflush($lock);
    coverageReply(503, ['error' => 'provider']);
}
$rows = json_decode($payload, true);
if (!is_array($rows) || (count($rows) && array_keys($rows) !== range(0, count($rows) - 1))) coverageReply(502, ['error' => 'provider']);
$results = [];
foreach (array_slice($rows, 0, 5) as $row) {
    if (!is_array($row) || !is_numeric($row['lat'] ?? null) || !is_numeric($row['lon'] ?? null) || !is_array($row['address'] ?? null)) continue;
    $results[] = [
        'lat' => (float) $row['lat'], 'lon' => (float) $row['lon'],
        'address' => array_intersect_key($row['address'], array_flip(['house_number', 'road', 'pedestrian', 'residential', 'city', 'town', 'municipality'])),
    ];
}
@file_put_contents($cacheFile, json_encode(['key' => $key, 'expires' => time() + ($results ? 86400 : 600), 'results' => $results]));
coverageReply(200, ['results' => $results]);
