# Facturas — prueba de laboratorio IDA 1

## Aceptación anterior cerrada

Agustín validó manualmente login real, Inicio/perfil/plan/Estado_Servicio, saldo desde Balance, última factura y detalle, sesión conservada al recargar y logout: después de recargar permaneció en login sin datos del cliente. ID fue confirmado como identificador para IDA 1; el usuario personalizado usa el mapeo privado existente.

La instalación interpreta Balance positivo como deuda y negativo como saldo a favor. Se mantiene la corrección aplicada. No volver a investigar autenticación, TLS o identidad salvo un fallo nuevo.

## Inspector de referencia — prueba ya completada

Desde la misma PowerShell configurada y la raíz del proyecto:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-invoices.php 1
```

Si la consola está ocupada por el servidor, usar otra PowerShell con las variables de entorno habituales. No copiar config.example.php encima del archivo privado.

El comando hace como máximo tres solicitudes: autenticación técnica y dos páginas de facturas del IDA 1, Limit=10 con Offset=0 y 10. No consulta otros abonados, no descarga documentos, no usa SIRO, no escribe en Phantom ni guarda el token. Comparte transporte TLS/decoder con el portal.

Copiar únicamente el reporte generado o su diagnóstico seguro. Informa cantidades por página, orden, duplicados, continuidad y presencia/tipos de Hash_Descarga. No muestra IDs de facturas, importes, nombres, hash, token, URLs privadas ni contenido de documentos.

Esperamos orden descendente, overlap_count=0 y page_2_older=true cuando existan dos páginas con datos. Si hay menos de diez facturas, la segunda página puede estar vacía: eso no permite declarar validada la continuidad entre dos páginas no vacías. No recorrer otro IDA para obtener más datos.

La prueba ya fue completada; no es necesario repetirla.

## Única prueba manual ahora: identificar el comprobante

Botmaker confirma Comprobante_Factura.php?IDT=Hash_Descarga. Falta saber si responde PDF, HTML o redirección. Desde la raíz del proyecto, en la PowerShell con las variables ya configuradas:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-invoice-document.php 1 --latest
```

--latest elige explícitamente la factura más reciente del historial JSON del IDA 1 y recupera su propio hash internamente. No tenés que escribir ni compartir el hash. El inspector también admite un IDT numérico concreto en lugar de --latest para una factura histórica; nunca usa el hash de la última para otra factura.

Hace como máximo cuatro solicitudes de lectura: autenticación, hasta dos páginas del historial y un solo GET del comprobante. No sigue redirects, no guarda documento/cookies/token, no carga scripts ni pulsa opciones de pago. Mantiene tu CA y TLS; corta respuestas superiores a 10 MiB. No modificar config.php.

Pegá únicamente la salida del inspector. Informa HTTP, MIME, tamaños, firma PDF, tipo detectado y redirect; no contiene valores del hash, token, URL completa ni datos personales. En una redirección, las rutas no reconocidas se omiten por seguridad. No enviar HTML, PDF, cookies, JSON crudo ni configuración privada.

Esperar el análisis de esa salida antes de conectar Descargar. Su fuente real continúa deshabilitada con DOCUMENT_NOT_CONFIGURED.

## Recorrido de aceptación pendiente para Facturas

Historial, Cargar más, continuidad y detalle ya aceptados. Pendiente: clasificar la respuesta documental, implementar la entrega segura según ese resultado, probar descarga conocida y logout del recorrido ampliado.

El portal local sigue en http://127.0.0.1:4174/autogestion/, con `npm run dev:mi-usittel:php`. `npm run check:mi-usittel` y `npm run test:mi-usittel` no contactan Phantom. No modificar credenciales, ca_file, Apache, DNS, .htaccess ni producción.

Si se abre otra PowerShell, restablecer solo las rutas existentes:

```powershell
$privateFolder = Join-Path $env:LOCALAPPDATA 'MiUSITTEL'
$env:MI_USITTEL_CONFIG = Join-Path $privateFolder 'config.php'
$env:MI_USITTEL_RUNTIME = Join-Path $privateFolder 'runtime'
$env:MI_USITTEL_PHP = "$env:TEMP\mi-usittel-php\php.exe"
```

Usar la ubicación real de PHP si cambió. No imprimir ni compartir la configuración privada.

## Validación real del historial y ajuste visual — 18/09/2026

Agustín ejecutó el inspector: primera página de 10 facturas, segunda de 1, sin duplicados entre páginas, orden descendente y continuidad correcta. Las 11 presentan Hash_Descarga de tipo string. Confirmó que el historial y los detalles funcionan en el portal. La paginación y el detalle ampliado quedan aceptados para IDA 1; la descarga real sigue pendiente de clasificar la respuesta del endpoint encontrado en Botmaker.

Ajuste de presentación solicitado: se oculta el Detalle técnico sin interpretar su cadena ni modificar los datos recibidos; se elimina únicamente el prefijo observado RES ($) - del nombre visible del plan. Gestionar mi servicio y Speedtest quedan visibles sin desplegable. Sus acciones reales continúan deshabilitadas en modo Phantom.
