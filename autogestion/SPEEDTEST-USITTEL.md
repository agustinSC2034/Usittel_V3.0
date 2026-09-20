# Integración futura de velocidad USITTEL

## Estado comprobado el 20/09/2026

- http://velocidad.usittel.com.ar/speedtest/ respondió HTTP 200 y carga speedtest.js (LibreSpeed).
- https://velocidad.usittel.com.ar/speedtest/ rechazó la conexión: ECONNREFUSED.
- No se ejecutó una medición, ni se probaron cargas grandes. No se modificó el servidor.
- Rutas backend, CORS, capacidad y límites aún no confirmados.

## Pedido al administrador

1. Habilitar HTTPS en velocidad.usittel.com.ar (puerto 443 accesible para los clientes), con certificado válido, cadena completa y renovación automática. La página y los endpoints deben funcionar sin redirecciones a HTTP.
2. Confirmar versión de LibreSpeed y URLs HTTPS exactas de descarga (garbage.php) y subida/latencia (empty.php). /speedtest/backend/ es una ruta propuesta, no comprobada. La integración actual espera ambos archivos en una misma base.
3. Permitir solicitudes CORS desde el origen de Mi USITTEL. Para la prueba local: http://127.0.0.1:4174 (sin /autogestion). El origen HTTPS definitivo se informará antes de producción; no inventarlo. Autorizar GET/POST, cabeceras Content-Type/Content-Encoding y responder OPTIONS cuando corresponda. LibreSpeed soporta cors=true, que debe llegar al backend sin ser eliminado. No necesitamos cookies ni credenciales cross-origin.
4. Aceptar cuerpos POST de al menos 20 MB en toda la cadena web/proxy/PHP; el cliente preparado usa bloques de 4 MB. No responder con páginas de login, CAPTCHA o desafíos. No cachear las respuestas de medición ni comprimir los datos de descarga. Revisar límites y buffering para no distorsionar el resultado; mantener protecciones compatibles con el volumen previsto.
5. Informar capacidad de interfaz y enlace, ubicación del servidor y concurrencia soportada. Tener margen respecto al plan más rápido que se quiera medir y a clientes simultáneos. Evitar que un CDN/proxy sea el cuello de botella. Una medición contra un servidor dentro de USITTEL evalúa ese trayecto, no garantiza rendimiento hacia todos los destinos de internet.
6. Entregar solo URLs y confirmación de estas condiciones. No necesitamos contraseñas, tokens ni acceso administrador para consumir los endpoints públicos.

## Trabajo posterior en Mi USITTEL

Configurar speedtest_server con la base HTTPS confirmada en configuración privada,
reactivar interfaz/motor LibreSpeed y verificar CORS, descarga, subida, latencia,
cancelación y móviles. No basta con habilitar HTTPS para declarar la integración
terminada. El tráfico debe ir directamente navegador-servidor de medición, nunca
por el backend de Mi USITTEL. Telemetría y consulta de IP/ISP permanecen apagadas.
No hace falta permitir iframes si usamos el motor local y esos endpoints.

Hasta esa validación, Mi servicio abre el test actual de USITTEL en una pestaña nueva.

Referencia: https://github.com/librespeed/speedtest/blob/master/doc.md
