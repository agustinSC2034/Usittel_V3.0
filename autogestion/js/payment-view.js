import { runtime, money } from './data.js';
import { escapeHTML as e, button, icon, operationAlert } from './components.js';

const MOVEMENTS_PER_PAGE = 10;

export function paymentStatusBanner() {
  const focus = runtime.paymentFocus;
  if (!focus || String(runtime.selectedServiceId) !== focus.serviceId) return '';
  const attempt = runtime.paymentItems.find(item => item.attempt_id === focus.attemptId);
  if (!attempt) return '';
  if (attempt.state === 'CANCELLED') return operationAlert('info', 'Pago cancelado', 'El pago no se completó y tu cuenta no tuvo cambios.');
  if (attempt.state === 'REJECTED') return operationAlert('error', 'Pago rechazado', 'El pago no se completó y tu cuenta no tuvo cambios.');
  if (attempt.state !== 'CONFIRMED') return operationAlert('warning', 'Estamos verificando tu pago', 'Por favor, aguardá unos minutos mientras actualizamos el estado de tu cuenta. No vuelvas a pagar esta factura por ahora.');
  if (attempt.phantom_payment_posted || attempt.phantom_posting_state === 'POSTED') return operationAlert('success', 'Pago registrado correctamente', 'Tu pago ya fue registrado en tu cuenta.');
  if (attempt.phantom_posting_state === 'ALREADY_SETTLED') return operationAlert('success', 'Pago registrado correctamente', 'Tu cuenta ya se encontraba actualizada.');
  if (attempt.phantom_posting_state === 'NEEDS_REVIEW') return operationAlert('warning', 'Pago recibido', 'Estamos verificando la actualización de tu cuenta. No vuelvas a realizar el pago.');
  return operationAlert('success', 'Pago recibido correctamente', 'Recibimos tu pago. Puede tardar unos minutos en verse reflejado en el estado de tu cuenta. No es necesario que vuelvas a pagarlo.');
}

export function paymentPanel() {
  if (!runtime.paymentsEnabled && !runtime.paymentHistoryEnabled) return '';
  const labels = { CREATING: 'Preparando pago...', PENDING: 'Pago en proceso', CONFIRMED: 'Pago confirmado', CANCELLED: 'Pago cancelado', REJECTED: 'Pago rechazado', UNCONFIRMED: 'Estamos verificando tu pago' };
  const canCheck = state => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(state);
  const postingCopy = a => a.phantom_payment_posted ? 'Tu pago ya fue registrado en la cuenta.' : a.phantom_posting_state === 'ALREADY_SETTLED' ? 'Tu cuenta ya estaba actualizada.' : a.phantom_posting_state === 'POST_UNCONFIRMED' || a.phantom_posting_state === 'POSTING' ? 'Pago confirmado. La actualización de tu cuenta puede demorar. No vuelvas a pagar.' : a.phantom_posting_state === 'NEEDS_REVIEW' ? 'Pago confirmado. Estamos revisando la actualización de tu cuenta. No vuelvas a pagar.' : 'Estamos actualizando tu cuenta. No vuelvas a pagar.';
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
  const invoiceFor = item => {
    if (String(item.method).trim().toUpperCase() !== 'SIRO MI USITTEL') return null;
    const sameHistory = runtime.paymentHistoryItems.filter(other => Number(other.amount) === Number(item.amount) && String(other.method).trim().toUpperCase() === 'SIRO MI USITTEL');
    const candidates = runtime.paymentItems.filter(attempt => attempt.state === 'CONFIRMED' && attempt.phantom_payment_posted && Number(attempt.amount) === Number(item.amount));
    return sameHistory.length === 1 && candidates.length === 1 ? candidates[0].idt : null;
  };
  const registered = runtime.paymentHistoryItems.map((item,index) => { const invoiceId=invoiceFor(item); return { date:item.date, priority:0, index, html:`<div class="commercial-option"><h3>Pago registrado</h3><p>${invoiceId ? `Factura ${e(invoiceId)}` : `Comprobante ${e(item.id)}`} · ${money(item.amount)}</p><p class="field-hint">${date(e(item.date))}</p>${item.downloadAvailable ? `<button type="button" class="text-action payment-receipt-action" data-action="download-payment-receipt" data-payment-id="${e(item.id)}" aria-label="Descargar comprobante de pago">${icon('download')}Descargar</button>` : ''}</div>` }; });
  const attempts = runtime.paymentItems.filter(a => !(a.phantom_payment_posted && runtime.paymentHistoryItems.some(item => invoiceFor(item) === a.idt)));
  const attemptRows = attempts.map((a,index) => ({ date:String(a.updated_at || a.created_at || '').slice(0,10), priority:1, index, html:`<div class="commercial-option"><h3>${a.phantom_payment_posted || a.phantom_posting_state === 'ALREADY_SETTLED' ? 'Pago registrado' : (labels[a.state] || labels.UNCONFIRMED)}</h3><p>Factura ${e(a.idt)} · ${money(a.amount)}</p><p class="field-hint">${a.siro_payment_confirmed ? postingCopy(a) : a.state === 'CANCELLED' ? 'El pago no se completó y tu cuenta no tuvo cambios.' : a.state === 'REJECTED' ? 'El pago fue rechazado y tu cuenta no tuvo cambios.' : 'Todavía no pudimos confirmar el resultado. No vuelvas a pagar.'}</p>${canCheck(a.state) ? button('Consultar estado', 'payment-check', { secondary: true, attrs: `data-attempt="${e(a.attempt_id)}"` }) : ''}</div>` }));
  const movements=[...registered,...attemptRows].sort((a,b)=>b.date.localeCompare(a.date)||a.priority-b.priority||a.index-b.index);
  const pages=Math.max(1,Math.ceil(movements.length/MOVEMENTS_PER_PAGE));
  const page=Math.min(Math.max(0,runtime.movementPage),pages-1);
  const visible=movements.slice(page*MOVEMENTS_PER_PAGE,(page+1)*MOVEMENTS_PER_PAGE).map(row=>row.html).join('');
  const pagination=movements.length>MOVEMENTS_PER_PAGE ? `<nav class="movement-pagination" aria-label="Páginas de movimientos"><button type="button" class="text-action" data-action="movement-page" data-page="${page-1}" ${page===0?'disabled':''}>Anterior</button><span>Página ${page+1} de ${pages}</span><button type="button" class="text-action" data-action="movement-page" data-page="${page+1}" ${page===pages-1?'disabled':''}>Siguiente</button></nav>` : '';
  const errors=[runtime.paymentHistoryError,runtime.paymentError].filter(Boolean).map(message=>`<p role="alert">${e(message)}</p>`).join('');
  return `<section class="payment-status" aria-label="Movimientos de pago" aria-live="polite"><div class="movement-heading"><h2>Últimos movimientos</h2></div>${errors}${visible}${!movements.length ? '<p class="muted">Todavía no hay movimientos para mostrar.</p>' : ''}${pagination}</section>`;
}
