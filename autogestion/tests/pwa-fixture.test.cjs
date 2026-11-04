const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const {runInNewContext} = require('node:vm');
const port='4179', base=`http://127.0.0.1:${port}/autogestion/`;
const server=spawn(process.execPath,[require.resolve('./start-pwa-fixture.cjs')],{env:{...process.env,PORT:port,MI_USITTEL_TEST_PUSH:'1'},stdio:'pipe'});
const originalFetch=global.fetch; global.fetch=(url,options={})=>originalFetch(url,{...options,headers:{...options.headers,Connection:'close'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function checkWorker(source, scope) {
  const handlers = new Map();
  const displayed = [];
  let background, destination, navigation;
  const self = {
    registration:{scope,showNotification:(title,options)=>displayed.push({title,options})},
    clients:{matchAll:async()=>[],openWindow:async url=>{destination=url;}},
    addEventListener:(name,callback)=>handlers.set(name,callback),
    miUsittelPush:{version:'test',firebase:{},vapidKey:'test'}
  };
  const firebase={initializeApp(){},messaging:()=>({onBackgroundMessage:callback=>{background=callback;}})};
  runInNewContext(source,{self,URL,console,firebase,importScripts(){}});
  assert.equal(handlers.has('fetch'),false);
  await background({data:{title:'Mi USITTEL',body:'Prueba',route:'facturas',tag:'a'.repeat(64)}});
  assert.equal(displayed.length,1);
  handlers.get('notificationclick')({
    notification:{...displayed[0].options,close(){}},
    stopImmediatePropagation(){},
    waitUntil(promise){navigation=promise;}
  });
  await navigation;
  assert.equal(destination,scope+'?notificacion=facturas#/facturas');
}
(async()=>{
  let ready=false; for(let i=0;i<50;i++){try{const r=await fetch(base);if(r.ok){await r.text();ready=true;break;}}catch{}await sleep(100);} assert(ready,'No se pudo conectar al servidor de pruebas');
  const cookies = new Map();
  let csrf='',revision='';
  const call=async(route,body,withCsrf=true)=>{
    const headers={Cookie:[...cookies.values()].join('; '),'X-Service-Revision':revision};
    if(body!==undefined) {
      headers['Content-Type']='application/json';
      if(withCsrf) headers['X-CSRF-Token']=csrf;
    }
    const r=await fetch(base+'api.php?route='+route,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
    for(const value of r.headers.getSetCookie()) {
      const pair=value.split(';')[0];
      cookies.set(pair.split('=')[0],pair);
    }
    const data=await r.json();
    if(data.csrf)csrf=data.csrf;
    if(data.serviceRevision)revision=data.serviceRevision;
    return {r,data};
  };
  let res=await fetch(base+'manifest.webmanifest'); assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/^application\/manifest\+json/);const m=await res.json();for(const i of m.icons){let icon=await fetch(new URL(i.src,res.url));assert.equal(icon.status,200);assert.match(icon.headers.get('content-type'),/^image\/png/);await icon.arrayBuffer();}
  res=await fetch(base+'sw.js');assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/^text\/javascript/);
  const worker=await res.text();
  await checkWorker(worker,base);
  await checkWorker(worker,'https://portal.example/');
  res=await fetch(base+'js/app.js');let js=await res.text();assert(js.includes("window.location.assign('./pwa-checkout?attempt='"));assert(!js.includes('window.location.assign(result.checkout_url)'));
  let a=await call('bootstrap');assert.equal(a.r.status,200);assert.equal(a.data.authenticated,false);
  a=await call('push-status');assert.equal(a.r.status,401);
  a=await call('login',{username:'000001',password:' 00Lab-fixture! '});assert.equal(a.r.status,200,JSON.stringify(a.data));assert.equal(a.data.payments_enabled,true);
  assert.equal(a.data.push_enabled,true);
  const registration={fid:'c'.repeat(22),refresh:false};
  a=await call('push-register',registration,false);assert.equal(a.r.status,403);
  a=await call('push-register',{...registration,owner:99});assert.equal(a.r.status,400);
  a=await call('push-register',registration);assert.equal(a.r.status,200);assert.match(a.data.device,/^[a-f0-9]{64}$/);
  assert.match(a.r.headers.get('set-cookie'),/MIUSITTEL_PUSH=.*HttpOnly; SameSite=Strict/i);
  const device=a.data.device;
  a=await call('push-register',{fid:'d'.repeat(22),refresh:true});assert.deepEqual(a.data,{active:true,device});
  a=await call('push-remove',{});assert.equal(a.r.status,200);
  a=await call('push-register',{...registration,refresh:true});assert.equal(a.r.status,409);
  a=await call('push-register',registration);assert.equal(a.r.status,200);
  a=await call('invoices');assert.equal(a.r.status,200);
  a=await call('payment-create',{idt:'123'});assert.equal(a.r.status,200,JSON.stringify(a.data));let attempt=a.data.attempt_id;assert.match(attempt,/^[a-f0-9]{32}$/);
  res=await fetch(base+'pwa-checkout?attempt='+attempt);assert.equal(res.status,200);assert.match(await res.text(),/SIRO simulado/);
  res=await fetch(base+'api.php?route=payment-return&result=ok&attempt='+attempt+'&forged=1',{redirect:'manual'});assert.equal(res.status,303);assert.equal(res.headers.get('location'),'/autogestion/#/facturas?attempt='+attempt);await res.text();
  a=await call('payment-reconcile',{attempt_id:attempt});assert.equal(a.r.status,200,JSON.stringify(a.data));assert.notEqual(a.data.state,'CONFIRMED');
  a=await call('logout',{});assert.equal(a.r.status,200);a=await call('bootstrap');assert.equal(a.data.authenticated,false);a=await call('payments');assert.equal(a.r.status,401);
  a=await call('login',{username:'000001',password:' 00Lab-fixture! '});assert.equal(a.r.status,200);
  a=await call('push-status');assert.deepEqual(a.data,{active:false,device:null});
  console.log('OK: recursos, aislamiento de checkout, sesiÃ³n, intento ficticio, retorno, conciliaciÃ³n pendiente y logout');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
