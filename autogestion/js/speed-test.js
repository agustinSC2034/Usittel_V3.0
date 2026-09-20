// LibreSpeed's unmodified worker supplies measurements; this module owns the UI.
// No geolocation, IP lookup, telemetry, cookies or subscriber identifiers.
let worker, poll, deadline, preflight, revision = 0;
export function stopSpeedTest() {
  revision++; preflight?.abort(); preflight=null;
  if(worker) { worker.terminate(); worker=null; }
  clearInterval(poll);clearTimeout(deadline);
}
export function validMeasurement(value) {
  if(typeof value!=='number' && (typeof value!=='string' || !/^\d+(?:\.\d+)?$/.test(value))) return null;
  const n=Number(value);return Number.isFinite(n) && n>=0 ? n : null;
}
export async function startSpeedTest(server,onUpdate,onEnd) {
  stopSpeedTest();const current=revision;
  const url=new URL(server);
  if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash || !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) || /(?:^|\.)(localhost|local|internal|invalid)$/.test(url.hostname)) throw new Error('Servidor de medición no válido.');
  const controller=new AbortController();preflight=controller;const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(new URL('empty.php?cors=true',url),{cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
    if(!response.ok) throw new Error('No pudimos conectar con el servidor de medición.');
  } finally {clearTimeout(timer);}
  if(current!==revision) return;
  const finish=(error)=>{if(current!==revision)return;stopSpeedTest();onEnd(error);};
  worker=new Worker(new URL('../vendor/librespeed/speedtest_worker.js',import.meta.url));
  worker.onerror=()=>finish('No pudimos completar la medición. Volvé a intentar.');
  worker.onmessage=event=>{
    if(current!==revision)return;
    let data;try{data=JSON.parse(event.data);}catch{finish('No pudimos leer la medición.');return;}
    if(!data || typeof data!=='object' || !Number.isInteger(data.testState) || data.testState<0 || data.testState>5) {finish('No pudimos leer la medición.');return;}
    onUpdate(data);
    if(data.testState===5) finish('La medición se interrumpió. Volvé a intentar.');
    if(data.testState===4) finish(['dlStatus','ulStatus','pingStatus','jitterStatus'].some(k=>validMeasurement(data[k])===null) ? 'No pudimos completar todas las mediciones. Volvé a intentar.' : null);
  };
  worker.postMessage('start '+JSON.stringify({
    test_order:'P_D_U',mpot:true,telemetry_level:0,getIp_ispInfo:false,
    url_dl:new URL('garbage.php',url).href,url_ul:new URL('empty.php',url).href,url_ping:new URL('empty.php',url).href,
    time_dl_max:12,time_ul_max:12,time_auto:false,count_ping:10,
    xhr_ignoreErrors:0,xhr_dlMultistream:4,xhr_ulMultistream:3,xhr_ul_blob_megabytes:4,
    garbagePhp_chunkSize:20,overheadCompensationFactor:1,
  }));
  poll=setInterval(()=>worker?.postMessage('status'),200);
  deadline=setTimeout(()=>finish('La prueba demoró demasiado. Volvé a intentar.'),60000);
}
