import { request, invoicePdf } from './api.js';
import { customer, invoices, ticket, money, runtime, initialize, clearData, applyOverview, appendInvoices } from './data.js';
import { shell, routes, status, icon, button, input, invoicePayButton, escapeHTML as e } from './components.js';
import { login, home, billing, service, support, account } from './views.js';
import { downloadDocument } from './documents.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toastElement = document.querySelector('#toast');
const views = { inicio: home, facturas: billing, servicio: service, soporte: support, cuenta: account };
const paymentNotice = '<p class="field-hint" id="payment-provider-note">Al seleccionar Pagar, serás redirigido al portal de SIRO, nuestro proveedor de pagos.</p>';
let authenticated = false;
let paymentBusy = false;
let serviceBusy = false;
function applyServices(data) { if (typeof data.payments_enabled === 'boolean') runtime.paymentsEnabled = data.payments_enabled; runtime.services = data.services || []; runtime.selectedServiceId = data.selectedServiceId || null; runtime.servicesUnavailable = data.servicesUnavailable === true; }
let dataGeneration = 0;

let speedTimer;
let toastTimer;
let lastTrigger;
let activeRoute;

function toast(message) {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add('visible');
  toastTimer = setTimeout(() => toastElement.classList.remove('visible'), 4500);
}
function openDialog(title, content) {
  if (!dialog.open) lastTrigger = document.activeElement;
  dialog.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button type="button" class="close-dialog" data-action="close" aria-label="Cerrar">${icon('x')}</button></div>${content}`;
  if (runtime.mode === 'phantom') dialog.querySelectorAll('[data-action]').forEach(control => {
    if (unavailable.includes(control.dataset.action)) { control.disabled = true; control.title = 'Todavía no disponible en esta etapa'; }
  });
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.close-dialog').focus();
}
dialog.addEventListener('close', () => { dialog.innerHTML = ''; if (lastTrigger?.isConnected) lastTrigger.focus(); });
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
const unavailable = ['recover', 'wifi', 'contact', 'password', 'upgrade-plan', 'addons', 'sales', 'speedtest', 'ticket', 'chat', 'download-receipt', 'receipt'];
function render() {
  clearInterval(speedTimer);
  if (dialog.open) dialog.close();
  let route = location.hash.replace('#/', '') || 'login';
  if (!authenticated) route = 'login';
  else if (route === 'login' || !views[route]) route = 'inicio';
  if (location.hash !== `#/${route}`) history.replaceState(null, '', `#/${route}`);
  const changed = activeRoute !== route;
  activeRoute = route;
  const notice = runtime.warnings.length ? '<p class="demo-notice" role="status">Parte de la información no está disponible o requiere revisión. El saldo de cuenta y el estado de cada factura pueden diferir.</p>' : '';
  const content = runtime.loading ? '<h1 tabindex="-1">Cargando tu información…</h1><p role="status">Un momento, por favor.</p>' : runtime.error ? `<h1 tabindex="-1">Información no disponible</h1><p role="alert">${e(runtime.error)}</p><div class="dialog-actions">${button('Volver a intentar', 'retry')}${button('Cerrar sesión', 'logout', { secondary: true })}</div>` : notice + views[route]?.();
  app.innerHTML = route === 'login' ? login() : shell(route, content);
  if (runtime.mode === 'phantom') {
    app.querySelectorAll('[data-action]').forEach(control => {
      if (unavailable.includes(control.dataset.action)) { control.disabled = true; control.title = 'Todavía no disponible en esta etapa'; }
      if (paymentBusy && ['pay', 'payment-check'].includes(control.dataset.action)) control.disabled = true;
    });
    const hint = document.createElement('p'); hint.className = 'field-hint';
    hint.textContent = route === 'login' ? 'La recuperación de contraseña todavía no está habilitada.' : (runtime.paymentsEnabled ? 'Laboratorio SIRO. Los pagos no se registran en Phantom. Otras modificaciones no están habilitadas.' : 'Modo lectura. Las acciones de pago y modificación todavía no están habilitadas.');
    app.querySelector('main').append(hint);
  }
  document.title = `Mi USITTEL · ${routes.find(([id]) => id === route)?.[1] || 'Ingresar'}`;
  if (changed) { window.scrollTo(0, 0); app.querySelector('h1')?.focus({ preventScroll: true }); }
}
function getInvoice(id) { return invoices.find(item => item.id === id); }
function invoiceDialog(item, receipt = false) {
  if (!item || (receipt && item.status !== 'Pagada')) return;
  if (runtime.mode === 'phantom') return openDialog('Detalle de factura', `<div class="document-summary"><h3>${e(item.period)}</h3><p class="amount">${money(item.amount)}</p>${status(item.status)}</div><dl class="dialog-details"><div><dt>Comprobante</dt><dd>${e(item.number)}</dd></div><div><dt>Tipo</dt><dd>${e(item.type)}</dd></div><div><dt>Primer vencimiento</dt><dd>${e(item.due)}</dd></div><div><dt>Segundo vencimiento</dt><dd>${e(item.secondDue)}</dd></div></dl><p class="field-hint">Importe total de la factura. El saldo de tu cuenta se muestra en Facturas.</p><div class="dialog-actions">${item.status === 'Pendiente' ? invoicePayButton(item, 'aria-describedby="payment-provider-note"') : ''}${button('Descargar factura','download-invoice',{secondary:true,attrs:`data-id="${e(item.id)}" ${item.downloadAvailable ? '' : 'disabled'}`})}</div><p class="field-hint">${runtime.paymentsEnabled ? 'Los pagos confirmados por SIRO no se registran en Phantom en esta etapa.' : (item.downloadAvailable ? 'Pagos todavía no habilitados.' : 'Pagos y descargas todavía no habilitados.')}</p>${paymentNotice}`);
  openDialog(receipt ? 'Comprobante de pago' : 'Detalle de factura', `<p class="demo-caption">Documento de ejemplo · Sin validez fiscal</p><div class="document-summary"><h3>${item.period}</h3><p class="amount">${money(item.amount)}</p>${status(item.status)}</div><dl class="dialog-details"><div><dt>Servicio</dt><dd>${customer.plan}</dd></div><div><dt>Domicilio</dt><dd>${customer.address}</dd></div><div><dt>Vencimiento</dt><dd>${item.due}</dd></div>${receipt ? `<div><dt>Fecha de pago de ejemplo</dt><dd>${item.paidAt}</dd></div>` : '<div><dt>Concepto</dt><dd>Abono mensual</dd></div>'}</dl><div class="dialog-actions">${!receipt && item.status !== 'Pagada' ? button('Pagar', 'pay', { iconName: 'external-link', attrs: `data-id="${item.id}" aria-describedby="payment-provider-note"` }) : ''}${button(receipt ? 'Descargar comprobante' : 'Descargar factura', receipt ? 'download-receipt' : 'download-invoice', { secondary: !receipt && item.status !== 'Pagada', iconName: 'download', attrs: `data-id="${item.id}"` })}</div>${!receipt && item.status !== 'Pagada' ? paymentNotice : ''}`);
}
const help = {
  'help-internet': ['No tengo internet', 'Revisá que el equipo esté encendido y que sus cables estén conectados. Si ves una luz roja o el problema continúa, contanos qué sucede por el chat.'],
  'help-wifi': ['Problemas con el Wi-Fi', 'Probá acercarte al equipo y verificá si el problema ocurre en más de un dispositivo. Si tenés conexión por cable, compará su funcionamiento con el Wi-Fi.'],
  'help-invoice': ['Consultas sobre facturas', 'En Facturas podés consultar tus períodos, descargar los documentos y ver los comprobantes de los pagos registrados. El botón Pagar te llevará al portal de SIRO cuando el servicio esté habilitado.'],
};
document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    const main = document.querySelector('#main');
    main.setAttribute('tabindex', '-1');
    main.focus();
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const item = getInvoice(target.dataset.id);
  if (action === 'choose-service') {
    if (serviceBusy || runtime.services.length < 2) return;
    openDialog('Elegí un servicio', `<div class="service-options">${runtime.services.map(s => `<button type="button" class="service-option" data-action="select-service" data-id="${e(s.id)}" aria-pressed="${s.id === runtime.selectedServiceId}"><strong>${s.id === runtime.selectedServiceId ? '&#10003; ' : ''}${e(s.address || 'No disponible')}</strong><span>${e(s.plan || 'No disponible')}</span><small>Contrato ${e(s.id)}</small></button>`).join('')}</div>`);
    return;
  }
  if (action === 'select-service') {
    if (serviceBusy) return;
    serviceBusy = true; ++dataGeneration; clearData(); runtime.loading = true; runtime.error = ''; render();
    try { applyServices(await request('select-service', { serviceId: target.dataset.id })); await loadOverview(); }
    catch (error) { runtime.loading = false; runtime.error = error.message; await handleError(error); render(); }
    finally { serviceBusy = false; }
    return;
  }
  if (runtime.mode === 'phantom' && unavailable.includes(action)) return toast('Esta función todavía no está disponible.');
  if (action === 'payment-invoices') { location.hash = '/facturas'; return; }
  if (runtime.mode === 'phantom' && (action === 'pay' || action === 'payment-check')) {
    if (!runtime.paymentsEnabled || paymentBusy) return;
    paymentBusy = true; target.disabled = true; const generation = dataGeneration;
    target.textContent = action === 'pay' ? 'Preparando pago...' : 'Consultando...';
    try {
      const result = await request(action === 'pay' ? 'payment-create' : 'payment-reconcile', action === 'pay' ? { idt: target.dataset.id } : { attempt_id: target.dataset.attempt });
      if (generation !== dataGeneration || !authenticated) return;
      await refreshPayments(false);
      if (result.checkout_url) {
        if (!/^https:\/\/siropagos\.bancoroela\.com\.ar\/Home\/Pago\/[a-f0-9]{64}$/.test(result.checkout_url)) throw new Error('No pudimos validar el portal de pagos.');
        window.location.assign(result.checkout_url);
      } else { location.hash = '/facturas'; render(); }
    } catch (error) { if (generation === dataGeneration) await handleError(error); }
    finally { paymentBusy = false; if (generation === dataGeneration) render(); }
    return;
  }
  if (action === 'boot-retry') return boot();
  if (action === 'retry') return loadOverview();
  if (action === 'more-invoices') {
    if (runtime.invoicesLoading || runtime.nextOffset === null) return;
    const generation = dataGeneration; const offset = runtime.nextOffset;
    runtime.invoicesLoading = true; render();
    try { const page = await request(`invoices?offset=${offset}`); if (generation === dataGeneration && authenticated) appendInvoices(page); }
    catch(error) { if (generation === dataGeneration) await handleError(error); }
    finally { if (generation === dataGeneration) { runtime.invoicesLoading = false; render(); } }
    return;
  }
  if (action === 'close') return dialog.close();
  if (action === 'toggle-password') {
    const field = document.getElementById(target.dataset.input);
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    target.setAttribute('aria-pressed', String(show));
    target.setAttribute('aria-label', `${show ? 'Ocultar' : 'Mostrar'} contraseña`);
    return;
  }
  if (action === 'invoice') {
    if (!item) return;
    if (runtime.mode === 'demo') return invoiceDialog(item);
    const generation = dataGeneration; const route = location.hash; target.disabled = true;
    try {
      const result = await request(`invoice?id=${encodeURIComponent(item.id)}`);
      if (generation === dataGeneration && authenticated && location.hash === route) { Object.assign(item, result.item); invoiceDialog(item); }
    } catch(error) { if (generation === dataGeneration) await handleError(error); }
    finally { target.disabled = false; }
    return;
  }
  if (action === 'receipt') return invoiceDialog(item, true);
  if (action === 'download-invoice' || action === 'download-receipt') {
    if (!item || (action === 'download-receipt' && item.status !== 'Pagada')) return;
    if (runtime.mode === 'phantom') {
      if (!item.downloadAvailable || action !== 'download-invoice') return;
      const generation = dataGeneration; target.disabled = true;
      try {
        const blob = await invoicePdf(item.id);
        if (generation !== dataGeneration || !authenticated) return;
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = `factura-${item.id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch(error) { if (generation === dataGeneration) await handleError(error); }
      finally { target.disabled = false; }
      return;
    }
    downloadDocument(item, action === 'download-receipt');
    return toast('Descargaste un PDF de ejemplo, sin validez fiscal.');
  }
  if (action === 'pay') {
    if (!item || item.status === 'Pagada') return;
    return openDialog('Pagar factura', `<p>No ingresás datos de tu tarjeta en Mi USITTEL.</p><div class="document-summary"><h3>${item.period}</h3><p class="amount">${money(item.amount)}</p><p class="muted">Vencimiento ${item.due}</p></div><p class="demo-notice">Esta es una vista de prueba: no se abrirá SIRO ni se realizará ningún cobro.</p><div class="dialog-actions">${button('Pagar', '', { iconName: 'external-link', attrs: 'disabled aria-describedby="payment-note payment-provider-note"' })}${button('Cerrar', 'close', { secondary: true })}</div><p id="payment-note" class="field-hint">El enlace de pago todavía no está habilitado.</p>${paymentNotice}`);
  }
  if (action === 'recover') return openDialog('Recuperar contraseña', `<p>Ingresá tu usuario para solicitar instrucciones de recuperación.</p><form id="recover-form">${input('Usuario', 'recovery-user')}${button('Solicitar instrucciones', '', { type: 'submit' })}<p class="field-hint">Demostración: no se enviarán correos ni mensajes.</p></form>`);
  if (action === 'upgrade-plan') return openDialog('Mejorar mi plan', `<p class="muted">Tu plan actual: ${customer.plan}</p><div class="commercial-option"><h3>Fibra 500 Mbps</h3><p>Una opción con más velocidad para tu hogar.</p></div><div class="commercial-option"><h3>Fibra 1000 Mbps</h3><p>Conocé la opción de mayor velocidad.</p></div><p class="field-hint">Opciones de ejemplo. La disponibilidad, el precio y las condiciones se confirmarán antes de cualquier cambio.</p><div class="dialog-actions">${button('Consultar con un comercial', 'sales', { iconName: 'message-circle' })}</div><p class="demo-caption">Vista de diseño: tu plan no se modifica.</p>`);
  if (action === 'addons') return openDialog('Agregar servicios', `<div class="commercial-option"><h3>USITTEL TV</h3><p>Sumá televisión a tu servicio.</p></div><div class="commercial-option"><h3>Wi-Fi Mesh</h3><p>Consultá opciones para ampliar la cobertura Wi-Fi de tu hogar.</p></div><p class="field-hint">Opciones de ejemplo, sujetas a disponibilidad y condiciones comerciales. No se muestran precios sin confirmar.</p><div class="dialog-actions">${button('Consultar por estos servicios', 'sales', { iconName: 'message-circle' })}</div><p class="demo-caption">Vista de diseño: no se realiza ninguna contratación.</p>`);
  if (action === 'sales') return openDialog('Hablar con un comercial', `<p>Recibí asesoramiento para mejorar tu plan o sumar servicios.</p><div class="commercial-option"><h3>Tu servicio actual</h3><p>${customer.plan} · ${customer.address}</p></div><p class="demo-notice">Este acceso está en etapa de diseño. Todavía no se envían solicitudes ni se abre una conversación comercial.</p><div class="dialog-actions">${button('Solicitar asesoramiento', '', { attrs: 'disabled' })}${button('Volver a Mi servicio', 'close', { secondary: true })}</div>`);
  if (action === 'wifi') return openDialog('Configurar Wi-Fi', `<form id="wifi-form">${input('Nombre de la red', 'network', { value: customer.network, extra: 'maxlength="32"' })}${input('Nueva contraseña de Wi-Fi', 'wifi-password', { type: 'password', autocomplete: 'new-password', extra: 'minlength="8" maxlength="63"', hint: 'Usá entre 8 y 63 caracteres.' })}<p class="demo-notice">En el servicio real, tus dispositivos podrían desconectarse al cambiar estos datos. En esta prueba no se modifica ningún equipo.</p>${button('Guardar cambios de prueba', '', { type: 'submit' })}</form>`);
  if (action === 'contact') return openDialog('Editar datos de contacto', `<form id="contact-form">${input('Correo electrónico', 'email', { value: customer.email, type: 'email', extra: 'maxlength="120"' })}${input('Teléfono', 'phone', { value: customer.phone, type: 'tel', required: false, extra: 'maxlength="30"' })}<p class="field-hint">Usá datos ficticios. Los cambios duran hasta que recargues la página.</p>${button('Guardar cambios de prueba', '', { type: 'submit' })}</form>`);
  if (action === 'password') return openDialog('Cambiar contraseña', `<form id="password-form">${input('Contraseña actual', 'current-password', { type: 'password', autocomplete: 'off' })}${input('Nueva contraseña', 'new-password', { type: 'password', autocomplete: 'off', extra: 'minlength="8"', hint: 'Para esta demostración, usá al menos 8 caracteres.' })}${input('Repetir nueva contraseña', 'confirm-password', { type: 'password', autocomplete: 'off' })}<p class="field-hint">Usá valores de prueba. Ninguna contraseña se guarda ni se envía.</p>${button('Probar cambio', '', { type: 'submit' })}</form>`);
  if (action === 'logout') {
    dataGeneration++;
    target.disabled = true;
    try {
      if (runtime.backend) await request('logout', {});
      authenticated = false; applyServices({}); clearData(); runtime.error = ''; location.hash = '/login';
      await boot();
    } catch(error) { toast(error.message); target.disabled = false; }
    return;
  }
  if (action === 'ticket') return openDialog('Seguimiento del ticket', `<p class="eyebrow">${ticket.id} · Caso de ejemplo</p><h3>${ticket.title}</h3>${status(ticket.status)}<ol class="ticket-timeline"><li><time>15/09/2026 · 10:30</time><strong>Consulta recibida</strong><p>La conexión Wi-Fi se interrumpe por momentos.</p></li><li><time>16/09/2026 · 09:15</time><strong>En revisión</strong><p>El equipo de soporte está revisando tu consulta.</p></li></ol>${button('Consultar por este ticket', 'chat', { iconName: 'message-circle' })}`);
  if (action === 'chat') return openDialog('Chat con USITTEL', `<p class="demo-caption">Chat de demostración · No conectado a soporte</p><div id="chat-messages" class="chat-messages" role="log" aria-live="polite"><p class="chat-message">Hola, Agustín. Contanos en qué podemos ayudarte.</p></div><form id="chat-form" class="chat-form"><label class="sr-only" for="message">Mensaje de prueba</label><input id="message" name="message" placeholder="Escribí un mensaje de prueba" required maxlength="500" autocomplete="off"><button type="submit" class="button" aria-label="Enviar mensaje de prueba">${icon('send')}</button></form>`);
  if (help[action]) return openDialog(help[action][0], `<p>${help[action][1]}</p><div class="dialog-actions">${button('Abrir chat', 'chat', { iconName: 'message-circle' })}</div>`);
  if (action === 'speedtest') {
    clearInterval(speedTimer);
    const progress = document.querySelector('#speed-progress');
    const label = document.querySelector('#speed-status');
    for (const name of ['down', 'up', 'ping']) document.querySelector(`#speed-${name}`).textContent = '—';
    progress.hidden = false; progress.value = 0;
    target.disabled = true;
    label.textContent = 'Simulando descarga…';
    let step = 0;
    speedTimer = setInterval(() => {
      step += 1; progress.value = step * 10;
      if (step === 4) { document.querySelector('#speed-down').textContent = '287'; label.textContent = 'Simulando subida…'; }
      if (step === 8) { document.querySelector('#speed-up').textContent = '292'; label.textContent = 'Simulando latencia…'; }
      if (step === 10) {
        document.querySelector('#speed-ping').textContent = '8';
        label.textContent = 'Ejemplo finalizado. Estos valores no son una medición real.';
        target.disabled = false; clearInterval(speedTimer);
      }
    }, 300);
  }
});
document.addEventListener('input', event => { if (event.target.id === 'confirm-password' || event.target.id === 'new-password') document.querySelector('#confirm-password')?.setCustomValidity(''); });
document.addEventListener('submit', async event => {
  const form = event.target;
  event.preventDefault();
  const data = new FormData(form);
  if (runtime.mode === 'phantom' && form.id !== 'login-form') return toast('Esta función todavía no está disponible.');
  if (form.id === 'login-form') {
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      if (runtime.backend) applyServices(await request('login', { username: data.get('username'), password: data.get('password') }));
      else if (runtime.mode !== 'demo' || data.get('username') !== 'agustin.demo' || data.get('password') !== 'usittel-demo') throw new Error('Para esta prueba usá agustin.demo y usittel-demo.');
      form.reset(); authenticated = true; location.hash = '/inicio';
      if (runtime.mode === 'phantom') await loadOverview(); else render();
    } catch(error) { toast(error.message); }
    finally { data.delete('password'); if (form.elements.password) form.elements.password.value = ''; submit.disabled = false; }
  } else if (form.id === 'contact-form') {
    customer.email = String(data.get('email')).trim(); customer.phone = String(data.get('phone')).trim();
    dialog.close(); render(); toast('Datos de ejemplo actualizados durante esta sesión.');
  } else if (form.id === 'wifi-form') {
    const name = String(data.get('network')).trim();
    if (!name) { form.elements.network.setCustomValidity('Ingresá un nombre de red.'); form.elements.network.reportValidity(); form.elements.network.setCustomValidity(''); return; }
    customer.network = name; form.reset(); dialog.close(); render(); toast('Nombre de red de ejemplo actualizado. No se modificó tu Wi-Fi.');
  } else if (form.id === 'password-form') {
    if (data.get('new-password') !== data.get('confirm-password')) { form.elements['confirm-password'].setCustomValidity('Las contraseñas no coinciden.'); return form.elements['confirm-password'].reportValidity(); }
    form.reset(); dialog.close(); toast('Prueba completada. No se cambió ni guardó ninguna contraseña.');
  } else if (form.id === 'recover-form') {
    form.reset(); openDialog('Solicitud de recuperación', '<p>Si el usuario existe, recibirá instrucciones por el medio de contacto registrado.</p><p class="demo-notice">Vista de prueba: no se envió ningún mensaje.</p>' + button('Volver al ingreso', 'close'));
  } else if (form.id === 'chat-form') {
    const message = String(data.get('message')).trim();
    if (!message) return;
    const messages = document.querySelector('#chat-messages');
    messages.insertAdjacentHTML('beforeend', `<p class="chat-message mine">${e(message)}</p><p class="chat-message">Mensaje de prueba recibido. En esta demostración no hay un agente conectado.</p>`);
    form.reset(); messages.scrollTop = messages.scrollHeight;
  }
});
async function handleError(error) {
  if (error.code === 'SERVICE_CHANGED') { ++dataGeneration; clearData(); await boot(); toast(error.message); return; }
  if (error.status === 401) {
    dataGeneration++;
    authenticated = false; applyServices({}); clearData(); runtime.error = ''; location.hash = '/login';
    try { const session = await request('bootstrap'); runtime.backend = session.backend !== false; }
    catch { await boot(); return; }
    render(); toast(error.message);
  } else toast(error.message);
}
async function refreshPayments(reconcile = true) {
  if (!runtime.paymentsEnabled || !authenticated) return;
  const generation = dataGeneration;
  try {
    const list = await request('payments');
    if (generation !== dataGeneration || !authenticated) return;
    runtime.paymentItems = list.items; runtime.paymentError = ''; render();
    const pending = list.items.find(a => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(a.state));
    if (reconcile && pending) {
      const result = await request('payment-reconcile', { attempt_id: pending.attempt_id });
      if (generation !== dataGeneration || !authenticated) return;
      runtime.paymentItems = runtime.paymentItems.map(a => a.attempt_id === result.attempt_id ? result : a); render();
    }
  } catch (error) { if (generation === dataGeneration) { runtime.paymentError = 'No pudimos consultar los intentos de pago. Volvé a intentar.'; await handleError(error); render(); } }
}
async function loadOverview() {
  const generation = ++dataGeneration;
  clearData(); runtime.loading = true; runtime.error = ''; render();
  try { const data = await request('overview'); if (generation === dataGeneration && authenticated) { applyOverview(data); void refreshPayments(); } }
  catch(error) { if (generation === dataGeneration) { if (error.status === 401) await handleError(error); else runtime.error = error.message; } }
  finally { if (generation === dataGeneration) { runtime.loading = false; render(); } }
}
async function boot() {
  app.innerHTML = '<main id="main" class="page"><p role="status">Cargando Mi USITTEL…</p></main>';
  try {
    const session = await request('bootstrap');
    runtime.backend = session.backend !== false;
    await initialize(session.mode); applyServices(session); runtime.paymentsEnabled = session.payments_enabled === true; authenticated = session.authenticated;
    document.querySelector('.demo-strip').textContent = session.mode === 'demo' ? 'Vista de prueba · Datos de ejemplo' : (runtime.paymentsEnabled ? 'Desarrollo local · Laboratorio SIRO · Sin imputación en Phantom' : 'Desarrollo local · Cuenta de laboratorio · Solo lectura');
    if (authenticated && runtime.mode === 'phantom') await loadOverview(); else render();
  } catch(error) {
    authenticated = false; applyServices({}); clearData();
    app.innerHTML = `<main id="main" class="page"><h1>Mi USITTEL</h1><p role="alert">${e(error.message)}</p><div class="dialog-actions">${button('Volver a intentar','boot-retry')}</div></main>`;
  }
}
window.addEventListener('hashchange', () => { if (runtime.mode) render(); });
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
boot();
