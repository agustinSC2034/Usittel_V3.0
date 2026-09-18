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

Identidad del registro mediante ID (IDAx distinto), login real con mapeo privado del usuario personalizado y sesión conservada después de F5 confirmados. Inicio mostró datos reales. Agustín contrastó Balance positivo de 121 como deuda; se corrigió el adaptador que lo mostraba erróneamente a favor.

## Pendiente de aceptación real

Confirmar que Inicio muestra la deuda corregida, completar el contraste de perfil y detalle de factura y cerrar sesión. El caso de saldo negativo/a favor se probó con fixtures pero todavía no con una cuenta real. Ver FIRST-PHANTOM-TEST.md.

Login y recarga están comprobados, pero el recorrido de aceptación completo aún no terminó. Próximo vencimiento global, velocidad, conectividad y fecha de pago siguen no disponibles cuando no hay contrato confirmado.

## Fuera de esta entrega

SIRO, pagos/imputación, promesas, reactivación, PDF/comprobantes, recuperación, cambios de datos/Wi-Fi/plan, tickets, chat y speedtest reales, múltiples contratos, búsqueda universal de usuarios. Ninguna escritura habilitada.

Antes de producción: certificados en hosting, riesgo de credenciales GET en logs remotos, revisión de seguridad/despliegue y validación real completa. No modificar la web pública, su acceso, DNS, Apache, .htaccess ni publicar el laboratorio en producción.
