# Mi servicio

## Iteración UX de Mi servicio

La pantalla queda ordenada como plan contratado y conexión, Tus servicios,
Mejorá tu servicio y Herramientas. Inicio reutiliza `customer.connectionState`,
que proviene de la lectura pública de `Consulta_Cliente_Avanzada` con
`InfoFTTH=1`; solo `online` y `offline` se traducen a En línea y Sin conexión.
Los demás valores son No disponible y `Estado_Servicio` no se usa como
conectividad. El saldo y las facturas siguen disponibles en sus módulos.

`serviceProducts()` mantiene el contrato: `null` significa detalle desconocido
y `[]` significa campos configurados consultados sin productos. La UI muestra
siempre el plan de Internet y agrega los labels públicos confirmados sin
duplicarlos; con `null` informa que el detalle no está disponible.

La normalización visual está en `js/service-catalog.js`. Usa aliases exactos,
configurables y vacíos por defecto hasta confirmar los labels reales de
`Productos_Television` y `Productos_Otros`. Un producto desconocido se muestra
como texto, pero no activa ofertas. Las ofertas solo aparecen con ausencia
demostrable: Sensa, Pack Sensa condicionado a Sensa, STB condicionado a TV y
Sensa, Mesh, y upgrades con destino ascendente del catálogo configurado.
El catálogo de upgrades se expone solo como lectura pública mínima; no habilita
SOAP write, facturación ni aprovisionamiento. Los tickets Phantom no forman
parte de esta experiencia.

Las acciones comerciales y `¿No podés ingresar? / Contactanos` abren el mismo
widget oficial Central de Mi USITTEL, antes y después del login, sin IDA, DNI,
saldo, factura ni datos Phantom. Si el SDK no carga queda visible el WhatsApp
actual. Esto no cambia el estado público de `usittel.com.ar`, que mantiene
Central oculto.

Pendiente de configuración/manual: confirmar aliases públicos con el inspector
read-only y colocarlos en el catálogo; configurar la lista privada de
`service_product_fields` sin automatizar su edición; validar visualmente contra
un entorno con PHP 8.2 y credenciales de laboratorio. Wi-Fi físico y upgrade
write siguen sin estar validados ni habilitados.

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
El inspector puede reconocer su estructura; no los publica como servicios.
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
