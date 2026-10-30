# Mi USITTEL: PWA y futura TWA

## Diagnóstico y alcance

`index.html` carga `js/app.js`, que presenta el ingreso y navega mediante `#/...`. La sesión y el CSRF se gestionan con `api.php`; SIRO abre un dominio externo y vuelve al portal. No había manifiesto ni worker en `autogestion/`; `expo/` es otra aplicación. En el hosting, `public_html/autogestion` es la raíz del subdominio `https://mi.usittel.com.ar/`: las rutas relativas del manifiesto resuelven a `/` en ese origen. En el laboratorio local, el mismo directorio se sirve en `/autogestion/`, por lo que allí resuelven a `/autogestion/`. La identidad relativa conserva el alcance de cada instalación. Verificar las rutas y redirecciones en el hosting antes de publicar.

El worker no tiene manejador `fetch`, no usa Cache Storage y no implementa funcionamiento sin conexión. Las peticiones, cookies y redirecciones siguen a cargo del navegador y del backend; no se ha alterado la lógica de autenticación, Phantom, SIRO ni TLS. Las cabeceras `no-store` existentes siguen vigentes. El worker deja disponible el punto de extensión para una implementación futura de push; no solicita permisos ni contiene suscripción o notificaciones. La ampliación requerirá diseño, autorización, backend y nueva revisión de seguridad.

Los iconos usan el símbolo de `assets/favicon.png` (192 × 231), centrado sobre el color existente con margen para máscaras. El escalado limita la nitidez del icono grande: para una distribución definitiva conviene obtener el símbolo oficial vectorial o un original de mayor resolución y sustituir ambos PNG conservando el área segura.

## Archivos

- `index.html`: enlace al manifiesto y script de registro.
- `manifest.webmanifest`: identidad, rutas, colores e iconos instalables.
- `js/pwa-register.js`: registro en contextos seguros, bajo el directorio del portal.
- `sw.js`: worker sin interceptación ni almacenamiento.
- `assets/pwa-icon-192.png`, `assets/pwa-icon-512.png`: iconos normal y maskable.
- `.htaccess`: tipo MIME del manifiesto; conserva las reglas previas.
- `serve.cjs`: MIME para la previsualización local, sin PHP ni pagos reales.
- `PWA.md`: esta guía.

## TWA y Digital Asset Links

Bubblewrap puede generar más adelante un proyecto Android desde la URL HTTPS del manifiesto. Se necesitarán dominio y URL canónicos, nombre de paquete Android definitivo y certificado(s) de firma SHA-256. La asociación es bidireccional: configuración de la aplicación Android y archivo servido en `https://DOMINIO/.well-known/assetlinks.json`, en la raíz del **origen**, no dentro de `/autogestion/`. Debe devolver HTTP 200, `application/json`, por HTTPS sin redirecciones. Ejemplo para completar, no publicar con marcadores:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.ejemplo.mi_usittel",
    "sha256_cert_fingerprints": ["HUELLA_SHA256_DEL_CERTIFICADO_DE_FIRMA"]
  }
}]
```

Si se usa Play App Signing, agregar la huella del certificado con el que Google firma la aplicación distribuida; puede diferir de la clave de carga. Añadir la huella de prueba solo si se necesita y se decide autorizarla. Verificar asociación en un dispositivo con la versión firmada correspondiente. Si falla, se mostrará la interfaz de Custom Tabs. SIRO es otro origen y normalmente mostrará interfaz de navegador; probar salida y regreso sin realizar pagos reales. No asociar dominios de terceros sin control y autorización.

Fuentes: [TWA y Bubblewrap](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start), [asociación de dominios Android](https://developer.android.com/training/app-links/configure-assetlinks), [orígenes múltiples](https://developer.chrome.com/docs/android/trusted-web-activity/multi-origin).

## Prueba manual Android, después de desplegar con autorización

1. Usar un entorno de pruebas HTTPS con backend aislado y una cuenta de prueba. Confirmar que el manifiesto, el worker y los dos PNG responden 200 con MIME correcto y sin redirecciones de autenticación; en el subdominio `mi.usittel.com.ar`, comprobar que el inicio y alcance resuelvan a `/`. En el laboratorio local corresponden a `/autogestion/`.
2. En Chrome actualizado en Android, abrir la URL HTTPS del portal, esperar la carga y elegir menú ⋮ → **Instalar aplicación** o **Agregar a pantalla principal** (el texto puede variar). Confirmar la instalación y abrir el icono desde inicio: nombre, logo, pantalla y modo sin barra del navegador.
3. Con datos de prueba, ingresar, navegar entre secciones, actualizar, cerrar y reabrir, y cerrar sesión. Comprobar que no reaparezcan datos de la sesión anterior. Revisar errores y estado del worker desde Chrome DevTools remoto, Application → Manifest y Service Workers; Storage → Cache Storage no debe contener cachés creadas por este worker.
4. Probar, en entorno aislado, el flujo de salida y regreso de SIRO sin completar un pago real. Verificar cookies/sesión y regreso a facturas; registrar cualquier diferencia entre Chrome, PWA y futura TWA.
5. Activar modo avión y abrir de nuevo: no se promete experiencia offline ni acceso a datos; reconectar y confirmar recuperación. Probar con sesión vencida. El registro puede fallar por políticas CSP, MIME, HTTPS o redirecciones; revisar consola y servidor sin cambiar credenciales ni TLS.

La prueba real de Android, la instalación, el backend PHP, el proveedor de pagos y las cabeceras del hosting requieren verificación en un entorno apropiado; no se consideraron completadas en la preparación local.
