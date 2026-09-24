// Fixtures only. No API client, authentication provider or payment gateway.
export const customer = {
  name: 'Agustín', email: 'agustin@example.com', phone: '',
  address: 'Costa Rica 550', city: 'Tandil', plan: 'Fibra 300 Mbps',
  products: ['TV Sensa', 'Set Top Box × 2'],
  serviceStatus: 'Activo', connectionState: 'online', equipmentState: 'online', network: 'USITTEL_Hogar',
};
export const servicePresentation = { known: true, items: [
  { label: 'Sensa', quantity: null },
  { label: 'Set Top Box', quantity: 2 },
] };
export const commercialOffers = [
  { id: 'pack_hbo', type: 'sensa_pack', public_name: 'Pack HBO', description: 'Canales premium y acceso a la app MAX.', price_monthly: 8999, price_once: null, currency: 'ARS' },
  { id: 'mesh', type: 'mesh', public_name: 'Wi-Fi Mesh', description: 'Mejorá la cobertura Wi-Fi de tu hogar.', price_monthly: 6999, price_once: null, currency: 'ARS' },
];
export const invoices = [
  { id: '2026-09', period: 'Septiembre 2026', amount: 12500, due: '20/09/2026', status: 'Pendiente', paidAt: null },
  { id: '2026-08', period: 'Agosto 2026', amount: 11900, due: '20/08/2026', status: 'Pagada', paidAt: '18/08/2026' },
  { id: '2026-07', period: 'Julio 2026', amount: 11900, due: '20/07/2026', status: 'Pagada', paidAt: '17/07/2026' },
];
export const ticket = {
  id: 'DEMO-1042', title: 'Intermitencias de Wi-Fi', status: 'En revisión',
  opened: '15/09/2026', updated: '16/09/2026',
};
export const money = value => '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value);
export const debt = invoices.filter(item => item.status !== 'Pagada').reduce((sum, item) => sum + item.amount, 0);
