import './push-config.js';
import { request } from './api.js';

const { version, firebase, vapidKey } = globalThis.miUsittelPush;
let enabled = false;
let active = false;
let checked = false;
let busy = false;
let device = null;
let generation = 0;
let sdkPromise;
let notification;
let message = '';
let pendingRegistration;
let installedThisVisit = false;
let invitationHandled = false;
const invitationKey = 'mi-usittel-push-invitation-handled';

function supported() {
  return Boolean(vapidKey && isSecureContext && 'Notification' in window && 'serviceWorker' in navigator);
}

function finishInvitation() {
  invitationHandled = true;
  try { localStorage.setItem(invitationKey, '1'); } catch {}
}

function renderInvitation() {
  let invitation = document.querySelector('#push-invitation');
  const installed = installedThisVisit || matchMedia('(display-mode: standalone)').matches;
  if (!installed || !enabled || !checked || !supported() || active || invitationHandled
      || Notification.permission === 'denied') {
    invitation?.remove();
    return;
  }
  try {
    if (localStorage.getItem(invitationKey)) {
      invitation?.remove();
      return;
    }
  } catch {}
  const main = document.querySelector('main.page');
  if (!main) return;
  if (!invitation && !busy) {
    main.insertAdjacentHTML('afterbegin', `<section id="push-invitation" class="push-invitation" aria-labelledby="push-invitation-title">
      <h2 id="push-invitation-title">¿Activar notificaciones?</h2>
      <div class="push-invitation-actions">
        <button type="button" class="button" id="push-invitation-enable">Activar notificaciones</button>
        <button type="button" class="button button-secondary" id="push-invitation-later">Ahora no</button>
      </div>
    </section>`);
  }
}

export function renderPush() {
  renderInvitation();
  const panel = document.querySelector('#push-settings');
  if (!panel) return;
  panel.hidden = !enabled;
  if (!enabled) return;
  const action = panel.querySelector('button');
  action.disabled = busy || !supported() || !checked;
  action.textContent = active ? 'Desactivar en este dispositivo' : 'Activar en este dispositivo';
  const status = panel.querySelector('[role="status"]');
  status.textContent = message || (!supported()
    ? 'Las notificaciones no están disponibles en este navegador.'
    : active ? 'Identificador para la prueba: ' : 'Las notificaciones están desactivadas.');
  if (!message && active && device) {
    for (const chunk of device.match(/.{1,16}/g)) status.append(document.createElement('wbr'), chunk);
  }
}

async function getSdk() {
  if (!sdkPromise) {
    const base = `https://www.gstatic.com/firebasejs/${version}`;
    sdkPromise = Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-messaging.js`)])
      .then(async ([app, sdk]) => {
        if (!await sdk.isSupported()) throw new Error('unsupported');
        const messaging = sdk.getMessaging(app.initializeApp(firebase));
        sdk.onMessage(messaging, ({ data }) => {
          if (enabled && active && data?.title && data.body) notification?.(`${data.title} · ${data.body}`);
        });
        sdk.onRegistered(messaging, fid => {
          if (pendingRegistration) pendingRegistration(fid);
          else if (enabled && active && !busy) void syncRegistration(fid);
        });
        return { sdk, messaging };
      }).catch(error => {
        sdkPromise = undefined;
        throw error;
      });
  }
  return sdkPromise;
}

function checkWorker(worker) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = value => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 1000);
    channel.port1.onmessage = event => finish(event.data);
    try { worker.postMessage('mi-usittel-push-ready', [channel.port2]); }
    catch { finish(null); }
  });
}

async function register() {
  const { sdk, messaging } = await getSdk().catch(error => {
    throw new Error(error.message === 'unsupported' ? 'push-browser' : 'push-sdk');
  });
  const registration = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })
    .catch(() => { throw new Error('push-worker'); });
  const deadline = Date.now() + 12000;
  let ready;
  do {
    const worker = registration.active;
    if (worker?.state === 'activated') {
      const result = await checkWorker(worker);
      if (result === 'firebase-unavailable') throw new Error('push-sdk-worker');
      ready = result === version && worker === registration.active;
    }
    if (!ready) await new Promise(resolve => setTimeout(resolve, 250));
  } while (!ready && Date.now() < deadline);
  if (!ready) throw new Error('push-worker');
  let timeout;
  const result = new Promise((resolve, reject) => {
    pendingRegistration = resolve;
    timeout = setTimeout(() => reject(new Error('fcm-timeout')), 15000);
    sdk.register(messaging, { vapidKey, serviceWorkerRegistration: registration }).catch(reject);
  });
  try { return await result; }
  finally { pendingRegistration = undefined; clearTimeout(timeout); }
}

async function syncRegistration(fid, refresh = true, current = generation) {
  if (current !== generation || !enabled) return;
  const result = await request('push-register', { fid, refresh }).catch(error => {
    if (refresh && error.status === 409 && current === generation) {
      active = false;
      device = null;
      renderPush();
      return null;
    }
    if (busy) throw error;
    return null;
  });
  if (result && current === generation) {
    active = result.active;
    device = result.device;
    renderPush();
  }
}

async function syncStatus() {
  if (!enabled || !supported() || busy) return;
  const current = generation;
  busy = true;
  message = '';
  renderPush();
  try {
    const status = await request('push-status');
    if (current !== generation) return;
    active = status.active;
    device = status.device;
    checked = true;
    if (active && Notification.permission === 'granted') {
      await syncRegistration(await register(), true, current);
    } else if (active) {
      await request('push-remove', {});
      if (current === generation) { active = false; device = null; }
    }
  } catch {
    if (current === generation) message = 'No pudimos verificar las notificaciones. Volvé a abrir el portal para reintentar.';
  } finally {
    if (current === generation) { busy = false; renderPush(); }
  }
}

export function setPushEnabled(value, notify) {
  generation++;
  enabled = value === true;
  notification = notify;
  active = checked = busy = false;
  device = null;
  message = '';
  renderPush();
  void syncStatus();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void syncStatus();
});
window.addEventListener('appinstalled', () => {
  installedThisVisit = true;
  renderPush();
});
navigator.permissions?.query({ name: 'notifications' })
  .then(permission => permission.addEventListener('change', () => void syncStatus()))
  .catch(() => {});

document.addEventListener('click', async event => {
  if (event.target.closest('#push-invitation-later')) {
    finishInvitation();
    renderPush();
    document.querySelector('main.page h1')?.focus();
    return;
  }
  const fromInvitation = Boolean(event.target.closest('#push-invitation-enable'));
  if ((!fromInvitation && !event.target.closest('#push-settings button'))
      || !enabled || busy || !checked || !supported()) return;
  finishInvitation();
  const current = generation;
  busy = true;
  message = '';
  renderPush();
  if (fromInvitation) document.querySelector('main.page h1')?.focus();
  let stage = active ? 'push-remove' : 'push-permission';
  try {
    if (active) {
      await request('push-remove', {});
      if (current !== generation) return;
      active = false;
      device = null;
      const { sdk, messaging } = await getSdk();
      await sdk.unregister(messaging).catch(() => {});
    } else if (Notification.permission === 'granted' || await Notification.requestPermission() === 'granted') {
      stage = 'push-browser-register';
      const fid = await register();
      stage = 'push-portal-register';
      await syncRegistration(fid, false, current);
      if (fromInvitation && current === generation && active) notification?.('Notificaciones activadas.');
    } else {
      message = Notification.permission === 'denied'
        ? 'Chrome bloqueó el permiso. Podés habilitarlo en los ajustes del sitio.'
        : 'El permiso sigue pendiente. Podés volver a solicitarlo.';
    }
  } catch (error) {
    if (current === generation) {
      const code = error.code || error.message;
      const reference = /^(?:push-[a-z-]+|fcm-timeout|(?:messaging|installations)\/[a-z-]+|[A-Z_]+)$/.test(code)
        ? code : error.status ? `HTTP ${error.status}` : stage;
      message = `No pudimos actualizar las notificaciones (${reference}). Volvé a intentar.`;
    }
  } finally {
    if (current === generation) {
      busy = false;
      renderPush();
      if (fromInvitation && message) notification?.(message);
    }
  }
});
