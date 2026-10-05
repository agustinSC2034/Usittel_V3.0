import { money, runtime } from './data.js';

export const escapeHTML = value => String(value ?? 'No disponible').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"></use></svg>`;
export const logo = () => '<img class="brand-logo" src="assets/usittel-logo.png" width="492" height="130" alt="USITTEL">';
export const routes = [
  ['inicio', 'Inicio', 'home'], ['facturas', 'Facturas', 'file-text'],
  ['servicio', 'Mi servicio', 'wifi'], ['soporte', 'Soporte', 'headphones'], ['cuenta', 'Mi cuenta', 'user'],
];
export const status = value => `<span class="status status-${['Pagada','Activo','Pago confirmado','Pago registrado','En línea'].includes(value) ? 'success' : value === 'Vencida' || value === 'Suspendido' ? 'danger' : ['Pendiente','En revisión','Sin conexión'].includes(value) ? 'pending' : 'neutral'}">${escapeHTML(value)}</span>`;
export function operationAlert(tone, title, description = '') {
  const safeTone = ['success', 'warning', 'error', 'info'].includes(tone) ? tone : 'info';
  const symbols = { success: 'check', warning: 'alert-triangle', error: 'alert-circle', info: 'info' };
  return `<div class="operation-alert operation-alert-${safeTone}">${icon(symbols[safeTone])}<div><strong>${escapeHTML(title)}</strong>${description ? `<p>${escapeHTML(description)}</p>` : ''}</div></div>`;
}
const confirmedAttempt = item => runtime.mode === 'phantom' ? runtime.paymentItems.find(a => a.idt === item.id && a.state === 'CONFIRMED') : null;
const activePaymentAttempt = item => runtime.mode === 'phantom' ? confirmedAttempt(item) || runtime.paymentItems.find(a => a.idt === item.id && !['CANCELLED','REJECTED'].includes(a.state)) || runtime.paymentItems.find(a => a.idt === item.id) : null;
export function invoiceVisibleStatus(item) {
  const attempt = confirmedAttempt(item);
  if (item.status === 'Pagada' || !attempt) return { label: item.status, hint: '' };
  if (attempt.phantom_payment_posted || attempt.phantom_posting_state === 'ALREADY_SETTLED') return { label: 'Pagada', hint: '' };
  return { label: 'Pago confirmado', hint: attempt.phantom_posting_state === 'NEEDS_REVIEW' ? 'Estamos verificando la actualización de tu cuenta.' : 'Estamos actualizando tu cuenta.' };
}
export function navigation(active, mobile = false) {
  return `<nav class="${mobile ? 'bottom-nav' : 'top-nav'}" aria-label="${mobile ? 'Navegación móvil' : 'Navegación principal'}">${routes.map(([id, label, symbol]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ''}>${mobile ? icon(symbol) : ''}<span>${label}</span></a>`).join('')}</nav>`;
}
export function shell(active, content) {
  const selected = runtime.services.find(service => service.id === runtime.selectedServiceId);
  const selector = runtime.services.length > 1 && selected
    ? `<div class="current-service" aria-label="Servicio actual"><div class="current-service-inner"><div><span class="current-service-label">Servicio actual</span><span class="current-service-address">${escapeHTML(selected.address || 'Domicilio no disponible')}</span><span class="current-service-contract">Contrato N.º ${escapeHTML(selected.id)}</span></div><button type="button" class="current-service-change" data-action="choose-service" aria-haspopup="dialog">Cambiar servicio ${icon('chevron-down')}</button></div></div>`
    : '';
  return `<header class="app-header"><div class="header-inner"><a class="brand" href="#/inicio" aria-label="Mi USITTEL, inicio">${logo()}<span class="brand-name">Mi USITTEL</span></a>${navigation(active)}</div></header>${selector}<main id="main" class="page page-${active}">${content}</main>${navigation(active, true)}`;
}
export const button = (label, action, { secondary = false, iconName = '', attrs = '', type = 'button' } = {}) => `<button type="${type}" class="button ${secondary ? 'button-secondary' : ''}" ${action ? `data-action="${action}"` : ''} ${attrs}>${iconName ? icon(iconName) : ''}${label}</button>`;
export const action = (label, name, id, symbol = '') => `<button class="text-action" type="button" data-action="${name}" data-id="${id}">${symbol ? icon(symbol) : ''}${label}</button>`;
export function input(label, name, { value = '', type = 'text', required = true, autocomplete = 'off', hint = '', extra = '' } = {}) {
  return `<div class="field"><label for="${name}">${label}</label><div class="input-wrap"><input id="${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${required ? 'required' : ''} autocomplete="${autocomplete}" ${hint ? `aria-describedby="${name}-hint"` : ''} ${extra}>${type === 'password' ? `<button type="button" class="password-toggle" data-action="toggle-password" data-input="${name}" aria-label="Mostrar ${label.toLowerCase()}" aria-pressed="false">${icon('eye')}</button>` : ''}</div>${hint ? `<p id="${name}-hint" class="field-hint">${hint}</p>` : ''}</div>`;
}
export function invoicePayButton(item, attrs = '') {
  const real = runtime.mode === 'phantom';
  const active = activePaymentAttempt(item);
  const resumable = ['PENDING', 'UNCONFIRMED'].includes(active?.state) && active.can_resume === true;
  const renewable = ['CANCELLED', 'REJECTED'].includes(active?.state) && active.phantom_posting_state === 'NOT_POSTED';
  const openable = resumable || renewable;
  const checkable = active?.state === 'UNCONFIRMED' && !resumable;
  const label = active?.state === 'CONFIRMED' ? (active.phantom_payment_posted || active.phantom_posting_state === 'ALREADY_SETTLED' ? 'Pago registrado' : 'Pago confirmado') : checkable ? 'Consultar estado' : active && !openable ? 'Pago en verificación' : 'Pagar';
  return button(label, openable ? 'payment-resume' : checkable ? 'payment-check' : 'pay', { iconName: openable || !active ? 'external-link' : '', attrs: `data-id="${escapeHTML(item.id)}" ${openable || checkable ? `data-attempt="${escapeHTML(active.attempt_id)}"` : ''} ${attrs} ${real && (!runtime.paymentsEnabled || (active && !openable && !checkable)) ? 'disabled' : ''}` });
}
export function invoiceActions(item) {
  const real = runtime.mode === 'phantom';
  return `<div class="invoice-actions">${action('Ver factura', 'invoice', item.id, 'file-text')}${real && !item.downloadAvailable ? `<button class="text-action" disabled title="La descarga de esta factura no está disponible">${icon('download')}Descargar factura</button>` : action('Descargar factura', 'download-invoice', item.id, 'download')}${(real ? invoiceVisibleStatus(item).label !== 'Pagada' && item.status === 'Pendiente' : item.status !== 'Pagada') ? invoicePayButton(item) : ''}</div>`;
}
export function invoiceTable(items, full = false) {
  if (!items.length) return `<p class="muted">${runtime.warnings.includes('INVOICES_UNAVAILABLE') ? 'Facturas no disponibles en este momento.' : 'No hay facturas para mostrar.'}</p>`;
  return `<div class="invoice-table ${full ? 'invoice-table-full' : 'invoice-table-preview'}" role="table" aria-label="${full ? 'Facturas y comprobantes' : 'Últimas facturas'}"><div class="invoice-head" role="row"><span role="columnheader">Período</span><span role="columnheader">Importe</span>${full ? '<span role="columnheader">Vencimiento</span>' : ''}<span role="columnheader">Estado</span>${full ? '<span role="columnheader">Acciones</span>' : ''}</div>${items.map(item => { const visible = invoiceVisibleStatus(item); return `<div class="invoice-row" role="row"><span class="invoice-period" role="cell">${escapeHTML(item.period)}</span><span class="invoice-amount" role="cell">${money(item.amount)}</span>${full ? `<span class="invoice-due" role="cell"><span class="mobile-only">Vence el </span>${escapeHTML(item.due)}</span>` : ''}<span class="invoice-status" role="cell">${status(visible.label)}${full && visible.hint ? `<small>${escapeHTML(visible.hint)}</small>` : ''}</span>${full ? `<div class="invoice-action-cell" role="cell">${invoiceActions(item)}</div>` : ''}</div>`; }).join('')}</div>`;
}
export const sectionLink = (label, actionName, symbol = 'chevron-right') => `<button type="button" class="list-link" data-action="${actionName}"><span>${label}</span>${icon(symbol)}</button>`;
