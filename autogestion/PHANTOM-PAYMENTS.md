# Imputación de pagos confirmados

## Estados separados

1. **SIRO intent created**: existe una intención durable y el checkout puede abrirse.
2. **SIRO payment confirmed**: SIRO devolvió `PagoExitoso=true` y `Estado=PROCESADA`, y el resultado individual volvió a validarse.
3. **Phantom payment posted**: el backend envió `Imputar_Pago` y una lectura posterior mostró que la factura ya no está `IMPAGA`.

La interfaz muestra **Pago confirmado** entre los puntos 2 y 3. Conserva el saldo real de Phantom y aclara que puede tardar en reflejarse. No publica un plazo de 48 horas porque todavía no existe un SLA confirmado.

## Escritura controlada

La operación usa exclusivamente el IDA de sesión, el IDT y el importe reconsultados en Phantom y el resultado SIRO guardado por el backend. El navegador envía solamente `attempt_id`. Antes de escribir, el servidor vuelve a comprobar el resultado individual de SIRO, la pertenencia de la factura, su estado `IMPAGA` y el importe exacto.

El endpoint CRM admitido es únicamente HTTPS, en el mismo host que API Rest y con el path `/PHANTOM/Includes/CRM/API_CRM.php`. La solicitud usa `action=Imputar_Pago`, sin pagos parciales, y una referencia estable `SIRO <IdOperacion>`. El token y la referencia no llegan al navegador ni a logs normales.

La compuerta `phantom_posting` está deshabilitada por defecto y acepta un solo IDA de laboratorio en una sesión de un único servicio. SIRO y la imputación Phantom tienen compuertas independientes.

## Idempotencia y respuestas inciertas

El intento se marca durablemente `POSTING` antes de la llamada externa. Si hay timeout, desconexión o una respuesta no confirmada, pasa a `POST_UNCONFIRMED`. Ese estado no reenvía la escritura. Primero vuelve a consultar Phantom:

- si la factura ya no está impaga, pasa a `POSTED`;
- si continúa impaga, queda pendiente de revisión;
- si la factura cambió antes del primer envío, pasa a `NEEDS_REVIEW` sin escribir.

Esto complementa la deduplicación por referencia documentada por Phantom y evita depender de ella como única defensa.

## Alcance pendiente

Los fixtures validan el recorrido, pero el endpoint CRM HTTPS todavía debe comprobarse en el laboratorio real. Antes de habilitar la escritura, ejecutar el inspector de autenticación CRM, que no imputa pagos. Producción requiere persistencia transaccional con índices únicos, política operativa de conciliación, hosting/certificados y revisión de seguridad del despliegue.
