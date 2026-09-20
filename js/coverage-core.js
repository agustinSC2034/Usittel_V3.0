/* Pure address and coverage rules, shared by the browser and regression tests. */
(function (root) {
  'use strict';
  function normalizeStreet(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim()
      .replace(/^calle\s+/, '').replace(/^av\s+/, 'avenida ')
      .replace(/^(?:pje|psje|psaje)\s+/, 'pasaje ')
      .replace(/\bgral\b/g, 'general');
  }

  function parseAddress(value) {
    if (typeof value !== 'string' || value.length > 160 || /[<>\r\n]/.test(value)) return null;
    let input = value.trim().replace(/\s+/g, ' ');
    // Only remove explicitly recognized locality/unit suffixes, never arbitrary text.
    input = input.replace(/,\s*Tandil(?:,\s*Buenos Aires)?(?:,\s*Argentina)?\s*$/i, '');
    input = input.replace(/\s*,?\s+(?:piso|depto\.?|departamento|dpto\.?|unidad|pb)\b.*$/i, '');
    const match = input.match(/^(.+)\s+(\d{1,6})$/u);
    if (!match || !/[\p{L}]/u.test(match[1]) || !/^[\p{L}\p{N}\s.'’°º-]+$/u.test(match[1])) return null;
    const number = Number(match[2]);
    if (!Number.isSafeInteger(number) || number < 1) return null;
    return { street: match[1].trim(), number };
  }

  function compile(zones) {
    const streets = new Map();
    const invalid = [];
    for (const zone of zones) {
      const key = normalizeStreet(zone.calle);
      if (!streets.has(key)) streets.set(key, { ranges: [], invalid: false });
      const entry = streets.get(key);
      if (!key || !Number.isSafeInteger(zone.desde) || !Number.isSafeInteger(zone.hasta) || zone.desde < 0 || zone.desde > zone.hasta) {
        entry.invalid = true;
        invalid.push({ ...zone });
        continue;
      }
      entry.ranges.push([zone.desde, zone.hasta]);
    }
    for (const entry of streets.values()) {
      const merged = [];
      for (const range of entry.ranges.sort((a, b) => a[0] - b[0])) {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1]);
        else merged.push([...range]);
      }
      entry.ranges = merged;
    }
    return { streets, invalid };
  }

  function classify(current, future, address) {
    const key = normalizeStreet(address.street);
    const present = current.streets.get(key);
    const planned = future.streets.get(key);
    const contains = entry => entry && entry.ranges.some(([min, max]) => address.number >= min && address.number <= max);
    if (contains(present)) return 'available';
    if (present?.invalid) return 'review';
    if (contains(planned)) return 'planned';
    if (planned?.invalid) return 'review';
    return present || planned ? 'outside' : 'unknown';
  }

  function selectLocation(results, address) {
    if (!Array.isArray(results)) return null;
    const roadKey = value => normalizeStreet(value).replace(/^avenida\s+/, '');
    const matches = results.filter(item => {
      const lat = Number(item.lat), lon = Number(item.lon);
      const a = item.address || {};
      return Number.isFinite(lat) && Number.isFinite(lon) && lat > -37.45 && lat < -37.15 && lon > -59.35 && lon < -58.95 &&
        [a.city, a.town, a.municipality].some(v => normalizeStreet(v) === 'tandil') &&
        roadKey(a.road || a.pedestrian || a.residential) === roadKey(address.street);
    });
    const exact = matches.find(item => String(item.address.house_number) === String(address.number));
    if (exact) return { lat: Number(exact.lat), lon: Number(exact.lon), precision: 'exact' };
    // A road centroid is useful, but a different house number is never substituted.
    const road = matches.find(item => !item.address.house_number);
    return road ? { lat: Number(road.lat), lon: Number(road.lon), precision: 'street' } : null;
  }

  const api = { normalizeStreet, parseAddress, compile, classify, selectLocation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UsittelCoverage = api;
})(typeof window !== 'undefined' ? window : globalThis);
