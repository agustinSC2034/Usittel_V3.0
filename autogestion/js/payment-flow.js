// SIRO verifies the payment; Phantom's native SIRO integration records it.
export function paymentReturnAttempt(hash) {
  return /^#\/facturas\?attempt=([a-f0-9]{32})$/.exec(hash)?.[1] || null;
}
// Retained for older callers: direct posting is never recoverable in this portal.
export function canRecoverPosting() { return false; }
export async function resolvePaymentFlow(items, { reconcile = true, targetAttemptId = null, request, onUpdate = () => {}, isCurrent = () => true }) {
  const updated = [...items];
  const target = targetAttemptId
    ? updated.find(item => item.attempt_id === targetAttemptId)
    : updated.find(item => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(item.state));
  if (reconcile && target && isCurrent()) {
    const result = await request('payment-reconcile', { attempt_id: target.attempt_id });
    if (result?.attempt_id !== target.attempt_id) throw new Error('No pudimos verificar el intento de pago.');
    if (isCurrent()) { updated[updated.indexOf(target)] = result; onUpdate([...updated]); }
  }
  return { items: updated, postAttempted: false };
}
