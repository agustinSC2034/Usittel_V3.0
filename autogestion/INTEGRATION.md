# Integración local PHP / Phantom — 18/09/2026

## Estado y evidencia

Agustín comprobó en Phantom real la autenticación GET HTTPS y las lecturas POST de Consulta_Cliente_Avanzada, Phantom_Mi_Estado_Cuenta y Phantom_Ultima_Factura mediante `inspect-schema.php 1 --auth-get`. La última lectura usó Limit=1, Offset=0. Cliente y factura son listas de objetos; cuenta es un objeto con Balance:string. El bundle CA privado ya permite verificar TLS.

El backend del portal utiliza ese contrato compartido. Agustín confirmó un único registro con ID:string coincidente con IDA 1 e IDAx distinto, y credenciales de autogestión presentes como strings. Configuró ID y el mapeo privado de usuario personalizado, ingresó correctamente y comprobó que la sesión persiste al recargar. Inicio mostró perfil, estado administrativo y última factura. Falta completar detalle de factura y logout reales.

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

La prueba real del IDA 1 contradijo la interpretación inicial de crédito menos débito: Agustín confirmó que el Balance positivo de 121 representa deuda en esta instalación. El adaptador USITTEL usa positivo → deuda, cero → saldo cero y negativo → crédito. El caso negativo está cubierto con fixtures, todavía no contrastado contra una cuenta real con saldo a favor. El valor original se conserva en balance. El parser admite decimales con punto y hasta dos decimales, o números finitos dentro del rango; no elimina símbolos ni separadores arbitrarios. Inválido/ausente → no disponible. La última factura pagada no anula la deuda de cuenta; son fuentes distintas. Pendiente confirmar visualmente la corrección en el portal.

Factura: IDT como identificador validado y sin duplicados; Periodo, Tipo, Comp_ID y Detalle como texto; Total numérico estricto; Primer_Vto y Segundo_Vto solo fechas válidas YYYY-MM-DD. Adaptador de Estado para PAGADA/IMPAGA; otros valores quedan no disponibles hasta confirmar contrato. No se inventan fecha de pago, saldo pendiente ni vencimiento global de cuenta.

Siempre Limit=1 y Offset=0. La API rechaza otros offsets y anuncia `historyComplete=false`; la interfaz dice última factura disponible. La paginación del historial no está validada. No hay PDF, comprobantes de pago ni enlaces SIRO públicos.

## API e interfaz

El router local sirve /autogestion/ y la API del mismo origen: bootstrap, login, overview, invoices y logout. Bloquea acceso HTTP a server/tests/configuración. La web comercial permanece intacta.

Inicio recibe perfil, estado administrativo, saldo y factura. Facturas y su detalle muestran solamente el DTO público. Un fallo de cuenta o factura no oculta el perfil confirmado y no se transforma en cero. Un fallo de identidad impide entregar el perfil. El frontend limpia datos al fallar y nunca importa demo-data en modo Phantom. Datos opcionales ausentes muestran No disponible.

Mi servicio y Mi cuenta reutilizan el perfil de lectura. Soporte no inventa tickets. Pagos, documentos, promesas, Wi-Fi, planes, datos personales y tickets siguen deshabilitados en Phantom. No se rediseñaron pantallas ni se eliminaron funciones del prototipo demo.

## Configuración y ejecución

Seguir FIRST-PHANTOM-TEST.md. Mantener config.php, bundle CA y runtime fuera del repositorio/directorio público con permisos del usuario de PHP. No reemplazar config.php con la plantilla ni imprimirlo. Variables: MI_USITTEL_CONFIG, MI_USITTEL_RUNTIME y MI_USITTEL_PHP.

`npm run check:mi-usittel` comprueba PHP 8.2+, cURL/JSON, configuración, runtime y rastros de secretos sin contactar Phantom. Identidad pendiente produce un aviso y el portal bloquea el login. `npm run dev:mi-usittel:php` sirve localhost:4174; el servidor estático 4173 no sustituye PHP.

## Pruebas y límites

`npm run test:mi-usittel` usa exclusivamente fixtures y un servidor local, nunca Phantom real. Cubre transporte GET/POST, encoding, BOM, TLS/errores seguros, lista e identidad, credenciales exactas, campos opcionales, saldo/facturas inválidos, whitelist pública, CSRF, sesión/logout/vencimientos, limitación de intentos, aislamiento demo y ausencia de secretos. Los dobles cURL no ejecutan red externa.

Pendiente real: confirmar la corrección visual del saldo, completar aceptación de mapeos y detalle de factura, logout y contrastar un saldo negativo cuando exista un caso autorizado. Identidad, login y recarga ya confirmados por Agustín. Pendiente de producción: gestión de certificados en hosting, logs remotos de credenciales GET, revisión del despliegue y seguridad, gestión multiusuario y recuperación de contraseña. No modificar Apache, BAT de certificados, DNS, .htaccess, despliegue ni acceso público en esta etapa.

### QA local de esta entrega

Suite automatizada con fixtures, chequeo local sin red y lint PHP. Navegador Chromium con respuestas sintéticas en modo Phantom: desktop 1365×900 y móvil 390×844. Se comprobó login exacto, recarga con sesión, Inicio, Facturas/detalle, Mi servicio, Soporte, Mi cuenta y logout. Sin errores JavaScript, desbordamiento horizontal, carga de demo-data ni solicitudes externas. Pagos deshabilitados. Esto no sustituye la aceptación real del abonado.
