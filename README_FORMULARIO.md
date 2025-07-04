# Configuración del Formulario de Contacto - Usittel

## Archivos Modificados/Creados

### 1. `index.html`
- ✅ Agregado script de reCAPTCHA en el `<head>`
- ✅ Implementado widget de reCAPTCHA en el formulario
- ✅ Agregado JavaScript para manejo AJAX del formulario
- ✅ Agregado div para mostrar mensajes de respuesta

### 2. `process_form.php` (NUEVO)
- ✅ Validación de reCAPTCHA
- ✅ Limpieza y validación de datos de entrada
- ✅ Envío de email a contacto@usittel.com.ar
- ✅ Respuestas JSON para AJAX

## Configuración del Servidor

### Requisitos del Servidor
- PHP 7.0 o superior
- Función `mail()` habilitada en PHP
- Extensión `curl` o `file_get_contents()` habilitada

### Configuración de Email
El formulario está configurado para enviar emails a `contacto@usittel.com.ar`. Si necesitas cambiar el destinatario, edita la línea en `process_form.php`:

```php
$to = "contacto@usittel.com.ar";
```

### Configuración de reCAPTCHA
Las claves ya están configuradas en el código:
- **Clave del sitio**: `6LeslXYrAAAAAGq-17vR48byhElevpQ6xh98OuT0`
- **Clave secreta**: `6LeslXYrAAAAABux5XaOxNpklsorUxqBjFoNKFET`

## Funcionalidades Implementadas

### ✅ Validaciones
- Campos obligatorios (nombre, email, asunto, mensaje)
- Formato de email válido
- Verificación de reCAPTCHA

### ✅ Seguridad
- Limpieza de datos de entrada
- Protección contra XSS
- Validación del lado del servidor

### ✅ Experiencia de Usuario
- Envío AJAX (sin recargar página)
- Mensajes de éxito/error
- Indicador de carga en el botón
- Reset automático del formulario y reCAPTCHA

### ✅ Email
- Formato profesional del email
- Incluye todos los datos del formulario
- Headers apropiados para respuesta

## Estructura del Email Enviado

```
Asunto: Nueva consulta desde el sitio web - [Asunto del usuario]

Has recibido una nueva consulta desde el sitio web de Usittel:

Nombre: [Nombre del usuario]
Email: [Email del usuario]
Teléfono: [Teléfono del usuario]
Asunto: [Asunto del usuario]

Mensaje:
[Mensaje del usuario]

Este mensaje fue enviado desde el formulario de contacto de usittel.com.ar
```

## Solución de Problemas

### El formulario no envía emails
1. Verifica que la función `mail()` esté habilitada en PHP
2. Revisa los logs de error del servidor
3. Considera usar una librería como PHPMailer para mayor confiabilidad

### reCAPTCHA no funciona
1. Verifica que las claves sean correctas
2. Asegúrate de que el dominio esté registrado en Google reCAPTCHA
3. Revisa la consola del navegador para errores JavaScript

### Errores de JavaScript
1. Verifica que todos los scripts se carguen correctamente
2. Revisa la consola del navegador para errores
3. Asegúrate de que el archivo `process_form.php` sea accesible

## Próximos Pasos Recomendados

1. **Configurar SPF/DKIM** para mejorar la entrega de emails
2. **Implementar rate limiting** para prevenir spam
3. **Agregar logging** para monitorear el uso del formulario
4. **Considerar usar PHPMailer** para mayor confiabilidad en el envío de emails

## Notas Importantes

- El formulario está configurado solo para `index.html`
- Los emails se envían a `contacto@usittel.com.ar`
- El reCAPTCHA está configurado para el dominio `usittel.com.ar`
- El formulario incluye validación tanto del lado del cliente como del servidor 