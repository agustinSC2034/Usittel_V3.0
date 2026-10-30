<?php
declare(strict_types=1);
// Isolated local harness only; never deploy or use real configuration.
if (PHP_SAPI !== 'cli-server' || getenv('MI_USITTEL_TEST') !== '1' || !in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) { http_response_code(404); exit; }
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
if ($path === '/autogestion/pwa-checkout') {
    $attempt = $_GET['attempt'] ?? '';
    if (!is_string($attempt) || !preg_match('/\A[a-f0-9]{32}\z/D', $attempt)) { http_response_code(400); exit; }
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SIRO simulado</title><h1>SIRO simulado — prueba</h1><p>No se conectó a SIRO ni se realizó ningún pago. Ambos enlaces regresan al portal; el intento permanece pendiente.</p><p><a href="api.php?route=payment-return&amp;result=ok&amp;attempt='.$attempt.'">Simular regreso OK</a></p><p><a href="api.php?route=payment-return&amp;result=error&amp;attempt='.$attempt.'">Simular regreso con error</a></p></html>';
    exit;
}
if ($path === '/autogestion/api.php') { require __DIR__.'/router.php'; exit; }
if ($path === '/autogestion') { header('Location: /autogestion/', true, 302); exit; }
if (!is_string($path) || !str_starts_with($path, '/autogestion/') || !in_array($_SERVER['REQUEST_METHOD'], ['GET','HEAD'], true)) { http_response_code(404); exit; }
$relative = substr($path, strlen('/autogestion/')) ?: 'index.html';
if (!preg_match('~^(index\.html|manifest\.webmanifest|sw\.js|js/[a-z-]+\.js|vendor/librespeed/speedtest_worker\.js|assets/[a-zA-Z0-9_.-]+\.(css|png|svg|woff2))$~D', $relative)) { http_response_code(404); exit; }
$file = __DIR__.'/../'.$relative;
if (!is_file($file)) { http_response_code(404); exit; }
$types = ['html'=>'text/html','webmanifest'=>'application/manifest+json','js'=>'text/javascript','css'=>'text/css','png'=>'image/png','svg'=>'image/svg+xml','woff2'=>'font/woff2'];
header('Content-Type: '.$types[pathinfo($file, PATHINFO_EXTENSION)]);
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') exit;
$content = file_get_contents($file);
if ($relative === 'index.html') $content = str_replace('<div id="app"></div>', '<p>ENTORNO DE PRUEBA AISLADO · DATOS FICTICIOS · SIN PAGOS REALES</p><div id="app"></div>', $content);
if ($relative === 'js/app.js') {
    // Refuse to serve the app if the expected production redirect has changed.
    $original = 'window.location.assign(result.checkout_url);';
    if (substr_count($content, $original) !== 1) { http_response_code(500); exit('La adaptación de prueba requiere revisión.'); }
    $content = str_replace($original, "window.location.assign('./pwa-checkout?attempt=' + encodeURIComponent(result.attempt_id));", $content);
}
echo $content;
