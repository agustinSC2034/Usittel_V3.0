# MVP — alcance efectivo al 18/09/2026

## Producto

Login, Inicio, Facturas/Estado de cuenta y detalle, Mi servicio, Soporte y Mi cuenta básica. Diseño aprobado preservado: navegación inferior móvil y superior desktop, sin sidebar. Speedtest, mejoras de plan, adicionales, contacto comercial y Wi-Fi siguen aislados en Más opciones; no se eliminan y siguen deshabilitados en Phantom.

## Conectado en código y probado con fixtures

- Transporte compartido: GET HTTPS de autenticación técnica y lecturas POST JSON. Sin fallback de métodos, TLS verificado y decoder estricto con un BOM inicial permitido.
- Portal exclusivamente IDA 1. Validación de lista, cantidad e identidad antes de comparar exactamente credenciales de autogestión; suspendidos pueden ingresar. ID/IDAx requieren confirmación explícita antes de habilitar login.
- Sesión propia, CSRF, vencimientos, logout, regeneración y límites de intentos. Token técnico separado del cliente.
- Inicio con nombre/razón social, domicilio, plan literal, estado administrativo y estado de cuenta. Mi servicio y Mi cuenta comparten esos datos de lectura.
- Balance del endpoint de cuenta: distingue deuda, cero, crédito y no disponible. Nunca suma facturas ni usa Balance_CC como sustituto.
- Última factura y detalle de lectura; total separado de saldo pendiente. Sin historial completo anunciado, documentos ficticios ni pagos habilitados.
- DTO público explícito, configuración privada, errores seguros, demo separada sin fallback. Opcionales ausentes y fallos parciales no generan datos inventados.

## Comprobado por Agustín contra Phantom real

Autenticación GET HTTPS con token y lecturas de cliente avanzado, estado de cuenta y última factura. Cliente/factura como listas, cuenta con Balance:string, nombres y tipos de campos. Bundle CA privado operativo. Limit=1 y Offset=0 comprobados; paginación completa no comprobada.

## Pendiente de aceptación real

Una comprobación segura de ID frente a IDAx y presencia/tipo de credenciales mediante el inspector existente. Luego configurar el campo confirmado, ingresar personalmente en localhost:4174, recargar conservando sesión, contrastar perfil/saldo/factura con Phantom y cerrar sesión. Ver FIRST-PHANTOM-TEST.md.

No declarar el login real terminado hasta completar este recorrido. Nombres de campos observados no prueban identidad, semántica de estados ni contenido de la cuenta. Próximo vencimiento global, velocidad, conectividad y fecha de pago siguen no disponibles cuando no hay contrato confirmado.

## Fuera de esta entrega

SIRO, pagos/imputación, promesas, reactivación, PDF/comprobantes, recuperación, cambios de datos/Wi-Fi/plan, tickets, chat y speedtest reales, múltiples contratos, búsqueda universal de usuarios. Ninguna escritura habilitada.

Antes de producción: certificados en hosting, riesgo de credenciales GET en logs remotos, revisión de seguridad/despliegue y validación real completa. No modificar la web pública, su acceso, DNS, Apache, .htaccess ni publicar el laboratorio en producción.
