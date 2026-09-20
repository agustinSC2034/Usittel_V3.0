import {customer,runtime,planLabel,connectivityLabel} from './data.js';
import {status,icon,button,escapeHTML as e} from './components.js';

const commercial=(topic,label='Consultar')=>`<a class="text-action" href="https://wa.me/5492494060345?text=${encodeURIComponent('Hola, quisiera consultar por '+topic+'.')}" target="_blank" rel="noopener noreferrer">${label} ${icon('arrow-up-right')}</a>`;
export function contractedProducts() {
  return Array.isArray(customer.products) && customer.products.length
    ? `<ul class="contracted-products" aria-label="Adicionales contratados">${customer.products.map(p=>`<li>${icon('check')}${e(planLabel(p))}</li>`).join('')}</ul>` : '';
}
export function servicePage() {
  const detail=runtime.connectionDetails;
  const state=detail ? (detail.modemState ?? detail.connectionState) : customer.connectionState;
  const checked=detail?.checkedAt ? new Date(detail.checkedAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}) : null;
  return `<h1 tabindex="-1">Mi servicio</h1>
  <div class="service-top-grid">
    <section class="contract-summary" aria-labelledby="plan-title"><p class="eyebrow">Tu plan contratado</p>
      <h2 id="plan-title">${e(planLabel(customer.plan))}</h2><div class="plan-bottom">${status(customer.serviceStatus)}<button class="text-action" data-action="show-speedtest">${icon('activity')}Probar velocidad</button></div>
      ${contractedProducts()}
    </section>
    <section class="connection-summary" aria-labelledby="connectivity-title">
      <div class="section-heading"><h2 id="connectivity-title">Estado de tu conexión</h2><button class="billing-refresh" data-action="connection-refresh" aria-label="Actualizar estado de conexión" title="Actualizar estado" ${runtime.connectionRefreshing?'disabled aria-busy="true"':''}>${icon('refresh-cw',runtime.connectionRefreshing?'spinning':'')}</button></div>
      <div class="connection-reading"><span class="connection-symbol">${icon(state==='offline'?'wifi-off':'wifi')}</span><div><p class="field-hint">${detail?.modemState ? 'Equipo de conexión' : 'Conexión a internet'}</p>${status(connectivityLabel(state))}</div></div>
      <p class="field-hint" role="status">${runtime.connectionRefreshing?'Consultando estado…':runtime.connectionError?e(runtime.connectionError):`${checked?'Consultado a las '+e(checked)+'. ':''}Último estado informado. Puede demorar en actualizarse.`}</p>
    </section>
  </div>
  <section class="service-wifi" aria-labelledby="wifi-title"><div><span class="eyebrow">Tu red, a tu manera</span><h2 id="wifi-title">Mis redes Wi-Fi</h2><p class="muted">Cambiá el nombre y la contraseña de tus redes.</p><p class="field-hint">${runtime.mode==='demo'?'Los cambios de esta vista son de demostración.':'Actualizá los datos de acceso de tus dispositivos.'}</p></div><div class="wifi-actions">${button('Configurar redes','wifi-settings',{secondary:true,iconName:'wifi'})}${commercial('cambiar el nombre y la contraseña de mi Wi-Fi','Pedir ayuda')}</div></section>
  ${speedtestSection()}
  <section class="service-addons" aria-labelledby="addons-title"><h2 id="addons-title">Más para tu servicio</h2>${customer.products===null?'<p class="field-hint">El detalle de tus adicionales todavía no está disponible.</p>':''}<div class="addon-options"><div>${icon('tv')}<h3>TV Sensa y packs</h3><p class="muted">Consultá por televisión y contenido adicional para tu cuenta.</p>${commercial('TV Sensa y sus packs')}</div><div>${icon('wifi')}<h3>Wi-Fi en más ambientes</h3><p class="muted">Conocé las opciones de Wi-Fi Mesh para ampliar la cobertura.</p>${commercial('Wi-Fi Mesh')}</div><div>${icon('zap')}<h3>Más velocidad</h3><p class="muted">Encontrá el plan que mejor se adapte a lo que necesitás.</p>${commercial('mejorar mi plan de internet')}</div></div><p class="field-hint">Te confirmaremos disponibilidad, precio y condiciones antes de contratar.</p></section>`;
}
function speedtestSection() {
  return `<section id="service-speedtest" class="service-speedtest" aria-labelledby="speed-title" tabindex="-1">
    <div class="speed-intro"><span class="eyebrow">Desde este dispositivo</span><h2 id="speed-title">Probá tu conexión</h2><p class="muted">Medí la velocidad de tu conexión con Speedtest.</p></div>
    <div class="speed-external"><a class="button" id="speedtest-link" href="https://www.speedtest.net/" target="_blank" rel="noopener noreferrer">${icon('external-link')}Abrir Speedtest</a><p class="field-hint">Se abre en una nueva pestaña.</p></div>

      <div class="speed-guidance"><h3>Para una buena medición</h3><ol><li><strong>Mejor por cable.</strong> Usá Cat 5e o superior y puertos Gigabit para planes de hasta 1.000 Mbps. Un puerto de 100 Mbps limita la prueba.</li><li><strong>Por Wi-Fi, elegí 5 GHz.</strong> Acercate al router. La red de 2,4 GHz suele tener más interferencias y menor velocidad.</li><li><strong>Dale espacio a la prueba.</strong> Pausá descargas, streaming y VPN.</li></ol></div>
  </section>`;
}
