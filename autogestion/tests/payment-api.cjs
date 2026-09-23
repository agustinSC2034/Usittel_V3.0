module.exports=async({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep,base})=>{
  const physical=route=>{const [name,query]=route.split('?',2);const params=new URLSearchParams(query||'');params.set('route',name);return base.replace(/\/api\/$/,'/api.php')+'?'+params.toString();};
  const configured=(idle=900)=>settings('phantom',idle).replace("'mode'=>'phantom'","'mode'=>'phantom','siro'=>['enabled'=>true,'user'=>'fixture-user','password'=>'fixture-password','return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70020]");
  fs.writeFileSync(config,configured());clearRate();scenario('normal');
  const u=jar();const signedIn=await login(u);await u.call('invoices');
  check('login de servicio único habilita SIRO configurado',()=>assert.equal(signedIn.data.payments_enabled,true));
  check('login mantiene imputación deshabilitada por configuración',()=>assert.equal(signedIn.data.phantom_posting_enabled,false));
  const restored=await u.call('bootstrap');check('bootstrap conserva habilitación SIRO',()=>assert.equal(restored.data.payments_enabled,true));
  for(const b of [{idt:'123',Importe:1},{idt:'123',IDA:5},{idt:'123',URL_OK:'https://evil.invalid'},{idt:123}]) {
    const r=await u.call('payment-create',b);check('pago rechaza campos/control cliente',()=>assert.equal(r.status,400));
  }
  let r=await u.call('payment-create',{idt:'123'},{noCsrf:true});check('pago exige CSRF',()=>assert.equal(r.status,403));
  r=await u.call('payment-create',{idt:'999'});check('pago rechaza factura fuera de sesión',()=>assert.equal(r.status,404));
  scenario('lab-debt');r=await u.call('payment-create',{idt:'123'});check('pago rechaza PAGADA',()=>assert.equal(r.status,409));
  scenario('foreign-invoice');r=await u.call('payment-create',{idt:'123'});check('pago rechaza factura ajena reconsultada',()=>assert.equal(r.status,503));
  scenario('invalid-invoice');r=await u.call('payment-create',{idt:'123'});check('pago rechaza estado/importes no confirmados',()=>assert.equal(r.status,409));
  scenario('normal');const [a,b]=await Promise.all([u.call('payment-create',{idt:'123'}),u.call('payment-create',{idt:'123'})]);
  check('dos requests devuelven un único intento y checkout oficial',()=>{
    assert.equal(a.status,200);assert.equal(a.data.attempt_id,b.data.attempt_id);assert.equal(a.data.state,'PENDING');
    assert.match(a.data.checkout_url,/^https:\/\/siropagos\.bancoroela\.com\.ar\/Home\/Pago\/[a-f0-9]{64}$/);
    assert.equal(a.data.phantom_payment_posted,false);assert.doesNotMatch(a.text,/fixture-password|fixture-token|nro_comprobante|reference|cpe/);
  });
  const ret=await fetch(physical('payment-return?result=ok&attempt='+a.data.attempt_id+'&IdResultado=forged&IdReferenciaOperacion=forged'),{redirect:'manual'});
  check('retorno descarta query y conserva solo attempt_id',()=>{assert.equal(ret.status,303);assert.equal(ret.headers.get('location'),'/autogestion/#/facturas?attempt='+a.data.attempt_id);});
  const errorRet=await fetch(physical('payment-return?result=error&attempt='+a.data.attempt_id+'&Estado=RECHAZADA&Importe=1&IDA=5'),{redirect:'manual'});
  check('retorno ERROR falsificado no modifica resultado',()=>{assert.equal(errorRet.status,303);assert.equal(errorRet.headers.get('location'),'/autogestion/#/facturas?attempt='+a.data.attempt_id);});
  const rootRet=await fetch(physical('payment-return?result=ok&attempt='+a.data.attempt_id+'&IdResultado=forged').replace('/autogestion/api.php','/api.php'),{redirect:'manual'});
  check('retorno físico del subdominio raíz conserva solo attempt_id',()=>{assert.equal(rootRet.status,303);assert.equal(rootRet.headers.get('location'),'/#/facturas?attempt='+a.data.attempt_id);});
  r=await u.call('payments');check('lista privada mantiene pendiente tras retorno falso',()=>{assert.equal(r.data.items[0].state,'PENDING');assert.equal(r.data.items[0].checkout_url,undefined);});
  scenario('cancelled');r=await u.call('payment-reconcile',{attempt_id:a.data.attempt_id});check('cancelación real se consulta backend',()=>assert.equal(r.data.state,'CANCELLED'));
  scenario('normal');r=await u.call('payment-create',{idt:'123'});const second=r.data;
  check('cancelación permite intento nuevo',()=>assert.notEqual(second.attempt_id,a.data.attempt_id));
  await u.call('logout',{});const recovered=jar();clearRate();await login(recovered);scenario('confirmed');
  r=await recovered.call('payment-reconcile',{attempt_id:second.attempt_id});
  check('nueva sesión recupera y confirma SIRO sin tocar Phantom',()=>{assert.equal(r.data.state,'CONFIRMED');assert.equal(r.data.siro_payment_confirmed,true);assert.equal(r.data.phantom_payment_posted,false);});
  const postingConfigured=()=>configured().replace("'mode'=>'phantom'","'mode'=>'phantom','phantom_posting'=>['enabled'=>true,'lab_ida'=>1,'crm_url'=>'https://fixture.invalid/PHANTOM/Includes/CRM/API_CRM.php','origin'=>'SIRO Mi USITTEL']");
  fs.writeFileSync(config,postingConfigured());
  const fresh=jar();clearRate();const freshLogin=await login(fresh);
  check('login habilita consulta de imputación sin necesitar recargar',()=>assert.equal(freshLogin.data.phantom_posting_enabled,true));
  const freshBootstrap=await fresh.call('bootstrap');
  check('login y recarga conservan las mismas habilitaciones',()=>{assert.equal(freshLogin.data.phantom_posting_enabled,freshBootstrap.data.phantom_posting_enabled);assert.equal(freshLogin.data.payments_enabled,freshBootstrap.data.payments_enabled);});
  await fresh.call('logout',{});const signedOut=await fresh.call('bootstrap');
  check('logout elimina ambas habilitaciones',()=>{assert.equal(signedOut.data.phantom_posting_enabled,false);assert.equal(signedOut.data.payments_enabled,false);});
  r=await recovered.call('bootstrap');check('bootstrap habilita escritura Phantom sólo con compuerta explícita',()=>assert.equal(r.data.phantom_posting_enabled,true));
  await recovered.call('invoices');
  r=await recovered.call('payment-post',{attempt_id:second.attempt_id},{noCsrf:true});check('imputación exige CSRF',()=>assert.equal(r.status,403));
  r=await recovered.call('payment-post',{attempt_id:second.attempt_id});
  check('pago confirmado se imputa una vez y se verifica leyendo Phantom',()=>{assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.phantom_payment_posted,true);assert.equal(r.data.phantom_posting_state,'POSTED');assert.equal(fs.readFileSync(path.join(dir,'phantom-post-calls'),'utf8'),'1');assert.doesNotMatch(r.text,/reference|result_id|fixture-token|SIRO [a-f0-9-]{36}/);});
  r=await recovered.call('payment-post',{attempt_id:second.attempt_id});check('doble click no repite escritura Phantom',()=>{assert.equal(r.data.phantom_payment_posted,true);assert.equal(fs.readFileSync(path.join(dir,'phantom-post-calls'),'utf8'),'1');});
  await recovered.call('invoices');r=await recovered.call('payment-create',{idt:'123'});check('factura imputada no puede volver a cobrarse',()=>{assert.equal(r.status,409);assert.equal(r.data.error.code,'PAYMENT_NOT_UNPAID');});
  r=await recovered.call('overview');check('imputación verificada refleja factura Phantom sin alterar saldo artificialmente',()=>{assert.equal(r.data.account.debt,12500.75);assert.equal(r.data.invoices.items[0].status,'Pagada');});
  await recovered.call('logout',{});r=await recovered.call('payments');check('logout bloquea lectura de intentos',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,configured(1));clearRate();const expired=jar();await login(expired);await sleep(1100);r=await expired.call('payment-create',{idt:'123'});
  check('sesión vencida no inicia pago',()=>assert.ok([401,403].includes(r.status)));
  fs.writeFileSync(config,configured());scenario('services-two');clearRate();const multi=jar();r=await login(multi);
  check('SIRO configurado sigue oculto en sesión multicontrato',()=>assert.equal(r.data.payments_enabled,false));
  for(const [route,body] of [['payments',undefined],['payment-create',{idt:'100'}],['payment-reconcile',{attempt_id:second.attempt_id}]]) {
    r=await multi.call(route,body);check('multicontrato bloquea '+route,()=>{assert.equal(r.status,409);assert.equal(r.data.error.code,'SIRO_DISABLED');});
  }
  await multi.call('logout',{});
  fs.writeFileSync(config,settings());scenario('normal');
};
