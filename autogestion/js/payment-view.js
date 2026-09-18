import { runtime, money } from './data.js';
import { escapeHTML as e, button } from './components.js';

export function paymentPanel() {
  if (!runtime.paymentsEnabled) return '';
  const labels = { CREATING: 'Preparando pago...', PENDING: 'Pago pendiente', CONFIRMED: 'Pago confirmado', CANCELLED: 'Pago cancelado', REJECTED: 'Pago rechazado', UNCONFIRMED: 'No pudimos confirmar el pago' };
  return `<section class="payment-status" aria-label="Pagos SIRO" aria-live="polite"><h2>Pagos SIRO</h2>${runtime.paymentError ? `<p role="alert">${e(runtime.paymentError)}</p>` : ''}${runtime.paymentItems.length ? runtime.paymentItems.map(a => `<div class="commercial-option"><h3>${labels[a.state] || labels.UNCONFIRMED}</h3><p>Factura ${e(a.idt)} · ${money(a.amount)}</p><p class="field-hint">${a.siro_payment_confirmed ? 'SIRO confirmó el pago. En esta etapa de laboratorio todavía no se registrará automáticamente en Phantom.' : 'El saldo y el estado de la factura siguen siendo los informados por Phantom.'}</p>${a.state !== 'CONFIRMED' ? button('Consultar estado', 'payment-check', { secondary: true, attrs: `data-attempt="${e(a.attempt_id)}"` }) : ''}${a.can_resume ? button('Continuar en SIRO', 'pay', { secondary: true, iconName: 'external-link', attrs: `data-id="${e(a.idt)}"` }) : ''}</div>`).join('') : '<p class="field-hint">Todavía no hay intentos de pago en Mi USITTEL.</p>'}<p class="field-hint">El pago se realiza en el portal oficial de SIRO. Mi USITTEL consulta su resultado; no registra pagos en Phantom en esta etapa.</p></section>`;
}
