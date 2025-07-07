<?php
// login.php - Validación segura de usuario y contraseña en el servidor
header('Content-Type: application/json');

// Usuario y contraseña válidos (solo en el servidor)
$VALID_USER = 'admin';
$VALID_PASS = 'usittel2025#';

// Obtener datos enviados por POST
$data = json_decode(file_get_contents('php://input'), true);
$user = isset($data['username']) ? $data['username'] : '';
$pass = isset($data['password']) ? $data['password'] : '';

if ($user === $VALID_USER && $pass === $VALID_PASS) {
    echo json_encode(['status' => 'ok']);
} else {
    echo json_encode(['status' => 'error']);
}
exit; 