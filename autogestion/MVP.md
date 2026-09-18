# MVP — alcance efectivo al 17/09/2026

## Producto aprobado

Login, Inicio, Facturas/Estado de cuenta y detalle, Mi servicio, Soporte y Mi cuenta básica. Navegación inferior móvil y superior desktop, sin sidebar. No se eliminó ninguna función previa: speedtest, mejoras de plan, adicionales, contacto comercial y Wi-Fi siguen en Más opciones; deshabilitados en Phantom hasta su integración.

## Implementado y comprobado con fixtures

- Backend PHP propio aislado y mismo origen que el frontend.
- Resolver IDA candidato y comparar exactamente Autogestion_User y Autogestion_Pass. Sin DNI/CUIT, normalización de contraseñas ni autorización por IDA solo. Un suspendido puede ingresar.
- Laboratorio limitado a IDA 1 y/o 5; usuarios personalizados mediante mapeo privado, sin barrido ni contratos asociados.
- Sesión PHP con regeneración, HttpOnly, SameSite Strict, Secure al servir HTTPS, vencimientos, CSRF login/logout y límite backend basado únicamente en fallos.
- Chequeo local sin red e inspección segura de estructuras de cliente, cuenta y factura preparados para la primera conexión.
- API interna para Inicio y facturas paginadas. Campos públicos explícitos; secretos/JSON bruto no llegan al navegador.
- Demo explícita del servidor, fixtures separadas, sin fallback desde Phantom.
- Carga/error recuperable, campos no disponibles, facturas vacías y discrepancia saldo/estado de factura.
- Detalle de lectura, total separado del saldo pendiente. Sin PDF ficticio en modo Phantom.
- Pruebas HTTP de sesión y casos negativos con transporte ficticio aislado; revisión en navegador móvil/desktop. Ver INTEGRATION.md.

## Pendiente de Phantom real

**No se validó login real ni se cargaron datos reales.** Faltan credenciales técnicas en configuración privada y una respuesta controlada de laboratorio.

- Confirmar autenticación técnica POST JSON y envoltorios/errores reales con IDA 1 o 5.
- Estado_Servicio y campos documentados de facturas tienen adaptadores preparados.
- Nombre/razón social, domicilio, plan, ciudad, correo y teléfono esperan claves/tipos confirmados; la plantilla los deja sin mapear.
- Balance: documentación define crédito menos débito, pero falta el campo JSON numérico exacto. Sin mapeo no se consulta ni inventa saldo; no se suman facturas.
- Próximo vencimiento de cuenta, pagos parciales, estado técnico y Wi-Fi no disponibles hasta confirmar contrato suficiente. Activo es administrativo, no prueba conexión.
- Resolución universal de usuarios personalizados pendiente; el mapeo de laboratorio no es una solución general.

## Fuera de esta entrega

SIRO, verificación/imputación de pagos, promesas, reactivación, PDF/comprobantes reales, recuperación, cambios de datos/Wi-Fi/plan, lectura/creación de tickets, chat y speedtest reales, múltiples contratos. Ninguna escritura habilitada.

Antes de producción: validación real, revisión de seguridad/despliegue, servidor HTTPS y operación. No cambiar .htaccess, .cpanel.yml, acceso comercial ni dominio en esta etapa. No publicar el laboratorio.
