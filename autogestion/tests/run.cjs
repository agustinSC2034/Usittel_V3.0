const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const net = require('node:net');
const php = process.env.MI_USITTEL_PHP || 'php';
const root = path.resolve(__dirname, '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-usittel-tests-'));
const config = path.join(dir, 'config.php');
const settings = (mode='phantom', idle=900, max=28800) => `<?php return ['mode'=>'${mode}','phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret','allowed_idas'=>[1,5],'lab_users'=>['laboratorio'=>5],'idle_seconds'=>${idle},'max_seconds'=>${max},'profile_fields'=>['name'=>['test_name'],'address'=>['test_address'],'plan'=>['test_plan']],'balance_path'=>['test_balance']];`;
fs.writeFileSync(config, settings());
let server, stderr='', count=0, base;
function check(name, fn) { fn(); count++; console.log(`OK ${name}`); }
async function freePort() { return new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});}); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
function jar() {
  return {cookie:'',csrf:'', async call(route,body,opts={}) {
    const headers={Cookie:this.cookie,...opts.headers};
    if(body!==undefined) {headers['Content-Type']='application/json';if(!opts.noCsrf) headers['X-CSRF-Token']=this.csrf;}
    const response=await fetch(base+route,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
    const set=response.headers.get('set-cookie'); if(set) this.cookie=set.split(';')[0];
    const text=await response.text(); let data;try{data=JSON.parse(text);}catch{data=text;}
    if(data.csrf) this.csrf=data.csrf;
    return {status:response.status,data,text,headers:response.headers};
  }};
}
const scenario = value => fs.writeFileSync(path.join(dir,'scenario'),value);
const clearRate = () => {const f=path.join(dir,'attempts.json');if(fs.existsSync(f)) fs.unlinkSync(f);};
async function login(j,user='000001',password=' 00Lab-fixture! ') {await j.call('bootstrap');return j.call('login',{username:user,password});}
(async()=>{
  let command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
  check('inspector incluye cliente, cuenta y factura sin valores',()=>{
    assert.equal(command.status,0,command.stderr);const schema=JSON.parse(command.stdout);
    assert.equal(schema.customer.fields.test_name,'string');
    assert.equal(schema.customer.fields.technical_meta.fields.connection.fields.ports.type,'array');
    assert.equal(schema.account.fields.breakdown.fields.charges.type,'array');
    assert.equal(schema.invoice.type,'array');assert.equal(schema.invoice.items.fields.IDT,'int');
    assert.equal(schema.invoice.items.fields.Metadata.fields.items.type,'array');
    assert.equal(schema.customer.fields.Autogestion_Pass,undefined);assert.equal(schema.customer.fields.DNI,undefined);
    assert.equal(schema.invoice.items.fields.Hash_Descarga,undefined);assert.equal(schema.invoice.items.fields.URL_PAGO,undefined);
    assert.doesNotMatch(command.stdout,/Cliente de pruebas|Calle ficticia|00Lab-fixture|fixture-technical-token|do-not-expose|https:\/\//);
  });
  for(const [fixture,stage,code] of [['auth-failure','autenticacion','PHANTOM_AUTH_TEST'],['customer-failure','cliente','PHANTOM_CUSTOMER_TEST'],['account-failure','estado_cuenta','PHANTOM_ACCOUNT_TEST'],['invoice-failure','factura','PHANTOM_INVOICE_TEST']]) {
    scenario(fixture);command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
    check(`inspector identifica etapa ${stage}`,()=>{assert.equal(command.status,1);assert.equal(command.stdout,'');assert.match(command.stderr,new RegExp(`Etapa: ${stage}\\r?\\nCódigo: ${code}`));assert.doesNotMatch(command.stderr,/fixture-api|fixture-technical-token|00Lab-fixture|do-not-expose/);});
  }
  scenario('unexpected-invoice');command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
  check('inspector limita excepción inesperada a metadatos seguros',()=>{assert.equal(command.status,1);assert.match(command.stderr,/Etapa: factura\r?\nCódigo: UNEXPECTED\r?\nExcepción: TypeError\r?\nArchivo: FixtureTransport.php\r?\nLínea: \d+/);assert.doesNotMatch(command.stderr,/sensitive-value|Mensaje:|fixture-api|token|https?:\/\//i);});
  scenario('normal');command=spawnSync(php,[path.join(__dirname,'curl-diagnostics.php')],{env:{...process.env,MI_USITTEL_TEST:'1'},encoding:'utf8'});
  check('cURL convierte CA inválida en código propio sin red',()=>{assert.equal(command.status,0,command.stderr);assert.equal(command.stdout,'PHANTOM_CA_FILE');});
  const traceAfterSchema=fs.readFileSync(path.join(dir,'trace.txt'),'utf8');
  command=spawnSync(process.execPath,[path.join(root,'check.cjs')],{env:{...process.env,MI_USITTEL_PHP:php,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir},encoding:'utf8'});
  check('chequeo local pasa sin red ni secretos',()=>{assert.equal(command.status,0,command.stdout+command.stderr);assert.match(command.stdout,/PHP/);assert.match(command.stdout,/cURL/);assert.match(command.stdout,/no contactó Phantom/);assert.doesNotMatch(command.stdout,/fixture-api-secret|fixture-api\b/);assert.equal(fs.readFileSync(path.join(dir,'trace.txt'),'utf8'),traceAfterSchema);});
  const incomplete=path.join(dir,'incomplete.php');fs.writeFileSync(incomplete,settings().replace("'fixture-api'","''").replace("'fixture-api-secret'","''"));
  command=spawnSync(process.execPath,[path.join(root,'check.cjs')],{env:{...process.env,MI_USITTEL_PHP:php,MI_USITTEL_CONFIG:incomplete,MI_USITTEL_RUNTIME:dir},encoding:'utf8'});
  check('chequeo avisa credenciales faltantes sin imprimir valores',()=>{assert.equal(command.status,0);assert.match(command.stdout,/⚠️ Credenciales Phantom/);assert.doesNotMatch(command.stdout,/api_pass\s*=>/);});
  const malformed=path.join(dir,'malformed.php');fs.writeFileSync(malformed,settings().replace("'profile_fields'=>[", "'profile_fields'=>'invalid','unused'=>["));
  command=spawnSync(process.execPath,[path.join(root,'check.cjs')],{env:{...process.env,MI_USITTEL_PHP:php,MI_USITTEL_CONFIG:malformed,MI_USITTEL_RUNTIME:dir},encoding:'utf8'});
  check('chequeo rechaza estructura inválida',()=>{assert.equal(command.status,1);assert.match(command.stdout,/❌ Estructura de configuración/);});
  command=spawnSync(process.execPath,[path.join(root,'check.cjs')],{env:{...process.env,MI_USITTEL_PHP:php,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:root},encoding:'utf8'});
  check('chequeo rechaza runtime dentro del repositorio',()=>{assert.equal(command.status,1);assert.match(command.stdout,/❌ Runtime privado/);});
  const port=await freePort();base=`http://127.0.0.1:${port}/autogestion/api/`;
  server=spawn(php,['-d','display_errors=0','-d','zend.exception_ignore_args=1','-S',`127.0.0.1:${port}`,'-t',root,path.join(__dirname,'router.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},stdio:['ignore','ignore','pipe']});
  server.on('error',e=>{console.error('PHP no disponible:',e.code);process.exitCode=1;});server.stderr.on('data',b=>stderr+=b);
  for(let i=0;i<40;i++){try{await fetch(base+'bootstrap');break;}catch{await sleep(100);}}
  const a=jar();let r=await a.call('bootstrap');
  check('cookie HttpOnly / SameSite y modo servidor',()=>{assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/i);assert.equal(r.data.mode,'phantom');});
  check('API sin sesión',()=>{});assert.equal((await a.call('overview')).status,401);
  r=await a.call('login',{username:'000001',password:' 00Lab-fixture! '},{noCsrf:true});check('CSRF login',()=>assert.equal(r.status,403));
  r=await a.call('login',{username:'000001',password:' 00Lab-fixture! '},{headers:{Origin:'https://evil.invalid'}});check('origen cruzado rechazado',()=>assert.equal(r.status,403));
  r=await a.call('login',{username:'000001',password:'00Lab-fixture!'});check('no recorta contraseña',()=>assert.equal(r.status,401));
  r=await a.call('login',{username:'1',password:' 00Lab-fixture! '});check('IDA candidato no autoriza usuario distinto',()=>assert.equal(r.status,401));
  r=await a.call('login',{username:'000014',password:' 00Lab-fixture! '});check('IDA fuera de laboratorio rechazado',()=>assert.equal(r.status,401));
  scenario('missing-credentials');r=await a.call('login',{username:'000001',password:' 00Lab-fixture! '});check('sin campos de credenciales rechaza',()=>assert.equal(r.status,401));scenario('normal');
  clearRate();scenario('timeout');const providerFailure=jar();await providerFailure.call('bootstrap');r=await providerFailure.call('login',{username:'000001',password:' 00Lab-fixture! '});check('fallo del proveedor no consume intentos de credenciales',()=>{assert.equal(r.status,504);const state=JSON.parse(fs.readFileSync(path.join(dir,'attempts.json'),'utf8'));assert.equal(Object.keys(state.buckets).length,0);});scenario('normal');
  const oldCookie=a.cookie;r=await login(a);check('login fixture suspendido y regeneración',()=>{assert.equal(r.status,200);assert.notEqual(a.cookie,oldCookie);});
  r=await a.call('bootstrap');check('sesión persiste al recargar',()=>assert.equal(r.data.authenticated,true));
  r=await a.call('overview');check('whitelist y saldo independiente',()=>{assert.equal(r.data.account.debt,12500.75);assert.equal(r.data.invoices.items[0].amount,20000.25);assert.equal(r.data.customer.serviceStatus,'Suspendido');assert.equal(r.data.nextDue,null);assert.doesNotMatch(r.text,/Autogestion|fixture-technical-token|Hash_Descarga|do-not-expose|fixture-api-secret|Conexiones_Asociadas/);});
  r=await a.call('overview?IDA=5');check('IDA navegador rechazado',()=>assert.equal(r.status,400));
  r=await a.call('bootstrap?mode=demo');check('modo por URL rechazado',()=>assert.equal(r.status,400));
  scenario('expired-once');r=await a.call('overview');check('token expirado renueva una vez',()=>assert.equal(r.status,200));
  scenario('expired-always');const traceBefore=fs.readFileSync(path.join(dir,'trace.txt'),'utf8').split('\n').length;r=await a.call('overview');check('token inválido persistente no reintenta indefinidamente',()=>{assert.equal(r.status,503);assert.equal(fs.readFileSync(path.join(dir,'trace.txt'),'utf8').split('\n').length-traceBefore,3);});
  scenario('timeout');r=await a.call('overview');check('timeout recuperable sin mocks',()=>{assert.equal(r.status,504);assert.equal(r.data.customer,undefined);});
  scenario('functional');r=await a.call('overview');check('error funcional sin datos sensibles',()=>{assert.equal(r.status,503);assert.doesNotMatch(r.text,/Private upstream/);});
  scenario('http');r=await a.call('overview');check('error HTTP upstream',()=>assert.equal(r.status,503));
  scenario('missing');r=await a.call('overview');check('campos ausentes no generan ceros ni ejemplos',()=>{assert.equal(r.data.customer.name,null);assert.equal(r.data.account.debt,null);assert.equal(r.data.invoices.items[0].amount,null);assert.equal(r.data.invoices.items[0].status,'No disponible');});
  scenario('empty');r=await a.call('overview');check('facturas vacías no equivalen a deuda cero',()=>{assert.deepEqual(r.data.invoices.items,[]);assert.equal(r.data.account.debt,12500.75);});
  scenario('balance-error');r=await a.call('overview');check('fallo de saldo no suma facturas',()=>{assert.equal(r.data.account.debt,null);assert.ok(r.data.warnings.includes('BALANCE_UNAVAILABLE'));});
  scenario('credit');r=await a.call('overview');check('saldo a favor y discrepancia controlada',()=>{assert.equal(r.data.account.credit,150.5);assert.ok(r.data.warnings.includes('ACCOUNT_RECONCILIATION'));});
  scenario('invoices-error');r=await a.call('invoices');check('otro 400 no equivale a lista vacía',()=>assert.equal(r.status,503));
  scenario('malformed-invoices');r=await a.call('invoices');check('envoltorio inesperado rechazado',()=>assert.equal(r.status,503));
  scenario('pagination');r=await a.call('invoices?offset=20');check('paginación acotada al IDA de sesión',()=>{assert.equal(r.data.nextOffset,40);assert.equal(r.data.items[0].id,'980');});
  scenario('normal');r=await a.call('logout',{}, {noCsrf:true});check('CSRF logout',()=>assert.equal(r.status,403));
  const sessionCookie=a.cookie;r=await a.call('logout',{});check('logout servidor',()=>assert.equal(r.status,200));
  const replay=jar();replay.cookie=sessionCookie;check('sesión invalidada no reutilizable',()=>{});assert.equal((await replay.call('overview')).status,401);
  clearRate();const b=jar();r=await login(b,'laboratorio');check('usuario personalizado laboratorio',()=>assert.equal(r.status,200));
  clearRate();const repeated=jar();for(let i=0;i<8;i++){r=await login(repeated);assert.equal(r.status,200);}check('logins correctos repetidos no consumen límite',()=>{const state=JSON.parse(fs.readFileSync(path.join(dir,'attempts.json'),'utf8'));assert.equal(Object.keys(state.buckets).length,0);});
  clearRate();const priorFailures=jar();await priorFailures.call('bootstrap');await priorFailures.call('login',{username:'000001',password:'bad'});await priorFailures.call('login',{username:'000001',password:'bad'});r=await priorFailures.call('login',{username:'000001',password:' 00Lab-fixture! '});check('login correcto no suma ni borra fallos previos',()=>{assert.equal(r.status,200);const counts=Object.values(JSON.parse(fs.readFileSync(path.join(dir,'attempts.json'),'utf8')).buckets).map(v=>v.count).sort();assert.deepEqual(counts,[2,2]);});
  clearRate();const bad=jar();await bad.call('bootstrap');for(let i=0;i<5;i++) await bad.call('login',{username:'000001',password:'bad'});r=await bad.call('login',{username:'000001',password:'bad'});check('límite backend por cuenta',()=>assert.equal(r.status,429));
  clearRate();fs.writeFileSync(config,settings('phantom',1));const expiry=jar();await login(expiry);await sleep(1100);r=await expiry.call('overview');check('vencimiento por inactividad',()=>assert.equal(r.status,401));
  clearRate();fs.writeFileSync(config,settings('phantom',900,1));const max=jar();await login(max);await sleep(1100);r=await max.call('overview');check('duración máxima',()=>assert.equal(r.status,401));
  clearRate();fs.writeFileSync(config,settings('demo'));const demoTraceBefore=fs.readFileSync(path.join(dir,'trace.txt'),'utf8');const demo=jar();r=await login(demo,'agustin.demo','usittel-demo');check('demo explícito nunca llama a Phantom',()=>{assert.equal(r.status,200);assert.equal(fs.readFileSync(path.join(dir,'trace.txt'),'utf8'),demoTraceBefore);});
  fs.writeFileSync(config,settings('phantom'));r=await demo.call('overview');check('sesión demo no abre modo Phantom',()=>assert.equal(r.status,401));
  const injected=jar();r=await login(injected,'agustin.demo','usittel-demo');check('login simulado no aceptado en Phantom',()=>assert.equal(r.status,401));
  check('fixture demo solo se importa tras modo demo',()=>{const source=fs.readFileSync(path.join(root,'js','data.js'),'utf8');assert.match(source,/if \(mode === 'demo'\)[\s\S]*import\('\.\/demo-data\.js'\)/);assert.doesNotMatch(fs.readFileSync(path.join(root,'js','api.js'),'utf8'),/demo-data/);});
  clearRate();const mapping=jar();await login(mapping);
  fs.writeFileSync(config,settings().replace("'name'=>['test_name']", "'name'=>['Autogestion_Pass']"));r=await mapping.call('overview');check('configuración no expone credenciales como perfil',()=>{assert.equal(r.status,503);assert.doesNotMatch(r.text,/00Lab-fixture/);});
  fs.writeFileSync(config,settings().replace("'name'=>['test_name']", "'name'=>['join'=>[['test_name'],['test_plan']]]"));r=await mapping.call('overview');check('composición de campos explícitos',()=>assert.equal(r.data.customer.name,'Cliente de pruebas Plan de laboratorio'));
  fs.writeFileSync(config,settings().replace("'name'=>['test_name']", "'name'=>null").replace("'balance_path'=>['test_balance']", "'balance_path'=>null"));r=await mapping.call('overview');check('mapeos pendientes quedan no disponibles',()=>{assert.equal(r.data.customer.name,null);assert.equal(r.data.account.debt,null);});
  const trace=fs.readFileSync(path.join(dir,'trace.txt'),'utf8');check('solo auth/lecturas IDA 1 o 5',()=>{assert.doesNotMatch(trace,/:14|:999|Imputar|Promesa|Actualizar/);});
  check('logs sin secretos',()=>assert.doesNotMatch(stderr,/00Lab-fixture|fixture-api-secret|fixture-technical-token|do-not-expose/));
  console.log(`${count} verificaciones completadas con fixtures; NO valida Phantom real.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.kill());
