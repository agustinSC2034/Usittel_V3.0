import { connectivityLabel } from './data.js';

// Use the same selected-service connection result as Mi servicio. A suspended
// contract is a separate, explicitly reported fact, not an inferred outage.
export function homeConnection(customer, details) {
  if (typeof customer.serviceStatus === 'string' && customer.serviceStatus.trim().toLocaleLowerCase('es-AR') === 'suspendido') return { tone: 'warning', icon: 'alert-triangle', title: 'Servicio suspendido', description: 'Tu servicio se encuentra suspendido.', suspended: true };
  const state = details?.connectionState ?? customer.connectionState;
  const label = connectivityLabel(state);
  if (label === 'En línea') return { tone: 'success', icon: 'wifi', title: 'Tu conexión está en línea', description: 'El servicio está funcionando normalmente.', suspended: false };
  if (label === 'Sin conexión') return { tone: 'error', icon: 'wifi-off', title: 'Tu servicio está sin conexión', description: 'Podemos ayudarte a revisar qué sucede.', suspended: false };
  return { tone: 'warning', icon: 'alert-circle', title: 'No pudimos consultar el estado de tu conexión', description: 'El estado no está disponible en este momento.', suspended: false };
}

export function homeAccount(invoices, debt, warnings, endReached) {
  if (warnings.includes('INVOICES_UNAVAILABLE') || warnings.includes('ACCOUNT_RECONCILIATION'))
    return { tone: 'warning', text: 'No pudimos confirmar el estado de tu cuenta.' };
  const pending = invoices.filter(item => item.status === 'Pendiente').length;
  if (pending > 0) {
    const qualifier = endReached ? '' : 'Al menos ';
    return { tone: 'warning', text: `${qualifier}${pending} ${pending === 1 ? 'factura pendiente' : 'facturas pendientes'}.` };
  }
  if (Number.isFinite(debt) && debt > 0) return { tone: 'warning', text: 'Hay un saldo pendiente. Revisá tus facturas.' };
  if (debt === 0) return { tone: 'success', text: 'Estás al día.' };
  return { tone: 'info', text: 'El estado de tu cuenta no está disponible.' };
}
