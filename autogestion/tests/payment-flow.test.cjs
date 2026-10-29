const assert=require('node:assert/strict');
(async()=>{
 const {resolvePaymentFlow,canRecoverPosting}=await import('../js/payment-flow.js');
 const {runtime,applyOverview}=await import('../js/data.js');
 const {invoiceVisibleStatus,invoicePayButton}=await import('../js/components.js');
 const {paymentStatusBanner,paymentPanel}=await import('../js/payment-view.js');
 const id='a'.repeat(32);let count=0;
 const attempt=(state='CONFIRMED',extra={})=>({attempt_id:id,idt:'123',state,amount:121,siro_payment_confirmed:state==='CONFIRMED',phantom_posting_state:'NOT_POSTED',accreditation_state:'WAITING',...extra});
 for(const legacy of ['NOT_POSTED','POSTING','POST_UNCONFIRMED','POSTED','NEEDS_REVIEW']){
   const calls=[];await resolvePaymentFlow([attempt('CONFIRMED',{phantom_posting_state:legacy,can_post_to_phantom:true})],{postingEnabled:true,selectedServiceId:'1',request:async r=>{calls.push(r);throw Error(r);}});
   assert.deepEqual(calls,[]);assert.equal(canRecoverPosting(attempt(),true),false);count++;
 }
 const calls=[];let updates=0;
 await resolvePaymentFlow([attempt('PENDING')],{targetAttemptId:id,request:async r=>{calls.push(r);return attempt();},onUpdate:()=>updates++});
 assert.deepEqual(calls,['payment-reconcile']);assert.equal(updates,1);count++;
 await assert.rejects(resolvePaymentFlow([attempt('PENDING')],{request:async()=>attempt('CONFIRMED',{attempt_id:'b'.repeat(32)})}));count++;
 let current=true;updates=0;await resolvePaymentFlow([attempt('PENDING')],{request:async()=>{current=false;return attempt();},isCurrent:()=>current,onUpdate:()=>updates++});assert.equal(updates,0);count++;
 runtime.mode='phantom';runtime.paymentsEnabled=true;runtime.selectedServiceId='1';runtime.paymentFocus={attemptId:id,serviceId:'1'};runtime.paymentHistoryItems=[];
 runtime.paymentItems=[attempt()];
 assert.match(paymentStatusBanner(),/Pago confirmado · Acreditación en proceso/);assert.match(paymentStatusBanner(),/48 horas hábiles/);assert.match(paymentPanel(),/Acreditación en proceso/);
 assert.match(invoicePayButton({id:'123'}),/disabled/);assert.match(invoiceVisibleStatus({id:'123',status:'Pendiente'}).hint,/Acreditación en proceso/);count++;
 runtime.paymentFocus=null;assert.match(paymentPanel(),/Acreditación en proceso/);count++;
 runtime.paymentItems=[attempt('CONFIRMED',{accreditation_state:'SETTLED'})];runtime.paymentFocus={attemptId:id,serviceId:'1'};
 assert.match(paymentStatusBanner(),/Factura saldada/);assert.equal(invoiceVisibleStatus({id:'123',status:'Pendiente'}).label,'Pagada');count++;
 // Legacy direct posting is not evidence that the current invoice is still settled.
 runtime.paymentItems=[attempt('CONFIRMED',{phantom_payment_posted:true,phantom_posting_state:'POSTED'})];
 assert.equal(invoiceVisibleStatus({id:'123',status:'Pendiente'}).label,'Pago confirmado');assert.match(paymentStatusBanner(),/Acreditación en proceso/);count++;
 runtime.selectedServiceId='2';assert.equal(paymentStatusBanner(),'');count++;
 applyOverview({customer:{},invoices:{items:[],nextOffset:null,endReached:true},account:{debt:121,credit:2.35},warnings:[]});
 const data=await import('../js/data.js');assert.equal(data.debt,121);assert.equal(data.credit,2.35);count++;
 console.log('native settlement flow: '+count+' regression checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
