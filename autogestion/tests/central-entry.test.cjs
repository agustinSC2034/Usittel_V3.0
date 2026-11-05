const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const php = process.env.MI_USITTEL_PHP || 'php';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-central-fixture-'));
const config = path.join(dir, 'config.php');
const certificate = path.join(dir, 'central-mi-usittel.json');
const env = { ...process.env, MI_USITTEL_TEST: '1', MI_USITTEL_CONFIG: config, MI_USITTEL_RUNTIME: dir };
fs.writeFileSync(config, "<?php return ['mode'=>'phantom','phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret','allowed_idas'=>[1,5],'lab_users'=>['laboratorio'=>1],'customer_id_field'=>'ID','profile_fields'=>['name'=>['Nombre']]];");
fs.writeFileSync(path.join(dir,'scenario'), 'normal');
const recipient = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const signing = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
function bundle(pair=signing, alg='ES256') {
  return { iss:'wiOT-40q9iiyNBb8NahcAg', kid:'-6VqjB9Gh2bDQwOp5CME1w', alg,
    privateJwk:pair.privateKey.export({format:'jwk'}), centralEncryptionKey: {
      kid:'fixture-central', alg:'RSA-OAEP-256', publicJwk:recipient.publicKey.export({format:'jwk'}),
    } };
}
function run(input, success=true) {
  const r=spawnSync(php,[path.join(__dirname,'central-entry-probe.php')],{env,input:JSON.stringify(input),encoding:'utf8',windowsHide:true});
  assert.equal(r.status===0,success,r.stderr);
  return r.stdout;
}
const decode = part => Buffer.from(part,'base64url');
function open(token, publicKey=signing.publicKey, alg='ES256') {
  const [header,key,iv,body,tag]=token.split('.');
  assert.deepEqual(JSON.parse(decode(header)),{alg:'RSA-OAEP-256',enc:'A256GCM',cty:'JWT',kid:'fixture-central',bid:'wiOT-40q9iiyNBb8NahcAg',cid:'-6VqjB9Gh2bDQwOp5CME1w'});
  const cek=crypto.privateDecrypt({key:recipient.privateKey,oaepHash:'sha256',padding:crypto.constants.RSA_PKCS1_OAEP_PADDING},decode(key));
  const decipher=crypto.createDecipheriv('aes-256-gcm',cek,decode(iv));
  decipher.setAAD(Buffer.from(header));decipher.setAuthTag(decode(tag));
  const signed=Buffer.concat([decipher.update(decode(body)),decipher.final()]).toString();
  const [h,p,s]=signed.split('.');
  assert.deepEqual(JSON.parse(decode(h)),{alg,kid:'-6VqjB9Gh2bDQwOp5CME1w',typ:'JWT'});
  assert.ok(crypto.verify('sha256',Buffer.from(`${h}.${p}`),{key:publicKey,...(alg==='ES256'?{dsaEncoding:'ieee-p1363'}:{})},decode(s)));
  return JSON.parse(decode(p));
}
let server;
(async()=>{
  for(const session of [{},{ida:1},{ida:1,authenticated_ida:'1'},{authenticated_ida:1},{ida:1,authenticated_ida:0},{ida:1,authenticated_ida:10000000000}]) assert.equal(run({action:'owner',session}),'null');
  assert.equal(run({action:'owner',session:{ida:5,selected_ida:5,authenticated_ida:1}}),'1');
  const now=Math.floor(Date.now()/1000);
  const claims=open(run({action:'mint',bundle:bundle(),owner:1,name:'  Prueba Única  ',now}));
  assert.deepEqual(claims,{chat_account:'-6VqjB9Gh2bDQwOp5CME1w',iss:'wiOT-40q9iiyNBb8NahcAg',sub:'mi-usittel:1',aud:'central:app-entry',iat:now,exp:now+300,name:'Prueba Única'});
  const rsa=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
  assert.equal(open(run({action:'mint',bundle:bundle(rsa,'RS256'),owner:5,name:null,now}),rsa.publicKey,'RS256').sub,'mi-usittel:5');
  run({action:'mint',bundle:{...bundle(),kid:'sales'},owner:1,name:'Fixture',now},false);
  run({action:'mint',bundle:bundle(),owner:0,name:'Fixture',now},false);
  assert.deepEqual(JSON.parse(run({action:'entry',session:{ida:1,authenticated_ida:1,csrf:'fixture-csrf'}})),{authenticated:false,identity:'anonymous'});
  fs.writeFileSync(certificate,JSON.stringify(bundle()));
  const entry=JSON.parse(run({action:'entry',session:{ida:5,selected_ida:5,authenticated_ida:1,csrf:'fixture-csrf'}}));
  assert.equal(entry.authenticated,true);assert.match(entry.identity,/^[a-f0-9]{64}$/);
  assert.equal(open(entry.appJwt).sub,'mi-usittel:1');
  assert.ok(fs.readFileSync(path.join(dir,'trace.txt'),'utf8').includes('Consulta_Cliente_Avanzada:1'));
  assert.ok(!fs.readFileSync(path.join(dir,'trace.txt'),'utf8').includes('Consulta_Cliente_Avanzada:5'));
  fs.writeFileSync(path.join(dir,'scenario'),'timeout');
  assert.equal(JSON.parse(run({action:'entry',session:{ida:1,authenticated_ida:1,csrf:'fixture-csrf'}})).authenticated,false);
  fs.writeFileSync(path.join(dir,'scenario'),'normal');
  const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  server=spawn(php,['-S',`127.0.0.1:${port}`,path.join(__dirname,'router.php')],{env,stdio:'ignore',windowsHide:true});
  let cookie='',csrf='';
  async function call(route,body,extra={}) {
    const response=await fetch(`http://127.0.0.1:${port}/api/${route}`,{headers:{Cookie:cookie,...(body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf}),...extra},method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});
    const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
    const data=await response.json();if(data.csrf)csrf=data.csrf;
    return {status:response.status,data,headers:response.headers};
  }
  for(let i=0;i<50;i++) {try {await call('bootstrap');break;}catch {await new Promise(r=>setTimeout(r,50));}}
  assert.equal((await call('chat-entry')).status,405);
  assert.equal((await call('chat-entry',{}, {'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await call('chat-entry',{owner:5})).status,400);
  assert.equal((await call('chat-entry',{}, {Origin:'https://foreign.invalid'})).status,403);
  assert.deepEqual((await call('chat-entry',{})).data,{authenticated:false,identity:'anonymous'});
  assert.equal((await call('login',{username:'000001',password:' 00Lab-fixture! '})).status,200);
  const authenticated=await call('chat-entry',{});
  assert.equal(authenticated.status,200);assert.equal(open(authenticated.data.appJwt).sub,'mi-usittel:1');
  assert.match(authenticated.headers.get('cache-control'),/no-store/);
  await call('logout',{});
  await call('bootstrap');
  assert.deepEqual((await call('chat-entry',{})).data,{authenticated:false,identity:'anonymous'});
  console.log('central entry: owner isolation, ES256/RS256 JWS + RSA-OAEP-256/A256GCM round-trip, method/CSRF, login/logout and failure fallback passed');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server?.kill();fs.rmSync(dir,{recursive:true,force:true});});
