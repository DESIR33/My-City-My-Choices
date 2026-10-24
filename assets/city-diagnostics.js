// Local, bounded technical breadcrumbs. No story/save keys, names, save data,
// full user agent, URLs, network requests or automatic report uploads.
export const DIAGNOSTIC_KEY='mapleCityDiagnosticsV1';
export const DIAGNOSTIC_BUILD='mobile-route-78';
const number=(v,max=1e9)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.round(v))):0;
const coordinate=v=>Number.isFinite(v)?Math.round(Math.max(-100000,Math.min(100000,v))/10)*10:0;
const eventKinds=new Set(['script-error','promise-error','graphics-lost','graphics-restored','page-exit','background']);
const errorName=v=>['Error','TypeError','RangeError','ReferenceError','SyntaxError','AbortError','SecurityError'].includes(v)?v:'';
const fileName=v=>/^[a-zA-Z0-9_.-]+\.(m?js|html)$/.test(v||'')?v:'';
const word=v=>String(v||'').replace(/[^a-zA-Z0-9_.-]/g,'').slice(0,48);
function cleanRun(run){
 if(!run||!Array.isArray(run.samples)||!Array.isArray(run.events))return null;
 return {build:word(run.build),status:word(run.status),samples:run.samples.filter(s=>s&&typeof s==='object').slice(-12).map(s=>({x:coordinate(s.x),z:coordinate(s.z),frameMs:number(s.frameMs,60000),calls:number(s.calls),triangles:number(s.triangles),geometries:number(s.geometries),textures:number(s.textures),programs:number(s.programs),detailed:number(s.detailed),quality:word(s.quality)})),events:run.events.filter(e=>e&&typeof e==='object').slice(-8).map(e=>({kind:word(e.kind),name:errorName(e.name),file:fileName(e.file),line:number(e.line),at:number(e.at,1e15)}))};
}
export function createCityDiagnostics({storage,now=Date.now,device={}}={}){
 let old;try{old=JSON.parse(storage?.getItem(DIAGNOSTIC_KEY)||'null');}catch{}
 const prior=cleanRun(old?.current),previous=prior&&prior.status!=='setup'?prior:cleanRun(old?.previous);
 const current={build:DIAGNOSTIC_BUILD,status:'setup',samples:[],events:[]};let lastSample=-Infinity;
 const persist=()=>{try{storage?.setItem(DIAGNOSTIC_KEY,JSON.stringify({version:1,previous,current}));}catch{}};
 function event(kind,info={}){if(!eventKinds.has(kind))return;current.status=word(kind);current.events.push({kind:word(kind),name:errorName(info.name),file:fileName(info.file),line:number(info.line),at:number(now(),1e15)});current.events=current.events.slice(-8);persist();}
 function sample(info){if(now()-lastSample<5000)return false;lastSample=now();const next=cleanRun({samples:[typeof info==='function'?info():info],events:[]}).samples[0];current.samples.push(next);current.samples=current.samples.slice(-12);current.status='running';persist();return true;}
 function report(){return JSON.stringify({build:DIAGNOSTIC_BUILD,device:{platform:word(device.platform),browser:word(device.browser),width:number(device.width,32768),height:number(device.height,32768),pixelRatio:Math.min(4,Math.max(1,Number(device.pixelRatio)||1))},note:'An interrupted session without a recorded page exit does not prove a browser crash. Counts are renderer resources, not total memory. This report contains no saved story and stays on this device until you choose to share it.',previous,current},null,2);}
 persist();return {event,sample,report,get previous(){return previous;}};
}
export function mountCityDiagnostics(doc,win){
 let storage;try{storage=win.localStorage;}catch{}
 const ua=win.navigator?.userAgent||'',diagnostics=createCityDiagnostics({storage,device:{platform:/iPhone|iPad/.test(ua)?'ios':/Android/.test(ua)?'android':'other',browser:/CriOS|Chrome/.test(ua)?'chrome':/Firefox|FxiOS/.test(ua)?'firefox':/Safari/.test(ua)?'safari':'other',width:win.innerWidth,height:win.innerHeight,pixelRatio:win.devicePixelRatio}});
 win.cityDiagnostics=diagnostics;
 win.openCityDiagnostics=()=>{
  const panel=doc.createElement('dialog'),heading=doc.createElement('h2'),note=doc.createElement('p'),text=doc.createElement('textarea'),close=doc.createElement('button');
  panel.setAttribute('aria-label','Crash report');panel.style.cssText='max-width:640px;width:calc(100% - 32px);max-height:85vh;background:#17362b;color:#fff;border:1px solid #81ac98;border-radius:16px;padding:20px';
  heading.textContent='Crash report';note.textContent='Technical details only. Select and copy this report if the game stops again. Nothing is sent automatically.';
  text.readOnly=true;text.setAttribute('aria-label','Technical crash report');text.value=diagnostics.report();text.style.cssText='display:block;box-sizing:border-box;width:100%;height:45vh;font:12px monospace';
  close.textContent='Close';close.type='button';close.addEventListener('click',()=>{panel.close?.();panel.remove();});panel.append(heading,note,text,close);doc.body.append(panel);panel.showModal?.();close.focus?.();
 };
 const button=doc.querySelector('#startupDiagnostics');button?.addEventListener('click',()=>win.openCityDiagnostics());
 win.addEventListener('error',e=>diagnostics.event('script-error',{name:e.error?.name||'Error',file:String(e.filename||'').split('/').at(-1)?.split('?')[0],line:e.lineno}));
 win.addEventListener('unhandledrejection',e=>diagnostics.event('promise-error',{name:e.reason?.name||'Error'}));
 win.addEventListener('pagehide',()=>diagnostics.event('page-exit'));
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)diagnostics.event('background');});
 return diagnostics;
}
if(typeof window!=='undefined'&&typeof document!=='undefined')mountCityDiagnostics(document,window);
