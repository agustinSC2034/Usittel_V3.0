export function formatOfferPrice(offer) {
  const currency = offer?.currency === 'ARS' ? '$' : '';
  const number = value => currency + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value);
  const parts = [];
  if (Number.isInteger(offer?.price_monthly) && offer.price_monthly > 0) parts.push(`${number(offer.price_monthly)} por mes`);
  if (Number.isInteger(offer?.price_once) && offer.price_once > 0) parts.push(`${number(offer.price_once)} pago único`);
  return parts.join(' · ');
}

export function offerCta(type) {
  return type === 'speed' ? 'Solicitar mejora de plan' : 'Me interesa';
}

// Presentation only. The server owns exact Phantom aliases and offer eligibility.
export function serviceDisplayState(presentation) {
  return presentation?.known === true && Array.isArray(presentation.items)
    ? presentation
    : { known: false, items: [] };
}

export function offerVisual(offer) {
  const brands = {
    sensa: 'brand-sensa.png',
    pack_hbo: 'brand-hbo.svg',
    pack_universal: 'brand-universal.svg',
    pack_futbol: 'brand-futbol.png',
  };
  if (Object.hasOwn(brands, offer.id)) return { asset: brands[offer.id], symbol: null };
  const symbols = { mesh: 'wifi', speed: 'zap', stb: 'tv' };
  return { asset: null, symbol: symbols[offer.type] || null };
}
