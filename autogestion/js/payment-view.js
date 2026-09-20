import { runtime, money } from './data.js';
import { escapeHTML as e, button, icon } from './components.js';

export function paymentPanel() {
  if (!runtime.paymentsEnabled && !runtime.paymentHistoryEnabled) return '';
  const labels = { CREATING: 'Preparando pago...', PENDING: 'Pago pendiente', CONFIRMED: 'Pago confirmado', CANCELLED: 'Pago cancelado', REJECTED: 'Pago rechazado', UNCONFIRMED: 'No pudimos confirmar el pago' };
  const canCheck = state => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(state);
  const postingCopy = a => a.phantom_payment_posted ? 'Tu pago ya fue registrado en la cuenta.' : a.phantom_posting_state === 'ALREADY_SETTLED' ? 'Tu cuenta ya estaba actualizada.' : a.phantom_posting_state === 'POST_UNCONFIRMED' || a.phantom_posting_state === 'POSTING' ? 'Recibimos tu pago. La actualización de la cuenta puede demorar.' : a.phantom_posting_state === 'NEEDS_REVIEW' ? 'Recibimos tu pago. Estamos verificando la actualización de la cuenta.' : 'Recibimos tu pago. La actualización de la cuenta puede demorar.';
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
  const registered = runtime.paymentHistoryItems.map(item => `<div class="commercial-option"><h3>Pago registrado</h3><p>${date(e(item.date))} · ${money(item.amount)}</p><p class="field-hint">${e(item.method)} · Período ${e(item.period)}</p>${item.downloadAvailable ? `<button type="button" class="text-action payment-receipt-action" data-action="download-payment-receipt" data-payment-id="${e(item.id)}" aria-label="Descargar comprobante de pago">${icon('download')}Descargar</button>` : ''}</div>`).join('');
  const attempts = runtime.paymentItems.filter(a => !(a.phantom_payment_posted && runtime.paymentHistoryItems.length));
  const attemptRows = attempts.map(a => `<div class="commercial-option"><h3>${a.phantom_payment_posted ? 'Pago registrado' : (labels[a.state] || labels.UNCONFIRMED)}</h3><p>Factura ${e(a.idt)} · ${money(a.amount)}</p><p class="field-hint">${a.siro_payment_confirmed ? postingCopy(a) : a.state === 'CANCELLED' ? 'El pago no se completó y tu cuenta no tuvo cambios.' : 'Consultá el estado para conocer el resultado del pago.'}</p>${canCheck(a.state) ? button('Consultar estado', 'payment-check', { secondary: true, attrs: `data-attempt="${e(a.attempt_id)}"` }) : ''}${a.can_resume ? button('Continuar con el pago', 'pay', { secondary: true, iconName: 'external-link', attrs: `data-id="${e(a.idt)}"` }) : ''}</div>`).join('');
  const errors=[runtime.paymentHistoryError,runtime.paymentError].filter(Boolean).map(message=>`<p role="alert">${e(message)}</p>`).join('');
  return `<section class="payment-status" aria-label="Movimientos de pago" aria-live="polite"><div class="movement-heading"><h2>Últimos movimientos</h2></div>${errors}${registered}${attemptRows}${!registered && !attemptRows ? '<p class="muted">Todavía no hay movimientos para mostrar.</p>' : ''}</section>`;
}
