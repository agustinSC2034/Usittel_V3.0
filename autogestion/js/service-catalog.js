// Exact public labels only. Keep aliases empty until Phantom labels are confirmed.
export const SERVICE_CATALOG = Object.freeze({
  sensa: Object.freeze([]),
  sensa_pack: Object.freeze([]),
  stb: Object.freeze([]),
  mesh: Object.freeze([]),
});

const baseLabel = value => String(value).replace(/ × [1-9][0-9]?$/u, '').trim();
const exactMatch = (label, aliases) => aliases.some(alias => String(alias).trim() === label);

export function normalizeServices(products, catalog = SERVICE_CATALOG) {
  if (products === null) return { known: false, labels: [], kinds: new Set() };
  if (!Array.isArray(products)) return { known: false, labels: [], kinds: new Set() };

  const labels = [...new Set(products.map(value => String(value).trim()).filter(Boolean))];
  const kinds = new Set();
  for (const label of labels) {
    const raw = baseLabel(label);
    for (const kind of ['sensa', 'sensa_pack', 'stb', 'mesh']) {
      if (exactMatch(raw, catalog[kind] || [])) kinds.add(kind);
    }
  }
  return { known: true, labels, kinds };
}

export function upgradeOffers(plan, upgradeCatalog = []) {
  if (!Array.isArray(upgradeCatalog) || typeof plan !== 'string') return [];
  return upgradeCatalog.filter(item => item && item.current === plan && item.target && item.speed_down > item.current_down)
    .map(item => ({ type: 'speed', label: item.public_name || item.target, target: item.target }));
}

export function serviceOffers(products, plan, upgradeCatalog = [], catalog = SERVICE_CATALOG) {
  const state = normalizeServices(products, catalog);
  if (!state.known) return [];
  const offers = [];
  const add = (type, label) => offers.push({ type, label });
  if (catalog.sensa?.length && !state.kinds.has('sensa')) add('sensa', 'TV Sensa');
  if (catalog.sensa_pack?.length && state.kinds.has('sensa') && !state.kinds.has('sensa_pack')) add('sensa_pack', 'Packs Sensa');
  if (catalog.stb?.length && (state.kinds.has('sensa') || state.kinds.has('sensa_pack')) && !state.kinds.has('stb')) add('stb', 'Set Top Box');
  if (catalog.mesh?.length && !state.kinds.has('mesh')) add('mesh', 'Wi-Fi Mesh');
  return [...upgradeOffers(plan, upgradeCatalog), ...offers];
}
