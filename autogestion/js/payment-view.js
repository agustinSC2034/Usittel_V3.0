import { runtime, money } from './data.js';
import { escapeHTML as e, button, icon } from './components.js';

const MOVEMENTS_PER_PAGE = 10;

export function paymentPanel() {
  if (!runtime.paymentsEnabled && !runtime.paymentHistoryEnabled) return '';
  const labels = { CREATING: 'Preparando pago...', PENDING: 'Pago pendiente', CONFIRMED: 'Pago confirmado', CANCELLED: 'Pago cancelado', REJECTED: 'Pago rechazado', UNCONFIRMED: 'No pudimos confirmar el pago' };
  const canCheck = state => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(state);
  const postingCopy = a => a.phantom_payment_posted ? 'Tu pago ya fue registrado en la cuenta.' : a.phantom_posting_state === 'ALREADY_SETTLED' ? 'Tu cuenta ya estaba actualizada.' : a.phantom_posting_state === 'POST_UNCONFIRMED' || a.phantom_posting_state === 'POSTING' ? 'Recibimos tu pago. La actualización de la cuenta puede demorar.' : a.phantom_posting_state === 'NEEDS_REVIEW' ? 'Recibimos tu pago. Estamos verificando la actualización de la cuenta.' : 'Recibimos tu pago. La actualización de la cuenta puede demorar.';
  const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
  const invoiceFor = item => {
    if (String(item.method).trim().toUpperCase() !== 'SIRO MI USITTEL') return null;
    const sameHistory = runtime.paymentHistoryItems.filter(other => Number(other.amount) === Number(item.amount) && String(other.method).trim().toUpperCase() === 'SIRO MI USITTEL');
    const candidates = runtime.paymentItems.filter(attempt => attempt.state === 'CONFIRMED' && attempt.phantom_payment_posted && Number(attempt.amount) === Number(item.amount));
    return sameHistory.length === 1 && candidates.length === 1 ? candidates[0].idt : null;
  };
  const registered = runtime.paymentHistoryItems.map((item,index) => { const invoiceId=invoiceFor(item); return { date:item.date, priority:0, index, html:`<div class="commercial-option"><h3>Pago registrado</h3><p>${invoiceId ? `Factura ${e(invoiceId)}` : `Comprobante ${e(item.id)}`} · ${money(item.amount)}</p><p class="field-hint">${date(e(item.date))}</p>${item.downloadAvailable ? `<button type="button" class="text-action payment-receipt-action" data-action="download-payment-receipt" data-payment-id="${e(item.id)}" aria-label="Descargar comprobante de pago">${icon('download')}Descargar</button>` : ''}</div>` }; });
  const attempts = runtime.paymentItems.filter(a => !(a.phantom_payment_posted && runtime.paymentHistoryItems.length));
  const attemptRows = attempts.map((a,index) => ({ date:String(a.updated_at || a.created_at || '').slice(0,10), priority:1, index, html:`<div class="commercial-option"><h3>${a.phantom_payment_posted ? 'Pago registrado' : (labels[a.state] || labels.UNCONFIRMED)}</h3><p>Factura ${e(a.idt)} · ${money(a.amount)}</p><p class="field-hint">${a.siro_payment_confirmed ? postingCopy(a) : a.state === 'CANCELLED' ? 'El pago no se completó y tu cuenta no tuvo cambios.' : 'Consultá el estado para conocer el resultado del pago.'}</p>${canCheck(a.state) ? button('Consultar estado', 'payment-check', { secondary: true, attrs: `data-attempt="${e(a.attempt_id)}"` }) : ''}${a.can_resume ? button('Continuar con el pago', 'pay', { secondary: true, iconName: 'external-link', attrs: `data-id="${e(a.idt)}"` }) : ''}</div>` }));
  const movements=[...registered,...attemptRows].sort((a,b)=>b.date.localeCompare(a.date)||a.priority-b.priority||a.index-b.index);
  const pages=Math.max(1,Math.ceil(movements.length/MOVEMENTS_PER_PAGE));
  const page=Math.min(Math.max(0,runtime.movementPage),pages-1);
  const visible=movements.slice(page*MOVEMENTS_PER_PAGE,(page+1)*MOVEMENTS_PER_PAGE).map(row=>row.html).join('');
  const pagination=movements.length>MOVEMENTS_PER_PAGE ? `<nav class="movement-pagination" aria-label="Páginas de movimientos"><button type="button" class="text-action" data-action="movement-page" data-page="${page-1}" ${page===0?'disabled':''}>Anterior</button><span>Página ${page+1} de ${pages}</span><button type="button" class="text-action" data-action="movement-page" data-page="${page+1}" ${page===pages-1?'disabled':''}>Siguiente</button></nav>` : '';
  const errors=[runtime.paymentHistoryError,runtime.paymentError].filter(Boolean).map(message=>`<p role="alert">${e(message)}</p>`).join('');
  return `<section class="payment-status" aria-label="Movimientos de pago" aria-live="polite"><div class="movement-heading"><h2>Últimos movimientos</h2></div>${errors}${visible}${!movements.length ? '<p class="muted">Todavía no hay movimientos para mostrar.</p>' : ''}${pagination}</section>`;
}
