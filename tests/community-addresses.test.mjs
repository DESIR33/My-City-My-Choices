import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {COMMUNITY_ADDRESSES,COMMUNITY_DESTINATIONS} from '../assets/community-addresses.js';
import {COMMUNITY_HOMES,communityPoint,communityDriveway,withinRect,worldDrivable} from '../assets/world-rules.js';
import {vehicleFootprint} from '../assets/vehicle-physics.js';
import {MODEL_HOME} from '../assets/house-rules.js';
assert.equal(COMMUNITY_ADDRESSES.length,27);
assert.equal(new Set(COMMUNITY_ADDRESSES.map(a=>a.address)).size,27);
assert.equal(COMMUNITY_ADDRESSES.filter(a=>a.furnished).length,1);
for(const a of COMMUNITY_ADDRESSES){
  const h=COMMUNITY_HOMES.find(h=>h.id===a.id),d=COMMUNITY_DESTINATIONS[a.id];
  assert.equal(a.address,`${h.address} ${h.street}`);assert.equal(d.name,a.address);
  const point=a.furnished?MODEL_HOME.entry:communityPoint(h,h.w*.2,h.d/2+2.88);
  assert.deepEqual({x:d.x,z:d.z},point);
  assert.ok(Math.hypot(d.x-h.x,d.z-h.z)>h.d/2,'Guidance stops outside the closed front door');
  const drive=communityDriveway(h),shape=vehicleFootprint(d.parking.x,d.parking.z,h.heading);
  assert.ok(shape.every(p=>worldDrivable(p.x,p.z)&&withinRect(p.x,p.z,drive)),'Full car footprint fits the spare bay');
}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
let panel='';const c={COMMUNITY_ADDRESSES,show:s=>panel=s,window:null};c.window=c;vm.createContext(c);
const handler=html.match(/window\.openNeighborhoodAddresses=function\(\)\{[^\n]+/)[0];vm.runInContext(handler,c);c.openNeighborhoodAddresses();
for(const a of COMMUNITY_ADDRESSES){assert.ok(panel.includes(a.address));assert.ok(panel.includes(`setCityDestination('${a.id}')`));}
assert.match(panel,/101 Maple Grove Lane/);assert.match(panel,/unfurnished/);assert.match(html,/\.\.\.COMMUNITY_DESTINATIONS/);
assert.match(html,/onclick="openNeighborhoodAddresses\(\)"/);
console.log('Address directory: 27 unique plaques/destinations, exterior approaches, spare parking bays and actual menu links pass.');
