// Legacy loopback adapter kept for isolated preview compatibility.
// The current public and Mi USITTEL integrations mount the official element directly.
import { chatPreviewEnabled } from './attention-chat.js';

const SDK = 'https://web.central.chat/widget/core.js';
const CHANNEL_KEY = 'wiOT-40q9iiyNBb8NahcAg|-6VqjB9Gh2bDQwOp5CME1w';
const PREFILL_BY_TOPIC = Object.freeze({
  'upgrade-speed': 'Quiero consultar por una mejora de velocidad',
  'update-account': 'Quiero actualizar mis datos de contacto',
  'technical-support': 'Necesito ayuda técnica',
  'mesh': 'Quiero consultar por Wi-Fi Mesh',
  'additional-service': 'Quiero consultar por un servicio adicional',
  'access-help': 'Necesito ayuda para ingresar a Mi USITTEL',
});
function updatePortalLauncher(open) {
  const button = document.querySelector('[data-action="chat-launcher"]');
  const mount = document.getElementById('central-chat-mount');
  mount?.classList.toggle('is-open', open);
  if (!button) return;
  const label = open ? 'Cerrar chat de soporte' : 'Abrir chat de soporte';
  button.classList.toggle('is-open', open);
  button.setAttribute('aria-label', label);
  button.setAttribute('aria-expanded', String(open));
  button.title = label;
}
const setStatus = text => {
  const note = document.querySelector('.attention-preview-note');
  if (note) { note.textContent = text; note.setAttribute('role', 'status'); }
};

export class CentralChatAdapter {
  constructor(channelKey, entry = {}, clearAnonymous = false) {
    this.channelKey = channelKey;
    this.appJwt = entry.appJwt;
    this.clearAnonymous = clearAnonymous;
    this.disposed = false;
    this.operation = 0;
  }
  mount() {
    this.element = document.createElement('central-chat');
    this.element.setAttribute('channel-key', this.channelKey);
    // The short-lived token stays in memory; never put it in DOM attributes or storage.
    if (this.appJwt) this.element.appJwt = this.appJwt;
    this.appJwt = undefined;
    this.element.setAttribute('locale', 'es');
    const container = document.getElementById('attention-chat-container');
    const portalMount = document.getElementById('central-chat-mount');
    this.portal = Boolean(portalMount && !container);
    // The portal owns the only floating launcher. Embedded mode prevents
    // Central from rendering its second launcher below the chat panel.
    if (container || this.portal) this.element.setAttribute('mode', 'fill-container');
    if (this.portal) this.element.setAttribute('hide', '');
    this.ready = new Promise(resolve => {
      this.element.addEventListener('central-chat-mount', () => resolve(), { once: true });
    });
    this.element.addEventListener('central-chat-mount', () => {
      clearTimeout(this.timer);
      setStatus('');
    }, { once: true });
    // Never log central-chat-event: its payload may contain customer data.
    this.timer = setTimeout(() => {
      setStatus('Central todavía no pudo conectarse. Cerrá esta página y volvé a intentar más tarde.');
    }, 25000);
    (container || portalMount || document.body).append(this.element);
    if (this.portal) void Promise.resolve(this.element.hide()).catch(() => setStatus('Central no está disponible. Volvé a intentar más tarde.'));
  }
  async waitForMount() {
    let timer;
    try {
      await Promise.race([this.ready, new Promise((_,reject) => { timer = setTimeout(() => reject(new Error('Central mount timeout')), 12000); })]);
    } finally { clearTimeout(timer); }
  }
  async open(topic) {
    const request = ++this.operation;
    const current = () => !this.disposed && request === this.operation;
    try {
      await this.waitForMount();
      if (!current()) return false;
      if (this.clearAnonymous) {
        // Central only permits clearChat on anonymous embeds. Clear BEFORE showing
        // a widget after a portal account change, including after a page reload.
        await this.element.clearChat();
        if (!current()) return false;
        this.clearAnonymous = false;
        markAuthenticated(false);
      }
      await this.element.show();
      if (!current()) return false;
      await this.element.maximize();
      if (!current()) return false;
      const prefill = Object.hasOwn(PREFILL_BY_TOPIC, topic) ? PREFILL_BY_TOPIC[topic] : null;
      updatePortalLauncher(true);
      if (prefill && typeof this.element.prefill === 'function') {
        try { await this.element.prefill(prefill); }
        catch { setStatus('No pudimos preparar el mensaje. Podés escribirlo en el chat.'); }
      }
      return true;
    }
    catch { setStatus('No pudimos abrir Central. Volvé a intentar más tarde.'); return false; }
  }
  async close() {
    ++this.operation;
    try {
      if (this.portal) await this.element.hide();
      else await this.element.minimize();
      updatePortalLauncher(false);
      return true;
    }
    catch { setStatus('No pudimos cerrar Central. Volvé a intentar más tarde.'); return false; }
  }
  reset() { this.close(); }
  destroy() { this.disposed = true; ++this.operation; clearTimeout(this.timer); this.element.remove(); }
}

const AUTH_MARKER = 'mi-usittel-central-authenticated';
const SESSION_EVENT = 'mi-usittel-central-session';
const anonymous = () => ({ authenticated: false, identity: 'anonymous' });
let entryLoader = async () => anonymous();
let identityConfigured = false;
let centralPromise, sdkPromise, activeAdapter, activeIdentity;
let generation = 0, operation = 0;
let suspended = false;
let needsAnonymousClear = false;
function wasAuthenticated() {
  try { return localStorage.getItem(AUTH_MARKER) === '1'; } catch { return identityConfigured; }
}
function markAuthenticated(value) {
  try { if (value) localStorage.setItem(AUTH_MARKER, '1'); else localStorage.removeItem(AUTH_MARKER); } catch { /* storage is optional */ }
}
export function configureCentralChatIdentity(loader) { entryLoader = loader; identityConfigured = true; }
export function resetCentralChatIdentity({ broadcast = false, suspend = false } = {}) {
  ++generation; ++operation;
  suspended = suspend;
  needsAnonymousClear ||= Boolean(activeAdapter?.element.appJwt) || wasAuthenticated();
  activeAdapter?.destroy();
  activeAdapter = null; activeIdentity = null; centralPromise = null;
  updatePortalLauncher(false);
  if (broadcast) {
    try { localStorage.setItem(SESSION_EVENT, `${Date.now()}:${Math.random()}`); } catch { /* no profile data in storage */ }
  }
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === SESSION_EVENT) resetCentralChatIdentity();
});
async function loadEntry() {
  let timer;
  try {
    const entry = await Promise.race([entryLoader(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Identity timeout')), 12000); })]);
    if (entry?.authenticated === true && typeof entry.identity === 'string' && /^[a-f0-9]{64}$/.test(entry.identity)
        && typeof entry.appJwt === 'string' && entry.appJwt.length < 20000
        && /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]*){4}$/.test(entry.appJwt)
        && entry.expiresAt * 1000 > Date.now() + 10000) return entry;
  } catch { /* Manual capture remains available when identity is unavailable. */ }
  finally { clearTimeout(timer); }
  return anonymous();
}
export async function openCentralChat(topic) {
  if (suspended) return false;
  const version = generation, request = ++operation;
  const entry = await loadEntry();
  if (version !== generation || request !== operation) return false;
  const adapter = await initializeCentralChat(entry);
  if (version !== generation || request !== operation) return false;
  return adapter ? adapter.open(topic) : false;
}
export async function closeCentralChat() {
  ++operation;
  const adapter = await centralPromise;
  return adapter ? adapter.close() : false;
}
function loadSdk() {
  if (!sdkPromise) sdkPromise = (async () => {
    if (!customElements.get('central-chat')) await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('SDK timeout')), 15000);
      script.src = SDK; script.referrerPolicy = 'no-referrer';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('SDK unavailable')); };
      document.head.append(script);
    });
    if (!customElements.get('central-chat')) throw new Error('Central unavailable');
  })().catch(error => { sdkPromise = null; throw error; });
  return sdkPromise;
}
export function initializeCentralChat(entry = anonymous()) {
  if (centralPromise && activeIdentity === entry.identity) return centralPromise;
  needsAnonymousClear ||= wasAuthenticated();
  if (activeAdapter) { activeAdapter.destroy(); updatePortalLauncher(false); }
  activeAdapter = null; activeIdentity = entry.identity;
  const version = generation;
  const promise = (async () => {
    try {
      await loadSdk();
      if (version !== generation || centralPromise !== promise || !document.querySelector('#central-chat-mount')) return null;
      const adapter = new CentralChatAdapter(CHANNEL_KEY, entry, !entry.authenticated && needsAnonymousClear);
      if (entry.authenticated) markAuthenticated(true);
      adapter.mount(); activeAdapter = adapter;
      needsAnonymousClear = false;
      return adapter;
    } catch { if (centralPromise === promise) { centralPromise = null; activeIdentity = null; } return null; }
  })();
  centralPromise = promise;
  return centralPromise;
}

export async function createCentralPreview(mount) {
  if (!chatPreviewEnabled() || !/^\/atencion\/?$/.test(location.pathname)) return null;
  setStatus('Prueba local de Central · Conectando. Si enviás un mensaje, llegará a USITTEL.');
  try {
    const response = await fetch('/attention-preview-config.json', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('config unavailable');
    const config = await response.json();
    if (!/^[A-Za-z0-9_-]{1,100}\|[A-Za-z0-9_-]{1,100}$/.test(config.channelKey || '')) throw new Error('config invalid');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('SDK timeout')), 15000);
      script.src = SDK;
      script.referrerPolicy = 'no-referrer';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('SDK unavailable')); };
      document.head.append(script);
    });
    if (!customElements.get('central-chat')) throw new Error('SDK element unavailable');
    return mount({ adapter: new CentralChatAdapter(config.channelKey) });
  } catch {
    setStatus('Central no está disponible en esta prueba. El resto de la atención por WhatsApp sigue igual.');
    document.querySelectorAll('[data-attention-open]').forEach(button => { button.disabled = true; });
    return null;
  }
}
