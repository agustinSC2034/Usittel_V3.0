const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const { resolvePaymentFlow, canRecoverPosting, paymentReturnAttempt } = await import('../js/payment-flow.js');
  const { runtime, applyOverview } = await import('../js/data.js');
  const { paymentPanel, paymentStatusBanner } = await import('../js/payment-view.js');
  const { invoicePayButton, invoiceVisibleStatus } = await import('../js/components.js');
  const { billing } = await import('../js/views.js');
  let checks = 0;
  const check = async (name, fn) => { await fn(); checks++; };
  const id = 'a'.repeat(32);
  const otherId = 'b'.repeat(32);
  const attempt = (state, posting = 'NOT_POSTED', extra = {}) => ({
    attempt_id: id, idt: '123', amount: 121, state, phantom_posting_state: posting,
    can_post_to_phantom: state === 'CONFIRMED' && posting === 'NOT_POSTED',
    phantom_payment_posted: posting === 'POSTED', siro_payment_confirmed: state === 'CONFIRMED',
    created_at: '2026-09-28T00:00:00Z', updated_at: '2026-09-28T00:00:00Z', ...extra,
  });
  const mock = (reconciled, posted) => {
    const calls = [];
    const request = async (route, body) => {
      calls.push([route, body]);
      if (route === 'payment-reconcile') return reconciled;
      if (route === 'payment-post') return posted;
      throw new Error(`Unexpected route: ${route}`);
    };
    return { calls, request };
  };
  const options = request => ({ request, postingEnabled: true, selectedServiceId: '1' });

  await check('retorno conserva attempt validado y aterriza en Facturas', () => {
    assert.equal(paymentReturnAttempt(`#/facturas?attempt=${id}`), id);
    assert.equal(paymentReturnAttempt('#/facturas?attempt=invalid'), null);
    assert.equal(paymentReturnAttempt(`#/facturas?attempt=${id}&state=CONFIRMED`), null);
    const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    assert.match(app, /returnAttempt = paymentReturnAttempt\(location\.hash\)/);
    assert.match(app, /if \(returnAttempt\) \{ runtime\.billingView = 'invoices'; history\.replaceState\(null, '', '#\/facturas'\); \}/);
    assert.match(app, /returnedAttempt && runtime\.selectedServiceId[\s\S]*paymentFocus = \{ attemptId: returnedId, serviceId: String\(runtime\.selectedServiceId\) \}/);
  });

  await check('retorno sin confirmación SIRO no imputa ni crea otro pago', async () => {
    const m = mock(attempt('UNCONFIRMED'), null);
    const result = await resolvePaymentFlow([attempt('PENDING')], { ...options(m.request), targetAttemptId: id });
    assert.equal(result.items[0].state, 'UNCONFIRMED');
    assert.equal(result.postAttempted, false);
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-reconcile']);
  });
  await check('refresh posterior reconcilia CONFIRMED y postea el mismo attempt una vez', async () => {
    const m = mock(attempt('CONFIRMED'), attempt('CONFIRMED', 'POSTED'));
    const result = await resolvePaymentFlow([attempt('UNCONFIRMED')], options(m.request));
    assert.equal(result.items[0].phantom_posting_state, 'POSTED');
    assert.deepEqual(m.calls, [['payment-reconcile', { attempt_id: id }], ['payment-post', { attempt_id: id }]]);
  });
  await check('línea completa: retorno incierto, refresh posterior y saldo registrable sin otro create', async () => {
    let confirmed = false;
    const calls = [];
    const request = async (route, body) => {
      calls.push([route, body]);
      if (route === 'payment-reconcile') return attempt(confirmed ? 'CONFIRMED' : 'UNCONFIRMED');
      if (route === 'payment-post') return attempt('CONFIRMED', 'POSTED');
      throw new Error(`Unexpected route: ${route}`);
    };
    const returned = await resolvePaymentFlow([attempt('PENDING')], { ...options(request), targetAttemptId: id });
    assert.equal(returned.items[0].state, 'UNCONFIRMED');
    confirmed = true;
    const refreshed = await resolvePaymentFlow(returned.items, options(request));
    assert.equal(refreshed.items[0].phantom_posting_state, 'POSTED');
    assert.deepEqual(calls.map(([route]) => route), ['payment-reconcile', 'payment-reconcile', 'payment-post']);
    assert.ok(calls.every(([, body]) => body.attempt_id === id));
  });
  await check('retorno ya confirmado reconcilia y luego postea solo ese attempt', async () => {
    const other = attempt('CONFIRMED', 'NOT_POSTED', { attempt_id: otherId });
    const m = mock(attempt('CONFIRMED'), attempt('CONFIRMED', 'POSTED'));
    const result = await resolvePaymentFlow([attempt('CONFIRMED'), other], { ...options(m.request), targetAttemptId: id });
    assert.equal(result.items[0].phantom_posting_state, 'POSTED');
    assert.equal(result.items[1].phantom_posting_state, 'NOT_POSTED');
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-reconcile', 'payment-post']);
  });
  await check('CONFIRMED NOT_POSTED se recupera al cargar sin redirect', async () => {
    const m = mock(null, attempt('CONFIRMED', 'POSTED'));
    const result = await resolvePaymentFlow([attempt('CONFIRMED')], options(m.request));
    assert.equal(result.postAttempted, true);
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-post']);
  });
  await check('POSTED no vuelve a imputarse', async () => {
    const m = mock(null, null);
    const result = await resolvePaymentFlow([attempt('CONFIRMED', 'POSTED')], options(m.request));
    assert.equal(result.postAttempted, false); assert.equal(m.calls.length, 0);
  });
  for (const state of ['POSTING', 'POST_UNCONFIRMED']) await check(`${state} conserva recuperación por lectura`, async () => {
    const m = mock(null, attempt('CONFIRMED', 'POSTED'));
    await resolvePaymentFlow([attempt('CONFIRMED', state, { can_post_to_phantom: false })], options(m.request));
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-post']);
  });
  for (const state of ['NEEDS_REVIEW', 'ALREADY_SETTLED']) await check(`${state} no tiene retry automático`, async () => {
    const m = mock(null, null);
    await resolvePaymentFlow([attempt('CONFIRMED', state)], options(m.request));
    assert.equal(m.calls.length, 0);
  });
  await check('posting apagado, can_post falso o servicio no seleccionado bloquean auto-post', async () => {
    const m = mock(null, null);
    await resolvePaymentFlow([attempt('CONFIRMED')], { ...options(m.request), postingEnabled: false });
    await resolvePaymentFlow([attempt('CONFIRMED', 'NOT_POSTED', { can_post_to_phantom: false })], options(m.request));
    await resolvePaymentFlow([attempt('CONFIRMED')], { ...options(m.request), selectedServiceId: null });
    assert.equal(m.calls.length, 0);
  });
  await check('attempt ajeno a la lista del contrato no se consulta ni imputa', async () => {
    const m = mock(null, null);
    await resolvePaymentFlow([attempt('CONFIRMED', 'POSTED')], { ...options(m.request), targetAttemptId: otherId });
    assert.equal(m.calls.length, 0);
  });
  await check('cambio de servicio durante reconcile impide el POST posterior', async () => {
    let current = true; const m = mock(attempt('CONFIRMED'), null);
    const request = async (route, body) => { const result = await m.request(route, body); current = false; return result; };
    await resolvePaymentFlow([attempt('UNCONFIRMED')], { ...options(request), isCurrent: () => current });
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-reconcile']);
  });
  await check('respuesta de otro attempt se rechaza antes del POST', async () => {
    const m = mock(attempt('CONFIRMED', 'NOT_POSTED', { attempt_id: otherId }), null);
    await assert.rejects(resolvePaymentFlow([attempt('UNCONFIRMED')], options(m.request)));
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-reconcile']);
  });
  await check('payment-post de otro attempt no se mezcla con la factura visible', async () => {
    const m = mock(null, attempt('CONFIRMED', 'POSTED', { attempt_id: otherId }));
    await assert.rejects(resolvePaymentFlow([attempt('CONFIRMED')], options(m.request)));
    assert.deepEqual(m.calls.map(([route]) => route), ['payment-post']);
  });
  await check('doble refresh simultáneo comparte una sola llamada payment-post', async () => {
    let release; const gate = new Promise(resolve => { release = resolve; });
    const calls = [];
    const request = async (route, body) => { calls.push([route, body]); await gate; return attempt('CONFIRMED', 'POSTED'); };
    const first = resolvePaymentFlow([attempt('CONFIRMED')], options(request));
    const second = resolvePaymentFlow([attempt('CONFIRMED')], options(request));
    await Promise.resolve(); await Promise.resolve();
    assert.equal(calls.length, 1);
    release();
    const results = await Promise.all([first, second]);
    assert.ok(results.every(result => result.items[0].phantom_posting_state === 'POSTED'));
    assert.deepEqual(calls.map(([route]) => route), ['payment-post']);
  });
  await check('solo estados confirmados y seguros son candidatos', () => {
    assert.equal(canRecoverPosting(attempt('UNCONFIRMED'), true), false);
    assert.equal(canRecoverPosting(attempt('CONFIRMED'), true), true);
    assert.equal(canRecoverPosting(attempt('CONFIRMED', 'NOT_POSTED', { can_post_to_phantom: false }), true), false);
    assert.equal(canRecoverPosting(attempt('CONFIRMED', 'POSTED'), true), false);
  });
  await check('copy evita sugerir un segundo pago', () => {
    runtime.mode = 'phantom'; runtime.paymentsEnabled = true; runtime.paymentHistoryEnabled = false; runtime.paymentHistoryItems = [];
    runtime.paymentItems = [attempt('UNCONFIRMED')];
    assert.match(paymentPanel(), /Estamos verificando tu pago[\s\S]*No vuelvas a pagar/);
    assert.match(invoicePayButton({ id: '123' }), /Pago en verificación/);
    assert.match(invoicePayButton({ id: '123' }), /disabled/);
    runtime.paymentItems = [attempt('CONFIRMED')];
    assert.match(paymentPanel(), /Pago confirmado[\s\S]*Estamos actualizando tu cuenta/);
    runtime.paymentItems = [attempt('CONFIRMED', 'POSTED')];
    assert.match(paymentPanel(), /Pago registrado/);
    runtime.paymentHistoryItems = [{ id: 'other', method: 'EFECTIVO', amount: 10, date: '2026-09-27', downloadAvailable: false }];
    assert.match(paymentPanel(), /Factura 123[\s\S]*Tu pago ya fue registrado/);
    runtime.paymentHistoryItems = [];
    runtime.paymentItems = [attempt('CONFIRMED', 'ALREADY_SETTLED')];
    assert.equal(invoiceVisibleStatus({ id: '123', status: 'Pendiente' }).label, 'Pagada');
    assert.match(invoicePayButton({ id: '123' }), /Pago registrado/);
    assert.match(paymentPanel(), /Tu cuenta ya estaba actualizada/);
  });
  await check('banner sigue estado real del intento sin mostrar identificadores', () => {
    runtime.mode = 'phantom'; runtime.paymentsEnabled = true; runtime.paymentHistoryEnabled = true;
    runtime.selectedServiceId = '1'; runtime.paymentFocus = { attemptId: id, serviceId: '1' };
    const cases = [
      [attempt('UNCONFIRMED'), 'warning', 'Estamos verificando tu pago', 'No vuelvas a pagar esta factura'],
      [attempt('PENDING'), 'warning', 'Estamos verificando tu pago', 'No vuelvas a pagar esta factura'],
      [attempt('CONFIRMED'), 'success', 'Pago recibido correctamente', 'No es necesario que vuelvas a pagarlo'],
      [attempt('CONFIRMED', 'POST_UNCONFIRMED'), 'success', 'Pago recibido correctamente', 'Puede tardar unos minutos'],
      [attempt('CONFIRMED', 'POSTED'), 'success', 'Pago registrado correctamente', 'ya fue registrado'],
      [attempt('CONFIRMED', 'ALREADY_SETTLED'), 'success', 'Pago registrado correctamente', 'ya se encontraba actualizada'],
      [attempt('CONFIRMED', 'NEEDS_REVIEW'), 'warning', 'Pago recibido', 'No vuelvas a realizar el pago'],
      [attempt('CANCELLED'), 'info', 'Pago cancelado', 'no se completó'],
      [attempt('REJECTED'), 'error', 'Pago rechazado', 'no se completó'],
    ];
    for (const [item, tone, title, detail] of cases) {
      runtime.paymentItems = [item];
      const html = paymentStatusBanner();
      assert.match(html, new RegExp(`operation-alert-${tone}`));
      assert.match(html, new RegExp(title));
      assert.match(html, new RegExp(detail));
      assert.doesNotMatch(html, new RegExp(id));
      assert.doesNotMatch(html, /NOT_POSTED|NEEDS_REVIEW|SIRO [a-f0-9]/);
    }
  });
  await check('Facturas muestra banner arriba de deuda, conserva Movimientos manual', () => {
    applyOverview({ customer: {}, invoices: { items: [{ id: '123', period: 'Septiembre', amount: 121, due: '30/09/2026', status: 'Pendiente', downloadAvailable: false }], nextOffset: null, endReached: true }, account: { debt: 121, credit: 0 }, warnings: [] });
    runtime.paymentItems = [attempt('CONFIRMED')]; runtime.billingView = 'invoices';
    const html = billing();
    assert.match(html, /aria-selected="true"[^>]*data-view="invoices"/);
    assert.ok(html.indexOf('Pago recibido correctamente') < html.indexOf('Deuda total'));
    assert.match(html, /Pago confirmado[\s\S]*Estamos actualizando tu cuenta/);
    assert.match(html, /data-action="pay"[^>]*disabled/);
    runtime.paymentItems = [attempt('CONFIRMED', 'POSTED')];
    const posted = billing();
    assert.match(posted, /Pago registrado correctamente[\s\S]*Pagada/);
    assert.doesNotMatch(posted, /data-action="pay"/);
    runtime.billingView = 'movements';
    const movements = billing();
    assert.match(movements, /aria-selected="true"[^>]*data-view="movements"/);
    assert.match(movements, /Pago registrado/);
    assert.doesNotMatch(movements, /Pago registrado correctamente/);
  });
  await check('banner queda limitado al contrato seleccionado y vuelve al original', () => {
    runtime.paymentItems = [attempt('CONFIRMED')]; runtime.paymentFocus = { attemptId: id, serviceId: '1' };
    runtime.selectedServiceId = '2';
    assert.equal(paymentStatusBanner(), '');
    assert.doesNotMatch(billing(), /Pago recibido correctamente/);
    runtime.selectedServiceId = '1';
    assert.match(paymentStatusBanner(), /Pago recibido correctamente/);
    runtime.paymentItems = [attempt('CONFIRMED', 'NOT_POSTED', { attempt_id: otherId })];
    assert.equal(paymentStatusBanner(), '');
  });
  await check('app usa el mismo orquestador en retorno, actualizar y consultar', () => {
    const app = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    assert.match(app, /resolvePaymentFlow\(list\.items/);
    assert.match(app, /billing-refresh'[\s\S]*?refreshPayments\(\{ refreshOverviewAfterPost: false \}\)/);
    assert.match(app, /payment-check'[\s\S]*?refreshPayments\(\{ targetAttemptId:/);
    assert.doesNotMatch(app, /\['POSTING', 'POST_UNCONFIRMED'\]\.includes/);
    assert.match(app, /activeRoute === 'facturas' && route !== 'facturas'\) runtime\.paymentFocus = null/);
    assert.ok(app.indexOf("request('payment-history')", app.indexOf('async function refreshPayments')) > app.indexOf('resolvePaymentFlow(list.items'), 'Movimientos se lee después de la imputación');
  });
  console.log(`payment flow: ${checks} assertions`);
})().catch(error => { console.error(error); process.exitCode = 1; });
