import * as THREE from 'three';
import {MODEL_HOME} from './house-rules.js';
import {COMMUNITY_HOMES,communityPoint,COAST_BUILDINGS} from './world-rules.js';
import {FIRE_STATION} from './city-rules.js';
import {CLOTHING_STORE} from './wardrobe.js';

// Owner-supplied wall-bracket fire extinguisher, mounted where a real one would
// be: kitchens and garages of the furnished homes, beside each shop and café
// counter, at every hotel elevator landing and outside the fire station.
export const FIRE_EXTINGUISHER_URL='./assets/safety/fire-extinguisher.glb';
// Model space: 0.29 × 0.56 × 0.18 m, bracket plate toward -Z, 0.092 m behind the axis.
export const EXTINGUISHER_DEPTH=.092,EXTINGUISHER_HEIGHT=.563,MOUNT_HEIGHT=.65,EXTINGUISHER_VISIBLE_DISTANCE=30;

const house=(x,z)=>({x:MODEL_HOME.x+x,z:MODEL_HOME.z+z});
const home139=COMMUNITY_HOMES.find(h=>h.id==='maple-grove-20');
const hotel=COAST_BUILDINGS.find(b=>b.name==='THE FLAMINGO'&&b.height>=30);
const FLOOR_LEVELS=[.21,8.35,13.15];

// Each spot is a point on a wall face plus the face's outward normal (nx, nz).
export const FIRE_EXTINGUISHER_SPOTS=Object.freeze([
  {id:'house-101-kitchen',place:'101 Maple Grove kitchen',...house(6.59,-5),floor:.3,nx:-1,nz:0},
  {id:'house-101-utility',place:'101 Maple Grove utility garage',...house(-.91,4.7),floor:.3,nx:-1,nz:0},
  {id:'house-139-kitchen',place:'139 Willow Way kitchen',...communityPoint(home139,2.2,-home139.d/2+.25),floor:.3,nx:0,nz:home139.heading?-1:1},
  {id:'house-139-garage',place:'139 Willow Way garage',...communityPoint(home139,-home139.w/2+.25,3.6),floor:.3,nx:home139.heading?-1:1,nz:0},
  {id:'maple-cafe',place:'Maple Cafe, beside the counter',x:-19.3,z:-35.2,floor:.21,nx:-1,nz:0},
  {id:'maple-bakery',place:'Maple Bakery, beside the counter',x:-35.3,z:-93.5,floor:.21,nx:-1,nz:0},
  {id:'thread-and-sole',place:'Thread & Sole back wall',x:CLOTHING_STORE.x-2.5,z:20.3,floor:.21,nx:0,nz:1},
  {id:'fire-station',place:'Maple Fire & Rescue, between the bays',x:FIRE_STATION.x-9.5,z:FIRE_STATION.z,floor:.06,nx:-1,nz:0},
  ...(hotel?FLOOR_LEVELS.map((floor,i)=>({id:'flamingo-'+['lobby','lounge','suites'][i],place:'The Flamingo '+['lobby','sky lounge','guest floor'][i]+', between the elevators',x:hotel.x-6.2,z:hotel.z+16.3,floor,nx:0,nz:-1})):[])
]);

// World transform for a spot: bracket plate flush on the wall, bottom at MOUNT_HEIGHT.
export function extinguisherMount(spot){
  return {x:spot.x+spot.nx*EXTINGUISHER_DEPTH,y:spot.floor+MOUNT_HEIGHT,z:spot.z+spot.nz*EXTINGUISHER_DEPTH,yaw:Math.atan2(spot.nx,spot.nz)};
}

// Kid-safe fire lesson shown at every extinguisher.
export const FIRE_SAFETY_LESSON=Object.freeze({
  title:'Fire extinguisher',
  kids:'If you see smoke or fire: get out, stay out and tell an adult. Call 911 from outside. Extinguishers are for grown-ups and only for small fires.',
  adults:'Grown-ups remember PASS: Pull the pin, Aim at the base of the fire, Squeeze the handle, Sweep side to side.',
  check:'The needle on the gauge should sit in the green. The tag shows when it was last inspected.'
});

export function createFireExtinguishers({scene,spots=FIRE_EXTINGUISHER_SPOTS,visibleDistance=EXTINGUISHER_VISIBLE_DISTANCE}){
  const units=spots.map(spot=>{const m=extinguisherMount(spot),group=new THREE.Group();group.name='Fire extinguisher · '+spot.place;group.position.set(m.x,m.y,m.z);group.rotation.y=m.yaw;group.visible=false;scene.add(group);return {spot,group};});
  let model=null;
  function install(source){model=source;source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});for(const u of units){u.group.clear();u.group.add(source.clone(true));}}
  function update(p){if(!model||!p)return;const limit=visibleDistance*visibleDistance;for(const u of units){const dx=p.x-u.spot.x,dz=p.z-u.spot.z;u.group.visible=dx*dx+dz*dz<limit&&Math.abs((p.y??u.spot.floor)-u.spot.floor)<4.5;}}
  // Nearest extinguisher on the player's floor, for the fire-safety prompt.
  function nearest(p,radius=1.7){let best=null,dist=radius;for(const u of units){if(Math.abs((p.y??u.spot.floor)-u.spot.floor)>1.6)continue;const d=Math.hypot(p.x-u.spot.x,p.z-u.spot.z);if(d<dist){dist=d;best=u.spot;}}return best;}
  return {units,count:units.length,install,update,nearest,get installed(){return !!model;}};
}
