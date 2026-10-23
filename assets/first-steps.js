const names={parent:{name:'Mom',verb:'Meet',marker:'green',place:'the front of your original Maple Street home',lesson:'Mom will introduce your wallet and help you practice with money.'},maya:{name:'Maya',verb:'Find',marker:'gold',place:'the Saturday Market',lesson:'Maya will help you compare businesses and choose your first startup plan.'}};
const directions=['north','northeast','east','southeast','south','southwest','west','northwest'];
// Presentation only: readiness comes from the actual nearby target selected by
// findNear(), including its doorway priority. This never activates an action.
export function firstStepCue({stage,position,target,nearKind,mobile=false,mounted=false,seated=false}={}){
 const step=Object.hasOwn(names,stage)?names[stage]:null;if(!step||![position?.x,position?.z,target?.x,target?.z].every(Number.isFinite))return null;
 const action='Talk to '+step.name;
 if(mounted)return {title:step.verb+' '+step.name+' · step out first',detail:mobile?'Stop and use Exit car or Dismount before talking.':'Stop and press F to step out before talking.'};
 if(seated)return {title:'Stand up to talk to '+step.name,detail:mobile?'Tap Stand up, then look for '+action+'.':'Press E to stand, then look for '+action+'.'};
 if(nearKind===stage)return {title:mobile?'Tap '+action:'Press E · '+action,detail:step.lesson};
 const dx=target.x-position.x,dz=target.z-position.z,distance=Math.hypot(dx,dz),bearing=directions[(Math.round(Math.atan2(dx,-dz)/(Math.PI/4))+8)%8];
 const meters=distance<10?Math.max(1,Math.ceil(distance)):Math.round(distance/5)*5;
 return {title:step.verb+' '+step.name+(distance<7?' · nearby':' · '+meters+' m '+bearing),detail:distance<7?'Move clear of nearby objects until '+action+' appears.':
  'Follow the '+step.marker+' marker at '+step.place+'. '+(mobile?'Use the left stick to walk; drag the city to look.':'Use WASD or arrows to walk; click the city to use mouse look.')};
}
