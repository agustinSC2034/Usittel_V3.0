# Primera prueba del portal con Phantom — laboratorio IDA 1

La comunicación real ya fue comprobada por Agustín: autenticación GET HTTPS y lecturas POST de cliente, estado de cuenta y última factura. TLS funciona con el bundle privado existente. No repetir la investigación de certificados, puertos o Apache.

El portal usa ese mismo transporte y decoder. Identidad ID, login con usuario personalizado y persistencia al recargar ya fueron confirmados por Agustín. También confirmó que Balance positivo de 121 representa deuda: se corrigió la interpretación del signo. El siguiente paso es recargar Inicio y comprobar que muestra Deuda actual, antes de continuar con detalle y logout. No repetir la configuración ni los inspectores siguientes si ya están completados. Los tests y chequeos locales no llaman a Phantom.

## Referencia: comprobación de identidad ya completada

Desde la raíz del proyecto y la misma PowerShell que ya tiene las variables de entorno:

```powershell
& $env:MI_USITTEL_PHP autogestion/server/inspect-customer.php 1 --validate-identity
```

Copiar únicamente el reporte `identity`, o el diagnóstico seguro de etapa/código. Muestra cantidad de registros, presencia y tipo de ID/IDAx y credenciales, y si cada identificador coincide con IDA 1. No muestra valores personales, usuarios, contraseñas ni token. Hace como máximo una autenticación y una lectura del cliente; no guarda token ni consulta conexiones asociadas.

**Esperar la revisión de ese resultado.** No configurar `customer_path=[0]` ni elegir ID/IDAx por intuición. Si hay varios registros, coincidencias ambiguas o no hay identificador confirmado, el login debe seguir bloqueado.

## Después de confirmar la identidad

Estos pasos son para la siguiente intervención, no para ejecutarlos antes del reporte.

1. Abrir el archivo privado existente. No copiar la plantilla sobre él:

```powershell
notepad "$env:LOCALAPPDATA\MiUSITTEL\config.php"
```

2. Mantener `mode` en `phantom`, `allowed_idas` en `[1]` y la modalidad `phantom_auth_mode` en `get-query-lab`. Agregar `customer_id_field` con el campo que se haya confirmado. Mantener intactos URL, credenciales y `ca_file`. Una configuración anterior sin `phantom_auth_mode` usa explícitamente `get-query-lab`; no intenta otros métodos.

Si el usuario de autogestión es personalizado, agregar personalmente su correspondencia exacta a IDA 1 en `lab_users`. No poner contraseñas en ese mapa. El backend siempre compara usuario y contraseña exactos con los campos de autogestión del registro validado.

3. Ejecutar el chequeo local:

```powershell
npm run check:mi-usittel
```

El aviso de identidad pendiente es normal hasta completar el punto 2. Que el campo esté configurado no demuestra por sí mismo que sea correcto.

4. Iniciar el servidor PHP local:

```powershell
npm run dev:mi-usittel:php
```

Abrir http://127.0.0.1:4174/autogestion/. El servidor está ligado a localhost. El servidor estático del puerto 4173 no ejecuta el backend PHP.

5. Escribir personalmente en el formulario las credenciales actuales de autogestión del abonado 1. No usar las credenciales técnicas de API. No transformar la contraseña ni quitar espacios o ceros.

6. Comprobar login, recarga conservando sesión, nombre/domicilio/plan/estado administrativo, saldo contrastado con Phantom, última factura y detalle, y logout. Tras logout, recargar no debe devolver información del cliente.

Para esta instalación, el caso real confirmó positivo = deuda. El adaptador usa negativo = saldo a favor (cubierto con fixtures; pendiente contraste real del caso negativo). La factura muestra su total, no un saldo pendiente calculado; que esté pagada no significa que la cuenta no tenga deuda. La paginación completa, próximo vencimiento de cuenta y fecha de pago siguen sin validar. Opcionales ausentes muestran “No disponible”.

## Si abriste otra PowerShell

Restablecer las rutas, sin copiar ni imprimir el archivo privado:

```powershell
$privateFolder = Join-Path $env:LOCALAPPDATA 'MiUSITTEL'
$env:MI_USITTEL_CONFIG = Join-Path $privateFolder 'config.php'
$env:MI_USITTEL_RUNTIME = Join-Path $privateFolder 'runtime'
$env:MI_USITTEL_PHP = "$env:TEMP\mi-usittel-php\php.exe"
```

Usar la ubicación real de PHP si cambió. La carpeta runtime debe existir fuera del repositorio y tener acceso restringido al usuario que ejecuta PHP.

## Qué no compartir

No compartir passwords, token, archivo privado, URL de autenticación con query, JSON crudo, documentos del cliente ni capturas con información personal. No activar debug cURL ni volcar respuestas. Compartir solamente el reporte acotado o códigos de error seguros.

## Límites

Solo IDA 1 y lectura. No SIRO, pagos, promesas, cambios de servicio/datos/tickets, Apache, DNS ni producción. Pendientes antes de producción: certificados del hosting, protección y revisión de logs remotos ante credenciales GET, despliegue y seguridad.
