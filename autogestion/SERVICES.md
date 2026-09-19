# Servicios autorizados y selección

## Contrato real confirmado — 19/09/2026

La prueba controlada del contrato 1 confirmó que `Conexiones_Asociadas` llega como `[""]`, por lo que no aporta IDs utilizables. El registro principal expone `Cuit` como string y su contenido tiene forma de DNI. La búsqueda exacta de Phantom por ese documento devolvió dos objetos válidos, dos IDs únicos y dos coincidencias documentales, sin ambigüedad. Esto coincide con el comportamiento conocido de Botmaker para los contratos 1 y 5.

Mi USITTEL incorpora esa búsqueda al descubrimiento del login. No confía directamente en la lista recibida: exige lista acotada, objetos, `ID` decimal string, documento equivalente en cada resultado y presencia del contrato autenticado. Luego amplía temporalmente el alcance, reconsulta cada ID exacto y vuelve a comprobar identidad y documento antes de construir la autorización. Una falla o diferencia deja fuera todo el grupo documental; nunca conserva una parte dudosa.

La comparación admite igualdad exacta normalizada y DNI↔CUIT personal solamente con CUIT válido, prefijo personal y DNI embebido exacto. Teléfono y nombre no autorizan. Un CUIT societario solo coincide con el mismo CUIT exacto; no se deriva una relación automática entre una persona y una sociedad. Esto permite residencial/comercio cuando ambos contratos comparten DNI, CUIT personal válido o el mismo CUIT societario, pero no inventa titularidad empresarial.

El documento permanece en backend y no se agrega a sesión, HTML, JavaScript ni respuesta pública. La consulta histórica de Phantom coloca `Documento` en la query remota; por eso puede aparecer en logs internos de Phantom y debe revisarse antes de producción, al igual que las credenciales técnicas GET.

## Alcance

Lectura multicontrato implementada con fixtures y contrato de búsqueda contrastado con Phantom real. Falta la aceptación visual del selector con una sesión real de dos servicios. No se consultó Phantom automáticamente desde tests ni se modificó configuración privada, Apache, DNS o producción. No se amplían pagos SIRO a otros contratos: las rutas existentes los rechazan cuando la sesión tiene múltiples servicios o el seleccionado no es IDA 1.

## Adaptación de Botmaker

Se revisaron `botmaker_js/pagos/validar_contratos.js` y `context/validar_contratos.md` de la copia local de `agustinSC2034/botmaker_functions_USITTEL`. Botmaker reúne conexiones y resultados de búsquedas por documento, genera posibles CUIT, admite distintos nombres de ID y toma el primer registro principal. Mi USITTEL conserva la idea funcional de selección, pero no esos criterios de autorización.

Regla implementada: credenciales exactas del contrato inicial → registro único cuyo ID coincida → asociaciones explícitas y búsqueda documental exacta → deduplicar por ID → reconsultar cada ID exacto y exigir un único registro coincidente. Las direcciones, planes y estados provienen de esa reconsulta, no de entradas duplicadas posiblemente contradictorias. No se siguen asociaciones transitivas de los contratos encontrados. Un contrato suspendido puede ingresar como antes.

Se acepta una lista de objetos o un nivel de sublistas (forma contemplada por Botmaker), máximo diez entradas por lista y diez IDs asociados distintos. ID debe ser string decimal positivo, hasta diez dígitos; no se usa IDAx, IDA, coincidencia parcial ni coerción de tipos. Una estructura desconocida, identidad incorrecta o consulta incompleta deja solamente el contrato autenticado, con aviso de que no se pudieron verificar otros servicios. No se concede acceso parcial a asociaciones dudosas.

No se aceptan resultados aproximados, parciales o con documentos incompatibles. IDs repetidos se deduplican solamente después de validar cada fila; una repetición contradictoria invalida la fuente. La lista se reconstruye en cada login, no en cada lectura. Revocación inmediata de relaciones durante una sesión es una limitación pendiente; se mantienen expiración y logout.

## Sesión y consultas

- `authenticated_ida`: contrato cuyas credenciales se verificaron; nunca cambia al elegir servicio. La antigua clave interna ida se conserva como alias del principal para vencimientos existentes, no como destino de las consultas.
- `authorized_services`: lista de modelos públicos, construida exclusivamente por el servidor. Sus IDs forman la autorización; no se guarda el registro crudo ni documentos/credenciales asociados.
- `selected_ida`: contrato visible; inicialmente siempre authenticated_ida, no el menor ID ni el primero de las asociaciones.
- `service_revision`: versión aleatoria de la selección. En sesiones múltiples se exige como precondición en lecturas y cambio. No autoriza IDs: sigue siendo obligatoria la pertenencia a la lista.

Bootstrap y login devuelven services, selectedServiceId y serviceRevision. Cada servicio contiene solo id, address, plan y serviceStatus. Opcionales ausentes quedan null. Selección inválida en sesión vuelve al principal, rota revisión y limpia historial; si falta también el principal se rechaza el acceso.

POST select-service acepta únicamente serviceId string y exige CSRF, sesión y pertenencia exacta. El bloqueo de sesión PHP serializa la selección y las consultas. Cambiar borra invoice_history y rota revisión. Una pestaña con revisión anterior recibe SERVICE_CHANGED y recarga su contexto. Overview, saldo, perfil, facturas, detalle y PDF usan selected_ida del servidor. PDF continúa reconsultando IDT/pertenencia antes de obtener Hash_Descarga. Un IDT del contrato anterior queda rechazado.

El frontend invalida las respuestas en vuelo con una generación local, limpia datos y muestra carga antes del POST. Solo renderiza la nueva respuesta. Recarga conserva selección; logout borra lista, selección y datos. El selector usa la dirección como botón en Inicio, con chevron solo si hay varios contratos y un modal pequeño compatible con teclado en móvil/desktop. Un solo servicio conserva la presentación sin interacción.

## Laboratorio y siguiente validación real

El acceso inicial continúa limitado por defecto al IDA 1. Una futura habilitación privada puede declarar `service_login_idas` (lista explícita de hasta tres enteros positivos) y el mapeo lab_users ya existente para nombres personalizados. Esta opción define candidatos de login; no autoriza contratos adicionales por sí sola y no evita la comparación exacta de credenciales. No se modificó ese archivo ni se hardcodearon ejemplos del usuario.

El siguiente paso manual es reiniciar el servidor local para cargar este commit e ingresar normalmente con las credenciales del contrato 1. El login debe mostrar dos servicios, mantener el 1 como selección inicial y permitir pasar al 5 sin volver a autenticar. No hace falta volver a ejecutar el inspector ni compartir documentos o credenciales.

## Validación

409 verificaciones con fixtures: conserva regresiones anteriores y añade 1/2/3 servicios, asociación vacía, búsqueda exacta por documento con dos contratos, DNI↔CUIT personal válido, CUIT incompatible o inválido, raíz ausente, tipos incorrectos, duplicados, reconsulta por ID, selección válida/inválida, CSRF, IDA manipulada, revisión obsoleta, perfil/saldo/facturas/PDF por servicio, recarga, logout y expiración. La UX del selector ya fue validada en 390×844 y 1365×900 con fixtures; este cambio no altera su HTML/CSS.
