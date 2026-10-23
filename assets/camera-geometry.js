import * as THREE from 'three';
// Snapshot individual world-space meshes BEFORE architectural instancing. Batched
// block-sized bounds would wrongly fill doors and courtyards. No per-frame rays.
export function cameraArchitectureBoxes(scene){const boxes=[];scene.updateMatrixWorld(true);
 function visit(node,dynamic=false,architecture=false){if(node.userData?.cameraIgnore||node.userData?.dynamicHouse)return;dynamic=dynamic||!!(node.userData?.character||node.userData?.vehicleId||node.userData?.twoWheeler);architecture=architecture||!!node.userData?.staticArchitecture;if(dynamic)return;
  // Instanced batches, merged meshes and district groups carry world-space source boxes.
  const batched=Array.isArray(node.userData?.architectureBoxes);if(batched)for(const b of node.userData.architectureBoxes)boxes.push({...b});
  if(node.isMesh&&!node.isInstancedMesh&&!batched&&(architecture||node.castShadow||node.geometry?.type==='BoxGeometry')){const box=new THREE.Box3().setFromObject(node,true),size=new THREE.Vector3();box.getSize(size);if(size.y>.03&&size.x>0&&size.z>0&&Math.max(size.x,size.z)<=300)boxes.push({minX:box.min.x,maxX:box.max.x,minY:box.min.y,maxY:box.max.y,minZ:box.min.z,maxZ:box.max.z});}
  for(const child of node.children||[])visit(child,dynamic,architecture);
 }visit(scene);return boxes;
}
