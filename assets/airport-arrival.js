import * as THREE from 'three';
import {AIRPORT} from './world-rules.js';

export function createAirportArrival({root,exterior,box,sign,camBox,road,pave,flatMark,M,C,parkedCar,mobile,obstacles}){
  const A=AIRPORT,H=A.hall,terminal=new THREE.Group();terminal.name='Northstar glazed terminal';exterior.add(terminal);
  const add=(m,x,y,z,w,h,d)=>box(m,x,y,z,w,h,d,0,terminal);
  // Every facade/window/camera box leaves the 12 m entrance completely clear.
  for(const [a,b] of [[H.minX,A.entrance.minX],[A.entrance.maxX,H.maxX]]){
    add(M.glass,(a+b)/2,0,H.maxZ,b-a,14,.12);camBox((a+b)/2,0,H.maxZ,b-a,14,.2);
    add(M.cream,(a+b)/2,0,H.maxZ+.15,b-a,.45,.35);
    for(let x=a;x<=b;x+=4)add(M.mullion,x,0,H.maxZ+.1,.12,14,.28);
    for(const y of [4.3,9.2,14])add(M.mullion,(a+b)/2,y,H.maxZ+.1,b-a,.13,.28);
  }
  add(M.glass,1150,4.3,H.maxZ,12,9.7,.12);add(M.mullion,1150,4.1,H.maxZ+.1,12,.2,.35);
  for(const x of [1143.6,1156.4])add(M.wood,x,0,H.maxZ+.4,.5,8,.7);
  for(const x of [H.minX,H.maxX]){add(M.cream,x,0,-2023.5,.6,14,77);camBox(x,0,-2023.5,.6,14,77);}
  for(const [x,w] of [[1091,62],[1150,62],[1209,62]]){add(M.cream,x,14.4,-2024,w,.65,86);add(M.steel,x,15.05,-2024,w,.18,86);}
  for(const [r,height] of [[A.corridor,6],[A.lounge,8]]){add(M.cream,(r.minX+r.maxX)/2,height+.32,(r.minZ+r.maxZ)/2,r.maxX-r.minX+.8,.45,r.maxZ-r.minZ+.8);camBox((r.minX+r.maxX)/2,height+.32,(r.minZ+r.maxZ)/2,r.maxX-r.minX+.8,.45,r.maxZ-r.minZ+.8);}
  add(M.glass,(A.lounge.minX+A.lounge.maxX)/2,0,A.lounge.minZ,A.lounge.maxX-A.lounge.minX,8,.1);
  camBox((A.lounge.minX+A.lounge.maxX)/2,0,A.lounge.minZ,A.lounge.maxX-A.lounge.minX,8,.1);
  for(let x=A.lounge.minX;x<=A.lounge.maxX;x+=4)add(M.mullion,x,0,A.lounge.minZ-.08,.14,8,.25);
  add(M.wood,1150,14.1,-1982,185,.25,13);add(M.cream,1150,8.4,-1979,31,.4,15);
  sign('NORTHSTAR  AIRPORT',1150,10.2,-1979.1,31,2.2,0,{bg:'#152c36',font:100},terminal);
  sign('DEPARTURES  ·  AUTOMATIC ENTRANCE',1150,5.5,-1983.9,11,1,0,{bg:'#196b69',font:55},terminal);
  const leaves=[],glass=new THREE.MeshStandardMaterial({color:0x8ebac1,roughness:.2,metalness:.1,transparent:true,opacity:.25,depthWrite:false});
  for(const side of [-1,1]){const leaf=new THREE.Group();leaf.userData.cameraIgnore=true;leaf.position.set(1150+side*3,0,H.maxZ+.05);const pane=new THREE.Mesh(new THREE.BoxGeometry(5.9,4,.08),glass);pane.position.y=2;leaf.add(pane);for(const y of [.12,2.1,3.95]){const rail=new THREE.Mesh(new THREE.BoxGeometry(6,.09,.12),M.mullion);rail.position.y=y;leaf.add(rail);}terminal.add(leaf);leaves.push({leaf,side});}
  let opening=0;function update(dt,p){const target=p&&Math.abs(p.x-1150)<13&&Math.abs(p.z-H.maxZ)<14?1:0;opening+=Math.max(-dt*1.8,Math.min(dt*1.8,target-opening));for(const {leaf,side} of leaves)leaf.position.x=1150+side*(3+opening*6.1);}
  // Two clearly divided lots, marked bays, central walking spine and traffic aisles.
  const spaces=[],lots=[A.parking,A.overflowParking];
  for(const [lotIndex,r] of lots.entries()){
    road((r.minX+r.maxX)/2,(r.minZ+r.maxZ)/2,r.maxX-r.minX,r.maxZ-r.minZ);
    const spine=lotIndex?1545:1150;
    for(const z of [-1790,-1810,-1850,-1870,-1910,-1930])for(let x=r.minX+5;x<r.maxX-4;x+=3.1){
      if(Math.abs(x-spine)<7||(lotIndex&&Math.abs(x-1390)<7))continue;spaces.push({x,z,heading:z%60===-10?Math.PI:0,lot:lotIndex+1});
      flatMark(M.white,x-1.5,z,.1,5.5);flatMark(M.white,x,z-2.75,3,.1);
    }
    pave(spine,(r.minZ+r.maxZ)/2,5,r.maxZ-r.minZ,-.06);
    sign(['P'+(lotIndex+1)+'  PUBLIC PARKING','TERMINAL  ↓'],spine,3.8,-1770,12,2.1,0,{bg:'#196b69',font:72});
    for(const side of [-1,1])box(M.steel,spine+side*6,0,-1770,.16,3.8,.16);
    for(const z of [-1828,-1888])for(const x of [r.minX+3,r.maxX-3]){box(M.cream,x,0,z,2.8,.4,9);box(M.plant,x,.4,z,2.3,.6,8);obstacles.push({minX:x-1.4,maxX:x+1.4,minZ:z-4.5,maxZ:z+4.5,minY:0,maxY:1,kind:'airport-parking-planter',airport:true});}
  }
  // The east lot has a continuous driveway from Airport Boulevard, plus a
  // protected south pedestrian walk connecting both lots to departures.
  road(1390,-1761,12,22);pave(1415,-1948,270,6,.0);pave(1264,-1948,32,6,.0);
  for(let z=-1951;z<=-1945;z+=1.2)flatMark(M.white,1248,z,14,.55);
  for(let x=1144;x<=1156;x+=1.5)flatMark(M.white,x,A.loop.curb,.7,13);
  // Keep the previous parked-car budget, spreading it between the two lots.
  if(parkedCar){const budget=mobile?6:18;for(let i=0;i<budget;i++){const lot=i%3===0?2:1,available=spaces.filter(s=>s.lot===lot),slot=available[(i*13+11)%available.length];parkedCar(slot.x,slot.z,slot.heading);}}
  sign(['✈  NORTHSTAR AIRPORT  →','DEPARTURES  ·  P1 / P2'],450,7.5,-1750,27,2.6,-Math.PI/2,{bg:'#152c36',font:80});
  for(const z of [-1738,-1762])box(M.steel,450,0,z,.25,7.4,.25);box(M.steel,450,7.4,-1750,.3,.3,24);
  return {terminal,spaces,lots,doors:leaves,update,get opening(){return opening;}};
}
