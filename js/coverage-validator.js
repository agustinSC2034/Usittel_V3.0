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
    marker = L.marker([location.lat, location.lon]).addTo(map);
    map.setView([location.lat, location.lon], 16);
    mapStatus.textContent = '';
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
    let timer;
    mapStatus.textContent = 'Ubicando la dirección en el mapa…';
    try {
      let location = null;
      const offsets = [0, 1, -1, 2, -2, 3, -3, 5, -5, 10, -10];
      for (const offset of offsets) {
        const number = address.number + offset;
        if (number < 1 || number > 999999) continue;
        if (offset !== 0) {
          await new Promise(resolve => {
            const finish = () => {
              clearTimeout(pause);
              request.signal.removeEventListener('abort', finish);
              resolve();
            };
            const pause = setTimeout(finish, 1200);
            request.signal.addEventListener('abort', finish, { once: true });
          });
        }
        if (id !== revision || request.signal.aborted) return;
        timer = setTimeout(() => request.abort(), 9000);
        const response = await fetch(endpoint, {
          method: 'POST', signal: request.signal, credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ ...address, number })
        });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({}));
          const reason = response.status === 429 ? 'busy' : failure.error;
          throw new Error(['busy', 'provider', 'storage', 'configuration', 'origin'].includes(reason) ? reason : 'unavailable');
        }
        const body = await response.json();
        clearTimeout(timer);
        if (!Array.isArray(body.results)) throw new Error('invalid');
        if (id !== revision || request.signal.aborted) return;
        location = core.selectLocation(body.results, address);
        if (location) break;
      }
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(key, { location, expires: Date.now() + (location ? 3600000 : 300000) });
      if (location) renderLocation(location, address);
      else mapStatus.textContent = 'No pudimos ubicar ese domicilio en el mapa. El resultado de cobertura no cambia.';
    } catch (error) {
      if (id !== revision) return;
      const messages = {
        busy: 'El servicio de ubicación está ocupado. Volvé a consultar en unos segundos.',
        provider: 'El proveedor del mapa no respondió correctamente. Volvé a consultar en un minuto.',
        storage: 'El servidor no pudo preparar la consulta del mapa.',
        configuration: 'El servicio de ubicación necesita una corrección de configuración.',
        origin: 'El servidor rechazó la consulta desde esta página.',
        invalid: 'El servicio de ubicación devolvió una respuesta inválida.',
        unavailable: 'El servicio de ubicación no está disponible.'
      };
      const explanation = request.signal.aborted
        ? 'La consulta del mapa tardó demasiado. Volvé a consultar.'
        : error instanceof TypeError
          ? 'No se pudo conectar con el servicio de ubicación. Volvé a consultar.'
          : messages[error.message] || 'No pudimos cargar la ubicación. Volvé a consultar.';
      mapStatus.textContent = `${explanation} El resultado de cobertura no cambia.`;
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
