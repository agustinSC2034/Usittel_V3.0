# Primera prueba SIRO — un único servicio

La conexión real SIRO de laboratorio quedó validada el 19/09/2026 con una cuenta controlada de un solo servicio. Se creó y canceló un primer intento; la consulta posterior devolvió CANCELADA. Un segundo intento nuevo sobre la misma factura fue procesado y la reconciliación devolvió PagoExitoso=true con Estado=PROCESADA. Esa etapa terminó sin escribir en Phantom. Más tarde, luego del preflight y una autorización separada, se realizó una única imputación controlada; permanece `POST_UNCONFIRMED` y no se reintentó.

## Resultado de la prueba

La prueba confirmó creación de intención, redirección al dominio oficial, cancelación, reintento con comprobante nuevo, pago real y reconciliación backend. SIRO demoró unos segundos en publicar la cancelación; una consulta posterior recuperó el estado terminal correcto. El retorno del navegador no se usó como prueba de pago.

IDA 1 tiene dos servicios autorizados y SIRO sigue bloqueado para esa sesión. La habilitación privada continúa limitada a la cuenta de laboratorio acordada. No borrar asociaciones ni cambiar documentos para sortearlo.

## Configuración utilizada en laboratorio

Abrí el archivo que ya funciona, sin reemplazarlo:

```powershell
notepad "$env:LOCALAPPDATA\MiUSITTEL\config.php"
```

Dentro del array principal agregá el bloque `siro` de `server/config.example.php`. No copies el archivo completo encima del tuyo. Conservá Phantom, usuario de laboratorio y ca_file.

- `enabled`: true solo cuando estén completos los demás campos.
- `lab_ida`: contrato acordado de laboratorio. No autoriza el login por sí solo; se conservan las reglas de sesión y descubrimiento de servicios. SIRO exige un único servicio autorizado y que coincida con lab_ida. Por defecto vale 1.
- `user` y `password`: credenciales API SIRO, escritas personalmente en el archivo privado. No son las credenciales del abonado de Phantom.
- `return_base`: `http://127.0.0.1:4174/autogestion` para esta prueba local. Abrí el portal con ese mismo origen y puerto.
- `receipt_start` y `receipt_end`: números enteros entre 0 y 99999 que delimiten un rango reservado para Mi USITTEL y el cliente empresa del laboratorio. No elegirlo al azar: las últimas cinco posiciones no deben coincidir con comprobantes de Phantom/Botmaker/POC para ese cliente. Si no podés confirmar un rango libre, dejá enabled=false e informá únicamente esa dificultad.
- Conservá MI_USITTEL_RUNTIME apuntando a la carpeta privada persistente. No borrar el archivo de intentos ni cambiar a una carpeta vacía para reintentar.

Con las variables de entorno ya cargadas y desde la carpeta del proyecto ejecutá:

```powershell
npm run check:mi-usittel
```

Este chequeo NO contacta SIRO ni Phantom y no valida que las credenciales sean aceptadas. Compartí únicamente su salida de comprobaciones, nunca el archivo privado. Esperar revisión antes de la prueba siguiente.

## Procedimiento conservado para regresiones manuales

Después del chequeo local, acordar una factura IMPAGA controlada del contrato de laboratorio, sin pagos parciales. Agustín abre el portal local, inicia sesión personalmente, carga esa factura y pulsa Pagar una vez. La aplicación reconsulta a Phantom y recién entonces crea la intención. Agustín hace el checkout en el portal oficial; nadie ejecuta pagos automáticos.

**La primera prueba será crear y cancelar; no pagar.** Revisar el estado consultado desde SIRO y solo después autorizar otra prueba. URL_ERROR no demuestra cancelación. La consulta usa el margen de un minuto de la POC: si el resultado todavía no aparece, esperar y usar Consultar estado. No ejecutar varias variantes a la vez. Un intento pendiente o sin confirmar se consulta; no se borra para generar otro.

La prueba de confirmación debe mostrar “SIRO confirmó el pago” y aclarar que todavía no se registra automáticamente en Phantom. El saldo de Phantom no se modifica artificialmente. Luego se podrá validar recuperación tras cerrar el navegador; el retorno OK no es prueba de éxito.

## Autenticación CRM, preflight e imputación controlada

Agustín ejecutó manualmente la autenticación segura contra el endpoint CRM:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-phantom-crm.php
```

El resultado real fue `CRM_AUTH_OK` y `Sin escritura en Phantom.`. Quedaron confirmados endpoint, credenciales técnicas, token CRM y TLS/CA/hostname. No se ejecutó `Imputar_Pago`.

El preflight de solo lectura se ejecutó con:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-payment-posting-preflight.php
```

No recibe attempt_id, IDT, importe, referencia ni token. El resultado real fue `READY_FOR_CONTROLLED_POST`: SIRO confirmado, factura impaga en REST y CRM, IDA/IDT/importe coincidentes y ausencia de posting previo.

Después de la autorización explícita se habilitó la compuerta privada y se pulsó una sola vez **Actualizar cuenta**. La llamada real quedó `POST_UNCONFIRMED`: las lecturas inmediatas de factura y CRM todavía no demostraron el cierre, así que Mi USITTEL no reintentó. El saldo posterior pasó de $121 a $0, pero esa señal aislada no alcanza para declarar `POSTED`. **Consultar actualización** vuelve a leer el estado sin reenviar `Imputar_Pago`.

Compartir solo el estado visible y, si aparece, el código seguro del error. No compartir passwords, tokens, hashes, enlaces completos de checkout/retorno, datos bancarios, JSON crudo ni archivos del runtime. El usuario completa personalmente cualquier dato de pago.
