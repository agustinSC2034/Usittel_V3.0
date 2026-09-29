// Browser orchestration only. The server rechecks SIRO, invoice ownership, amount,
// CRM state and idempotency before any Phantom write.
const postingInFlight = new Map();

export function canRecoverPosting(attempt, postingEnabled) {
  if (!postingEnabled || attempt?.state !== 'CONFIRMED' || !/^[a-f0-9]{32}$/.test(attempt.attempt_id || '')) return false;
  if (attempt.phantom_posting_state === 'NOT_POSTED') return attempt.can_post_to_phantom === true;
  return ['POSTING', 'POST_UNCONFIRMED'].includes(attempt.phantom_posting_state);
}

async function postOnce(attempt, selectedServiceId, request) {
  const key = `${selectedServiceId}:${attempt.attempt_id}`;
  if (!postingInFlight.has(key)) {
    const task = Promise.resolve().then(() => request('payment-post', { attempt_id: attempt.attempt_id }));
    postingInFlight.set(key, task);
    void task.finally(() => { if (postingInFlight.get(key) === task) postingInFlight.delete(key); }).catch(() => {});
  }
  return postingInFlight.get(key);
}

export async function resolvePaymentFlow(items, { reconcile = true, targetAttemptId = null, postingEnabled = false, selectedServiceId, request, onUpdate = () => {}, isCurrent = () => true }) {
  const updated = [...items];
  const replace = (expected, result) => {
    if (result?.attempt_id !== expected.attempt_id) throw new Error('No pudimos verificar el intento de pago.');
    const index = updated.findIndex(item => item.attempt_id === expected.attempt_id);
    if (index < 0) throw new Error('No pudimos verificar el intento de pago.');
    updated[index] = result;
    onUpdate([...updated]);
  };
  const target = targetAttemptId
    ? updated.find(item => item.attempt_id === targetAttemptId)
    : updated.find(item => !['CONFIRMED', 'CANCELLED', 'REJECTED'].includes(item.state));
  if (reconcile && target && isCurrent()) replace(target, await request('payment-reconcile', { attempt_id: target.attempt_id }));

  let postAttempted = false;
  // A SIRO return concerns one attempt. Ordinary load/refresh can recover any
  // confirmed, still-unposted attempt for the selected service.
  const candidates = targetAttemptId ? updated.filter(item => item.attempt_id === targetAttemptId) : [...updated];
  for (const candidate of candidates) {
    if (!isCurrent()) break;
    if (!selectedServiceId || !canRecoverPosting(candidate, postingEnabled)) continue;
    postAttempted = true;
    replace(candidate, await postOnce(candidate, selectedServiceId, request));
  }
  return { items: updated, postAttempted };
}
