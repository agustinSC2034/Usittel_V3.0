module.exports=async({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings})=>{
  fs.writeFileSync(config,settings());scenario('normal');clearRate();
  const anon=jar();await anon.call('bootstrap');
  for(const route of ['service-connection','speedtest-start']){
    let r=await anon.call(route,{});check(route+' requiere sesión',()=>assert.equal(r.status,401));
  }
  const u=jar();await login(u);
  for(const route of ['service-connection','speedtest-start']){
    let r=await u.call(route,{}, {noCsrf:true});check(route+' requiere CSRF',()=>assert.equal(r.status,403));
    r=await u.call(route,{IDA:'5'});check(route+' rechaza IDA del navegador',()=>assert.equal(r.status,400));
    r=await u.call(route+'?ida=5',{});check(route+' rechaza query arbitraria',()=>assert.equal(r.status,400));
  }
  let r=await u.call('service-connection',{});
  check('actualiza conexión sin datos internos y pide InfoFTTH',()=>{assert.equal(r.status,200);assert.equal(r.data.connectionState,'online');assert.equal(r.data.modemState,'offline');assert.match(r.data.checkedAt,/(Z|\+00:00)$/);assert.doesNotMatch(r.text,/fixture|token|ONU_|Autogestion/);assert.match(fs.readFileSync(path.join(dir,'trace.txt'),'utf8'),/InfoFTTH:1/);});
  r=await u.call('service-connection',{});check('doble click limitado',()=>assert.equal(r.status,429));
  r=await u.call('speedtest-start',{});check('sin servidor no finge medir',()=>{assert.equal(r.status,409);assert.equal(r.data.error.code,'SPEEDTEST_UNAVAILABLE');});
  fs.writeFileSync(config,settings().replace("'mode'=>'phantom'","'speedtest_server'=>'https://speed.example.com/speedtest/backend/','mode'=>'phantom'"));
  r=await u.call('speedtest-start',{});check('config de speedtest backend sin tráfico externo',()=>{assert.equal(r.status,200);assert.deepEqual(r.data,{server:'https://speed.example.com/speedtest/backend/'});});
  r=await u.call('speedtest-start',{});check('inicio repetido limitado',()=>assert.equal(r.status,429));
  await u.call('logout',{});await u.call('bootstrap');r=await u.call('service-connection',{});check('logout revoca consulta técnica',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,settings());scenario('services-two');clearRate();const multi=jar();await login(multi);const revision=multi.serviceRevision;
  await multi.call('select-service',{serviceId:'5'});
  r=await multi.call('service-connection',{}, {headers:{'X-Service-Revision':revision}});check('consulta vieja de otro servicio rechazada',()=>assert.equal(r.status,409));
  r=await multi.call('service-connection',{});check('lee contrato seleccionado y no el autenticado',()=>{assert.equal(r.status,200);assert.equal(r.data.modemState,null);assert.match(fs.readFileSync(path.join(dir,'trace.txt'),'utf8'),/Consulta_Cliente_Avanzada:5/);});
  await multi.call('logout',{});scenario('unknown-connectivity');clearRate();const unknown=jar();await login(unknown);
  r=await unknown.call('service-connection',{});check('estado desconocido nunca se convierte en offline',()=>{assert.equal(r.status,200);assert.equal(r.data.connectionState,null);assert.equal(r.data.modemState,null);});
  await unknown.call('logout',{});scenario('normal');clearRate();const failure=jar();await login(failure);scenario('timeout');
  r=await failure.call('service-connection',{});check('timeout no inventa estado y mensaje saneado',()=>{assert.equal(r.status,504);assert.equal(r.data.connectionState,undefined);assert.doesNotMatch(r.text,/fixture|token|Password/);});
  scenario('normal');fs.writeFileSync(config,settings());
};
