// Live state starts empty. Demo fixtures are loaded only after server bootstrap.
export const runtime = { mode: null, services: [], selectedServiceId: null, servicesUnavailable: false, paymentsEnabled: false, phantomPostingEnabled: false, paymentHistoryEnabled: false, paymentItems: [], paymentError: '', paymentHistoryItems: [], paymentHistoryError: '', movementPage: 0, billingView: 'invoices', billingRefreshing: false, backend: true, loading: false, error: '', warnings: [], nextOffset: null, endReached: false, invoicesLoading: false, servicePresentation: null, commercialOffers: [] };
const emptyCustomer = () => ({ name: null, email: null, phone: null, address: null, city: null, plan: null, products: null, serviceStatus: null, connectionState: null, equipmentState: null, network: null, speed: null });
runtime.connectionRefreshing=false;runtime.connectionDetails=null;runtime.connectionError='';
runtime.serviceOptions=[];runtime.serviceRequests=[];
export let customer = emptyCustomer();
export let invoices = [];
export let ticket = null;
export let debt = null;
export let credit = null;
export let nextDue = null;
export const display = value => value === null || value === undefined || value === '' ? 'No disponible' : String(value);
export const money = value => typeof value === 'number' && Number.isFinite(value) ? '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value) : 'No disponible';
export function clearData() { runtime.serviceRequestsUnavailable=false;runtime.serviceOptions=[];runtime.serviceRequests=[];runtime.connectionRefreshing=false;runtime.connectionDetails=null;runtime.connectionError=""; runtime.servicePresentation=null;runtime.commercialOffers=[]; runtime.paymentItems = []; runtime.paymentError = ''; runtime.paymentHistoryItems = []; runtime.paymentHistoryError = ''; runtime.movementPage = 0; customer = emptyCustomer(); invoices = []; ticket = null; debt = null; credit = null; nextDue = null; runtime.nextOffset = null; runtime.endReached = false; runtime.invoicesLoading = false; runtime.warnings = []; }
export async function initialize(mode) {
  if (!['demo', 'phantom'].includes(mode)) throw new Error('Modo de servidor no válido.');
  runtime.mode = mode; clearData();
  if (mode === 'demo') {
    const demo = await import('./demo-data.js');
    customer = { ...demo.customer, speed: '300 Mbps' }; invoices = demo.invoices.map(i => ({ ...i })); ticket = { ...demo.ticket }; debt = demo.debt; nextDue = '20/09/2026';
    runtime.servicePresentation = demo.servicePresentation; runtime.commercialOffers = demo.commercialOffers;
  }
}
export function applyOverview(data) {
  runtime.serviceOptions=data.serviceOptions||[];runtime.serviceRequests=data.serviceRequests||[];runtime.serviceRequestsUnavailable=data.serviceRequestsUnavailable===true;runtime.servicePresentation=data.servicePresentation&&typeof data.servicePresentation==='object'?data.servicePresentation:null;runtime.commercialOffers=Array.isArray(data.commercialOffers)?data.commercialOffers:[];
  customer = { ...emptyCustomer(), ...data.customer }; invoices = data.invoices.items;
  debt = data.account.debt; credit = data.account.credit; nextDue = data.nextDue;
  runtime.warnings = data.warnings; runtime.nextOffset = data.invoices.nextOffset; runtime.endReached = data.invoices.endReached === true;
}
export function appendInvoices(data) {
  const ids = new Set(invoices.map(i=>i.id));
  for (const item of data.items) if (!ids.has(item.id)) { invoices.push(item); ids.add(item.id); }
  runtime.nextOffset = data.nextOffset; runtime.endReached = data.endReached === true;
}

// Presentation only: retain the original Phantom values in state and hide CRM annotations.
export function planLabel(value) {
  if (typeof value !== 'string') return value;
  const cleaned = value
    .replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*/, '')
    // Phantom prefixes plans with internal customer segments such as
    // RES ($), EMP ($), COM ($) or MUNI ($). Keep them in state, hide in UI.
    .replace(/^\s*[A-ZÁÉÍÓÚÑ]{2,12}\s*\(\s*\$\s*\)\s*-\s*/i, '');
  return cleaned.trim() ? cleaned : value;
}
export function addressLabel(value) {
  if (typeof value !== 'string') return value;
  const cleaned = value.split(/\s*·\s*(?=(?:Lote|Manzana|Referencia|Barrio)\s*:)/i, 1)[0].trim();
  return cleaned || value;
}

export function connectivityLabel(value) {
  if (value === 'online') return 'En línea';
  if (value === 'offline') return 'Sin conexión';
  return 'No disponible';
}
