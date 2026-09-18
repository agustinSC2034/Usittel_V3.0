let csrf = '';
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
