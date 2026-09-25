import {customer,runtime,planLabel,connectivityLabel} from './data.js';
import {formatOfferPrice,offerCta} from './service-catalog.js';
import {status,icon,button,escapeHTML as e} from './components.js';

const offerButton=(type,label)=>`<button type="button" class="button" data-action="chat" data-chat-topic="${e(type)}">${label} ${icon('arrow-right')}</button>`;
export function contractedProducts() {
  const state=runtime.servicePresentation || (Array.isArray(customer.products)?{known:true,items:customer.products.map(label=>({label,quantity:null}))}:{known:false,items:[]});
  const internet=`<li>${icon('check')}<span>${e(planLabel(customer.plan))}</span></li>`;
  if (!state.known) return `<ul class="contracted-products" aria-label="Tus servicios">${internet}</ul><p class="field-hint">El detalle de servicios adicionales no está disponible en este momento.</p>`;
  return `<ul class="contracted-products" aria-label="Tus servicios">${internet}${state.items.map(item=>`<li>${icon('check')}<span>${e(item.label)}${item.quantity?` × ${e(item.quantity)}`:''}</span></li>`).join('')}</ul>`;
}
function offersSection() {
  const offers=runtime.commercialOffers;
  if (!offers.length) return '';
  return `<section class="service-offers" aria-labelledby="offers-title"><p class="eyebrow">Opciones para vos</p><h2 id="offers-title">Podés sumar</h2><div class="offer-options">${offers.map(o=>`<div class="commercial-option"><div><h3>${e(o.public_name)}</h3><p>${e(o.description)}</p><p class="offer-price">${e(formatOfferPrice(o))}</p></div>${offerButton(o.id,offerCta(o.type))}</div>`).join('')}</div></section>`;
}
export function servicePage() {
  const detail=runtime.connectionDetails;
  const state=detail?.connectionState ?? customer.connectionState;
  const checked=detail?.checkedAt ? new Date(detail.checkedAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}) : null;
  return `<h1 tabindex="-1">Mi servicio</h1>
  <div class="service-top-grid">
    <section class="contract-summary" aria-labelledby="plan-title"><p class="eyebrow">Plan contratado</p>
      <h2 id="plan-title">${e(planLabel(customer.plan))}</h2><div class="plan-bottom">${status(customer.serviceStatus)}</div>
    </section>
    <section class="connection-summary" aria-labelledby="connectivity-title">
      <div class="section-heading"><h2 id="connectivity-title">Estado de tu conexión</h2><button class="billing-refresh" data-action="connection-refresh" aria-label="Actualizar estado de conexión" title="Actualizar estado" ${runtime.connectionRefreshing?'disabled aria-busy="true"':''}>${icon('refresh-cw',runtime.connectionRefreshing?'spinning':'')}</button></div>
      <div class="connection-reading"><span class="connection-symbol">${icon(state==='offline'?'wifi-off':'wifi')}</span><div><p class="field-hint">Conexión a internet</p>${status(connectivityLabel(state))}</div></div>
      <p class="field-hint" role="status">${runtime.connectionRefreshing?'Consultando estado…':runtime.connectionError?e(runtime.connectionError):`${checked?'Consultado a las '+e(checked)+'. ':''}Último estado informado. Puede demorar en actualizarse.`}</p>
    </section>
  </div>
  <section class="contracted-services-section" aria-labelledby="contracted-title"><p class="eyebrow">Incluidos en tu cuenta</p><h2 id="contracted-title">Tus servicios</h2>${contractedProducts()}</section>
  <section class="service-tools" aria-labelledby="tools-title"><p class="eyebrow">A tu alcance</p><h2 id="tools-title">Herramientas</h2><div class="service-tools-grid">
  <section class="service-wifi" aria-labelledby="wifi-title"><div><span class="eyebrow">Herramientas</span><h2 id="wifi-title">Configurá tu Wi-Fi</h2><p class="muted">Cambiá el nombre y la contraseña de tus redes.</p></div><div class="wifi-actions">${button('Configurar Wi-Fi','wifi-settings',{secondary:true,iconName:'wifi'})}<button type="button" class="text-action" data-action="show-speedtest">${icon('activity')}Test de velocidad</button></div></section>
  ${speedtestSection()}
  </div></section>
  ${offersSection()}
  `;
}
function speedtestSection() {
  return `<section id="service-speedtest" class="service-speedtest" aria-labelledby="speed-title" tabindex="-1">
    <div class="speed-intro"><span class="eyebrow">Desde este dispositivo</span><h2 id="speed-title">Probá tu conexión</h2><p class="muted">Medí la velocidad de tu conexión con el test de USITTEL.</p></div>
    <div class="speed-external"><a class="button" id="speedtest-link" href="http://velocidad.usittel.com.ar/speedtest/" target="_blank" rel="noopener noreferrer">${icon('external-link')}Abrir test de USITTEL</a><p class="field-hint">Se abre en una nueva pestaña.</p></div>

      <details class="speed-guidance"><summary>Para una buena medición</summary><ol><li><strong>Mejor por cable.</strong> Usá Cat 5e o superior y puertos Gigabit para planes de hasta 1.000 Mbps. Un puerto de 100 Mbps limita la prueba.</li><li><strong>Por Wi-Fi, elegí 5 GHz.</strong> Acercate al router. La red de 2,4 GHz suele tener más interferencias y menor velocidad.</li><li><strong>Dale espacio a la prueba.</strong> Pausá descargas, streaming y VPN.</li></ol></details>
  </section>`;
}
