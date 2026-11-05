const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../../botmaker/mi-usittel-web-profile.js'),'utf8');
async function run({subject='mi-usittel:5',platform='central',rows=[{ID:'5',Nombre:'Ana',Telefono:'249 400-0001'}],fail=false,constants=true}={}) {
  const values={nombre_form:'Otra persona',telefono_form:'999999999',userIdOnBusiness:subject};let done=0;const calls=[];
  await vm.runInNewContext(code,{URL,context:{userData:{CHAT_PLATFORM_ID:platform,constants:JSON.stringify(constants?{MI_WEB_PHANTOM_URL:'https://fixture.invalid/PHANTOM/Includes/API_Rest.php',MI_WEB_PHANTOM_USER:'fixture-api',MI_WEB_PHANTOM_PASS:'fixture-secret'}:{})}},
    user:{get:k=>values[k],set:(k,v)=>{values[k]=v;}},result:{done:()=>done++},rp:async options=>{calls.push(options);if(fail)throw new Error('private upstream');return options.method==='GET'?{token:'fixture-technical-token'}:rows;}});
  assert.equal(done,1);assert.ok(!calls.some(o=>o.followRedirect!==false||o.strictSSL!==true||o.timeout!==10000));
  return {values,calls};
}
(async()=>{
  let r=await run();assert.equal(r.values.nombre_form,'Ana');assert.equal(r.values.telefono_form,'2494000001');assert.equal(r.calls[1].qs.IDA,'5');
  for(const subject of ['',null,'visitor-5','mi-usittel:0','mi-usittel:5&IDA=9','mi-usittel:99999999999']) {r=await run({subject});assert.equal(r.calls.length,0);assert.equal(r.values.nombre_form,'');assert.equal(r.values.telefono_form,'');}
  for(const rows of [[],[{ID:'6',Nombre:'Otro',Telefono:'9999999'}],[{ID:5}],[{ID:'5'},{ID:'6'}],{ID:'5'},[{IDAx:'5'}]]) {r=await run({rows});assert.equal(r.values.nombre_form,'');assert.equal(r.values.telefono_form,'');}
  r=await run({rows:[{ID:'0005',Razon_Social:'Perfil Phantom',Nombre:'Otro',Movil:'+54 (249) 400-0001'}]});assert.equal(r.values.nombre_form,'Perfil Phantom');assert.equal(r.values.telefono_form,'542494000001');
  r=await run({rows:[{ID:'5',Nombre:'Ana',Telefono:'sin teléfono'}]});assert.equal(r.values.nombre_form,'Ana');assert.equal(r.values.telefono_form,'');
  r=await run({fail:true});assert.equal(r.values.nombre_form,'');assert.equal(r.values.telefono_form,'');
  r=await run({constants:false});assert.equal(r.calls.length,0);
  r=await run({platform:'whatsapp'});assert.equal(r.calls.length,0);assert.equal(r.values.nombre_form,'Otra persona');assert.equal(r.values.telefono_form,'999999999');
  console.log('Mi Web profile action: exact owner, partial fields, stale variables, provider failure and WhatsApp guard passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
