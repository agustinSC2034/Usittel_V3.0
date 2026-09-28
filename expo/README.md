# ExpoTan 2026 · miniapp USITTEL

Miniapp independiente en `/expo/`, sin cabecera, navegación ni dependencias de la web pública. Usa HTML/CSS/JavaScript, IndexedDB y un Service Worker con Cache API. La inscripción se confirma **después** de que IndexedDB la guarda; la red nunca bloquea la participación. La sincronización posterior utiliza un formulario a un iframe porque las respuestas de `ContentService` de Apps Script no son fiables con CORS. El Apps Script devuelve un acuse con ID y nonce; solo entonces se marca `synced`.

El formulario guarda el borrador en IndexedDB y también mantiene una copia inmediata en `localStorage` para recuperar incluso una recarga instantánea mientras se escribe. Ambas copias del borrador se borran tras confirmar la inscripción; la inscripción final permanece en IndexedDB.

## Archivos

- `index.html`, `styles.css`: interfaz kiosco para tablet.
- `settings.js`: evento, preguntas, textos, PIN, temporizador y URL de Apps Script.
- `core.js`: selección, puntaje, validación y CSV.
- `store.js`: inscripciones y borrador en IndexedDB; índice único de DNI.
- `sync.js`: cola y acuse del Apps Script.
- `sw.js`: precache de todos los recursos críticos.
- `online.txt`: comprobación ligera de acceso al sitio; no forma parte del cache.
- `app.js`: flujo del participante y panel local.
- `apps-script/Code.gs`: receptor para Google Sheets.
- `../tests/expo.test.cjs`: pruebas de lógica.

## Probar localmente

Desde la raíz del repositorio, ejecutá `python -m http.server 8000` (o cualquier servidor HTTP estático) y abrí `http://localhost:8000/expo/`. `file://` no sirve para Service Worker. Corré `node tests/expo.test.cjs`, `node tests/expo-apps-script.test.cjs` y `node tests/expo-store.test.cjs`. Para la prueba offline, cargá una vez la página con conexión, esperá a que en administración figure **cache offline instalado**, cerrá y reabrí sin red o activá **Offline** en DevTools, y completá una inscripción. Verificá luego el registro y exportá CSV. La primera carga y la instalación del cache requieren conexión.

En la tablet, usá **https://usittel.com.ar/expo/** en un navegador moderno y una **ventana normal**. La prueba en ventana privada llegó a Sheets, pero su IndexedDB se eliminó al cerrar esa ventana. Mantené suficiente espacio libre y no borres los datos del sitio. IndexedDB es local a ese navegador, perfil y origen; cambiar de tablet, perfil o dominio no mueve las inscripciones. `www.usittel.com.ar/expo/` redirige al dominio principal cuando no hay registros locales. Si ya hay registros en `www`, muestra una pantalla de recuperación para abrir administración y descargar el CSV de ese origen. El navegador o el sistema operativo pueden eliminar datos del sitio bajo presión de almacenamiento. Hacé respaldos CSV durante el evento.

## Administración y respaldo

Mantené presionado el logo de USITTEL 3,5 segundos, usá el engranaje del header o, con teclado, `Ctrl+Alt+A`. Ingresá el PIN de `settings.js` (valor inicial `2026`; **cambialo antes del evento**). El PIN solo evita que un visitante abra el panel por accidente: cualquiera con acceso al código o DevTools puede verlo. En el panel se muestran totales, estado del almacenamiento local, conexión, cache, búsqueda por DNI/nombre, sincronización manual y **Descargar respaldo CSV**. El CSV funciona offline, conserva todos los registros y neutraliza fórmulas de hojas de cálculo. No hay borrado local en esta versión, para preservar la detección de DNI duplicado y el respaldo.

Al terminar **cada jornada**: abrí administración, exportá el CSV, guardá una copia fuera de la tablet, contá filas contra el total del panel y anotá pendientes/errores. Cuando haya conexión, forzá la sincronización y comprobá las filas en la Sheet. Guardá de nuevo el CSV después de sincronizar. No limpies los datos del navegador.

## Conectar Google Sheets

1. Creá una Sheet privada nueva. Copiá su ID de la URL.
2. Abrí Apps Script desde la Sheet o en `script.google.com`, pegá `apps-script/Code.gs` y reemplazá `PEGAR_ID_DE_LA_PLANILLA`.
3. Desplegá como **Aplicación web**, ejecutando como tu cuenta y con acceso **Cualquier usuario**. Autorizá los permisos de Sheets. Copiá la URL terminada en `/exec`, no `/dev`.
4. Pegá la URL en `appsScriptUrl` de `settings.js`. Cargá una versión nueva de `sw.js` incrementando `CACHE` (por ejemplo `usittel-expo-v2`) para que la tablet tome la configuración nueva; volvé a abrir online y verificá el cache.
5. En una tablet de prueba, inscribí un DNI ficticio, verificá que pase de `pending` a `synced` en administración y que aparezca una sola fila en la Sheet. Repetí **Forzar sincronización** y comprobá que no se duplique. Probá una interrupción de red y la recuperación.

El Apps Script usa `LockService` y comprueba DNI **o** ID antes de agregar una fila. Un mismo DNI en distintas tablets se resolverá como duplicado al sincronizar; la tablet secundaria puede marcar `synced` porque el servidor confirmó que ese DNI ya existe. Conservá los respaldos de todas las tablets para auditar esos casos. Si se modifica el código de Apps Script, publicá una versión nueva del despliegue web. El endpoint público puede recibir solicitudes de terceros; la validación, el límite de tamaño y las cuotas reducen errores pero **no constituyen autenticación**. Para un sorteo real, restringí acceso a la Sheet, revisá los datos y definí las bases legales antes de usar los resultados. No incluyas claves en `settings.js`.

## Preparación del stand

1. Definí las Bases y Condiciones finales por separado. El enlace aún no se muestra porque no se entregó una URL aprobada.
2. Ajustá textos, PIN y endpoint en `settings.js`; incrementá la versión del cache en `sw.js` si cambiaste algún archivo cacheado.
3. Probá la tablet en vertical y horizontal, permisos de almacenamiento, brillo, carga eléctrica y modo kiosco del sistema operativo.
4. Hacé una inscripción ficticia online y otra offline; comprobá los registros, el CSV y la sincronización posterior.
5. Reiniciá el navegador **sin red** y verificá `/expo/`, quiz, formulario y panel. Hacé una exportación CSV de prueba.
6. Retirá los datos ficticios con una limpieza completa de datos del sitio **solo antes** del evento, luego volvé a cargar online e instalá el cache. No hagas esa limpieza durante ni después del evento sin respaldos verificados.

Los datos personales permanecen sin cifrar en el almacenamiento local y en el CSV exportado. Protegé físicamente la tablet y los archivos exportados. Una sola tablet detecta DNI duplicado de forma atómica; sin red no puede detectar en tiempo real un DNI registrado en **otra** tablet.
