<?php
// Archivo de prueba para verificar reCAPTCHA
header('Content-Type: application/json; charset=utf-8');

$recaptcha_secret = "6LdMZnsrAAAAAAyufRJSVQcNp-gWHXkOvIFxm-sA";

// Función de prueba para reCAPTCHA
function testRecaptchaConnection($secret_key) {
    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = array(
        'secret' => $secret_key,
        'response' => 'test_response', // Respuesta de prueba
        'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
    );

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Usittel-Test/1.0');
    
    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    return [
        'success' => $result !== false && $http_code === 200,
        'http_code' => $http_code,
        'curl_error' => $curl_error,
        'response' => $result ? json_decode($result, true) : null
    ];
}

$test_result = testRecaptchaConnection($recaptcha_secret);

$response = [
    'status' => $test_result['success'] ? 'ok' : 'error',
    'message' => $test_result['success'] ? 'Conexión con reCAPTCHA exitosa' : 'Error de conexión con reCAPTCHA',
    'timestamp' => date('Y-m-d H:i:s'),
    'test_details' => $test_result,
    'recommendations' => []
];

if (!$test_result['success']) {
    $response['recommendations'][] = 'Verificar que cURL esté habilitado en el servidor';
    $response['recommendations'][] = 'Verificar conectividad con google.com';
    $response['recommendations'][] = 'Verificar que las claves de reCAPTCHA sean correctas';
}

echo json_encode($response, JSON_PRETTY_PRINT);
exit; 