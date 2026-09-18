# MVP — laboratorio IDA 1

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

SIRO y todo pago/imputación, promesas, reactivación, cambios Wi-Fi/planes/datos, tickets reales, múltiples contratos, búsqueda universal de usuarios, web pública y producción. Comprobantes de pago reales son distintos de las facturas y no se implementaron.

Antes de producción: riesgo de credenciales técnicas GET en logs remotos, gestión de CA/certificados del hosting, revisión de seguridad y despliegue. No tocar Apache, DNS, .htaccess ni el botón público de autogestión.

## Validación real del historial y ajuste visual — 18/09/2026

Agustín ejecutó el inspector: primera página de 10 facturas, segunda de 1, sin duplicados entre páginas, orden descendente y continuidad correcta. Las 11 presentan Hash_Descarga de tipo string. Confirmó que el historial y los detalles funcionan en el portal. La paginación y el detalle ampliado quedan aceptados para IDA 1; la descarga desde el portal fue aceptada manualmente.

Ajuste de presentación solicitado: se oculta el Detalle técnico sin interpretar su cadena ni modificar los datos recibidos; se elimina únicamente el prefijo observado RES ($) - del nombre visible del plan. Gestionar mi servicio y Speedtest quedan visibles sin desplegable. Sus acciones reales continúan deshabilitadas en modo Phantom.

Inspector CLI de documento preparado: IDA 1 + IDT numérico, o --latest explícito, resolución interna de Hash_Descarga desde JSON, GET único al path fijo encontrado en Botmaker, TLS/CA y sin redirects. La prueba manual solo produce metadatos seguros. La prueba del inspector ya confirmó PDF. Descargar está conectado; pagos y escrituras continúan deshabilitados.

## Cierre de conexión documental

Prueba real aportada por Agustín: endpoint PDF, HTTP 200, 512207 bytes, sin redirects. El flujo del portal y la fuente HTTP están probados con fixtures; no se hicieron llamadas reales automáticas. Agustín confirmó el recorrido final: descarga y contraste de una factura reciente y otra histórica, cierre de sesión y recarga. Etapa de lectura de Facturas aceptada para IDA 1; corresponde informar al chat principal.

## Cierre aceptado — 18/09/2026

Agustín respondió “listo todo ok” a la comprobación final solicitada: descarga de factura reciente e histórica, correspondencia de período/número/importe y logout seguido de recarga al login. Es aceptación manual del laboratorio IDA 1, no validación de otros clientes ni de producción. No se habilitan SIRO, pagos ni escrituras.
