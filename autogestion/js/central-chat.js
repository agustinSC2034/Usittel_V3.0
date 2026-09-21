// Real widget, ONLY on the isolated local /atencion preview selected explicitly.
// Public channel configuration comes from the loopback preview server, never from
// Mi USITTEL's private config, login session or URL identity parameters.
import { chatPreviewEnabled } from './attention-chat.js';

const SDK = 'https://web.central.chat/widget/core.js';
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
    if (container) this.element.setAttribute('mode', 'fill-container');
    this.element.addEventListener('central-chat-mount', () => {
      clearTimeout(this.timer);
      setStatus('Central conectado · Prueba local real. Los mensajes que envíes llegarán a USITTEL.');
    }, { once: true });
    // Never log central-chat-event: its payload may contain customer data.
    this.timer = setTimeout(() => {
      setStatus('Central todavía no pudo conectarse. Cerrá esta página y volvé a intentar más tarde.');
    }, 25000);
    (container || document.body).append(this.element);
  }
  async open() {
    try {
      await this.element.show(); await this.element.maximize();
    }
    catch { setStatus('No pudimos abrir Central. Volvé a intentar más tarde.'); }
  }
  close() { this.element.minimize().catch(() => {}); }
  reset() { this.close(); }
  destroy() { clearTimeout(this.timer); this.element.remove(); }
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
