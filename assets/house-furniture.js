import * as THREE from 'three';
import {addHouseBake} from './house-surfaces.js';

// CC0 Poly Haven furniture that replaces simple box stand-ins in the Maple House
// once it loads (see assets/house/furniture/ATTRIBUTION.md). Budgets are triangles
// per model after tools/prepare-house-furniture.mjs simplifies them.
export const HOUSE_FURNITURE_MODELS=Object.freeze({
 dining_chair_02:{triangles:3500},
 modern_coffee_table_01:{triangles:2500},
 side_table_01:{triangles:2800},
 // Built from many small textured parts, so it simplifies only about half way.
 modern_wooden_cabinet:{triangles:12000,error:.08},
 potted_plant_02:{triangles:7000},
 potted_plant_04:{triangles:3500}
});

const patched=new WeakSet();
function bakeMaterial(m){if(!m||patched.has(m))return;patched.add(m);const previous=m.onBeforeCompile;m.onBeforeCompile=(shader,renderer)=>{previous?.call(m,shader,renderer);addHouseBake(shader);};m.customProgramCacheKey=()=>'maple-house-model:'+m.uuid;m.needsUpdate=true;}

// Fit `model` inside a stand-in group: same floor position and facing, scaled so
// its height matches and its footprint does not outgrow the stand-in by much.
// The stand-in keeps its colliders and seat points; only its visuals are hidden.
export function fitFurniture(proxy,model,{footprintSlack=1.2}={}){
 const group=proxy.group,local=new THREE.Box3(),tmp=new THREE.Box3();
 group.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
 group.traverse(m=>{if(!m.isMesh||m.userData.furnitureModel)return;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();tmp.copy(m.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));local.union(tmp);});
 const holder=model.clone(true);holder.userData.furnitureModel=true;
 const box=new THREE.Box3().setFromObject(holder,true),size=box.getSize(new THREE.Vector3()),target=local.getSize(new THREE.Vector3());
 let scale=target.y/Math.max(1e-6,size.y);scale=Math.min(scale,footprintSlack*target.x/Math.max(1e-6,size.x),footprintSlack*target.z/Math.max(1e-6,size.z));
 holder.scale.setScalar(scale);const center=box.getCenter(new THREE.Vector3());
 holder.position.set((local.min.x+local.max.x)/2-center.x*scale,local.min.y-box.min.y*scale,(local.min.z+local.max.z)/2-center.z*scale);
 const uv=proxy.bakeUv||[.5,.5];let triangles=0;
 holder.traverse(m=>{m.userData.furnitureModel=true;if(!m.isMesh)return;m.castShadow=m.receiveShadow=true;m.geometry=m.geometry.clone();const n=m.geometry.attributes.position.count,bake=new Float32Array(n*2);for(let k=0;k<n;k++)bake.set(uv,k*2);m.geometry.setAttribute('houseBakeUv',new THREE.BufferAttribute(bake,2));for(const material of [].concat(m.material))bakeMaterial(material);triangles+=(m.geometry.index?.count??n)/3;});
 for(const child of group.children)if(!child.userData.furnitureModel)child.visible=false;
 group.add(holder);return {holder,scale,triangles};
}
