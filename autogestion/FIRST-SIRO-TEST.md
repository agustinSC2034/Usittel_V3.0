# Primera prueba SIRO — IDA 1

El código está probado con simulaciones. La primera conexión real SIRO de este módulo está pendiente. No hay imputación en Phantom.

## Paso actual: completar configuración privada

Abrí el archivo que ya funciona, sin reemplazarlo:

```powershell
notepad "$env:LOCALAPPDATA\MiUSITTEL\config.php"
```

Dentro del array principal agregá el bloque `siro` de `server/config.example.php`. No copies el archivo completo encima del tuyo. Conservá Phantom, usuario de laboratorio y ca_file.

- `enabled`: true solo cuando estén completos los demás campos.
- `user` y `password`: credenciales API SIRO, escritas personalmente en el archivo privado. No son las credenciales del abonado de Phantom.
- `return_base`: `http://127.0.0.1:4174/autogestion` para esta prueba local. Abrí el portal con ese mismo origen y puerto.
- `receipt_start` y `receipt_end`: números enteros entre 0 y 99999 que delimiten un rango reservado para Mi USITTEL y el cliente empresa del laboratorio. No elegirlo al azar: las últimas cinco posiciones no deben coincidir con comprobantes de Phantom/Botmaker/POC para ese cliente. Si no podés confirmar un rango libre, dejá enabled=false e informá únicamente esa dificultad.
- Conservá MI_USITTEL_RUNTIME apuntando a la carpeta privada persistente. No borrar el archivo de intentos ni cambiar a una carpeta vacía para reintentar.

Con las variables de entorno ya cargadas y desde la carpeta del proyecto ejecutá:

```powershell
npm run check:mi-usittel
```

Este chequeo NO contacta SIRO ni Phantom y no valida que las credenciales sean aceptadas. Compartí únicamente su salida de comprobaciones, nunca el archivo privado. Este es el único paso solicitado ahora; esperar revisión antes de la prueba siguiente.

## Prueba posterior, de a una

Después del chequeo local, acordar una factura IMPAGA controlada de IDA 1, sin pagos parciales. Agustín abre el portal local, inicia sesión personalmente, carga esa factura y pulsa Pagar una vez. La aplicación reconsulta a Phantom y recién entonces crea la intención. Agustín hace el checkout en el portal oficial; nadie ejecuta pagos automáticos.

Primero se puede comprobar una cancelación, revisar el estado consultado desde SIRO y solo después autorizar otra prueba. No ejecutar varias variantes a la vez. Un intento pendiente o sin confirmar se consulta; no se borra para generar otro.

La prueba de confirmación debe mostrar “SIRO confirmó el pago” y aclarar que todavía no se registra automáticamente en Phantom. El saldo de Phantom no se modifica artificialmente. Luego se podrá validar recuperación tras cerrar el navegador; el retorno OK no es prueba de éxito.

Compartir solo el estado visible y, si aparece, el código seguro del error. No compartir passwords, tokens, hashes, enlaces completos de checkout/retorno, datos bancarios, JSON crudo ni archivos del runtime. El usuario completa personalmente cualquier dato de pago.
