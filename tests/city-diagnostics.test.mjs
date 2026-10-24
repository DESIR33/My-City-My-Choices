import assert from 'node:assert/strict';
import test from 'node:test';
import {createCityDiagnostics,DIAGNOSTIC_KEY} from '../assets/city-diagnostics.js';
function store(raw=null){let value=raw;const keys=[];return {keys,getItem:k=>{keys.push(k);return value;},setItem:(k,v)=>{keys.push(k);value=v;},value:()=>value};}
test('Local diagnostics survive reload, bound sampling and exclude story/error content',()=>{
 const storage=store();let time=10000,reads=0;const d=createCityDiagnostics({storage,now:()=>time,device:{platform:'ios',browser:'safari',width:390,height:844}});
 for(let i=0;i<100;i++){time+=5000;assert.equal(d.sample(()=>{reads++;return{x:102+i,z:1507,frameMs:21,calls:400,triangles:22222,textures:50,geometries:80,programs:20,detailed:8,quality:'basic',avatarName:'Private player',cash:25};}),true);d.sample(()=>{throw Error('Rate limit must skip collecting samples');});}
 assert.equal(reads,100);d.event('script-error',{name:'TypeError',file:'coast-world.js',line:32,message:'Private message',stack:'secret'});
 const report=JSON.parse(d.report());assert.equal(report.current.samples.length,12);assert.equal(report.current.samples[0].z,1510);assert.equal(report.current.events[0].name,'TypeError');assert.ok(!d.report().includes('Private'));assert.ok(!d.report().includes('secret'));assert.ok(storage.keys.every(k=>k===DIAGNOSTIC_KEY));
 const next=createCityDiagnostics({storage,now:()=>++time});assert.equal(next.previous.status,'script-error');assert.equal(next.previous.samples.length,12);
 const setupReload=createCityDiagnostics({storage});assert.equal(setupReload.previous.status,'script-error','Reloading setup keeps the last play/error report');
 for(let i=0;i<50;i++)setupReload.event('graphics-lost');assert.equal(JSON.parse(setupReload.report()).current.events.length,8);assert.ok(storage.value().length<8000);
});
test('Malformed/quota storage and nonfinite resource values cannot interrupt play',()=>{
 for(const raw of ['bad json','null',JSON.stringify({current:{status:'running',samples:[null,2,{}, {x:Infinity}],events:[null,{}]}})]){const d=createCityDiagnostics({storage:store(raw)});assert.doesNotThrow(()=>d.sample({x:NaN,z:Infinity,calls:Infinity}));assert.ok(d.report().length<8000);}
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};const d=createCityDiagnostics({storage:denied});assert.doesNotThrow(()=>{d.event('graphics-lost');d.sample({});JSON.parse(d.report());});
});
test('Normal exits, graphics loss and unexpected interruptions remain distinct technical evidence',()=>{
 const s=store(),d=createCityDiagnostics({storage:s});d.sample({x:0,z:1700});assert.equal(createCityDiagnostics({storage:s}).previous.status,'running');
 d.event('graphics-lost');assert.equal(createCityDiagnostics({storage:s}).previous.status,'graphics-lost');
 d.event('page-exit');assert.equal(createCityDiagnostics({storage:s}).previous.status,'page-exit');
 assert.match(d.report(),/does not prove a browser crash/);
});
