const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createPreviewServer } = require('../scripts/serve-attention-preview.cjs');

test('preview isolates demo, config, CSP and filesystem from real operations', async t => {
  const server = createPreviewServer({ channelKey:'fixture-business|fixture-channel' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/atencion','/atencion/','/atencion?chat=open','/autogestion/','/','/pages/internet/']) {
    assert.equal((await fetch(base + route)).status, 200, route);
  }
  for (const route of ['/autogestion/server/config.example.php','/.git/config','/package.json','/autogestion/README.md','/autogestion/api/overview','/includes/header.php','/atencion/%2e%2e%5cpackage.json']) {
    assert.equal((await fetch(base + route)).status, 404, route);
  }
  assert.equal((await fetch(base + '/atencion', { method:'POST' })).status, 405);
  const rejectedHost = await new Promise((resolve, reject) => {
    require('node:http').get(base + '/attention-preview-config.json', { headers:{ Host:'public.example' } }, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
  });
  assert.equal(rejectedHost, 403);
  const bootstrap = await (await fetch(base + '/autogestion/api/bootstrap')).json();
  assert.deepEqual(bootstrap, { mode:'demo', backend:false, authenticated:false });
  assert.equal((await fetch(base + '/autogestion/api/login', { method:'POST' })).status, 405);
  const plain = await fetch(base + '/atencion?chat=open');
  assert.match(plain.headers.get('content-security-policy'), /frame-src https:\/\/web.central.chat/);
  const real = await fetch(base + '/atencion?chat-provider=central');
  assert.match(real.headers.get('content-security-policy'), /frame-src https:\/\/web.central.chat/);
  const realHtml = await real.text();
  assert.equal((realHtml.match(/<central-chat\b/g) || []).length, 1);
  assert.match(realHtml, /<central-chat\b[^>]*locale="es"[^>]*mode="fill-container"/);
  assert.match(realHtml, /src="https:\/\/web\.central\.chat\/widget\/core\.js"/);
  assert.match(realHtml, /href="\.\.\/atencion\/attention\.css"/);
  assert.match(realHtml, /name="robots" content="noindex, nofollow"/);
  assert.match(realHtml, /<noscript>[\s\S]*medios de contacto[\s\S]*<\/noscript>/);
  assert.doesNotMatch(realHtml, /entry\.js|chat=open|WhatsApp|wa\.me|<header\b|<footer\b|site-chat-launcher|Abrir chat/);
  assert.equal((await fetch(base + '/atencion/attention.css')).status, 200);
  assert.equal((await fetch(base + '/atencion/entry.js')).status, 404);
  for (const route of ['/atencion', '/atencion?intent=soporte']) {
    const response = await fetch(base + route, { redirect:'manual' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(new URL(response.url).search, route.includes('?') ? '?intent=soporte' : '');
  }
  const css = await (await fetch(base + '/atencion/attention.css')).text();
  assert.match(css, /height: 100dvh/);
  assert.match(css, /overflow: hidden/);
  assert.match(css, /safe-area-inset-bottom/);
  const login = await fetch(base + '/autogestion/?chat-provider=central');
  assert.doesNotMatch(login.headers.get('content-security-policy'), /central\.chat/);
  const config = await fetch(base + '/attention-preview-config.json');
  assert.deepEqual(await config.json(), { channelKey:'fixture-business|fixture-channel' });
  assert.equal(config.headers.get('cache-control'), 'no-store');
  assert.equal(config.headers.get('access-control-allow-origin'), null);
  const { chatPreviewEnabled } = await import('../autogestion/js/attention-chat.js');
  for (const host of ['localhost','127.0.0.1','[::1]']) assert.equal(chatPreviewEnabled(host), true);
  for (const host of ['usittel.com.ar','www.usittel.com.ar','localhost.attacker.test','127.0.0.1.attacker.test']) assert.equal(chatPreviewEnabled(host), false);
});

test('public shell exposes one responsive Central panel and its controller', async t => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = await (await fetch(base + '/')).text();
  assert.equal((html.match(/id="site-chat-launcher"/g) || []).length, 1);
  assert.equal((html.match(/id="site-chat-panel"/g) || []).length, 1);
  assert.match(html, /<central-chat\b[^>]*mode="fill-container"/);
  assert.match(html, /src="js\/site-chat\.js"/);
  assert.equal((await fetch(base + '/js/site-chat.js')).status, 200);
});

test('sales has its own standalone Central channel without changing attention or other surfaces', async t => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const attention = await (await fetch(base + '/atencion/')).text();
  const home = await (await fetch(base + '/')).text();
  const portal = await (await fetch(base + '/autogestion/')).text();
  const attentionKey = 'wiOT-40q9iiyNBb8NahcAg|SZaCDgFymGhOoc4aJwuCMQ';
  const salesKey = 'wiOT-40q9iiyNBb8NahcAg|MXuFJY8MqowisQBQSjLt-Q';
  for (const route of ['/atencion/ventas/', '/atencion/ventas/?campaign=promo500', '/atencion/ventas/?intent=ventas']) {
    const response = await fetch(base + route, { redirect:'manual' });
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('location'), null, route);
    assert.equal(new URL(response.url).search, new URL(route, base).search);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self' https:\/\/web\.central\.chat/);
    assert.match(response.headers.get('content-security-policy'), /frame-src https:\/\/web\.central\.chat/);
    const html = await response.text();
    assert.equal((html.match(/<central-chat\b/g) || []).length, 1);
    assert.match(html, /src="https:\/\/web\.central\.chat\/widget\/core\.js"/);
    assert.ok(html.includes(`channel-key="${salesKey}"`));
    assert.ok(!html.includes(attentionKey));
    assert.match(html, /<central-chat\b[^>]*locale="es"[^>]*mode="fill-container"/);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /name="referrer" content="no-referrer"/);
    assert.match(html, /href="\.\.\/attention\.css"/);
    assert.match(html, /href="\.\.\/\.\.\/assets\/icons\/usittel-logo\.png"/);
    assert.doesNotMatch(html, /entry\.js|chat=open|WhatsApp|wa\.me|<header\b|<footer\b|site-chat-launcher|Abrir chat|location\.(?:href|replace|assign)/i);
  }
  assert.equal((await fetch(base + '/atencion/attention.css')).status, 200);
  assert.equal((await fetch(base + '/assets/icons/usittel-logo.png')).status, 200);
  assert.ok(attention.includes(`channel-key="${attentionKey}"`));
  assert.ok(!attention.includes(salesKey));
  assert.equal((attention.match(/<central-chat\b/g) || []).length, 1);
  assert.match(home, /id="site-chat-launcher"/);
  assert.ok(!home.includes(salesKey));
  assert.match(portal, /data-action="chat-launcher"/);
  assert.ok(!portal.includes(salesKey));
});

test('missing widget configuration cannot silently connect to a default channel', async t => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/attention-preview-config.json`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { available:false });
});
