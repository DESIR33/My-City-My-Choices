import * as THREE from 'three';
import {CLOTHES,CLOTHING_STORE} from './wardrobe.js';
export function createClothingWorld({scene,visualKit,obstacles,buildings,groundSurfaces,characters}){
 const root=new THREE.Group();root.name='Thread & Sole';scene.add(root);
 const wood=new THREE.MeshStandardMaterial({color:0x8b6750}),cream=new THREE.MeshStandardMaterial({color:0xd8cab4,side:THREE.DoubleSide}),metal=new THREE.MeshStandardMaterial({color:0x294b49,metalness:.45,roughness:.5}),glass=new THREE.MeshPhysicalMaterial({color:0x94b9b5,transparent:true,opacity:.22,roughness:.12,side:THREE.DoubleSide});
 function box(mat,x,y,z,w,h,d,solid=false){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);m.castShadow=m.receiveShadow=true;root.add(m);if(solid)obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});return m;}
 box(visualKit.concrete,42,.08,30,14,.13,20);groundSurfaces.push({minX:35,maxX:49,minZ:20,maxZ:40,top:.21});
 for(const side of [-1,1]){box(cream,42+side*6.85,.21,30,.3,4.2,20,true);box(glass,42+side*4.15,.21,40,5.45,3.4,.12,true);}
 box(cream,42,.21,20.15,14,4.2,.3,true);box(metal,42,3.65,40,14,.55,.22);box(cream,42,4.4,30,14.4,.25,20.4);
 const labelCanvas=document.createElement('canvas');labelCanvas.width=1024;labelCanvas.height=128;const q=labelCanvas.getContext('2d');q.fillStyle='#1c423e';q.fillRect(0,0,1024,128);q.fillStyle='#eadbb6';q.font='bold 54px Arial';q.textAlign='center';q.fillText('THREAD & SOLE • CLOTHES & FITTING',512,80);const tex=new THREE.CanvasTexture(labelCanvas);tex.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(11,.9),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));sign.position.set(42,3.5,40.15);root.add(sign);
 for(const z of [27,34]){box(wood,37,.21,z,1.5,.16,4,true);for(const dz of [-1.7,1.7])box(metal,37,.37,z+dz,.07,1.8,.07);box(metal,37,2.1,z,.07,.07,3.5);for(let i=0;i<5;i++){const item=CLOTHES[1+i],mat=new THREE.MeshStandardMaterial({color:item.color});box(mat,37,1.25,z-1.3+i*.65,.66,.65,.12);for(const side of [-1,1])box(mat,37+side*.38,1.6,z-1.3+i*.65,.22,.25,.12);}}
 box(wood,45,.21,22,5,1.05,1.15,true);box(cream,45,1.26,22,5.15,.08,1.3);box(metal,46,1.34,22,.45,.3,.35);
 // Full-length fitting mirror beside the open central aisle.
 box(metal,48.68,.5,29,.12,2.4,2.1);box(new THREE.MeshStandardMaterial({color:0x9db5b8,metalness:.8,roughness:.15}),48.6,.6,29,.035,2.2,1.9);
 for(const z of [29,35]){box(wood,46.8,.21,z,2,.12,2,true);const m=new THREE.MeshStandardMaterial({color:z===29?0x9274ab:0x3b8591});box(m,46.8,1,z,.56,.68,.3);const head=new THREE.Mesh(new THREE.SphereGeometry(.17,12,8),cream);head.position.set(46.8,1.92,z);root.add(head);for(const side of [-1,1]){box(m,46.8+side*.35,1.31,z,.2,.37,.25);box(metal,46.8+side*.14,.33,z,.18,.68,.24);}}
 const clerk=characters.create({x:45,z:20.9,model:'mom',customizable:true});clerk.name='Thread & Sole cashier';characters.setAppearance(clerk,{shirt:0x294b49,skin:0xb57955,hair:0x372c23,style:'bun'});
 const lights=[];for(const z of [26,35]){box(new THREE.MeshBasicMaterial({color:0xffe4bd}),42,4.05,z,1.7,.06,.45);const l=new THREE.PointLight(0xffe3bb,24,16,2);l.position.set(42,3.6,z);l.visible=false;root.add(l);lights.push(l);}
 buildings.push({x:42,z:30,w:14,d:20,height:4.65,shop:true});
 const inside=p=>p.x>35.5&&p.x<48.5&&p.z>20.5&&p.z<40;
 return {root,clerk,inside,interior:p=>inside(p)?{minX:35.65,maxX:48.35,minZ:20.55,maxZ:39.75,ceiling:4.4}:null,update(p){for(const l of lights)l.visible=inside(p);},...CLOTHING_STORE};
}
