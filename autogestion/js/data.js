// Live state starts empty. Demo fixtures are loaded only after server bootstrap.
export const runtime = { mode: null, backend: true, loading: false, error: '', warnings: [], nextOffset: null };
const emptyCustomer = () => ({ name: null, email: null, phone: null, address: null, city: null, plan: null, serviceStatus: null, network: null, speed: null });
export let customer = emptyCustomer();
export let invoices = [];
export let ticket = null;
export let debt = null;
export let credit = null;
export let nextDue = null;
export const display = value => value === null || value === undefined || value === '' ? 'No disponible' : String(value);
export const money = value => typeof value === 'number' && Number.isFinite(value) ? '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value) : 'No disponible';
export function clearData() { customer = emptyCustomer(); invoices = []; ticket = null; debt = null; credit = null; nextDue = null; runtime.nextOffset = null; runtime.warnings = []; }
export async function initialize(mode) {
  if (!['demo', 'phantom'].includes(mode)) throw new Error('Modo de servidor no válido.');
  runtime.mode = mode; clearData();
  if (mode === 'demo') {
    const demo = await import('./demo-data.js');
    customer = { ...demo.customer, speed: '300 Mbps' }; invoices = demo.invoices.map(i => ({ ...i })); ticket = { ...demo.ticket }; debt = demo.debt; nextDue = '20/09/2026';
  }
}
export function applyOverview(data) {
  customer = { ...emptyCustomer(), ...data.customer }; invoices = data.invoices.items;
  debt = data.account.debt; credit = data.account.credit; nextDue = data.nextDue;
  runtime.warnings = data.warnings; runtime.nextOffset = data.invoices.nextOffset;
}
export function appendInvoices(data) { const ids = new Set(invoices.map(i=>i.id)); invoices.push(...data.items.filter(i=>!ids.has(i.id))); runtime.nextOffset = data.nextOffset; }
