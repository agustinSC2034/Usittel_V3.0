export function formatOfferPrice(offer) {
  const currency = offer?.currency === 'ARS' ? '$' : '';
  const number = value => currency + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value);
  const parts = [];
  if (Number.isInteger(offer?.price_monthly) && offer.price_monthly > 0) parts.push(`${number(offer.price_monthly)} por mes`);
  if (Number.isInteger(offer?.price_once) && offer.price_once > 0) parts.push(`${number(offer.price_once)} pago único`);
  return parts.join(' · ');
}

export function offerCta(type) {
  return type === 'speed' ? 'Quiero mejorar mi plan' : 'Me interesa';
}
