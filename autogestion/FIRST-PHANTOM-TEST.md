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

### Siguiente lectura controlada: solamente cliente IDA 1

El usuario confirmó `TOKEN_RECIBIDO` en la prueba GET por HTTPS. Para verificar ahora la consulta de cliente, ejecutar una vez en la PC de desarrollo:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-customer.php 1
```

Usa el archivo privado existente y exige modo phantom e IDA 1 permitido. Autentica por GET (mantiene el riesgo de logs remotos aceptado), conserva el token solamente en memoria y hace una consulta `Consulta_Cliente_Avanzada` por POST JSON con el token en el cuerpo. El formato de esta lectura todavía debe comprobarse en la instalación real. No prueba otros formatos automáticamente ni coloca el token en la URL; tampoco renueva/reintenta ante 401. Máximo dos solicitudes: autenticación y cliente.

No consulta estado de cuenta ni facturas, no crea caché/sesiones ni cambia el Login o Dashboard. Éxito: solo sección `customer`, con claves/tipos y el filtro estructural compartido; preserva el envoltorio recibido sin inventar mapeos. Error: bloque técnico que distingue `autenticacion` de `cliente`. Compartir únicamente esa salida segura, nunca la respuesta cruda.

Si devuelve `PHANTOM_FORMAT` con HTTP 200 en cliente, agrega `Formato:` con una categoría cerrada: respuesta vacía, apariencia HTML, texto/JSON inválido, prefijo BOM residual, UTF-8 inválido, exceso de profundidad o JSON de tipo string/boolean/null/número. También distingue JSON de objeto/lista dentro de un string. No muestra fragmentos del contenido ni acepta envoltorios nuevos automáticamente. HTTP 200 por sí solo no confirma datos del cliente.

Tras confirmar `PREFIJO_BOM_UTF8` en la respuesta real, el lector admite exclusivamente un BOM UTF-8 (tres bytes) en la posición inicial. Después aplica la misma validación JSON, de estructura y de errores funcionales. No elimina HTML, avisos PHP ni BOM repetidos/intermedios. Volver a ejecutar el mismo comando una vez: si el resto es JSON válido mostrará el esquema; de lo contrario, compartir el nuevo bloque técnico completo, incluida `Formato:`.

### Lectura de la salida estructural

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
