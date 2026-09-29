# Atención USITTEL y Central

## Mi USITTEL — control del panel (27/09/2026)

El portal usa una sola instancia del elemento oficial. Declara el atributo
público `hide` antes de conectar el elemento y llama `hide()` después del
montaje, cuando el SDK ya expone sus métodos; así no aparece el lanzador nativo.
Espera `central-chat-mount` antes de abrir. El botón vectorial del portal
abre con `show()` y `maximize()`, y cierra con `hide()`. El botón cambia de
«Abrir chat de soporte» a «Cerrar chat de soporte» y queda por encima de la
navegación móvil. No se inspecciona el shadow DOM ni se interpreta un supuesto
evento de cierre de la X nativa, que no se observó en la versión 0.0.5.

Las CTA del portal usan el mismo helper. Únicamente los temas exactos
`upgrade-speed`, `update-account`, `technical-support`, `mesh`,
`additional-service` y `access-help` generan un texto genérico mediante
`prefill()`. La apertura general no genera texto. `prefill()` no ejecuta un
envío: el cliente debe revisar y enviar manualmente. No se pasa identidad,
contrato, productos Phantom, dirección, contacto ni datos financieros.

Configuración externa requerida en Botmaker Central, a verificar manualmente:

- Se puede cerrar: OFF.
- Se abre solo: OFF.
- Panel ancho: OFF para la QA móvil; con la configuración observada en Chrome
  a 390 px, el contenido del panel ancho quedó recortado a la izquierda.
- Barra de navegación: OFF.
- Empieza oculto: ON.

Estas opciones no se cambian desde este repositorio. Si la X nativa permanece
habilitada, Central no emite un cierre público confirmado: el botón del portal
puede quedar temporalmente en estado «Cerrar» hasta que se use ese control.
En Chrome local, el botón propio abrió y cerró el panel mediante la API oficial
sin enviar mensajes. La configuración del entorno local impidió iniciar sesión:
esta comprobación no sustituye la QA de CTA internas autenticadas.

### CSP

El servidor local `autogestion/serve.cjs` envía `script-src 'self'
https://web.central.chat` y `style-src 'self'`. Por eso el SDK externo puede
cargar, pero un `<style>` inline que inserte `installHostStyle` queda bloqueado
por `style-src-elem` (que hereda `style-src` si no se declara). Autorizar solo
`https://web.central.chat` no autoriza ese estilo inline. El router PHP usa
también `style-src 'self'`, aunque esa respuesta no es el documento HTML
estático. Una lectura HEAD de `https://mi.usittel.com.ar/` el 27/09/2026 no
mostró cabecera CSP; no se puede atribuirle ese bloqueo a la página productiva
con esa evidencia. No se modificó ninguna política CSP en esta iteración.

Antes de relajarla, confirmar el mensaje completo, el origen del documento y
si el proveedor admite nonce, hash estable o una hoja externa. Solo si no hay
alternativa, evaluar una excepción **acotada a `style-src-elem` del portal**,
con aprobación y QA específicos; no agregar `unsafe-inline` global a
`script-src` ni a `style-src` por comodidad.

Las notas fechadas a continuación describen etapas anteriores de la web pública
y del portal; este apartado es el alcance vigente de Mi USITTEL.

Estado al 21/09/2026: el widget oficial de Central está integrado en la web
pública, en `/atencion` y dentro de Mi USITTEL. La conexión usa la cuenta pública
de chat USITTEL aportada por Agustín. La primera conversación desde la web ya fue
recibida y respondida en Botmaker.

## Recorridos actuales

- Todas las páginas públicas cargan el lanzador flotante de Central.
- `/atencion` muestra Central dentro de la página, sin cabecera ni textos externos.
- Centro de ayuda orienta con igual importancia a clientes y personas que quieren
  contratar; ambos recorridos pueden abrir `/atencion`.
- Mi USITTEL carga el lanzador y sus accesos `Hablar con nosotros` y comerciales
  abren el mismo Central.
- La web pública muestra un único lanzador flotante de Central. El botón flotante
  anterior de WhatsApp fue retirado; los enlaces de contacto del contenido siguen.

El texto local `Central conectado · Prueba local real...` fue eliminado. La
interfaz de Central es la única cabecera visible en la conversación.

## Integración

El sitio carga `https://web.central.chat/widget/core.js` y monta el elemento
`central-chat` con `locale="es"`. `/atencion` usa `mode="fill-container"`; la web
pública y Mi USITTEL usan el lanzador flotante. Mi USITTEL controla el mismo
elemento mediante `show()`, `maximize()` y `minimize()`.

El `channel-key` incluido en el HTML es el identificador público que Botmaker
entrega para instalar el widget. No se incluyeron access tokens, cookies,
credenciales privadas ni configuración de Phantom.

Las políticas CSP local y PHP permiten únicamente el script y el frame de
`https://web.central.chat`. El despliegue de cPanel incluye ahora `atencion/`.
El botón público `MI USITTEL` apunta directamente a `https://mi.usittel.com.ar/`.
No se modificó el redirect legacy de `/autogestion` en el `.htaccess` público.

## Privacidad e identidad

La integración actual es anónima. No se pasan a Central nombre, IDA, DNI,
teléfono, email, saldo, facturas, contrato ni datos de sesión. Estar autenticado
en Mi USITTEL todavía no identifica automáticamente a la persona en Botmaker.

Antes de agregar identidad debe definirse con Botmaker un mecanismo firmado desde
backend, con datos mínimos, expiración y separación de la sesión Phantom. No se
deben colocar datos del cliente en parámetros públicos de URL ni en el frontend.

## Botmaker

Agustín configuró en Master Bot una asignación para `ID del canal = open_central
(Usittel)`. La prueba inicial había caído en `Instagram_chat`; el nuevo enrutamiento
queda pendiente de una prueba completa, sin tocar la operatoria actual de WhatsApp.

La URL personalizada prevista para la derivación de la línea principal es la ruta
HTTPS pública `/atencion`. La continuidad exacta de identidad e historial desde
el botón enviado por WhatsApp todavía debe verificarse antes de la activación del
derivador anunciada para el 01/10/2026.

Los parámetros `intent=sales` y `chat=open` pueden conservar el contexto del
recorrido en nuestra URL, pero hoy no seleccionan por sí solos bots diferentes en
Botmaker. Esa separación se definirá después de validar el canal único.

## Prueba pendiente

La siguiente validación debe cubrir un único recorrido controlado:

1. iniciar desde el enlace de prueba de derivación de WhatsApp;
2. comprobar que `/atencion` abre la conversación;
3. confirmar recepción por `open_central (Usittel)` y el bot esperado;
4. responder desde Botmaker y verificar la respuesta en la web;
5. comprobar continuidad al volver a abrir el enlace.

No se modificaron derivadores, líneas, flujos, bots, colas, plantillas ni
notificaciones desde el código de este repositorio.
