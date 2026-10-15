# Renovación TLS de Phantom y continuidad de Mi USITTEL

Procedimiento operativo documentado el 15/10/2026. Aplica a la conexión HTTPS
entre el PHP de Nuthost y `phantom.usittel.com.ar:443`.

## Qué hacer en la próxima renovación

1. Antes de renovar, registrar el certificado servido, su emisor y el resultado
   de la prueba PHP indicada abajo. Respaldar el bundle privado de Nuthost.
2. Coordinar la instalación con los administradores de Phantom. Deben comprobar
   que Apache entregue el certificado nuevo junto con los intermedios necesarios.
3. Después de instalarlo, repetir la inspección del certificado realmente servido
   y la prueba PHP desde Nuthost. No alcanza con abrir Phantom en un navegador.
4. Si TLS valida con el bundle vigente, no modificarlo. Si falta un intermedio,
   seguir el procedimiento de actualización controlada de este documento.
5. Confirmar autenticación técnica, una consulta de solo lectura y el ingreso a
   Mi USITTEL. Registrar el resultado antes de dar por cerrada la renovación.

No es necesario renovar otra vez para intentar obtener un emisor distinto.
Los intermedios pueden cambiar entre emisiones; no dar por supuesto que el
próximo será YR1 o YR2. Este procedimiento no instala tareas automáticas ni modifica
Phantom. Cualquier intervención en ese servidor corresponde a sus administradores.

## Incidente resuelto el 15/10/2026

La web y PHP de Mi USITTEL respondían, pero las consultas a Phantom fallaban con
`PHANTOM_TLS_ISSUER`. El problema observado fue la construcción de la cadena TLS.

| Evidencia | Resultado comprobado |
| --- | --- |
| Certificado servido por Phantom | CN/SAN `phantom.usittel.com.ar`, emisor Let's Encrypt YR1 |
| Inicio de validez | 14/10/2026 16:20:22 UTC, equivalente a 13:20:22 de Argentina |
| Vencimiento del certificado | 12/01/2027 16:20:21 UTC; volver a comprobar en cada renovación |
| Cadena enviada por Apache | Un certificado: el del dominio; no enviaba los intermedios |
| Bundle privado anterior | Existía, era legible y contenía YR2 y Root YR firmado por ISRG Root X1, además de las raíces Mozilla |
| Intermedio ausente del bundle | YR1 |
| Prueba PHP con el bundle anterior | cURL 60, resultado de verificación 20 |
| Prueba con YR1 agregado solo en memoria | cURL 0, verificación 0, HTTP 302 del acceso de Phantom |
| Solución aplicada | Se agregó únicamente YR1, conservando todo el bundle anterior |
| Verificación posterior | TLS correcto, autenticación con el transporte desplegado y lectura de laboratorio correctas; el usuario confirmó el ingreso al portal |

El registro público de emisión de septiembre muestra un precertificado del
18/09/2026 firmado por YR2. Su firma coincide con el YR2 del bundle privado.
Esto respalda que el bundle suplía el intermedio anterior, pero no es una captura
histórica de lo que Apache servía cada día. La insuficiencia del bundle frente
al certificado YR1 actual sí se reprodujo y se aisló mediante las pruebas anteriores.
El inicio de validez tampoco demuestra por sí solo la hora de instalación.

Referencia pública de septiembre: <https://crt.sh/?id=29595633135>.

## Rutas y comportamiento comprobados

| Elemento | Valor verificado el 15/10/2026 |
| --- | --- |
| Configuración privada | `/home4/usittel/mi-usittel-private/config.php` |
| `ca_file` efectivo | `/home4/usittel/mi-usittel-private/cacert.pem` |
| Entrada PHP del portal | `/home4/usittel/public_html/autogestion/api.php` |
| PHP utilizado para la prueba | `/opt/cpanel/ea-php82/root/usr/bin/php` |
| Registro de errores | `/home4/usittel/public_html/autogestion/error_log` |
| Respaldo previo a agregar YR1 | `/home4/usittel/mi-usittel-private/cacert.pem.before-YR1-20261015-173047.bak` |

El timestamp del nombre del respaldo está en UTC: 15/10/2026 17:30:47 UTC,
equivalente a 14:30:47 de Argentina. El bundle actualizado conservó permisos
`0644` y pasó de 123 a 124 certificados. Incluye YR1, YR2 y la cadena hacia X1;
estos conteos describen aquel cambio y no son una condición para futuros bundles.

`api.php` define la ruta privada mediante `MI_USITTEL_CONFIG`. `Core.php` carga
la configuración y `CurlTransport`, en `server/Phantom.php`, aplica `ca_file`
mediante `CURLOPT_CAINFO`. Peer y hostname permanecen verificados. Que
`curl.cainfo` u `openssl.cafile` estén vacíos en CLI no significa que la aplicación
ignore su `ca_file` explícito.

Confirmar estas rutas y la versión PHP al ejecutar el procedimiento. La
configuración privada, los respaldos y el runtime permanecen fuera de Git y del
directorio público. Un push o despliegue del repositorio no actualiza este bundle.

## Inspección de solo lectura desde la terminal de cPanel

La siguiente consulta muestra el certificado y la cadena que el servidor entrega,
y verifica con el bundle privado. No envía credenciales ni acciones de aplicación:

```bash
openssl s_client \
  -connect phantom.usittel.com.ar:443 \
  -servername phantom.usittel.com.ar \
  -showcerts \
  -verify_hostname phantom.usittel.com.ar \
  -verify_return_error \
  -CAfile /home4/usittel/mi-usittel-private/cacert.pem < /dev/null
```

Registrar CN/SAN, emisor, fechas, huella SHA-256 y cantidad de certificados
entregados. Distinguir la cadena enviada por el servidor de la que el cliente
puede completar usando su bundle: una verificación exitosa con el bundle ampliado
no demuestra que Apache haya corregido la cadena enviada.

La prueba PHP siguiente lee solamente la ruta CA de la configuración privada,
realiza HEAD al acceso público de Phantom y descarta su contenido. No imprime
configuración completa, cookies, credenciales ni tokens:

```bash
/opt/cpanel/ea-php82/root/usr/bin/php <<'PHP'
<?php
ini_set('display_errors', '0');
ini_set('zend.exception_ignore_args', '1');
try {
    $config = require '/home4/usittel/mi-usittel-private/config.php';
    $ca = $config['ca_file'] ?? null;
    if (!is_string($ca) || !is_file($ca) || !is_readable($ca)) {
        echo "CA_FILE_NOT_READABLE\n";
        exit(1);
    }
    $handle = curl_init('https://phantom.usittel.com.ar/');
    curl_setopt_array($handle, [
        CURLOPT_NOBODY => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_CAINFO => $ca,
    ]);
    $ok = curl_exec($handle);
    $errno = curl_errno($handle);
    $verify = curl_getinfo($handle, CURLINFO_SSL_VERIFYRESULT);
    $http = curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    echo json_encode([
        'ca_exists' => true,
        'ca_readable' => true,
        'curl_errno' => $errno,
        'ssl_verify_result' => $verify,
        'http_status' => $http,
    ], JSON_UNESCAPED_SLASHES), PHP_EOL;
    exit($ok !== false && $errno === 0 && $verify === 0 ? 0 : 1);
} catch (Throwable $error) {
    echo "TLS_CHECK_FAILED\n";
    exit(1);
}
PHP
```

La comprobación PHP anterior se ejecutó desde Nuthost el 15/10/2026 y devolvió
`ca_exists=true`, `ca_readable=true`, `curl_errno=0`, `ssl_verify_result=0` y
`http_status=302`, sin modificar archivos ni realizar acciones de aplicación.

Resultado TLS correcto: `curl_errno=0` y `ssl_verify_result=0`. El 15/10 el acceso
público devolvía HTTP 302. Comparar el HTTP con la línea de base vigente: TLS correcto
no garantiza que la API o el login funcionen, y un 5xx exige investigar la aplicación.

## Decidir si hay que actualizar el bundle

| Resultado | Acción |
| --- | --- |
| Certificado nuevo y TLS correcto con el bundle vigente | Mantener el bundle y completar las pruebas funcionales |
| cURL 60 / `PHANTOM_TLS_ISSUER` y falta un intermedio | Identificar el intermedio exacto y validar un bundle candidato |
| Certificado vencido, futuro o con hostname incorrecto | Solicitar corrección del certificado servido; agregar una CA no resuelve este caso |
| Bundle ausente, ilegible o ruta incorrecta | Corregir el problema de archivo o configuración detectado |
| TLS correcto, pero error 401/403, HTTP, formato o timeout | Investigar ese error; no atribuirlo automáticamente al certificado |

Para el certificado del incidente, la cadena completa es:
`phantom.usittel.com.ar -> YR1 -> Root YR (firmado por X1) -> ISRG Root X1`.
El emisor, su clave y las firmas deben coincidir; no basta con que dos certificados
se llamen de forma parecida. No agregar el certificado del dominio como CA.

## Actualización controlada del lado de Nuthost

Aplicar únicamente si la inspección demuestra que hace falta y existe autorización
para el cambio de producción. No modificar credenciales, Wi-Fi, pagos, DNS,
handlers PHP, `.htaccess` ni otros valores de la configuración por este motivo.

1. Guardar una copia del bundle vigente fuera de `public_html`, con nombre que
   incluya fecha/hora y huella SHA-256. Comprobar que el respaldo coincide byte a
   byte y que no se sobrescribe una copia anterior.
2. Obtener el intermedio exacto desde la página oficial de cadenas de Let's Encrypt,
   mediante HTTPS validado. La página oficial permite verificar emisor, vigencia,
   huella y cadena. No confiar en certificados adjuntos o descargas sin verificar.
3. Verificar que el intermedio tenga firma y cadena válidas hacia una raíz ya
   confiable. Si cambió la raíz, detener este procedimiento de simple adición y
   evaluar la cadena y el almacén de confianza de forma específica.
4. Preparar un candidato conservando el bundle actual y agregando solo los
   intermedios verificados que falten. Preservar YR1/YR2 y las raíces válidas mientras
   sean necesarias; no reemplazar todo por un bundle Mozilla que pierda los
   intermedios añadidos. Revisar expiración o revocación antes de reutilizarlos.
5. Probar primero el candidato sin alterar el archivo activo: usar `-CAfile` con
   el candidato y el mismo comando OpenSSL; luego ejecutar la prueba PHP indicando
   el candidato solo en la variable `$ca` de ese proceso. El 15/10 también se probó
   el candidato en memoria mediante `CURLOPT_CAINFO_BLOB`.
6. Si las pruebas pasan, conservar permisos y propiedad del archivo vigente,
   comprobar que no haya sido modificado por otro operador y sustituirlo mediante
   un archivo temporal en el mismo directorio y un renombrado atómico. No dejar
   un archivo vacío o parcialmente escrito durante la sustitución.
7. Repetir la prueba PHP leyendo el `ca_file` efectivo de producción. Comprobar
   que la configuración sigue apuntando al mismo archivo y que el resto de sus
   valores no cambió. Este ajuste de bundle no requiere renovar el certificado ni
   reiniciar Phantom; no reiniciar servicios como parte de este procedimiento.
8. Completar el cierre funcional y registrar intermedio agregado, huella, respaldo,
   hora con zona, resultado anterior y posterior. No guardar secretos en el reporte.

Un bundle general de raíces actualizado es necesario para confiar en emisores,
pero por sí solo no suministra todos los intermedios que un servidor omite. No
preinstalar indiscriminadamente todos los emisores posibles para evitar investigar
la siguiente renovación.

## Cierre funcional y reversión

- Comprobar HTTPS y `api.php?route=bootstrap`: HTTP 200 y JSON esperado; no publicar
  cookies ni CSRF. Bootstrap por sí solo no consulta Phantom ni demuestra su conexión.
- Obtener autenticación técnica con el transporte real de la aplicación y realizar
  una consulta mínima autorizada de solo lectura. No imprimir el token ni ejecutar
  inspectores de pago, imputación, Wi-Fi o generación de tickets. Algunos inspectores
  locales no se despliegan en cPanel: comprobar su existencia antes de invocarlos.
- Confirmar login del usuario de prueba, Inicio y lectura de facturas, sin pagar,
  configurar equipos ni crear solicitudes. Registrar confirmación del operador.
- Revisar errores nuevos desde la intervención. Los logs actuales solo registran
  códigos de evento y no permiten atribuir cada error histórico a un abonado.
- Si la sustitución causa una regresión, reponer atómicamente el respaldo exacto,
  conservar permisos y repetir la prueba. Restaurar el bundle anterior no solucionará
  una cadena nueva cuyo intermedio falte en él; sirve para deshacer la modificación,
  no como garantía de recuperación del acceso.

Mantener `CURLOPT_SSL_VERIFYPEER=true` y `CURLOPT_SSL_VERIFYHOST=2`. No usar `-k`,
no desactivar TLS, no cambiar a HTTP y no renovar repetidamente para sortear el error.

## Corrección de fondo en Phantom: pendiente de sus administradores

Apache debe entregar el certificado del dominio junto con los intermedios de la
emisión realmente instalada. En Apache 2.4.8 o posterior, `SSLCertificateFile`
puede contener el certificado seguido de los intermedios; la configuración exacta
se debe ajustar a la versión y al método de instalación que usen sus responsables.
El certificado cruzado de Root YR puede ser necesario para llegar hasta X1.
No es necesario enviar la raíz autofirmada de confianza.

Solicitar que el proceso de renovación de win-acme/WACS instale la cadena completa
y que los administradores verifiquen lo que entrega Apache después de cada renovación.
No asumir que generar un archivo fullchain implica que el virtual host lo esté usando.
La sesión de la VM de Phantom está autorizada solo para consulta: este documento no
habilita editar Apache, cambiar certificados ni reiniciar o apagar ese servidor.

El 15/10 se recuperó el servicio mediante el bundle de Nuthost; no se corrigió
Apache. Hasta que sus responsables confirmen la cadena completa, ejecutar las
verificaciones anteriores en cada renovación. Aun después de corregirlo, mantener
las pruebas desde Nuthost como criterio de aceptación.

## Referencias oficiales

- [Cadenas actuales e históricas de Let's Encrypt](https://letsencrypt.org/ca/certificates/).
- [CURLOPT_CAINFO: bundle utilizado por libcurl](https://curl.se/libcurl/c/CURLOPT_CAINFO.html).
- [Apache mod_ssl: SSLCertificateFile](https://httpd.apache.org/docs/2.4/mod/mod_ssl.html#sslcertificatefile).
