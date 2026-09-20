# Public coverage validator

Used by `/` (also `home.php`) and `/pages/internet/`. Autogestion is independent.

- `js/coverage-data.js`: original commercial street/height ranges and the illustrative map polygon. All 659 original current entries were preserved during migration.
- `js/coverage-core.js`: pure parsing, normalization, range compilation and location matching.
- `js/coverage-validator.js`: accessible DOM rendering, immediate local answer, independent cancellable map lookup.
- `includes/coverage-geocode.php`: same-origin POST gateway with bounded shared cache and shared rate limiter.
- `assets/css/coverage.css`: presentation shared by both public validators.

Street matching uses complete normalized names, never substring matches. Only explicit abbreviations are normalized. Unknown street names are not evidence of no coverage. A valid registered range can confirm availability; an invalid range cannot create availability or a definitive negative. The map polygon is illustrative and is not a commercial source of truth. Geocoding never changes the commercial answer.

## Data maintenance

Change commercial ranges only from verified operational information. Seven legacy entries are reversed and remain visible in the source for correction:

- Guernica: 1699–1669 (one entry).
- Mayor Novoa Marcelo / Mayor Novoa / Novoa: 849–699 (three aliases).
- Pje. Piñero / Pasaje Piñero / Piñero: 1599–1199 (three aliases).

These are excluded from compiled ranges. Existing valid ranges on the same normalized street still work; unresolved heights ask for manual confirmation. Do not silently swap endpoints. `compile(data.current).invalid` lists all data errors. Run the tests after changing records and update the expected invalid count when verified corrections remove them.

## Runtime

Production needs PHP 7.4+ with cURL, valid HTTPS CA configuration and a private writable temporary directory. Existing cPanel deployment copies `includes`, `js`, `assets`, `pages` and the home files, so no deployment-script change is needed. A static Python preview cannot execute the gateway; coverage still works locally and the map shows an unavailable state.

Default provider: https://nominatim.openstreetmap.org/search . Policy: https://operations.osmfoundation.org/policies/nominatim/ . No autocomplete or background enumeration. One structured request per submitted recognized address; no nearby-house retries. The gateway serializes uncached traffic across visitors, enforces at least 1.1 seconds between upstream starts and applies a 30-second backoff on provider failure. It returns 429 when busy instead of queuing requests. Cache hits remain available during backoff. Cache has at most 256 slots, 24-hour positive and 10-minute empty-result TTLs. Cache stores a hashed query key and minimal map result, not raw submitted query or user IP.

Environment settings (server operator only):

- `COVERAGE_GEOCODER_URL`: alternative HTTPS endpoint compatible with Nominatim search, configurable without editing frontend code.
- `COVERAGE_CACHE_DIR`: optional private writable shared cache directory outside the web root. Default uses the OS temporary directory scoped to this installation. All instances of this app must share the limiter; multiple independent servers require a distributed limiter or a suitable contracted provider.

Client timeout is nine seconds, upstream timeout six seconds. Input changes cancel requests and invalidate old results. Exact markers require matching city, street and house number; street centroids are explicitly approximate. A different house is never relabeled with the requested number.

## Tests

`node tests/coverage.test.cjs` (or `npm run test:coverage`) checks numbered streets, invalid inputs, exact aliases, range boundaries, invalid-data states, map precision, cache and stale-response handling. It requires no network.

Gateway tests use an isolated PHP runtime without cURL, so the test router can substitute a deterministic provider:

```powershell
$env:COVERAGE_TEST_CACHE = Join-Path $env:TEMP ('coverage-test-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $env:COVERAGE_TEST_CACHE
php -n -S 127.0.0.1:4176 tests/coverage-gateway-router.php
# In another terminal, pass the same cache directory:
./tests/coverage-gateway.test.ps1 -CacheDirectory '<test directory>'
```

Use a fresh test directory each run. These tests verify validation, origin rejection, shared cache, limiter, provider failure/backoff and malformed upstream payloads. The test router is never deployed by the cPanel task. Public PHP endpoint only accepts POST; no CORS grants are made.
