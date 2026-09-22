let csrf = '';
let serviceRevision = '';
const apiUrl = route => {
  const [name, queryString] = route.split('?', 2);
  const params = new URLSearchParams();
  params.set('route', name);
  if (queryString) for (const [key, value] of new URLSearchParams(queryString)) params.append(key, value);
  return `server/production-router.php?${params.toString()}`;
};
const serviceHeaders = () => serviceRevision ? { 'X-Service-Revision': serviceRevision } : {};
async function pdf(route, failureMessage) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(apiUrl(route), { credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: serviceHeaders() });
    if (!response.ok) {
      const json = await response.json(); const error = new Error(json.error?.message || failureMessage);
      error.code = json.error?.code; error.status = response.status; throw error;
    }
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/pdf') throw new Error('Documento no válido.');
    const reader = response.body.getReader(); const chunks = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 10485760) { await reader.cancel(); throw new Error('El documento supera el tamaño permitido.'); }
      chunks.push(value);
    }
    return new Blob(chunks, { type: 'application/pdf' });
  } finally { clearTimeout(timer); }
}
export const invoicePdf = id => pdf(`invoice-document?id=${encodeURIComponent(id)}`, 'No pudimos descargar la factura.');
export const paymentReceiptPdf = id => pdf(`payment-receipt?id=${encodeURIComponent(id)}`, 'No pudimos descargar el comprobante.');
export async function request(route, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), route.startsWith('payment-') ? 110000 : 65000);
  try {
    const response = await fetch(apiUrl(route), { credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: serviceHeaders(),
      ...(data === undefined ? {} : { method: 'POST', headers: { ...serviceHeaders(), 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(data) }) });
    const json = await response.json();
    if (!response.ok) { const error = new Error(json.error?.message || 'No pudimos consultar la información.'); error.code = json.error?.code; error.status = response.status; throw error; }
    if (json.csrf) csrf = json.csrf;
    if (['bootstrap', 'login', 'select-service'].includes(route)) serviceRevision = json.serviceRevision || '';
    return json;
  } catch (error) {
    if (error.status) throw error;
    throw new Error('No pudimos conectar con Mi USITTEL. Volvé a intentar.');
  } finally { clearTimeout(timer); }
}
