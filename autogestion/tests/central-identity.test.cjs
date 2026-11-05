const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const elements=[],storage=new Map(),events={};
  let clearFailure=false,delayMount=false;
  globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  globalThis.window={addEventListener:(k,f)=>events[k]=f};
  const launcher={setAttribute(){},classList:{toggle(){}}};
  const mount={classList:{toggle(){}},append(el){elements.push(el);if(!delayMount)queueMicrotask(()=>el.fireMount());}};
  globalThis.document={getElementById:id=>id==='central-chat-mount'?mount:null,querySelector:s=>s==='[data-action="chat-launcher"]'?launcher:s==='#central-chat-mount'?mount:null,body:mount,
    createElement(tag){assert.equal(tag,'central-chat');const callbacks=[];return {attrs:{},calls:[],setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){if(k==='central-chat-mount')callbacks.push(f);},fireMount(){callbacks.forEach(f=>f());},
      remove(){this.removed=true;},async hide(){this.calls.push('hide');},async show(){assert.ok(!this.removed);this.calls.push('show');},async maximize(){this.calls.push('maximize');},async clearChat(){this.calls.push('clear');if(clearFailure)throw new Error('unavailable');}};}};
  globalThis.customElements={get:()=>class {}};
  const chat=await import('../js/central-chat.js');
  const anon={authenticated:false,identity:'anonymous'};
  const authenticated=identity=>({authenticated:true,identity:identity.repeat(64),appJwt:'fixture.key.iv.body.tag',expiresAt:Date.now()/1000+300});
  let entry=anon;
  chat.configureCentralChatIdentity(async()=>entry);
  assert.equal(await chat.openCentralChat(),true);
  const anonymous=elements.at(-1);assert.ok(!anonymous.appJwt);
  entry=authenticated('a');chat.resetCentralChatIdentity({broadcast:true});
  assert.ok(anonymous.removed);assert.ok(storage.has('mi-usittel-central-session'));
  assert.equal(await chat.openCentralChat(),true);
  const a=elements.at(-1);assert.equal(a.appJwt,entry.appJwt);assert.ok(!Object.values(a.attrs).includes(entry.appJwt));assert.ok(![...storage.values()].includes(entry.appJwt));
  const count=elements.length;await chat.closeCentralChat();await chat.openCentralChat();assert.equal(elements.length,count);
  entry=authenticated('b');chat.resetCentralChatIdentity();await chat.openCentralChat();
  assert.ok(a.removed);const b=elements.at(-1);assert.notEqual(b,a);
  entry=anon;chat.resetCentralChatIdentity();await chat.openCentralChat();
  assert.ok(b.removed);assert.deepEqual(elements.at(-1).calls,['hide','clear','show','maximize']);assert.ok(!storage.has('mi-usittel-central-authenticated'));
  // A pending profile response must never resurrect the previous login.
  let release;chat.resetCentralChatIdentity();chat.configureCentralChatIdentity(()=>new Promise(r=>release=r));
  const pending=chat.openCentralChat();chat.resetCentralChatIdentity();release(authenticated('a'));
  assert.equal(await pending,false);assert.ok(elements.at(-1).removed);
  chat.configureCentralChatIdentity(async()=>authenticated('a'));await chat.openCentralChat();
  events.storage({key:'mi-usittel-central-session'});assert.ok(elements.at(-1).removed);
  // Authenticated -> anonymous may not expose a widget if clearing its old visitor fails.
  clearFailure=true;chat.configureCentralChatIdentity(async()=>anon);assert.equal(await chat.openCentralChat(),false);
  assert.ok(!elements.at(-1).calls.includes('show'));clearFailure=false;assert.equal(await chat.openCentralChat(),true);
  // Closing during the SDK mount must cancel the queued opening.
  chat.resetCentralChatIdentity();delayMount=true;
  const opening=chat.openCentralChat();await new Promise(r=>setImmediate(r));
  await chat.closeCentralChat();elements.at(-1).fireMount();assert.equal(await opening,false);
  chat.resetCentralChatIdentity();delayMount=false;
  chat.configureCentralChatIdentity(async()=>{throw new Error('profile offline');});assert.equal(await chat.openCentralChat(),true);assert.ok(!elements.at(-1).appJwt);
  chat.resetCentralChatIdentity();
  chat.resetCentralChatIdentity({suspend:true});
  assert.equal(await chat.openCentralChat(),false);
  chat.resetCentralChatIdentity();
  const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
  assert.match(app,/action === 'logout'\) \{\s*resetCentralChatIdentity\(/);
  assert.match(app,/error.status === 401\) \{\s*resetCentralChatIdentity\(/);
  console.log('central identity: anonymous/authenticated, reuse, account changes, logout, cross-tab, stale response, clear failure and mount cancellation passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
