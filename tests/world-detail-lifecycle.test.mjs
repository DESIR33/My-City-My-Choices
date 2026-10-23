import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Execute the shipped boot job, not a second implementation. Mocks replace only
// network/decoder endpoints so delayed jobs and failure cleanup are observable.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('(async()=>{',html.indexOf('// Share one decoder pool'));
const boot=html.slice(start,html.indexOf('const communityPlaza=',start)).trim();
assert.ok(start>0&&boot.endsWith('})();'));
for(const mobile of [false])for(const fail of [false,true]){
 const events=[],loaders=[],requests=[],warnings=[];let releaseCity,releaseSofa;
 const cityGate=new Promise(resolve=>{releaseCity=resolve}),sofaGate=new Promise(resolve=>{releaseSofa=resolve});
 class KTX2Loader{
  constructor(){loaders.push(this);this.disposed=false}
  setWorkerLimit(n){this.workers=n;return this}setTranscoderPath(){return this}detectSupport(){return this}
  async loadAsync(url){assert.equal(this.disposed,false);requests.push(url);return {url}}
  dispose(){assert.equal(this.disposed,false);this.disposed=true;events.push('dispose')}
 }
 class GLTFLoader{
  setKTX2Loader(loader){assert.equal(loader,loaders[0]);this.loader=loader;return this}
  async loadAsync(url){assert.equal(this.loader.disposed,false);requests.push(url);if(url==='sofa.glb')await sofaGate;if(fail&&url.endsWith('/chair.glb'))throw Error('missing chair');return {scene:{url}}}
 }
 const home={surfaces:{},applyBake(){events.push('bake')},installFurniture(scenes){events.push('furniture');assert.deepEqual(Object.keys(scenes).sort(),fail?['bed']:['bed','chair'])}};
 const context={globalThis:{landmarkHome:home},plannedCommunity:{sofaSets:{count:14,install(){events.push('sofa')}}},KTX2Loader,GLTFLoader,mobileGraphics:mobile,renderer:{capabilities:{getMaxAnisotropy:()=>16}},visualKit:{pbr:{}},SOFA_SET_URL:'sofa.glb',HOUSE_FURNITURE_MODELS:{bed:{},chair:{}},console:{warn:(...args)=>warnings.push(args)},
  async upgradeCitySurfaces(_,options){await options.load('shared.ktx2');await cityGate;events.push('city');if(fail)throw Error('city failed')},
  async loadHouseSurfaceMaps(_,options){assert.equal(options.size,mobile?512:1024);assert.equal(options.anisotropy,mobile?2:8);await options.load('shared.ktx2');events.push('maps');if(fail)throw Error('maps failed')},
  async loadHouseBake(){if(fail)throw Error('bake failed');return {texture:{},data:{}}}
 };
 const pending=vm.runInNewContext(boot,context);await new Promise(setImmediate);
 assert.equal(loaders.length,1);assert.equal(loaders[0].workers,mobile?1:2);assert.equal(loaders[0].disposed,false,'Do not terminate a late city decode');assert.equal(requests.filter(x=>x==='shared.ktx2').length,1,'City and house share texture promises');assert.ok(!requests.includes('sofa.glb'));
 releaseCity();await new Promise(setImmediate);assert.ok(requests.includes('sofa.glb'),'Other failures cannot block neighborhood furniture');assert.equal(loaders[0].disposed,false,'Wait for sofa texture work too');releaseSofa();await pending;
 assert.equal(loaders[0].disposed,true);assert.equal(events.at(-1),'dispose');assert.ok(events.includes('sofa'));assert.equal(events.includes('furniture'),!mobile);assert.equal(requests.some(x=>x.includes('/house/furniture/')),!mobile,'Mobile retains existing furnished stand-ins without optional GLB requests');assert.equal(events.includes('bake'),!fail);assert.equal(warnings.length>0,fail);
}
let disposed=0;
class BrokenLoader{setWorkerLimit(){return this}setTranscoderPath(){return this}detectSupport(){throw Error('unsupported')}dispose(){disposed++}}
await vm.runInNewContext(boot,{globalThis:{},plannedCommunity:{},KTX2Loader:BrokenLoader,mobileGraphics:false,renderer:{},console:{warn(){}}});assert.equal(disposed,1,'Support detection failures release the allocated pool');
let mobileAllocations=0;class NoMobileLoader{constructor(){mobileAllocations++;throw Error('Mobile must not allocate a decoder');}}
await vm.runInNewContext(boot,{mobileGraphics:true,KTX2Loader:NoMobileLoader});assert.equal(mobileAllocations,0,'Mobile skips optional scans, bake/furniture/sofa jobs and decoder allocation entirely');
console.log('World detail lifecycle passed: one bounded decoder pool, shared scans, late-job cleanup, partial failures, zero mobile decoder allocations and desktop replacements.');
