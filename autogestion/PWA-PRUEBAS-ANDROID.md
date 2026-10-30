# Laboratorio PWA para Android por USB

Este laboratorio es exclusivamente local: no requiere servidor público, no usa configuraciones reales y no debe desplegarse. PHP atiende solo `127.0.0.1`; los transportes Phantom y SIRO son fixtures. El router de prueba entrega la misma aplicación, pero reemplaza únicamente la navegación al checkout por una página local inequívocamente simulada. Si el código original del salto cambia, el router deja de servir ese módulo hasta que se revise la adaptación. El intento queda pendiente: pulsar «regreso OK» no lo confirma. CSP impide las conexiones externas de la página; no usar ningún enlace externo.

## Iniciar en Windows

Abrir PowerShell en la raíz de esta copia del repositorio. Se requiere Node y PHP 8.2+ con cURL; esta máquina dispone de PHP 8.4 en el directorio `work/php84-tests` vecino a esta copia:

```powershell
cd 'C:\Users\Agustin\.codex\.chatgpt-projects\g-p-69f0ec68b8f48191a141a3cdbdacb955\work\usittel-pwa'
$env:MI_USITTEL_PHP = (Resolve-Path '..\php84-tests\php.exe').Path
node autogestion/tests/start-pwa-fixture.cjs
```

Mantener esa ventana abierta. El servidor muestra `http://localhost:4174/autogestion/` y la ubicación temporal de sus datos ficticios, generada nuevamente en cada inicio. Detener con Ctrl+C. No introducir usuarios ni contraseñas reales. Si el puerto está ocupado, detener el servicio anterior antes de empezar; confirmar que la página muestra la franja «ENTORNO DE PRUEBA AISLADO» y que al pagar aparece **SIRO simulado**. Ante cualquier duda detenerse, sin seguir a un dominio de pagos.

Usuario: `000001`. Contraseña: ` 00Lab-fixture! ` — incluye **un espacio al inicio y otro al final**.

## Conectar Android

En el teléfono activar Opciones de desarrollador y depuración USB, conectarlo por cable, desbloquearlo y autorizar la clave RSA de esta computadora cuando lo solicite. Para pasar el puerto por USB se puede usar cualquiera de estos métodos:

1. **Chrome en la computadora:** abrir `chrome://inspect/#devices`, activar detección de dispositivos USB y abrir **Port forwarding**. Habilitarlo y agregar puerto del dispositivo `4174`, destino `localhost:4174`. Comprobar que el teléfono aparezca y la conexión esté activa. [Guía oficial](https://developer.chrome.com/docs/devtools/remote-debugging/local-server).
2. **ADB:** instalar [SDK Platform-Tools oficial](https://developer.android.com/tools/releases/platform-tools), abrir PowerShell en la carpeta `platform-tools` y ejecutar `./adb.exe devices` y luego `./adb.exe reverse tcp:4174 tcp:4174`. `devices` debe mostrar el dispositivo como `device`, no `unauthorized`. Al terminar, quitar solo esta regla con `./adb.exe reverse --remove tcp:4174`.

No se encontró ADB en PATH en la preparación. El usuario debe conectar y autorizar el teléfono; no se cambió su configuración. En Chrome Android abrir `http://localhost:4174/autogestion/` — no usar la IP LAN de la computadora. Localhost es un contexto de desarrollo potencialmente seguro, pero no sustituye una prueba HTTPS real.

## Recorrido

1. Confirmar la franja de prueba. En Chrome, menú ⋮ → **Instalar aplicación** o **Agregar a pantalla principal**. Si Chrome ofrece solo un acceso directo o no muestra instalación, registrar el resultado; no dar por verificada una PWA standalone. Abrir desde el icono y revisar nombre, imagen y si aparece sin barra de navegador.
2. Ingresar con la cuenta ficticia indicada. Ir a **Facturas → Pagar**: debe aparecer **SIRO simulado — prueba**, sin dominio de SIRO y sin formulario de tarjeta. Elegir **Simular regreso OK**. Al volver a Facturas, la factura y el intento deben seguir pendientes; el retorno por sí solo no confirma un pago. Repetir con **Simular regreso con error**.
3. Ir a **Mi cuenta → Cerrar sesión**. Debe volver a Ingresar. Cerrar y reabrir la PWA y comprobar que no se muestran datos hasta volver a ingresar. Probar también recarga durante una sesión abierta.
4. En `chrome://inspect/#devices` inspeccionar la pestaña Android: Application → Manifest y Service Workers para comprobar manifiesto y worker; Storage → Cache Storage no debería contener cachés creadas por este worker. Revisar consola y registrar errores. Para probar sin conexión, detener el servidor: no se ofrece contenido offline.
5. Al terminar, detener el servidor y quitar el reenvío USB. La PWA instalada apunta a localhost y solo funcionará mientras el laboratorio y el reenvío estén activos; puede desinstalarse desde Android.

## Alcance de la verificación

La prueba local usa HTTP localhost: no verifica TLS ni la cookie `Secure` de producción. El checkout simulado es del mismo origen: no verifica las restricciones `SameSite=Strict`, la salida a un dominio externo, Custom Tabs, ni el retorno real de SIRO. Requerirán más adelante un entorno HTTPS de pruebas controlado y revisión separada, sin realizar pagos reales. Tampoco verifica Digital Asset Links ni TWA. No asumir que la opción de instalación o el comportamiento Android están comprobados hasta efectuar el recorrido en el teléfono.

## Validación automatizada

Con el mismo `MI_USITTEL_PHP`, ejecutar `node autogestion/tests/pwa-fixture.test.cjs`. Arranca otro servidor en el puerto 4179 y comprueba manifiesto, recursos, adaptación del checkout, login, creación de intento ficticio, regreso, conciliación pendiente y logout. El test no sustituye la prueba visual en Android.
