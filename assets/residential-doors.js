import * as THREE from 'three';
import {communityPoint} from './world-rules.js';

// Moving door parts share a handful of instance batches across the neighborhood.
// They never enter the static architecture merge or fill its camera doorways.
export function createResidentialDoors({scene,obstacles}) {
  const doors=[],parts=[],batches=[];
  const unit=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),bounds=new THREE.Box3();
  const metal=new THREE.MeshStandardMaterial({color:0xa98e5d,roughness:.32,metalness:.65});
  const garageMaterial=new THREE.MeshStandardMaterial({color:0xc9c9c0,roughness:.8});
  const seamMaterial=new THREE.MeshStandardMaterial({color:0x9d9f96,roughness:.8});
  const glass=new THREE.MeshStandardMaterial({color:0x657f83,roughness:.24,metalness:.2});
  function part(door,x,y,z,w,h,d,material){
    const local=new THREE.Matrix4().compose(new THREE.Vector3(x,y-(door.type==='garage'?door.height:0),z),new THREE.Quaternion(),new THREE.Vector3(w,h,d));
    const p={door,local,material};parts.push(p);door.parts.push(p);return p;
  }
  function add(home,type,{x,z,width=1.7,height=2.5,material}) {
    const anchor=communityPoint(home,x-width/2,z),center=communityPoint(home,x,z);
    const pivot=new THREE.Object3D();pivot.position.set(anchor.x,.3,anchor.z);pivot.rotation.y=home.heading;
    const collider={homeId:home.id,houseId:home.id,dynamicDoor:true,kind:'residential-door',minY:.3,maxY:.3+height};obstacles.push(collider);
    const door={id:home.id+':'+type,home,type,width,height,x,z,center,pivot,collider,parts:[],open:false,amount:0,swing:type==='rear'?-1:1};doors.push(door);
    door.leaf=part(door,width/2,height/2,0,width,height,.09,type==='garage'?garageMaterial:material);
    if(type==='garage'){
      for(let y=.3;y<height;y+=.38)part(door,width/2,y,.055,width-.06,.025,.025,seamMaterial);
      for(let i=0;i<4;i++)part(door,(i+.5)*width/4,height-.34,.058,width/4-.22,.28,.025,glass);
    }else{
      part(door,width/2,height*.70,.058,width*.52,.68,.025,glass);
      for(const side of [-1,1])part(door,width-.18,1.12,side*.075,.045,.15,.055,metal);
    }
    sync(door);return door;
  }
  function sync(door){
    door.pivot.position.y=.3+(door.type==='garage'?door.height:0);
    door.pivot.rotation.set(door.type==='garage'?door.amount*Math.PI/2:0,door.home.heading+(door.type==='garage'?0:door.amount*door.swing*Math.PI/2),0,'YXZ');door.pivot.updateMatrixWorld(true);
    matrix.multiplyMatrices(door.pivot.matrixWorld,door.leaf.local);bounds.copy(unit.boundingBox||(unit.computeBoundingBox(),unit.boundingBox)).applyMatrix4(matrix);
    Object.assign(door.collider,{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,minY:bounds.min.y,maxY:bounds.max.y});
    for(const p of door.parts)if(p.batch){matrix.multiplyMatrices(door.pivot.matrixWorld,p.local);p.batch.setMatrixAt(p.index,matrix);p.batch.instanceMatrix.needsUpdate=true;}
  }
  function finalize(){
    const groups=new Map();for(const p of parts){if(!groups.has(p.material))groups.set(p.material,[]);groups.get(p.material).push(p);}
    for(const [material,list] of groups){const batch=new THREE.InstancedMesh(unit,material,list.length);batch.name='Working neighborhood doors';batch.castShadow=batch.receiveShadow=true;batch.frustumCulled=false;batch.userData.dynamicHouse=true;batch.userData.cameraIgnore=true;list.forEach((p,i)=>{p.batch=batch;p.index=i;});scene.add(batch);batches.push(batch);}
    for(const door of doors)sync(door);
  }
  function local(home,p){const sign=home.heading===0?1:-1;return {x:(p.x-home.x)*sign,z:(p.z-home.z)*sign};}
  function target(door,p){const q=local(door.home,p),x=Math.max(door.x-door.width/2+.18,Math.min(door.x+door.width/2-.18,q.x));return {...communityPoint(door.home,x,door.z),y:.3};}
  function clear(door,p,end){
    const n=Math.max(1,Math.ceil(Math.hypot(p.x-end.x,p.z-end.z)/.15));
    for(let i=0;i<=n;i++){const x=p.x+(end.x-p.x)*i/n,z=p.z+(end.z-p.z)*i/n;
      if(obstacles.some(o=>o!==door.collider&&!o.vehicleOnly&&(o.homeId===door.home.id||o.houseId===door.home.id)&&(o.minY==null||o.minY<1.85&&o.maxY>.38)&&x>o.minX+.01&&x<o.maxX-.01&&z>o.minZ+.01&&z<o.maxZ-.01))return false;
    }return true;
  }
  function available(door,p){const point=target(door,p);return Math.abs((p.y||0)-.3)<1.35&&Math.hypot(point.x-p.x,point.z-p.z)<3.2&&clear(door,p,point);}
  function label(door){return (door.open?'Close ':'Open ')+(door.type==='garage'?'garage':door.type==='rear'?'patio door':'front door');}
  function nearest(p){return doors.filter(d=>available(d,p)).map(door=>({kind:'communityDoor',id:door.id,door,...target(door,p),radius:3.2,title:label(door)+' · '+door.home.address+' '+door.home.street,actionLabel:door.open?'Close '+(door.type==='garage'?'garage':'door'):'Open '+(door.type==='garage'?'garage':'door')})).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;}
  function inSweep(door,p){const q=local(door.home,p),nearY=(p.y||0)<door.height+.5,dz=q.z-door.z;return nearY&&q.x>door.x-door.width/2-.5&&q.x<door.x+door.width/2+.5&&(door.type==='garage'?dz<.7&&dz>-door.height-.5:Math.abs(dz)<door.width+.5);}
  function act(id,p){const door=doors.find(d=>d.id===id);if(!door||!available(door,p))return {ok:false,message:'Walk up to the door to use it.'};
    if(door.open&&inSweep(door,p))return {ok:false,message:'Step clear of the doorway before closing it.'};
    if(!door.open&&door.type!=='garage'){const q=local(door.home,p);door.swing=q.z>=door.z?1:-1;}
    door.open=!door.open;return {ok:true,message:door.open?'Door opened · '+door.home.address+' '+door.home.street:'Door closed.'};
  }
  function update(dt,p){for(const door of doors){if(!door.open&&door.amount>.02&&p&&inSweep(door,p))door.open=true;const goal=door.open?1:0;if(Math.abs(goal-door.amount)<.001){if(door.amount===goal)continue;door.amount=goal;}else door.amount=THREE.MathUtils.damp(door.amount,goal,9,Math.min(.1,dt));sync(door);}}
  return {doors,batches,add,finalize,nearest,act,update};
}
