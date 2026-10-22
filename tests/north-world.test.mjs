import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
const economyUrl=['../assets/economy.js','../dist/assets/economy.js'].map(p=>new URL(p,import.meta.url)).find(u=>existsSync(u)),withEconomy=s=>s.replace(/(from\s*['"])\.\/economy\.js(['"])/g,'$1'+economyUrl.href+'$2');
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8').catch(()=>readFile(new URL('../dist/'+p,import.meta.url),'utf8'));
const moduleFrom=s=>import('data:text/javascript;base64,'+Buffer.from(withEconomy(s)).toString('base64'));
const world=await moduleFrom(await read('assets/world-rules.js'));
const {TOWERS,CITY_BLOCKS,worldWalkable,worldDrivable,onBridge,bridgeHeight,northResponseRoute}=world;
assert.equal(TOWERS.length,15);assert.equal(new Set(TOWERS.map(t=>t.name)).size,15);assert.ok(TOWERS.every(t=>t.height>=88));
const footprints=[...TOWERS.map(t=>({...t,w:t.w+4,d:t.d+4})),...CITY_BLOCKS];
for(let i=0;i<footprints.length;i++){const a=footprints[i];for(let j=i+1;j<footprints.length;j++){const b=footprints[j];assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.z-b.z)>=(a.d+b.d)/2,'City buildings have separate footprints');}for(let x=a.x-a.w/2;x<=a.x+a.w/2;x+=2)for(let z=a.z-a.d/2;z<=a.z+a.d/2;z+=2)assert.equal(worldDrivable(x,z),false,'Buildings stay off roads');const front=a.z+a.d/2,end=world.NORTH_CITY.streets.find(z=>z>front)-10;for(const b of footprints)if(a!==b&&Math.abs(a.x-b.x)<b.w/2+1)assert.ok(b.z+b.d/2<front||b.z-b.d/2>end,'Entrances have an unobstructed approach');}
for(let z=-150;z>=-1150;z-=.5){assert.ok(worldWalkable(9.3,z),'The footpath connects both districts');for(const x of [-3.5,-1.3])assert.ok(worldDrivable(x,z),'A full car footprint can travel continuously north');assert.ok(!footprints.some(b=>Math.abs(b.x)<b.w/2+3&&Math.abs(b.z-z)<b.d/2+3));}
for(const x of [-15,15,60,-60]){assert.equal(worldWalkable(x,-660),false,'The river cannot be walked across beside the bridge');assert.equal(worldDrivable(x,-660),false);}
assert.equal(bridgeHeight(world.BRIDGE.south),.06);assert.equal(bridgeHeight(-550),8);assert.equal(bridgeHeight(-770),8);assert.equal(bridgeHeight(world.BRIDGE.north),.06);assert.ok(onBridge(9,-660));assert.ok(!onBridge(12,-660));for(let z=world.BRIDGE.south;z>world.BRIDGE.north;z-=.25)assert.ok(Math.abs(bridgeHeight(z)-bridgeHeight(z-.25))<=.016,'Bridge ramps have a continuous grade');
const physics=await moduleFrom(await read('assets/vehicle-physics.js'));
let vehicle=physics.createVehicleState(-2.4,-150,Math.PI),distance=0;for(let i=0;i<2300&&vehicle.z>-1149;i++){const result=physics.advanceVehicle(vehicle,{forward:1},.04,(x,z,h)=>physics.vehicleFootprint(x,z,h).every(p=>worldDrivable(p.x,p.z)));assert.equal(result.collided,false,'Drive north on the actual vehicle dynamics');distance+=result.distance;}assert.ok(vehicle.z<-1148);assert.ok(distance>990,'Downtown requires a long journey');
for(const target of [{x:2,z:-660},{x:-60,z:-1500},{x:130,z:-1390}]){const path=northResponseRoute({x:136.4,z:-39},target);for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));for(let j=0;j<=n;j++){const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;if(z<-150)assert.ok(worldDrivable(x,z),'Responders reach the north district across the bridge');}}}
// Execute the real bakery/café construction and inspect its collision surfaces.
class Position{set(x,y,z){Object.assign(this,{x,y,z});return this}copy(p){Object.assign(this,p);return this}add(p){this.x+=p.x;this.y+=p.y;this.z+=p.z;return this}multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this}sub(p){this.x-=p.x;this.y-=p.y;this.z-=p.z;return this}normalize(){return this}}
class Object3D{constructor(){this.position=new Position();this.rotation={set(x,y,z){Object.assign(this,{x,y,z});return this}};this.scale={set(){}};this.children=[];this.quaternion={setFromUnitVectors(){}};}add(c){this.children.push(c)}remove(){} }
class Mesh extends Object3D{constructor(geometry,material){super();Object.assign(this,{geometry,material})}}
const THREE=new Proxy({Group:Object3D,Mesh,Vector3:class extends Position{constructor(x=0,y=0,z=0){super();this.set(x,y,z)}},SRGBColorSpace:'srgb'}, {get:(o,k)=>o[k]||class{constructor(...args){this.args=args}}});
const rules=await moduleFrom(await read('assets/city-rules.js')),obstacles=[],buildings=[],surfaces=[];
const source=(await read('assets/civic-world.js')).replace(/^import .*;\n/gm,'').replace('export function createCivicWorld','function createCivicWorld');
const context={...rules,THREE,document:{createElement:()=>({getContext:()=>({fillRect(){},fillText(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}})})}};vm.createContext(context);vm.runInContext(source,context);
const scene=new Object3D(),civic=context.createCivicWorld({scene,visualKit:{brick:()=>({}),concrete:{},asphalt:{}},obstacles,buildings,groundSurfaces:surfaces,characters:{create:()=>({})}});
const blocked=(x,z)=>obstacles.some(o=>x>o.minX-.5&&x<o.maxX+.5&&z>o.minZ-.5&&z<o.maxZ+.5);
for(let z=-69;z>=-95;z-=.1)assert.equal(blocked(-42,z),false,'The bakery doorway and central aisle stay open');for(let x=-42;x<=-38;x+=.1)assert.equal(blocked(x,-95),false,'The counter is reachable');assert.ok(civic.bakeryInside({x:-38,z:-95}));assert.ok(civic.seats.filter(s=>s.z===-74.5).length>=4,'The bakery terrace has usable seating');
for(const item of rules.BAKERY_MENU){const refused=rules.buyBakeryOrder(rules.freshCityLife(),item.price-1,item.id);assert.equal(refused.ok,false);const paid=rules.buyBakeryOrder(rules.freshCityLife(),item.price,item.id);assert.ok(paid.ok);assert.equal(paid.wallet,0);assert.equal(paid.state.bakerySpent,item.price);assert.equal(rules.restoreCityLife(paid.state).bakeryReceipts.length,1);}assert.deepEqual(rules.restoreCityLife({}).bakeryReceipts,[]);
const html=await read('index.html'),roadSource=await read('assets/north-world.js');assert.ok(roadSource.includes('indices.push(k,k+1,k+2,k+1,k+3,k+2)'),'Bridge surface faces upwards');assert.ok(!html.includes('cube(scene,0,-.42,0,1200,.35,1200'),'No ground plane fills the river');
console.log('North world passed: 15 towers, road/entrance clearance, 1 km drive, continuous bridge grades, river boundaries, north police routes, accessible bakery geometry, seating, exact payments, and old-save migration.');
