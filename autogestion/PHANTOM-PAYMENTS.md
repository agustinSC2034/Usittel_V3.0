# Imputación de pagos confirmados

## Estados separados

1. **SIRO intent created**: existe una intención durable y el checkout puede abrirse.
2. **SIRO payment confirmed**: SIRO devolvió `PagoExitoso=true` y `Estado=PROCESADA`, y el resultado individual volvió a validarse.
3. **Phantom payment posted**: el backend intentó `Imputar_Pago`, REST confirma `PAGADA` para la factura esperada y CRM confirma ausencia de impagos para ese IDT.

La interfaz muestra **Pago confirmado** entre los puntos 2 y 3. Conserva el saldo real de Phantom y aclara que puede tardar en reflejarse. No publica un plazo de 48 horas porque todavía no existe un SLA confirmado.

## Escritura controlada

La operación usa exclusivamente el IDA de sesión, el IDT y el importe reconsultados en Phantom y el resultado SIRO guardado por el backend. El navegador envía solamente `attempt_id`. Antes de escribir, el servidor vuelve a comprobar el resultado individual de SIRO, la pertenencia de la factura, su estado `IMPAGA` y el importe exacto.

El endpoint CRM admitido es únicamente HTTPS, en el mismo host que API Rest y con el path `/PHANTOM/Includes/CRM/API_CRM.php`. La solicitud usa `action=Imputar_Pago`, sin pagos parciales, y una referencia estable `SIRO <IdOperacion>`. El token y la referencia no llegan al navegador ni a logs normales.

La autenticación CRM quedó confirmada manualmente con `CRM_AUTH_OK`. `PhantomCrmHttp` autentica contra `API_CRM.php`, conserva un token CRM privado durante diez minutos y renueva una sola vez ante 401/403. Su caché usa una clave y un archivo distintos de API Rest. El inspector y el escritor comparten esta implementación: **token API Rest ≠ token CRM**, aunque las credenciales técnicas sean las mismas.

Antes de escribir se ejecutan tres comprobaciones coincidentes: SIRO individual sigue `PROCESADA` con `PagoExitoso=true`; API Rest devuelve la factura exacta `IMPAGA` con IDA/IDT/importe esperados; y CRM `Consultar_Impagos`, consultado estrictamente por IDT, devuelve exactamente esa deuda con los mismos IDA e importe. Cualquier ausencia, duplicado, formato inesperado o contradicción detiene la escritura.

La compuerta `phantom_posting` está deshabilitada por defecto y acepta un solo IDA de laboratorio en una sesión de un único servicio. SIRO y la imputación Phantom tienen compuertas independientes.

## Idempotencia y respuestas inciertas

El intento se marca durablemente `POSTING` antes de la llamada externa. La respuesta textual se clasifica como reconocimiento de éxito, error explícito o texto desconocido, pero nunca es la fuente final de verdad. Después de todo intento se releen API Rest y CRM. Si hay timeout, desconexión o una respuesta no confirmada, pasa a `POST_UNCONFIRMED`. Ese estado no reenvía la escritura. Primero vuelve a consultar Phantom:

- si REST informa `PAGADA` y CRM confirma ausencia de impagos para ese IDT, pasa a `POSTED`;
- si continúa impaga, queda pendiente de revisión;
- si la factura cambió antes del primer envío, pasa a `NEEDS_REVIEW` sin escribir;
- si antes del primer envío Phantom ya la muestra pagada, pasa a `ALREADY_SETTLED`: no se atribuye esa imputación a Mi USITTEL.

Esto complementa la deduplicación por referencia documentada por Phantom y evita depender de ella como única defensa.

## Alcance pendiente

El 19/09/2026 el preflight real devolvió `READY_FOR_CONTROLLED_POST` y se realizó una única llamada controlada a `Imputar_Pago`. La relectura inmediata no pudo confirmar el cierre simultáneo en API Rest y CRM, por lo que el intento quedó correctamente en `POST_UNCONFIRMED` y no se reenvió. Una lectura posterior mostró que el saldo de cuenta pasó de $121 a $0, mientras la factura y CRM todavía requerían conciliación. Esto es evidencia de actualización parcial o diferida, no autorización para marcar `POSTED` ni repetir la escritura.

La acción de consulta posterior reutiliza el estado durable y solo relee Phantom. Producción continúa requiriendo persistencia transaccional con índices únicos, política operativa de conciliación, hosting/certificados y revisión de seguridad del despliegue.

El 20/09/2026 la prueba manual de `inspect-payment-verification.php` confirmó `rest_state=PAGADA` y `crm_error=PHANTOM_CRM_FORMAT`. La captura administrativa muestra el pago y saldo de factura cero. La conciliación automática permanece pendiente: no se transforma un error de formato en ausencia de impagos. El mismo inspector ahora agrega exclusivamente HTTP, cantidad de bytes, indicador de vacío y clase de formato ante ese error. No imprime contenido, tokens ni URLs, no consulta SIRO y no realiza imputaciones. Botmaker contempla respuestas vacías/textuales, pero esa heurística no se usa como autorización para cerrar un intento en Mi USITTEL.

La siguiente prueba informó HTTP 200, JSON string y 80 bytes. La revisión visual del PDF original `botmaker_functions_USITTEL/apis/api_imputar_pago/Phantom_API_CRM3_Pronto_Pago.pdf`, página 8 (Rev. ENE 25), recuperó el ejemplo que falta en su extracción Markdown: `"No se encuentran comprobantes pendientes de pago para el criterio de busqueda."`. Esa representación JSON tiene 80 bytes; la longitud sola no confirma identidad. El adaptador reconoce exclusivamente la igualdad exacta del mensaje decodificado en Consultar_Impagos como lista vacía. Otros textos, errores, HTML, null o cuerpo vacío siguen rechazados. No cambia la protección contra repetir una imputación. Resta validar manualmente la conciliación con esta interpretación documentada.
