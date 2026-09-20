# Mi servicio

El plan contratado es la fuente de presentación de velocidad. No se infiere una
velocidad medida desde ese texto ni se repite una fila vacía de velocidad. El
domicilio continúa en Inicio y el selector de servicio; se quita de esta vista.

## Estado de conexión

`POST /api/service-connection` con sesión, CSRF y revisión del servicio. No admite
IDA ni otros parámetros: usa selected_ida. Nueva lectura de
Consulta_Cliente_Avanzada con InfoFTTH=1; verifica ID exacto antes de publicar.
Solo Online/Offline de ONU_Status se interpretan como estado del equipo. Si no
existe un valor reconocido se muestra Estado_Conexion, rotulado conexión a internet.
Nunca se convierte timeout, Loss u otro valor desconocido en desconexión.
checkedAt es el momento de consulta, no una fecha de telemetría del equipo. La
documentación de Phantom habla de datos FTTH periódicos y estado ONU inmediato;
la actualización real en esta instalación requiere contraste manual. No se
publican IP, MAC, GPON, potencias ni credenciales. Límite: una consulta/10 segundos
por sesión. Respuestas del contrato anterior se descartan en navegador.

## Productos y adicionales

Inicio y Mi servicio comparten la lista products. null indica desconocido; []
indica lista vacía confirmada por los campos configurados. No se deduce que un
cliente carece de Sensa por la ausencia de un campo. El mapper acepta campos
seleccionados por el operador mediante service_product_fields, de una lista
cerrada: Productos_Television, Producto_Television, Productos_Telefonia,
Producto_Telefonia, Productos_Otros. Solo texto o listas de textos acotados; no
se extraen valores recursivamente de objetos desconocidos.

La documentación histórica nombra Productos_Television, pero el formato de la
instalación debe verificarse antes de configurar el mapper. Inspector manual:
`inspect-service-features.php <IDA>`: una lectura, solo presencia/tipos/cantidad.
No imprime nombres, direcciones, documentos, contraseñas ni valores de productos.
Los enlaces comerciales abren el WhatsApp ya publicado de USITTEL sin adjuntar
datos personales. No contratan, envían mensajes ni cambian el abono automáticamente.

## Wi-Fi

Sección propia y explicación de 2,4/5 GHz. Guardado real pendiente. El documento
histórico describe Configurar_Wifi, SSID/SSID_5G/Password, restricciones 8–20 y
compatibilidad OMCI/TR069; no conserva un request completo ni confirma equipos
compatibles. No es suficiente para implementar escrituras fiables. No existe
ruta nueva de escritura ni captura de claves reales. La UI ofrece ayuda al cliente.
Antes de habilitar: comprobar request/respuesta y compatibilidad, selected_ida,
CSRF, reautenticación/confirmación apropiada, límite de cambios, gestión de timeout
sin reintento ciego y nunca Ticket=1 de forma implícita.

## Speedtest interno

Motor LibreSpeed local con UI propia, arco animado de progreso, valores reales de
descarga/subida/latencia/jitter, cancelación, timeout y movimiento reducido.
No hay resultado simulado en modo Phantom ni salida a un sitio de medición.
El servidor remoto recibe únicamente tráfico de prueba; no cookies de Mi USITTEL,
IDA, nombre, plan ni referencias. Como todo servidor de red ve la IP del dispositivo;
Mi USITTEL no consulta geolocalización/ISP ni persiste resultados. El motor tiene
telemetría apagada y no ejecuta getIP.php. Descargar/subir datos puede consumir
mucho tráfico y afectar otras actividades durante la prueba.

El operador configura en el archivo privado `speedtest_server` con la URL HTTPS
base que contiene backend/garbage.php y backend/empty.php (por ejemplo, una base
terminada en /speedtest/backend/). No poner una URL de página ni localhost. Solo
HTTPS y host explícito; CSP permite ese único origen, worker local. No se modifica
la configuración privada automáticamente. POST speedtest-start exige sesión,
CSRF y revisión, no recibe URL desde navegador y limita inicio a uno/minuto.
El límite protege el inicio en la app; el servidor de medición debe tener sus
propios límites de tráfico, concurrencia y abuso. No usar el router PHP monohilo
ni un proxy del portal como punto de prueba de capacidad.

Revisión 2026-09-20: http://velocidad.usittel.com.ar/speedtest/ responde 200 y usa
LibreSpeed; HTTPS rechaza la conexión. No se ejecutó una medición. Pendiente
habilitar HTTPS y comprobar CORS de empty.php y garbage.php para el origen del
portal; en ningún caso deshabilitar TLS ni integrar contenido mixto. Se reutiliza
el servidor de USITTEL existente cuando cumpla estas condiciones. No se tocó
Apache/DNS/producción. El test mide la red del dispositivo, no necesariamente el
contrato seleccionado; se recuerda conectarse a la red del domicilio.

Ayuda: Cat 5e+ con puertos Gigabit hasta 1 Gbps; conexiones mayores requieren
equipos adecuados; diferencias por protocolos/carga son esperables. Wi-Fi 5 GHz
cerca del router suele favorecer velocidad; 2,4 GHz no tiene máximo universal
de 100 Mbps. Fuentes: https://github.com/librespeed/speedtest y
https://www.intel.com/content/www/us/en/products/docs/wireless/2-4-vs-5ghz.html.

## Validación de esta entrega

603 verificaciones de la suite completa con fixtures, sin Phantom/SIRO ni tráfico
de medición real. Incluye sesión/CSRF, IDA manipulado, selección/revisión de
contrato, estados desconocidos, timeout, límites, whitelist de productos,
configuración HTTPS, errores y cancelación del worker. Build y sintaxis PHP
correctos. Revisión en navegador aislado a 1365, 390 y 320 px: actualización,
mensaje de medición no disponible, diálogo Wi-Fi y ausencia de desborde horizontal.
Sin errores JavaScript observados. Medición real y configuración Wi-Fi aún no
validadas contra equipos reales; no se alteró configuración privada.
