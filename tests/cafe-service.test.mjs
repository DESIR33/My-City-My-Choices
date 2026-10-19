import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {createCivicWorld} from '../assets/civic-world.js';
import {createCafeActivity} from '../assets/cafe-activity.js';
import {freshCityLife,restoreCityLife,buyCafeOrder,progressCafeOrder,collectCafeOrder,payCafeCustomer} from '../assets/city-rules.js';

let state=freshCityLife(),r=buyCafeOrder(state,175,'latte');assert.ok(r.ok);state=r.state;assert.equal(r.wallet,0);assert.equal(state.cafeService.till,175);assert.equal(state.cafeService.pending.status,'queued');
assert.equal(buyCafeOrder(state,500,'coffee').ok,false,'A pending ticket prevents duplicate payments');assert.equal(collectCafeOrder(state).ok,false,'Paid does not mean prepared');
progressCafeOrder(state,3);state=restoreCityLife(JSON.parse(JSON.stringify(state)));assert.equal(state.cafeService.pending.remaining,6);progressCafeOrder(state,6);assert.equal(state.cafeService.pending.status,'ready');
r=collectCafeOrder(state);assert.ok(r.ok);assert.equal(r.state.cafeReceipts[0].collected,true);assert.equal(collectCafeOrder(r.state).ok,false);assert.equal(r.state.cafeService.held.id,'latte');assert.equal(restoreCityLife(r.state).cafeService.held.id,'latte');
const poor={id:'poor',wallet:99};assert.equal(payCafeCustomer(state,poor,'coffee'),false);assert.equal(poor.wallet,99);
assert.equal(progressCafeOrder(state,NaN),false);assert.equal(restoreCityLife({cafeService:{pending:{ticket:4,id:'fake',status:'ready'}}}).cafeService.pending,null);

// Construct the actual cafeteria with native Three geometry; no WebGL is needed.
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){}})})};
const scene=new THREE.Scene(),obstacles=[],actors=[];
const characters={create({x,z}){const actor=new THREE.Group();actor.position.set(x,.21,z);actor.userData.character={};scene.add(actor);actors.push(actor);return actor;},setAppearance(){},setSeated(a,s){a.userData.character.seated=s;},setActivity(a,type,held){a.userData.character.activity={type,held};}};
const material=new THREE.MeshStandardMaterial();
const civic=createCivicWorld({scene,visualKit:{brick:()=>material.clone(),concrete:material,asphalt:material},obstacles,buildings:[],groundSurfaces:[],characters});
const ready=[];const cafe=createCafeActivity({scene,characters,civicWorld:civic,onReady:p=>ready.push(p.ticket)}),player=new THREE.Group();player.position.set(-30,.21,-32);player.userData.character={};scene.add(player);
state=freshCityLife();cafe.update(0,state,player);assert.equal(cafe.customers.length,8);assert.equal(cafe.customers.filter(c=>c.phase==='dining').length,4);assert.ok(cafe.customers.some(c=>c.phase==='dining'&&c.seat.z<-27),'People eat indoors as well as on the terrace');assert.ok(civic.seats.some(s=>s.z>=-34&&s.z<=-14&&!s.occupiedBy),'Seats remain available for the player');
const startingLedger=state.cafeService.till;assert.equal(state.cafeService.customerSales,4);assert.ok(startingLedger>0);
const balances=new Map(cafe.customers.map(c=>[c.id,c.wallet]));
r=buyCafeOrder(state,200,'coffee');state=r.state;const ticket=state.cafeService.pending.ticket;
for(let i=0;i<4000&&state.cafeService.pending.status!=='ready';i++)cafe.update(.04,state,player);
assert.equal(state.cafeService.pending.status,'ready','The cashier serves the FIFO queue and prepares the player ticket');assert.deepEqual(ready,[ticket]);assert.equal(state.cafeReceipts.length,1);assert.equal(state.cafeSpent,100,'NPC spending never changes the player budget');assert.ok(state.cafeService.customerSales>=8);assert.ok(cafe.customers.some(c=>c.wallet<balances.get(c.id)),'Queued customers actually pay');
const spentByGuests=state.cafeService.ledger.filter(r=>r.customer!=='player').reduce((sum,r)=>sum+r.price,0);assert.equal(state.cafeService.till,spentByGuests+100,'Register reconciles exact NPC and player payments');
state=collectCafeOrder(state).state;cafe.update(.04,state,player);assert.ok(player.children.length>0,'Pickup gives the player a physical cup');player.userData.character.seated={height:.6};cafe.update(.04,state,player);assert.equal(player.userData.character.activity.type,'sip');
for(let i=0;i<5000;i++){cafe.update(.04,state,player);for(const c of cafe.customers)assert.ok(Number.isFinite(c.actor.position.x)&&Number.isFinite(c.actor.position.z));}
assert.ok(state.cafeService.customerSales>15,'Customers finish, leave, and return for further transactions');assert.equal(new Set(cafe.seats.filter(s=>s.occupiedBy).map(s=>s.occupiedBy)).size,cafe.seats.filter(s=>s.occupiedBy).length,'Seat reservations remain exclusive');assert.equal(player.children.length,0,'Consumed items are cleared');

// Run the real camera function at room edges and every heading, with both shells visible.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const camera=new THREE.PerspectiveCamera(),context={THREE,player,civicWorld:civic,driving:null,camera,carSpeed:0,yaw:0,pitch:.12,camDist:5.3,performance:{now:()=>0}};vm.createContext(context);vm.runInContext(html.split('\n').find(l=>l.startsWith('function cameraFollow(')),context);
for(const [x,z] of [[-30,-28],[-40,-40],[-20,-28],[-42,-81],[-48,-99],[-36,-98]]){player.position.set(x,.21,z);civic.update(player.position);const room=civic.interior(player.position);assert.ok(room);for(let yaw=0;yaw<Math.PI*2;yaw+=.15){context.yaw=yaw;context.cameraFollow(.04);assert.ok(camera.position.x>=room.minX&&camera.position.x<=room.maxX);assert.ok(camera.position.z>=room.minZ&&camera.position.z<=room.maxZ);assert.ok(camera.position.y<room.ceiling);assert.ok(civic.shells.every(o=>o.visible),'Entering never hides the walls or roof');}}
scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-30,2,-34),new THREE.Vector3(0,0,-1));assert.ok(ray.intersectObjects(civic.shells,true).length,'The inside wall has a real visible face');
console.log('Cafe service passed: native crowd construction, indoor/outdoor dining, exclusive seats, FIFO paid orders, exact till reconciliation, repeat customers, saved preparation and pickup, physical drinks, duplicate refusal, visible shells and bounded indoor cameras.');
