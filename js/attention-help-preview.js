// Shared guidance for the public help center. Until Central is in production,
// direct attention requests continue through the official WhatsApp line.
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
      <section class="attention-customer" aria-labelledby="customer-title"><p class="attention-eyebrow">TUS GESTIONES</p><h2 id="customer-title">Soy cliente</h2><p>Consultá tus facturas, pagá y revisá el estado de tu servicio.</p><a class="attention-primary" href="/autogestion/">Ingresar a Mi USITTEL →</a></section>
      <section class="attention-customer" aria-labelledby="sales-title"><p class="attention-eyebrow">CONECTATE CON USITTEL</p><h2 id="sales-title">Quiero contratar</h2><p>Hablá con nosotros para encontrar tu plan y consultar la cobertura.</p><a class="attention-primary" href="https://wa.me/5492494060345" target="_blank" rel="noopener">Hablar con ventas →</a></section>
    </div>`;
  document.querySelector('.help-hero')?.after(section);
}
