# Promesa interna por pago SIRO confirmado

Los intentos nuevos creados con la integración activa quedan habilitados para solicitar una promesa de 72 horas. Los intentos anteriores no se migran ni disparan promesas retrospectivas. No modifica la contabilización: `payment-post` continúa deshabilitado y SIRO/Phantom registra el pago por rendición nativa.

Al verificar SIRO en el servidor (incluyendo identidad, factura, importe y resultado PROCESADA/PagoExitoso), se guarda primero CONFIRMED. Bajo el bloqueo exclusivo de intentos se reserva la solicitud antes de contactar a Phantom. Luego se consulta el contrato exacto autorizado: solo Estado_Servicio Suspendido y factura todavía no PAGADA habilitan Generar_Promesa_Pago con IDA y horas=72. No se cambia directamente el estado administrativo.

La operación no se repite para el mismo intento/operación bancaria, ni para un contrato con una solicitud reciente de 72 horas creada o incierta. Los errores no alteran el resultado bancario. Un timeout, rechazo por límites o respuesta inesperada deja REVIEW_REQUIRED sin repetición automática. REQUESTING tras interrupción también requiere revisión. El runtime privado conserva los estados y fechas; no se exponen detalles internos al cliente.

La API nativa conserva sus restricciones de tecnología y límites de promesas. Una promesa manual existente no se reemplaza mediante otro mecanismo; su aceptación/rechazo queda a cargo del endpoint nativo. Un pago parcial no garantiza la continuidad al vencimiento si queda deuda. No se anuncian rehabilitaciones sin verificarlas.

Disparador: la consulta autenticada payment-reconcile/payment-resume que verifica el intento después de pagar. El retorno SIRO por sí solo es una navegación, no prueba de pago. Si el usuario cierra la web antes de verificar, la promesa espera una nueva consulta; no se añadió un proceso periódico ni webhook en esta entrega.

Documentación: https://wiki.phantom.com.ar/en/APIs y https://wiki.phantom.com.ar/en/CRM/promesas.

Validación: pruebas locales con transporte SIRO y Phantom simulado. La primera rehabilitación real queda pendiente de la prueba productiva autorizada del operador; no se crean promesas de prueba sobre contratos ajenos.
