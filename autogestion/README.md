# Mi USITTEL — frontend y backend local de lectura

Se conserva la interfaz aprobada y sus seis vistas con rutas por hash. HTML, módulos JavaScript nativos, Tailwind 3 y PHP, sin frameworks ni dependencias npm nuevas.

**Estado:** backend y frontend implementados y probados con fixtures ficticios. No se validó un login contra Phantom real ni se consultaron cuentas reales. Faltan configuración privada y confirmación de campos opcionales mediante una respuesta controlada de IDA 1 o 5. No está listo para publicar.

## Ejecutar

Desde la raíz del repositorio:

```powershell
# Solo diseño: Node estático, sin PHP; login demo en memoria.
npm run dev:mi-usittel
# http://127.0.0.1:4173/autogestion/

# Frontend + backend, mismo origen. PHP 8.2+ con cURL y TLS.
$env:MI_USITTEL_PHP = 'C:\ruta\a\php.exe' # Omitir si php está en PATH.
npm run dev:mi-usittel:php
# http://127.0.0.1:4174/autogestion/
```

En esta sesión se preparó PHP 8.4.25 oficial en `$env:TEMP\mi-usittel-php\php.exe`, fuera del repo. Es temporal, no una instalación permanente. Para reutilizarlo: `$env:MI_USITTEL_PHP = "$env:TEMP\mi-usittel-php\php.exe"`.

Sin `MI_USITTEL_CONFIG`, PHP funciona en modo demo con sesión de servidor. Usuario demo `agustin.demo`, contraseña demo `usittel-demo`. El servidor Node también ofrece demo, pero el acceso se reinicia al recargar. Ambos escuchan exclusivamente en 127.0.0.1; no son servidores de producción.

```powershell
npm run build:mi-usittel
npm run watch:mi-usittel
npm run check:mi-usittel # Diagnóstico local; no contacta Phantom.
npm run test:mi-usittel # Requiere PHP; no contacta Phantom.
```

El CSS compilado está incluido. Para reconstruirlo se usan las dependencias existentes (`npm ci` si faltan). No abrir con file://.

## Configuración privada

Ver [FIRST-PHANTOM-TEST.md](FIRST-PHANTOM-TEST.md) para la primera prueba guiada y [INTEGRATION.md](INTEGRATION.md) para el contrato interno completo.

Copiar `server/config.example.php` fuera del repositorio y de cualquier carpeta pública, completar allí las credenciales técnicas actuales y definir `MI_USITTEL_CONFIG`/`MI_USITTEL_RUNTIME` en la terminal que inicia PHP. No pegar secretos en el chat. Una configuración errónea falla sin activar demo. El navegador no selecciona el modo.

Los datos personales/productos y saldo requieren confirmar claves, tipos y semántica antes de activar sus mapeos; mientras tanto son No disponible. Las credenciales de abonados nunca se guardan en configuración ni sesión.

## Estructura

| Archivos | Responsabilidad |
| --- | --- |
| index.html, styles.css, assets/, tailwind.config.cjs | Diseño aislado y recursos locales; animación sutil con movimiento reducido |
| js/views.js, js/components.js | Seis vistas y componentes; textos escapados y estados neutrales |
| js/app.js | Navegación, ciclo de sesión, carga/errores, detalle y acciones demo |
| js/api.js | Nuestra API del mismo origen y CSRF en memoria |
| js/data.js | Estado inicialmente vacío y adaptación de respuestas |
| js/demo-data.js, js/documents.js | Datos y PDF ficticios exclusivos de demo |
| server/Core.php | Configuración, almacenamiento privado, intentos y normalización |
| server/Phantom.php | HTTPS, token técnico, lecturas y campos públicos permitidos |
| server/Api.php | Sesiones, CSRF, login/logout, Inicio y facturas |
| server/router.php, start-php.cjs | Servidor PHP local con rutas/archivos permitidos explícitamente |
| server/config.example.php, server/Inspector.php, server/inspect-schema.php | Plantilla sin secretos y diagnóstico por etapas de cliente/cuenta/factura sin valores |
| check.cjs, server/check-environment.php | Chequeo local de PHP, configuración, runtime y secretos; sin red |
| serve.cjs | Servidor Node exclusivamente demo; no ejecuta PHP |
| tests/ | Transporte ficticio y pruebas HTTP; no cargados por el servidor normal |
| MVP.md, INTEGRATION.md, design-qa.md | Alcance, contrato/configuración y revisión |

En la raíz se modificaron package.json (comandos) y .gitignore (defensa contra archivos privados accidentales). La configuración real se rechaza dentro del repo, aunque Git la ignore.

## Modos y aislamiento

Demo conserva todas las funciones visuales: documentos de ejemplo, ticket, formularios temporales, chat local, speedtest simulado y opciones comerciales. Las secundarias siguen en Mi servicio → Más opciones.

Phantom usa sesión propia y lecturas del backend, sin sustituir fallos con datos demo. No muestra tickets inventados ni confirma modificaciones falsas. Pagos, descargas, comprobantes, recuperación y escrituras quedan deshabilitados. No se usa localStorage ni sessionStorage. La contraseña solo se envía al backend propio para verificar el login y después se vacía del formulario.

No se cambiaron el botón comercial, .htaccess, .cpanel.yml, DNS ni cPanel; tampoco se hizo push. La regla pública aún redirige /autogestion a Phantom y el despliegue no incorpora esta carpeta. Usar los servidores locales. Dominio/ruta y despliegue serán otra entrega.
