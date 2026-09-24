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
function jar(endpoint=route => base+route) {
  return {cookie:'',csrf:'',serviceRevision:'', async call(route,body,opts={}) {
    const headers={Cookie:this.cookie,...(this.serviceRevision?{'X-Service-Revision':this.serviceRevision}:{}),...opts.headers};
    if(body!==undefined) {headers['Content-Type']='application/json';if(!opts.noCsrf) headers['X-CSRF-Token']=this.csrf;}
    const response=await fetch(endpoint(route),{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
    const set=response.headers.get('set-cookie'); if(set) this.cookie=set.split(';')[0];
    const text=await response.text(); let data;try{data=JSON.parse(text);}catch{data=text;}
    if(data.csrf) this.csrf=data.csrf;
    if(Object.hasOwn(data,'serviceRevision')) this.serviceRevision=data.serviceRevision || '';
    return {status:response.status,data,text,headers:response.headers};
  }};
}
const scenario = value => fs.writeFileSync(path.join(dir,'scenario'),value);
const clearRate = () => {const f=path.join(dir,'attempts.json');if(fs.existsSync(f)) fs.unlinkSync(f);};
async function login(j,user='000001',password=' 00Lab-fixture! ') {await j.call('bootstrap');return j.call('login',{username:user,password});}
(async()=>{
  await require('./speed-test.cjs')({check,assert,fs,path,root});
  const fixtureEnv={...process.env,MI_USITTEL_CONFIG:config,MI_USITTEL_RUNTIME:dir,MI_USITTEL_TEST:'1'};
  const operations=spawnSync(php,[path.join(__dirname,'service-operations.php')],{env:fixtureEnv,encoding:'utf8'});
  check('solicitudes, aislamiento, SOAP de lectura y catálogo conservador',()=>{assert.equal(operations.status,0,operations.stdout+operations.stderr);assert.match(operations.stdout,/^[0-9]+$/);});count+=Number(operations.stdout)-1;
  const requestDir=path.join(dir,'request-concurrent');fs.mkdirSync(requestDir);
  const requestWorker=id=>new Promise((resolve,reject)=>{let out='',err='';const child=spawn(php,[path.join(__dirname,'request-concurrent.php'),id],{env:{...fixtureEnv,MI_USITTEL_RUNTIME:requestDir}});child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error(err)));});
  const requestWorkers=await Promise.all([requestWorker('a'.repeat(32)),requestWorker('b'.repeat(32))]);
  check('dos procesos y nonces distintos reservan un único ticket',()=>{assert.equal(requestWorkers[0],requestWorkers[1]);assert.equal(fs.readFileSync(path.join(requestDir,'writes'),'utf8'),'1');});
  for(const [name,expected] of Object.entries({plain:'TICKET_OK',quoted:'PHANTOM_FORMAT',zero:'PHANTOM_FORMAT',html:'PHANTOM_FORMAT',error:'TICKETS_RESPONSE',array:'TICKETS_RESPONSE',large:'PHANTOM_RESPONSE_TOO_LARGE',timeout:'PHANTOM_TIMEOUT',redirect:'PHANTOM_HTTP',expired:'TOKEN_EXPIRED',http:'PHANTOM_HTTP'})) {
    const result=spawnSync(php,[path.join(__dirname,'ticket-http.php'),name],{env:fixtureEnv,encoding:'utf8'});
    check('ticket HTTP aislado '+name+': TLS y una sola escritura',()=>{assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,expected);});
  }
  const verification=spawnSync(php,[path.join(__dirname,'posting-verification.php')],{env:fixtureEnv,encoding:'utf8'});
  check('diagnóstico de registro sin datos privados ni escritura',()=>{assert.equal(verification.status,0,verification.stderr);assert.equal(verification.stdout,'7');});
  count+=6;
  for(const [name,expected] of Object.entries({ok:'SIRO_HTTP_OK',timeout:'SIRO_TIMEOUT',session:'SIRO_SESSION',redirect:'SIRO_HTTP',malformed:'SIRO_FORMAT'})) {
    const result=spawnSync(php,[path.join(__dirname,'siro-http.php'),name],{env:fixtureEnv,encoding:'utf8'});
    check('transporte SIRO aislado '+name,()=>{assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,expected);});
  }
  for(const [name,expected] of Object.entries({ok:'CRM_HTTP_OK',settled:'CRM_HTTP_OK','near-settled':'PHANTOM_CRM_FORMAT',expired:'CRM_HTTP_OK',timeout:'PHANTOM_TIMEOUT',malformed:'PHANTOM_CRM_FORMAT',empty:'PHANTOM_CRM_FORMAT',null:'PHANTOM_CRM_FORMAT',text:'PHANTOM_CRM_FORMAT',string:'PHANTOM_CRM_FORMAT'})) {
    const crmDir=path.join(dir,'crm-'+name);fs.mkdirSync(crmDir);
    const result=spawnSync(php,[path.join(__dirname,'crm-http.php'),name],{env:{...fixtureEnv,MI_USITTEL_RUNTIME:crmDir},encoding:'utf8'});
    check('transporte CRM aislado '+name,()=>{assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,expected);});
  }
  const featureTests=spawnSync(php,[path.join(__dirname,'service-features.php')],{env:fixtureEnv,encoding:'utf8'});
  check('productos públicos y configuración de medición segura',()=>{assert.equal(featureTests.status,0,featureTests.stderr);assert.match(featureTests.stdout,/^[0-9]+$/);});count+=Number(featureTests.stdout)-1;
  const serviceTests=spawnSync(php,[path.join(__dirname,'services-unit.php')],{env:fixtureEnv,encoding:'utf8'});
  check('reglas de asociación y recuperación de selección',()=>{assert.equal(serviceTests.status,0,serviceTests.stderr);assert.match(serviceTests.stdout,/^[0-9]+$/);});
  count+=Number(serviceTests.stdout)-1;
  const paymentTests=spawnSync(php,[path.join(__dirname,'payments.php'),dir],{env:fixtureEnv,encoding:'utf8'});
  check('servicio SIRO con fixtures: identidad, intentos, importes y recuperación',()=>{assert.equal(paymentTests.status,0,paymentTests.stdout+paymentTests.stderr);assert.match(paymentTests.stdout,/PAYMENT_CHECKS=/);});
  count+=Number(paymentTests.stdout.match(/PAYMENT_CHECKS=(\d+)/)[1])-1;
  console.log(paymentTests.stdout.trim());
  const paymentHistoryTests=spawnSync(php,[path.join(__dirname,'payment-history.php')],{env:fixtureEnv,encoding:'utf8'});
  check('historial y comprobantes de pago con fixtures seguros',()=>{assert.equal(paymentHistoryTests.status,0,paymentHistoryTests.stdout+paymentHistoryTests.stderr);assert.match(paymentHistoryTests.stdout,/PAYMENT_HISTORY_CHECKS=/);});
  count+=Number(paymentHistoryTests.stdout.match(/PAYMENT_HISTORY_CHECKS=(\d+)/)[1])-1;
  const concurrentDir=path.join(dir,'concurrent-payments');fs.mkdirSync(concurrentDir);
  const worker=()=>new Promise((resolve,reject)=>{let out='',err='';const child=spawn(php,[path.join(__dirname,'payments.php'),concurrentDir,'worker'],{env:fixtureEnv});child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',reject);child.on('exit',code=>code===0?resolve(out):reject(new Error(err)));});
  const workers=await Promise.all([worker(),worker()]);
  check('dos procesos comparten reserva y un solo POST SIRO',()=>{assert.equal(workers[0],workers[1]);assert.equal(fs.readFileSync(path.join(concurrentDir,'calls'),'utf8'),'1');});
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
  for(const [name,expected] of Object.entries({pdf:null,'no-length':null,truncated:'DOCUMENT_FORMAT',html:'DOCUMENT_MIME',mime:'DOCUMENT_MIME',empty:'DOCUMENT_MIME',redirect:'DOCUMENT_HTTP',external:'DOCUMENT_HTTP','http-error':'DOCUMENT_HTTP',size:'DOCUMENT_SIZE','header-size':'DOCUMENT_SIZE',timeout:'PHANTOM_TIMEOUT',runtime:'PHANTOM_CURL_RUNTIME'})) {
    const result=spawnSync(php,[path.join(__dirname,'document-probe.php'),name,'source'],{env:{...fixtureEnv,MI_USITTEL_CONFIG:documentConfig},encoding:'utf8'});
    check('fuente PDF real con transporte simulado: '+name,()=>{
      assert.equal(result.status,expected?1:0,result.stdout+result.stderr);
      assert.doesNotMatch(result.stdout+result.stderr,/private-|fixture-|https?:|IDT=|Hash_Descarga|<html/);
      if(expected) assert.ok(result.stderr.includes(expected),result.stderr); else assert.equal(result.stdout,'VALIDATED_PDF');
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
  const portalConfig=path.join(dir,'portal-login.php');fs.writeFileSync(portalConfig,settings().replace("'lab_users'=>", "'login_users'=>['confirmado'=>4242],'lab_users'=>"));
  command=spawnSync(process.execPath,[path.join(root,'check.cjs')],{env:{...process.env,MI_USITTEL_PHP:php,MI_USITTEL_CONFIG:portalConfig,MI_USITTEL_RUNTIME:dir},encoding:'utf8'});
  check('chequeo confirma portal global sin exponer IDs',()=>{assert.equal(command.status,0,command.stdout+command.stderr);assert.match(command.stdout,/Contratos numéricos habilitados/);assert.doesNotMatch(command.stdout,/4242/);});
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
  check('cookie HttpOnly / SameSite, scope prefijado y modo servidor',()=>{assert.match(r.headers.get('set-cookie'),/HttpOnly/i);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/i);assert.match(r.headers.get('set-cookie'),/Path=\/autogestion\//i);assert.equal(r.data.mode,'phantom');});
  const origin=base.replace('/autogestion/api/','');
  const physicalEndpoint=route=>{const [name,query]=route.split('?',2);const params=new URLSearchParams(query||'');params.set('route',name);return origin+'/api.php?'+params.toString();};
  const direct=jar(physicalEndpoint);
  const rootBootstrap=await fetch(origin+'/api/bootstrap');
  check('subdominio raíz entrega API con cookie limitada a su raíz',()=>{assert.equal(rootBootstrap.status,200);assert.match(rootBootstrap.headers.get('set-cookie'),/Path=\/(?:;|$)/i);});
  const rootPage=await fetch(origin+'/');const rootHtml=await rootPage.text();
  check('subdominio raíz entrega la aplicación',()=>{assert.equal(rootPage.status,200);assert.match(rootPage.headers.get('content-type'),/^text\/html/);assert.match(rootHtml,/<title>Mi USITTEL/);});
  const prefixedPage=await fetch(origin+'/autogestion/');const prefixedHtml=await prefixedPage.text();
  check('ruta prefijada local continúa disponible',()=>{assert.equal(prefixedPage.status,200);assert.match(prefixedHtml,/<title>Mi USITTEL/);});
  r=await direct.call('bootstrap');check('entrypoint físico bootstrap',()=>assert.equal(r.status,200));
  r=await direct.call('login',{username:'000001',password:' 00Lab-fixture! '},{noCsrf:true});check('entrypoint físico POST login exige CSRF',()=>assert.equal(r.status,403));
  r=await direct.call('login',{username:'000001',password:' 00Lab-fixture! '});check('entrypoint físico POST login',()=>assert.equal(r.status,200));
  r=await direct.call('invoices?offset=0');check('entrypoint físico GET con query',()=>assert.equal(r.status,200));
  r=await direct.call('payment-receipt?id=00053321');check('entrypoint físico PDF',()=>{assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^application\/pdf/);assert.match(r.text,/^%PDF-1\.7/);});
  const returnAttempt='a'.repeat(32);
  r=await fetch(physicalEndpoint('payment-return?result=ok&attempt='+returnAttempt+'&IdResultado=forged'),{redirect:'manual'});check('entrypoint físico payment return descarta query externa',()=>{assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/#/facturas?attempt='+returnAttempt);});
  r=await fetch(physicalEndpoint('route-does-not-exist'));check('route inexistente conserva 404',()=>assert.equal(r.status,404));
  r=await fetch(physicalEndpoint('bootstrap/../login'));check('route manipulada se rechaza antes de Api',()=>assert.equal(r.status,400));
  r=await direct.call('logout',{});check('entrypoint físico logout y cookie raíz',()=>{assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Path=\/(?:;|$)/i);});
  check('API sin sesión',()=>{});assert.equal((await a.call('overview')).status,401);
  r=await a.call('login',{username:'000001',password:' 00Lab-fixture! '},{noCsrf:true});check('CSRF login',()=>assert.equal(r.status,403));
  r=await a.call('login',{username:'000001',password:' 00Lab-fixture! '},{headers:{Origin:'https://evil.invalid'}});check('origen cruzado rechazado',()=>assert.equal(r.status,403));
  r=await a.call('login',{username:'000001',password:'00Lab-fixture!'});check('no recorta contraseña',()=>assert.equal(r.status,401));
  r=await a.call('login',{username:'1',password:' 00Lab-fixture! '});check('IDA candidato no autoriza usuario distinto',()=>assert.equal(r.status,401));
  scenario('production-user');clearRate();const productionUser=jar();r=await login(productionUser,'004242');check('login de contrato productivo fuera del laboratorio',()=>{assert.equal(r.status,200);assert.equal(r.data.selectedServiceId,'4242');assert.deepEqual(r.data.services.map(s=>s.id),['4242']);});
  r=await productionUser.call('overview?IDA=1');check('contrato productivo no acepta IDA del navegador',()=>assert.equal(r.status,400));await productionUser.call('logout',{});scenario('normal');
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
  clearRate();scenario('timeout');const providerFailure=jar();await providerFailure.call('bootstrap');r=await providerFailure.call('login',{username:'000001',password:' 00Lab-fixture! '});check('fallo del proveedor no consume intentos de credenciales',()=>{assert.equal(r.status,504);const state=JSON.parse(fs.readFileSync(path.join(dir,'attempts.json'),'utf8'));assert.equal(Object.keys(state.buckets).length,0);});scenario('normal');
  const oldCookie=a.cookie;r=await login(a);check('login fixture suspendido y regeneración',()=>{assert.equal(r.status,200);assert.notEqual(a.cookie,oldCookie);});
  r=await a.call('bootstrap');check('sesión persiste al recargar',()=>assert.equal(r.data.authenticated,true));
  r=await a.call('overview');check('whitelist, conectividad pública, catálogo desconocido y saldo independiente',()=>{assert.equal(r.status,200,r.text);assert.equal(r.data.account.debt,12500.75);assert.equal(r.data.invoices.items[0].amount,20000.25);assert.equal(r.data.customer.serviceStatus,'Suspendido');assert.equal(r.data.customer.connectionState,'online');assert.equal(r.data.customer.equipmentState,'offline');assert.equal(r.data.nextDue,null);assert.deepEqual(r.data.servicePresentation,{known:false,items:[]});assert.deepEqual(r.data.commercialOffers,[]);assert.doesNotMatch(r.text,/Autogestion|fixture-technical-token|Hash_Descarga|do-not-expose|fixture-api-secret|Conexiones_Asociadas|MAC_GPONSN|WanMac|Usuario_PPPoE|OLT_IP|ID_Caja_NAP/);});
  r=await a.call('payment-history');check('movimientos reales públicos omiten cookie y capability',()=>{assert.equal(r.status,200);assert.equal(r.data.items.length,2);assert.equal(r.data.items[1].method,'Efectivo');assert.doesNotMatch(r.text,/opaque-session|MDEyMzQ1Njc4OWFiY2RlZg/);});
  r=await a.call('payment-receipt?id=00053321');check('comprobante de pago PDF ligado al movimiento exacto',()=>{assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^application\/pdf/);assert.match(r.text,/^%PDF-1\.7/);});
  r=await a.call('payment-receipt?id=00052001');check('capability de otro movimiento no se sustituye',()=>assert.equal(r.status,404));
  r=await a.call('payment-receipt?IDT=private');check('navegador no puede enviar capability de comprobante',()=>assert.equal(r.status,400));
  scenario('unknown-connectivity');r=await a.call('overview');check('estados técnicos desconocidos no se interpretan ni se exponen',()=>{assert.equal(r.data.customer.connectionState,null);assert.equal(r.data.customer.equipmentState,null);assert.doesNotMatch(r.text,/SYNCING|unexpected/);});scenario('normal');
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
  const presentationSource=fs.readFileSync(path.join(root,'js','data.js'),'utf8');
  const presentation=await import('data:text/javascript;base64,'+Buffer.from(presentationSource).toString('base64'));
  check('planes ocultan segmentos internos Phantom sin alterar el valor original',()=>{
    const cases=[
      ['RES ($) - Internet Residencial 300 Mbps','Internet Residencial 300 Mbps'],
      ['EMP ($) - Internet Empresa 200 Mbps Simétricos','Internet Empresa 200 Mbps Simétricos'],
      ['COM($)-Internet Comercial 500 Mbps','Internet Comercial 500 Mbps'],
      ['MUNI ( $ ) - Internet Municipalidad 100 Mbps','Internet Municipalidad 100 Mbps'],
      ['1/3/25 - MUNI ($) - Internet Municipalidad 100 Mbps','Internet Municipalidad 100 Mbps'],
      ['Internet Empresa 200 Mbps Simétricos','Internet Empresa 200 Mbps Simétricos'],
    ];
    for(const [raw,visible] of cases) assert.equal(presentation.planLabel(raw),visible);
    assert.equal(cases[1][0],'EMP ($) - Internet Empresa 200 Mbps Simétricos');
  });
  check('conectividad traduce solo estados canónicos confirmados',()=>{
    assert.equal(presentation.connectivityLabel('online'),'En línea');
    assert.equal(presentation.connectivityLabel('offline'),'Sin conexión');
    assert.equal(presentation.connectivityLabel('SYNCING'),'No disponible');
    assert.equal(presentation.connectivityLabel(null),'No disponible');
  });
  check('Mi servicio usa solo datos públicos y separa consulta y medición',()=>{
    const views=fs.readFileSync(path.join(root,'js','service-view.js'),'utf8');
    const apiSource=fs.readFileSync(path.join(root,'server','Api.php'),'utf8');
    assert.doesNotMatch(views,/customer\.equipmentState|Dirección IP|MAC|GPON|PPPoE|OLT|NAP|Uptime|Estado_ONU|Estado_Conexion|speed\.cloudflare/);
    assert.doesNotMatch(views,/Domicilio de instalación|Velocidad del plan/);
    assert.match(views,/runtime\.commercialOffers/);assert.match(views,/formatOfferPrice/);assert.match(views,/data-action="chat"/);assert.match(views,/data-chat-topic/);
    assert.doesNotMatch(views,/selectedServiceId|selected_ida|DNI|CUIT|saldo|factura|fetch\(|api\(/i);
    assert.doesNotMatch(apiSource,/PhantomSoap|upgradeCatalog|modificar_abonado|Act\. Perfiles/);
  });
  check('Facturas separa comprobantes y movimientos con pestañas accesibles',()=>{
    const views=fs.readFileSync(path.join(root,'js','views.js'),'utf8');
    const payments=fs.readFileSync(path.join(root,'js','payment-view.js'),'utf8');
    const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
    assert.match(views,/role="tablist"[\s\S]*role="tab"[\s\S]*Facturas[\s\S]*Movimientos/);
    assert.match(views,/role="tabpanel"/);
    assert.match(app,/returnAttempt[\s\S]*billingView = 'movements'/);
    assert.match(payments,/\['CONFIRMED', 'CANCELLED', 'REJECTED'\]/);
    const components=fs.readFileSync(path.join(root,'js','components.js'),'utf8');
    assert.match(components,/Pago confirmado[\s\S]*saldo puede tardar en actualizarse/);
    assert.match(views,/saldo puede tardar en reflejar pagos recientes/);
    assert.match(views,/portal de SIRO, nuestro proveedor de pagos/);
    assert.match(views,/billing-heading[\s\S]*billing-refresh/);
    assert.doesNotMatch(payments,/headingAction|Consultar actualización/);
    assert.match(payments,/ALREADY_SETTLED[\s\S]*Tu cuenta ya estaba actualizada/);
    assert.match(payments,/MOVEMENTS_PER_PAGE = 10[\s\S]*movement-pagination[\s\S]*Página \$\{page\+1\} de \$\{pages\}/);
    assert.match(app,/action === 'movement-page'[\s\S]*runtime\.movementPage = page/);
    assert.doesNotMatch(payments,/respuesta|token|Phantom|SIRO confirmó|imputación/);
    assert.doesNotMatch(views,/Historial en validación de laboratorio|Seguimiento de pagos realizados en SIRO/);
    assert.doesNotMatch(app,/Desarrollo local · Laboratorio|Laboratorio de pagos\. Las demás modificaciones/);
  });
  check('inspector CRM es sólo autenticación y no contiene acciones de escritura',()=>{
    const inspector=fs.readFileSync(path.join(root,'server','inspect-phantom-crm.php'),'utf8');
    assert.match(inspector,/PhantomCrmHttp[\s\S]*authenticate\(true\)/);assert.doesNotMatch(inspector,/Imputar_Pago|postToPhantom/);
    const writer=fs.readFileSync(path.join(root,'server','PhantomPayments.php'),'utf8');
    assert.match(writer,/Imputar_Pago/);assert.match(writer,/Consultar_Impagos/);assert.doesNotMatch(writer,/permitir_importe_menor/);
    assert.match(writer,/crm-token-/);
    const phantom=fs.readFileSync(path.join(root,'server','Phantom.php'),'utf8');
    assert.match(phantom,/imputePayment[\s\S]*?\$this->crm->impute/);
    assert.doesNotMatch(phantom,/imputePayment[\s\S]{0,700}?\$this->token/);
    const preflight=fs.readFileSync(path.join(root,'server','inspect-payment-posting-preflight.php'),'utf8');
    assert.match(preflight,/postingPreflight/);assert.doesNotMatch(preflight,/imputePayment|Imputar_Pago|payment-post/);
  });
  clearRate();const mapping=jar();await login(mapping);
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>['Autogestion_Pass']"));r=await mapping.call('overview');check('configuración no expone credenciales como perfil',()=>{assert.equal(r.status,503);assert.doesNotMatch(r.text,/00Lab-fixture/);});
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>['api_user']"));r=await mapping.call('overview');check('mapeos limitados a lista pública explícita',()=>assert.equal(r.status,503));
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>['join'=>[['Nombre'],['Producto_Internet']]]"));r=await mapping.call('overview');check('composición de campos explícitos',()=>assert.equal(r.data.customer.name,'Cliente de pruebas Plan de laboratorio'));
  fs.writeFileSync(config,settings().replace("'name'=>['Nombre']", "'name'=>null").replace("'balance_path'=>['test_balance']", "'balance_path'=>null"));r=await mapping.call('overview');check('mapeos explícitos de laboratorio y Balance independiente del legado',()=>{assert.equal(r.data.customer.name,'Cliente de pruebas');assert.equal(r.data.account.debt,12500.75);});
  const trace=fs.readFileSync(path.join(dir,'trace.txt'),'utf8');check('login global sólo lee candidatos autorizados por sesión',()=>{assert.match(trace,/Consulta_Cliente_Avanzada:4242/);assert.doesNotMatch(trace,/:999|Imputar|Promesa|Actualizar/);});
  check('logs sin secretos',()=>assert.doesNotMatch(stderr,/00Lab-fixture|fixture-api-secret|fixture-technical-token|do-not-expose/));
  fs.writeFileSync(config,settings());clearRate();scenario('normal');
  await require('./invoices.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep});
  await require('./payment-api.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep,base});
  await require('./service-features-api.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings});
  await require('./services-api.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep});
  await require('./wifi-api.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings});
  await require('./requests-api.cjs')({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings});
  console.log(`${count} verificaciones completadas con fixtures; NO valida Phantom real.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server?.kill());
