param([string]$BaseUrl = 'http://127.0.0.1:4176', [Parameter(Mandatory=$true)][string]$CacheDirectory)
$ErrorActionPreference = 'Stop'
function Check-Response([string]$Name, [int]$Expected, [hashtable]$Options) {
    $response = Invoke-WebRequest -Uri "$BaseUrl/includes/coverage-geocode.php" -SkipHttpErrorCheck @Options
    if ([int]$response.StatusCode -ne $Expected) { throw "$Name expected $Expected, got $($response.StatusCode): $($response.Content)" }
    Write-Output "PASS $Name ($Expected)"
}
$valid = @{ Method='Post'; ContentType='application/json'; Body='{"street":"San Martin","number":1000}' }
Check-Response 'GET forbidden' 405 @{Method='Get'}
Check-Response 'Wrong content type' 415 @{Method='Post';ContentType='text/plain';Body='x'}
Check-Response 'Malformed JSON' 400 @{Method='Post';ContentType='application/json';Body='invalid'}
Check-Response 'Invalid street' 400 @{Method='Post';ContentType='application/json';Body='{"street":"<img>","number":1000}'}
Check-Response 'Invalid height' 400 @{Method='Post';ContentType='application/json';Body='{"street":"Paz","number":-1}'}
Check-Response 'Foreign origin' 403 @{Method='Post';ContentType='application/json';Body=$valid.Body;Headers=@{Origin='https://example.com'}}
Set-Content -LiteralPath (Join-Path $CacheDirectory 'status.txt') -Value '200' -NoNewline
Set-Content -LiteralPath (Join-Path $CacheDirectory 'fixture.json') -Value '[{"lat":"-37.32","lon":"-59.13","address":{"road":"San Martin","house_number":"1000","city":"Tandil"}}]' -NoNewline
Check-Response 'Provider result' 200 $valid
Check-Response 'Shared cached result' 200 $valid
$calls = @(Get-Content -LiteralPath (Join-Path $CacheDirectory 'calls.txt')).Count
if ($calls -ne 1) { throw "Cache called upstream $calls times" }
# Deterministic limiter check without making external requests or waiting.
Set-Content -LiteralPath (Join-Path $CacheDirectory 'rate.lock') -Value (([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()/1000 + 5).ToString([Globalization.CultureInfo]::InvariantCulture)) -NoNewline
Check-Response 'Global rate limit' 429 @{Method='Post';ContentType='application/json';Body='{"street":"Paz","number":100}'}
Set-Content -LiteralPath (Join-Path $CacheDirectory 'rate.lock') -Value '0' -NoNewline
Set-Content -LiteralPath (Join-Path $CacheDirectory 'status.txt') -Value '503' -NoNewline
Check-Response 'Provider unavailable' 503 @{Method='Post';ContentType='application/json';Body='{"street":"Paz","number":100}'}
Check-Response 'Outage backoff' 429 @{Method='Post';ContentType='application/json';Body='{"street":"Paz","number":101}'}
Set-Content -LiteralPath (Join-Path $CacheDirectory 'rate.lock') -Value '0' -NoNewline
Set-Content -LiteralPath (Join-Path $CacheDirectory 'status.txt') -Value '200' -NoNewline
Set-Content -LiteralPath (Join-Path $CacheDirectory 'fixture.json') -Value '{"error":"bad response"}' -NoNewline
Check-Response 'Invalid provider payload' 502 @{Method='Post';ContentType='application/json';Body='{"street":"Paz","number":101}'}
Write-Output 'Gateway checks passed; no external service contacted.'
