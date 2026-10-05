import { request, invoicePdf, paymentReceiptPdf } from './api.js';
import { customer, invoices, ticket, money, runtime, initialize, clearData, applyOverview, appendInvoices, planLabel, addressLabel } from './data.js';
import { shell, routes, status, icon, button, input, invoicePayButton, invoiceVisibleStatus, operationAlert, escapeHTML as e } from './components.js';
import { login, home, billing, service, support, account } from './views.js';
import { downloadDocument } from './documents.js';
import { initializeCentralChat, openCentralChat, closeCentralChat } from './central-chat.js';
import { WIFI_SSID_PREFIX, validateWifiSsid, validateWifiPassword } from './wifi-input.js';
import { paymentReturnAttempt, resolvePaymentFlow } from './payment-flow.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
const toastElement = document.querySelector('#toast');
const githubPagesDemo = location.hostname.endsWith('.github.io');
const views = { inicio: home, facturas: billing, servicio: service, soporte: support, cuenta: account };
let authenticated = false;
let paymentBusy = false;
let serviceBusy = false;
// Navigation hint only; authorization and all outcome checks remain on the server.
let returnAttempt = paymentReturnAttempt(location.hash);
if (returnAttempt) { runtime.billingView = 'invoices'; history.replaceState(null, '', '#/facturas'); }
function applyServices(data) { if (typeof data.payments_enabled === 'boolean') runtime.paymentsEnabled = data.payments_enabled; if (typeof data.phantom_posting_enabled === 'boolean') runtime.phantomPostingEnabled = data.phantom_posting_enabled; if (typeof data.payment_history_enabled === 'boolean') runtime.paymentHistoryEnabled = data.payment_history_enabled; runtime.services = data.services || []; runtime.selectedServiceId = data.selectedServiceId || null; runtime.servicesUnavailable = data.servicesUnavailable === true; }
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
document.addEventListener('toggle', event => {
  const item = event.target;
  if (!(item instanceof HTMLDetailsElement) || !item.matches('.faq-item')) return;
  if (item.open) document.querySelectorAll('.faq-item[open]').forEach(other => { if (other !== item) other.open = false; });
  item.querySelector('summary')?.setAttribute('aria-expanded', String(item.open));
}, true);
const unavailable = ['wifi', 'speedtest', 'ticket', 'download-receipt', 'receipt'];
function render() {
  const demoStrip = document.querySelector('.demo-strip');
  demoStrip.textContent = runtime.mode === 'demo' ? 'Vista de prueba · Datos de ejemplo' : '';
  demoStrip.hidden = runtime.mode !== 'demo';
  clearInterval(speedTimer);
  if (dialog.open) dialog.close();
  let route = location.hash.replace('#/', '') || 'login';
  if (!authenticated) route = 'login';
  else if (route === 'login' || !views[route]) route = 'inicio';
  if (location.hash !== `#/${route}`) history.replaceState(null, '', `#/${route}`);
  const changed = activeRoute !== route;
  if (activeRoute === 'facturas' && route !== 'facturas') runtime.paymentFocus = null;
  activeRoute = route;
  const notice = runtime.warnings.length ? '<p class="demo-notice" role="status">Parte de la información no está disponible o requiere revisión. El saldo de cuenta y el estado de cada factura pueden diferir.</p>' : '';
  const content = runtime.loading ? '<h1 tabindex="-1">Cargando tu información…</h1><p role="status">Un momento, por favor.</p>' : runtime.error ? `<h1 tabindex="-1">Información no disponible</h1><p role="alert">${e(runtime.error)}</p><div class="dialog-actions">${button('Volver a intentar', 'retry')}${button('Cerrar sesión', 'logout', { secondary: true })}</div>` : notice + views[route]?.();
  app.innerHTML = route === 'login' ? login() : shell(route, content);
  if (runtime.mode === 'phantom') {
    app.querySelectorAll('[data-action]').forEach(control => {
      if (unavailable.includes(control.dataset.action)) { control.disabled = true; control.title = 'Todavía no disponible en esta etapa'; }
      if (paymentBusy && ['pay', 'payment-resume', 'payment-check', 'payment-post', 'billing-refresh', 'download-payment-receipt'].includes(control.dataset.action)) control.disabled = true;
    });
  }
  document.title = `Mi USITTEL · ${routes.find(([id]) => id === route)?.[1] || 'Ingresar'}`;
  if (changed) { window.scrollTo(0, 0); app.querySelector('h1')?.focus({ preventScroll: true }); }
}
function getInvoice(id) { return invoices.find(item => item.id === id); }
function invoiceDialog(item, receipt = false) {
  if (!item || (receipt && item.status !== 'Pagada')) return;
  if (runtime.mode === 'phantom') { const visible=invoiceVisibleStatus(item); return openDialog('Detalle de factura', `<div class="document-summary"><h3>${e(item.period)}</h3><p class="amount">${money(item.amount)}</p>${status(visible.label)}${visible.hint ? `<p class="field-hint">${e(visible.hint)}</p>` : ''}</div><dl class="dialog-details"><div><dt>Comprobante</dt><dd>${e(item.number)}</dd></div><div><dt>Tipo</dt><dd>${e(item.type)}</dd></div><div><dt>Primer vencimiento</dt><dd>${e(item.due)}</dd></div><div><dt>Segundo vencimiento</dt><dd>${e(item.secondDue)}</dd></div></dl><p class="field-hint">Importe total de la factura. El saldo de tu cuenta se muestra en Facturas.</p><div class="dialog-actions">${item.status === 'Pendiente' && visible.label !== 'Pagada' ? invoicePayButton(item) : ''}${button('Descargar factura','download-invoice',{secondary:true,attrs:`data-id="${e(item.id)}" ${item.downloadAvailable ? '' : 'disabled'}`})}</div>`); }
  openDialog(receipt ? 'Comprobante de pago' : 'Detalle de factura', `<p class="demo-caption">Documento de ejemplo · Sin validez fiscal</p><div class="document-summary"><h3>${item.period}</h3><p class="amount">${money(item.amount)}</p>${status(item.status)}</div><dl class="dialog-details"><div><dt>Servicio</dt><dd>${e(planLabel(customer.plan))}</dd></div><div><dt>Domicilio</dt><dd>${e(addressLabel(customer.address))}</dd></div><div><dt>Vencimiento</dt><dd>${item.due}</dd></div>${receipt ? `<div><dt>Fecha de pago de ejemplo</dt><dd>${item.paidAt}</dd></div>` : '<div><dt>Concepto</dt><dd>Abono mensual</dd></div>'}</dl><div class="dialog-actions">${!receipt && item.status !== 'Pagada' ? button('Pagar', 'pay', { iconName: 'external-link', attrs: `data-id="${item.id}"` }) : ''}${button(receipt ? 'Descargar comprobante' : 'Descargar factura', receipt ? 'download-receipt' : 'download-invoice', { secondary: !receipt && item.status !== 'Pagada', iconName: 'download', attrs: `data-id="${item.id}"` })}</div>`);
}
function wifiForm(requestId,dualBand) {
  const field=(label,name,type='text')=>`${input(label,name,{type,autocomplete:type==='password'?'new-password':'off',extra:`autocapitalize="off" spellcheck="false" aria-describedby="${name}-error${name.startsWith('ssid')?` ${name}-preview`:''}"`})}<p class="wifi-field-error" id="${name}-error" role="alert" hidden></p>${name.startsWith('ssid')?`<p class="wifi-ssid-preview field-hint" id="${name}-preview" hidden></p>`:''}`;
  const ssidField=(label,name)=>`<div class="field"><label for="${name}">${label}</label><div class="wifi-ssid-input"><span id="${name}-prefix">${WIFI_SSID_PREFIX}</span><input id="${name}" name="${name}" type="text" required autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="${name}-prefix ${name}-error ${name}-preview"></div></div><p class="wifi-field-error" id="${name}-error" role="alert" hidden></p><p class="wifi-ssid-preview field-hint" id="${name}-preview" hidden></p>`;
  return `<form id="wifi-live-form" novalidate data-request-id="${e(requestId)}" data-generation="${dataGeneration}">
    <p class="field-hint">Ingresá los nuevos datos de tu red.</p>
    ${ssidField('Nombre de red 2,4 GHz','ssid')}
    ${dualBand?ssidField('Nombre de red 5 GHz','ssid5'):''}
    ${field('Nueva contraseña','wifi-new-password','password')}
    ${field('Repetí la contraseña','wifi-repeat','password')}
    <label class="wifi-confirm"><input type="checkbox" name="confirmed" required> Entiendo que mis dispositivos se desconectarán y tendré que volver a conectarlos.</label>
    <div role="status" aria-live="polite" id="wifi-result"></div>
    ${button('Guardar cambios','',{type:'submit'})}</form>`;
}
function wifiFieldResult(form,name) {
  const value=form.elements[name].value;
  const validation=name.startsWith('ssid')?validateWifiSsid(WIFI_SSID_PREFIX+value):validateWifiPassword(value);
  const error=name==='wifi-repeat' && !validation.error && value!==form.elements['wifi-new-password'].value
    ? 'Las contraseñas de Wi-Fi no coinciden.' : validation.error;
  const message=form.querySelector(`[id="${name}-error"]`);
  message.textContent=error||'';message.hidden=!error;
  if(error) form.elements[name].setAttribute('aria-invalid','true');
  else form.elements[name].removeAttribute('aria-invalid');
  if(name.startsWith('ssid')) {
    const preview=form.querySelector(`[id="${name}-preview"]`);
    preview.hidden=!!error || !validation.changed;
    preview.textContent=preview.hidden?'':`Nombre que se aplicará: ${validation.value}`;
  }
  return error?null:validation.value;
}
async function submitWifi(form,data) {
  const submit=form.querySelector('[type="submit"]');if(submit.disabled)return;
  const result=form.querySelector('#wifi-result');
  const names=['ssid',...(form.elements.ssid5?['ssid5']:[]),'wifi-new-password','wifi-repeat'];
  const values={};let firstInvalid=null;
  for(const name of names) {values[name]=wifiFieldResult(form,name);if(values[name]===null && firstInvalid===null) firstInvalid=form.elements[name];}
  if(firstInvalid) {result.innerHTML=operationAlert('error','Revisá el campo señalado.');firstInvalid.focus();return;}
  if(data.get('confirmed')!=='on') {result.innerHTML=operationAlert('error','Confirmá que tendrás que volver a conectar tus dispositivos.');form.elements.confirmed.focus();return;}
  submit.disabled=true;const generation=Number(form.dataset.generation);
  result.innerHTML=operationAlert('info','Aplicando cambios…');
  try {
    const response=await request('wifi-change',{requestId:form.dataset.requestId,ssid:values.ssid,ssid5:values.ssid5||'',password:values['wifi-new-password'],confirmed:true});
    if(generation!==dataGeneration||!authenticated||!form.isConnected)return;
    form.reset();
    for(const preview of form.querySelectorAll('.wifi-ssid-preview')) {preview.textContent='';preview.hidden=true;}
    result.innerHTML=response.state==='APPLIED'
      ? operationAlert('success','Wi-Fi actualizado correctamente.','Los nuevos datos se aplicaron. Volvé a conectar tus dispositivos con el nuevo nombre y contraseña.')
      : operationAlert('warning','No pudimos confirmar el resultado del cambio.','Antes de volver a intentarlo, verificá si tu red Wi-Fi ya cambió.');
    if(response.assistance) {
      runtime.serviceRequests=[response.assistance,...runtime.serviceRequests.filter(r=>r.id!==response.assistance.id)];
      result.insertAdjacentHTML('beforeend','<p class="field-hint">Podés seguir la solicitud de ayuda en Mi servicio.</p>');
    }
  } catch(error) {
    if(generation!==dataGeneration||!form.isConnected)return;
    // Only a documented pre-write rejection can be shown as an error here.
    // A transport/server failure after submission has an uncertain outcome.
    const rejectedBeforeWrite=['WIFI_INPUT','WIFI_UNAVAILABLE','WIFI_EXPIRED','WIFI_RATE_LIMIT','CSRF','SERVICE_CHANGED'].includes(error.code);
    result.innerHTML=error.code==='WIFI_INPUT'
      ? operationAlert('error','Revisá los datos de Wi-Fi.',error.message)
      : rejectedBeforeWrite
        ? operationAlert('error','No pudimos realizar el cambio de Wi-Fi.',error.code==='WIFI_UNAVAILABLE'?'Este equipo todavía no está habilitado para el cambio desde Mi USITTEL. Contactanos para recibir ayuda.':error.message)
        : operationAlert('warning','No pudimos confirmar el resultado del cambio.','Antes de volver a intentarlo, verificá si tu red Wi-Fi ya cambió.');
    // Only validation failures are known to precede a write.
    if(error.code==='WIFI_INPUT')submit.disabled=false;
    if(error.status===401||error.code==='SERVICE_CHANGED')await handleError(error);
  } finally {
    for(const key of ['wifi-new-password','wifi-repeat']) {data.delete(key);if(form.elements[key])form.elements[key].value='';}
  }
}
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
  if (action === 'chat-launcher') {
    const success = target.getAttribute('aria-expanded') === 'true' ? await closeCentralChat() : await openCentralChat();
    if (!success) toast('El chat no está disponible en este momento. Volvé a intentar más tarde.');
    return;
  }
  if (action === 'chat' || action === 'sales') {
    if (dialog.open) dialog.close();
    if (!await openCentralChat(target.dataset.chatTopic)) toast('El chat no está disponible en este momento. Volvé a intentar más tarde.');
    return;
  }
  if (action === 'show-login-help') {
    openDialog('Dónde encontrar tus datos de acceso', `<div class="login-invoice-guide"><p>Buscá <strong>Información para el cliente</strong> en tu factura de USITTEL. Al final de ese apartado está el recuadro con tu usuario y contraseña.</p><a class="login-invoice-example" href="assets/factura-ejemplo-acceso.png" target="_blank" rel="noopener noreferrer" aria-label="Ver imagen de ejemplo completa"><svg viewBox="0 600 230 82" role="img" aria-label="Ejemplo del recuadro de la factura con Usuario y Contraseña"><image href="assets/factura-ejemplo-acceso.png" width="551" height="705"></image></svg><span>Ver imagen de ejemplo completa</span></a><p class="field-hint">Los datos de la imagen son solo de ejemplo. Usá los que figuran en tu propia factura.</p><div class="dialog-actions"><p>¿No encontrás tus datos?</p>${button('Contactanos', 'chat', { secondary: true, attrs: 'data-chat-topic="access-help"' })}</div></div>`);
    return;
  }
  const item = getInvoice(target.dataset.id);
  if (action === 'connection-refresh') {
    if(runtime.connectionRefreshing)return;
    if(runtime.mode!=='phantom')return toast('Vista de demostración: no consulta un equipo real.');
    const generation=dataGeneration;runtime.connectionRefreshing=true;runtime.connectionError='';render();
    try { const result=await request('service-connection',{});if(generation===dataGeneration&&authenticated)runtime.connectionDetails=result; }
    catch(error) {if(generation===dataGeneration){runtime.connectionError='No pudimos actualizar el estado. El dato anterior puede estar desactualizado.';await handleError(error);}}
    finally {if(generation===dataGeneration){runtime.connectionRefreshing=false;render();}}
    return;
  }
  if(action==='wifi-settings') {
    if(runtime.mode!=='phantom')return toast('La configuración real requiere iniciar sesión en tu cuenta.');
    target.disabled=true;const generation=dataGeneration;
    try {
      const preparation=await request('wifi-prepare',{});
      if(generation!==dataGeneration||!authenticated)return;
      openDialog('Configurar Wi-Fi',wifiForm(preparation.requestId,preparation.dualBand===true));
    } catch(error) {if(generation===dataGeneration)await handleError(error);}
    finally {if(target.isConnected)target.disabled=false;}
    return;
  }
  if (action === 'choose-service') {
    if (serviceBusy || runtime.services.length < 2) return;
    openDialog('Elegí un servicio', `<div class="service-options">${runtime.services.map(s => `<button type="button" class="service-option" data-action="select-service" data-id="${e(s.id)}" aria-pressed="${s.id === runtime.selectedServiceId}"><strong>${s.id === runtime.selectedServiceId ? '&#10003; ' : ''}${e(addressLabel(s.address) || 'No disponible')}</strong><span>Contrato N.º ${e(s.id)} · ${e(planLabel(s.plan) || 'Plan no disponible')}</span></button>`).join('')}</div>`);
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
  if (action === 'billing-refresh') {
    if (runtime.mode !== 'phantom' || paymentBusy || runtime.billingRefreshing) return;
    paymentBusy = true; runtime.billingRefreshing = true; render();
    const generation = dataGeneration;
    try {
      await refreshPayments({ refreshOverviewAfterPost: false });
      if (generation !== dataGeneration || !authenticated) return;
      await refreshOverviewSnapshot(generation);
    } catch (error) { if (generation === dataGeneration) await handleError(error); }
    finally { paymentBusy = false; runtime.billingRefreshing = false; render(); }
    return;
  }
  if (action === 'billing-tab') {
    if (!['invoices', 'movements'].includes(target.dataset.view)) return;
    runtime.billingView = target.dataset.view;
    render();
    document.querySelector(`[data-action="billing-tab"][data-view="${runtime.billingView}"]`)?.focus();
    return;
  }
  if (runtime.mode === 'phantom' && (action === 'pay' || action === 'payment-resume' || action === 'payment-check' || action === 'payment-post')) {
    if (!runtime.paymentsEnabled || paymentBusy) return;
    paymentBusy = true; target.disabled = true; const generation = dataGeneration;
    target.textContent = action === 'pay' ? 'Preparando pago...' : action === 'payment-post' ? 'Actualizando cuenta...' : 'Consultando...';
    try {
      const result = action === 'payment-check'
        ? (await refreshPayments({ targetAttemptId: target.dataset.attempt }))
        : await request(action === 'pay' ? 'payment-create' : action === 'payment-resume' ? 'payment-resume' : 'payment-post', action === 'pay' ? { idt: target.dataset.id } : { attempt_id: target.dataset.attempt });
      if (generation !== dataGeneration || !authenticated) return;
      if (action === 'payment-resume' && /^[a-f0-9]{32}$/.test(result?.attempt_id || '') && result.attempt_id !== target.dataset.attempt) {
        runtime.paymentFocus = { attemptId: result.attempt_id, serviceId: String(runtime.selectedServiceId) };
      }
      if (action !== 'payment-check') await refreshPayments({ reconcile: false, recoverPosting: action === 'payment-resume' && result?.state === 'CONFIRMED' });
      if (result?.checkout_url) {
        if (!/^https:\/\/siropagos\.bancoroela\.com\.ar\/Home\/Pago\/[a-f0-9]{64}$/.test(result.checkout_url)) throw new Error('No pudimos validar el portal de pagos.');
        window.location.assign(result.checkout_url);
      } else { location.hash = '/facturas'; if (action === 'payment-post') await refreshOverviewSnapshot(generation); else render(); }
    } catch (error) { if (generation === dataGeneration) {
      if (['PAYMENT_NOT_UNPAID', 'PAYMENT_INVOICE_CHANGED'].includes(error.code)) await loadOverview();
      await handleError(error);
    } }
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
  if (action === 'download-payment-receipt') {
    const id = target.dataset.paymentId;
    if (!runtime.paymentHistoryEnabled || !/^\d{1,20}$/.test(id || '')) return;
    const generation = dataGeneration; target.disabled = true;
    try {
      const blob = await paymentReceiptPdf(id);
      if (generation !== dataGeneration || !authenticated) return;
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `comprobante-pago-${id}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(error) { if (generation === dataGeneration) await handleError(error); }
    finally { target.disabled = false; }
    return;
  }
  if (action === 'movement-page') {
    const page = Number(target.dataset.page);
    if (!Number.isInteger(page) || page < 0) return;
    runtime.movementPage = page;
    render();
    document.querySelector('.movement-heading')?.scrollIntoView({ block: 'start' });
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
    return openDialog('Pagar factura', `<p>No ingresás datos de tu tarjeta en Mi USITTEL.</p><div class="document-summary"><h3>${item.period}</h3><p class="amount">${money(item.amount)}</p><p class="muted">Vencimiento ${item.due}</p></div><p class="demo-notice">Esta es una vista de prueba: no se abrirá SIRO ni se realizará ningún cobro.</p><div class="dialog-actions">${button('Pagar', '', { iconName: 'external-link', attrs: 'disabled aria-describedby="payment-note"' })}${button('Cerrar', 'close', { secondary: true })}</div><p id="payment-note" class="field-hint">El enlace de pago todavía no está habilitado.</p>`);
  }
  if (action === 'wifi') return openDialog('Configurar Wi-Fi', `<form id="wifi-form">${input('Nombre de la red', 'network', { value: customer.network, extra: 'maxlength="32"' })}${input('Nueva contraseña de Wi-Fi', 'wifi-password', { type: 'password', autocomplete: 'new-password', extra: 'minlength="8" maxlength="63"', hint: 'Usá entre 8 y 63 caracteres.' })}<p class="demo-notice">En el servicio real, tus dispositivos podrían desconectarse al cambiar estos datos. En esta prueba no se modifica ningún equipo.</p>${button('Guardar cambios de prueba', '', { type: 'submit' })}</form>`);
  if (action === 'logout') {
    dataGeneration++;
    target.disabled = true;
    try {
      if (runtime.backend) await request('logout', {});
      authenticated = false; applyServices({ payments_enabled: false, phantom_posting_enabled: false, payment_history_enabled: false }); clearData(); runtime.paymentFocus = null; runtime.billingView = 'invoices'; runtime.error = ''; location.hash = '/login';
      await boot();
    } catch(error) { toast(error.message); target.disabled = false; }
    return;
  }
  if (action === 'ticket') return openDialog('Seguimiento del ticket', `<p class="eyebrow">${ticket.id} · Caso de ejemplo</p><h3>${ticket.title}</h3>${status(ticket.status)}<ol class="ticket-timeline"><li><time>15/09/2026 · 10:30</time><strong>Consulta recibida</strong><p>La conexión Wi-Fi se interrumpe por momentos.</p></li><li><time>16/09/2026 · 09:15</time><strong>En revisión</strong><p>El equipo de soporte está revisando tu consulta.</p></li></ol>${button('Consultar por este ticket', 'chat', { iconName: 'message-circle' })}`);
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
document.addEventListener('input', event => {
  const form=event.target.closest('form');
  if(form?.id!=='wifi-live-form' || !['ssid','ssid5','wifi-new-password','wifi-repeat'].includes(event.target.name)) return;
  wifiFieldResult(form,event.target.name);
  if(event.target.name==='wifi-new-password' && form.elements['wifi-repeat'].value) wifiFieldResult(form,'wifi-repeat');
  form.querySelector('#wifi-result').textContent='';
});
document.addEventListener('submit', async event => {
  const form = event.target;
  event.preventDefault();
  const data = new FormData(form);
  if(form.id==='wifi-live-form') {await submitWifi(form,data);return;}
  if (runtime.mode === 'phantom' && form.id !== 'login-form') return toast('Esta función todavía no está disponible.');
  if (form.id === 'login-form') {
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      if (runtime.backend) applyServices(await request('login', { username: data.get('username'), password: data.get('password') }));
      else if (runtime.mode !== 'demo' || data.get('username') !== 'agustin.demo' || data.get('password') !== 'usittel-demo') throw new Error('Para esta prueba usá agustin.demo y usittel-demo.');
      form.reset(); authenticated = true; location.hash = returnAttempt ? '/facturas' : '/inicio';
      if (runtime.mode === 'phantom') await loadOverview(); else render();
    } catch(error) { toast(error.message); }
    finally { data.delete('password'); if (form.elements.password) form.elements.password.value = ''; submit.disabled = false; }
  } else if (form.id === 'wifi-form') {
    const name = String(data.get('network')).trim();
    if (!name) { form.elements.network.setCustomValidity('Ingresá un nombre de red.'); form.elements.network.reportValidity(); form.elements.network.setCustomValidity(''); return; }
    customer.network = name; form.reset(); dialog.close(); render(); toast('Nombre de red de ejemplo actualizado. No se modificó tu Wi-Fi.');
  } else if (form.id === 'chat-form') {
    const message = String(data.get('message')).trim();
    if (!message) return;
    const messages = document.querySelector('#chat-messages');
    messages.insertAdjacentHTML('beforeend', `<p class="chat-message mine">${e(message)}</p><p class="chat-message">Mensaje de prueba recibido. En esta demostración no hay un agente conectado.</p>`);
    form.reset(); messages.scrollTop = messages.scrollHeight;
  }
});
async function handleError(error) {
  const message=error.code==='WIFI_UNAVAILABLE'
    ? 'El cambio de Wi-Fi todavía no está habilitado para este equipo. Contactanos para recibir ayuda.'
    : error.message;
  if (error.code === 'SERVICE_CHANGED') { ++dataGeneration; clearData(); await boot(); toast(error.message); return; }
  if (error.status === 401) {
    dataGeneration++;
    authenticated = false; applyServices({ payments_enabled: false, phantom_posting_enabled: false, payment_history_enabled: false }); clearData(); runtime.error = ''; location.hash = '/login';
    try { const session = await request('bootstrap'); runtime.backend = session.backend !== false; }
    catch { await boot(); return; }
    render(); toast(message);
  } else toast(message);
}
async function refreshOverviewSnapshot(generation) {
  const overview = await request('overview');
  if (generation === dataGeneration && authenticated) { applyOverview(overview); render(); }
}
async function refreshPayments({ reconcile = true, recoverPosting = true, targetAttemptId = null, refreshOverviewAfterPost = true } = {}) {
  if ((!runtime.paymentsEnabled && !runtime.paymentHistoryEnabled) || !authenticated) return;
  const generation = dataGeneration;
  if (runtime.paymentsEnabled) {
    try {
      const list = await request('payments');
      if (generation !== dataGeneration || !authenticated) return;
      runtime.paymentItems = list.items; runtime.paymentError = '';
      const returnedId = returnAttempt;
      const returnedAttempt = list.items.find(item => item.attempt_id === returnedId);
      if (returnedAttempt && runtime.selectedServiceId) runtime.paymentFocus = { attemptId: returnedId, serviceId: String(runtime.selectedServiceId) };
      const selectedAttemptId = targetAttemptId || returnedId;
      const selectedServiceId = runtime.selectedServiceId;
      if (reconcile || recoverPosting) {
        const flow = await resolvePaymentFlow(list.items, {
          reconcile, targetAttemptId: selectedAttemptId, postingEnabled: recoverPosting && runtime.phantomPostingEnabled,
          selectedServiceId, request,
          isCurrent: () => generation === dataGeneration && authenticated && runtime.selectedServiceId === selectedServiceId,
          onUpdate: items => { if (generation === dataGeneration && authenticated) { runtime.paymentItems = items; render(); } },
        });
        if (generation !== dataGeneration || !authenticated) return;
        runtime.paymentItems = flow.items;
        if (returnedAttempt && returnAttempt === returnedId) returnAttempt = null;
        if (flow.postAttempted && refreshOverviewAfterPost) await refreshOverviewSnapshot(generation);
      }
    } catch (error) { if (generation === dataGeneration) {
      runtime.paymentError = 'Estamos verificando la actualización de tu cuenta. No vuelvas a pagar.';
      if (error.status === 401 || error.code === 'SERVICE_CHANGED') await handleError(error);
    } }
  }
  // Read history after any posting so Movimientos reflects the newest result.
  if (runtime.paymentHistoryEnabled) {
    try { const list=await request('payment-history'); if(generation!==dataGeneration||!authenticated)return;runtime.paymentHistoryItems=list.items;runtime.paymentHistoryError=''; }
    catch { if(generation===dataGeneration) runtime.paymentHistoryError='No pudimos consultar los movimientos registrados. Volvé a intentar.'; }
  }
  if (generation === dataGeneration) render();
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
    const session = githubPagesDemo
      ? { mode: 'demo', backend: false, authenticated: false, payments_enabled: false, phantom_posting_enabled: false, payment_history_enabled: false }
      : await request('bootstrap');
    runtime.backend = session.backend !== false;
    await initialize(session.mode); applyServices(session); authenticated = session.authenticated;
    const demoStrip = document.querySelector('.demo-strip');
    demoStrip.textContent = session.mode === 'demo' ? 'Vista de prueba · Datos de ejemplo' : '';
    demoStrip.hidden = session.mode !== 'demo';
    if (authenticated && runtime.mode === 'phantom') await loadOverview(); else render();
  } catch(error) {
    authenticated = false; applyServices({ payments_enabled: false, phantom_posting_enabled: false, payment_history_enabled: false }); clearData();
    app.innerHTML = `<main id="main" class="page"><h1>Mi USITTEL</h1><p role="alert">${e(error.message)}</p><div class="dialog-actions">${button('Volver a intentar','boot-retry')}</div></main>`;
  }
}
window.addEventListener('hashchange', () => { if (runtime.mode) render(); });
window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
initializeCentralChat();
boot();
