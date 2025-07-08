<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Obtener los datos del formulario y limpiarlos
    $name = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $subject = htmlspecialchars($_POST["subject"]);
    $message = htmlspecialchars($_POST["message"]);

    // Verificar si hay campos vacíos
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        echo '<script>alert("Por favor, completa todos los campos del formulario.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
        exit;
    }
    
    // CAPTCHA GOOGLE
    $ip = $_SERVER['REMOTE_ADDR'];
    $captcha = $_POST['g-recaptcha-response'];
    $secretkey = "6LeX74spAAAAAApSGnvOXALpuyaLvLkcrqtkY6_7";

    // Validar el captcha utilizando cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://www.google.com/recaptcha/api/siteverify");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(array(
        'secret' => $secretkey,
        'response' => $captcha,
        'remoteip' => $ip
    )));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $atributos = json_decode($response, TRUE);

    if (!$atributos['success']) {
        echo '<script>alert("El captcha no fue validado.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
        exit;
    }
    // FIN CODIGO CAPTCHA

    // Validar el correo electrónico
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo '<script>alert("El correo electrónico ingresado no es válido.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
        exit;
    }

    // Validar el nombre (por ejemplo, debe tener al menos 3 caracteres)
    if (strlen($name) < 3) {
        echo '<script>alert("El nombre debe tener al menos 3 caracteres.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
        exit;
    }

    // Validar el asunto (por ejemplo, debe tener al menos 3 caracteres)
    if (strlen($subject) < 3) {
        echo '<script>alert("El asunto debe tener al menos 3 caracteres.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
        exit;
    }

    // Procesar los datos (por ejemplo, enviar un correo electrónico)
    $to = "formulariousittel@gmail.com";
    $email_subject = "Nuevo mensaje de contacto";
    $body = "Nombre: " . $name . "\n";
    $body .= "Correo electrónico: " . $email . "\n";
    $body .= "Asunto: " . $subject . "\n";
    $body .= "Mensaje: " . $message . "\n";

    if (mail($to, $email_subject, $body)) {
        echo '<script>alert("¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
    } else {
        echo "Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.";
    }
} else {
    // Si no es POST, redirigir al formulario
    header('Location: index.html');
    exit;
}
?> 