// Imported only on loopback: production help and WhatsApp remain unchanged.
export function mountAttentionHelp() {
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/atencion/attention.css';
  document.head.append(style);
  const section = document.createElement('section');
  section.className = 'attention-help-preview';
  section.setAttribute('aria-label', 'Atención y gestiones');
  section.innerHTML = `<p class="attention-preview-note">Vista local de la futura atención USITTEL</p>
    <div class="attention-paths">
      <section class="attention-customer" aria-labelledby="customer-title"><p class="attention-eyebrow">TUS GESTIONES</p><h2 id="customer-title">Soy cliente</h2><p>Consultá tus facturas, pagá y revisá el estado de tu servicio.</p><a class="attention-primary" href="/autogestion/">Ingresar a Mi USITTEL →</a><a class="attention-link" href="/atencion?chat-provider=central">Necesito hablar con alguien →</a></section>
      <section class="attention-customer" aria-labelledby="sales-title"><p class="attention-eyebrow">CONECTATE CON USITTEL</p><h2 id="sales-title">Quiero contratar</h2><p>Hablá con nosotros para encontrar tu plan y consultar la cobertura.</p><a class="attention-primary" href="/atencion?chat-provider=central&intent=sales">Hablar con ventas →</a><a class="attention-link" href="/pages/internet/">Ver planes y cobertura →</a></section>
    </div>`;
  document.querySelector('.help-hero')?.after(section);
}
