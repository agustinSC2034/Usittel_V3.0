module.exports=async({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings})=>{
  const enabled=()=>settings().replace("'mode'=>'phantom'","'wifi'=>['enabled'=>true,'models'=>['Fixture-ONU'],'dual_band_models'=>['Fixture-ONU']],'mode'=>'phantom'");
  const marker=path.join(dir,'wifi-change-1.json');
  const reset=()=>{for(const ida of [1,5,4242]){const file=path.join(dir,`wifi-change-${ida}.json`);if(fs.existsSync(file))fs.unlinkSync(file);}clearRate();scenario('normal');};
  const writes=()=> (fs.readFileSync(path.join(dir,'trace.txt'),'utf8').match(/Configurar_Wifi:/g)||[]).length;
  const payload=id=>({requestId:id,ssid:'Casa_test',ssid5:'Casa_test_5G',password:'TestWifi#123',accountPassword:' 00Lab-fixture! ',confirmed:true});
  reset();fs.writeFileSync(config,settings());const disabled=jar();await login(disabled);
  let r=await disabled.call('wifi-prepare',{});check('Wi-Fi deshabilitado por defecto',()=>assert.equal(r.status,409));
  fs.writeFileSync(config,enabled());const u=jar();await login(u);
  r=await u.call('wifi-prepare',{}, {noCsrf:true});check('preparar Wi-Fi exige CSRF',()=>assert.equal(r.status,403));
  r=await u.call('wifi-prepare',{IDA:5});check('preparación no admite IDA',()=>assert.equal(r.status,400));
  r=await u.call('wifi-prepare',{});const id=r.data.requestId;
  check('preparación devuelve solo nonce sin datos del equipo',()=>{assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data),['requestId','dualBand']);assert.equal(r.data.dualBand,true);assert.match(id,/^[a-f0-9]{32}$/);});
  const before=writes();
  r=await u.call('wifi-change',payload(id),{noCsrf:true});check('cambio Wi-Fi exige CSRF',()=>assert.equal(r.status,403));
  for(const override of [{IDA:5},{Ticket:1},{confirmed:false},{ssid:'red con espacios'},{ssid5:'short'},{password:'bad password'},{requestId:'f'.repeat(32)}]) {
    r=await u.call('wifi-change',{...payload(id),...override});check('Wi-Fi rechaza parámetros o confirmación inválidos',()=>assert.ok([400,409].includes(r.status)));
  }
  r=await u.call('wifi-change',{...payload(id),accountPassword:'wrong'});check('Wi-Fi exige reautenticación exacta',()=>assert.equal(r.data.error.code,'WIFI_AUTH'));
  check('rechazos previos no escriben',()=>assert.equal(writes(),before));
  r=await u.call('wifi-change',payload(id));check('cambio controlado aplicado',()=>assert.deepEqual(r.data,{state:'APPLIED'}));
  r=await u.call('wifi-change',payload(id));check('doble envío ejecuta una sola escritura',()=>{assert.deepEqual(r.data,{state:'APPLIED'});assert.equal(writes(),before+1);});
  r=await u.call('wifi-change',{...payload(id),ssid:'Different'});check('nonce no puede reutilizarse para otra clave o red',()=>assert.equal(r.data.error.code,'WIFI_EXPIRED'));
  check('archivo y respuesta sin contraseña ni SSID',()=>assert.doesNotMatch(fs.readFileSync(marker,'utf8'),/TestWifi|Casa_test|00Lab|SSID|Password/));
  const u2=jar();await login(u2);r=await u2.call('wifi-prepare',{});r=await u2.call('wifi-change',payload(r.data.requestId));
  check('límite de cambios compartido entre sesiones',()=>assert.equal(r.data.error.code,'WIFI_RATE_LIMIT'));
  for(const name of ['wifi-timeout','wifi-expired','wifi-ticket','wifi-malformed']) {
    reset();const x=jar();await login(x);let prepared=await x.call('wifi-prepare',{});scenario(name);const count=writes();
    r=await x.call('wifi-change',payload(prepared.data.requestId));
    check(name+' nunca confirma ni reintenta',()=>{assert.deepEqual(r.data,{state:'UNKNOWN'});assert.equal(writes(),count+1);});
    r=await x.call('wifi-change',payload(prepared.data.requestId));check(name+' repetido no vuelve a escribir',()=>assert.equal(writes(),count+1));
    scenario('normal');const y=jar();await login(y);prepared=await y.call('wifi-prepare',{});r=await y.call('wifi-change',payload(prepared.data.requestId));
    check(name+' bloquea otro intento hasta revisión',()=>assert.equal(r.data.error.code,'WIFI_REVIEW'));
  }
  reset();scenario('wifi-unknown-model');const unknown=jar();await login(unknown);r=await unknown.call('wifi-prepare',{});
  check('modelo no validado bloqueado',()=>assert.equal(r.data.error.code,'WIFI_UNAVAILABLE'));
  reset();scenario('services-two');const multi=jar();await login(multi);r=await multi.call('wifi-prepare',{});const old=r.data.requestId;
  await multi.call('select-service',{serviceId:'5'});r=await multi.call('wifi-change',payload(old));check('cambio de contrato invalida la preparación',()=>assert.equal(r.status,409));
  r=await multi.call('wifi-prepare',{});check('modelo permitido habilita Wi-Fi sin lab_ida en otro contrato propio',()=>{assert.equal(r.status,200);assert.equal(r.data.dualBand,true);});
  await multi.call('select-service',{serviceId:'1'});r=await multi.call('wifi-change',payload(old));check('volver al contrato original no recupera el nonce descartado',()=>assert.equal(r.status,409));
  await multi.call('logout',{});await multi.call('bootstrap');r=await multi.call('wifi-change',payload(old));check('logout impide cambio Wi-Fi',()=>assert.equal(r.status,401));
  reset();fs.writeFileSync(config,enabled().replace("'dual_band_models'=>['Fixture-ONU']","'dual_band_models'=>[]"));
  const single=jar();await login(single);r=await single.call('wifi-prepare',{});const singleId=r.data.requestId;
  check('modelo sin doble banda no ofrece red 5 GHz',()=>assert.equal(r.data.dualBand,false));
  r=await single.call('wifi-change',payload(singleId));check('no admite inyectar SSID 5 GHz',()=>assert.equal(r.status,400));
  r=await single.call('wifi-change',{...payload(singleId),ssid5:''});check('cambio de una sola banda omite SSID_5G',()=>assert.deepEqual(r.data,{state:'APPLIED'}));
  reset();fs.writeFileSync(config,settings());
};
