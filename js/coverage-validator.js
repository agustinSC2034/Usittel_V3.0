/* UI controller: coverage is local; geocoding is optional and independent. */
(function () {
  'use strict';
  const scriptURL = document.currentScript.src;
  const endpoint = new URL('../includes/coverage-geocode.php', scriptURL);
  const core = window.UsittelCoverage;
  const data = window.UsittelCoverageData;
  const input = document.getElementById('address-input');
  const button = document.getElementById('coverage-button');
  const result = document.getElementById('coverage-result');
  const mapElement = document.getElementById('coverage-map');
  if (!core || !data || !input || !button || !result) return;
  const current = core.compile(data.current);
  const future = core.compile(data.future);
  let map, marker, bounds, controller, revision = 0;
  const cache = new Map();
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');
  input.maxLength = 160;
  input.setAttribute('aria-label', 'Dirección a consultar');
  input.setAttribute('autocomplete', 'street-address');
  input.setAttribute('aria-describedby', 'coverage-help coverage-result');

  const existingHelp = document.getElementById('coverage-help');
  const help = existingHelp || document.createElement('p');
  help.id = 'coverage-help';
  help.className = 'coverage-help';
  help.textContent = 'Ingresá calle y altura de Tandil. Por ejemplo: San Martín 1000.';
  if (!existingHelp) input.parentElement.insertAdjacentElement('afterend', help);
  const mapStatus = document.createElement('p');
  mapStatus.className = 'coverage-map-status';
  mapStatus.setAttribute('role', 'status');
  mapStatus.setAttribute('aria-live', 'polite');
  const idleMapMessage = document.body.classList.contains('home-page') ? '' : 'El área dibujada es orientativa. Consultá tu dirección para verificar cobertura.';
  mapStatus.textContent = idleMapMessage;
  mapElement?.insertAdjacentElement('afterend', mapStatus);

  function initializeMap() {
    if (map || !mapElement || !window.L) return Boolean(map);
    try {
      map = L.map(mapElement, { scrollWheelZoom: false }).setView([-37.321, -59.135], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      const polygon = L.polygon(data.polygon, { color: '#2563eb', weight: 2, fillOpacity: 0.15 }).addTo(map);
      polygon.bindPopup('Área orientativa. La disponibilidad se consulta por calle y altura.');
      bounds = polygon.getBounds();
      map.fitBounds(bounds);
      return true;
    } catch {
      map = null;
      mapStatus.textContent = 'El mapa no está disponible. Podés consultar cobertura igualmente.';
      return false;
    }
  }

  function clearSearch() {
    revision++;
    controller?.abort();
    controller = null;
    if (marker && map) map.removeLayer(marker);
    marker = null;
    result.replaceChildren();
    input.removeAttribute('aria-invalid');
    mapStatus.textContent = idleMapMessage;
  }

  function textElement(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function showResult(title, text, status, contact = true) {
    const box = textElement('div', '', 'coverage-response');
    box.dataset.status = status;
    box.append(textElement('h3', title), textElement('p', text));
    if (contact) {
      const link = textElement('a', 'Consultar por WhatsApp');
      link.href = 'https://wa.me/5492494060345';
      link.target = '_blank';
      link.rel = 'noopener';
      box.append(link);
    }
    result.replaceChildren(box);
  }

  function renderLocation(location, address) {
    if (marker) map.removeLayer(marker);
    const label = location.precision === 'exact'
      ? `${address.street} ${address.number}, Tandil`
      : `${address.street}, Tandil · Ubicación aproximada de la calle, no del domicilio`;
    // Leaflet receives a DOM node, never interpolated user HTML.
    marker = L.marker([location.lat, location.lon]).addTo(map);
    marker.bindPopup(textElement('span', label)).openPopup();
    map.setView([location.lat, location.lon], location.precision === 'exact' ? 16 : 14);
    mapStatus.textContent = location.precision === 'exact'
      ? 'Dirección ubicada en el mapa. La cobertura se determina por calle y altura.'
      : 'Ubicación aproximada de la calle. No pudimos ubicar la altura exacta; el resultado de cobertura no cambia.';
  }

  async function locate(address, id) {
    if (!initializeMap()) {
      mapStatus.textContent = 'El mapa no está disponible. El resultado de cobertura sigue siendo válido.';
      return;
    }
    const key = `${core.normalizeStreet(address.street)}|${address.number}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      if (cached.location) renderLocation(cached.location, address);
      else mapStatus.textContent = 'No pudimos ubicar ese domicilio en el mapa. El resultado de cobertura no cambia.';
      return;
    }
    const request = new AbortController();
    controller = request;
    const timer = setTimeout(() => request.abort(), 9000);
    mapStatus.textContent = 'Ubicando la dirección en el mapa…';
    try {
      const response = await fetch(endpoint, {
        method: 'POST', signal: request.signal, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(address)
      });
      if (!response.ok) throw new Error(response.status === 429 ? 'busy' : 'unavailable');
      const body = await response.json();
      if (!Array.isArray(body.results)) throw new Error('invalid');
      if (id !== revision || request.signal.aborted) return;
      const location = core.selectLocation(body.results, address);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { location, expires: Date.now() + (location ? 3600000 : 300000) });
      if (location) renderLocation(location, address);
      else mapStatus.textContent = 'No pudimos ubicar ese domicilio en el mapa. El resultado de cobertura no cambia.';
    } catch (error) {
      if (id !== revision) return;
      mapStatus.textContent = error.message === 'busy'
        ? 'El mapa está ocupado. Podés volver a consultar en unos segundos; la cobertura ya está resuelta.'
        : 'No pudimos cargar la ubicación. El resultado de cobertura no cambia.';
    } finally {
      clearTimeout(timer);
      if (controller === request) controller = null;
    }
  }

  function checkCoverage(event) {
    event?.preventDefault();
    clearSearch();
    const address = core.parseAddress(input.value);
    if (!address) {
      input.setAttribute('aria-invalid', 'true');
      showResult('Revisá la dirección', input.value.trim()
        ? 'Ingresá calle y altura, por ejemplo: Pasaje 1 de Mayo 1200.'
        : 'Por favor, ingresá una dirección.', 'invalid', false);
      input.focus();
      return;
    }
    const status = core.classify(current, future, address);
    const messages = {
      available: ['¡Estás en Zona Usittel!', 'Tenemos cobertura registrada para esta calle y altura. Contactanos para coordinar la contratación.'],
      planned: ['Estamos llegando a tu zona', 'Tu dirección está dentro de una zona de ampliación prevista. Consultanos por su disponibilidad.'],
      outside: ['No tenemos cobertura registrada para esa altura', 'Podés consultarnos para confirmar la disponibilidad o conocer las próximas ampliaciones.'],
      unknown: ['No pudimos reconocer la calle', 'Revisá el nombre completo y la altura. Si están bien, consultanos para verificar la cobertura.'],
      review: ['Necesitamos confirmar esa dirección', 'No podemos resolver la disponibilidad automáticamente para esta dirección. Consultanos y la verificamos.']
    };
    showResult(...messages[status], status);
    if (map && bounds) map.fitBounds(bounds);
    if (status !== 'unknown' && status !== 'review') void locate(address, revision);
    else mapStatus.textContent = 'Consultanos para confirmar la dirección y su cobertura.';
  }

  button.type = 'button';
  button.addEventListener('click', checkCoverage);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) checkCoverage(event);
  });
  input.addEventListener('input', clearSearch);
  if (mapElement && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { initializeMap(); observer.disconnect(); }
    }, { rootMargin: '200px' });
    observer.observe(mapElement);
  } else initializeMap();
})();
