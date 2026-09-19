import { runtime, money } from './data.js';
import { escapeHTML as e, button } from './components.js';

export function paymentPanel() {
  if (!runtime.paymentsEnabled) return '';
  const labels = { CREATING: 'Preparando pago...', PENDING: 'Pago pendiente', CONFIRMED: 'Pago confirmado', CANCELLED: 'Pago cancelado', REJECTED: 'Pago rechazado', UNCONFIRMED: 'No pudimos confirmar el pago' };
  const canCheck = state => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(state);
  return `<section class="payment-status" aria-label="Movimientos de pago" aria-live="polite"><h2>Últimos movimientos</h2>${runtime.paymentError ? `<p role="alert">${e(runtime.paymentError)}</p>` : ''}${runtime.paymentItems.length ? runtime.paymentItems.map(a => `<div class="commercial-option"><h3>${labels[a.state] || labels.UNCONFIRMED}</h3><p>Factura ${e(a.idt)} · ${money(a.amount)}</p><p class="field-hint">${a.siro_payment_confirmed ? 'SIRO confirmó el pago. En esta etapa de laboratorio todavía no se registrará automáticamente en Phantom.' : 'El saldo y el estado de la factura siguen siendo los informados por Phantom.'}</p>${canCheck(a.state) ? button('Consultar estado', 'payment-check', { secondary: true, attrs: `data-attempt="${e(a.attempt_id)}"` }) : ''}${a.can_resume ? button('Continuar en SIRO', 'pay', { secondary: true, iconName: 'external-link', attrs: `data-id="${e(a.idt)}"` }) : ''}</div>`).join('') : '<p class="muted">Todavía no hay movimientos para mostrar.</p>'}<p class="field-hint payment-provider-summary">El pago se realiza en el portal oficial de SIRO. Mi USITTEL consulta su resultado; no registra pagos en Phantom en esta etapa.</p></section>`;
}
