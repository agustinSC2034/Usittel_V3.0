// Local design preview only. No identity, transport, storage or provider SDK.
export function chatPreviewEnabled(hostname = location.hostname) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

const chatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg>';

// Adapter boundary: a future Central adapter must implement mount/open/close/destroy.
// Do not pass customer objects, query parameters or session data into this API.
export class MockChatAdapter {
  mount() {
    const panel = document.createElement('dialog');
    panel.className = 'attention-chat';
    panel.setAttribute('aria-labelledby', 'attention-chat-title');
    panel.innerHTML = `<header class="attention-chat-header"><span class="attention-chat-mark">${chatIcon}</span><div><h2 id="attention-chat-title">USITTEL</h2><p>Atención al cliente</p></div><button type="button" class="attention-chat-close" aria-label="Cerrar chat">×</button></header>
      <p class="attention-chat-notice">Vista de prueba · No hay un agente conectado.</p>
      <div class="attention-chat-body"><div class="attention-chat-log" role="log" aria-label="Conversación de prueba" aria-live="polite"></div>
      <div class="attention-chat-choices" aria-label="Elegí tu consulta"><button type="button" data-topic="customer">Soy cliente <span aria-hidden="true">→</span></button><button type="button" data-topic="sales">Quiero contratar <span aria-hidden="true">→</span></button><button type="button" data-topic="technical">Tengo un problema técnico <span aria-hidden="true">→</span></button></div></div>
      <form class="attention-chat-form"><label class="attention-chat-label" for="attention-chat-message">Mensaje de prueba</label><div><input id="attention-chat-message" name="preview-message" placeholder="Escribí un mensaje de prueba" autocomplete="off" maxlength="500" required><button type="submit" aria-label="Enviar mensaje de prueba">↑</button></div><p>No se envía ni se guarda. Usá datos ficticios.</p></form>`;
    document.body.append(panel);
    this.panel = panel;
    this.log = panel.querySelector('.attention-chat-log');
    this.choices = panel.querySelector('.attention-chat-choices');
    this.form = panel.querySelector('form');
    panel.querySelector('.attention-chat-close').addEventListener('click', () => this.close());
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button, a[href], input')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    panel.addEventListener('close', () => {
      this.reset();
      if (this.trigger?.isConnected) this.trigger.focus({ preventScroll: true });
    });
    panel.addEventListener('click', event => {
      const choice = event.target.closest('[data-topic]');
      if (!choice) return;
      this.message(choice.firstChild.textContent.trim(), true);
      this.choices.hidden = true;
      const topic = choice.dataset.topic;
      if (topic === 'customer') {
        this.message('En Mi USITTEL podés consultar tus facturas, pagos y el estado de tu servicio.');
        this.link('Ir a Mi USITTEL', '/autogestion/');
      } else if (topic === 'sales') {
        this.message('Conocé nuestros planes y consultá la cobertura para tu domicilio.');
        this.link('Ver planes y cobertura', '/pages/internet/');
      } else {
        this.message('Revisá que el equipo esté encendido y sus cables conectados. En la atención real, nuestro equipo podrá ayudarte a continuar.');
        this.link('Ver ayuda rápida', '/pages/centro_de_ayuda/');
      }
    });
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      event.stopPropagation();
      const value = this.form.elements['preview-message'].value.trim().slice(0, 500);
      if (!value) return;
      this.message(value, true);
      this.message('Así se vería la conversación. Este mensaje es de ejemplo y no se envió a nuestro equipo.');
      this.form.reset();
      this.form.querySelector('input').focus();
    });
    this.reset();
  }
  message(text, mine = false) {
    const item = document.createElement('p');
    item.className = 'attention-chat-message' + (mine ? ' attention-chat-mine' : '');
    item.textContent = text;
    this.log.append(item);
    // Bound the transient DOM; never persist conversation text.
    while (this.log.children.length > 30) this.log.firstElementChild.remove();
    item.scrollIntoView({ block: 'nearest' });
  }
  link(label, href) {
    const link = document.createElement('a');
    link.className = 'attention-chat-link';
    link.href = href;
    link.textContent = label + ' →';
    this.log.append(link);
  }
  reset() {
    this.log.replaceChildren();
    this.form.reset();
    this.choices.hidden = false;
    this.message('Hola 👋 ¿En qué podemos ayudarte?');
  }
  open(trigger) {
    if (this.panel.open) return;
    this.trigger = trigger || document.activeElement;
    this.panel.showModal();
    this.panel.querySelector('.attention-chat-close').focus();
  }
  close() { if (this.panel.open) this.panel.close(); }
  destroy() { this.close(); this.panel.remove(); }
}

let controller;
export function mountChatPreview({ floating = false, adapter = new MockChatAdapter() } = {}) {
  if (!chatPreviewEnabled()) return null;
  if (controller) return controller;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('../assets/attention-chat.css', import.meta.url).href;
  document.head.append(stylesheet);
  adapter.mount();
  if (floating) {
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'attention-chat-launcher';
    launcher.setAttribute('data-attention-open', '');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.innerHTML = chatIcon + '<span>¿Necesitás ayuda?<small>Vista de prueba</small></span>';
    document.body.append(launcher);
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-attention-open]');
    if (!trigger) return;
    event.preventDefault();
    adapter.open(trigger);
  });
  // Clear transient text on navigation, logout, service switch or bfcache departure.
  const reset = () => { adapter.close(); adapter.reset(); };
  window.addEventListener('hashchange', reset);
  window.addEventListener('pagehide', reset);
  controller = { open: trigger => adapter.open(trigger), reset };
  return controller;
}
