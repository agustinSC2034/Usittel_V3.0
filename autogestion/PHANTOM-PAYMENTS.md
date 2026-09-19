# Imputación de pagos confirmados

## Estados separados

1. **SIRO intent created**: existe una intención durable y el checkout puede abrirse.
2. **SIRO payment confirmed**: SIRO devolvió `PagoExitoso=true` y `Estado=PROCESADA`, y el resultado individual volvió a validarse.
3. **Phantom payment posted**: el backend envió `Imputar_Pago` y una lectura posterior mostró que la factura ya no está `IMPAGA`.

La interfaz muestra **Pago confirmado** entre los puntos 2 y 3. Conserva el saldo real de Phantom y aclara que puede tardar en reflejarse. No publica un plazo de 48 horas porque todavía no existe un SLA confirmado.

## Escritura controlada

La operación usa exclusivamente el IDA de sesión, el IDT y el importe reconsultados en Phantom y el resultado SIRO guardado por el backend. El navegador envía solamente `attempt_id`. Antes de escribir, el servidor vuelve a comprobar el resultado individual de SIRO, la pertenencia de la factura, su estado `IMPAGA` y el importe exacto.

El endpoint CRM admitido es únicamente HTTPS, en el mismo host que API Rest y con el path `/PHANTOM/Includes/CRM/API_CRM.php`. La solicitud usa `action=Imputar_Pago`, sin pagos parciales, y una referencia estable `SIRO <IdOperacion>`. El token y la referencia no llegan al navegador ni a logs normales.

La autenticación CRM quedó confirmada manualmente con `CRM_AUTH_OK`. `PhantomCrmHttp` autentica contra `API_CRM.php`, conserva un token CRM privado durante diez minutos y renueva una sola vez ante 401/403. Su caché usa una clave y un archivo distintos de API Rest. El inspector y el escritor comparten esta implementación: **token API Rest ≠ token CRM**, aunque las credenciales técnicas sean las mismas.

Antes de escribir se ejecutan tres comprobaciones coincidentes: SIRO individual sigue `PROCESADA` con `PagoExitoso=true`; API Rest devuelve la factura exacta `IMPAGA` con IDA/IDT/importe esperados; y CRM `Consultar_Impagos`, consultado estrictamente por IDT, devuelve exactamente esa deuda con los mismos IDA e importe. Cualquier ausencia, duplicado, formato inesperado o contradicción detiene la escritura.

La compuerta `phantom_posting` está deshabilitada por defecto y acepta un solo IDA de laboratorio en una sesión de un único servicio. SIRO y la imputación Phantom tienen compuertas independientes.

## Idempotencia y respuestas inciertas

El intento se marca durablemente `POSTING` antes de la llamada externa. La respuesta textual se clasifica como reconocimiento de éxito, error explícito o texto desconocido, pero nunca es la fuente final de verdad. Después de todo intento se releen API Rest y CRM. Si hay timeout, desconexión o una respuesta no confirmada, pasa a `POST_UNCONFIRMED`. Ese estado no reenvía la escritura. Primero vuelve a consultar Phantom:

- si la factura ya no está impaga, pasa a `POSTED`;
- si continúa impaga, queda pendiente de revisión;
- si la factura cambió antes del primer envío, pasa a `NEEDS_REVIEW` sin escribir;
- si antes del primer envío Phantom ya la muestra pagada, pasa a `ALREADY_SETTLED`: no se atribuye esa imputación a Mi USITTEL.

Esto complementa la deduplicación por referencia documentada por Phantom y evita depender de ella como única defensa.

## Alcance pendiente

El endpoint y la autenticación CRM HTTPS ya fueron comprobados en el laboratorio real sin escritura. La primera llamada real a `Imputar_Pago` continúa pendiente. Antes de considerarla debe ejecutarse `inspect-payment-posting-preflight.php`, que localiza un único intento confirmado en el runtime, revalida SIRO/REST/CRM y no llama `Imputar_Pago`. `phantom_posting.enabled` permanece `false` durante esa prueba. Producción requiere persistencia transaccional con índices únicos, política operativa de conciliación, hosting/certificados y revisión de seguridad del despliegue.
