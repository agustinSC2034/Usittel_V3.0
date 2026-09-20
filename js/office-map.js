/* Shared office map. Coordinates published by Usina de Tandil for Nigro 575:
   https://www.usinatandil.com.ar/centros-de-atencion/ */
(function () {
  'use strict';
  const maps = document.querySelectorAll('[data-office-map]');
  if (!maps.length) return;
  let library;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (library) return library;
    library = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      css.crossOrigin = '';
      document.head.append(css);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      const timer = setTimeout(() => reject(new Error('Map timeout')), 12000);
      script.onload = () => { clearTimeout(timer); resolve(window.L); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Map unavailable')); };
      document.head.append(script);
    });
    return library;
  }
  async function initialize(wrapper) {
    const canvas = wrapper.querySelector('.office-map-canvas');
    const status = wrapper.querySelector('[role="status"]');
    try {
      const L = await loadLeaflet();
      const position = [-37.3093588, -59.136183];
      const map = L.map(canvas, { scrollWheelZoom: false }).setView(position, 16);
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      tiles.on('tileerror', () => { status.textContent = 'No se pudo cargar el mapa. Abrí Cómo llegar para ver la ubicación.'; });
      const label = document.createElement('span');
      label.textContent = 'Usittel · Nigro 575';
      L.marker(position, { alt: 'Usittel, Nigro 575, Tandil' }).addTo(map).bindPopup(label).openPopup();
      status.textContent = '';
    } catch {
      status.textContent = 'No se pudo cargar el mapa. Abrí Cómo llegar para ver la ubicación.';
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        initialize(entry.target);
      }
    }, { rootMargin: '300px' });
    maps.forEach(map => observer.observe(map));
  } else maps.forEach(initialize);
})();
