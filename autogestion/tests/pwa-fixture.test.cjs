const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const port='4179', base=`http://127.0.0.1:${port}/autogestion/`;
const server=spawn(process.execPath,[require.resolve('./start-pwa-fixture.cjs')],{env:{...process.env,PORT:port},stdio:'pipe'});
const originalFetch=global.fetch; global.fetch=(url,options={})=>originalFetch(url,{...options,headers:{...options.headers,Connection:'close'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let ready=false; for(let i=0;i<50;i++){try{const r=await fetch(base);if(r.ok){await r.text();ready=true;break;}}catch{}await sleep(100);} assert(ready,'No se pudo conectar al servidor de pruebas');
  let cookie='',csrf='',revision='';
  const call=async(route,body)=>{const h={};if(cookie)h.Cookie=cookie;if(revision)h['X-Service-Revision']=revision;if(body!==undefined){h['Content-Type']='application/json';h['X-CSRF-Token']=csrf;}const r=await fetch(base+'api.php?route='+route,{method:body===undefined?'GET':'POST',headers:h,body:body===undefined?undefined:JSON.stringify(body)});let c=r.headers.get('set-cookie');if(c)cookie=c.split(';')[0];let data=await r.json();if(data.csrf)csrf=data.csrf;if(data.serviceRevision)revision=data.serviceRevision;return {r,data};};
  let res=await fetch(base+'manifest.webmanifest'); assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/^application\/manifest\+json/);const m=await res.json();for(const i of m.icons){let icon=await fetch(new URL(i.src,res.url));assert.equal(icon.status,200);assert.match(icon.headers.get('content-type'),/^image\/png/);await icon.arrayBuffer();}
  res=await fetch(base+'sw.js');assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/^text\/javascript/);await res.text();
  res=await fetch(base+'js/app.js');let js=await res.text();assert(js.includes("window.location.assign('./pwa-checkout?attempt='"));assert(!js.includes('window.location.assign(result.checkout_url)'));
  let a=await call('bootstrap');assert.equal(a.r.status,200);assert.equal(a.data.authenticated,false);
  a=await call('login',{username:'000001',password:' 00Lab-fixture! '});assert.equal(a.r.status,200,JSON.stringify(a.data));assert.equal(a.data.payments_enabled,true);
  a=await call('invoices');assert.equal(a.r.status,200);
  a=await call('payment-create',{idt:'123'});assert.equal(a.r.status,200,JSON.stringify(a.data));let attempt=a.data.attempt_id;assert.match(attempt,/^[a-f0-9]{32}$/);
  res=await fetch(base+'pwa-checkout?attempt='+attempt);assert.equal(res.status,200);assert.match(await res.text(),/SIRO simulado/);
  res=await fetch(base+'api.php?route=payment-return&result=ok&attempt='+attempt+'&forged=1',{redirect:'manual'});assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/autogestion/#/facturas?attempt='+attempt);await res.text();
  a=await call('payment-reconcile',{attempt_id:attempt});assert.equal(a.r.status,200,JSON.stringify(a.data));assert.notEqual(a.data.state,'CONFIRMED');
  a=await call('logout',{});assert.equal(a.r.status,200);a=await call('bootstrap');assert.equal(a.data.authenticated,false);a=await call('payments');assert.equal(a.r.status,401);
  console.log('OK: recursos, aislamiento de checkout, sesiÃ³n, intento ficticio, retorno, conciliaciÃ³n pendiente y logout');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
