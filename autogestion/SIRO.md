# SIRO de laboratorio: intención y confirmación

## Alcance y evidencia

Lectura Phantom IDA 1 aceptada por Agustín en f47bb26: login, sesión, perfil, saldo, 11 facturas, detalle, PDF reciente/histórico y logout. Esta etapa conserva ese recorrido. SIRO está implementado con fixtures y deshabilitado por defecto; todavía no fue probado con credenciales reales desde este módulo.

Contrato contrastado con la investigación local `Mi_USITTEL_SIRO_Estado_Tecnico_POC_2026-09-14.pdf` y el [manual oficial API SIRO Pagos 1.4](https://www.bancoroela.com.ar/uploads/SIRO%20Developers%20-%20API%20SIRO%20PAGOS%20-%20Versi%C3%B3n%201.4%20-%2003.25.pdf). El manual permite comprobantes numéricos de veinte posiciones y exige diferenciar sus cinco posiciones finales para un mismo cliente empresa; contempla un contador secuencial. Los ejemplos de resultados contienen Request, IdOperacion, Estado y PagoExitoso. La compatibilidad exacta de esta instalación se comprobará manualmente, sin exponer respuestas crudas.

## Tres hitos independientes

| Hito | Evidencia | Alcance actual |
| --- | --- | --- |
| SIRO intent created | SIRO devuelve Hash y URL oficial válida | Implementado |
| SIRO payment confirmed | Consulta autenticada, identidad e importe coincidentes, PagoExitoso booleano true Y Estado PROCESADA | Implementado |
| Phantom payment posted | Imputación confirmada en Phantom | NO implementado; siempre false |

No se modifica el estado de la factura ni se descuenta el saldo mostrado. “Pago confirmado” está dentro de “Pagos SIRO” y explica que no se registrará automáticamente en Phantom. Un intento confirmado bloquea otro cobro propio de esa factura aunque Phantom siga devolviendo IMPAGA.

## Recorrido y archivos

- `server/Siro.php`: transporte backend con endpoints fijos, TLS/hostname y CA privada, JSON estricto, límites de tamaño y tiempo, sin redirects. Token SIRO solo en memoria durante la solicitud. Autenticación Usuario/Password; bearer en las consultas. No logs de URLs completas, tokens ni cuerpos.
- `server/Payments.php`: importe en centavos, identidad del intento, comprobante único, persistencia y reconciliación separada de creación.
- `server/Api.php`: sesión propia, IDA de sesión exclusivamente, CSRF para POST y listas explícitas de campos. `payment-create` recibe únicamente `{idt: "..."}`. El IDT debe estar en el historial autorizado; vuelve a consultarse su posición en Phantom y debe coincidir, pertenecer al cliente y tener Estado IMPAGA. No hay datos demo ni importe del navegador.
- `GET payments`: estados públicos propios, sin CPE, comprobantes internos, referencias ni hash. `POST payment-reconcile` recibe únicamente attempt_id y verifica pertenencia a la sesión.
- `server/router.php`: las rutas propias `/autogestion/pago-ok/<attempt_id>` y `/pago-error/<attempt_id>` redirigen a Facturas sin interpretar ni conservar la query del retorno. Ninguna de ellas confirma un pago.
- `js/payment-view.js` y frontend existente: preparación, salida al checkout oficial, lista de intentos y consulta de estado. No iframe ni proxy del checkout.

La URL de checkout es el único dato externo necesario que recibe el navegador; se exige exactamente `https://siropagos.bancoroela.com.ar/Home/Pago/<hash válido>`. Ese enlace contiene inevitablemente el identificador SIRO del checkout. Nunca se entrega Hash_Descarga de Phantom, credenciales ni respuestas SIRO crudas.

## Persistencia e intentos únicos

El laboratorio requiere MI_USITTEL_RUNTIME explícito, externo al repositorio y persistente. `siro-attempts.json` almacena attempt_id aleatorio de 128 bits, IDA/IDT, centavos, CPE, comprobante, referencia, hash/result_id necesarios, estado y fechas. No guarda contraseñas ni token SIRO. Este archivo contiene identificadores sensibles: conservarlo bajo los permisos privados de la carpeta y no compartirlo.

Un lock separado serializa procesos. Se reserva y guarda el intento ANTES del POST SIRO; escritura temporal, flush/fsync y reemplazo del archivo evitan truncar el estado anterior. Un fallo de almacenamiento detiene el flujo. No borrar este runtime para “reiniciar”: se perderían reservas e intentos recuperables.

El comprobante tiene prefijo aleatorio de quince dígitos y sufijo secuencial de cinco. La unicidad se comprueba también sobre el comprobante completo. El contador por CPE es persistente, no vuelve a cero ni se recicla; agotamiento del rango impide nuevos intentos. `receipt_start` y `receipt_end` deben ser un rango previamente reservado y sin solapamientos con Phantom, Botmaker o la POC para ese CPE. La aplicación NO puede garantizar por sí sola que otros sistemas no usen ese rango.

Dos solicitudes concurrentes obtienen el mismo intento activo y un solo POST. CANCELLED/REJECTED permiten crear otro comprobante; CREATING/PENDING/UNCONFIRMED/CONFIRMED bloquean una creación adicional. Timeout o fallo de autenticación/creación deja un intento incierto: no se reenvía a ciegas. Se conserva para reconciliación. Límite local: cinco creaciones en quince minutos y mil intentos almacenados; consulta de cada intento limitada a una cada cinco segundos.

Producción requiere persistencia transaccional con índices UNIQUE (attempt_id, comprobante y CPE+sufijo), coordinación de secuencias, backups y exclusión de intentos simultáneos por factura. El archivo es para una instancia de laboratorio, no un almacenamiento distribuido.

## Confirmación y recuperación

Consulta filtra por referencia lógica `IDT;importe-con-dos-decimales;` y fechas. Dentro de la respuesta selecciona por comprobante exacto; nunca el último resultado. Exige una coincidencia única y valida referencia, CPE, comprobante, importe, retornos propios y UUID de operación. Si conserva el hash de creación, consulta además el resultado por hash/IdOperacion obtenido del backend y vuelve a validar. Si el proceso murió antes de guardar el hash, la Consulta autenticada permite recuperar por todos los identificadores reservados.

Solo true + PROCESADA confirma. false + CANCELADA/RECHAZADA producen los estados respectivos; false + GENERADA/REGISTRADA queda pendiente. Inconsistencia, ausencia, duplicados, formatos extraños o errores quedan sin confirmar. Un estado confirmado no se degrada por consultas posteriores.

Al volver a entrar se recuperan los intentos desde disco y se reconcilia automáticamente el más reciente no terminal. Los demás ofrecen Consultar estado. Esto no depende del retorno y funciona después de cerrar el navegador o renovar sesión. No hay cron. GENERADA puede durar indefinidamente; no se infiere cancelación por tiempo ni se habilita otro cobro automáticamente. Resolver un intento incierto sin resultado requerirá revisión posterior.

## Límites de esta etapa

- Solo IDA 1 y factura controlada IMPAGA. Se usa Total estricto de Phantom (positivo, hasta nueve enteros y dos decimales), no saldo pendiente calculado. No está resuelto el pago parcial: no probar una factura parcialmente abonada.
- No SIRO real automático en tests/build/chequeos. Fixtures de transporte, servicio, HTTP y navegador; prueba real pendiente.
- No Imputar_Pago, promesas, cambios de servicio, Wi-Fi, perfil, Apache, DNS, web pública o producción.
- La sesión puede vencer durante el checkout: ingresar nuevamente recupera intentos del mismo cliente.
- Antes de producción: certificados/CA del hosting, retornos HTTPS públicos, credenciales Phantom GET en logs remotos, permisos/backup, coordinación de comprobantes, seguridad y despliegue. Revisar también si SIRO/Phantom tienen procesos externos de imputación propios: este módulo no los controla.

Siguiente paso: [configuración y primera prueba](FIRST-SIRO-TEST.md).
