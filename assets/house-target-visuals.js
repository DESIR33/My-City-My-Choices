import * as THREE from 'three';
import {MODEL_HOME as H,houseInside,onHouseStairs} from './house-rules.js';
import {houseGuideFloor} from './house-guide.js';

const targets=new WeakMap();
const axes=[['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']];
const finite=p=>!!p&&[p.x,p.y,p.z].every(Number.isFinite);
// Exact bounded segment/AABB checks use the household collision snapshots,
// including live door leaves. No scene traversal or GPU picking is needed.
function intersects(a,b,box){
 let enter=0,leave=1;
 for(const [key,minKey,maxKey] of axes){const min=box[minKey],max=box[maxKey];
  if(!Number.isFinite(min)||!Number.isFinite(max))return false;
  const delta=b[key]-a[key];
  if(Math.abs(delta)<1e-8){if(a[key]<min||a[key]>max)return false;continue;}
  let lo=(min-a[key])/delta,hi=(max-a[key])/delta;if(lo>hi)[lo,hi]=[hi,lo];
  enter=Math.max(enter,lo);leave=Math.min(leave,hi);if(enter>leave)return false;
 }
 return leave>.001&&enter<.999;
}
export function houseTargetPoint(home,guide,position,camera,{paused=false,mounted=false,seated=false,focusView=false}={}){
 if(paused||mounted||seated||focusView||!Array.isArray(home?.actions)||!Array.isArray(home?.colliders)||!finite(position)||!finite(camera)||!houseInside(position,.12)||onHouseStairs(position))return null;
 if(!targets.has(home))targets.set(home,new Map(home.actions.filter(a=>a.kind!=='door').map(a=>[a.id,a])));
 const target=targets.get(home).get(guide?.targetId);
 if(!finite(target)||!houseInside(target,.12)||target.floor!==houseGuideFloor(position)||Math.abs(target.y-position.y)>.45||Math.hypot(target.x-position.x,target.z-position.z)>6)return null;
 const ceiling=home.interior?.(position)?.ceiling??(target.floor?H.ceiling:3.24);
 if(camera.y<target.y+.08||camera.y>ceiling-.02)return null;
 const end={x:target.x,y:target.y+.15,z:target.z},eye={x:position.x,y:position.y+.9,z:position.z};
 if(home.colliders.some(box=>intersects(eye,end,box)||intersects(camera,end,box)))return null;
 return {x:target.x,y:target.y+.035,z:target.z};
}
export function createHouseTargetVisuals({scene}){
 const root=new THREE.Group();root.name='Selected household object approach';root.userData.cameraIgnore=true;root.visible=false;
 const material=new THREE.MeshBasicMaterial({color:0x67e5cf,transparent:true,opacity:.78,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false});
 const ring=new THREE.Mesh(new THREE.RingGeometry(.24,.3,32),material);ring.rotation.x=-Math.PI/2;
 const diamond=new THREE.Mesh(new THREE.OctahedronGeometry(.085,0),material);diamond.position.y=.24;
 for(const mesh of [ring,diamond]){mesh.userData.cameraIgnore=true;mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);}
 scene.add(root);let disposed=false;
 return {root,update(home,guide,position,camera,options){const point=!disposed&&houseTargetPoint(home,guide,position,camera,options);root.visible=!!point;if(point)root.position.set(point.x,point.y,point.z);return root.visible;},dispose(){if(disposed)return;disposed=true;root.visible=false;root.removeFromParent();ring.geometry.dispose();diamond.geometry.dispose();material.dispose();}};
}
