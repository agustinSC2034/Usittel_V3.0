# Notificaciones de Mi USITTEL

## Piloto

El proyecto [mi-usittel](https://console.firebase.google.com/u/2/project/mi-usittel/overview) pertenece a la organización `it-tel.com.ar`. La app web Mi USITTEL está registrada en el plan Spark, con FCM HTTP v1 y un par VAPID. El frontend usa los identificadores públicos de la app y la clave pública VAPID. Firebase conserva la clave privada VAPID.

El piloto está desactivado por defecto. En **Mi cuenta → Notificaciones**, una cuenta autorizada puede activar o desactivar su dispositivo. El botón solicita el permiso de Chrome mediante un gesto explícito. Firebase 13.2.0 registra el FID (Firebase Installation ID) sobre el `sw.js` existente. Se conserva el alcance relativo `/` en el subdominio y `/autogestion/` en el laboratorio. La página muestra un aviso breve en primer plano. En segundo plano, el worker muestra la notificación del sistema y usa una lista cerrada de secciones para abrir el portal. Si la sesión venció, primero se pide ingresar y después se abre la sección. El worker carece de manejador `fetch` y Cache Storage.

El backend deriva el cliente y sus contratos de la sesión autorizada por Phantom. Los cambios requieren el CSRF existente. Una cookie aleatoria HttpOnly, SameSite Strict y Secure en HTTPS identifica al navegador. El registro devuelve un identificador derivado para el operador. Guarda el FID, cliente autenticado, contratos, preferencia, permiso y fechas en `runtime/push.json` (0600), con exclusión mutua y reemplazo atómico. El navegador sincroniza cambios al volver al portal y al recibir una actualización de Firebase con la app abierta. Desactivar elimina el registro y solicita la baja en FCM. Cerrar sesión elimina el registro del dispositivo actual. Un inicio de sesión con otra cuenta desvincula el registro anterior de ese navegador. Una sesión que vence por inactividad permite que continúe la recepción hasta que haya una desvinculación o que el registro quede inactivo. El envío piloto solo usa registros actualizados en los últimos 30 días.

## Activación y prueba autorizadas

1. En Google Cloud IAM del proyecto, preparar una cuenta de servicio dedicada a Mi USITTEL. Darle un rol del proyecto que contenga solo `cloudmessaging.messages.create` si la organización permite roles personalizados. Revisar la política de la organización antes de generar la credencial JSON. Si bloquea las claves, conservar la política y preparar un emisor con identidad administrada fuera de Nuthost. [Permisos de FCM](https://cloud.google.com/iam/docs/roles-permissions/firebasecloudmessaging), [políticas de claves de cuenta de servicio](https://docs.cloud.google.com/iam/docs/troubleshoot-org-policies).
2. En Nuthost, confirmar PHP CLI con cURL y OpenSSL, HTTPS saliente a `oauth2.googleapis.com` y `fcm.googleapis.com`, y acceso al directorio privado con el usuario de la cuenta cPanel. Guardar el JSON directamente en `~/mi-usittel-private/`, con permisos 0600 y por un canal de administración seguro. Mantenerlo fuera de `public_html`, Git y el chat. Si Nuthost bloquea esas salidas o el uso de CLI, el emisor debe correr en un entorno autorizado con acceso restringido al registro piloto.
3. Tras aprobar el despliegue, incorporar en el `config.php` privado el bloque `push` de la plantilla con `enabled` en `true`, `pilot_owners` limitado a la cuenta de prueba aprobada, `project_id` igual a `mi-usittel` y `service_account_file` con la ruta absoluta privada. Comprobar que Chrome puede cargar los módulos en `www.gstatic.com/firebasejs/` y conectarse a `firebaseinstallations.googleapis.com` y `fcmregistrations.googleapis.com`. Usar la PWA instalada y abrirla para actualizar el worker.
4. En Android, abrir la app instalada e ingresar con la cuenta piloto. Elegir **Activar notificaciones** en el aviso inicial y aceptar el permiso de Chrome. Si se eligió **Ahora no**, la opción sigue disponible en **Mi cuenta**. En esa sección, verificar el identificador del dispositivo. Usar solo ese identificador. Cerrar la PWA normalmente y ejecutar el comando desde el checkout privado del hosting, con el mismo runtime que usa la aplicación.

   ```sh
   MI_USITTEL_CONFIG="$HOME/mi-usittel-private/config.php" \
   MI_USITTEL_RUNTIME="$HOME/mi-usittel-private/runtime" \
   php autogestion/server/send-push-test.php ID_DISPOSITIVO android-cerrada-01
   ```

5. Verificar **Mi USITTEL** y **¡Las notificaciones ya están funcionando!**. Tocar la notificación debe abrir **Inicio**. Para una segunda verificación con la app abierta, usar un identificador de intento distinto. Confirmar finalmente la desvinculación al desactivar y al cerrar sesión.

El comando es exclusivo de CLI y envía el mensaje fijo a un único FID autorizado. Una reserva persistida impide duplicar el envío con el mismo identificador de dispositivo e intento. `ACCEPTED` acredita aceptación por FCM. La recepción se confirma en el teléfono. Un timeout puede representar un envío aceptado, por lo que la CLI reserva el intento para conciliación manual. Se registran el código HTTP y el código cURL, sin exponer la respuesta, el FID ni el token OAuth. Si FCM devuelve `UNREGISTERED`, se retira el registro. Los avisos de prueba en tránsito tienen un TTL de 60 segundos.

## Eventos futuros de Phantom

El siguiente paso es un proceso de lectura de Phantom que escriba una cola persistente de eventos. Cada evento debe incluir un tipo, una referencia interna de factura o contrato, una fecha relevante y una clave de deduplicación estable. Un consumidor resolverá los destinatarios a partir de los contratos actualmente autorizados, filtrará por preferencias y vigencia del dispositivo y registrará una entrega por evento y dispositivo. Antes del envío deberá reevaluar el estado de la factura o del servicio para evitar avisos de vencimiento o suspensión obsoletos. Los textos en la pantalla bloqueada serán genéricos. La información del cliente se consultará dentro de la sesión del portal.

| Evento | Identidad y momento | Destino |
| --- | --- | --- |
| Factura generada | Identificador de factura, al detectarla por primera vez | Facturas |
| Vencimiento en cinco días | Factura y vencimiento vigente, a cinco días calendario | Facturas |
| Vencimiento en un día | Factura y vencimiento vigente, a un día calendario | Facturas |
| Pago confirmado | Identificador de pago y confirmación definitiva | Facturas |
| Posible suspensión | Contrato y aviso aplicable de Phantom | Mi servicio |
| Suspensión efectiva | Contrato y transición confirmada a suspendido | Mi servicio |

Calcular los días en `America/Argentina/Buenos_Aires`. Para el futuro envío automático, aplicar reintentos acotados a fallos recuperables y una política de conciliación para resultados ambiguos. Esta fase incluye el registro, la entrega y las rutas para el piloto.

[Registro web por FID](https://firebase.google.com/docs/cloud-messaging/web/get-started) · [Recepción web](https://firebase.google.com/docs/cloud-messaging/web/receive-messages) · [Autenticación HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api) · [Destino FID en HTTP v1](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages).
