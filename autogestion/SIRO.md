# SIRO de laboratorio: intención y confirmación

## Revisión SIRO1 — 19/09/2026

Validación local actual: 493 verificaciones fixture, sintaxis PHP/JS y compilación visual. La prueba SIRO real de laboratorio quedó completada: intención creada, cancelación recuperada por consulta posterior, segundo intento único, pago confirmado con PagoExitoso=true y Estado=PROCESADA. La autenticación CRM real quedó confirmada con `CRM_AUTH_OK`; el preflight devolvió `READY_FOR_CONTROLLED_POST` y se realizó una única escritura controlada. Su estado es `POST_UNCONFIRMED`: el saldo real pasó de $121 a $0, pero REST/CRM todavía no confirmaron conjuntamente el cierre. No se reenvió. Ver [PHANTOM-PAYMENTS.md](PHANTOM-PAYMENTS.md).

La lectura multicontrato aceptada se conserva. El dominio recibe `selected_ida` del servidor, y las rutas SIRO exigen exactamente un servicio autorizado y coincidencia con `siro.lab_ida` privado (1 por defecto). IDA 1 tiene dos servicios en la instalación actual: SIRO queda bloqueado. Para probar será necesaria otra cuenta de laboratorio de un único servicio, acordada explícitamente; nunca ocultar asociaciones.

`Payments` depende de la interfaz `PaymentAttempts`; `PaymentStore` implementa persistencia de laboratorio con transacción exclusiva, reserva previa al POST y escritura atómica. Producción necesitará implementar esa interfaz sobre almacenamiento transaccional con UNIQUE para attempt_id, comprobante y CPE+sufijo, además de exclusión de intentos activos por factura.

Antes de reutilizar un checkout se revalidan importe y CPE de la factura actual. Si cambiaron, PAYMENT_INVOICE_CHANGED bloquea la salida y la UI actualiza la factura. Si ahora está PAGADA también se frena y recarga. Nunca se modifica el importe de un intento reservado.

El retorno conserva solo el attempt_id propio como indicación de navegación. Se descarta toda query SIRO; el backend comprueba pertenencia antes de reconciliar. Si venció la sesión, luego del login vuelve a Facturas. Sin retorno también se recuperan los intentos persistidos. La API pública distingue `intent_created`, `siro_payment_confirmed`, `phantom_posting_state` y `phantom_payment_posted`, además de phase SIRO_INTENT_CREATING / SIRO_PENDING / SIRO_CONFIRMED / SIRO_CANCELLED / SIRO_REJECTED / SIRO_UNKNOWN. No expone la referencia de imputación ni el identificador SIRO.

### Fechas de la POC

Fuente: tarea del proyecto “Analizar costos WhatsApp Botmaker”, función fechaSiro en el turno 361181e1-58c7-4050-9ee4-28339a4c966a y resultado manual de Consulta en 1d1c092d-8332-4e1f-939f-518d1854e7f9. No se copiaron respuestas ni identificadores de aquella transacción.

La POC formatea en America/Argentina/Buenos_Aires como `yyyy-MM-dd'T'HH:mm:ss.SSS` y concatena una **Z literal**. `siroDate()` reproduce esa convención; no convierte a UTC aunque termine en Z. Los instantes internos se siguen guardando en UTC real.

Se conserva el margen de un minuto en FechaHasta. FechaDesde se ancla doce horas antes de la creación del intento, en vez de doce horas antes de consultar, para recuperar intentos antiguos. Esa ampliación está cubierta con fixtures; su límite operativo real queda pendiente. Una consulta inmediata puede no incluir el resultado: esperar y consultar de nuevo, sin inferir cancelación ni habilitar otro cobro. Se rechazan fechas inválidas o futuras antes del transporte.

## Alcance y evidencia

Lectura Phantom IDA 1 aceptada por Agustín en f47bb26: login, sesión, perfil, saldo, 11 facturas, detalle, PDF reciente/histórico y logout. Esta etapa conserva ese recorrido. SIRO está implementado con fixtures, deshabilitado por defecto y validado con credenciales reales únicamente para la cuenta de laboratorio privada acordada.

Contrato contrastado con la investigación local `Mi_USITTEL_SIRO_Estado_Tecnico_POC_2026-09-14.pdf` y el [manual oficial API SIRO Pagos 1.4](https://www.bancoroela.com.ar/uploads/SIRO%20Developers%20-%20API%20SIRO%20PAGOS%20-%20Versi%C3%B3n%201.4%20-%2003.25.pdf). El manual permite comprobantes numéricos de veinte posiciones y exige diferenciar sus cinco posiciones finales para un mismo cliente empresa; contempla un contador secuencial. Los ejemplos de resultados contienen Request, IdOperacion, Estado y PagoExitoso. La compatibilidad exacta de esta instalación se comprobará manualmente, sin exponer respuestas crudas.

## Tres hitos independientes

| Hito | Evidencia | Alcance actual |
| --- | --- | --- |
| SIRO intent created | SIRO devuelve Hash y URL oficial válida | Implementado |
| SIRO payment confirmed | Consulta autenticada, identidad e importe coincidentes, PagoExitoso booleano true Y Estado PROCESADA | Implementado |
| Phantom payment posted | Imputación enviada y verificada con lecturas posteriores REST/CRM | Primera escritura ejecutada una vez; confirmación final pendiente, sin reintento |

Antes de la verificación Phantom no se modifica el estado original ni se descuenta el saldo mostrado. La presentación superpone “Pago confirmado” y explica que la cuenta se está actualizando. Un intento confirmado bloquea otro cobro aunque Phantom todavía devuelva IMPAGA.

## Recorrido y archivos

- `server/Siro.php`: transporte backend con endpoints fijos, TLS/hostname y CA privada, JSON estricto, límites de tamaño y tiempo, sin redirects. Token SIRO solo en memoria durante la solicitud. Autenticación Usuario/Password; bearer en las consultas. No logs de URLs completas, tokens ni cuerpos.
- `server/Payments.php`: importe en centavos, identidad del intento, comprobante único, persistencia y reconciliación separada de creación.
- `server/Api.php`: sesión propia, IDA de sesión exclusivamente, CSRF para POST y listas explícitas de campos. `payment-create` recibe únicamente `{idt: "..."}`. El IDT debe estar en el historial autorizado; vuelve a consultarse su posición en Phantom y debe coincidir, pertenecer al cliente y tener Estado IMPAGA. No hay datos demo ni importe del navegador.
- `GET payments`: estados públicos propios, sin CPE, comprobantes internos, referencias ni hash. `POST payment-reconcile` recibe únicamente attempt_id y verifica pertenencia a la sesión.
- `api.php`: el retorno propio usa `?route=payment-return&result=ok|error&attempt=<attempt_id>` y redirige a Facturas sin interpretar ni conservar la query del proveedor. No confirma ningún pago.
- `js/payment-view.js` y frontend existente: preparación, salida al checkout oficial, lista de intentos y consulta de estado. Facturas y Movimientos se presentan en pestañas internas separadas; el retorno SIRO abre Movimientos. No iframe ni proxy del checkout.

La URL de checkout es el único dato externo necesario que recibe el navegador; se exige exactamente `https://siropagos.bancoroela.com.ar/Home/Pago/<hash válido>`. Ese enlace contiene inevitablemente el identificador SIRO del checkout. Nunca se entrega Hash_Descarga de Phantom, credenciales ni respuestas SIRO crudas.

## Persistencia e intentos únicos

El laboratorio requiere MI_USITTEL_RUNTIME explícito, externo al repositorio y persistente. `siro-attempts.json` almacena attempt_id aleatorio de 128 bits, IDA/IDT, centavos, CPE, comprobante, referencia, hash/result_id necesarios, estado y fechas. No guarda contraseñas ni token SIRO. Este archivo contiene identificadores sensibles: conservarlo bajo los permisos privados de la carpeta y no compartirlo.

Un lock separado serializa procesos. Se reserva y guarda el intento ANTES del POST SIRO; escritura temporal, flush/fsync y reemplazo del archivo evitan truncar el estado anterior. Un fallo de almacenamiento detiene el flujo. No borrar este runtime para “reiniciar”: se perderían reservas e intentos recuperables.

### Recuperación automática del botón Pagar — 05/10/2026

Un enlace creado no demuestra que se haya realizado un pago. `PENDING` y `UNCONFIRMED` con hash oficial válido guardado y `posting_state=NOT_POSTED` publican `can_resume=true`: Facturas conserva el botón normal **Pagar**, que usa `payment-resume` para reabrir exclusivamente el mismo checkout. No se cancela el intento, no se recicla el comprobante ni se llama de nuevo a la creación SIRO. No requiere migración del runtime: la capacidad se calcula al leer los intentos existentes.

Antes de entregar el enlace se fuerza la conciliación SIRO y se vuelve a comprobar la factura exacta, contrato seleccionado, estado IMPAGA, importe y CPE. Un pago CONFIRMED, evidencia de posting o una factura PAGADA impiden reabrir. Una consulta vacía o fallida conserva UNCONFIRMED: no se interpreta como impago, pero puede recuperarse el enlace original. Una creación incierta sin hash no se repite y permanece en consulta de estado. Las respuestas SIRO inconsistentes nunca autorizan confirmar el pago ni imputarlo en Phantom.

La recuperación ante resultado inconcluso depende de la protección de SIRO contra cobrar nuevamente el mismo hash, incluida una operación en procesamiento y pestañas concurrentes. Agustín confirmó esta condición el 05/10/2026; no fue validada con un pago real durante esta tarea ni se presenta como garantía comprobada mediante fixtures. Las reglas locales evitan crear otra intención, pero la exclusión del cobro dentro del checkout corresponde a SIRO.

Si SIRO rechaza un enlace por vencimiento, no se reemplaza automáticamente mientras el pago siga desconocido. Reabrir el mismo enlace no permite inventar su vigencia. Los mensajes de un intento recuperable hablan de enlace disponible, no de pago recibido ni de pago en verificación.

### Enlace cancelado: recuperación y diagnóstico — 05/10/2026

El botón normal **Pagar** usa el mismo endpoint `payment-resume`, que ahora llama a `Payments::open()`. Si la consulta autenticada y su verificación por hash/operación confirman `CANCELLED` o `REJECTED`, con `posting_state=NOT_POSTED`, la acción prepara un nuevo intento mediante `create()` y entrega su nuevo enlace en el mismo paso. No se abre el hash cancelado. Antes de reservar se revalida la factura exacta autorizada, IDA, IMPAGA, importe y CPE; se conservan lock, contador, límite de creación y reserva durable antes del POST. Dos acciones concurrentes comparten el reemplazo activo; un registro confirmado prevalece sobre cualquier otro más reciente. Cargar o actualizar Facturas nunca crea intenciones nuevas.

El cliente ve **El intento anterior fue cancelado** / **Podés volver a intentar el pago desde esta factura.** No se afirma que cambió el saldo ni que exista un pago recibido. No se copia la espera de una hora de la autogestión anterior: no hay evidencia de que esa regla aplique a esta integración.

Una pantalla HTML de SIRO con “Hash Cancelado” NO se usa como confirmación financiera ni se scrapea. Una consulta vacía, fallida o inconsistente sigue `UNCONFIRMED`: no habilita un reemplazo. El motivo técnico se guarda solo en el runtime como `check_reason` y, si queda sin confirmar, se registra un código fijo `SIRO_CHECK_...` sin IDA/IDT, hash, importe, identidad ni respuesta cruda. No se publica ese motivo en la API ni en el formulario.

#### Corrección de precisión de importes — 05/10/2026

Un chequeo productivo de solo lectura devolvió `UNCONFIRMED / CONSULT_PAYMENT_AMOUNT`. La misma consulta, ejecutada con `serialize_precision=-1` solo en ese proceso, devolvió `CANCELLED / VERIFIED`: la representación JSON del float estaba impidiendo reconocer la cancelación. No se modificó el intento productivo ni se creó otro pago durante el diagnóstico.

`paymentCents()` ya no usa `json_encode()` para convertir floats. Construye una representación con dos decimales y exige que al convertirla nuevamente a float reproduzca exactamente el valor original, sin tolerancias. Solo entonces aplica la validación existente y obtiene centavos enteros. Un importe genuino de tres decimales, una diferencia de un centavo, valores no finitos o formatos inválidos siguen rechazados; no se redondea silenciosamente para aprobar pagos. Las reglas de strings, límites, identidad y comparación estricta en centavos se conservan.

La corrección no cambia `php.ini`, `serialize_precision`, configuración privada, endpoints, estados SIRO ni reglas de posting. Los intentos existentes no necesitan migración: se reconcilian normalmente con el conversor corregido. Las pruebas cubren precisiones `53`, `-1`, `14`, `17` y `100`, entrar/cerrar/reabrir el mismo checkout, cancelación verificada con reemplazo único, confirmación e imputación idempotente mediante fixtures. La suite HTTP también se ejecuta con precisión `53`. No es una nueva prueba real de cobro ni de escritura Phantom.

Para conocer el caso productivo sin modificar su intento, hay un inspector CLI read-only que fuerza la conciliación exclusivamente sobre una copia en memoria. Consulta SIRO, pero no crea intenciones, no llama a Phantom y no guarda nada en el runtime. Desde el checkout del repositorio en el hosting (no depende de publicar los inspectores en el Document Root), sustituir el IDA y attempt_id ficticios del ejemplo por los del intento autorizado:

```sh
MI_USITTEL_CONFIG=/home4/usittel/mi-usittel-private/config.php MI_USITTEL_RUNTIME=/home4/usittel/mi-usittel-private/runtime /opt/cpanel/ea-php82/root/usr/bin/php autogestion/server/inspect-siro-attempt.php 123 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

La salida contiene únicamente estado, flags y el código de chequeo: `CONSULT_NO_MATCH`, `CONSULT_SIRO_TIMEOUT`, `CONSULT_PAYMENT_MISMATCH`, `RESULT_SIRO_HTTP`, etc. `VERIFIED` indica que las comprobaciones existentes pasaron. No muestra credenciales, URL/hash, cliente, factura, importe ni payload. El archivo privado se carga internamente sin imprimirlo ni modificarlo. Si la respuesta productiva sigue desconocida, hace falta verificar ese código antes de adaptar campos/formatos: no se inventa un alias o estado para hacer pasar la cancelación. Las pruebas de esta iteración usan fixtures; no diagnostican por sí solas el intento real ni validan un pago real.

El comprobante tiene prefijo aleatorio de quince dígitos y sufijo secuencial de cinco. La unicidad se comprueba también sobre el comprobante completo. El contador por CPE es persistente, no vuelve a cero ni se recicla; agotamiento del rango impide nuevos intentos. `receipt_start` y `receipt_end` deben ser un rango previamente reservado y sin solapamientos con Phantom, Botmaker o la POC para ese CPE. La aplicación NO puede garantizar por sí sola que otros sistemas no usen ese rango.

Dos solicitudes concurrentes obtienen el mismo intento activo y un solo POST. CANCELLED/REJECTED permiten crear otro comprobante; CREATING/PENDING/UNCONFIRMED/CONFIRMED bloquean una creación adicional. Timeout o fallo de autenticación/creación deja un intento incierto: no se reenvía a ciegas. Se conserva para reconciliación. Límite local: cinco creaciones en quince minutos y mil intentos almacenados; consulta de cada intento limitada a una cada cinco segundos.

Producción requiere persistencia transaccional con índices UNIQUE (attempt_id, comprobante y CPE+sufijo), coordinación de secuencias, backups y exclusión de intentos simultáneos por factura. El archivo es para una instancia de laboratorio, no un almacenamiento distribuido.

## Confirmación y recuperación

Consulta filtra por referencia lógica `IDT;importe-con-dos-decimales;` y fechas. Dentro de la respuesta selecciona por comprobante exacto; nunca el último resultado. Exige una coincidencia única y valida referencia, CPE, comprobante, importe, retornos propios y UUID de operación. Si conserva el hash de creación, consulta además el resultado por hash/IdOperacion obtenido del backend y vuelve a validar. Si el proceso murió antes de guardar el hash, la Consulta autenticada permite recuperar por todos los identificadores reservados.

Solo true + PROCESADA confirma. false + CANCELADA/RECHAZADA producen los estados respectivos; false + GENERADA/REGISTRADA queda pendiente. Inconsistencia, ausencia, duplicados, formatos extraños o errores quedan sin confirmar. Un estado confirmado no se degrada por consultas posteriores.

Al volver a entrar se recuperan los intentos desde disco y se reconcilia automáticamente el más reciente no terminal. Facturas ofrece Pagar para los enlaces recuperables y Consultar estado cuando no hay enlace seguro guardado. Esto no depende del retorno y funciona después de cerrar el navegador o renovar sesión. No hay cron. GENERADA puede durar indefinidamente; no se infiere cancelación por tiempo ni se crea otro intento automáticamente. Un intento incierto sin hash sigue requiriendo conciliación; un intento incierto con hash puede reabrir exclusivamente su enlace original según la regla anterior.

## Límites de esta etapa

- Solo el contrato de laboratorio configurado, con un único servicio y factura controlada IMPAGA. Se usa Total estricto de Phantom (positivo, hasta nueve enteros y dos decimales), no saldo pendiente calculado. No está resuelto el pago parcial: no probar una factura parcialmente abonada.
- No SIRO real automático en tests/build/chequeos. Fixtures de transporte, servicio, HTTP y navegador; la prueba real manual quedó validada únicamente en laboratorio.
- No promesas, cambios de servicio, Wi-Fi, perfil, Apache, DNS, web pública o producción. `Imputar_Pago` queda limitado por configuración a un único laboratorio; la primera llamada ya se ejecutó una vez y permanece pendiente de conciliación, sin reintento automático.
- La sesión puede vencer durante el checkout: ingresar nuevamente recupera intentos del mismo cliente.
- Antes de producción: certificados/CA del hosting, retornos HTTPS públicos, credenciales Phantom GET en logs remotos, permisos/backup, coordinación de comprobantes, seguridad y despliegue. Revisar también si SIRO/Phantom tienen procesos externos de imputación propios: este módulo no los controla.

Siguiente paso: [configuración y primera prueba](FIRST-SIRO-TEST.md).
