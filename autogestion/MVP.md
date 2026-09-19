# MVP — laboratorio IDA 1

## Servicios asociados

Selector discreto en Inicio solo cuando existen varios contratos autorizados; sesión, datos y descargas aislados por selección. Implementado y validado con fixtures/mobile/desktop y con una sesión Phantom real de dos servicios. El contrato 1271 confirmó asociación directa, cambio sin nuevo login y actualización conjunta de dirección, plan, saldo y facturas; el contrato 1 conserva el respaldo exacto por documento. Las asociaciones explícitas y documentales se verifican antes de autorizar. [Arquitectura](SERVICES.md). SIRO no se habilita para sesiones multicontrato en esta etapa. Este alcance reemplaza la exclusión histórica de múltiples contratos que figura más abajo.

## Etapa SIRO actual

Creación de intención y confirmación backend implementadas con fixtures y validadas manualmente con SIRO real en una cuenta controlada de un solo servicio: cancelación, nuevo intento y pago confirmado. La suite actual suma 493 verificaciones. Deshabilitadas por defecto fuera de esa configuración privada. Solo factura IMPAGA de una cuenta de laboratorio explícita con un único servicio autorizado, importe reconsultado en Phantom, checkout oficial, intentos persistentes y recuperación sin retorno. IDA 1 tiene dos servicios y permanece bloqueado. La UI separa Facturas de Movimientos; no mezcla los intentos SIRO con el listado principal.

La UI distingue intención SIRO, confirmación SIRO e imputación Phantom; no altera el saldo. La autenticación CRM real ya fue confirmada con `CRM_AUTH_OK`, usando un token separado del token REST. `Consultar_Impagos` y el preflight de solo lectura están preparados; la primera llamada real a `Imputar_Pago` no se realizó. Las fechas de Consulta reproducen la función validada de la POC de Buenos Aires, sin sustituirla por UTC. El almacenamiento depende de PaymentAttempts para poder migrar a persistencia transaccional antes de producción. Ver [SIRO.md](SIRO.md), [PHANTOM-PAYMENTS.md](PHANTOM-PAYMENTS.md) y [FIRST-SIRO-TEST.md](FIRST-SIRO-TEST.md).

## Aceptado con Phantom real

Agustín confirmó login con credenciales de autogestión, identidad por ID, Inicio con datos reales, plan y Estado_Servicio, saldo desde Phantom_Mi_Estado_Cuenta.Balance, última factura y apertura del detalle. La sesión persiste al recargar; logout seguido de recarga vuelve al login sin datos del cliente.

Autenticación técnica GET HTTPS, lecturas POST JSON con token en body y TLS/CA privada funcionan. No reabrir esa investigación salvo fallo nuevo. Balance positivo = deuda; negativo = saldo a favor según el contrato de esta instalación. La prueba real de signo se hizo con deuda positiva; crédito negativo está cubierto con fixtures.

## Facturas: historial, detalle y descarga aceptados

- Primera página y Cargar más, diez registros por solicitud y sin carga masiva automática.
- Orden descendente por IDT, sin inventar total/páginas. Página corta o vacía finaliza la consulta actual.
- Duplicados, cambios de continuidad u orden inesperado se rechazan sin mezclar datos; se solicita recargar.
- Detalle reconsultado para una factura del historial autorizado en la sesión.
- Perfil y saldo de cuenta separados del total de factura. No se inventan saldo pendiente, fecha/método de pago ni próximo vencimiento global.
- Estados originales PAGADA/IMPAGA se presentan como Pagada/Pendiente; no se agregó una regla de vencida basada en fechas.
- Descarga: backend autorizado y controles de PDF preparados y probados con fixtures. Endpoint confirmado manualmente como PDF (HTTP 200, 512207 bytes, sin redirects). Botón conectado mediante backend y transporte compartido con el inspector. Agustín aceptó manualmente el recorrido reciente/histórico desde el portal.

El inspector y la navegación real confirmaron las dos páginas (10 + 1) y sus detalles. Ver FIRST-PHANTOM-TEST.md. La descarga desde el portal está conectada y aceptada manualmente.

## Conservado

Diseño aprobado, navegación móvil/desktop, sesión/CSRF/vencimientos/logout, límites de intentos, aislamiento demo/Phantom, whitelist pública, configuración y runtime privados. Mi servicio y Mi cuenta muestran lectura de perfil; Soporte no inventa tickets. Funciones secundarias del prototipo conservadas, deshabilitadas en Phantom.

## Fuera de alcance

Primera imputación real de pagos en Phantom, promesas, reactivación, cambios Wi-Fi/planes/datos, tickets reales, búsqueda universal de usuarios, web pública y producción. SIRO solo llega a confirmación independiente; su prueba real de laboratorio quedó completada. La escritura Phantom permanece detrás de una compuerta apagada y exige primero `READY_FOR_CONTROLLED_POST`. Comprobantes de pago reales son distintos de las facturas y no se implementaron. Los cierres históricos siguientes corresponden a la etapa anterior de lectura.

Antes de producción: riesgo de credenciales técnicas GET en logs remotos, gestión de CA/certificados del hosting, revisión de seguridad y despliegue. No tocar Apache, DNS, .htaccess ni el botón público de autogestión.

## Validación real del historial y ajuste visual — 18/09/2026

Agustín ejecutó el inspector: primera página de 10 facturas, segunda de 1, sin duplicados entre páginas, orden descendente y continuidad correcta. Las 11 presentan Hash_Descarga de tipo string. Confirmó que el historial y los detalles funcionan en el portal. La paginación y el detalle ampliado quedan aceptados para IDA 1; la descarga desde el portal fue aceptada manualmente.

Ajuste de presentación solicitado: se oculta el Detalle técnico sin modificar los datos recibidos. La UI limpia fecha/prefijo técnico del plan y referencias anexas del domicilio; el selector muestra solo domicilio y plan. Gestionar mi servicio y Speedtest quedan visibles sin desplegable. Sus acciones reales continúan deshabilitadas en modo Phantom.

Inspector CLI de documento preparado: IDA 1 + IDT numérico, o --latest explícito, resolución interna de Hash_Descarga desde JSON, GET único al path fijo encontrado en Botmaker, TLS/CA y sin redirects. La prueba manual solo produce metadatos seguros. La prueba del inspector ya confirmó PDF. Descargar está conectado; pagos y escrituras continúan deshabilitados.

## Cierre de conexión documental

Prueba real aportada por Agustín: endpoint PDF, HTTP 200, 512207 bytes, sin redirects. El flujo del portal y la fuente HTTP están probados con fixtures; no se hicieron llamadas reales automáticas. Agustín confirmó el recorrido final: descarga y contraste de una factura reciente y otra histórica, cierre de sesión y recarga. Etapa de lectura de Facturas aceptada para IDA 1; corresponde informar al chat principal.

## Cierre aceptado — 18/09/2026

Agustín respondió “listo todo ok” a la comprobación final solicitada: descarga de factura reciente e histórica, correspondencia de período/número/importe y logout seguido de recarga al login. Es aceptación manual del laboratorio IDA 1, no validación de otros clientes ni de producción. No se habilitan SIRO, pagos ni escrituras.
