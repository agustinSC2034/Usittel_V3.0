# Mi servicio

## Productos_Otros fechado e IPTV, 25/09/2026

La lectura real confirmó entradas `FECHA - CATEGORIA - PRODUCTO` separadas por
`;` en `Productos_Otros`. Un único parser valida fechas `d/m/yy` o `dd/mm/yy`,
límites de texto y separadores exactos; descarta la fecha y conserva la categoría
solo internamente. Una cantidad inequívoca al principio (`4 USITTEL MESH`)
produce `USITTEL MESH × 4`; números dentro del nombre no se interpretan. El
inspector read-only usa ese mismo parser y muestra campo, categoría, label y
cantidad, más `derived.sensa`. No vuelca la respuesta Phantom ni datos personales.

La categoría exactamente `IPTV` dentro de `Productos_Otros` prueba que el cliente
tiene Sensa. El nombre del producto IPTV permanece separado: un pack sin alias
exacto se muestra con su label original, sin atribuirlo a un pack catalogado.
La lista pública `products` no recibe un producto Sensa ficticio: la derivación
solo entra en `servicePresentation` y en las reglas comerciales. `WiFi +` exacto
se ignora por completo, incluso si era el único producto. `Productos_Television`
igual a `-` continúa vacío. Un texto fuera del formato confirmado conserva la
semántica literal anterior, sin categoría ni inferencia IPTV.

Sigue siendo necesaria la carga manual de aliases exactos en la configuración
privada, por ejemplo `mesh.aliases = ['USITTEL MESH']` en la sintaxis PHP del
catálogo. Sin ese alias no se reconoce Mesh como contratado. No se habilitaron
modelos Wi-Fi ni escrituras; primero corresponde revisar otra vez la salida real
del inspector para los contratos autorizados.

## Iteración productiva de servicios, 23/09/2026

La pantalla queda ordenada como Plan contratado y conexión, Tus servicios,
Podés sumar y Herramientas. El plan de Internet se muestra siempre. La detección
y las reglas comerciales se calculan en el servidor; JavaScript solo presenta la
lista pública recibida y abre Central.

`serviceProducts()` conserva su contrato: `null` significa que no se pudo
determinar el detalle y `[]` que los campos configurados se leyeron correctamente
sin adicionales. Con `null` no se ofrecen Sensa, packs, STB ni Mesh por ausencia.
Con una lista conocida, `service_catalog` reconoce exclusivamente aliases exactos.
Un label no catalogado se muestra en Tus servicios, pero nunca prueba presencia o
ausencia para una oferta. Los duplicados se eliminan y las cantidades inequívocas
se conservan como `× N`.

El catálogo comercial es privado y server-side. Cada entrada valida `id`, `type`,
nombre, descripción, precio, moneda, dependencias, exclusiones y flag `enabled`.
Sensa y Mesh requieren ausencia confirmada; cada pack y STB requieren Sensa y
desaparecen al reconocer el mismo producto. Un STB adicional puede modelarse como
otra oferta sin exclusión, sin inventar un máximo. Las ofertas de velocidad solo
aparecen con una coincidencia exacta del plan actual, velocidad destino superior,
precio confirmado y oferta habilitada. No usan SOAP ni escriben Phantom.

Precios públicos cargados en la plantilla: Sensa $19.999/mes, Pack Fútbol
$24.999/mes, Pack HBO $8.999/mes, Universal+ $7.999/mes, Set Top Box $7.750/mes
y Wi-Fi Mesh $6.999/mes. El plan de 1.000 Mbps figura a $54.999/mes, pero su oferta
queda deshabilitada hasta confirmar el precio aplicable a upgrades de clientes
existentes y cargar los labels exactos de planes de origen.

Todas las CTA comerciales abren la instancia existente de Central. El DOM conserva
solo un identificador local de intención; no se transmite IDA, documento, saldo,
factura, credenciales, tokens ni contexto Phantom. No se crean tickets.

Wi-Fi ya no usa `wifi.lab_ida`: cualquier `selected_ida` autorizado por la sesión
puede preparar el cambio si `ONU_Modelo` coincide exactamente con `wifi.models`.
`dual_band_models` debe ser un subconjunto exacto. Se mantienen CSRF, nonce,
reautenticación, HMAC, lock persistente, expiración, Ticket=0, una sola escritura
y estado UNKNOWN sin retry. Ningún modelo se habilita por similitud.

Inspector read-only para hasta tres contratos:

```bash
MI_USITTEL_CONFIG=/home4/usittel/mi-usittel-private/config.php MI_USITTEL_RUNTIME=/home4/usittel/mi-usittel-private/runtime php /home4/usittel/public_html/autogestion/server/inspect-service-catalog.php IDA1 IDA2 IDA3
```

La salida contiene solo IDA, modelo saneado, dual-band conocido, elegibilidad
Wi-Fi y labels/cantidades públicos de `Productos_Television` y `Productos_Otros`.
No realiza escrituras. Pendiente manual: ejecutar esa lectura con los tres equipos,
confirmar físicamente bandas/compatibilidad, cargar modelos y aliases exactos en la
configuración privada y recién entonces decidir `wifi.enabled`. El upgrade write
permanece pausado y Wi-Fi no se marca como validado físicamente.

Validación local de esta iteración: 870 aserciones con fixtures, 64 archivos PHP
y 28 archivos JavaScript con sintaxis correcta, build y escaneo de secretos sin
hallazgos. QA visual en 1366×900 y 390×844: jerarquía correcta, una sola instancia
de Central, sin errores de consola ni desborde horizontal. No se contactó Phantom
ni SIRO real y no se ejecutó ninguna escritura.

## Preparación de inspecciones, 21/09/2026

Exclusión de telefonía preservada del commit fb9090f y cubierta por pruebas de
campos prohibidos, incluyendo bonificaciones. Validación vigente de esta iteración:
834 verificaciones con fixtures, 62 archivos PHP con sintaxis correcta, build y
escaneo local de secretos correctos. Sin cambios de frontend ni nuevo QA visual.
El chequeo leyó la configuración privada sin publicar valores y no contactó
Phantom/SIRO. SOAP se carga explícitamente en el CLI mediante `-d extension=soap`.

El selector real del CRM confirmó que texto y value coinciden para los perfiles
empresa 200 y 500 Mbps. No se guardó ningún cambio. El inspector SOAP read-only
confirmó después que Phantom devuelve explícitamente un resultado nulo para ambos
nombres. `consulta_abonado` sí devolvió un resultado no nulo con 90 elementos:
autenticación, endpoint y transporte funcionan. El próximo dato necesario es el ID
o alias interno del ABM de perfiles de 200 y 500 Mbps. Permanece bloqueada toda
escritura de upgrade, facturación y aprovisionamiento.

La tabla de perfiles confirmó los identificadores internos mediante los botones de
edición, sin aplicar cambios: 166 para empresa 200 del 1/3/26 y 167 para empresa
500 del 1/3/26. El inspector acepta ahora `soap.profile_ids`; si se configuran,
consulta por `Id` y evita repetir la búsqueda nula por los nombres comerciales.

Resultado recibido: ausencia de ticket confirmada con IDTT int 0 y Permitir int 1.
Snippet privado futuro: `'clear_response'=>['IDTT'=>0,'Permitir'=>1]`, manteniendo
`tickets.enabled=false`. Abierto y Pendiente devolvieron TICKETS_RESPONSE; queda
una segunda lectura estructural segura antes de afirmar que equivalen a listas
vacías o definir el primer mapping real.

Decisión posterior: no abrir tickets Phantom ni continuar ese mapping. Mantener
`tickets.enabled=false`; el inspector ejecutado no realizó escrituras. Servicios
y adicionales no automáticos se derivarán en una etapa futura a contacto humano.
Solo continúa como candidato de autoservicio el upgrade del perfil de Internet,
aún bloqueado hasta validar SOAP, facturación y Act. Perfiles. También queda
pendiente implementar el cambio real del WhatsApp de contacto; el formulario de
demostración actual no equivale a una actualización en Phantom.

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

Lectura real aportada por Agustín para IDA 4950: Productos_Television y
Productos_Otros presentes, ambos strings no vacíos. Esa forma es compatible
con serviceProducts sin descriptor de objetos. No demuestra los nombres de los
productos ni que un texto no vacío sea distinto del marcador `-`.
Configuración recomendada, para colocar manualmente en el archivo privado:

```php
'service_product_fields' => ['Productos_Television', 'Productos_Otros'],
```

Productos_Telefonia, Producto_Telefonia y Productos_Bonificaciones quedan fuera
de la allowlist incluso mediante descriptores. No alimentan products, Inicio,
Mi servicio ni la comprobación de productos contratados para solicitudes.
El inspector productivo no los recorre ni los publica como servicios.
Sin configuración o con un campo ausente/incompatible el resultado es null;
con ambos campos soportados presentes y vacíos es []. Configuración privada
sin modificaciones automáticas.

Inicio y Mi servicio comparten la lista products. null indica desconocido; []
indica lista vacía confirmada por los campos configurados. No se deduce que un
cliente carece de Sensa por la ausencia de un campo. El mapper acepta campos
seleccionados por el operador mediante service_product_fields, de una lista
cerrada: Productos_Television, Producto_Television, Productos_Otros,
Producto_Otros, Otros_Servicios, Adicionales y Set_Top_Box/STB, entre otros alias cerrados. Telefonía no se ofrece ni se mapea en Mi USITTEL. Solo texto o listas de textos acotados; no
se extraen valores recursivamente de objetos desconocidos.

La instalación debe verificarse antes de cargar aliases. El inspector actual
`inspect-service-catalog.php` publica solamente labels de los dos campos confirmados,
cantidad inequívoca y modelo ONU saneado. Para listas de objetos se admite descriptor
explícito {field, label, quantity}; label debe ser una clave permitida y quantity
Cantidad. Cantidades entre 1 y 99; estructuras inválidas quedan desconocidas.
Ejemplo PHP: ['field'=>'Set_Top_Box','label'=>'Nombre','quantity'=>'Cantidad'].
Los campos de Sensa, packs y STB deben confirmarse con el inspector antes de activar
su mapeo; no se mezclan productos potenciales con servicios contratados.
Los enlaces comerciales abren Central sin adjuntar datos personales. No contratan,
envían mensajes ni cambian el abono automáticamente.

## Wi-Fi

Implementados POST wifi-prepare y wifi-change con sesión, CSRF y selected_ida.
Deshabilitado por defecto: `wifi.enabled`; la compatibilidad usa la lista exacta
`models` para cualquier contrato autorizado por la sesión, sin gate por IDA.
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
prueba controlada real. No habilitar modelos antes de esa prueba. No se cambió
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
