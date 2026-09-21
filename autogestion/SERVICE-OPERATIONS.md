# Mi servicio: operaciones controladas

Revisión del 20/09/2026. Este documento describe la entrega actual; las notas de
laboratorio anteriores conservadas en README, INTEGRATION y MVP son históricas.
No se consultó ni modificó ningún cliente real durante esta entrega. No se cambió
configuración privada, producción, Apache, DNS ni la web pública.

## Evidencia y límites

| Área | Documentación | Fixtures locales | Phantom real |
|---|---|---|---|
| SOAP | Manual 1v3, revisión junio 2017, páginas 2, 8–12 | Cliente de lectura, rechazo de alcance, auth, timeout y salida segura | Autenticación, estructura de abonado y perfiles pendientes |
| Upgrade | `modificar_abonado`, selector `Id_Busqueda`, campo `perfil`, `Phantom_Provissioning=1` | Catálogo ascendente, sin downgrades ni campos libres del navegador | Relación comercial/técnica, facturación y aprovisionamiento pendientes |
| Tickets | Consulta de existencia, listado y creación REST | Creación única, propiedad, duplicados, estados, fallback y eventos | Categorías, delegaciones, estados y respuestas pendientes |
| Wi-Fi | `SSID`, `SSID_5G`, `Password`, `Ticket` en REST actual | Se conserva flujo existente, con invalidación y persistencia reforzadas | Cada modelo y ambas bandas pendientes de ensayo autorizado |
| Notificaciones | Sin proveedor confirmado | Eventos únicos locales | Email y Webchat sin conectar |

Fuentes revisadas: [wiki REST actual](https://wiki.phantom.com.ar/en/APIs) y
[manual SOAP histórico](https://drive.google.com/file/d/1qyXPyDlN0vcif0HW3HytNAECXjZOa_ss/view).
También se contrastó visualmente la página 11 del PDF. La documentación antigua
no demuestra el comportamiento de esta instalación actual.

En la operación manual de USITTEL, el cambio de velocidad requiere cambiar Perfil
Internet y posteriormente ejecutar Act. Perfiles. Un upgrade automático no se
considera exitoso hasta comprobar ambos efectos.

El CRM Phantom permite configurar SSID 2.4 GHz y SSID 5 GHz por separado. La
autogestión Phantom actual muestra un solo nombre de red. Mi USITTEL no debe
replicar esa simplificación hasta conocer exactamente su comportamiento.

## A. Upgrade: inspección disponible, escritura bloqueada

El manual atribuye al indicador `Phantom_Provissioning=1` efectos sobre las colas
de control de velocidad al cambiar el perfil. Sin ese indicador describe un
cambio de gestión. Esto apoya la hipótesis, pero no acredita que actualice una
ONT moderna, que ejecute el equivalente actual de Act. Perfiles ni que cambie
el producto facturable. `modificar_perfiles` es global y queda totalmente fuera.

No se implementó una llamada de escritura SOAP ni una ruta HTTP de upgrade.
El botón de cambio automático permanece deshabilitado incluso si alguien coloca
`upgrade.enabled=true`: no existe un escritor de producción detrás. La consulta
comercial de planes ya existente permanece disponible.

`PhantomSoapClient` y `NativeSoapReadTransport` aíslan cuatro operaciones:
autentificar, consulta_abonado, consulta_perfiles y desconectar. HTTPS, host/puerto
y ruta del mismo Phantom REST, certificado validado, timeout y respuesta máxima
de 2 MiB. Sin WSDL remoto, trace, redirecciones, entidades externas ni retries.
El token SOAP vive únicamente en memoria y no se comparte con REST/CRM.
Se usan las credenciales técnicas privadas existentes; que SOAP las acepte sigue
pendiente. El PHP local inspeccionado no tiene cargada la extensión SOAP.

Inspector manual: `inspect-plan-upgrade.php <IDA>`. Solo CLI. El IDA explícito
autoriza esta lectura, no un cambio. Consulta REST con InfoFTTH y el parámetro
documentado **ImporteProdutos=1** (ortografía de la wiki). Informa plan comercial
saneado, modelo/tecnología, presencia y estructura de productos, catálogo
configurado, extensión SOAP y NOT_READY. No imprime importes personales, claves,
documentos, IP, MAC ni respuestas completas. El perfil técnico queda desconocido
hasta validar su representación; no se lo reemplaza por el nombre comercial.

SOAP solo se consulta cuando `soap.read_enabled=true` y `soap.lab_ida` coincide.
`soap.url` debe terminar en `/Includes/API.php` sobre el mismo host/puerto del REST.
`soap.profile_names` contiene nombres exactos a consultar, hasta diez. El inspector
no enumera todos los abonados/perfiles. Sin esos nombres consulta el catálogo de
destinos configurado; si está vacío, no afirma haber probado consulta_perfiles.
Las respuestas SOAP se reducen a presencia/tipos de campos permitidos.

La REST documenta productos Internet separados de otros productos y, opcionalmente,
Neto/Impuestos/Total. No demuestra que la asignación del perfil SOAP cambie esos
productos ni la próxima factura. Por eso **plan comercial = perfil técnico no está
confirmado**, y la coherencia de facturación impide habilitar un upgrade.

El catálogo privado `upgrade.plans` es un diccionario de claves estables; cada
entrada exige current, target, phantom_profile, public_name, current_down,
current_up, speed_down, speed_up y price_cents (enteros). Ambas velocidades deben
mantenerse o subir y al menos una debe subir; el destino debe ser distinto. No
hay precios reales cargados ni perfiles inventados. El navegador no envía estos
valores. El catálogo por sí solo no concede permiso para escribir.

Pendiente antes de construir el escritor: validar autenticación/lecturas SOAP,
identidad y estructura exactas; elegir un único laboratorio y un destino; comprobar
productos/importes antes/después y obtener evidencia técnica del equipo. Recién
entonces preparar UNA llamada autorizada, sin retries, y releer las tres fuentes.
Los estados NOT_STARTED, PREPARED, APPLYING, APPLIED, APPLY_UNCONFIRMED y NEEDS_REVIEW
son el contrato previsto, **no un circuito de upgrade ya implementado o probado**.
Tampoco se simula como resuelto un ticket automático por provisioning fallido.

Si la prueba futura solo cambia el perfil administrativo, detenerla. Para estudiar
el paso faltante, el operador podrá abrir Network del CRM, filtrar Fetch/XHR y
presionar **Aprovisionamiento → Act. Perfiles** una sola vez sobre el laboratorio
autorizado. Compartir únicamente método, ruta sin query sensible, nombres de
campos y código HTTP; nunca HAR, Copy as cURL, cookies, tokens, credenciales ni
cuerpos completos. Capturar una ruta interna no autoriza a integrarla.

## B. Solicitudes comerciales

Tipos soportados: TV_SENSA, SENSA_PACK, STB, MESH y WIFI_HELP. Son solicitudes,
no altas, contratación automática ni cambios de facturación. La UI solicita
confirmación y advierte que se confirmarán condiciones antes de contratar.

`tickets.enabled=false` por defecto; si se habilita requiere un único `lab_ida`.
Cada entrada de `tickets.products` exige category, delegation, priority (1–5),
subject, contracted_labels y states. Los nombres internos deben confirmarse en
esta instalación. No hay categorías reales precargadas. Se rechaza delegación
`Creado como Resuelto` y categorías duplicadas entre productos para evitar
equivalencias ambiguas. Los estados se mapean a RECEIVED, PREPARING, READY,
REJECTED; un estado desconocido jamás se convierte en preparado.

`contracted_labels` contiene nombres exactos ya validados del mapper products.
Un producto confirmado contratado bloquea la solicitud también en backend; la
comparación admite el sufijo de cantidad que agrega nuestro propio mapper.
`products=null` ofrece Consultar disponibilidad y genera una consulta, no presume
ausencia. `products=[]` significa ausencia únicamente dentro de campos soportados.
Los botones sin mapping válido quedan deshabilitados. STB tiene su opción propia.

Rutas nuevas:

- POST request-prepare: solo type. Relectura de productos, nonce por sesión,
  contrato y tipo con vencimiento de diez minutos.
- POST request-create: solo requestId y confirmed=true; toma IDA/tipo/mapping del
  servidor. Usa sesión, CSRF y revisión de servicio existentes.
- GET service-requests: historial local del contrato seleccionado.
- POST request-refresh: identificador opaco local; nunca un IDTT arbitrario.
  Verifica pertenencia local y luego ID/IDA/categoría en la respuesta Phantom.

Antes de crear, consulta abiertos y pendientes por IDA mediante Tickets_Help_Desk
y el período explícito. Si existe uno equivalente, lo adopta; dos equivalentes,
respuestas desconocidas, IDs ajenos o lotes excesivos bloquean. Sin equivalente,
consulta Phantom_Consultar_Estado_TT. La wiki no define inequívocamente el caso
vacío: `tickets.clear_response` debe configurarse tras observar los valores y
tipos exactos de IDTT vacío y Permitir. Por defecto es null y bloquea la escritura.
El inspector `inspect-service-requests.php <IDA>` obtiene esas formas sin crear
tickets ni exponer textos/identidades de otros clientes. Errores “sin datos” no
confirmados no se interpretan automáticamente como ausencia de tickets.

Una transacción bajo lock compartido reserva SUBMITTING en JSON privado mediante
reemplazo atómico, flush y fsync antes del único POST. Se relee el ID creado y
se verifica su propiedad. Timeout/ambigüedad deja UNKNOWN, nunca reenvía. Incluso
tras reiniciar proceso/sesión se conserva el bloqueo. El historial guarda ID local,
IDTT, IDA, tipo, categoría de verificación, fecha y último estado; no textos
libres del cliente ni SSID/claves. Capacidad conservadora: 1.000 solicitudes,
luego revisión del operador. Requiere MI_USITTEL_RUNTIME privado persistente.

El transport existente conserva su decodificador JSON estricto. Solo el método
dedicado de creación admite el ID decimal en texto que documenta la wiki. Un
error JSON que contiene un número de ticket nunca se interpreta como éxito.

El seguimiento se actualiza al pulsar actualizar en la solicitud. No existe
polling en segundo plano ni scheduler. Si una creación fue incierta y no se conoce
IDTT, requiere reconciliación manual antes de permitir otra; no hay botón de retry.
No se puede impedir una creación concurrente hecha por otro sistema; también se
depende del rechazo de duplicados del proveedor. Un rechazo ambiguo queda en revisión.

## Notificaciones

NotificationService registra TicketCreated, TicketReady y TicketRejected una sola
vez por contrato/ticket/evento, después de verificar propiedad y estado. La outbox
comparte la transacción del estado. No se encontraron proveedores de correo
reutilizables en autogestión. EmailNotificationAdapter y BotmakerNotificationAdapter
son interfaces deshabilitadas: no envían mensajes ni aceptan una identidad inventada.
Los flags notifications.email_enabled/botmaker_enabled permanecen false; ponerlos
en true no conecta un proveedor. La entrega real y el scheduler quedan pendientes.
La interfaz de despacho reserva por canal antes de llamar al adapter; incluso un
timeout o caída tras enviar bloquea el reenvío automático. Los fixtures verifican
eventos y llamadas únicas a adapters ficticios, **no entrega de correo ni Webchat**.

## C. Wi-Fi

Se reutilizan wifi-prepare/change, reautenticación con la cuenta autenticada,
selected_ida, CSRF, modelo exacto, nonce, HMAC y bloqueo compartido. Cambio de
contrato descarta definitivamente el nonce, también al volver al servicio inicial.
Logout revoca la sesión. La reserva UNKNOWN se guarda antes de escribir; ahora el
archivo de resultado también se reemplaza atómicamente para que un corte no borre
la reserva. El despliegue de este cambio exige detener procesos de la versión
anterior: el lock pasó a un archivo separado; los estados existentes se conservan.

Modelo single-band: SSID y una Password. Modelo dual-band validado: SSID y SSID_5G
explícitos y una única Password para ambas bandas. Nunca se deriva sufijo ni se
unifican nombres. Si el usuario escribe el mismo nombre en los dos campos se
respeta su decisión explícita. Campos rotulados como NUEVOS valores, sin prellenado.
No se encontró una lectura oficial de SSIDs actuales en las operaciones revisadas;
no se hizo scraping de mi_wifi.php ni se dedujo el comportamiento del formulario
viejo de un solo nombre. Esto no afirma que ninguna versión del proveedor lo ofrezca.

Conjunto conservador server-side: 8–20 caracteres, letras/números/@/punto/guion
bajo; la contraseña además admite # y $. Se rechazan espacios para no depender
de la sustitución silenciosa documentada por Phantom. No se amplían rangos por
el frontend anterior. Modelos y dual_band_models siguen siendo allowlists exactas.

Ticket=0 siempre. Solo code=200 más el mensaje exacto de cambio aplicado produce
APPLIED. Un mensaje de ticket, timeout, token vencido o respuesta desconocida
produce UNKNOWN y no reintenta. Si existe mapping WIFI_HELP habilitado para ese
mismo laboratorio, crea/adopta nuestra solicitud genérica sin pasar SSID ni clave.
Para equipo incompatible, el usuario dispone de Pedir ayuda con confirmación;
sin mapping se conserva el contacto comercial existente. No se crea un ticket
solo por abrir la pantalla. El formulario descarta las contraseñas tras enviar.

## Validación y próximo paso

Preparación read-only del 21/09/2026: el inspector de tickets distingue presencia
y tipo de IDTT/Permitir, ID vacío, permiso 0/1 conservando tipo y cantidades de
filas de listas. Solo publica estados de una lista genérica cerrada; otros se
cuentan como desconocidos. Categoría/delegación solo presencia/tipo. Una respuesta
objeto o error no se presenta como cero tickets. Sin prueba real todavía no se
configuran clear_response, categorías, delegaciones ni estados, ni se habilitan
escrituras. HTTP se informa únicamente si está disponible en el error de transporte.

El inspector SOAP termina en NOT_READY_FOR_UPGRADE_WRITE. Distingue plan comercial,
perfil técnico, autenticación y coincidencia exacta de perfiles consultados.
TECHNICAL_PROFILE_KNOWN requiere registro directo o lista de un registro, identidad
coincidente y campo perfil no vacío; no sustituye perfil con Producto_Internet.
PROFILE_LOOKUP_OK requiere respuestas reconocidas con Nombre exactamente igual
al solicitado para todos los nombres configurados. Otros formatos son desconocidos,
no errores interpretados como éxito. Con cero nombres no afirma haber validado perfiles.
BILLING_RELATION_UNKNOWN y PROVISIONING_RELATION_UNKNOWN permanecen siempre.
Conocer la estructura del perfil no acredita facturación ni aprovisionamiento.

Antes de su futura ejecución manual: extensión PHP SOAP, soap.read_enabled=true,
soap.lab_ida del laboratorio elegido, soap.url HTTPS del mismo host y puerto REST
con API.php en lugar de API_Rest.php, CA válida y soap.profile_names exactos.
Las credenciales técnicas existentes deben ser aceptadas por SOAP; no se prueba aquí.
No habilitar upgrade ni agregar métodos de escritura.

Para Wi-Fi se conserva inspect-service-features.php: el IDA 4950 aportado no devolvió
ONU_Modelo. Necesitamos un IDA controlado con ONU y su modelo exacto devuelto por
esa lectura; después confirmar físicamente sus bandas. Solo entonces definir
wifi.lab_ida, wifi.models y, si corresponde, wifi.dual_band_models. Obtener el
modelo no autoriza el cambio. La prueba futura será una escritura expresamente
confirmada, sin retries; ambos SSID explícitos para dual-band, Ticket=0.

Orden manual: primero ejecutar únicamente inspect-service-requests.php sobre 4950
y revisar el resultado. Después se acuerda la lectura del modelo, luego SOAP.
No se ejecutaron consultas reales desde esta entrega ni se cambió config.php.

Primera lectura real aportada: Phantom_Consultar_Estado_TT devolvió un objeto con
IDTT entero 0 y Permitir entero 1. La respuesta vacía exacta queda confirmada como
`['IDTT'=>0,'Permitir'=>1]`; conservar `tickets.enabled=false` hasta conocer el
primer mapping. Los listados Abierto/Pendiente devolvieron objetos con `code`, no
listas. No se reinterpretan como cero: el inspector informa ahora solamente tipo
y código numérico, y presencia/tipo de message sin publicar su contenido. Hace
falta repetir esa lectura antes de decidir la semántica y las categorías reales.
La documentación usa code 400 también para ausencia de resultados. El inspector
compara internamente el mensaje con la lista cerrada de errores documentados y
publica solo una etiqueta segura; cualquier texto distinto permanece oculto.

Decisión de producto del 21/09/2026: no continuar con creación de tickets Phantom.
Mantener `tickets.enabled=false`; no configurar clear_response, categorías,
delegaciones ni mappings aunque la lectura haya confirmado IDTT=0/Permitir=1.
El inspector ejecutado fue exclusivamente GET y no creó tickets. Las solicitudes
de TV Sensa, packs, STB, Mesh y ayuda operativa se conectarán más adelante con un
canal atendido por una persona. El proveedor y contrato de ese canal siguen sin
definir; no se simula un envío ni una confirmación.

El cambio automático que continúa en estudio es únicamente subir el perfil de
Internet. Conserva el orden de validación SOAP read-only, relación comercial,
facturación y aprovisionamiento antes de implementar cualquier escritura.
Actualizar el número de WhatsApp/dato de contacto queda como operación separada:
la pantalla actual no persiste ese cambio en Phantom y no debe presentarlo como
guardado real.

Primera inspección SOAP real aportada para IDA 4950: HTTPS y host/puerto correctos,
extensión disponible mediante CLI, SOAP_AUTH_OK y consulta_abonado ejecutada. La
respuesta es una lista posicional de 90 strings; el manual solo afirma que devuelve
un array y no documenta ese orden. No se asigna ningún índice a ID, perfil, producto,
modelo ni dato personal. La identidad y el perfil técnico permanecen desconocidos,
facturación y aprovisionamiento también. consulta_perfiles no se ejecutó porque la
lista privada de nombres exactos estaba vacía. Resultado conservado:
NOT_READY_FOR_UPGRADE_WRITE.

El CRM aportado visualmente confirma, sin guardar cambios, el nombre exacto del
perfil actual de empresa 200 Mbps y un destino seleccionable de empresa 500 Mbps.
El inspector puede buscar esos valores exactos solo en el nivel superior de la
lista posicional y devolver índices, nunca los demás valores. Una coincidencia
única queda como TECHNICAL_PROFILE_CANDIDATE_POSITIONAL; no demuestra todavía la
semántica del índice, facturación ni que modificar_abonado ejecute Act. Perfiles.

Segunda inspección real: el IDA buscado coincide únicamente con la posición 0 de
consulta_abonado, evidencia compatible con el abonado correcto pero todavía sin
nombres de campo. Ninguno de los dos textos visibles del selector CRM (empresa
200/500 Mbps) aparece en la respuesta posicional. consulta_perfiles por Nombre
devolvió null para ambos, por lo que PROFILE_LOOKUP permanece UNCONFIRMED. Los
textos comerciales del selector no se toman como alias técnicos SOAP ni se ensayan
variantes inventadas.

La lectura directa del selector CRM confirmó que el atributo value coincide
exactamente con el texto visible tanto para empresa 200 como para empresa 500 Mbps;
el perfil actual quedó seleccionado y no se guardó ningún cambio. La siguiente
ejecución read-only agrega únicamente la forma del sobre SOAP (resultado ausente,
nulo, vacío o con hijos), sin conservar ni publicar valores de Phantom. Esto permite
distinguir una respuesta realmente nula de una envoltura que PHP no interpretó.

Suite de fixtures y QA local: ver el cierre de entrega en MI-SERVICIO.md. Ningún
fixture demuestra compatibilidad real con las tres ONUs. El plan de prueba real
debe avanzar de a una acción: primero lectura/inspector; luego configuración
privada del único laboratorio y los nombres confirmados; después, solo con nueva
confirmación, una escritura controlada. Esta entrega no la ejecuta.
