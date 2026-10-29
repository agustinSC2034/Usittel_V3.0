# Pagos SIRO y acreditación nativa — 29/10/2026

Mi USITTEL crea la intención y confirma el resultado individual con SIRO. La integración nativa SIRO de Phantom es la única que registra el pago. El portal no invoca `Imputar_Pago`.

La ruta histórica `payment-post` responde `PHANTOM_POSTING_DISABLED` (409), incluso con configuración privada antigua habilitada. Login, bootstrap y selección de contrato anuncian `phantom_posting_enabled=false`. No hay recuperación de imputaciones desde el navegador. Los helpers históricos se conservan para auditoría y pruebas, sin ruta pública que los ejecute.

Un intento confirmado sigue siendo durable y bloquea otra intención para la misma factura, aun cuando Phantom todavía la informa impaga. No borrar ni reiniciar `siro-attempts.json`.

La consulta de pagos revisa la factura exacta en Phantom y publica `accreditation_state`:

- `WAITING`: factura impaga, pago SIRO confirmado; la pantalla indica acreditación en proceso y hasta 48 horas hábiles según el medio.
- `SETTLED`: factura exacta, contrato e importe coincidentes, informada pagada por Phantom. La pantalla indica factura saldada. Esto verifica el estado de la factura, no atribuye su pago a una operación bancaria particular.
- `UNKNOWN`: fallo de consulta o discrepancia de identidad/importe; conserva la confirmación SIRO y el bloqueo de volver a pagar, sin declarar la factura saldada.

Se limita la reconsulta a una cada cinco segundos por intento. Los estados anteriores de imputación no se borran ni se interpretan por sí solos como prueba de que la factura siga pagada. El saldo siempre procede de Phantom.

## Despliegue

Publicar juntos los cambios de `server/Api.php`, `server/Payments.php`, `server/PhantomPayments.php` y los módulos modificados de `js/`. El bloqueo del servidor protege también de pestañas con JavaScript antiguo. No requiere editar `.htaccess` ni Apache. La configuración privada `phantom_posting.enabled` puede mantenerse apagada; ninguna configuración histórica vuelve a habilitar la escritura pública.

No ejecutar una imputación como prueba de despliegue. Verificar bootstrap, login, lectura de intento confirmado y una cuenta con factura pagada, sin cobrar nuevamente. La prueba con una operación nueva debe comprobar la llegada de la rendición nativa antes de declarar verificado el circuito productivo completo.

Las duplicaciones históricas requieren conciliación y corrección separadas. Esta versión no anula recibos ni modifica cuentas existentes.

## Suspensiones

La suspensión por deuda se ejecuta fuera de este portal. La confirmación local de SIRO no modifica automáticamente esa política. Antes del próximo proceso de cortes, la operación debe contemplar los pagos confirmados pendientes de rendición o implementar una excepción mediante un mecanismo aprobado en Phantom. No se han desactivado suspensiones ni alterado contratos desde este cambio.

Este flujo reemplaza las instrucciones históricas de imputación directa del portal en PHANTOM-PAYMENTS.md.
