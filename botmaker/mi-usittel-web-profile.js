// New code action for Mi USITTEL Web ONLY. Run once at flow entry, never RUN_ALWAYS.
// Accept only the dedicated Central App Entry namespace; anonymous IDs do not match.
// Store the three MI_WEB_PHANTOM_* values as private action constants, never here.
//@constant('URL HTTPS de Phantom para Mi USITTEL Web')
const MI_WEB_PHANTOM_URL = '';
//@constant('Usuario técnico de Phantom para Mi USITTEL Web')
const MI_WEB_PHANTOM_USER = '';
//@constant('Clave técnica de Phantom para Mi USITTEL Web')
const MI_WEB_PHANTOM_PASS = '';
(async () => {
  try {
    if (context.userData.CHAT_PLATFORM_ID === 'whatsapp') return;
    user.set('nombre_form', '');
    user.set('telefono_form', '');
    const subject = [context.userData.PLATFORM_CONTACT_ID, user.get('userIdOnBusiness')]
      .find(value => typeof value === 'string' && /^mi-usittel:[1-9][0-9]{0,9}$/.test(value));
    const match = typeof subject === 'string' && /^mi-usittel:([1-9][0-9]{0,9})$/.exec(subject);
    if (!match) return; // Anonymous visitors keep the normal questions.
    const constants = { MI_WEB_PHANTOM_URL, MI_WEB_PHANTOM_USER, MI_WEB_PHANTOM_PASS };
    const endpoint = new URL(constants.MI_WEB_PHANTOM_URL);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash
        || endpoint.pathname !== '/PHANTOM/Includes/API_Rest.php'
        || typeof constants.MI_WEB_PHANTOM_USER !== 'string' || !constants.MI_WEB_PHANTOM_USER
        || typeof constants.MI_WEB_PHANTOM_PASS !== 'string' || !constants.MI_WEB_PHANTOM_PASS) return;
    const options = { uri: endpoint.href, json: true, timeout: 10000, followRedirect: false, strictSSL: true };
    const auth = await rp({ ...options, method: 'GET', qs: { action: 'autentificar', JSON: 1,
      api_user: constants.MI_WEB_PHANTOM_USER, api_pass: constants.MI_WEB_PHANTOM_PASS } });
    if (!auth || typeof auth.token !== 'string' || !auth.token || auth.token.length > 8192) return;
    const rows = await rp({ ...options, method: 'POST', qs: { action: 'Consulta_Cliente_Avanzada', JSON: 1, IDA: match[1] }, body: { token: auth.token } });
    if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || Array.isArray(rows[0])) return;
    const row = rows[0];
    // Exact identity check; never use another row, IDAx, document or phone to guess.
    if (typeof row.ID !== 'string' || !/^[0-9]{1,10}$/.test(row.ID) || (row.ID.replace(/^0+/, '') || '0') !== match[1]) return;
    const text = value => typeof value === 'string' ? value.trim() : '';
    const name = text(row.Razon_Social) || [text(row.Nombre), text(row.Apellido)].filter(Boolean).join(' ');
    const phone = (text(row.Telefono) || text(row.Movil)).replace(/[\s()+.-]/g, '');
    if (name && name.length <= 200 && !/[\x00-\x1f]/.test(name)) user.set('nombre_form', name);
    if (/^[0-9]{7,15}$/.test(phone)) user.set('telefono_form', phone);
  } catch {
    // Missing or unavailable profile data falls through to manual capture.
    // Never send provider errors or customer data to logs or visitor messages.
  } finally { result.done(); }
})();
