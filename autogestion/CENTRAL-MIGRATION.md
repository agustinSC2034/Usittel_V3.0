# Atención USITTEL y Central

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
- El acceso flotante anterior a WhatsApp se conserva donde ya existía y se ubica
  a la izquierda en escritorio para evitar superposición.

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
La ruta productiva de Mi USITTEL sigue dependiendo de su despliegue específico;
no se cambió el redirect existente a Phantom.

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
