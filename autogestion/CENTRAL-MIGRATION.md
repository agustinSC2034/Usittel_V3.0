# Atención USITTEL y Central

Estado al 21/09/2026: diseño local terminado y carga del widget real verificada en
un preview aislado. No es una migración operativa ni una validación de conversación.

## Alcance y autorización

El pedido adjunto proponía solo un mock. Agustín amplió expresamente el alcance
para permitir integrar Central sin cambiar la operatoria actual de WhatsApp.
Después aportó el snippet público oficial y sus métodos de control. Por eso hay
dos variantes separadas: mock por defecto y Central real solo por selección
explícita en el hub local. No se tocaron derivadores, flujos, bots, colas, líneas,
plantillas, notificaciones ni configuración de la cuenta Botmaker. No se enviaron
mensajes durante QA.

Git inicial: `main` limpio en `e74af0d`, sincronizado con `origin/main`. No había
cambios locales para preservar. Phantom, SOAP, pagos y configuración privada
quedaron fuera de esta tarea.

## Arquitectura objetivo

WhatsApp principal → derivación futura → `/atencion` en USITTEL → Central embebido
→ bots y agentes que ya trabajan en Botmaker. No se construye una consola nueva
ni un backend propio de chat. La línea de ventas/campañas queda en WhatsApp.

La orientación vive en Centro de ayuda: Soy cliente → Mi USITTEL o chat;
Quiero contratar → chat con intención de ventas, con igual importancia visual.
La entrada `/atencion` abre el widget automáticamente sin cabecera externa ni
título adicional: conserva la cabecera propia de Central. En móvil ocupa el espacio
disponible. El cambio de Centro de ayuda solo se monta en loopback: la web pública
conserva sus enlaces y operatoria actuales.
Wi-Fi y upgrades no se anuncian como operaciones disponibles si aún no lo están.

Central, su webchat embebido y el derivador son distintos del Webchat clásico de
Botmaker. No se instaló el Webchat clásico. Un widget personalizado para la consola
de agentes tampoco equivale al widget de Central para clientes.

## MOCK / DISEÑO

`autogestion/js/attention-chat.js` contiene `MockChatAdapter` y el montaje común.
Contrato mínimo: mount/open/close/reset/destroy. El mock solo genera DOM local:
no hace fetch, no usa almacenamiento, no conserva mensajes al cerrar o navegar,
no crea tickets, no importa datos de cliente y no supone identidad autenticada.
El texto ingresado se inserta mediante textContent, está acotado y nunca se evalúa.
La demostración está identificada; no afirma que haya un agente en línea.

El acceso se limita a localhost/127.0.0.1/IPv6 loopback. No hay query flag que lo
active en un dominio público. En la home el script de entrada sale antes de
importar código o CSS del chat cuando está fuera de loopback. El botón del mock
se ubica encima del WhatsApp existente en escritorio, sin cambiar su enlace.

En login aparecen Recuperar acceso (reutiliza el comportamiento existente) y
Hablar con nosotros. En Soporte se abre el mismo mock. No se envía IDA, DNI,
email, teléfono, saldo, nombre, factura ni sesión. El render de Mi USITTEL resetea
el mock, también al cambiar de contrato o cerrar sesión. No se habilita recuperación
real de contraseña ni ninguna otra operación por este cambio.

## Preview local

`npm run dev:atencion` inicia `scripts/serve-attention-preview.cjs`, puerto 4175,
solo en 127.0.0.1. El servidor tiene lista de rutas/extensiones, rechaza métodos
de escritura y Host ajenos, no ejecuta PHP ni hace proxy hacia Phantom. Su único
bootstrap responde demo/backend=false. Rechaza server/, .git, config y APIs reales.

Recorridos:

| Escenario | Ruta / acción |
| --- | --- |
| Visitante web | `http://127.0.0.1:4175/` → botón de ayuda |
| Chat directo de diseño | `http://127.0.0.1:4175/atencion` → mock abierto |
| Orientación | `http://127.0.0.1:4175/pages/centro_de_ayuda/` |
| Prospecto | Centro de ayuda → Hablar con ventas → `/atencion?chat-provider=central&intent=sales` |
| Cliente sin sesión | Hub → Mi USITTEL → Hablar con nosotros |
| Cliente demo | Ingresar con datos precargados → Soporte → Hablar con nosotros |

`chat=open` solo abre el panel. No autentica, no reconstruye identidad, no acepta
parámetros de cliente y no representa un enlace real de derivación Botmaker.

## INTEGRACIÓN REAL: solo carga y apertura

`autogestion/js/central-chat.js` implementa el adaptador del widget oficial.
Solo se invoca desde `/atencion?chat-provider=central` en loopback. Agregar
`&chat=open` solicita apertura automática. En cualquier otra página, incluida
Mi USITTEL, se mantiene el mock y no se carga el SDK. No se relajó la CSP de la
autogestión real; el servidor de preview permite el script y frame del proveedor
exclusivamente en esa página opt-in.

El operador debe establecer `CENTRAL_CHAT_CHANNEL_KEY` en el entorno del proceso
de preview con el identificador público del snippet. No se guardó ese valor en
Git ni se editó config.php privado. El endpoint **local**
`/attention-preview-config.json` publica únicamente esa configuración para el
widget, sin CORS y con no-store; sin valor válido devuelve 503. No existe como
endpoint de producción.

Se carga `https://web.central.chat/widget/core.js`, se monta `central-chat` con
channel-key y locale=es. Se usan show/maximize/minimize y central-chat-mount.
No se pasan app-jwt, identidad autenticada, parámetros URL ni prefill; tampoco
se registran eventos completos del proveedor porque podrían contener datos.
Hay estados visibles de carga, conexión y error; no se disfraza un fallo real
como conversación simulada. No hay reintentos automáticos.

Central puede usar su propio almacenamiento, cookies y conexiones. A diferencia
del mock, cualquier mensaje que el usuario envíe en esa vista sí puede llegar a
Botmaker. El aviso superior lo informa. QA solo montó y abrió el widget; no
autenticó usuarios, escribió mensajes, envió archivos ni modificó la cuenta.

## Fuentes y evidencia

- Documentación oficial consultada el 21/09/2026:
  [Derivación WhatsApp a Central](https://help.botmaker.com/es/help/2923105765575578583).
  Documenta configuración por línea, destino personalizado, continuidad en
  Botmaker y una prueba separada de la operación. Advierte que la derivación
  reemplaza la respuesta por WhatsApp al activarse. Antes del cambio anunciado
  para octubre debe revisarse manualmente el estado de ambas líneas.
- [Índice provisto por Agustín](https://help.botmaker.com/es/help/4575290420194614878).
- Transcripción aportada: 13–21 min describe Central/widget/SDK; 25–30 min explica
  conversación unificada y derivación por línea/URL personalizada. Se usa como
  contexto, no como prueba de que la cuenta USITTEL ya conserva identidad.
- Snippet público proporcionado por Agustín y lectura del loader oficial:
  `https://web.central.chat/widget/core.js`. No se copió ni vendorizó el SDK.
- Prueba local: evento central-chat-mount, iframe real visible en escritorio y
  móvil. Esto demuestra integración visual/carga; NO demuestra entrega de mensajes,
  continuidad WhatsApp, asignación de cola, historial ni identificación del cliente.

No se asumieron tarifas ni se calculó ahorro: confirmar condiciones vigentes con
Botmaker/Meta por separado antes de decidir el cambio operativo.

## Qué falta validar con Botmaker

1. Prueba controlada de un mensaje en el widget y recepción en Botmaker, con
   operador avisado, bot/cola de prueba y sin activar la derivación productiva.
2. Contrato oficial de URL personalizada: parámetros, expiración, firma, consumo
   de enlace, dominios permitidos y continuidad del usuario. No adivinarlo ni
   capturar tokens de clientes, cookies, HAR o cuerpos privados.
3. Verificar mismo usuario/conversación, historial, variables, bot, cola y agente;
   regreso posterior, otro navegador/dispositivo y cierre de sesión.
4. Visitante anónimo versus cliente de Mi USITTEL: contexto firmado desde backend,
   alcance mínimo, expiración y revocación; separar sesión Phantom de Central.
   Hasta demostrar limpieza/aislamiento, el widget real no entra en Mi USITTEL.
5. Identificar si idioma, saludo, colores, FAQ y apariencia son por widget/canal
   o compartidos con el derivador existente antes de modificarlos en Botmaker.
6. Notificaciones, adjuntos/audio, accesibilidad/teclado del widget real,
   conectividad deficiente, soporte en Safari/iOS y política de historial.
7. Activación posterior controlada de la línea principal, manteniendo ventas
   aparte, con vuelta atrás verificada y revisión del estado por defecto anunciado.

## URL personalizada y siguiente paso

Ruta prevista para publicar: `/atencion` en el dominio HTTPS de USITTEL. Todavía
NO pegar la URL local ni una ruta pública sin desplegar en el derivador.
La documentación de Botmaker anuncia activación por defecto el 01/10/2026,
por línea. Revisar las tres líneas antes de esa fecha, incluida ventas/campañas;
no asumir que la prueba local evita esa activación. No cambiamos ninguna cuenta.

La propiedad `mode="fill-container"` se verificó en el loader oficial para
integrar el widget en nuestro contenedor sin cambiar su configuración global.
En la prueba móvil, el modo integrado muestra directamente el compositor y sus
sugerencias, sin la portada flotante anterior. `maximize()` por sí solo no
demuestra continuidad de WhatsApp. `intent=sales` solo cambia el recorrido del
mock; en Central no cambia el título ni asigna bot. Se probó `prefill()` sin envío, pero no
se observó el borrador en el widget real; no se dejó ese comportamiento sin validar.
No asigna cola, no envía mensajes ni cambia los flujos de Botmaker.
No se interpretan parámetros de identidad ni tokens de derivación.

Única gestión siguiente con Botmaker: pedir el contrato oficial de integración
de la URL personalizada con `central-chat`. Consulta preparada:

> Queremos que la línea USITTEL terminada en 0345 derive a `/atencion` en nuestra
> web HTTPS, con el widget de Central integrado. ¿Cómo recibe el widget la
> identidad y conversación del enlace de WhatsApp? Necesitamos los nombres de
> parámetros y el mecanismo documentado para abrir directamente esa conversación,
> sin la portada del widget ni pedir nuevamente la consulta. ¿Pueden habilitar
> una prueba de URL personalizada sin activar ni modificar la línea productiva?
> No necesitamos ejemplos con tokens o datos reales de clientes.

Pendiente: probar esa continuidad, enrutamiento cliente/ventas, recepción por
agente y publicación HTTPS/CSP. Hasta entonces el resultado es PREVIEW, no una
migración lista para activar. El cliente puede continuar hablando sin autenticarse;
Mi USITTEL mantiene su propia sesión para consultar o modificar datos de cuenta.

## Publicación

Commit/push a main son publicación del código, no despliegue de esta experiencia.
No se modificó `.cpanel.yml`: no copia atencion/ ni autogestion/. No se tocó
`.htaccess`, DNS, Apache ni el redirect productivo de autogestion a Phantom.
El script agregado en home es inerte fuera de loopback. No se enlaza el nuevo hub
desde la navegación productiva. Una futura publicación necesitará su propia
configuración, HTTPS, CSP acotada e integración/identidad previamente validadas.

## QA

Prueba con Playwright/Chromium, Browser plugin no disponible; runtime existente,
sin instalar dependencias. Viewports 1366×900 y 390×844. Los seis recorridos,
chat=open, foco/Escape/retorno de foco, texto tratado como texto, borrado al cerrar,
ausencia de POST, ausencia de desborde y separación de navegación inferior pasaron.
Home sin colisión con WhatsApp; trackers existentes bloqueados en QA, assets
visuales existentes permitidos. No hubo errores de consola en los recorridos.
Capturas fuera del repositorio, en TEMP, prefijo attention-.

El ajuste local locale=es fue verificado con el widget real: saludo y controles
en español, sin guardar cambios en Botmaker. El mock no pretende reproducir
exactamente el diseño interno de Central; se conservan como alternativas visibles.

Pruebas locales de servidor: rutas admitidas/bloqueadas, métodos, rechazo de Host
ajeno, bootstrap demo, CSP mock/real, configuración ausente y feature gate público.
Validación: suite Mi USITTEL con 834 verificaciones (fixtures, no Phantom real);
15 pruebas de cobertura; 72 configuraciones y 5 entradas inválidas/incompletas
Mesh; 2 pruebas de límites del servidor de preview. Builds público/autogestión y
shared shell correctos. Sintaxis de 62 PHP correcta, sin cambios PHP. Escaneo local
de secretos correcto. Los builds solo advirtieron datos antiguos de Browserslist.

### Ajuste de recorridos del 21/09/2026

Validación de esta iteración con el navegador integrado vía CUA: 390×844 y
1366×900. Centro de ayuda conserva sus preguntas y buscador; las dos tarjetas
miden lo mismo en escritorio. El enlace de ventas abre /atencion. Mock automático
sin query y selección de ventas correctos. Central real muestra compositor dentro
del contenedor móvil, sin envío de mensajes ni cambios en Botmaker. Sin errores
relevantes de consola ni desborde horizontal en las vistas inspeccionadas.
Pruebas de aislamiento del preview: 2/2; build público y check de shell correctos;
escaneo local de secretos correcto. No hay cambios PHP ni se repitió la suite de
Phantom: sus resultados anteriores arriba pertenecen al commit previo.

### Primera conversación confirmada por Agustín

El usuario envió un mensaje desde el widget y confirmó recepción en Botmaker y
respuesta visible en nuestra página. Sus capturas muestran el cambio desde Master
Bot a Instagram_chat. Esto verifica ida y vuelta de un visitante web, todavía no
la continuidad de una derivación desde WhatsApp. Pendiente revisar las condiciones
reales del Master Bot para distinguir Central y seleccionar el bot de atención
correcto; no asumir un nombre de canal o variable ni modificar WhatsApp existente.
Se eliminó la cabecera externa y el título de /atencion por pedido del usuario.
Se conserva únicamente el aviso local de prueba y la interfaz propia de Central.
