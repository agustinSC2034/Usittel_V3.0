<?php
// login.php - Validación segura de usuario y contraseña en el servidor

// Prevenir errores de salida antes del JSON
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Asegurar que solo se envíe JSON
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Usuario y contraseña válidos (solo en el servidor)
$VALID_USER = 'admin';
$VALID_PASS = 'usittel2025#';

try {
    // Obtener datos enviados por POST
    $input = file_get_contents('php://input');
    
    if (empty($input)) {
        throw new Exception('No se recibieron datos');
    }
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error al decodificar JSON: ' . json_last_error_msg());
    }
    
    $user = isset($data['username']) ? trim($data['username']) : '';
    $pass = isset($data['password']) ? trim($data['password']) : '';
    
    // Validar que los campos no estén vacíos
    if (empty($user) || empty($pass)) {
        throw new Exception('Usuario y contraseña son requeridos');
    }
    
    // Verificar credenciales
    if ($user === $VALID_USER && $pass === $VALID_PASS) {
        echo json_encode([
            'status' => 'ok',
            'message' => 'Autenticación exitosa'
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Credenciales incorrectas'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Login Error: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => 'Error interno del servidor'
    ]);
}

exit; 