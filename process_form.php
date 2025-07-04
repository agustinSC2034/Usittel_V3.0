<?php
// Configuración de reCAPTCHA
$recaptcha_secret = "6LeslXYrAAAAABux5XaOxNpklsorUxqBjFoNKFET";
$recaptcha_site_key = "6LeslXYrAAAAAGq-17vR48byhElevpQ6xh98OuT0";

// Función para validar reCAPTCHA
function verifyRecaptcha($recaptcha_response, $secret_key) {
    $url = 'https://www.google.com/recaptcha/api/siteverify';
    $data = array(
        'secret' => $secret_key,
        'response' => $recaptcha_response,
        'remoteip' => $_SERVER['REMOTE_ADDR']
    );

    $options = array(
        'http' => array(
            'header' => "Content-type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data)
        )
    );

    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    $response = json_decode($result);

    return $response->success;
}

// Función para limpiar y validar datos
function cleanInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Función para enviar email
function sendEmail($name, $email, $phone, $subject, $message, $form_type = 'contact') {
    $to = "contacto@usittel.com.ar";
    
    // Determinar el asunto según el tipo de formulario
    switch ($form_type) {
        case 'arrepentimiento':
            $email_subject = "Nueva solicitud de arrepentimiento de compra - Usittel";
            break;
        case 'baja':
            $email_subject = "Nueva solicitud de baja de servicio - Usittel";
            break;
        default:
            $email_subject = "Nueva consulta desde el sitio web - " . $subject;
            break;
    }
    
    $email_body = "Has recibido una nueva consulta desde el sitio web de Usittel:\n\n";
    $email_body .= "Tipo de formulario: " . ucfirst($form_type) . "\n";
    $email_body .= "Nombre: " . $name . "\n";
    $email_body .= "Email: " . $email . "\n";
    $email_body .= "Teléfono: " . $phone . "\n";
    
    if ($form_type === 'arrepentimiento' || $form_type === 'baja') {
        $email_body .= "Nº de Documento: " . (isset($_POST['docNumber']) ? $_POST['docNumber'] : 'No especificado') . "\n";
        $email_body .= "Nº de Cliente/Contrato: " . (isset($_POST['contractNumber']) ? $_POST['contractNumber'] : 'No especificado') . "\n";
        $email_body .= "Motivo: " . (isset($_POST['reason']) ? $_POST['reason'] : 'No especificado') . "\n";
    } else {
        $email_body .= "Asunto: " . $subject . "\n\n";
        $email_body .= "Mensaje:\n" . $message . "\n";
    }
    
    $email_body .= "\nEste mensaje fue enviado desde el formulario de " . $form_type . " de usittel.com.ar";
    
    $headers = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    return mail($to, $email_subject, $email_body, $headers);
}

// Procesar el formulario cuando se envía
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $response = array();
    
    // Verificar reCAPTCHA
    if (!isset($_POST['g-recaptcha-response'])) {
        $response['success'] = false;
        $response['message'] = "Por favor, completa el reCAPTCHA.";
    } else {
        $recaptcha_verified = verifyRecaptcha($_POST['g-recaptcha-response'], $recaptcha_secret);
        
        if (!$recaptcha_verified) {
            $response['success'] = false;
            $response['message'] = "Error en la verificación del reCAPTCHA. Por favor, inténtalo de nuevo.";
        } else {
            // Obtener el tipo de formulario
            $form_type = isset($_POST['form_type']) ? cleanInput($_POST['form_type']) : 'contact';
            
            // Obtener y limpiar los datos del formulario
            $name = isset($_POST['name']) ? cleanInput($_POST['name']) : '';
            $email = isset($_POST['email']) ? cleanInput($_POST['email']) : '';
            $phone = isset($_POST['phone']) ? cleanInput($_POST['phone']) : '';
            $subject = isset($_POST['subject']) ? cleanInput($_POST['subject']) : '';
            $message = isset($_POST['message']) ? cleanInput($_POST['message']) : '';
            
            // Para formularios de baja/arrepentimiento, usar campos específicos
            if ($form_type === 'arrepentimiento' || $form_type === 'baja') {
                $name = isset($_POST['fullName']) ? cleanInput($_POST['fullName']) : $name;
                $message = isset($_POST['reason']) ? cleanInput($_POST['reason']) : $message;
                $subject = $form_type === 'arrepentimiento' ? 'Arrepentimiento de Compra' : 'Solicitud de Baja';
            }
            
            // Validar campos requeridos según el tipo de formulario
            $required_fields = [];
            if ($form_type === 'arrepentimiento' || $form_type === 'baja') {
                $required_fields = ['fullName', 'docNumber', 'contractNumber', 'reason'];
            } else {
                $required_fields = ['name', 'email', 'subject', 'message'];
            }
            
            $missing_fields = [];
            foreach ($required_fields as $field) {
                if (empty($_POST[$field])) {
                    $missing_fields[] = $field;
                }
            }
            
            if (!empty($missing_fields)) {
                $response['success'] = false;
                $response['message'] = "Por favor, completa todos los campos obligatorios.";
            } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $response['success'] = false;
                $response['message'] = "Por favor, ingresa un email válido.";
            } else {
                // Intentar enviar el email
                if (sendEmail($name, $email, $phone, $subject, $message, $form_type)) {
                    $response['success'] = true;
                    if ($form_type === 'arrepentimiento') {
                        $response['message'] = "¡Tu solicitud de arrepentimiento ha sido enviada! Te contactaremos a la brevedad.";
                    } elseif ($form_type === 'baja') {
                        $response['message'] = "¡Tu solicitud de baja ha sido enviada! Te contactaremos a la brevedad.";
                    } else {
                        $response['message'] = "¡Gracias por tu consulta! Te responderemos a la brevedad.";
                    }
                } else {
                    $response['success'] = false;
                    $response['message'] = "Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo o contáctanos directamente.";
                }
            }
        }
    }
    
    // Devolver respuesta en formato JSON
    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

// Si no es POST, redirigir al formulario
header('Location: index.html#contact');
exit;
?> 