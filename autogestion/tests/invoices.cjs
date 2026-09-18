module.exports = async ({jar,scenario,check,login,assert,fs,path,dir,clearRate,config,settings,sleep}) => {
  const user=jar();await login(user);let r;
  for(const [name,n,next] of [['history-zero',0,null],['history-one',1,null],['history-short',7,null],['history-exact',10,10]]) {
    scenario(name);r=await user.call('invoices');
    check(`facturas ${name}: cantidad limitada y continuación sin total inventado`,()=>{
      assert.equal(r.status,200);assert.equal(r.data.items.length,n);assert.equal(r.data.limit,10);
      assert.equal(r.data.nextOffset,next);assert.equal(r.data.endReached,n<10);assert.equal(r.data.total,undefined);
    });
  }
  r=await user.call('invoices?offset=10');check('página exacta seguida de vacía finaliza al consultar',()=>{assert.equal(r.status,200);assert.deepEqual(r.data.items,[]);assert.equal(r.data.nextOffset,null);});
  scenario('history-many');const first=(await user.call('invoices')).data;
  const second=(await user.call('invoices?offset=10')).data;
  const retry=(await user.call('invoices?offset=10')).data;
  const third=(await user.call('invoices?offset=20')).data;
  check('tres páginas descendentes y reintento idempotente, sin duplicados ni total',()=>{
    assert.deepEqual(retry,second);assert.equal(first.items.length,10);assert.equal(second.items.length,10);assert.equal(third.items.length,5);
    const ids=[...first.items,...second.items,...third.items].map(x=>Number(x.id));
    assert.equal(new Set(ids).size,25);assert.deepEqual(ids,[...ids].sort((a,b)=>b-a));assert.equal(third.nextOffset,null);
    assert.doesNotMatch(JSON.stringify([first,second,third]),/Hash_Descarga|do-not-expose|URL_PAGO|token|SIRO/);
  });
  r=await user.call('invoice?id=987');check('detalle fresco de factura perteneciente a página 2',()=>{assert.equal(r.status,200);assert.equal(r.data.item.id,'987');assert.equal(r.data.item.outstanding,null);assert.equal(r.data.item.paidAt,null);});
  for(const [query,status] of [['invoice?id=99999',404],['invoice-document?id=99999',404],['invoice-document?id=123&hash=anything',400],['invoices?IDA=5',400],['invoices?offset=1',400],['invoices?offset=30',409]]) {
    r=await user.call(query);check(`solicitud fuera de contrato ${query}`,()=>assert.equal(r.status,status));
  }
  scenario('history-changed-detail');r=await user.call('invoice?id=987');check('posición desplazada no entrega factura distinta',()=>{assert.equal(r.status,409);assert.equal(r.data.item,undefined);});
  scenario('history-repeat');await user.call('invoices');r=await user.call('invoices?offset=10');
  check('segunda página repetida falla sin mezclar registros',()=>{assert.equal(r.status,409);assert.equal(r.data.items,undefined);});
  for(const name of ['history-order','history-duplicate']) {
    scenario(name);r=await user.call('invoices');check(`rechazo seguro ${name}`,()=>{assert.equal(r.status,503);assert.equal(r.data.items,undefined);});
  }
  scenario('history-many');await user.call('invoices');scenario('invoice-failure');r=await user.call('invoices?offset=10');
  check('error al cargar más no retorna datos demo',()=>{assert.equal(r.status,503);assert.equal(r.data.items,undefined);assert.doesNotMatch(r.text,/Agustín|Costa Rica/);});
  scenario('history-many');r=await user.call('invoices?offset=10');check('se puede reintentar la página fallida',()=>assert.equal(r.status,200));
  scenario('normal');await user.call('invoices');r=await user.call('invoice-document?id=123');
  check('endpoint de descarga real sin confirmar falla cerrado',()=>{assert.equal(r.status,503);assert.equal(r.data.error.code,'DOCUMENT_NOT_CONFIGURED');});
  scenario('foreign-invoice');r=await user.call('invoice-document?id=123');
  check('factura con propietario distinto nunca se descarga',()=>{assert.equal(r.status,503);assert.equal(r.headers.get('content-type').startsWith('application/pdf'),false);});
  const callsFile=path.join(dir,'document-calls');const count=()=>fs.existsSync(callsFile)?fs.readFileSync(callsFile,'utf8').length:0;
  const before=count();scenario('document-success');r=await user.call('invoice-document?id=99999');
  check('factura ajena no invoca fuente documental',()=>{assert.equal(r.status,404);assert.equal(count(),before);});
  r=await user.call('invoice?id=123');check('detalle solo expone disponibilidad, no hash privado',()=>{assert.equal(r.data.item.downloadAvailable,true);assert.doesNotMatch(r.text,/do-not-expose|Hash_Descarga|URL_PAGO/);});
  r=await user.call('invoice-document?id=123');check('PDF autorizado fixture con headers de descarga privados',()=>{
    assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/pdf');assert.match(r.headers.get('content-disposition'),/attachment; filename="factura-123.pdf"/);
    assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.text,/^%PDF-/);
  });
  for(const name of ['document-missing-hash','document-invalid-hash']) {
    scenario(name);const previous=count();r=await user.call('invoice-document?id=123');
    check(`hash ausente o inválido ${name}: sin invocar fuente ni exponer valores`,()=>{
      assert.equal(r.status,404);assert.equal(r.data.error.code,'DOCUMENT_UNAVAILABLE');assert.equal(count(),previous);assert.doesNotMatch(r.text,/private-hash|Hash_Descarga/);
    });
  }
  for(const [name,code] of [['document-mime','DOCUMENT_MIME'],['document-size','DOCUMENT_SIZE'],['document-format','DOCUMENT_FORMAT'],['document-error','PHANTOM_HTTP'],['document-unsafe-error','DOCUMENT_UPSTREAM']]) {
    scenario(name);r=await user.call('invoice-document?id=123');check(`descarga rechaza ${name}`,()=>{
      assert.equal(r.status,503);assert.equal(r.data.error.code,code);assert.doesNotMatch(r.text,/private|do-not-expose|https?:|fixture|<html>/);
    });
  }
  const anonymous=jar();r=await anonymous.call('invoice-document?id=123');check('descarga sin sesión no consulta Phantom',()=>assert.equal(r.status,401));
  scenario('document-success');await user.call('logout',{});const beforeLogout=count();r=await user.call('invoice-document?id=123');
  check('logout invalida autorización del documento',()=>{assert.equal(r.status,401);assert.equal(count(),beforeLogout);});
  clearRate();fs.writeFileSync(config,settings('phantom',1));scenario('document-success');const expired=jar();await login(expired);await expired.call('invoices');await sleep(1100);
  r=await expired.call('invoice-document?id=123');check('descarga con sesión vencida rechazada',()=>assert.equal(r.status,401));
  fs.writeFileSync(config,settings());scenario('normal');
};
