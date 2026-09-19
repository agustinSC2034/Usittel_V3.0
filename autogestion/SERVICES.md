# Servicios autorizados y selección

## Diagnóstico real pendiente — 19/09/2026

Agustín probó los contratos 1 y 5598: ambos devolvieron un servicio y association_unavailable=true. Esto NO confirma ausencia de otros contratos. Informó además que 1 y 5 comparten documento/teléfono y que Botmaker ofrece ambos. No se tomó esta información como autorización automática.

El inspector ahora agrega diagnostics: etapa del fallo (estructura de asociación o reconsulta), código controlado, tipo/estructura acotada de Conexiones_Asociadas y presencia/tipo de Documento, DNI, dni, Cuit, CUIT y Cuit_Cuil. No muestra valores ni enumera claves arbitrarias; solo tres muestras por nivel, hasta dos niveles. Estos metadatos se producen únicamente para CLI y no se incorporan a la sesión ni a las respuestas del portal. No cambia las reglas de autorización.

Requisito adicional confirmado: contemplar residencial y comercio del mismo titular. La asociación por documento sigue pendiente de confirmar los campos reales y su semántica. Un CUIT personal y un CUIT de una persona jurídica no se equiparan automáticamente; nombre/teléfono compartidos tampoco autorizan facturación. Antes de activar coincidencias normalizadas o relación DNI/CUIT se necesita evidencia backend de titularidad, no solo que una búsqueda devuelva candidatos.

Siguiente prueba única: `inspect-services.php 1`, que ahora permite distinguir el problema de formato sin solicitar documentos personales ni abrir búsquedas nuevas.

Validación del diagnóstico: 389 verificaciones locales con fixtures, incluidas ausencia de valores secretos, tipos inesperados, muestras acotadas y separación entre error de estructura/reconsulta. Sin consultas reales automáticas.

## Alcance

Lectura multicontrato implementada con fixtures; pendiente de contraste real. No se consultó Phantom automáticamente ni se modificó configuración privada, Apache, DNS o producción. No se amplían pagos SIRO a otros contratos: las rutas existentes los rechazan cuando la sesión tiene múltiples servicios o el seleccionado no es IDA 1.

## Adaptación de Botmaker

Se revisaron `botmaker_js/pagos/validar_contratos.js` y `context/validar_contratos.md` de la copia local de `agustinSC2034/botmaker_functions_USITTEL`. Botmaker reúne conexiones y resultados de búsquedas por documento, genera posibles CUIT, admite distintos nombres de ID y toma el primer registro principal. Mi USITTEL conserva la idea funcional de selección, pero no esos criterios de autorización.

Regla implementada: credenciales exactas del contrato inicial → registro único cuyo ID coincida → Conexiones_Asociadas explícitas → deduplicar por ID → reconsultar cada ID exacto y exigir un único registro coincidente. Las direcciones, planes y estados provienen de esa reconsulta, no de entradas duplicadas posiblemente contradictorias. No se siguen asociaciones transitivas de los contratos encontrados. Un contrato suspendido puede ingresar como antes.

Se acepta una lista de objetos o un nivel de sublistas (forma contemplada por Botmaker), máximo diez entradas por lista y diez IDs asociados distintos. ID debe ser string decimal positivo, hasta diez dígitos; no se usa IDAx, IDA, coincidencia parcial ni coerción de tipos. Una estructura desconocida, identidad incorrecta o consulta incompleta deja solamente el contrato autenticado, con aviso de que no se pudieron verificar otros servicios. No se concede acceso parcial a asociaciones dudosas.

No se consulta por Documento/DNI/CUIT ni se convierten documentos. Resultados duplicados, aproximados o ambiguos por documento no autorizan nada. No tenemos todavía confirmados los campos y la relación de titularidad necesaria para incorporarlos a una autorización web. Si la prueba real muestra un solo servicio, esta entrega no prueba que el cliente tenga uno solo: puede faltar una asociación explícita. No se habilitará un fallback silencioso por documento.

La relación explícita de Phantom se toma como la fuente de autorización entre contratos; el inspector debe confirmar que existe para la cuenta de prueba. La lista se reconstruye en cada login, no en cada lectura. Revocación inmediata de relaciones durante una sesión es una limitación pendiente; se mantienen expiración y logout.

## Sesión y consultas

- `authenticated_ida`: contrato cuyas credenciales se verificaron; nunca cambia al elegir servicio. La antigua clave interna ida se conserva como alias del principal para vencimientos existentes, no como destino de las consultas.
- `authorized_services`: lista de modelos públicos, construida exclusivamente por el servidor. Sus IDs forman la autorización; no se guarda el registro crudo ni documentos/credenciales asociados.
- `selected_ida`: contrato visible; inicialmente siempre authenticated_ida, no el menor ID ni el primero de las asociaciones.
- `service_revision`: versión aleatoria de la selección. En sesiones múltiples se exige como precondición en lecturas y cambio. No autoriza IDs: sigue siendo obligatoria la pertenencia a la lista.

Bootstrap y login devuelven services, selectedServiceId y serviceRevision. Cada servicio contiene solo id, address, plan y serviceStatus. Opcionales ausentes quedan null. Selección inválida en sesión vuelve al principal, rota revisión y limpia historial; si falta también el principal se rechaza el acceso.

POST select-service acepta únicamente serviceId string y exige CSRF, sesión y pertenencia exacta. El bloqueo de sesión PHP serializa la selección y las consultas. Cambiar borra invoice_history y rota revisión. Una pestaña con revisión anterior recibe SERVICE_CHANGED y recarga su contexto. Overview, saldo, perfil, facturas, detalle y PDF usan selected_ida del servidor. PDF continúa reconsultando IDT/pertenencia antes de obtener Hash_Descarga. Un IDT del contrato anterior queda rechazado.

El frontend invalida las respuestas en vuelo con una generación local, limpia datos y muestra carga antes del POST. Solo renderiza la nueva respuesta. Recarga conserva selección; logout borra lista, selección y datos. El selector usa la dirección como botón en Inicio, con chevron solo si hay varios contratos y un modal pequeño compatible con teclado en móvil/desktop. Un solo servicio conserva la presentación sin interacción.

## Laboratorio y primer contraste real

El acceso inicial continúa limitado por defecto al IDA 1. Una futura habilitación privada puede declarar `service_login_idas` (lista explícita de hasta tres enteros positivos) y el mapeo lab_users ya existente para nombres personalizados. Esta opción define candidatos de login; no autoriza contratos adicionales por sí sola y no evita la comparación exacta de credenciales. No se modificó ese archivo ni se hardcodearon ejemplos del usuario.

Único paso manual ahora, desde PowerShell del proyecto con las variables ya configuradas:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-services.php
```

El inspector pide en la terminal el número del contrato inicial de la cuenta con dos servicios. Esa entrada explícita autoriza solo el diagnóstico de dicho contrato y sus asociaciones directas; no habilita su login ni cambia la configuración. Usa el transporte HTTPS/CA existente y solo Consulta_Cliente_Avanzada; no consulta saldos/facturas, documentos de identidad ni SIRO. Hay una consulta inicial y hasta diez reconsultas asociadas, con la renovación acotada de token ya existente si vence.

Compartir únicamente el resumen: cantidad, asociación disponible y presencia de ID/dirección/plan. No imprime valores, DNI/CUIT, credenciales, token ni hashes. `association_unavailable: true` significa que no se pudo validar el mecanismo; no significa que el titular carezca de otros servicios. Esperar este resultado antes de habilitar la cuenta en la configuración privada y probar el selector real.

## Validación

377 verificaciones con fixtures: conserva regresiones anteriores y añade 1/2/3 servicios, duplicados/principal repetido, IDAx distinto, campos inválidos, opcionales ausentes, documentos ignorados, selección válida/inválida, CSRF, IDA manipulada, revisión obsoleta, perfil/saldo/facturas/PDF por servicio, recarga, logout y expiración. Prueba de navegador aislada en 390×844 y 1365×900: selector, cambio, saldo, recarga, factura/PDF del segundo servicio, logout, un solo servicio y ausencia de desbordamiento/errores JS. Browser plugin no disponible; se utilizó Playwright con servidor de fixtures y bloqueo de solicitudes externas.
