import * as THREE from 'three';
import {SKYVIEW_PATHS} from './world-rules.js';

// A low-cost public garden, with one lawn mesh and shared stone/plant buffers.
export function createSkyviewLandscape({parent,cube,C,visualKit,obstacles,groundSurfaces}){
  const root=new THREE.Group();root.name='Skyview gardens';parent.add(root);
  const stone=visualKit.masonry?.(0xc7c0ad)||new THREE.MeshStandardMaterial({color:0xc7c0ad,roughness:.92}),earth=new THREE.MeshStandardMaterial({color:0x625341,roughness:1}),edge=new THREE.MeshStandardMaterial({color:0xa79e87,roughness:.9});
  const lawn=new THREE.PlaneGeometry(260,206,24,20);lawn.rotateX(-Math.PI/2);lawn.translate(910,-.005,-1867);
  const colors=[],p=lawn.attributes.position,base=C.grass.color||new THREE.Color(0x53754a),green=new THREE.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),blend=Math.min(1,Math.max(0,Math.min(x-780,1040-x,z+1970,-1764-z)/14));green.copy(base).lerp(new THREE.Color(0x66835a),blend*(.35+.12*Math.sin(x*.08)*Math.cos(z*.06)));colors.push(green.r,green.g,green.b);}
  lawn.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const lawnMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:C.grass.map,normalMap:C.grass.normalMap,roughnessMap:C.grass.roughnessMap,roughness:1});lawnMaterial.onBeforeCompile=C.grass.onBeforeCompile;lawnMaterial.customProgramCacheKey=C.grass.customProgramCacheKey;const grass=new THREE.Mesh(lawn,lawnMaterial);grass.receiveShadow=true;root.add(grass);
  for(const r of SKYVIEW_PATHS){cube(root,(r.minX+r.maxX)/2,-.015,(r.minZ+r.maxZ)/2,r.maxX-r.minX,.045,r.maxZ-r.minZ,stone,false);groundSurfaces?.push({...r,top:.03,kind:'concrete',airport:true});}
  const ring=new THREE.Mesh(new THREE.RingGeometry(32,44,72),stone);ring.rotation.x=-Math.PI/2;ring.position.set(958,.03,-1878);ring.receiveShadow=true;root.add(ring);
  const joints=[];for(let i=0;i<72;i++){const a=i*Math.PI/36;for(const r of [32,44])joints.push(958+Math.cos(a)*r,.034,-1878+Math.sin(a)*r);}
  const jointGeometry=new THREE.BufferGeometry();jointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(joints,3));root.add(new THREE.LineSegments(jointGeometry,new THREE.LineBasicMaterial({color:0xa89f89})));
  const beds=[{x:813,z:-1808,rx:16,rz:9},{x:855,z:-1808,rx:13,rz:8},{x:1008,z:-1810,rx:15,rz:10},{x:811,z:-1935,rx:17,rz:13},{x:853,z:-1950,rx:16,rz:9},{x:1008,z:-1943,rx:15,rz:12}];
  const leaves=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,5),new THREE.MeshStandardMaterial({color:0x52734a,roughness:1}),beds.length*7),dummy=new THREE.Object3D();let n=0;
  for(const b of beds){
    const mound=new THREE.Mesh(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),earth);mound.position.set(b.x,.01,b.z);mound.scale.set(b.rx,.5,b.rz);root.add(mound);
    const border=new THREE.Mesh(new THREE.RingGeometry(1,1.04,32),edge);border.rotation.x=-Math.PI/2;border.position.set(b.x,.025,b.z);border.scale.set(b.rx,b.rz,1);root.add(border);
    for(let i=0;i<7;i++){const a=i*2.4;dummy.position.set(b.x+Math.cos(a)*b.rx*.58,.3,b.z+Math.sin(a)*b.rz*.55);dummy.scale.set(1.3,.65,1.2);dummy.updateMatrix();leaves.setMatrixAt(n++,dummy.matrix);}
    obstacles.push({minX:b.x-b.rx,maxX:b.x+b.rx,minZ:b.z-b.rz,maxZ:b.z+b.rz,minY:0,maxY:.7,kind:'skyview-bed',airport:true});
    if(visualKit.treeModel)root.add(visualKit.treeModel(b.x,b.z,1.05));
  }
  leaves.receiveShadow=true;root.add(leaves);
  const wood=new THREE.MeshStandardMaterial({color:0x8f7152,roughness:.8}),metal=new THREE.MeshStandardMaterial({color:0x3e4d46,roughness:.65});
  const benches=[{x:922,z:-1912},{x:994,z:-1908},{x:858,z:-1827},{x:994,z:-1825}];
  for(const b of benches){cube(root,b.x,.44,b.z,3.6,.12,1,wood,false);cube(root,b.x,.56,b.z-.44,3.6,.58,.12,wood,false);for(const s of [-1,1])cube(root,b.x+s*1.3,0,b.z,.12,.44,.8,metal,false);obstacles.push({minX:b.x-1.8,maxX:b.x+1.8,minZ:b.z-.55,maxZ:b.z+.55,minY:0,maxY:1.2,kind:'skyview-bench',airport:true});}
  return {root,paths:SKYVIEW_PATHS,beds,benches};
}
