// Legacy loopback adapter kept for isolated preview compatibility.
// The current public and Mi USITTEL integrations mount the official element directly.
import { chatPreviewEnabled } from './attention-chat.js';

const SDK = 'https://web.central.chat/widget/core.js';
const CHANNEL_KEY = 'wiOT-40q9iiyNBb8NahcAg|SZaCDgFymGhOoc4aJwuCMQ';
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
  constructor(channelKey) { this.channelKey = channelKey; }
  mount() {
    this.element = document.createElement('central-chat');
    this.element.setAttribute('channel-key', this.channelKey);
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
    try {
      await this.waitForMount();
      await this.element.show(); await this.element.maximize();
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
    try {
      if (this.portal) await this.element.hide();
      else await this.element.minimize();
      updatePortalLauncher(false);
      return true;
    }
    catch { setStatus('No pudimos cerrar Central. Volvé a intentar más tarde.'); return false; }
  }
  reset() { this.close(); }
  destroy() { clearTimeout(this.timer); this.element.remove(); }
}

let centralPromise;
export async function openCentralChat(topic) {
  const adapter = await initializeCentralChat();
  return adapter ? adapter.open(topic) : false;
}
export async function closeCentralChat() {
  const adapter = await centralPromise;
  return adapter ? adapter.close() : false;
}
export function initializeCentralChat() {
  if (centralPromise) return centralPromise;
  centralPromise = (async () => {
    try {
      if (!customElements.get('central-chat')) await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const timer = setTimeout(() => reject(new Error('SDK timeout')), 15000);
        script.src = SDK; script.referrerPolicy = 'no-referrer';
        script.onload = () => { clearTimeout(timer); resolve(); };
        script.onerror = () => { clearTimeout(timer); reject(new Error('SDK unavailable')); };
        document.head.append(script);
      });
      if (!document.querySelector('#central-chat-mount') || !customElements.get('central-chat')) throw new Error('Central unavailable');
      const adapter = new CentralChatAdapter(CHANNEL_KEY); adapter.mount(); return adapter;
    } catch { return null; }
  })();
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
