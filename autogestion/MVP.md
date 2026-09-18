# MVP — laboratorio IDA 1

## Aceptado con Phantom real

Agustín confirmó login con credenciales de autogestión, identidad por ID, Inicio con datos reales, plan y Estado_Servicio, saldo desde Phantom_Mi_Estado_Cuenta.Balance, última factura y apertura del detalle. La sesión persiste al recargar; logout seguido de recarga vuelve al login sin datos del cliente.

Autenticación técnica GET HTTPS, lecturas POST JSON con token en body y TLS/CA privada funcionan. No reabrir esa investigación salvo fallo nuevo. Balance positivo = deuda; negativo = saldo a favor según el contrato de esta instalación. La prueba real de signo se hizo con deuda positiva; crédito negativo está cubierto con fixtures.

## Facturas: ampliación implementada, aceptación real pendiente

- Primera página y Cargar más, diez registros por solicitud y sin carga masiva automática.
- Orden descendente por IDT, sin inventar total/páginas. Página corta o vacía finaliza la consulta actual.
- Duplicados, cambios de continuidad u orden inesperado se rechazan sin mezclar datos; se solicita recargar.
- Detalle reconsultado para una factura del historial autorizado en la sesión.
- Perfil y saldo de cuenta separados del total de factura. No se inventan saldo pendiente, fecha/método de pago ni próximo vencimiento global.
- Estados originales PAGADA/IMPAGA se presentan como Pagada/Pendiente; no se agregó una regla de vencida basada en fechas.
- Descarga: backend autorizado y controles de PDF preparados y probados con fixtures. Falta el endpoint real, no documentado inequívocamente. Botón real deshabilitado, fuente real cerrada, sin URLs adivinadas ni documentos de ejemplo en Phantom.

La próxima intervención es un único comando `inspect-invoices.php 1` para comparar dos páginas de laboratorio con metadatos seguros. Ver FIRST-PHANTOM-TEST.md. La paginación ampliada y la descarga real NO están todavía aceptadas.

## Conservado

Diseño aprobado, navegación móvil/desktop, sesión/CSRF/vencimientos/logout, límites de intentos, aislamiento demo/Phantom, whitelist pública, configuración y runtime privados. Mi servicio y Mi cuenta muestran lectura de perfil; Soporte no inventa tickets. Funciones secundarias del prototipo conservadas, deshabilitadas en Phantom.

## Fuera de alcance

SIRO y todo pago/imputación, promesas, reactivación, cambios Wi-Fi/planes/datos, tickets reales, múltiples contratos, búsqueda universal de usuarios, web pública y producción. Comprobantes de pago reales son distintos de las facturas y no se implementaron.

Antes de producción: riesgo de credenciales técnicas GET en logs remotos, gestión de CA/certificados del hosting, revisión de seguridad y despliegue. No tocar Apache, DNS, .htaccess ni el botón público de autogestión.
