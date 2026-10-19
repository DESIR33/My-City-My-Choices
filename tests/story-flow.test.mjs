import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8').catch(()=>readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
const loadModule=async name=>{const s=await readFile(new URL('../assets/'+name,import.meta.url),'utf8').catch(()=>readFile(new URL('../dist/assets/'+name,import.meta.url),'utf8'));return import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))};
const ownership=await loadModule('vehicle-ownership.js'),physics=await loadModule('vehicle-physics.js');
class Position{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}set(x,y,z){Object.assign(this,{x,y,z});return this}copy(p){return this.set(p.x,p.y,p.z)}}
class Element{constructor(){this.style={};this.children=[];this.value='';this.textContent='';this.innerHTML='';this.hidden=false;this.disabled=false;const flags=new Set();this.classList={add:c=>flags.add(c),remove:c=>flags.delete(c),toggle:(c,on)=>on?flags.add(c):flags.delete(c),contains:c=>flags.has(c)}}appendChild(e){this.children.push(e)}before(){}addEventListener(){}querySelectorAll(){return []}remove(){this.removed=true}}
const elements=new Map(),storage=new Map();const doc={querySelector:id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){},exitPointerLock(){}};
const actor=(x,z)=>({position:new Position(x,0,z),rotation:{y:0},visible:true});
const garage=actor(-86,115);garage.rotation.y=Math.PI/2;garage.userData={obstacle:{minX:-88.4,maxX:-83.6,minZ:114,maxZ:116},vehicleVisual:{paint:{color:{set(){}}}}};const loaner=actor(-65,-28);loaner.userData={obstacle:{minX:-66,maxX:-64,minZ:-31,maxZ:-25}};
const c={...ownership,...physics,document:doc,console,window:null,location:{reload(){c.reloaded=true}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:()=>0,performance:{now:()=>0},renderer:{domElement:{requestPointerLock(){},addEventListener(){}}},createTouchControls:()=>({enabled:true,state:{x:0,forward:0},clear(){},update(){}}),THREE:{MathUtils:{clamp:(n,a,b)=>Math.max(a,Math.min(n,b))}},person:(x,z)=>actor(x,z),characters:{setAppearance(){}},garageCar:garage,cars:[garage,loaner],vehicleRefs:[{group:garage,color:0}],obstacles:[garage.userData.obstacle,loaner.userData.obstacle],streets:[-120,-60,0,60,120],traffic:[],playerStopDwell:new Map(),playerStopReady:new Set(),drivingLastDirection:1,updateVehicleVisual(){},checkPlayerTrafficRules(){},addEventListener(){},keys:{},groundHeight:()=>0};
for(const key of ['standMarker','restaurantMarker','goodsMarker','serviceMarker','upgradeSign','restaurantUpgradeSign','storeUpgradeSign','serviceUpgradeSign','clothingMarker','homeListingsMarker','garageMarker'])c[key]={visible:false};
c.window=c;c.mom=actor(-83,-27);c.maya=actor(10,-11);vm.createContext(c);vm.runInContext(html.split("\n").find(line=>line.startsWith("function parkedObstacle(")),c);
const script=html.slice(html.indexOf('const player=person('),html.indexOf('const mapCtx='));vm.runInContext('(()=>{'+script+';window.__storyEval=(s)=>eval(s)})()',c);
const run=s=>c.__storyEval(s);
assert.equal(typeof c.closeGamePanel,'function');assert.equal(typeof c.newStory,'function');assert.equal(typeof c.launchNextBusinessDay,'function');
// Play through the story using the same public handlers as its buttons.
run('goal=0');doc.querySelector('#begin').onclick();assert.equal(run('stage'),'parent');c.walletQuiz(true);assert.equal(run('stage'),'maya');assert.equal(run('cash'),5);c.closeGamePanel();assert.equal(doc.querySelector('#modal').classList.contains('show'),false);
c.chooseBusiness(0);c.buyKit(false);assert.equal(run('cash'),2);
function finishDay(){while(run('customers<salesTarget')){const due=run('currentChangeDue()');run('changePieces=['+due+']');c.serve();const feedback=doc.querySelector('#feedback');feedback.children.at(-1).onclick();}}
finishDay();assert.equal(run('stage'),'choice');c.endGame('grow');assert.equal(run('stage'),'done');assert.equal(run('cash'),3);
c.startNextMarketDay();c.launchNextBusinessDay();assert.equal(run('marketDay'),2);assert.equal(run('cash'),1);c.launchNextBusinessDay();assert.equal(run('cash'),1,'Reopen cannot charge twice');finishDay();assert.equal(run('stage'),'done');assert.equal(run('cash'),6);
assert.equal(doc.querySelector('#garageButton').style.display,'block');run('player.position.set(-90,0,105)');c.openGarage();assert.ok(doc.querySelector('#panel').innerHTML.includes('$6.75'));c.quoteCar('used');assert.ok(doc.querySelector('#panel').innerHTML.includes('$2.00'));
const savings=run('saved'),businessCost=run('spent');c.purchaseCar('used');assert.equal(run('cash'),2);assert.equal(run('carLife.offerId'),'used');assert.equal(run('saved'),savings);assert.equal(run('spent'),businessCost,'Ownership is separate from business profit');c.purchaseCar('refreshed');assert.equal(run('cash'),2,'Repeated buy does not charge');
run('carLife.fuel=6');c.carUpkeep('fuel');assert.equal(run('cash'),1.5);assert.equal(run('carLife.fuel'),8);run('carLife.condition=25');c.carUpkeep('service');assert.equal(run('cash'),.75);assert.equal(run('carLife.condition'),100);
run('player.position.set(-83,0,-22);carLife.fuel=4');c.carUpkeep('fuel');assert.equal(run('cash'),.75,'Cannot buy fuel remotely');
run('player.position.copy(garageCar.position);findNear()');assert.equal(run('near.car===garageCar'),true);c.closeGamePanel();run('interactNow()');assert.equal(run('driving===garageCar'),true);run('carLife.fuel=.0001;vehicleState.speed=2');for(let i=0;i<120;i++)run('updateMove(1/60)');assert.equal(run('carLife.fuel'),0,'Driving consumes the remaining fuel');assert.equal(run('carSpeed'),0,'Empty tank brings the car to rest');run('carLife.fuel=3;saveGame()');assert.equal(JSON.parse(storage.get('mapleStreetChapter1')).wasDrivingOwned,true);
// Reload the saved car at rest with ownership, fuel, and cash preserved.
run('driving=null;vehicleState=null;carLife=freshCarOwnership();restoreGame()');assert.equal(run('carLife.fuel'),3);assert.equal(run('cash'),.75);assert.equal(run('driving===garageCar'),true);assert.equal(run('carSpeed'),0);
const conditionBeforeReturn=run('carLife.condition');c.roadsideReturn();assert.equal(run('driving'),null);assert.equal(run('carLife.fuel'),3);assert.equal(run('carLife.condition'),conditionBeforeReturn);assert.equal(run('cash'),.75);assert.equal(run('player.position.z'),105);
run('openStoryJournal()');assert.ok(doc.querySelector('#panel').innerHTML.includes('Transport budget'));
// Every inline action in this app must be reachable from a browser event handler.
const calls=[...html.matchAll(/onclick=\\?['"][^'"\n]*?([A-Za-z_$][\w$]*)\(/g)].map(m=>m[1]);
for(const name of new Set(calls))assert.equal(typeof c[name],'function','Inline button handler '+name+' is wired');
c.newStory();assert.equal(storage.has('mapleStreetChapter1'),false);assert.ok(c.reloaded);
console.log('Story flow passed: start, money lesson, both business days, all inline handlers, car purchase/upkeep, savings protection, garage access, driving save/reload, roadside recovery, and journal.');
