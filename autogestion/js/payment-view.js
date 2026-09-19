import { runtime, money } from './data.js';
import { escapeHTML as e, button } from './components.js';

export function paymentPanel() {
  if (!runtime.paymentsEnabled) return '';
  const labels = { CREATING: 'Preparando pago...', PENDING: 'Pago pendiente', CONFIRMED: 'Pago confirmado', CANCELLED: 'Pago cancelado', REJECTED: 'Pago rechazado', UNCONFIRMED: 'No pudimos confirmar el pago' };
  const canCheck = state => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(state);
  const postingCopy = a => a.phantom_payment_posted ? 'Tu pago ya fue registrado en la cuenta.' : a.phantom_posting_state === 'ALREADY_SETTLED' ? 'Tu cuenta ya estaba actualizada.' : a.phantom_posting_state === 'POST_UNCONFIRMED' || a.phantom_posting_state === 'POSTING' ? 'Recibimos tu pago. La actualización de la cuenta puede demorar.' : a.phantom_posting_state === 'NEEDS_REVIEW' ? 'Recibimos tu pago. Estamos verificando la actualización de la cuenta.' : 'Recibimos tu pago. La actualización de la cuenta puede demorar.';
  const postingCandidates = runtime.paymentItems.filter(a => runtime.phantomPostingEnabled && a.can_post_to_phantom);
  const verificationCandidates = runtime.paymentItems.filter(a => runtime.phantomPostingEnabled && ['POSTING', 'POST_UNCONFIRMED'].includes(a.phantom_posting_state));
  const headingAction = postingCandidates.length === 1
    ? button('Actualizar cuenta', 'payment-post', { secondary: true, attrs: `data-attempt="${e(postingCandidates[0].attempt_id)}"` })
    : verificationCandidates.length === 1
      ? button('Consultar actualización', 'payment-post', { secondary: true, attrs: `data-attempt="${e(verificationCandidates[0].attempt_id)}"` })
      : '';
  return `<section class="payment-status" aria-label="Movimientos de pago" aria-live="polite"><div class="movement-heading"><h2>Últimos movimientos</h2>${headingAction}</div>${runtime.paymentError ? `<p role="alert">${e(runtime.paymentError)}</p>` : ''}${runtime.paymentItems.length ? runtime.paymentItems.map(a => `<div class="commercial-option"><h3>${a.phantom_payment_posted ? 'Pago registrado' : (labels[a.state] || labels.UNCONFIRMED)}</h3><p>Factura ${e(a.idt)} · ${money(a.amount)}</p><p class="field-hint">${a.siro_payment_confirmed ? postingCopy(a) : a.state === 'CANCELLED' ? 'El pago no se completó y tu cuenta no tuvo cambios.' : 'Consultá el estado para conocer el resultado del pago.'}</p>${canCheck(a.state) ? button('Consultar estado', 'payment-check', { secondary: true, attrs: `data-attempt="${e(a.attempt_id)}"` }) : ''}${a.can_resume ? button('Continuar con el pago', 'pay', { secondary: true, iconName: 'external-link', attrs: `data-id="${e(a.idt)}"` }) : ''}</div>`).join('') : '<p class="muted">Todavía no hay movimientos para mostrar.</p>'}</section>`;
}
