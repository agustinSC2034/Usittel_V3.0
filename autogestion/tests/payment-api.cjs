module.exports=async({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep,base})=>{
  const configured=(idle=900)=>settings('phantom',idle).replace("'mode'=>'phantom'","'mode'=>'phantom','siro'=>['enabled'=>true,'user'=>'fixture-user','password'=>'fixture-password','return_base'=>'http://127.0.0.1:4174/autogestion','receipt_start'=>70000,'receipt_end'=>70020]");
  fs.writeFileSync(config,configured());clearRate();scenario('normal');
  const u=jar();await login(u);await u.call('invoices');
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
  const ret=await fetch(base.replace('/api/','/')+'pago-ok/'+a.data.attempt_id+'?IdResultado=forged&IdReferenciaOperacion=forged',{redirect:'manual'});
  check('retorno descarta query y no confirma pago',()=>{assert.equal(ret.status,303);assert.equal(ret.headers.get('location'),'/autogestion/#/facturas');});
  r=await u.call('payments');check('lista privada mantiene pendiente tras retorno falso',()=>{assert.equal(r.data.items[0].state,'PENDING');assert.equal(r.data.items[0].checkout_url,undefined);});
  scenario('cancelled');r=await u.call('payment-reconcile',{attempt_id:a.data.attempt_id});check('cancelación real se consulta backend',()=>assert.equal(r.data.state,'CANCELLED'));
  scenario('normal');r=await u.call('payment-create',{idt:'123'});const second=r.data;
  check('cancelación permite intento nuevo',()=>assert.notEqual(second.attempt_id,a.data.attempt_id));
  await u.call('logout',{});const recovered=jar();clearRate();await login(recovered);scenario('confirmed');
  r=await recovered.call('payment-reconcile',{attempt_id:second.attempt_id});
  check('nueva sesión recupera y confirma SIRO sin tocar Phantom',()=>{assert.equal(r.data.state,'CONFIRMED');assert.equal(r.data.siro_payment_confirmed,true);assert.equal(r.data.phantom_payment_posted,false);});
  await recovered.call('invoices');r=await recovered.call('payment-create',{idt:'123'});check('SIRO confirmado impide volver a cobrar mientras Phantom siga impaga',()=>{assert.equal(r.data.state,'CONFIRMED');assert.equal(r.data.checkout_url,undefined);});
  r=await recovered.call('overview');check('confirmación SIRO no altera saldo ni factura Phantom',()=>{assert.equal(r.data.account.debt,12500.75);assert.equal(r.data.invoices.items[0].status,'Pendiente');});
  await recovered.call('logout',{});r=await recovered.call('payments');check('logout bloquea lectura de intentos',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,configured(1));clearRate();const expired=jar();await login(expired);await sleep(1100);r=await expired.call('payment-create',{idt:'123'});
  check('sesión vencida no inicia pago',()=>assert.ok([401,403].includes(r.status)));
  fs.writeFileSync(config,settings());scenario('normal');
};
