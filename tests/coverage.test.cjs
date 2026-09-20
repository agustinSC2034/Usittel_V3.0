const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../js/coverage-core.js');
const data = require('../js/coverage-data.js');
const current = core.compile(data.current);
const future = core.compile(data.future);
const lookup = text => core.classify(current, future, core.parseAddress(text));

test('numbered street names, accents, whitespace and apartment suffixes', () => {
  for (const [text, street, number] of [
    ['Pasaje 1 de Mayo 1200', 'Pasaje 1 de Mayo', 1200],
    ['Avenida 25 de Mayo 1000', 'Avenida 25 de Mayo', 1000],
    ['11 de septiembre 1200', '11 de septiembre', 1200],
    ['  San  Martín 1000, piso 2', 'San Martín', 1000],
    ['Paz 100, Tandil, Buenos Aires, Argentina', 'Paz', 100],
    ['Paz 100 depto. 4', 'Paz', 100],
  ]) assert.deepEqual(core.parseAddress(text), { street, number });
});
test('malformed and foreign locality inputs never silently become another address', () => {
  for (const value of ['', 'Paz', 'Paz -10', 'Paz 0', 'Paz 10.5', 'Paz 100, Azul', '<img src=x> 100', 'Paz\n100', '12 100', 'Paz 100 bis']) {
    assert.equal(core.parseAddress(value), null, value);
  }
});
test('exact aliases match without substring false positives', () => {
  assert.equal(lookup('Pasaje 1 de Mayo 1200'), 'available');
  assert.equal(lookup('Pje. 1 de Mayo 1200'), 'available');
  assert.equal(lookup('San Martín 1000'), 'available');
  assert.equal(lookup('Gral. Paz 100'), 'available');
  assert.equal(lookup('Sinpaz 100'), 'unknown');
  assert.equal(lookup('Calle inexistente paz 100'), 'unknown');
  assert.equal(lookup('Paz 99999'), 'outside');
});
test('invalid ranges are quarantined, never silently reversed or used as negatives', () => {
  assert.equal(current.invalid.length, 7);
  assert.equal(lookup('Novoa 800'), 'review');
  assert.equal(lookup('Piñero 1199'), 'review');
  assert.equal(lookup('Piñero 1200'), 'available');
  const broken = core.compile([{ calle: 'Prueba', desde: 20, hasta: 10 }]);
  assert.deepEqual(broken.streets.get('prueba').ranges, []);
});
test('all valid original range endpoints remain covered under their exact street', () => {
  for (const zone of data.current.filter(z => z.desde <= z.hasta)) {
    for (const number of [zone.desde, zone.hasta]) {
      assert.equal(core.classify(current, future, { street: zone.calle, number }), 'available', JSON.stringify(zone));
    }
  }
});
test('planned coverage and unknown streets remain distinct from outside ranges', () => {
  const empty = core.compile([]);
  const planned = core.compile([{ calle: 'Futura', desde: 1, hasta: 100 }]);
  assert.equal(core.classify(empty, planned, { street: 'Futura', number: 50 }), 'planned');
  assert.equal(core.classify(empty, planned, { street: 'Futura', number: 101 }), 'outside');
  assert.equal(core.classify(empty, planned, { street: 'Otra', number: 50 }), 'unknown');
});
const address = { street: 'San Martín', number: 1000 };
const location = overrides => ({ lat: '-37.32', lon: '-59.13', address: { city: 'Tandil', road: 'San Martín', house_number: '1000', ...overrides } });
test('map accepts only same street/city/number; nearby houses are not exact matches', () => {
  assert.equal(core.selectLocation([location({})], address).precision, 'exact');
  assert.equal(core.selectLocation([location({ house_number: '1001' })], address), null);
  assert.equal(core.selectLocation([location({ road: 'Paz' })], address), null);
  assert.equal(core.selectLocation([location({ city: 'Azul' })], address), null);
  assert.equal(core.selectLocation([{ ...location({}), lat: 'invalid' }], address), null);
  assert.equal(core.selectLocation([{ ...location({}), lon: '-61' }], address), null);
  assert.equal(core.selectLocation([location({ house_number: undefined })], address).precision, 'street');
  assert.equal(core.selectLocation({ error: 'rate limit' }, address), null);
});

// Minimal DOM/Leaflet doubles exercise controller concurrency without network or browser automation.
function harness() {
  class Element {
    constructor() { this.children = []; this.attrs = {}; this.dataset = {}; this.handlers = {}; this.value = ''; this.parentElement = { insertAdjacentElement() {} }; }
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    append(...elements) { this.children.push(...elements); }
    replaceChildren(...elements) { this.children = elements; }
    insertAdjacentElement(_, element) { this.after = element; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    focus() {}
  }
  const elements = Object.fromEntries(['address-input', 'coverage-button', 'coverage-result', 'coverage-map'].map(id => [id, new Element()]));
  const requests = [], markers = [];
  const map = { setView() { return this; }, fitBounds() {}, removeLayer() {} };
  const L = { map: () => map, tileLayer: () => ({ addTo() {} }), polygon: () => ({ addTo() { return this; }, bindPopup() {}, getBounds() { return []; } }),
    marker: coords => ({ addTo() { markers.push(coords); return this; }, bindPopup() { return this; }, openPopup() {} }) };
  const document = { body: { classList: { contains: () => true } }, currentScript: { src: 'https://usittel.com.ar/js/coverage-validator.js' },
    getElementById: id => elements[id], createElement: () => new Element() };
  const context = { document, window: { UsittelCoverage: core, UsittelCoverageData: data, L }, L, URL, AbortController,
    setTimeout, clearTimeout, fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/coverage-validator.js'), 'utf8'), context);
  const search = value => { elements['address-input'].value = value; elements['coverage-button'].handlers.click(); };
  const status = () => elements['coverage-result'].children[0]?.dataset.status;
  return { elements, requests, markers, search, status };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('local answer is immediate even when the map is pending or unavailable', async () => {
  const h = harness(); h.search('San Martín 1000');
  assert.equal(h.status(), 'available');
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].options.method, 'POST');
  h.requests[0].resolve({ ok: false, status: 503 }); await tick();
  assert.equal(h.status(), 'available');
  assert.match(h.elements['coverage-map'].after.textContent, /no cambia/);
});
test('unknown/invalid data makes no geocoding requests', () => {
  const h = harness();
  h.search('Sinpaz 100'); assert.equal(h.status(), 'unknown');
  h.search('Novoa 800'); assert.equal(h.status(), 'review');
  h.search('Paz'); assert.equal(h.status(), 'invalid');
  assert.equal(h.requests.length, 0);
});
test('late replies cannot overwrite a newer query, and typing cancels stale locations', async () => {
  const h = harness(); h.search('San Martín 1000'); h.search('Paz 100');
  assert.equal(h.requests[0].options.signal.aborted, true);
  h.requests[1].resolve({ ok: true, json: async () => ({ results: [location({ road: 'Paz', house_number: '100' })] }) });
  await tick();
  h.requests[0].resolve({ ok: true, json: async () => ({ results: [location({})] }) });
  await tick(); assert.equal(h.markers.length, 1);
  h.elements['address-input'].handlers.input(); assert.equal(h.status(), undefined);
});
test('repeat lookup uses cache; invalid response never changes commercial result', async () => {
  const h = harness(); h.search('San Martín 1000');
  h.requests[0].resolve({ ok: true, json: async () => ({ results: [location({})] }) }); await tick();
  h.search('San Martín 1000'); assert.equal(h.requests.length, 1);
  h.search('Paz 100'); h.requests[1].resolve({ ok: true, json: async () => ({ invalid: true }) }); await tick();
  assert.equal(h.status(), 'available');
  assert.match(h.elements['coverage-map'].after.textContent, /no cambia/);
});
