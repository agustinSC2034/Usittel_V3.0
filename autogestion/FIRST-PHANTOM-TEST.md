# Primera prueba real con Phantom

Esta prueba es únicamente para laboratorio, en modo lectura y con **IDA 1**. No habilita pagos, escrituras ni producción. Las credenciales técnicas se escriben personalmente en un archivo privado y nunca se pegan en el chat.

## Paso 1 — Crear y editar la configuración privada

Abrir PowerShell en la raíz del proyecto y ejecutar:

```powershell
$privateFolder = Join-Path $env:LOCALAPPDATA 'MiUSITTEL'
New-Item -ItemType Directory -Force -Path $privateFolder | Out-Null
$privateConfig = Join-Path $privateFolder 'config.php'
$privateRuntime = Join-Path $privateFolder 'runtime'
New-Item -ItemType Directory -Force -Path $privateRuntime | Out-Null

if (-not (Test-Path -LiteralPath $privateConfig)) {
  Copy-Item -LiteralPath autogestion/server/config.example.php -Destination $privateConfig
}
notepad $privateConfig
```

En el archivo abierto, completar personalmente `api_user` y `api_pass`. No cambiar ni compartir otras credenciales. Guardar y cerrar Notepad.

## Paso 2 — Limitar la prueba a IDA 1

En el mismo archivo comprobar exactamente:

```php
'mode' => 'phantom',
'allowed_idas' => [1],
```

Mantener `profile_fields` en null y `balance_path` en null. Todavía no mapear datos por intuición. Si el usuario de laboratorio no es numérico, agregar solamente su relación usuario→IDA en `lab_users`; nunca su contraseña.

En la misma ventana de PowerShell configurar el entorno:

```powershell
$env:MI_USITTEL_CONFIG = $privateConfig
$env:MI_USITTEL_RUNTIME = $privateRuntime
# Solo si PHP no está disponible en PATH:
$env:MI_USITTEL_PHP = 'C:\ruta\a\php.exe'
```

Estas variables duran mientras esa ventana permanezca abierta. Al abrir otra terminal hay que definirlas de nuevo.

## Paso 3 — Ejecutar el chequeo local

```powershell
npm run check:mi-usittel
```

Debe terminar sin ❌. Las credenciales se informan únicamente como “presentes”; sus valores nunca se imprimen. Este chequeo **no llama a Phantom**.

## Paso 4 — Inspeccionar el esquema de IDA 1

Este es el primer comando que sí hará lecturas reales de Phantom:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-schema.php 1
```

Si PHP está en PATH y no se definió MI_USITTEL_PHP:

```powershell
php autogestion/server/inspect-schema.php 1
```

El comando autentica técnicamente y consulta cliente, estado de cuenta y una factura. Muestra solamente nombres de campos, tipos y estructura limitada. No modifica nada.

### Prueba puntual si la autenticación POST JSON devuelve HTTP 400

La captura de Botmaker confirma una petición GET con credenciales en la URL sobre HTTP. Mi USITTEL usa HTTPS y credenciales en el cuerpo. Esa diferencia puede influir, pero no demuestra por sí sola la causa del 400.

Para probar **una vez** si esta instalación acepta las credenciales como formulario POST:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-schema.php 1 --auth-form
```

No editar la configuración ni cambiar la URL para esta prueba. La opción afecta solamente la autenticación de esa ejecución del inspector; mantiene HTTPS y validación de certificados, sin credenciales en la URL ni redirecciones. No reintenta automáticamente ni cambia el formato del portal. Si autentica, continúa con las tres consultas de lectura en JSON y la misma salida sin valores.

El soporte de formulario todavía no está confirmado. Si vuelve a fallar, compartir solamente el bloque técnico indicado en el paso 5. No repetir intentos cambiando contraseñas al azar: necesitaremos confirmar el contrato de esta instalación. Un error en `cliente` después de esta prueba permite distinguirlo de un rechazo en `autenticacion`.

## Paso 5 — Qué copiar para analizar después

### Excepción autorizada: prueba GET de autenticación únicamente

Tras recibir HTTP 400 tanto en POST JSON como en formulario, el usuario autorizó una prueba GET con credenciales en la URL, aceptando que podrían quedar en logs del servidor/intermediarios aunque se use HTTPS. Esta autorización puntual no cambia el transporte del portal.

En la PC de desarrollo, con las variables privadas ya configuradas, ejecutar **una sola vez**:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-auth-get.php
```

No lleva IDA: no consulta clientes. Lee la configuración privada existente, conserva el dominio HTTPS, la validación TLS y `JSON=1`; envía únicamente `action=autentificar`, `api_user` y `api_pass`. No sigue redirecciones ni reintenta; no guarda el token ni crea archivos de runtime. No cambia Apache, certificados ni configuración privada. No usar navegador, pegar URLs con credenciales ni activar trazas de cURL.

La salida esperada es `Etapa: autenticacion`, `Código: TOKEN_RECIBIDO` y una aclaración de que el token está oculto. Esto confirma un campo `token` no vacío en una respuesta JSON sin error reconocido; todavía no comprueba su validez para consultar clientes. Una respuesta diferente falla de forma cerrada. Si falla, compartir solo el diagnóstico seguro. El código suprime salida accidental de configuración y errores crudos locales, pero no puede impedir el logging en el servidor remoto.

### Salida del inspector de esquemas

Copiar solamente la salida estructural completa producida por `inspect-schema.php`, desde la llave inicial hasta la final. Esa salida debería tener secciones `customer`, `account` e `invoice` con nombres de campos y tipos.

Antes de compartirla, comprobar visualmente que no aparezcan datos personales o valores. Si aparece algo que no parece una descripción de tipo (`string`, `int`, `float`, `null`, `array`, `object`, `unknown` o `truncated`), detenerse y no compartirlo.

Si el comando falla, copiar únicamente el bloque técnico que comienza con `Etapa:` y `Código:`. Puede incluir `HTTP:` con el estado numérico recibido (por ejemplo, 301, 404 o 500); no incluye cuerpos, cabeceras ni destinos de redirección. Si es una excepción inesperada también puede incluir `Excepción`, `Archivo`, `Línea` y, solo cuando pasó el filtro seguro, `Mensaje`. No copiar logs del servidor ni archivos de runtime.

## Paso 6 — Qué no compartir

- `api_user`, `api_pass` ni contraseñas de abonados.
- Token técnico o cookies.
- JSON crudo devuelto por Phantom.
- Datos personales: nombre, domicilio, DNI/CUIT/CUIL, teléfono, correo, tarjeta, CBU u otros identificadores.
- Hashes, enlaces de descarga/pago, facturas o documentos.
- El archivo privado `config.php` ni archivos de la carpeta runtime.

Después de revisar juntos la salida segura, recién se podrán configurar rutas confirmadas de perfil y balance. Iniciar la interfaz con `npm run dev:mi-usittel:php` será una prueba posterior; no hace falta para descubrir el esquema.
