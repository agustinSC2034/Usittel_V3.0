<?php
// Archivo de prueba para verificar que PHP esté funcionando
header('Content-Type: application/json; charset=utf-8');

$response = [
    'status' => 'ok',
    'message' => 'PHP está funcionando correctamente',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'extensions' => [
        'curl' => extension_loaded('curl'),
        'json' => extension_loaded('json'),
        'openssl' => extension_loaded('openssl')
    ],
    'server_info' => [
        'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'php_sapi' => php_sapi_name()
    ]
];

echo json_encode($response, JSON_PRETTY_PRINT);
exit; 