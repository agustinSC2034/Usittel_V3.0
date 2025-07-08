<?php
header('Content-Type: text/html; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Obtener los datos del formulario y limpiarlos
    $name = htmlspecialchars($_POST["name"]);
    $email = htmlspecialchars($_POST["email"]);
    $subject = htmlspecialchars($_POST["subject"]);
    $message = htmlspecialchars($_POST["message"]);

    // Verificar si hay campos vacíos
    if (empty($name) || empty($email) || empty($subject) || empty($message)) {
        echo '<script>alert("Por favor, completa todos los campos del formulario.");</script>';
        echo '<script>window.location.href = "index.html";</script>';
        exit;
    }
    
    // CAPTCHA GOOGLE
    $ip = $_SERVER['REMOTE_ADDR'];
    $captcha = isset($_POST['g-recaptcha-response']) ? $_POST['g-recaptcha-response'] : '';
    $secretkey = "6LfEbnsrAAAAALRrPfoTWSrk8rcvjqpLmqUKjufb";

    if (empty($captcha)) {
        echo '<script>alert("Por favor, completa el captcha.");</script>';
        echo '<script>window.location.href = "index.html";</script>';
        exit;
    }

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
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        echo '<script>alert("Error al validar el captcha: ' . htmlspecialchars($curlError) . '");</script>';
        echo '<script>window.location.href = "index.html";</script>';
        exit;
    }

    $atributos = json_decode($response, TRUE);

    if (!$atributos['success']) {
        echo '<script>alert("El captcha no fue validado correctamente.");</script>';
        echo '<script>window.location.href = "index.html";</script>';
        exit;
    }

    // Validar el correo electrónico
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo '<script>alert("El correo electrónico ingresado no es válido.");</script>';
        echo '<script>window.location.href = "index.html";</script>';
        exit;
    }

    // Procesar los datos (enviar correo electrónico)
    $to = "formulariousittel@gmail.com";
    $email_subject = "Nuevo mensaje de contacto: " . $subject;
    $headers = "From: " . $email . "\r\n";
    $headers .= "Reply-To: " . $email . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    $body = "Nombre: " . $name . "\n\n";
    $body .= "Correo electrónico: " . $email . "\n\n";
    $body .= "Asunto: " . $subject . "\n\n";
    $body .= "Mensaje:\n" . $message . "\n";

    if (mail($to, $email_subject, $body, $headers)) {
        echo '<script>alert("¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.");</script>';
        echo '<script>window.location.href = "index.html";</script>';
    } else {
        echo '<script>alert("Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.");</script>';
        echo '<script>window.location.href = "index.html";</script>';
    }
} else {
    // Si no es POST, redirigir al formulario
    header('Location: index.html');
    exit;
}
?> 