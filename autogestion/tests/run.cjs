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
const settings = (mode='phantom', idle=900, max=28800) => `<?php return ['mode'=>'${mode}','phantom_url'=>'https://fixture.invalid/API_Rest.php','api_user'=>'fixture-api','api_pass'=>'fixture-api-secret','allowed_idas'=>[1,5],'lab_users'=>['laboratorio'=>1],'customer_id_field'=>'ID','idle_seconds'=>${idle},'max_seconds'=>${max},'profile_fields'=>['name'=>['Nombre'],'address'=>['Direccion'],'plan'=>['Producto_Internet']],'balance_path'=>['test_balance']];`;
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
  const fixtureEnv={...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'};
  const documentConfig=path.join(dir,'document-config.php');
  const caFixture=path.join(dir,'fixture-ca.pem');fs.writeFileSync(caFixture,'fixture only');
  fs.writeFileSync(documentConfig,settings().replace("'mode'=>'phantom'", "'ca_file'=>'"+caFixture.replaceAll('\\','/')+"','mode'=>'phantom'"));
  const documentErrors={'not-found':'INVOICE_NOT_FOUND',foreign:'INVOICE_OWNERSHIP','missing-hash':'DOCUMENT_UNAVAILABLE','empty-hash':'DOCUMENT_UNAVAILABLE',size:'DOCUMENT_SIZE','header-size':'DOCUMENT_SIZE',timeout:'PHANTOM_TIMEOUT',runtime:'PHANTOM_CURL_RUNTIME',args:'INSPECTOR_ARGUMENTS','hash-argument':'INSPECTOR_ARGUMENTS',duplicate:'INVOICES_DUPLICATE'};
  for(const name of ['pdf','latest','html','redirect','external','unsafe-path','relative','http-redirect','userinfo','no-location','mime','empty','http-error',...Object.keys(documentErrors)]) {
    const before=fs.readdirSync(dir).sort();
    const probe=spawnSync(php,[path.join(__dirname,'document-probe.php'),name],{env:{...fixtureEnv,MI_USITTEL_CONFIG:documentConfig},encoding:'utf8'});
    check('inspector de documento '+name+': selección exacta, TLS y GET único sin secretos',()=>{
      assert.equal(probe.status,documentErrors[name]?1:0,probe.stdout+probe.stderr);
      assert.deepEqual(fs.readdirSync(dir).sort(),before);
      assert.doesNotMatch(probe.stdout+probe.stderr,/private-|fixture-|https?:|IDT=|Hash_Descarga|Set-Cookie|<html/);
      if(documentErrors[name]) assert.ok(probe.stderr.includes(documentErrors[name]),probe.stderr);
      else {
        assert.match(probe.stdout,/Endpoint: Comprobante_Factura.php/);
        if(name==='pdf' || name==='latest') assert.match(probe.stdout,/Firma PDF: sí/);
        if(name==='html') assert.match(probe.stdout,/Tipo detectado: HTML/);
        if(name==='empty') assert.match(probe.stdout,/Tipo detectado: VACÍO/);
        if(name==='mime') assert.match(probe.stdout,/Content-Type: no reconocido/);
        if(name==='http-error') assert.match(probe.stdout,/HTTP: 500/);
        if(['redirect','relative','unsafe-path'].includes(name)) assert.match(probe.stdout,/Destino host permitido: sí/);
        if(['external','http-redirect','userinfo','no-location'].includes(name)) assert.match(probe.stdout,/Destino host permitido: no/);
        if(name==='redirect') assert.match(probe.stdout,/Destino path: \/PHANTOM\/login.php/);
        if(name==='unsafe-path') assert.match(probe.stdout,/Destino path: \[omitido/);
      }
    });
  }
  for(const name of ['normal','empty','one','repeat','duplicate','html','http','args']) {
    const before=fs.readdirSync(dir).sort();
    const probe=spawnSync(php,[path.join(__dirname,'invoice-probe.php'),name],{env:fixtureEnv,encoding:'utf8'});
    check(`inspector de historial ${name}: máximo 3 llamadas, solo metadatos y sin persistencia`,()=>{
      assert.equal(probe.status,['duplicate','html','http','args'].includes(name)?1:0,probe.stderr);
      assert.deepEqual(fs.readdirSync(dir).sort(),before);
      assert.doesNotMatch(probe.stdout+probe.stderr,/private-|fixture-|1000|https?:|api_pass|Autogestion/);
      if(probe.status===0) {
        const result=JSON.parse(probe.stdout).invoices;assert.equal(result.limit,10);assert.equal(result.pages.length,2);
        if(name==='normal') {assert.equal(result.two_nonempty_pages,true);assert.equal(result.page_2_older,true);assert.equal(result.overlap_count,0);}
        if(name==='empty') assert.deepEqual(result.pages.map(p=>p.count),[0,0]);
        if(name==='one') {assert.deepEqual(result.pages.map(p=>p.count),[1,0]);assert.equal(result.two_nonempty_pages,false);}
        if(name==='repeat') {assert.equal(result.page_2_older,false);assert.equal(result.overlap_count,10);}
      }
    });
  }
  const wire=spawnSync(php,[path.join(__dirname,'backend-contract.php')],{env:fixtureEnv,encoding:'utf8'});
  check('backend real comparte GET codificado, lecturas POST, BOM, identidad y mapeos',()=>{
    assert.equal(wire.status,0,wire.stderr);assert.equal(wire.stderr,'');
    assert.deepEqual(JSON.parse(wire.stdout),{get_auth:true,post_reads:true,shared_bom_decoder:true,exact_login:true,public_mappings:true,explicit_identity:true});
    assert.doesNotMatch(wire.stdout,/fixture |Persona|Empresa|5550000/);
  });
  const fullConfig=path.join(dir,'full-probe.php');
  for(const [name,stage,code,http,format] of [['success'],['no-invoice'],
    ...['autenticacion','cliente','estado_cuenta','factura'].map((s,i)=>[`fail-${i+1}`,s,'TOKEN_EXPIRED',401]),
    ['malformed-account','estado_cuenta','PHANTOM_FORMAT',200,'APARIENCIA_HTML'],['other-invoice-error','factura','PHANTOM_FUNCTIONAL'],
    ['warning-invoice','factura','PHANTOM_CURL_RUNTIME'],['args','configuracion','INSPECTOR_ARGUMENTS'],
    ['demo','configuracion','CONFIGURATION'],['forbidden','configuracion','CONFIGURATION']]) {
    let content=settings(name==='demo'?'demo':'phantom');
    if(name==='forbidden') content=content.replace("'allowed_idas'=>[1,5]","'allowed_idas'=>[5]");
    fs.writeFileSync(fullConfig,content.replace('<?php return',"<?php echo 'private-config-output'; return"));
    const before=fs.readdirSync(dir).sort();
    const probe=spawnSync(php,[path.join(__dirname,'full-schema-probe.php'),name],{env:{...fixtureEnv,MI_USITTEL_CONFIG:fullConfig},encoding:'utf8'});
    check(`esquema completo GET ${name}: IDA 1, cuatro llamadas máximas, sin persistencia`,()=>{
      assert.equal(probe.status,code?1:0,probe.stderr);assert.deepEqual(fs.readdirSync(dir).sort(),before);
      if(code) {assert.equal(probe.stdout,'');assert.equal(probe.stderr.replace(/\r\n/g,'\n'),`Etapa: ${stage}\nCódigo: ${code}\n${http?`HTTP: ${http}\n`:''}${format?`Formato: ${format}\n`:''}`);}
      else {
        assert.equal(probe.stderr,'');const shape=JSON.parse(probe.stdout);
        assert.deepEqual(Object.keys(shape),['customer','account','invoice']);
        assert.equal(shape.customer.type,'array');assert.deepEqual(shape.customer.items.fields,{Nombre:'string'});
        assert.equal(shape.account.fields.Saldo,'string');assert.deepEqual(shape.account.fields.details.items.fields,{Monto:'int'});
        if(name==='no-invoice') assert.deepEqual(shape.invoice,{type:'array',items:'unknown'});
        else assert.deepEqual(shape.invoice.items.fields,{IDT:'string',Total:'string'});
      }
      assert.doesNotMatch(probe.stdout+probe.stderr,/private-|fixture-|https?:\/\//);
    });
  }
  const customerConfig=path.join(dir,'customer-probe.php');
  for(const identityScenario of ['identity','identity-wrong','identity-type','identity-duplicate']) {
    const probe=spawnSync(php,[path.join(__dirname,'customer-probe.php'),identityScenario],{env:fixtureEnv,encoding:'utf8'});
    check(`validación de identidad sin valores: ${identityScenario}`,()=>{
      assert.equal(probe.status,0,probe.stderr);const report=JSON.parse(probe.stdout).identity;
      assert.equal(report.records,identityScenario==='identity-duplicate'?2:1);
      if(report.records===1) {
        assert.equal(report.ID.matches_requested_ida,identityScenario!=='identity-wrong');assert.equal(report.IDAx.matches_requested_ida,false);
        assert.deepEqual(report.Autogestion_User,{present:true,type:'string'});
        assert.deepEqual(report.Autogestion_Pass,{present:true,type:identityScenario==='identity-type'?'int':'string'});
      } else assert.equal(report.ID,undefined);
      assert.doesNotMatch(probe.stdout+probe.stderr,/private-|fixture-|https?:\/\//);
    });
  }
  for(const [name,stage,code,http,format] of [['success'],['bom'],['auth-failure','autenticacion','PHANTOM_HTTP',400],
    ['http','cliente','PHANTOM_HTTP',400],['expired','cliente','TOKEN_EXPIRED',401],['redirect','cliente','PHANTOM_HTTP',302],
    ['malformed','cliente','PHANTOM_FORMAT',200,'TEXTO_O_JSON_INVALIDO'],
    ...Object.entries({html:'APARIENCIA_HTML',empty:'RESPUESTA_VACIA',string:'JSON_STRING','nested-json':'JSON_DENTRO_DE_STRING',
      null:'JSON_NULL',boolean:'JSON_BOOLEAN',number:'JSON_NUMBER',utf8:'UTF8_INVALIDO',deep:'JSON_PROFUNDIDAD_EXCEDIDA',
      'bom-html':'APARIENCIA_HTML','bom-invalid':'TEXTO_O_JSON_INVALIDO','bom-only':'RESPUESTA_VACIA',
      'bom-double':'PREFIJO_BOM_UTF8','bom-after-space':'TEXTO_O_JSON_INVALIDO','bom-string':'JSON_STRING'})
      .map(([name,format])=>[name,'cliente','PHANTOM_FORMAT',200,format]),
    ['unsafe-format','cliente','PHANTOM_FORMAT',200],['functional','cliente','PHANTOM_FUNCTIONAL'],['bom-functional','cliente','PHANTOM_FUNCTIONAL'],['warning','cliente','PHANTOM_CURL_RUNTIME'],
    ['args','configuracion','INSPECTOR_ARGUMENTS'],['forbidden','configuracion','CONFIGURATION'],['demo','configuracion','CONFIGURATION']]) {
    let content=settings(name==='demo'?'demo':'phantom');
    if(name==='forbidden') content=content.replace("'allowed_idas'=>[1,5]","'allowed_idas'=>[5]");
    fs.writeFileSync(customerConfig,content.replace('<?php return',"<?php echo 'private-config-output'; return"));
    const before=fs.readdirSync(dir).sort();
    const probe=spawnSync(php,[path.join(__dirname,'customer-probe.php'),name],{env:{...fixtureEnv,MI_USITTEL_CONFIG:customerConfig},encoding:'utf8'});
    check(`cliente IDA 1 ${name}: alcance, transporte y salida segura`,()=>{
      assert.equal(probe.status,code?1:0,probe.stderr);assert.deepEqual(fs.readdirSync(dir).sort(),before);
      if(code) {assert.equal(probe.stdout,'');assert.equal(probe.stderr.replace(/\r\n/g,'\n'),`Etapa: ${stage}\nCódigo: ${code}\n${http?`HTTP: ${http}\n`:''}${format?`Formato: ${format}\n`:''}`);}
      else {
        assert.equal(probe.stderr,'');const shape=JSON.parse(probe.stdout);
        assert.deepEqual(Object.keys(shape),['customer']);
        assert.equal(shape.customer.fields.Nombre,'string');assert.equal(shape.customer.fields.Estado_Servicio,'string');
        assert.equal(shape.customer.fields.Autogestion_Pass,undefined);assert.equal(shape.customer.fields.Conexiones_Asociadas,undefined);
        assert.deepEqual(Object.keys(shape.customer.fields.nested.fields),['ports']);
      }
      assert.doesNotMatch(probe.stdout+probe.stderr,/private-|fixture-|https?:\/\//);
    });
  }
  const getConfig=path.join(dir,'get-probe.php');const getCa=path.join(dir,'fixture-ca.pem');
  fs.writeFileSync(getCa,'fixture only; intercepted cURL does not open a connection');
  const getSettings=settings().replace('fixture-api-secret','fixture %&=+#? /á').replace('fixture-api','fixture +&=%á').replace("'allowed_idas'=>",`'ca_file'=>'${getCa.replace(/\\/g,'/')}', 'allowed_idas'=>`);
  const expectedGet=[['success',null],['redirect','PHANTOM_HTTP',302],['http','PHANTOM_HTTP',400],['unauthorized','TOKEN_EXPIRED',401],
    ['malformed','PHANTOM_FORMAT',200],['scalar','PHANTOM_FORMAT',200],['empty','PHANTOM_TOKEN',200],['functional','PHANTOM_FUNCTIONAL',200],
    ['tls','PHANTOM_TLS_ISSUER'],['large','PHANTOM_RESPONSE_TOO_LARGE'],['warning','PHANTOM_CURL_RUNTIME'],['exception','PHANTOM_CURL_RUNTIME'],
    ['args','INSPECTOR_ARGUMENTS'],['demo','CONFIGURATION'],['insecure','CONFIGURATION'],['missing-ca','PHANTOM_CA_FILE']];
  for(const [scenarioName,code,http] of expectedGet) {
    let content=getSettings;
    if(scenarioName==='demo') content=content.replace("'mode'=>'phantom'","'mode'=>'demo'");
    if(scenarioName==='insecure') content=content.replace('https://fixture.invalid','http://fixture.invalid');
    if(scenarioName==='missing-ca') content=content.replace('fixture-ca.pem','missing-ca.pem');
    // Even accidental output from a valid private config must not reach stdout.
    content=content.replace('<?php return',"<?php echo 'fixture-private-output'; return");
    fs.writeFileSync(getConfig,content);
    const before=fs.readdirSync(dir).sort();
    const probe=spawnSync(php,[path.join(__dirname,'auth-get.php'),scenarioName],{env:{...fixtureEnv,MI_USITTEL_CONFIG:getConfig},encoding:'utf8'});
    check(`GET aislado ${scenarioName}: salida segura, una solicitud como máximo y sin persistencia`,()=>{
      assert.equal(probe.status,code?1:0,probe.stderr);
      assert.deepEqual(fs.readdirSync(dir).sort(),before);
      if(!code) {assert.equal(probe.stdout.replace(/\r\n/g,'\n'),'Etapa: autenticacion\nCódigo: TOKEN_RECIBIDO\nToken oculto; sin guardar ni consultar clientes.\n');assert.equal(probe.stderr,'');}
      else {
        const stage=['args','demo','insecure'].includes(scenarioName)?'configuracion':'autenticacion';
        assert.equal(probe.stdout,'');
        assert.equal(probe.stderr.replace(/\r\n/g,'\n'),`Etapa: ${stage}\nCódigo: ${code}\n${http?`HTTP: ${http}\n`:''}`);
      }
      assert.doesNotMatch(probe.stdout+probe.stderr,/fixture-|sensitive|https?:\/\//);
    });
  }
  const formTest=spawnSync(php,[path.join(__dirname,'auth-form.php')],{env:fixtureEnv,encoding:'utf8'});
  check('prueba de formulario preserva HTTPS, secretos en cuerpo, JSON normal y no reintenta',()=>{
    assert.equal(formTest.status,0,formTest.stderr);
    assert.deepEqual(JSON.parse(formTest.stdout),{default_json:true,form_roundtrip:true,secure_post:true,reads_json:true,single_auth:true});
    assert.equal(formTest.stderr.replace(/\r\n/g,'\n'),'Etapa: autenticacion\nCódigo: PHANTOM_HTTP\nHTTP: 400\n');
  });
  for(const args of [[],['1','--unknown'],['1','--auth-form','--auth-form'],['2','--auth-form'],['1','--auth-get','--auth-form'],['5','--auth-get']]) {
    const invalid=spawnSync(php,[path.join(root,'server/inspect-schema.php'),...args],{env:{...fixtureEnv,MI_USITTEL_CONFIG:path.join(dir,'does-not-exist.php')},encoding:'utf8'});
    check(`inspector rechaza argumentos inválidos antes de configuración/red: ${JSON.stringify(args)}`,()=>{
      assert.equal(invalid.status,1);assert.equal(invalid.stdout,'');
      assert.equal(invalid.stderr.replace(/\r\n/g,'\n'),'Etapa: configuracion\nCódigo: INSPECTOR_ARGUMENTS\n');
    });
  }
  let command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
  check('inspector incluye cliente, cuenta y factura sin valores',()=>{
    assert.equal(command.status,0,command.stderr);const schema=JSON.parse(command.stdout);
    assert.equal(schema.customer.items.fields.test_name,'string');
    assert.equal(schema.customer.items.fields.technical_meta.fields.connection.fields.ports.type,'array');
    assert.equal(schema.account.fields.breakdown.fields.charges.type,'array');
    assert.equal(schema.invoice.type,'array');assert.equal(schema.invoice.items.fields.IDT,'int');
    assert.equal(schema.invoice.items.fields.Metadata.fields.items.type,'array');
    assert.equal(schema.customer.items.fields.Autogestion_Pass,undefined);assert.equal(schema.customer.items.fields.DNI,undefined);
    assert.equal(schema.invoice.items.fields.Hash_Descarga,undefined);assert.equal(schema.invoice.items.fields.URL_PAGO,undefined);
    assert.doesNotMatch(command.stdout,/Cliente de pruebas|Calle ficticia|00Lab-fixture|fixture-technical-token|do-not-expose|https:\/\//);
  });
  for(const [fixture,stage,code] of [['auth-failure','autenticacion','PHANTOM_AUTH_TEST'],['customer-failure','cliente','PHANTOM_CUSTOMER_TEST'],['account-failure','estado_cuenta','PHANTOM_ACCOUNT_TEST'],['invoice-failure','factura','PHANTOM_INVOICE_TEST']]) {
    scenario(fixture);command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
    check(`inspector identifica etapa ${stage}`,()=>{assert.equal(command.status,1);assert.equal(command.stdout,'');assert.match(command.stderr,new RegExp(`Etapa: ${stage}\\r?\\nCódigo: ${code}`));assert.doesNotMatch(command.stderr,/fixture-api|fixture-technical-token|00Lab-fixture|do-not-expose/);});
  }
  scenario('unexpected-invoice');command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
  check('inspector limita excepción inesperada a metadatos seguros',()=>{assert.equal(command.status,1);assert.match(command.stderr,/Etapa: factura\r?\nCódigo: UNEXPECTED\r?\nExcepción: TypeError\r?\nArchivo: FixtureTransport.php\r?\nLínea: \d+/);assert.doesNotMatch(command.stderr,/sensitive-value|Mensaje:|fixture-api|token|https?:\/\//i);});
  for(const status of [200,301,302,307,308,400,401,403,404,405,429,500,502,503,0,999]) {
    scenario(`http-status-${status}`);command=spawnSync(php,[path.join(__dirname,'inspect-schema-fixture.php')],{env:{...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'},encoding:'utf8'});
    check(`inspector HTTP ${status}: solo metadatos sin cuerpo sensible`,()=>{
      const code=status===200?'PHANTOM_FORMAT':[401,403].includes(status)?'TOKEN_EXPIRED':'PHANTOM_HTTP';
      const http=status>=100&&status<=599?`HTTP: ${status}\n`:'';
      assert.equal(command.status,1);assert.equal(command.stdout,'');
      assert.equal(command.stderr.replace(/\r\n/g,'\n'),`Etapa: autenticacion\nCódigo: ${code}\n${http}`);
    });
  }
  scenario('normal');command=spawnSync(php,[path.join(__dirname,'curl-diagnostics.php')],{env:{...process.env,MI_USITTEL_TEST:'1'},encoding:'utf8'});
  check('cURL distingue causas TLS sin exponer el error interno',()=>{assert.equal(command.status,0,command.stderr);const diagnostic=JSON.parse(command.stdout);assert.equal(diagnostic.handshake,'PHANTOM_TLS_HANDSHAKE');assert.equal(diagnostic.verify,'PHANTOM_TLS_VERIFY');assert.equal(diagnostic.ca_file,'PHANTOM_CA_FILE');assert.equal(diagnostic.issuer,'PHANTOM_TLS_ISSUER');assert.equal(diagnostic.hostname,'PHANTOM_TLS_HOSTNAME');assert.equal(diagnostic.expired,'PHANTOM_TLS_EXPIRED');assert.equal(diagnostic.missing_ca,'PHANTOM_CA_FILE');assert.doesNotMatch(command.stdout,/do-not-print|certificate problem|target host/i);});
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
  for(const fixture of ['numeric-password','numeric-user','empty-password','wrong-identity','missing-identity','numeric-identity','alternate-identity','empty-customer','object-customer','duplicate-customer','ambiguous-customer']) {
    clearRate();scenario(fixture);const j=jar();r=await login(j);
    check(`login rechaza contrato inseguro: ${fixture}`,()=>{
      assert.equal(r.status,['numeric-password','numeric-user','empty-password'].includes(fixture)?401:503);
      assert.doesNotMatch(r.text,/fixture-|Autogestion|IDAx|Conexiones/);
    });
    assert.equal((await j.call('bootstrap')).data.authenticated,false);
  }
  clearRate();scenario('normal');fs.writeFileSync(config,settings().replace("'customer_id_field'=>'ID'","'customer_id_field'=>null"));
  const pendingTrace=fs.readFileSync(path.join(dir,'trace.txt'),'utf8');const pending=jar();r=await login(pending);
  check('identidad pendiente bloquea login antes de llamar al proveedor',()=>{assert.equal(r.data.error.code,'LAB_IDENTITY_PENDING');assert.equal(fs.readFileSync(path.join(dir,'trace.txt'),'utf8'),pendingTrace);});
  fs.writeFileSync(config,settings());
  clearRate();const disallowed=jar();r=await login(disallowed,'000005');check('IDA 5 no entra al portal aunque esté en configuración histórica',()=>assert.equal(r.status,401));
  clearRate();scenario('timeout');const providerFailure=jar();await providerFailure.call('bootstrap');r=await providerFailure.call('login',{username:'000001',password:' 00Lab-fixture! '});check('fallo del proveedor no consume intentos de credenciales',()=>{assert.equal(r.status,504);const state=JSON.parse(fs.readFileSync(path.join(dir,'attempts.json'),'utf8'));assert.equal(Object.keys(state.buckets).length,0);});scenario('normal');
  const oldCookie=a.cookie;r=await login(a);check('login fixture suspendido y regeneración',()=>{assert.equal(r.status,200);assert.notEqual(a.cookie,oldCookie);});
  r=await a.call('bootstrap');check('sesión persiste al recargar',()=>assert.equal(r.data.authenticated,true));
  r=await a.call('overview');check('whitelist y saldo independiente',()=>{assert.equal(r.data.account.debt,12500.75);assert.equal(r.data.invoices.items[0].amount,20000.25);assert.equal(r.data.customer.serviceStatus,'Suspendido');assert.equal(r.data.nextDue,null);assert.doesNotMatch(r.text,/Autogestion|fixture-technical-token|Hash_Descarga|do-not-expose|fixture-api-secret|Conexiones_Asociadas/);});
  scenario('wrong-identity');r=await a.call('overview');check('identidad incorrecta después de login no devuelve perfil ajeno',()=>{assert.equal(r.status,503);assert.equal(r.data.customer,undefined);});scenario('normal');
  scenario('invalid-invoice-id');r=await a.call('overview');check('identificador de factura booleano no se convierte y no bloquea perfil',()=>{assert.equal(r.status,200);assert.equal(r.data.customer.name,'Cliente de pruebas');assert.ok(r.data.warnings.includes('INVOICES_UNAVAILABLE'));});scenario('normal');
  r=await a.call('overview?IDA=5');check('IDA navegador rechazado',()=>assert.equal(r.status,400));
  r=await a.call('bootstrap?mode=demo');check('modo por URL rechazado',()=>assert.equal(r.status,400));
  scenario('expired-once');r=await a.call('overview');check('token expirado renueva una vez',()=>assert.equal(r.status,200));
  scenario('expired-always');const traceBefore=fs.readFileSync(path.join(dir,'trace.txt'),'utf8').split('\n').length;r=await a.call('overview');check('token inválido persistente no reintenta indefinidamente',()=>{assert.equal(r.status,503);assert.equal(fs.readFileSync(path.join(dir,'trace.txt'),'utf8').split('\n').length-traceBefore,3);});
  scenario('timeout');r=await a.call('overview');check('timeout recuperable sin mocks',()=>{assert.equal(r.status,504);assert.equal(r.data.customer,undefined);});
  scenario('functional');r=await a.call('overview');check('error funcional sin datos sensibles',()=>{assert.equal(r.status,503);assert.doesNotMatch(r.text,/Private upstream/);});
  scenario('http');r=await a.call('overview');check('error HTTP upstream no expone metadatos del inspector en API',()=>{assert.equal(r.status,503);assert.doesNotMatch(r.text,/upstreamHttp|502|Private upstream|HTTP:/);assert.equal(r.data.customer,undefined);});
  scenario('missing');r=await a.call('overview');check('campos ausentes no generan ceros ni ejemplos',()=>{assert.equal(r.data.customer.name,null);assert.equal(r.data.account.debt,null);assert.equal(r.data.invoices.items[0].amount,null);assert.equal(r.data.invoices.items[0].status,'No disponible');});
  scenario('empty');r=await a.call('overview');check('facturas vacías no equivalen a deuda cero',()=>{assert.deepEqual(r.data.invoices.items,[]);assert.equal(r.data.account.debt,12500.75);});
  scenario('balance-error');r=await a.call('overview');check('fallo de saldo no suma facturas',()=>{assert.equal(r.data.account.debt,null);assert.ok(r.data.warnings.includes('BALANCE_UNAVAILABLE'));});
  scenario('lab-debt');r=await a.call('overview');check('regresión laboratorio: Balance positivo 121 es deuda aunque última factura esté pagada',()=>{assert.deepEqual(r.data.account,{balance:121,debt:121,credit:0});assert.equal(r.data.invoices.items[0].status,'Pagada');assert.equal(r.data.invoices.items[0].amount,121);});
  scenario('normal');r=await a.call('overview');check('deuda positiva con factura pendiente no genera discrepancia por signo invertido',()=>{assert.deepEqual(r.data.account,{balance:12500.75,debt:12500.75,credit:0});assert.ok(!r.data.warnings.includes('ACCOUNT_RECONCILIATION'));});
  scenario('credit');r=await a.call('overview');check('saldo negativo a favor y discrepancia controlada',()=>{assert.deepEqual(r.data.account,{balance:-150.5,debt:0,credit:150.5});assert.ok(r.data.warnings.includes('ACCOUNT_RECONCILIATION'));});
  scenario('zero');r=await a.call('overview');check('saldo cero es distinto de no disponible',()=>assert.deepEqual(r.data.account,{balance:0,debt:0,credit:0}));
  scenario('invalid-balance');r=await a.call('overview');check('saldo con formato desconocido no se limpia ni usa Balance_CC',()=>{assert.equal(r.data.account.debt,null);assert.equal(r.data.customer.serviceStatus,'Suspendido');});
  scenario('invalid-invoice');r=await a.call('invoices');check('campos de factura inesperados quedan no disponibles',()=>{
    assert.equal(r.data.items[0].amount,null);assert.equal(r.data.items[0].due,null);assert.equal(r.data.items[0].secondDue,null);
    assert.equal(r.data.items[0].status,'No disponible');assert.equal(r.data.items[0].outstanding,null);assert.equal(r.data.items[0].paidAt,null);
  });
  scenario('duplicate-invoice');r=await a.call('invoices');check('facturas con identificador duplicado se rechazan',()=>assert.equal(r.status,503));
  scenario('invoices-error');r=await a.call('invoices');check('otro 400 no equivale a lista vacía',()=>assert.equal(r.status,503));
  scenario('malformed-invoices');r=await a.call('invoices');check('envoltorio inesperado rechazado',()=>assert.equal(r.status,503));
  scenario('normal');r=await a.call('invoices?offset=20');check('no permite saltar páginas fuera de la secuencia',()=>assert.equal(r.status,409));
  r=await a.call('invoices');check('factura de lectura sin anunciar historial completo',()=>{assert.equal(r.data.nextOffset,null);assert.equal(r.data.historyComplete,false);});
  scenario('normal');r=await a.call('logout',{}, {noCsrf:true});check('CSRF logout',()=>assert.equal(r.status,403));
  const sessionCookie=a.cookie;r=await a.call('logout',{});check('logout servidor',()=>assert.equal(r.status,200));
  const replay=jar();replay.cookie=sessionCookie;check('sesión invalidada no reutilizable',()=>{});assert.equal((await replay.call('overview')).status,401);
  clearRate();scenario('custom-user');const b=jar();r=await login(b,'laboratorio');check('usuario personalizado laboratorio',()=>assert.equal(r.status,200));scenario('normal');
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
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>['Autogestion_Pass']"));r=await mapping.call('overview');check('configuración no expone credenciales como perfil',()=>{assert.equal(r.status,503);assert.doesNotMatch(r.text,/00Lab-fixture/);});
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>['api_user']"));r=await mapping.call('overview');check('mapeos limitados a lista pública explícita',()=>assert.equal(r.status,503));
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>['join'=>[['Nombre'],['Producto_Internet']]]"));r=await mapping.call('overview');check('composición de campos explícitos',()=>assert.equal(r.data.customer.name,'Cliente de pruebas Plan de laboratorio'));
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>null").replace("'balance_path'=>['test_balance']", "'balance_path'=>null"));r=await mapping.call('overview');check('mapeos explícitos de laboratorio y Balance independiente del legado',()=>{assert.equal(r.data.customer.name,'Cliente de pruebas');assert.equal(r.data.account.debt,12500.75);});
  const trace=fs.readFileSync(path.join(dir,'trace.txt'),'utf8');check('solo auth/lecturas IDA 1',()=>{assert.doesNotMatch(trace,/:5|:14|:999|Imputar|Promesa|Actualizar/);});
  check('logs sin secretos',()=>assert.doesNotMatch(stderr,/00Lab-fixture|fixture-api-secret|fixture-technical-token|do-not-expose/));
  fs.writeFileSync(config,settings());clearRate();scenario('normal');
  await require('./invoices.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep});
  console.log(`${count} verificaciones completadas con fixtures; NO valida Phantom real.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.kill());
