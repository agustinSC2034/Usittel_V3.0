const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  let checks = 0;
  const check = async (name, fn) => { await fn(); checks++; };
  const calls = [];
  const attributes = new Map([['aria-expanded','false']]);
  const launcher = {
    classList: { toggle(name, on) { calls.push(['class',name,on]); } },
    setAttribute(name, value) { attributes.set(name,value); },
    title: '',
  };
  const mountListeners = [];
  const chat = {
    setAttribute(name,value) { if (name==='hide') calls.push('hide-attribute'); if (name==='mode') calls.push(['mode',value]); },
    addEventListener(name,callback) { if (name==='central-chat-mount') mountListeners.push(callback); },
    remove() { calls.push('remove'); },
    hide() { calls.push('hide'); return Promise.resolve(); },
    show() { calls.push('show'); return Promise.resolve(); },
    maximize() { calls.push('maximize'); return Promise.resolve(); },
    prefill(value) { calls.push(['prefill',value]); return Promise.resolve(); },
  };
  const mount = {
    classList: { toggle(name,on) { calls.push(['mount-class',name,on]); } },
    append(element) { assert.equal(element,chat); calls.push('append'); queueMicrotask(() => mountListeners.forEach(callback => callback())); },
  };
  globalThis.document = {
    createElement(tag) { assert.equal(tag,'central-chat'); return chat; },
    getElementById(id) { return id==='central-chat-mount'?mount:null; },
    querySelector(selector) { return selector==='[data-action="chat-launcher"]'?launcher:selector==='#central-chat-mount'?mount:null; },
    body: mount,
  };
  globalThis.customElements = { get(name) { return name==='central-chat' ? class {} : undefined; } };
  const { initializeCentralChat, openCentralChat, closeCentralChat } = await import('../js/central-chat.js');
  const adapter = await initializeCentralChat();
  await check('instancia embebida inicia oculta y llama hide tras montar', () => assert.deepEqual(calls.slice(0,4),[['mode','fill-container'],'hide-attribute','append','hide']));
  await check('launcher propio inicia accesible', () => assert.equal(attributes.get('aria-expanded'),'false'));
  calls.length=0;
  await check('apertura general sin prefill', async () => { assert.equal(await openCentralChat(),true);assert.deepEqual(calls.filter(x=>typeof x==='string'),['show','maximize']);assert.equal(calls.some(x=>Array.isArray(x)&&x[0]==='prefill'),false); });
  await check('launcher único pasa a cierre y muestra panel', () => {assert.equal(attributes.get('aria-label'),'Cerrar chat de soporte');assert.equal(attributes.get('aria-expanded'),'true');assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='class'&&x[1]==='is-open'&&x[2]===true));assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='mount-class'&&x[1]==='is-open'&&x[2]===true));});
  calls.length=0;
  await check('cierre por API oficial oculta panel y restaura launcher', async () => {assert.equal(await closeCentralChat(),true);assert.deepEqual(calls.filter(x=>typeof x==='string'),['hide']);assert.equal(attributes.get('aria-label'),'Abrir chat de soporte');assert.equal(attributes.get('aria-expanded'),'false');assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='class'&&x[1]==='is-open'&&x[2]===false));assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='mount-class'&&x[1]==='is-open'&&x[2]===false));});
  await check('cierre propio cubre la X de Central en desktop', () => {
    const css = fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
    assert.match(css,/\.portal-chat-toggle\s*\{[^}]*z-index:2147483647/);
    assert.match(css,/#central-chat-mount\s*\{[^}]*visibility:hidden;\s*pointer-events:none;/);
    assert.match(css,/#central-chat-mount\.is-open\s*\{[^}]*visibility:visible;\s*pointer-events:auto;/);
    assert.match(css,/@media \(min-width:761px\)\s*\{\s*\.portal-chat-toggle\.is-open\s*\{[^}]*top:calc\(max\(32px,100dvh - 936px\) \+ 16px\);\s*right:38px;/);
  });
  for (const [topic,text] of Object.entries({
    'upgrade-speed':'Quiero consultar por una mejora de velocidad',
    'update-account':'Quiero actualizar mis datos de contacto',
    'technical-support':'Necesito ayuda técnica',
    'mesh':'Quiero consultar por Wi-Fi Mesh',
    'additional-service':'Quiero consultar por un servicio adicional',
    'access-help':'Necesito ayuda para ingresar a Mi USITTEL',
  })) {
    calls.length=0;
    await check(`prefill permitido: ${topic}`, async () => {assert.equal(await openCentralChat(topic),true);assert.deepEqual(calls.filter(x=>Array.isArray(x)&&x[0]==='prefill'),[['prefill',text]]);});
  }
  calls.length=0;
  await check('contexto no reconocido nunca se transmite', async () => {assert.equal(await openCentralChat('IDA=5726&password=secret'),true);assert.equal(calls.some(x=>Array.isArray(x)&&x[0]==='prefill'),false);});
  await check('prefill es texto genérico sin datos del cliente', () => {const values=['Quiero consultar por una mejora de velocidad','Quiero actualizar mis datos de contacto','Necesito ayuda técnica','Quiero consultar por Wi-Fi Mesh','Quiero consultar por un servicio adicional','Necesito ayuda para ingresar a Mi USITTEL'];assert.equal(values.some(value=>/\bIDA\b|DNI|@|\d{4,}|password|token|factura/i.test(value)),false);});
  adapter.destroy();
  console.log(`central chat: ${checks} assertions`);
})().catch(error => { console.error(error); process.exitCode = 1; });
