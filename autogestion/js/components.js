import { money, runtime } from './data.js';

export const escapeHTML = value => String(value ?? 'No disponible').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"></use></svg>`;
export const logo = () => '<img class="brand-logo" src="assets/usittel-logo.png" width="492" height="130" alt="USITTEL">';
export const routes = [
  ['inicio', 'Inicio', 'home'], ['facturas', 'Facturas', 'file-text'],
  ['servicio', 'Mi servicio', 'wifi'], ['soporte', 'Soporte', 'headphones'], ['cuenta', 'Mi cuenta', 'user'],
];
export const status = value => `<span class="status status-${value === 'Pagada' || value === 'Activo' ? 'success' : value === 'Vencida' || value === 'Suspendido' ? 'danger' : value === 'Pendiente' || value === 'En revisión' ? 'pending' : 'neutral'}">${escapeHTML(value)}</span>`;
export function navigation(active, mobile = false) {
  return `<nav class="${mobile ? 'bottom-nav' : 'top-nav'}" aria-label="${mobile ? 'Navegación móvil' : 'Navegación principal'}">${routes.map(([id, label, symbol]) => `<a href="#/${id}" ${active === id ? 'aria-current="page"' : ''}>${mobile ? icon(symbol) : ''}<span>${label}</span></a>`).join('')}</nav>`;
}
export function shell(active, content) {
  return `<header class="app-header"><div class="header-inner"><a class="brand" href="#/inicio" aria-label="Mi USITTEL, inicio">${logo()}<span class="brand-name">Mi USITTEL</span></a>${navigation(active)}</div></header><main id="main" class="page page-${active}">${content}</main>${navigation(active, true)}`;
}
export const button = (label, action, { secondary = false, iconName = '', attrs = '', type = 'button' } = {}) => `<button type="${type}" class="button ${secondary ? 'button-secondary' : ''}" ${action ? `data-action="${action}"` : ''} ${attrs}>${iconName ? icon(iconName) : ''}${label}</button>`;
export const action = (label, name, id, symbol = '') => `<button class="text-action" type="button" data-action="${name}" data-id="${id}">${symbol ? icon(symbol) : ''}${label}</button>`;
export function input(label, name, { value = '', type = 'text', required = true, autocomplete = 'off', hint = '', extra = '' } = {}) {
  return `<div class="field"><label for="${name}">${label}</label><div class="input-wrap"><input id="${name}" name="${name}" type="${type}" value="${escapeHTML(value)}" ${required ? 'required' : ''} autocomplete="${autocomplete}" ${hint ? `aria-describedby="${name}-hint"` : ''} ${extra}>${type === 'password' ? `<button type="button" class="password-toggle" data-action="toggle-password" data-input="${name}" aria-label="Mostrar ${label.toLowerCase()}" aria-pressed="false">${icon('eye')}</button>` : ''}</div>${hint ? `<p id="${name}-hint" class="field-hint">${hint}</p>` : ''}</div>`;
}
export function invoiceActions(item) {
  const real = runtime.mode === 'phantom';
  return `<div class="invoice-actions">${action('Ver', 'invoice', item.id, 'file-text')}${real && !item.downloadAvailable ? '<button class="text-action" disabled title="Las descargas todavía no están habilitadas">Descargar</button>' : action('Descargar', 'download-invoice', item.id, 'download')}${item.status !== 'Pagada' ? button('Pagar', 'pay', { attrs: `data-id="${escapeHTML(item.id)}" ${real ? 'disabled title="Pagos todavía no habilitados"' : ''}` }) : real ? '<button class="text-action" disabled title="Comprobantes todavía no habilitados">Comprobante</button>' : action('Comprobante', 'receipt', item.id, 'check-circle')}</div>`;
}
export function invoiceTable(items, full = false) {
  if (!items.length) return `<p class="muted">${runtime.warnings.includes('INVOICES_UNAVAILABLE') ? 'Facturas no disponibles en este momento.' : 'No hay facturas para mostrar.'}</p>`;
  return `<div class="invoice-table ${full ? 'invoice-table-full' : 'invoice-table-preview'}" role="table" aria-label="${full ? 'Facturas y comprobantes' : 'Últimas facturas'}"><div class="invoice-head" role="row"><span role="columnheader">Período</span><span role="columnheader">Importe</span>${full ? '<span role="columnheader">Vencimiento</span>' : ''}<span role="columnheader">Estado</span>${full ? '<span role="columnheader">Acciones</span>' : ''}</div>${items.map(item => `<div class="invoice-row" role="row"><span class="invoice-period" role="cell">${escapeHTML(item.period)}</span><span class="invoice-amount" role="cell">${money(item.amount)}</span>${full ? `<span class="invoice-due" role="cell"><span class="mobile-only">Vence el </span>${escapeHTML(item.due)}</span>` : ''}<span class="invoice-status" role="cell">${status(item.status)}</span>${full ? `<div class="invoice-action-cell" role="cell">${invoiceActions(item)}</div>` : ''}</div>`).join('')}</div>`;
}
export const sectionLink = (label, actionName, symbol = 'chevron-right') => `<button type="button" class="list-link" data-action="${actionName}"><span>${label}</span>${icon(symbol)}</button>`;
