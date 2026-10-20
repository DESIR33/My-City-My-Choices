import * as THREE from 'three';
import {MAPLE_STREETS,NORTH_CITY,COAST_CITY,bridgeHeight,bridgePitch,worldDrivable} from './world-rules.js';

// Details stay inside the existing building footprints. Road fixtures are flush;
// this layer never creates new invisible blockers across doors or crossings.
export function createArchitectureDetail({scene,buildings,materials,groundHeight=()=>.06,mobile=false}){
 const chunks=new Map(),unit=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D(),meshes=[];
 const metal=new THREE.MeshStandardMaterial({name:'Brushed galvanized service metal',color:0x7e898a,metalness:.75,roughness:.43}),dark=new THREE.MeshStandardMaterial({name:'Powder coated frames',color:0x253139,metalness:.4,roughness:.55}),stone=materials.surface('stone',0xb5b3a9),roof=materials.surface('roof',0x595d5a),glass=new THREE.MeshPhysicalMaterial({name:'Recessed secondary glazing',color:0x637d86,roughness:.2,metalness:.03,clearcoat:1,ior:1.5}),paint=new THREE.MeshStandardMaterial({name:'Faded road edge paint',color:0xd2cfc0,roughness:.95}),rubber=new THREE.MeshStandardMaterial({name:'Weathered road joint',color:0x343a3a,roughness:1});
 function box(mat,x,y,z,w,h,d,heading=0,pitch=0){if(![x,y,z,w,h,d].every(Number.isFinite)||w<=0||h<=0||d<=0)return;const tile=Math.floor(x/180)+','+Math.floor(z/180),key=tile+':'+mat.uuid;if(!chunks.has(key))chunks.set(key,{mat,points:[],x:Math.floor(x/180)*180+90,z:Math.floor(z/180)*180+90});chunks.get(key).points.push({x,y:y+h/2,z,w,h,d,heading,pitch});}
 let roofUnits=0,facadePanels=0;
 buildings.forEach((b,index)=>{
  const {x,z,w,d}=b,h=b.height;if(![x,z,w,d,h].every(Number.isFinite)||h<9)return;
  const rooftop=h+(b.coastal?2.1:b.skyscraper?.46:.36),parapetY=h+.42;
  if(!b.skyscraper&&!b.coastal)for(const side of [-1,1]){box(stone,x,parapetY,z+side*(d/2-.12),w,.42,.22);box(stone,x+side*(w/2-.12),parapetY,z,.22,.42,d);}
  // Screened rooftop mechanical plant, access hatch and connected ductwork.
  const count=b.skyscraper?3:2;for(let j=0;j<count;j++){
   const ux=x-w*.22+j*Math.min(3.6,w*.24),uz=z-d*.20,uw=b.skyscraper?2.3:1.5;
   box(dark,ux,h,uz,uw+.18,rooftop-h+.17,1.65);box(metal,ux,rooftop+.17,uz,uw,1.05,1.5);box(dark,ux,rooftop+1.23,uz,uw+.1,.08,1.6);
   for(let k=0;k<6;k++)box(dark,ux,rooftop+.29+k*.13,uz+.756,uw-.18,.04,.018);
   box(metal,ux,rooftop+.15,uz+1.4,.48,.4,1.4);roofUnits++;
  }
  box(roof,x+w*.22,rooftop,z-d*.22,1.6,.22,1.9);box(metal,x+w*.22,rooftop+.22,z-d*.22,1.72,.06,2);
  // Shadow lines and separated sill/drip edges on secondary façades.
  if(!b.coastal&&!b.skyscraper&&h<32){for(const side of [-1,1])for(let y=4.6;y<h-1;y+=3.2)for(let a=-w/2+2;a<w/2-1;a+=3.4){box(dark,x+a,y-.07,z+side*(d/2+.025),1.66,1.94,.035);box(glass,x+a,y,z+side*(d/2+.048),1.36,1.68,.025);box(stone,x+a,y-.17,z+side*(d/2+.12),1.88,.12,.28);facadePanels++;}}
  // Ground-level material transitions are confined to side walls, clear of entries.
  for(const side of [-1,1]){box(stone,x+side*(w/2-.03),.22,z,.11,.45,d-.5);if(!b.coastal)box(metal,x+side*(w/2-.02),.8,z-d*.23,.10,Math.min(8,h-1),.10);}
 });
 function roadAxis(axis,fixed,from,to,crossings){for(let p=from;p<to;p+=12){if(crossings.some(c=>Math.abs(c-p)<12))continue;for(const side of [-1,1]){const x=axis==='z'?fixed+side*6.65:p,z=axis==='z'?p:fixed+side*6.65;if(!worldDrivable(x,z))continue;const y=groundHeight(x,z)+.006,pitch=axis==='z'?bridgePitch(x,z,0):0;box(paint,x,y,z,axis==='z'?.08:10,.004,axis==='z'?10:.08,0,pitch);} }
  for(let p=from+24;p<to;p+=60){if(crossings.some(c=>Math.abs(c-p)<12))continue;const x=axis==='z'?fixed:p,z=axis==='z'?p:fixed;if(!worldDrivable(x,z))continue;const y=groundHeight(x,z)+.007;
   // Flush utility access and a restrained repaired joint rather than random road debris.
   box(rubber,x,y,z,axis==='z'?13.0:.035,.004,axis==='z'?.035:13.0,0,axis==='z'?bridgePitch(x,z,0):0);
  }
 }
 for(const n of MAPLE_STREETS){roadAxis('z',n,-164,164,MAPLE_STREETS);roadAxis('x',n,-164,164,MAPLE_STREETS);}
 for(const n of NORTH_CITY.avenues)roadAxis('z',n,-1790,-1135,NORTH_CITY.streets);for(const n of NORTH_CITY.streets)roadAxis('x',n,-235,235,NORTH_CITY.avenues);
 for(const n of COAST_CITY.avenues)roadAxis('z',n,1045,2075,COAST_CITY.streets);for(const n of COAST_CITY.streets)roadAxis('x',n,-248,3,COAST_CITY.avenues);
 roadAxis('z',0,-1140,-165,[]);roadAxis('z',0,170,1040,[]);
 for(const chunk of chunks.values()){const mesh=new THREE.InstancedMesh(unit,chunk.mat,chunk.points.length);for(const [i,p] of chunk.points.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.pitch,p.heading,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.computeBoundingSphere();mesh.castShadow=chunk.mat!==paint&&chunk.mat!==rubber;mesh.receiveShadow=true;mesh.name='District architecture and road detail';mesh.userData.detailChunk={x:chunk.x,z:chunk.z};scene.add(mesh);meshes.push(mesh);}
 function update(position){const range=mobile?200:360;for(const mesh of meshes){const p=mesh.userData.detailChunk;mesh.visible=Math.hypot(p.x-position.x,p.z-position.z)<range;}}
 update({x:-83,z:-22});return {meshes,roofUnits,facadePanels,update};
}
