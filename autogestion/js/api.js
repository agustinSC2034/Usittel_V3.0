let csrf = '';
export async function invoicePdf(id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(`api/invoice-document?id=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      const json = await response.json(); const error = new Error(json.error?.message || 'No pudimos descargar la factura.');
      error.status = response.status; throw error;
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
export async function request(route, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch(`api/${route}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      ...(data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(data) }) });
    const json = await response.json();
    if (!response.ok) { const error = new Error(json.error?.message || 'No pudimos consultar la información.'); error.code = json.error?.code; error.status = response.status; throw error; }
    if (json.csrf) csrf = json.csrf;
    return json;
  } catch (error) {
    if (error.status) throw error;
    throw new Error('No pudimos conectar con Mi USITTEL. Volvé a intentar.');
  } finally { clearTimeout(timer); }
}
