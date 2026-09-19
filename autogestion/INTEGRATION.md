# Integración local PHP / Phantom — 18/09/2026

## Selección de contrato

La etapa actual incorpora servicios asociados de Phantom y selección persistente. Prioriza `Conexiones_Asociadas` con reconsulta individual; solo si esa fuente no aporta otro contrato utiliza la búsqueda exacta por DNI/CUIT. Los contratos reales 1 y 1271 confirmaron respectivamente el respaldo documental y la asociación directa. El recorrido real de 1271 aceptó login, dos servicios, cambio de selección y actualización conjunta de dirección, plan, saldo y facturas, sin advertencias de asociación. Ver [SERVICES.md](SERVICES.md): authenticated_ida, authorized_services y selected_ida son conceptos separados. Las consultas y descargas usan selected_ida del servidor; nunca un IDA libre del navegador. SIRO multicontrato continúa bloqueado, sin nuevas escrituras. 418 verificaciones locales y aceptación visual real completada.

## Etapa actual: SIRO separado de Phantom

La lectura de laboratorio quedó aceptada en f47bb26. Se agregó creación y reconciliación SIRO, deshabilitada por defecto y validada con fixtures y una prueba manual real controlada. Ver [arquitectura SIRO](SIRO.md) y [primera prueba](FIRST-SIRO-TEST.md). SIRO intent created, SIRO payment confirmed y Phantom payment posted son hitos distintos: el tercero no se implementa. No se toca la lógica de lectura aceptada ni se imputan pagos.

Revisión SIRO1 del 19/09/2026: 450 verificaciones con fixtures. Cubren transporte simulado, identidad/importes, estados, recuperación, fechas de la POC, comprobantes únicos, dos procesos concurrentes, sesión/CSRF y bloqueo multicontrato incluso con SIRO configurado. QA desktop y mobile con checkout interceptado, más prueba manual real de cancelación y pago confirmado. La UI separa Facturas y Movimientos y no ofrece reconciliación manual para estados terminales. Sin errores JavaScript ni desborde horizontal. Sintaxis PHP/JS y chequeo local de secretos correctos.

Los tests/build/chequeos no contactan Phantom ni SIRO real; la conexión real ocurrió únicamente por acción manual de Agustín. La función temporal se recuperó del historial de la POC: hora Buenos Aires con milisegundos y Z literal; no UTC convencional. `PaymentAttempts` separa almacenamiento y dominio. Las rutas usan selected_ida y permiten exclusivamente una sesión de un servicio coincidente con siro.lab_ida. IDA 1 tiene dos servicios y permanece bloqueado. Las menciones históricas de “pagos deshabilitados” corresponden al cierre de lectura; SIRO sigue deshabilitado por defecto y requiere configuración privada explícita.

## Estado y evidencia

Agustín comprobó en Phantom real la autenticación GET HTTPS y las lecturas POST de Consulta_Cliente_Avanzada, Phantom_Mi_Estado_Cuenta y Phantom_Ultima_Factura mediante `inspect-schema.php 1 --auth-get`. La última lectura usó Limit=1, Offset=0. Cliente y factura son listas de objetos; cuenta es un objeto con Balance:string. El bundle CA privado ya permite verificar TLS.

El backend del portal utiliza ese contrato compartido. Agustín confirmó un único registro con ID:string coincidente con IDA 1 e IDAx distinto, y credenciales de autogestión presentes como strings. Configuró ID y el mapeo privado de usuario personalizado, ingresó correctamente y comprobó que la sesión persiste al recargar. Inicio mostró perfil, estado administrativo y última factura. Detalle de última factura y logout real también fueron aceptados: tras recargar vuelve al login sin datos del cliente.

## Transporte único

- Base HTTPS configurada privadamente, sin query, credenciales embebidas ni fragmento.
- Modalidad explícita `phantom_auth_mode=get-query-lab`. GET para action=autentificar y JSON=1; api_user/api_pass codificados RFC3986 en query. Sin fallback POST/formulario.
- Todas las lecturas son POST application/json: action, JSON=1, IDA y los parámetros de factura en query; token exclusivamente en cuerpo JSON.
- CurlTransport comparte TLS, límites, errores y decoder entre portal e inspectores. Certificado y hostname siempre verificados, redirects deshabilitados, respuesta limitada a 2 MiB, timeouts acotados.
- Exactamente un BOM UTF-8 inicial es tolerado. JSON estricto después; HTML, mensajes PHP, doble BOM y texto arbitrario se rechazan.
- El token técnico se guarda únicamente en runtime privado, con caché de 14 minutos y bloqueo de archivo. Una lectura con token vencido permite una renovación acotada. Los inspectores GET aislados no guardan tokens ni reintentan.
- El token no forma parte de la sesión del cliente ni llega al navegador. Los errores públicos y logs contienen códigos controlados, nunca URL completa ni cuerpos.
- El antiguo experimento `--auth-form` ya no es una opción del inspector. `--auth-get` conserva la inspección aislada comprobada; sin opción el inspector también usa GET y la caché privada del backend.

Las credenciales en query pueden aparecer en logs de Apache, proxies o infraestructura remota. Es un riesgo aceptado exclusivamente para este laboratorio y debe resolverse/revisarse antes de producción. No confundir HTTPS con protección frente a logs del servidor remoto.

## Identidad y acceso

Laboratorio exclusivamente IDA 1, incluso si una configuración histórica incluye 5. No se recorren clientes ni conexiones asociadas. Un usuario numérico solo resuelve un candidato; no autoriza. Los nombres personalizados necesitan `lab_users` privado.

CustomerContract exige una lista de exactamente un objeto y un identificador string decimal coincidente con el IDA solicitado. `customer_id_field` solo acepta ID o IDAx y comienza null. No hay elección automática entre ellos ni fallback al primero, ni selección mediante customer_path. Identificadores ausentes, incorrectos o de tipo inesperado, múltiples registros y duplicados fallan cerrados.

Antes de activar el login se revisa `inspect-customer.php 1 --validate-identity`: solo metadatos de ID, IDAx, Autogestion_User y Autogestion_Pass, sin sus valores. Si el reporte deja ambigüedad, no habilitar el contrato.

Autogestion_User y Autogestion_Pass deben ser strings no vacíos y compararse exactamente. No se recorta ni convierte la contraseña; no hay contraseña derivada de DNI/CUIT. Un cliente suspendido puede ingresar. El IDA de lecturas se obtiene solo de la sesión del servidor; no se acepta desde el navegador.

Sesión propia con regeneración al login, HttpOnly, SameSite Strict, Secure bajo HTTPS, CSRF login/logout, vencimiento por inactividad y duración máxima. Cambiar el contrato de identidad invalida sesiones anteriores. Logout destruye la sesión. Límites por IP/cuenta reservan intentos concurrentes y liberan exitosos/errores del proveedor, sin borrar fallos anteriores.

## Mapeos públicos explícitos

| Dato público | Fuente candidata observada / criterio |
| --- | --- |
| Nombre | Razon_Social si tiene texto; si no, Nombre + Apellido |
| Domicilio | Direccion + Dir_Numero; Lote, Manzana, Referencia y Barrio rotulados si existen |
| Ciudad | Ciudad |
| Plan | Producto_Internet, singular; texto literal, sin deducir velocidad/precio |
| Email | Email |
| Teléfono | Telefono; Movil si el primero no tiene texto |
| Estado administrativo | Estado_Servicio; no inferir conectividad desde él |
| Saldo | Phantom_Mi_Estado_Cuenta.Balance; nunca Balance_CC ni suma de facturas |

Los campos de presentación aceptan strings; ausentes o de otro tipo quedan no disponibles. `profile_fields` permite overrides solo sobre una lista explícita de campos públicos, y composiciones `join`. null utiliza los mapeos anteriores. Las viejas opciones customer_path y balance_path no autorizan registros ni seleccionan saldo. Verificar los mapeos visualmente con la cuenta real antes de darlos por aceptados.

La prueba real del IDA 1 contradijo la interpretación inicial de crédito menos débito: Agustín confirmó que el Balance positivo de 121 representa deuda en esta instalación. El adaptador USITTEL usa positivo → deuda, cero → saldo cero y negativo → crédito. El caso negativo está cubierto con fixtures, todavía no contrastado contra una cuenta real con saldo a favor. El valor original se conserva en balance. El parser admite decimales con punto y hasta dos decimales, o números finitos dentro del rango; no elimina símbolos ni separadores arbitrarios. Inválido/ausente → no disponible. La última factura pagada no anula la deuda de cuenta; son fuentes distintas. La lectura básica y el saldo fueron aceptados por Agustín para cerrar la etapa anterior.

Factura: IDT como identificador validado y sin duplicados; Periodo, Tipo, Comp_ID y Detalle como texto; Total numérico estricto; Primer_Vto y Segundo_Vto solo fechas válidas YYYY-MM-DD. Adaptador de Estado para PAGADA/IMPAGA; otros valores quedan no disponibles hasta confirmar contrato. No se inventan fecha de pago, saldo pendiente ni vencimiento global de cuenta.

### Historial paginado: contrato y prueba real aceptados

[Manual API de Phantom, páginas 23–26](https://drive.google.com/file/d/1ydYXQUSh_8YlvUH6PtaIBZqWMjgCLeHd/view) revisado en esta etapa: documenta Factura/Vto en orden descendente por ID, Limit y Offset conjuntos, y ausencia de total. Conservamos las lecturas POST JSON comprobadas en esta instalación aunque el manual ilustre GET.

Se piden diez registros, empezando por Offset=0. Una página llena habilita Cargar más; corta o vacía termina la consulta actual. No hay precarga ni barrido automático. `historyComplete=false` no promete un snapshot íntegro del historial; `endReached` solo informa una página corta. El total de registros/páginas no se inventa. Offset máximo 100000, múltiplo de diez; límites fijados por servidor.

Invoices.php valida IDs decimales de hasta 20 dígitos sin convertirlos a float; compara por longitud y orden léxico. Rechaza duplicados, páginas mayores que el límite y orden no descendente. La sesión registra posiciones/IDs ya recibidos y la próxima página autorizada; no permite saltar páginas. Reintentos de la misma página son idempotentes. Repeticiones entre páginas o continuidad alterada fallan con INVOICE_HISTORY_CHANGED: recargar reinicia el recorrido. No se presenta el resultado como un snapshot transaccional; con offsets un cambio concurrente puede causar omisiones que solo una API de cursor/snapshot podría evitar completamente.

El detalle se consulta en `GET invoice?id=...`: exige que el IDT ya pertenezca al historial de la sesión, vuelve a pedir exactamente una posición con Limit=1 para el IDA de sesión y comprueba el IDT retornado. Si la posición cambió, no se entrega otra factura ni se inicia un barrido. Si aparece un campo IDA contradictorio en una fila, también se rechaza. No se asumen que IDT y Comp_ID sean iguales.

`inspect-invoices.php 1` realiza una autenticación y dos lecturas (offsets 0/10), sin persistencia ni reintentos. Devuelve cantidades, orden/continuidad y metadatos de presencia/tipo del hash, nunca sus valores. Si no hay dos páginas con datos, la prueba no confirma continuidad entre páginas no vacías.

### Descarga: PDF confirmado y backend conectado

Botmaker aporta el path /PHANTOM/Includes/CRM/Comprobante_Factura.php y el contrato IDT=Hash_Descarga. Agustín confirmó con el inspector: HTTP 200, application/pdf, 512207 bytes, firma PDF, sin redirects, sin Content-Length. Posteriormente Agustín aceptó también la descarga reciente/histórica desde el portal.

GET invoice-document?id=... exige sesión activa IDA 1 y factura previamente cargada en esa sesión. Reconsulta su posición y comprueba exactamente el IDT; cambios de orden/propietario fallan cerrado. Resuelve el hash de ESA fila, no el último hash genérico. El navegador no puede enviar IDA, hash, URL ni token.

PhantomInvoiceDocuments es la fuente del portal. DocumentTransport.php comparte el GET con el inspector, TLS/hostname/CA, sin cookies ni token técnico en el GET documental, sin redirects y sin reintentos. Retiene el cuerpo en memoria solo en la descarga, con límite durante transferencia de 10 MiB y 32 KiB de headers. Solo acepta HTTP 200, MIME application/pdf, firma PDF y cierre EOF. HTML, vacío, contenido inválido, error o redirect no se entregan al navegador. La validación es de formato, no un análisis antimalware.

El PDF se entrega como attachment con nombre derivado del IDT validado, no-store/private, nosniff y CSP sandbox, sin reenviar headers externos. No se guarda en disco, no se exponen hashes/URLs al frontend. El navegador descarga mediante Blob con límite de tamaño. Si el hash falta o el archivo falla, se informa error sin documento ficticio. El listado indica disponibilidad del servicio de descarga; cada petición verifica el documento específico nuevamente.

El doble FixtureDocuments solo se inyecta desde tests/router.php. UnconfirmedInvoiceDocuments queda como fuente cerrada alternativa, no como default del portal. No se habilitaron comprobantes de pago ni SIRO.

## API e interfaz

El router local sirve /autogestion/ y la API del mismo origen: bootstrap, login, overview, invoices, invoice, invoice-document y logout. Bloquea acceso HTTP a server/tests/configuración. La web comercial permanece intacta.

Inicio recibe perfil, estado administrativo, saldo y la primera página de facturas; muestra solo las tres más recientes. Facturas y su detalle muestran solamente el DTO público. Un fallo de cuenta o factura no oculta el perfil confirmado y no se transforma en cero. Un fallo de identidad impide entregar el perfil. El frontend limpia datos al fallar y nunca importa demo-data en modo Phantom. Datos opcionales ausentes muestran No disponible.

Mi servicio y Mi cuenta reutilizan el perfil de lectura. Soporte no inventa tickets. Pagos, promesas, Wi-Fi, planes, datos personales y tickets siguen deshabilitados en Phantom. No se rediseñaron pantallas ni se eliminaron funciones del prototipo demo.

## Configuración y ejecución

Seguir FIRST-PHANTOM-TEST.md. Mantener config.php, bundle CA y runtime fuera del repositorio/directorio público con permisos del usuario de PHP. No reemplazar config.php con la plantilla ni imprimirlo. Variables: MI_USITTEL_CONFIG, MI_USITTEL_RUNTIME y MI_USITTEL_PHP.

`npm run check:mi-usittel` comprueba PHP 8.2+, cURL/JSON, configuración, runtime y rastros de secretos sin contactar Phantom. Identidad pendiente produce un aviso y el portal bloquea el login. `npm run dev:mi-usittel:php` sirve localhost:4174; el servidor estático 4173 no sustituye PHP.

## Pruebas y límites

`npm run test:mi-usittel` usa exclusivamente fixtures y un servidor local, nunca Phantom real. Cubre transporte GET/POST, encoding, BOM, TLS/errores seguros, lista e identidad, credenciales exactas, campos opcionales, saldo/facturas inválidos, whitelist pública, CSRF, sesión/logout/vencimientos, limitación de intentos, aislamiento demo y ausencia de secretos. Los dobles cURL no ejecutan red externa.

Aceptación real de esta etapa completada por Agustín: descarga reciente/histórica desde el portal y logout del recorrido ampliado. Páginas 1/2, continuidad y detalle del historial ampliado fueron confirmados por Agustín. Identidad, login, Inicio/saldo/última factura/detalle, recarga y logout de la etapa básica ya fueron aceptados por Agustín. Pendiente de producción: gestión de certificados en hosting, logs remotos de credenciales GET, revisión del despliegue y seguridad, gestión multiusuario y recuperación de contraseña. No modificar Apache, BAT de certificados, DNS, .htaccess, despliegue ni acceso público en esta etapa.

### QA local de esta entrega

QA de la etapa inicial del historial: 205 verificaciones con fixtures, chequeo local sin red y lint PHP. Navegador Chromium con respuestas sintéticas en modo Phantom: desktop 1365×900 y móvil 390×844. Se comprobó login exacto, recarga con sesión, Inicio, historial de 25 facturas en tres páginas (10/10/5), detalle reconsultado, Mi servicio, Soporte, Mi cuenta y logout. También se descargó un PDF simulado mediante la API local y la sesión propia; en aquella etapa la fuente documental real estaba bloqueada. Sin errores JavaScript, desbordamiento horizontal, carga de demo-data ni solicitudes externas. Pagos deshabilitados. Esto no sustituye la aceptación real del historial y la descarga.

## Validación real del historial y ajuste visual — 18/09/2026

Agustín ejecutó el inspector: primera página de 10 facturas, segunda de 1, sin duplicados entre páginas, orden descendente y continuidad correcta. Las 11 presentan Hash_Descarga de tipo string. Confirmó que el historial y los detalles funcionan en el portal. La paginación y el detalle ampliado quedan aceptados para IDA 1; la descarga desde el portal fue aceptada manualmente.

Ajuste de presentación solicitado: se oculta el Detalle técnico sin modificar los datos recibidos. En pantalla se quitan del plan la fecha técnica inicial y los segmentos internos de Phantom con formato `CODIGO ($) -`, incluidos `RES`, `EMP`, `COM` y `MUNI`; del domicilio se ocultan lote, manzana, referencia y barrio agregados por CRM. El selector muestra solo domicilio y plan, sin número de contrato. Gestionar mi servicio y Speedtest quedan visibles sin desplegable. Sus acciones reales continúan deshabilitadas en modo Phantom.

## Inspector del comprobante: evidencia Botmaker y prueba aceptada

La copia local de agustinSC2034/botmaker_functions_USITTEL (HEAD d3b4897) confirma en ph_ver_ultima_factura.js y ph_datos_autogestión.js que el texto retornado sin JSON=1 se concatena en /PHANTOM/Includes/CRM/Comprobante_Factura.php?IDT=…. El manual Api_phantom_texto_completa.md identifica ese texto como Hash_Descarga. ph_obtener_idt.js guarda el mismo texto bajo un nombre IDT, lo cual NO demuestra que sea el ID numérico. Este código histórico sirve como evidencia del endpoint, no como implementación a copiar: se conservan HTTPS, hash codificado y lectura JSON por factura. Las etiquetas descargar / descargar y pagar no confirman el MIME ni habilitan pagos.

Fuentes en ese repositorio: botmaker_js/scripts_actuales/ph_ver_ultima_factura.js, ph_datos_autogestión.js, ph_obtener_idt.js y apis/api_phantom_completa/Api_phantom_texto_completa.md. Los manuales revisados anteriormente no bastaban para identificar el endpoint; esta evidencia nueva completa esa parte, pero no prueba una descarga PDF.

inspect-invoice-document.php es CLI exclusivamente. Acepta IDA 1 y un IDT decimal normal; --latest selecciona explícitamente el primer IDT del historial JSON (no usa el modo texto ni sustituye una selección histórica). Consulta hasta dos páginas de diez, las ya comprobadas en laboratorio, con token POST y JSON=1. Valida orden, duplicados y propietario si está presente; selecciona exactamente el IDT dentro de la respuesta limitada a IDA 1. Un IDT no encontrado falla sin consultar el comprobante; no busca otros abonados ni sigue indefinidamente. Máximo cuatro solicitudes: auth, dos páginas y un GET documental; no reintenta ni persiste token, hash, cookies o documento.

El GET solo se construye sobre el origen HTTPS configurado y el path fijo. IDT en la URL lleva el Hash_Descarga de la fila seleccionada, codificado RFC3986. No envía token técnico ni cookies, no sigue redirecciones, mantiene TLS/hostname/CA y límites de tiempo. Descarta el cuerpo por streaming, reteniendo únicamente hasta 1024 bytes en memoria para detectar firma PDF/HTML; corta a 10 MiB y limita cabeceras a 32 KiB. No imprime contenido.

La salida es una lista cerrada de metadatos: endpoint fijo, HTTP, MIME reconocido, tamaño declarado numérico y bytes recibidos, firma PDF, tipo detectado y redirect. En redirects muestra coincidencia de origen HTTPS y solo paths estáticos conocidos; cualquier ruta no reconocida se omite porque también puede contener capabilities. Nunca muestra query, fragmento, host externo, valores de cookies ni cabeceras arbitrarias. HTTP 200 HTML se informa como tal y NO se considera descarga; un HTTP de error también se informa sin su contenido. Un error de transporte usa los códigos seguros existentes.

El inspector sigue siendo CLI; tras el resultado real, se extrajo su transporte a DocumentTransport.php, compartido con PhantomInvoiceDocuments. Descargar está conectado y el recorrido fue validado manualmente por Agustín. Fixtures cubren selección histórica exacta, más reciente explícita, otra cuenta, inexistente, hash ausente/vacío, duplicados, PDF, HTML, redirects internos/externos/HTTP/credenciales/path sensible, MIME desconocido, vacío, HTTP 500, tamaño de cuerpo/cabeceras, timeout y excepciones sin secretos. Ninguna prueba automatizada llama Phantom.

Validación de la etapa del inspector: 229 verificaciones con fixtures (24 nuevas del inspector documental), lint PHP y revisión de diff correctos. En la etapa del inspector no se ejecutaron consultas reales automáticas ni se habilitó el botón.

## Cierre de conexión documental

Prueba real aportada por Agustín: endpoint PDF, HTTP 200, 512207 bytes, sin redirects. El flujo del portal y la fuente HTTP están probados con fixtures; no se hicieron llamadas reales automáticas. Agustín confirmó el recorrido final: descarga y contraste de una factura reciente y otra histórica, cierre de sesión y recarga. Etapa de lectura de Facturas aceptada para IDA 1; corresponde informar al chat principal.

Validación de la conexión PDF: 242 verificaciones con fixtures, lint PHP y recorrido de navegador local mobile/desktop con descarga simulada. Las pruebas no contactan Phantom. El endpoint real fue probado por Agustín; la descarga completa desde el portal fue aceptada por Agustín.

## Cierre aceptado — 18/09/2026

Agustín respondió “listo todo ok” a la comprobación final solicitada: descarga de factura reciente e histórica, correspondencia de período/número/importe y logout seguido de recarga al login. Es aceptación manual del laboratorio IDA 1, no validación de otros clientes ni de producción. No se habilitan SIRO, pagos ni escrituras.
