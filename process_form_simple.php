<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Obtener los datos del formulario y limpiarlos
    $name = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $phone = htmlspecialchars($_POST["phone"]);
    $subject = htmlspecialchars($_POST["subject"]);
    $message = htmlspecialchars($_POST["message"]);

    // Verificar si hay campos vacíos
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        echo '<script>alert("Por favor, completa todos los campos del formulario.");</script>';
        echo '<script>setTimeout(function() { window.history.back(); }, 1000);</script>';
        exit;
    }
    
    // CAPTCHA GOOGLE
    $ip = $_SERVER['REMOTE_ADDR'];
    $captcha = $_POST['g-recaptcha-response'];
    $secretkey = "6LdMZnsrAAAAAAyufRJSVQcNp-gWHXkOvIFxm-sA";

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
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    curl_close($ch);

    $atributos = json_decode($response, TRUE);

    if (!$atributos['success']) {
        echo '<script>alert("El captcha no fue validado. Por favor, inténtalo de nuevo.");</script>';
        echo '<script>setTimeout(function() { window.history.back(); }, 1000);</script>';
        exit;
    }
    // FIN CODIGO CAPTCHA

    // Validar el correo electrónico
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo '<script>alert("El correo electrónico ingresado no es válido.");</script>';
        echo '<script>setTimeout(function() { window.history.back(); }, 1000);</script>';
        exit;
    }

    // Validar el nombre (por ejemplo, debe tener al menos 3 caracteres)
    if (strlen($name) < 3) {
        echo '<script>alert("El nombre debe tener al menos 3 caracteres.");</script>';
        echo '<script>setTimeout(function() { window.history.back(); }, 1000);</script>';
        exit;
    }

    // Validar el asunto (por ejemplo, debe tener al menos 3 caracteres)
    if (strlen($subject) < 3) {
        echo '<script>alert("El asunto debe tener al menos 3 caracteres.");</script>';
        echo '<script>setTimeout(function() { window.history.back(); }, 1000);</script>';
        exit;
    }

    // Procesar los datos (enviar correo electrónico a los tres direcciones)
    $to = "agustinsc2034@gmail.com, contacto@usittel.com.ar, formulariousittel@gmail.com";
    $email_subject = "Nueva consulta desde el sitio web - " . $subject;
    $body = "Has recibido una nueva consulta desde el sitio web de Usittel:\n\n";
    $body .= "Nombre: " . $name . "\n";
    $body .= "Email: " . $email . "\n";
    $body .= "Teléfono: " . $phone . "\n";
    $body .= "Asunto: " . $subject . "\n\n";
    $body .= "Mensaje:\n" . $message . "\n\n";
    $body .= "Este mensaje fue enviado desde el formulario de contacto de usittel.com.ar";

    $headers = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    if (mail($to, $email_subject, $body, $headers)) {
        echo '<script>alert("¡Gracias por tu consulta! Te responderemos a la brevedad.");</script>';
        echo '<script>setTimeout(function() { window.location.href = "index.html"; }, 1000);</script>';
    } else {
        echo '<script>alert("Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo o contáctanos directamente.");</script>';
        echo '<script>setTimeout(function() { window.history.back(); }, 1000);</script>';
    }
} else {
    // Si no es POST, redirigir al formulario
    header('Location: index.html');
    exit;
}
?> 