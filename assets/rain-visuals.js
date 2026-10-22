import * as THREE from 'three';
// A fixed camera-local pool: one draw call, no particles or materials per frame.
export function createRainVisuals({scene,mobile=false,shelter=()=>0}){
 const count=mobile?240:700,positions=new Float32Array(count*6),seeds=new Float32Array(count*3);let seed=92491,time=0;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<seeds.length;i++)seeds[i]=random();
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.LineBasicMaterial({color:0xb5cbd3,transparent:true,opacity:0,depthWrite:false,fog:true});
 const mesh=new THREE.LineSegments(geometry,material);mesh.name='Local rain';mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
 function update(dt,{position,intensity=0,visible=true}={}){if(!position)return;time+=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));const strength=Math.max(0,Math.min(1,Number(intensity)||0));mesh.visible=visible&&strength>.015;if(!mesh.visible)return;const wrap=(n,d)=>(n%d+d)%d;const active=Math.floor(count*strength),top=position.y+16,radius=24;material.opacity=.3+.18*strength;
  geometry.setDrawRange(0,active*2);
  for(let i=0;i<active;i++){const j=i*3,k=i*6,x=position.x+wrap(seeds[j]*48+time*.7-position.x+radius,48)-radius,z=position.z+wrap(seeds[j+1]*48+time*.25-position.z+radius,48)-radius,y=top-wrap(seeds[j+2]*28+time*(15+strength*8)+top,28),floor=shelter(x,z)+.015,low=Math.max(floor,y-.55);positions[k]=x;positions[k+1]=y>=floor?low:floor;positions[k+2]=z;positions[k+3]=y>=floor?x+.045:x;positions[k+4]=y>=floor?y:floor;positions[k+5]=y>=floor?z+.016:z;}
  geometry.attributes.position.needsUpdate=true;
 }
 return {mesh,count,update,shelterHeight:shelter,dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
