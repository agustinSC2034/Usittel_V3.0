module.exports=async({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep})=>{
  fs.writeFileSync(config,settings());
  for(const [name,count] of [['one',1],['two',2],['three',3],['document',2],['document-timeout',2],['document-only-timeout',1],['bad',1],['wrong',1],['missing',2]]) {
    clearRate();scenario('services-'+name);const u=jar();let r=await login(u);
    check('servicios '+name+': autorización, deduplicación y principal',()=>{
      assert.equal(r.status,200);assert.equal(r.data.services.length,count);assert.equal(r.data.selectedServiceId,'1');
      assert.doesNotMatch(r.text,/DNI|CUIT|Autogestion|Hash_Descarga|do-not-expose|IDAx/);
      if(name==='missing') assert.equal(r.data.services[0].address,null);
      if(['document','document-timeout'].includes(name)) assert.equal(r.data.servicesUnavailable,false);
      if(['document-only-timeout','bad','wrong'].includes(name)) assert.equal(r.data.servicesUnavailable,true);
    });
    await u.call('logout',{});
  }
  scenario('services-document');clearRate();const u=jar();await login(u);let r=await u.call('overview');
  check('overview inicial A',()=>{assert.equal(r.data.account.debt,10);assert.equal(r.data.invoices.items[0].id,'100');});
  r=await u.call('select-service',{serviceId:'5'},{noCsrf:true});check('selección exige CSRF',()=>assert.equal(r.status,403));
  r=await u.call('select-service',{serviceId:'7'});check('servicio no autorizado',()=>assert.equal(r.status,403));
  for(const body of [{serviceId:5},{serviceId:'5',IDA:5},{serviceId:'5x'}]) {
    r=await u.call('select-service',body);check('selección formato/campos cerrados',()=>assert.equal(r.status,400));
  }
  const oldRevision=u.serviceRevision;
  r=await u.call('select-service',{serviceId:'5'});check('selección válida sin nuevo login',()=>{assert.equal(r.data.selectedServiceId,'5');assert.equal(r.data.payment_history_enabled,false);});
  r=await u.call('overview',undefined,{headers:{'X-Service-Revision':oldRevision}});check('pestaña con revisión anterior rechazada',()=>assert.equal(r.status,409));
  r=await u.call('invoice-document?id=100');check('descarga A rechazada con B seleccionado',()=>assert.equal(r.status,404));
  r=await u.call('invoice?id=100');check('detalle A rechazado con B seleccionado',()=>assert.equal(r.status,404));
  r=await u.call('overview');check('overview B: perfil saldo y facturas propios',()=>{assert.equal(r.data.customer.address,'Calle fixture 5');assert.equal(r.data.account.debt,50);assert.equal(r.data.invoices.items[0].id,'500');});
  r=await u.call('invoices');check('listado del servicio B',()=>assert.equal(r.data.items[0].id,'500'));
  r=await u.call('invoice-document?id=500');check('descarga de B autorizada',()=>{assert.equal(r.status,200);assert.match(r.text,/^%PDF/);});
  r=await u.call('overview?IDA=1');check('IDA de navegador no autoriza consulta',()=>assert.equal(r.status,400));
  r=await u.call('payment-create',{idt:'500'});check('SIRO multicontrato deshabilitado',()=>assert.equal(r.status,409));
  r=await u.call('payment-history');check('historial del contrato autenticado no se cruza con el asociado',()=>assert.equal(r.status,409));
  r=await u.call('bootstrap');check('recarga conserva selección B y lista',()=>{assert.equal(r.data.selectedServiceId,'5');assert.equal(r.data.services.length,2);});
  await u.call('logout',{});r=await u.call('bootstrap');check('logout borra lista y selección',()=>{assert.deepEqual(r.data.services,[]);assert.equal(r.data.selectedServiceId,null);assert.equal(r.data.authenticated,false);});
  r=await u.call('invoice-document?id=500');check('logout revoca descarga',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,settings('phantom',1));clearRate();await login(u);await sleep(1100);r=await u.call('overview');check('sesión multi vencida',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,settings());scenario('services-one');clearRate();
  const any=jar();
  r=await login(any,'000006','wrong');check('todos los contratos sigue exigiendo contraseña exacta',()=>assert.equal(r.status,401));
  r=await any.call('bootstrap');check('credenciales erróneas no crean autorización',()=>assert.equal(r.data.authenticated,false));
  r=await login(any,'6');check('ID candidato no sustituye al usuario exacto de autogestión',()=>assert.equal(r.status,401));
  r=await login(any,'000006');check('login global de contrato válido',()=>{assert.equal(r.status,200);assert.equal(r.data.selectedServiceId,'6');assert.deepEqual(r.data.services.map(s=>s.id),['6']);assert.equal(r.data.payments_enabled,false);});
  r=await any.call('overview');check('portal global entrega únicamente datos del contrato autenticado',()=>{assert.equal(r.status,200);assert.equal(r.data.account.debt,60);assert.equal(r.data.invoices.items[0].id,'600');});
  r=await any.call('select-service',{serviceId:'1'});check('portal global no autoriza seleccionar otro contrato',()=>assert.equal(r.status,403));
  r=await any.call('invoice-document?id=100');check('portal global no autoriza PDF de otro contrato',()=>assert.equal(r.status,404));
  for(const route of ['payment-create','payment-post','payment-reconcile']) {
    r=await any.call(route,{idt:'600'});check('portal global mantiene pagos de laboratorio restringidos: '+route,()=>assert.equal(r.status,409));
  }
  fs.writeFileSync(config,settings().replace("'lab_users'=>", "'login_users'=>['confirmado'=>7],'lab_users'=>"));r=await any.call('overview');check('cambiar aliases de login invalida la sesión previa',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,settings());clearRate();r=await login(any,'000006');check('portal restaurado mantiene acceso global con credenciales exactas',()=>assert.equal(r.status,200));
  scenario('normal');
};
