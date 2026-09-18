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

## Descarga: pendiente de identificar el recorrido nativo

El manual explica Hash_Descarga, pero no documenta una URL inequívoca para esta instalación. El repositorio tampoco contiene esa implementación. No se construyó una URL por intuición y no se confundió con un enlace de pago.

El backend tiene preparada autorización por sesión + IDA + IDT y validación PDF; la fuente real está cerrada con DOCUMENT_NOT_CONFIGURED. La descarga pública sigue deshabilitada. Las pruebas PDF actuales usan únicamente una fuente simulada, nunca un PDF ficticio mostrado como real.

Después de validar la paginación se indicará una única comprobación del flujo nativo de descarga. No compartir una URL completa con hash, cookies, token, capturas de datos privados, JSON crudo ni HAR sin sanear.

## Recorrido de aceptación pendiente para Facturas

Página 1 real → Cargar más → continuidad sin duplicados → abrir una factura conocida → descarga real cuando el recorrido esté confirmado → logout. Todavía no está aceptado este recorrido ampliado.

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

Agustín ejecutó el inspector: primera página de 10 facturas, segunda de 1, sin duplicados entre páginas, orden descendente y continuidad correcta. Las 11 presentan Hash_Descarga de tipo string. Confirmó que el historial y los detalles funcionan en el portal. La paginación y el detalle ampliado quedan aceptados para IDA 1; la descarga real sigue pendiente de identificar su endpoint.

Ajuste de presentación solicitado: se oculta el Detalle técnico sin interpretar su cadena ni modificar los datos recibidos; se elimina únicamente el prefijo observado RES ($) - del nombre visible del plan. Gestionar mi servicio y Speedtest quedan visibles sin desplegable. Sus acciones reales continúan deshabilitadas en modo Phantom.
