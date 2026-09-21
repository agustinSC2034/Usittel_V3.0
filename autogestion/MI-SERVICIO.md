# Mi servicio

## Entrega actual: operaciones controladas, 20/09/2026

Ver [SERVICE-OPERATIONS.md](SERVICE-OPERATIONS.md) para fuentes, flags, tickets,
notificaciones, inspector SOAP, Wi-Fi y bloqueos reales pendientes. Sustituye las
notas históricas de alcance y conteo de tests conservadas más abajo.
Sin llamadas reales ni cambios de configuración privada en esta entrega.

Validación final: 758 verificaciones con fixtures, 62 archivos PHP con sintaxis
correcta, build y escaneo local de secretos correctos. QA en Chromium: 1366×900
y 390×844, sin desborde horizontal ni errores de consola. Se probó login ficticio,
solicitud comercial, actualización a Completado y formulario Wi-Fi con dos nombres
separados. No se ejecutó un cambio Wi-Fi ni una operación real contra proveedores.

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
Producto_Telefonia, Productos_Otros, Otros_Servicios, Adicionales y Set_Top_Box/STB, entre otros alias cerrados. Solo texto o listas de textos acotados; no
se extraen valores recursivamente de objetos desconocidos.

La documentación histórica nombra Productos_Television, pero el formato de la
instalación debe verificarse antes de configurar el mapper. Inspector manual:
`inspect-service-features.php <IDA>`: una lectura, solo presencia/tipos/cantidad.
No imprime nombres, direcciones, documentos, contraseñas ni valores de productos.
También informa ONU_Modelo saneado. Para listas de objetos se admite descriptor
explícito {field, label, quantity}; label debe ser una clave permitida y quantity
Cantidad. Cantidades entre 1 y 99; estructuras inválidas quedan desconocidas.
Ejemplo PHP: ['field'=>'Set_Top_Box','label'=>'Nombre','quantity'=>'Cantidad'].
Los campos de Sensa, packs y STB deben confirmarse con el inspector antes de activar
su mapeo; no se mezclan productos potenciales con servicios contratados.
Los enlaces comerciales abren el WhatsApp ya publicado de USITTEL sin adjuntar
datos personales. No contratan, envían mensajes ni cambian el abono automáticamente.

## Wi-Fi

Implementados POST wifi-prepare y wifi-change con sesión, CSRF y selected_ida.
Deshabilitado por defecto: wifi.enabled, lab_ida único y lista exacta models.
ONU_Modelo se consulta con InfoFTTH=1; dual_band_models habilita SSID_5G solo
para modelos validados. No se infiere soporte a partir del nombre del plan.

Exige clave actual de autogestión, confirmación y nombres/claves validados.
Un nonce vincula servicio y modelo durante 10 minutos. El bloqueo persistente
por contrato evita doble envío entre sesiones. Se conserva solo HMAC del payload,
nonce, fecha y estado; nunca claves ni nombres de red. Resultado incierto bloquea
nuevos cambios hasta revisión del operador. No se reintenta una escritura al vencer
el token. Ticket=0; solo el mensaje exacto de cambio aplicado confirma éxito.

La documentación describe Configurar_Wifi pero no conserva el request completo.
El cuerpo JSON implementado y la compatibilidad de los tres modelos requieren
prueba controlada real. No habilitar globalmente antes de esa prueba. No se cambió
configuración privada ni ninguna ONU en esta entrega.

## Speedtest

La UI abre http://velocidad.usittel.com.ar/speedtest/ en otra pestaña con
noopener/noreferrer. Es el test actual de USITTEL y todavía funciona por HTTP.
Se retiró Meter.net y sus excepciones CSP; no hay iframe ni medición automática.
El módulo LibreSpeed local se conserva inactivo para futura integración propia.
Requisitos del servidor: [SPEEDTEST-USITTEL.md](SPEEDTEST-USITTEL.md).

## Validación

647 verificaciones con fixtures, sin Phantom/SIRO real. Incluye Wi-Fi deshabilitado,
CSRF, reautenticación, pertenencia/modelo, datos inválidos, doble envío, cooldown
entre sesiones y resultados inciertos sin reintentos. Build correcto.
La medición externa y los equipos reales requieren validación manual; no se afirma
compatibilidad real a partir de fixtures.

## Inicio

Inicio presenta Servicios contratados (plan y adicionales públicos confirmados),
estado de cuenta sin próximo vencimiento y accesos a Mi servicio y Soporte.
Muestra hasta dos facturas recientes y enlaza al módulo completo de facturas/pagos.
Si products es null se informa que el detalle no está disponible: no equivale a
que el cliente no tenga adicionales. Completar Sensa/STB reales sigue pendiente
de confirmar el mapeo con el inspector; esta entrega no modifica configuración
privada ni autoriza campos nuevos por su nombre.
No se presenta como historial general de actividad: tickets, conversaciones y
cambios de cuenta todavía no tienen una fuente de eventos integrada.
