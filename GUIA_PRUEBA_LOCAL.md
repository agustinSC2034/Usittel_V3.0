# Guía para Probar el Formulario Localmente

## 🖥️ Opción 1: XAMPP (Recomendado para Windows)

### Paso 1: Descargar e Instalar XAMPP
1. Ve a [https://www.apachefriends.org/es/index.html](https://www.apachefriends.org/es/index.html)
2. Descarga XAMPP para Windows
3. Instala XAMPP (sigue las instrucciones del instalador)

### Paso 2: Configurar el Proyecto
1. Abre la carpeta de instalación de XAMPP (normalmente `C:\xampp`)
2. Ve a la carpeta `htdocs`
3. Crea una carpeta llamada `usittel` (o el nombre que prefieras)
4. Copia todos los archivos de tu proyecto a esta carpeta

### Paso 3: Iniciar los Servicios
1. Abre XAMPP Control Panel
2. Haz clic en "Start" para Apache
3. Haz clic en "Start" para MySQL (opcional, solo si necesitas base de datos)

### Paso 4: Probar el Formulario
1. Abre tu navegador
2. Ve a `http://localhost/usittel/` (o el nombre de tu carpeta)
3. Navega hasta la sección de contacto
4. Prueba el formulario

## 🖥️ Opción 2: Servidor PHP Integrado (Más Simple)

### Paso 1: Verificar que tienes PHP instalado
Abre una terminal/cmd y ejecuta:
```bash
php --version
```

### Paso 2: Iniciar servidor PHP
1. Abre una terminal/cmd
2. Navega a la carpeta de tu proyecto
3. Ejecuta:
```bash
php -S localhost:8000
```

### Paso 3: Probar el Formulario
1. Abre tu navegador
2. Ve a `http://localhost:8000`
3. Prueba el formulario

## 🖥️ Opción 3: Live Server + Servidor PHP Separado

### Para el Frontend (HTML/CSS/JS):
1. Instala la extensión "Live Server" en VS Code
2. Haz clic derecho en `index.html` y selecciona "Open with Live Server"

### Para el Backend (PHP):
1. Usa XAMPP o el servidor PHP integrado como se explicó arriba
2. Modifica la URL en el JavaScript del formulario para apuntar a tu servidor PHP

## 🔧 Configuración para Pruebas

### Modificar la URL del Formulario (si usas Live Server)
Si usas Live Server para el frontend y XAMPP para el backend, modifica esta línea en `index.html`:

```javascript
// Cambiar esta línea en el script del formulario
fetch('http://localhost/usittel/process_form.php', {
```

### Configurar Email para Pruebas
Para pruebas locales, puedes:

1. **Usar un servicio de email de prueba** como Mailtrap
2. **Configurar un servidor SMTP local**
3. **Usar la función `mail()` de PHP** (funciona en XAMPP)

## 🐛 Solución de Problemas Comunes

### Error: "Failed to fetch"
- Verifica que el servidor PHP esté corriendo
- Revisa que la URL en el `fetch()` sea correcta
- Asegúrate de que no haya problemas de CORS

### Error: "reCAPTCHA not working"
- Verifica que las claves de reCAPTCHA sean correctas
- Asegúrate de que el dominio esté registrado en Google reCAPTCHA
- Para pruebas locales, agrega `localhost` y `127.0.0.1` a los dominios permitidos en Google reCAPTCHA

### Error: "Email not sending"
- Verifica que la función `mail()` esté habilitada en PHP
- Revisa la configuración de SMTP en `php.ini`
- Considera usar PHPMailer para mayor confiabilidad

## 📝 Notas Importantes

1. **reCAPTCHA en localhost**: Para que funcione en localhost, agrega estos dominios en la configuración de Google reCAPTCHA:
   - `localhost`
   - `127.0.0.1`
   - `localhost:8000` (si usas el servidor PHP integrado)

2. **Email en pruebas**: Para pruebas locales, considera usar un servicio como Mailtrap o configurar un servidor SMTP local.

3. **CORS**: Si tienes problemas de CORS, asegúrate de que el frontend y backend estén en el mismo dominio o configura los headers apropiados.

## 🚀 Próximo Paso: Subir al Hosting

Una vez que hayas probado localmente y todo funcione correctamente, puedes subir los archivos a tu hosting real donde PHP esté habilitado. 