// No network or bandwidth: exercise the worker boundary with controlled events.
module.exports=async({check,assert,fs,path,root})=>{
  const source=fs.readFileSync(path.join(root,'js','speed-test.js'),'utf8').replaceAll('import.meta.url',JSON.stringify('https://portal.example.com/autogestion/js/speed-test.js'));
  const {startSpeedTest,stopSpeedTest,validMeasurement}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const originalFetch=global.fetch,originalWorker=global.Worker;
  let instance,requests=[];
  class FakeWorker {
    constructor(){instance=this;this.messages=[];this.terminated=false;}
    postMessage(message){this.messages.push(message);}
    terminate(){this.terminated=true;}
    emit(value){this.onmessage({data:JSON.stringify(value)});}
  }
  global.Worker=FakeWorker;
  global.fetch=async(url,options)=>{requests.push({url:String(url),options});return {ok:true};};
  try {
    check('mediciones inválidas nunca se convierten a cero',()=>{for(const value of ['',null,undefined,'Fail',NaN,Infinity,-1,'1e3'])assert.equal(validMeasurement(value),null);assert.equal(validMeasurement('0.00'),0);assert.equal(validMeasurement('213.5'),213.5);});
    await assert.rejects(startSpeedTest('http://speed.example.com/',()=>{},()=>{}));
    check('HTTP rechazado antes de red',()=>assert.equal(requests.length,0));
    let updates=[],ends=[];
    const start=()=>startSpeedTest('https://speed.example.com/backend/',d=>updates.push(d),e=>ends.push(e));
    await start();
    check('preflight sin cookies y motor sin telemetría',()=>{
      assert.equal(requests[0].options.credentials,'omit');assert.equal(requests[0].options.redirect,'error');
      const config=JSON.parse(instance.messages[0].slice(6));assert.equal(config.telemetry_level,0);assert.equal(config.getIp_ispInfo,false);assert.equal(config.test_order,'P_D_U');assert.equal(config.mpot,true);assert.doesNotMatch(JSON.stringify(config),/IDA|customer|token/);
    });
    instance.emit({testState:1,dlStatus:'24.3'});
    instance.emit({testState:4,dlStatus:'101.2',ulStatus:'90',pingStatus:'3.2',jitterStatus:'0.4'});
    check('resultados finales válidos y worker liberado',()=>{assert.equal(updates.length,2);assert.deepEqual(ends,[null]);assert.equal(instance.terminated,true);});
    await start();instance.emit({testState:4,dlStatus:'Fail',ulStatus:'90',pingStatus:'3',jitterStatus:'1'});
    check('fallo parcial impide declarar resultado final',()=>assert.equal(typeof ends.at(-1),'string'));
    await start();instance.emit(null);
    check('respuesta malformada termina sin bloquear la interfaz',()=>{assert.equal(instance.terminated,true);assert.match(ends.at(-1),/leer/);});
    await start();const previous=instance,before=updates.length;stopSpeedTest();previous.emit({testState:1,dlStatus:'999'});
    check('cancelar descarta mensajes tardíos',()=>{assert.equal(previous.terminated,true);assert.equal(updates.length,before);});
    let completePreflight;
    global.fetch=(_url,options)=>new Promise(resolve=>{completePreflight=()=>resolve({ok:true});requests.push({options});});
    const pending=start();stopSpeedTest();completePreflight();await pending;
    check('cancelar durante preflight no crea otro worker',()=>{assert.equal(instance,previous);assert.equal(requests.at(-1).options.signal.aborted,true);});
    global.fetch=async()=>({ok:false});await assert.rejects(start());
    check('servidor inaccesible no inicia transferencia',()=>assert.equal(instance,previous));
  } finally {stopSpeedTest();global.fetch=originalFetch;global.Worker=originalWorker;}
};
