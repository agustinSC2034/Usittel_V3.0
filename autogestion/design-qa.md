# Revisión del prototipo — 16/09/2026

## Segunda pasada: simplificación del MVP

Revisión actual en 390×844 y 1440×900 de las seis vistas, más detalle/pago móvil. Evidencia nueva en el subdirectorio `mvp-qa` del directorio de capturas indicado abajo. Archivos numerados por recorrido: 01-login, 02-inicio, 03-facturas, 04-detalle, 05-pago, 06-servicio, 07-soporte y 08-cuenta. Los sufijos indican mobile/desktop; detalle y pago tienen captura móvil.

1. Login: jerarquía conservada, ingreso de demo comprobado, formulario sin extras.
2. Inicio: mantiene servicio, deuda, vencimiento, pagar y últimas facturas; sin nuevas funciones ni widgets.
3. Facturas: períodos, montos y estados legibles; botones Pagar con mínimo de 44px de altura. Pendientes y pagadas conservan acciones diferentes.
4. Detalle: corregido el recorrido que obligaba a cerrarlo para pagar. Ahora reutiliza la acción de pago existente y deja descargar como acción secundaria en pendientes.
5. Pago: sigue siendo una demostración sin salida real a SIRO. Cerrar tiene un nombre fiel a su comportamiento, también cuando se abre desde Inicio.
6. Mi servicio: la sobrecarga de acciones secundarias se resolvió agrupándolas en Más opciones. No se elimina ninguna función. El desplegable nativo se probó en móvil y desktop; se conservan las cinco opciones y el speedtest funciona como simulación.
7. Soporte: ticket, chat y ayuda conservados; no requirió rediseño.
8. Mi cuenta: datos, seguridad y salida conservados; no se agregaron ajustes.

Se conserva tipografía, paleta, radios y navegación. Se elimina la animación de entrada de página; permanecen feedback de botones y toast, con movimiento reducido. La lectura visual no sustituye pruebas con lectores de pantalla, dispositivos físicos, estados reales ni una certificación WCAG. Las capturas iniciales de Inicio y Facturas que salieron deformadas por la herramienta fueron descartadas como evidencia; solo usar los archivos numerados finales.

Ver [MVP.md](MVP.md) para el alcance y los criterios pendientes de Login/Inicio reales. Sin integraciones, despliegue ni cambios a la web pública.

## Referencia y resultado

Se compararon las imágenes aprobadas con capturas del navegador. Se conserva el orden de contenido, logo real, jerarquía de cuenta, lista de facturas, verde de acción y azul oscuro, navegación inferior móvil y header horizontal desktop. No hay sidebar ni widgets nuevos.

Referencias locales (fuera del repositorio):

- `C:/Users/Agustin/.codex/generated_images/01a0ab84-fb3c-7530-b09a-fffd5e373c06/exec-bc2c4dd8-ccde-490b-a54b-4fe9c1b65fd4.png` — Login/Inicio/Facturas móvil.
- `C:/Users/Agustin/.codex/generated_images/01a0ab84-fb3c-7530-b09a-fffd5e373c06/exec-27387d50-e937-484d-9f68-1e4ba59b2b3c.png` — Login/Inicio/Facturas desktop.
- Las vistas restantes siguen las láminas complementarias `exec-2c2b3cc1-e9dd-4eda-90e3-5acf4e993d82.png` y `exec-1a81c741-6c1b-42cd-9ca8-213bf038c517.png` del mismo directorio.

Capturas de implementación en `C:/Users/Agustin/.codex/visualizations/2026/09/16/01a0ab84-fb3c-7530-b09a-fffd5e373c06/`:

- `mi-usittel-mobile-inicio.png`
- `mi-usittel-mobile-facturas.png`
- `mi-usittel-mobile-soporte.png`
- `mi-usittel-mobile-servicio.png`
- `mi-usittel-desktop-inicio.png`

Pruebas visuales en móvil 390×844, comprobación adicional de Facturas a 320×740, tablet 768×1024 (Inicio y Facturas), desktop 1280×720 y 1440×900. No se observó desborde horizontal en las vistas medidas. No es una matriz exhaustiva de navegadores/dispositivos físicos.

## Ajustes y diferencias deliberadas

- Se eliminaron gradientes en favor de un acento verde plano muy tenue.
- Se agregó una franja discreta de datos de prueba y avisos en acciones simuladas.
- Se agregaron comprobantes, ticket activo, speedtest simulado y opciones comerciales por pedido del usuario.
- Se corrigió la purga de clases dinámicas de estados en Tailwind.
- Se ajustó la densidad móvil para que el enlace a todas las facturas quede visible por encima de la barra inferior a 390×844.
- Se corrigió el foco al cambiar de un diálogo a otro; al cerrar vuelve al disparador original.

## Verificación funcional

- Login precargado, navegación entre seis vistas y cierre de sesión.
- Recuperación ficticia, con confirmación explícita de que no se envió correo.
- Factura pendiente: detalle, descarga y modal de pago; SIRO deshabilitado.
- Factura pagada: detalle de comprobante y descarga PDF verificada en disco.
- Edición temporal de contacto y nombre Wi-Fi; validación de contraseñas no coincidentes y confirmación de prueba.
- Ticket y seguimiento visibles, chat de prueba sin envío externo.
- Speedtest de demostración completa descarga/subida/latencia y advierte que los resultados no son una medición real.
- Mejorar plan y agregar servicios abren alternativas ilustrativas, conducen a consulta comercial deshabilitada y conservan Fibra 300 Mbps.
- Escape cierra diálogos. Los controles tienen etiquetas, estados textuales, foco visible y estilos de movimiento reducido.
- Sin errores ni advertencias en la consola capturada al finalizar.
- Compilación Tailwind correcta; el entorno avisa que su base caniuse-lite está desactualizada. No se alteraron versiones por este prototipo.

Resultado: prototipo apto para revisión visual y navegación con datos mock. No constituye validación de seguridad, accesibilidad exhaustiva ni de integraciones reales. No se modificaron el botón público, `.htaccess` ni la configuración de despliegue.

## Backend local de lectura — 17/09/2026

Se conserva el diseño, las seis vistas y la animación de entrada aprobada. Los únicos ajustes visuales de esta etapa son estados no disponibles, controles deshabilitados y fondos de estado coherentes (Suspendido rojo tenue, desconocido gris).

- Sesión demo PHP: ingreso y persistencia al recargar comprobados en navegador.
- Modo Phantom con transporte sintético: ingreso de fixture suspendida, Inicio desktop 1280×800 y móvil 390×844, Facturas y detalle móvil, Mi servicio/Más opciones, Soporte y Mi cuenta.
- Verificado: deuda independiente del total de factura, vencimiento no inventado, pagos/descargas deshabilitados, sin tickets/contactos ficticios, futuras funciones conservadas sin simular escrituras.
- Logout vuelve a formulario vacío; consola capturada sin errores/advertencias.
- 40 verificaciones HTTP con fixtures aprobadas; sintaxis PHP/JavaScript y compilación Tailwind correctas. Sigue el aviso previo de caniuse-lite desactualizado.

Estas pruebas NO validan Phantom real, HTTPS de producción ni todos los dispositivos. No se modificaron reglas públicas ni despliegue. La evidencia de diseño anterior sigue correspondiendo al modo demo.
