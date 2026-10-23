import * as THREE from 'three';
import {communityPoint} from './world-rules.js';

// The owner-supplied "Full set rosa" living room (sectional with chaise, armchair,
// coffee table, end table with lamp, side table and rug) furnishes every other
// community home. Colliders exist from the first frame; the model streams in later.
export const SOFA_SET_URL='./assets/sofa-set/rosa-living.glb';
// Mirrors assets/sofa-set/layout.json (written by tools/prepare-sofa-set.mjs), in metres.
export const SOFA_SET_LAYOUT=Object.freeze({
  bounds:{min:[-3.501,-.005,-1.652],max:[2.373,1.057,2.126]},
  pieces:{sectional:{min:[-1.746,-.001,-1.652],max:[1.258,.93,-.659]},chaise:{min:[.173,-.005,-1.513],max:[1.466,.542,.016]},armchair:{min:[-3.501,0,1.181],max:[-2.591,.852,1.96]},'side-table':{min:[1.955,.006,-1.352],max:[2.373,.428,.548]},'coffee-table':{min:[-1.557,.009,.678],max:[-.042,.634,1.6]},'end-table':{min:[-2.327,.003,-1.382],max:[-1.927,1.057,-.967]}}
});
// 101 is the separately furnished landmark; 139 is added after the alternation.
export const SOFA_SET_SKIP=Object.freeze(['maple-grove-1','maple-grove-20']);
export const SOFA_FLOOR=.3,SOFA_VISIBLE_DISTANCE=34;

// 139 Willow Way is fully furnished, so its living room uses the same set as well.
export const SOFA_SET_EXTRA=Object.freeze(['maple-grove-20']);
export function sofaSetHomes(homes){return [...homes.filter(h=>!SOFA_SET_SKIP.includes(h.id)).filter((h,i)=>i%2===0),...homes.filter(h=>SOFA_SET_EXTRA.includes(h.id))];}

// House-local placement: against the right-hand (non-garage) wall, sofa facing the
// street windows, leaving 1.7 m clear inside the front door.
export function sofaSetPlacement(home,layout=SOFA_SET_LAYOUT){
  const {bounds}=layout,x=home.w/2-.4-bounds.max[0],z=home.d/2-1.7-bounds.max[2];
  const pieces=Object.entries(layout.pieces).map(([id,p])=>({id,x:x+(p.min[0]+p.max[0])/2,z:z+(p.min[2]+p.max[2])/2,w:p.max[0]-p.min[0],d:p.max[2]-p.min[2],minY:SOFA_FLOOR+Math.max(0,p.min[1]),maxY:SOFA_FLOOR+p.max[1]}));
  return {x,z,minX:x+bounds.min[0],maxX:x+bounds.max[0],minZ:z+bounds.min[2],maxZ:z+bounds.max[2],pieces};
}

export function createSofaSets({scene,homes,solid,visibleDistance=SOFA_VISIBLE_DISTANCE}){
  const sets=sofaSetHomes(homes).map(home=>{
    const place=sofaSetPlacement(home),origin=communityPoint(home,place.x,place.z),group=new THREE.Group();
    group.name='Sofa set '+home.address+' '+home.street;group.position.set(origin.x,SOFA_FLOOR,origin.z);group.rotation.y=home.heading;group.visible=false;scene.add(group);
    const colliders=place.pieces.map(p=>Object.assign(solid(home,p.x,p.z,p.w,p.d,'community-furniture'),{houseId:home.id,fixtureId:'sofa-set-'+p.id,minY:p.minY,maxY:p.maxY}));
    return {home,group,place,colliders,center:communityPoint(home,0,0)};
  });
  let model=null;
  function install(source){
    model=source;source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    for(const set of sets){set.group.clear();set.group.add(source.clone(true));}
  }
  // Interiors are closed shells, so far sets are hidden instead of drawn and shadowed.
  function update(p){if(!model||!p)return;const limit=visibleDistance*visibleDistance;for(const set of sets){const dx=p.x-set.center.x,dz=p.z-set.center.z;set.group.visible=dx*dx+dz*dz<limit;}}
  return {sets,count:sets.length,install,update,get installed(){return !!model;}};
}
