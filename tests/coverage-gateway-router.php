<?php
// Test-only router: run with php -n (without curl). Never used by the public site.
if (PHP_SAPI !== 'cli-server' || !getenv('COVERAGE_TEST_CACHE') || extension_loaded('curl')) {
    http_response_code(500); exit('Use the isolated test runtime');
}
putenv('COVERAGE_CACHE_DIR=' . getenv('COVERAGE_TEST_CACHE'));
foreach (['CURLOPT_FOLLOWLOCATION', 'CURLOPT_CONNECTTIMEOUT', 'CURLOPT_TIMEOUT', 'CURLOPT_USERAGENT', 'CURLOPT_HTTPHEADER', 'CURLOPT_WRITEFUNCTION', 'CURLINFO_HTTP_CODE'] as $index => $name) define($name, $index + 1);
function curl_init($url) { return (object) ['url' => $url, 'options' => []]; }
function curl_setopt_array($handle, $options) { $handle->options = $options; return true; }
function curl_exec($handle) {
    file_put_contents(getenv('COVERAGE_TEST_CACHE') . '/calls.txt', "call\n", FILE_APPEND);
    $fixture = file_get_contents(getenv('COVERAGE_TEST_CACHE') . '/fixture.json');
    ($handle->options[CURLOPT_WRITEFUNCTION])($handle, $fixture);
    return true;
}
function curl_getinfo($handle, $option) { return (int) file_get_contents(getenv('COVERAGE_TEST_CACHE') . '/status.txt'); }
function curl_close($handle) {}
require __DIR__ . '/../includes/coverage-geocode.php';
