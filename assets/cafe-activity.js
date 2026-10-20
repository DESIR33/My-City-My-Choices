import * as THREE from 'three';
import {CAFE_MENU,progressCafeOrder,payCafeCustomer} from './city-rules.js';

// The cashier owns one FIFO service queue. NPC wallets and the player's saved ticket
// use the same menu prices; only the player's purchases affect their personal budget.
export function createCafeActivity({scene,characters,civicWorld,onReady=()=>{}}){
  const cream=new THREE.MeshStandardMaterial({color:0xf5e6ce,roughness:.65}),coffee=new THREE.MeshStandardMaterial({color:0x4c2817}),steel=new THREE.MeshStandardMaterial({color:0x8eaaa8,metalness:.7,roughness:.3}),green=new THREE.MeshStandardMaterial({color:0x174c46}),bread=new THREE.MeshStandardMaterial({color:0xc58a45});
  const root=new THREE.Group();root.name='Maple Cafe service';scene.add(root);
  function box(parent,material,x,y,z,w,h,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function cup(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.105,.075,.19,12),cream);g.add(body);const liquid=new THREE.Mesh(new THREE.CircleGeometry(.088,12),coffee);liquid.rotation.x=-Math.PI/2;liquid.position.y=.097;g.add(liquid);const handle=new THREE.Mesh(new THREE.TorusGeometry(.065,.018,6,12),cream);handle.position.x=.105;g.add(handle);return g;}
  function meal(){const g=new THREE.Group(),plate=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.025,16),cream);g.add(plate);box(g,bread,0,.065,0,.22,.09,.18);return g;}
  box(root,steel,-25.5,1.75,-39.45,1.6,.64,.65);box(root,green,-25.5,2.09,-39.45,1.65,.13,.7);
  for(const x of [-25.85,-25.2]){box(root,steel,x,1.43,-39.05,.06,.28,.2);box(root,coffee,x,1.295,-39.05,.035,.15,.035);}
  box(root,steel,-25.5,1.33,-39.04,1.5,.07,.55);box(root,green,-27.25,1.62,-39.1,.38,.6,.4);
  const prepCup=cup();prepCup.position.set(-25.85,1.4,-39.05);root.add(prepCup);
  const readyCup=cup();readyCup.position.set(-26.5,1.47,-38.45);readyCup.visible=false;root.add(readyCup);
  const readyMeal=meal();readyMeal.position.copy(readyCup.position);readyMeal.visible=false;root.add(readyMeal);
  box(root,green,-26.5,1.35,-38.45,.8,.04,.5);
  const steam=new THREE.Group();for(let i=0;i<3;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,6,4),new THREE.MeshBasicMaterial({color:0xe9e6dc,transparent:true,opacity:.3,depthWrite:false}));steam.add(m);}root.add(steam);steam.position.set(-25.85,1.55,-39.05);
  const boardCanvas=document.createElement('canvas');boardCanvas.width=768;boardCanvas.height=192;const ctx=boardCanvas.getContext('2d'),texture=new THREE.CanvasTexture(boardCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const board=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.95),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));board.position.set(-26.2,2.85,-40.72);root.add(board);
  let lastBoard='';function showBoard(a,b){const key=a+'|'+b;if(key===lastBoard)return;lastBoard=key;ctx.fillStyle='#173a36';ctx.fillRect(0,0,768,192);ctx.textAlign='center';ctx.fillStyle='#f3daab';ctx.font='bold 40px Arial';ctx.fillText(a,384,67);ctx.font='30px Arial';ctx.fillText(b,384,133);texture.needsUpdate=true;}
  showBoard('MAPLE CAFE','Order • Freshly prepare • Collect');
  const lights=[];for(const [x,z] of [[-32,-34],[-23,-34],[-42,-87]]){box(root,new THREE.MeshBasicMaterial({color:0xffe5b5}),x,3.72,z,1.1,.055,.45);const light=new THREE.PointLight(0xffe2b7,23,17,2);light.position.set(x,3.3,z);root.add(light);lights.push(light);}
  const cashier=characters.create({x:-22,z:-40.05,model:'maya',customizable:true,shirt:0x174c46});cashier.rotation.y=0;cashier.name='Maple Cafe cashier';characters.setAppearance(cashier,{shirt:0x174c46,shoes:0x262925,skin:0xa97854,hair:0x32271f,style:'bun'});
  const heldCashier=cup();cashier.add(heldCashier);heldCashier.visible=false;
  const available=civicWorld.seats.filter(s=>s.type==='chair'&&s.z>=-34&&s.z<=-14&&s.x<-18&&s.x>-42).sort((a,b)=>a.z-b.z);
  // Reserve six seats and leave the other cafe seats for the player.
  const seats=available.filter((_,i)=>i%3!==2).slice(0,6),customers=[],queue=[];
  const styles=[['mom',0xc87654,0xe0af84],['casual',0x628bb0,0x825435],['neighbor',0xd4b861,0xc99472],['maya',0x786390,0x684432],['casual',0x4e8876,0xd8ab8d],['neighbor',0xae6465,0x976c50],['mom',0x6d8197,0xbb8b65],['casual',0xe1b35b,0x825435]];
  for(let i=0;i<8;i++){const [model,shirt,skin]=styles[i],actor=characters.create({x:-23,z:-36+i*.9,model,customizable:true,shirt});characters.setAppearance(actor,{shirt,skin,hair:i%2?0x362b27:0x78523a,style:i%2?'curls':'bun'});actor.name='Cafe customer '+(i+1);const drink=cup(),food=meal();actor.add(drink,food);drink.visible=food.visible=false;const bill=box(actor,green,0,1,.35,.23,.012,.1);bill.visible=false;const c={bill,id:'cafe-guest-'+i,actor,drink,food,wallet:2000,phase:i<4?'initialSeat':'queue',seat:null,path:[],timer:0,item:CAFE_MENU[(i*3)%CAFE_MENU.length].id};customers.push(c);if(i>=4)queue.push(c);}
  let active=null,seenTicket=null,clock=0,initialized=false,playerHeld=null,heldId=null;
  function activity(actor,type,held=null){characters.setActivity?.(actor,type,held);}
  function reserve(c){const seat=seats.find(s=>!s.occupiedBy);if(seat){seat.occupiedBy=c.id;c.seat=seat;}return seat;}
  function path(c,points,phase){c.path=points.map(([x,z])=>({x,z}));c.phase=phase;characters.setSeated(c.actor,null);activity(c.actor,'carry',['sandwich','fruit'].includes(c.item)?c.food:c.drink);}
  function walk(c,dt,player){const p=c.path[0];if(!p)return true;const a=c.actor.position,dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*1.15);if(player&&Math.hypot(a.x-player.x,a.z-player.z)<.8&&Math.hypot(p.x-player.x,p.z-player.z)<Math.hypot(a.x-player.x,a.z-player.z))return false;if(d>.01){a.x+=dx/d*step;a.z+=dz/d*step;c.actor.rotation.y=Math.atan2(dx,dz);}if(d<=step+.02)c.path.shift();return !c.path.length;}
  function seatRoute(c){const s=c.seat;if(s.z<-27)return [[-30,-30],[s.x,-31.5],[s.x,s.z]];return [[-30,-29],[-30,-24],[-30,s.z+2.4],[s.x,s.z+2.4],[s.x,s.z]];}
  function sit(c){const s=c.seat;c.actor.position.set(s.x,.21,s.z);c.actor.rotation.y=s.heading;characters.setSeated(c.actor,{height:s.height});c.phase='dining';c.timer=28+customers.indexOf(c)*3;const food=['sandwich','fruit'].includes(c.item);c.drink.visible=!food;c.food.visible=food;activity(c.actor,food?'eat':'sip',food?c.food:c.drink);}
  function start(c){active={customer:c,phase:'payment',time:1.8};c.phase='serving';c.bill.visible=true;activity(c.actor,'pay',c.bill);}
  return {cashier,customers,queue,seats,root,
    update(dt,state,playerActor){
      const player=playerActor.position;
      clock+=dt;const service=state.cafeService;if(!service)return;
      const held=service.held;
      if(held&&held.remaining>0){if(heldId!==held.id||!playerHeld){if(playerHeld)playerActor.remove(playerHeld);playerHeld=['sandwich','fruit'].includes(held.id)?meal():cup();playerActor.add(playerHeld);heldId=held.id;}playerHeld.visible=!playerActor.userData.character?.riding;held.remaining=Math.max(0,held.remaining-(playerActor.userData.character?.seated?dt:0));activity(playerActor,playerActor.userData.character?.seated?(['sandwich','fruit'].includes(held.id)?'eat':'sip'):'carry',playerHeld);}
      if(!held||held.remaining<=0){if(playerHeld){playerActor.remove(playerHeld);playerHeld=null;heldId=null;activity(playerActor,'idle');}if(held)delete service.held;}
      const inCafe=civicWorld.cafeInside(player),inBakery=civicWorld.bakeryInside(player);lights.forEach((l,i)=>l.visible=i===2?inBakery:inCafe);
      if(!initialized){initialized=true;for(const c of customers.filter(c=>c.phase==='initialSeat')){if(reserve(c)&&payCafeCustomer(state,c,c.item))sit(c);else {c.phase='queue';queue.push(c);}}}
      if(service.pending&&service.pending.ticket!==seenTicket){seenTicket=service.pending.ticket;if(service.pending.status==='preparing')queue.unshift({player:true,ticket:seenTicket});else if(service.pending.status==='queued')queue.push({player:true,ticket:seenTicket});}
      // Guests advance one place at a time instead of stacking at the register.
      let qi=0;for(const c of queue){if(c.player)continue;const target={x:-23,z:-37.4+qi++*1.05};if(c.phase==='queue'){c.path=[target];walk(c,dt,player);c.actor.rotation.y=Math.PI;activity(c.actor,'idle');}}
      if(!active&&queue.length){const c=queue[0];if(c.player){queue.shift();if(service.pending?.ticket===c.ticket&&service.pending.status!=='ready')active={customer:c,phase:'prepare',time:0};}else if(Math.hypot(c.actor.position.x+23,c.actor.position.z+37.4)<.12){queue.shift();start(c);}}
      let phase='idle';if(active){phase=active.phase;active.time-=dt;const c=active.customer;
        if(phase==='payment'&&active.time<=0){c.bill.visible=false;if(payCafeCustomer(state,c,c.item)){active.phase='prepare';active.time=c.item==='latte'?9:6;}else{c.phase='leaving';c.path=[{x:-30,z:-29},{x:-30,z:-24}];active=null;}}
        else if(phase==='prepare'){
          if(Math.abs(cashier.position.x+25.5)>.15){active.time+=dt;}else {
          if(c.player){if(progressCafeOrder(state,dt)){onReady(service.pending);active=null;}}
          else if(active.time<=0){active.phase='handoff';active.time=1.5;const food=['sandwich','fruit'].includes(c.item);c.drink.visible=!food;c.food.visible=food;activity(c.actor,'carry',food?c.food:c.drink);}
          }
        }else if(phase==='handoff'&&active.time<=0){if(reserve(c))path(c,seatRoute(c),'toSeat');else path(c,[[-30,-30],[-30,-24]],'leaving');active=null;}
      }
      phase=active?.phase||'idle';const cashierX=phase==='prepare'?-25.5:phase==='handoff'?-24:-22,delta=cashierX-cashier.position.x;cashier.position.x+=Math.sign(delta)*Math.min(Math.abs(delta),dt*1.4);cashier.rotation.y=0;heldCashier.visible=phase==='handoff';activity(cashier,phase==='prepare'?'brew':phase==='handoff'?'handoff':phase==='payment'?'pay':'idle',heldCashier);
      prepCup.visible=steam.visible=phase==='prepare';steam.children.forEach((m,i)=>{m.position.set(Math.sin(clock*2+i)*.025,((clock*.15+i*.1)%.42),0);});
      const pending=service.pending;readyCup.visible=pending?.status==='ready'&&!['sandwich','fruit'].includes(pending.id);readyMeal.visible=pending?.status==='ready'&&['sandwich','fruit'].includes(pending.id);
      showBoard(pending?.status==='ready'?'PICKUP • TICKET '+pending.ticket:phase==='prepare'?'FRESHLY PREPARING':phase==='payment'?'TAKING PAYMENT':'MAPLE CAFE',pending?.status==='ready'?'Press E at the counter to collect':queue.length+' waiting • Coffee & fresh food');
      for(const c of customers){
        if(c.phase==='dining'){c.timer-=dt;const consuming=Math.sin(clock*.7+customers.indexOf(c))>.1,food=['sandwich','fruit'].includes(c.item);c.drink.position.set(.22,.98,.38);c.food.position.set(-.22,.87,.38);activity(c.actor,consuming?(food?'eat':'sip'):'idle',consuming?(food?c.food:c.drink):null);if(c.timer<=0){c.drink.visible=c.food.visible=false;activity(c.actor,'idle');const s=c.seat;delete s.occupiedBy;c.seat=null;const route=s.z<-27?[[s.x,-31.5],[-30,-30],[-30,-24]]:[[s.x,s.z+2.4],[-30,s.z+2.4],[-30,-24]];path(c,route,'leaving');}}
        else if(c.phase==='toSeat'&&walk(c,dt,player))sit(c);
        else if(c.phase==='leaving'&&walk(c,dt,player)){path(c,[[-30,-10],[-33+customers.indexOf(c)*.8,-10]],'outside');}
        else if(c.phase==='outside'&&walk(c,dt,player)){c.phase='returning';c.timer=12+customers.indexOf(c)*2;activity(c.actor,'idle');}
        else if(c.phase==='returning'){c.timer-=dt;if(c.timer<=0){c.wallet=2000;c.item=CAFE_MENU[(customers.indexOf(c)+Math.floor(clock/30))%CAFE_MENU.length].id;path(c,[[-30,-10],[-30,-29],[-27,-29],[-23,-29]],'arriving');}}
        else if(c.phase==='arriving'&&walk(c,dt,player)){c.phase='queue';queue.push(c);}
      }
    }
  };
}
