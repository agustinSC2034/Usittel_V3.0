# Integración local PHP / Phantom

## Evidencia y límites

Fuente revisada: [documentación API REST de Phantom de la carpeta provista](https://drive.google.com/file/d/1ydYXQUSh_8YlvUH6PtaIBZqWMjgCLeHd/view), secciones de autenticación, cliente avanzado, estado de cuenta y facturas. Los ejemplos de autenticación incluyen variantes GET y POST; el ejemplo PHP también incluye credenciales en la URL, por lo que no demuestra soporte de POST JSON con credenciales exclusivamente en el cuerpo. La captura de Botmaker provista por el usuario muestra GET sobre HTTP con credenciales en la URL, en otro puerto. No se copió ese transporte ni sus secretos.

Confirma token de 15 minutos, consultas/paginación, balance crédito menos débito y campos de factura. El texto disponible no confirmó las claves exactas de todos los datos personales/productos ni la ruta al valor numérico del balance. No se inventaron. La autenticación técnica POST JSON y los envoltorios aún deben verificarse contra la instalación real. No se usaron secretos de commits o conversaciones.

## Configuración fuera del repositorio

En PowerShell, desde la raíz del proyecto:

```powershell
$privateFolder = Join-Path $env:LOCALAPPDATA 'MiUSITTEL'
New-Item -ItemType Directory -Force -Path $privateFolder | Out-Null
$privateConfig = Join-Path $privateFolder 'config.php'
if (-not (Test-Path -LiteralPath $privateConfig)) {
  Copy-Item -LiteralPath autogestion/server/config.example.php -Destination $privateConfig
}
notepad $privateConfig
```

Completar ese archivo personalmente, sin pegar secretos en el chat. Restringir permisos a la cuenta que ejecuta PHP; no usar carpetas compartidas, sincronizadas o públicas. En Windows revisar ACL; chmod por sí solo no las sustituye. Proteger también runtime: contiene sesiones, caché del token técnico y contadores.

| Opción privada | Valor/criterio |
| --- | --- |
| mode | phantom para laboratorio, demo para diseño; jamás por navegador |
| phantom_url | Base indicada por USITTEL, HTTPS sin credenciales/query/fragmento |
| api_user, api_pass | Credenciales técnicas actuales, distintas de las del abonado |
| allowed_idas | Solamente [1], [5] o [1, 5] |
| lab_users | Usuario personalizado exacto => IDA permitido, sin contraseñas; ambos campos se verifican igual |
| customer_path | [] para objeto raíz; cambiar solo tras comprobar otro envoltorio |
| profile_fields | name/address/plan/city/email/phone, inicialmente null |
| balance_path | null hasta confirmar ruta exacta del valor numérico crédito menos débito |
| idle_seconds, max_seconds | 900 y 28800 por defecto |
| timeout_seconds, connect_timeout_seconds | 10 y 4 por defecto; máximos 30 y 10 |
| ca_file | Bundle CA confiable opcional; nunca desactivar validación TLS |

Los mapeos son arrays de claves exactas, por ejemplo `['ClaveConfirmada']`. Para texto compuesto: `['join'=>[['ClaveConfirmada'],['OtraClaveConfirmada']]]`. Esos nombres ilustran sintaxis: **no son campos confirmados de Phantom**. El perfil acepta texto; confirmar tipos antes de convertir números. El balance acepta números/decimales con punto, no HTML ni importes ambiguos. Negativo → deuda, positivo → crédito; ausente no equivale a cero.

```powershell
$env:MI_USITTEL_CONFIG = Join-Path $privateFolder 'config.php'
$env:MI_USITTEL_RUNTIME = Join-Path $privateFolder 'runtime'
$env:MI_USITTEL_PHP = "$env:TEMP\mi-usittel-php\php.exe" # O PHP permanente.
npm run dev:mi-usittel:php
```

Abrir http://127.0.0.1:4174/autogestion/. Reiniciar PHP al cambiar variables. Configuración inválida falla sin demo; sin variable de configuración el modo predeterminado es demo. Node 4173 no ejecuta PHP.

### Comprobar campos sin imprimir valores

Con credenciales configuradas, esta herramienta CLI consulta nombres y tipos de primer nivel, sin valores, tokens, contraseñas ni contratos asociados:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-schema.php 1
# Usar 5 si esa es la cuenta permitida.
```

Hace autenticación técnica y lecturas de cliente, estado de cuenta y una factura. Muestra nombres/tipos y una estructura anidada acotada (máximo cuatro niveles, un elemento representativo por lista y hasta 120 campos), sin valores. Excluye claves asociadas a contraseñas, tokens, secretos, hashes, URLs, archivos/documentos, datos fiscales/bancarios y contratos vinculados. Sigue siendo un primer diagnóstico y no demuestra semántica. Si el balance no es inequívoco, confirmar una muestra controlada y redactada antes de mapear. No compartir JSON crudo. **No se ejecutó contra Phantom real en esta entrega.**

Ante un fallo, el inspector informa la etapa (`autenticacion`, `cliente`, `estado_cuenta` o `factura`) y un código propio. TLS distingue archivo CA (`PHANTOM_CA_FILE`), validación general (`PHANTOM_TLS_VERIFY`), emisor/cadena (`PHANTOM_TLS_ISSUER`), hostname, vigencia, revocación, certificado autofirmado y negociación (`PHANTOM_TLS_HANDSHAKE`) sin exponer el error crudo de cURL. Una excepción inesperada agrega únicamente clase, basename del archivo y línea; el mensaje se omite salvo que provenga del código local y pase un filtro estricto. Nunca imprime respuestas.

## Contrato interno

Base `/autogestion/api/`, mismo origen, JSON UTF-8, Cache-Control no-store, sin CORS. Errores: `{"error":{"code":"CODIGO","message":"Texto público"}}`. El IDA se obtiene de sesión; parámetros de IDA/modo/action/URL se rechazan. No hay proxy genérico.

| Ruta | Entrada | Resultado |
| --- | --- | --- |
| GET bootstrap | Ninguna | {mode, authenticated, csrf} |
| POST login | JSON {username,password}, X-CSRF-Token | {authenticated:true, csrf} nuevo tras regenerar sesión |
| POST logout | JSON {}, X-CSRF-Token | {ok:true}; destruye sesión y expira cookie |
| GET overview | Sesión autenticada | {customer,account,invoices,nextDue,warnings} |
| GET invoices?offset=0 | Sesión; offset no negativo, múltiplo de 20, máximo seis dígitos | {items,offset,nextOffset}; 20 registros/página |

- `customer`: name,address,plan,city,email,phone,serviceStatus,network,speed. Texto o null. Estado_Servicio es administrativo; network/speed aún null.
- `account`: balance,debt,credit, números o null; no representa saldo de factura. `nextDue` queda null hasta confirmar regla de cuenta.
- Factura: id,period,amount,due,secondDue,status,type,number,paidAt,outstanding. IDT → id; Total → amount; fechas YYYY-MM-DD válidas → dd/mm/YYYY. PAGADA → Pagada, IMPAGA → Pendiente, desconocido → No disponible. paidAt/outstanding null. No hashes, URLs ni JSON original.
- `warnings`: BALANCE_UNAVAILABLE, INVOICES_UNAVAILABLE, ACCOUNT_RECONCILIATION. Saldo/facturas pueden fallar independientemente; fallo de cliente deja error recuperable. Solo el 400 con mensaje exacto documentado de factura inexistente equivale a lista vacía; ningún error implica deuda cero.

HTTP: 400 entrada inválida, 401 credenciales/sesión, 403 CSRF/autorización, 404 ruta, 405 método, 409 lectura real en demo, 429 límite, 503 proveedor/configuración, 504 timeout. No se infiere vencimiento, reactivación o pago parcial con datos insuficientes.

## Sesión y transporte

- Cookie PHP HttpOnly, SameSite Strict, Secure cuando PHP recibe HTTPS; regeneración al autenticar y vencimientos propios. En el devserver HTTP/loopback no hay Secure; HTTPS no fue probado.
- CSRF de sesión en login/logout; Origin cuando está presente y rechazo cross-site. Contraseña exacta sin trim/números/DNI; nunca en sesión.
- Límite de 5 fallos por cuenta/usuario y 30 fallos por IP en 15 minutos. Cada verificación se reserva atómicamente para evitar ráfagas paralelas; un acceso correcto o un fallo del proveedor libera su reserva y no suma intentos. Los rechazos de credenciales permanecen tanto por cuenta como por IP, de modo que un acceso válido no borra protección previa. Claves HMAC, sin usuario/IP crudos. No confía en encabezados de proxy. Tests aíslan sus contadores.
- Token técnico privado separado de sesión, caché 14 minutos. Un 401/403 permite renovar y repetir lectura solo una vez; no reintenta otros fallos.
- POST JSON con TLS verificado, sin redirects, respuesta máxima 2 MB, profundidad JSON limitada. Diagnósticos propios solo por código, sin cuerpos/contraseñas/cabeceras sensibles. Revisar logging externo al desplegar.
- Excepción explícita de diagnóstico: `inspect-schema.php 1 --auth-form` prueba autenticación POST `application/x-www-form-urlencoded`, con valores codificados y siempre en el cuerpo. No hay fallback automático; el inspector hace un solo intento de autenticación y mantiene las consultas en JSON. No cambia la configuración ni el transporte del portal. Compatibilidad pendiente de comprobar en la instalación real; un HTTP 400 no identifica por sí solo credenciales incorrectas.
- Excepción puntual autorizada posteriormente: `inspect-auth-get.php` es CLI separado, exclusivamente autenticación GET por HTTPS con `JSON=1`. Credenciales codificadas en query: el usuario aceptó el riesgo de logs remotos. No sigue redirecciones, no reintenta, no consulta clientes ni persiste tokens. Salida cerrada, warnings locales redactados y sin trazas. `TOKEN_RECIBIDO` solo comprueba el campo esperado en la respuesta, no su uso posterior. No está conectado al portal ni se ejecuta automáticamente. Ver FIRST-PHANTOM-TEST.md.
- Acciones permitidas: autentificar, Consulta_Cliente_Avanzada, Phantom_Ultima_Factura, Phantom_Mi_Estado_Cuenta. Ninguna escritura/SIRO.
- Router local publica solo HTML/assets/JS y cinco rutas API; nunca server/, tests/, configuración o runtime. No usar un servidor estático genérico sobre todo el repo.

## Validación

`npm run check:mi-usittel` revisa PHP/cURL/JSON, configuración/runtime externos, estructura mínima y posibles secretos locales; no llama a Phantom ni imprime credenciales. `npm run test:mi-usittel` usa un servidor PHP aislado y transporte sintético; tampoco llama a Phantom. Cubre sesión, CSRF, regeneración/logout/replay, vencimientos, credenciales exactas/ausentes/incorrectas, IDA ajeno, límites basados solo en fallos, errores/timeout, renovación acotada, campos ausentes, saldo independiente, paginación, inspección de esquemas, whitelist, modos y mapeos sensibles. Las claves test_* son ficticias, no documentan al CRM.

No es una auditoría exhaustiva. Pendiente real: HTTPS/cookie Secure, contrato de autenticación/respuestas, datos personales/productos y campo del balance. Validar solo IDA 1 o 5, con configuración privada; casos negativos continúan con fixtures para evitar bloquear cuentas reales.

Producción, cPanel, DNS, .htaccess, SIRO y escrituras siguen fuera de alcance.
