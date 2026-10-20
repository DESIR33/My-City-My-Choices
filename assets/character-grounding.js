const GRAVITY=18,JUMP_SPEED=6;
export function createVerticalState(x=0,z=0,y=0){return {x,z,y,velocity:0,grounded:true,requested:false};}
export function requestJump(s){if(!s.grounded||s.requested)return false;s.requested=true;return true;}
// World-space vertical motion keeps falling/jumping continuous across surface changes.
export function advanceVertical(s,{x,z,floor,dt,attached=false}){
 if(attached||Math.hypot(x-s.x,z-s.z)>3){Object.assign(s,{x,z,y:floor,velocity:0,grounded:true,requested:false});return s;}
 s.x=x;s.z=z;let remaining=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));if(!remaining)return s;
 if(s.grounded){if(s.y-floor>.32)s.grounded=false;else s.y=floor;}
 if(s.requested){if(s.grounded){s.velocity=JUMP_SPEED;s.grounded=false;}s.requested=false;}
 while(remaining>1e-8){const h=Math.min(remaining,1/120);remaining-=h;if(!s.grounded){s.y+=s.velocity*h-GRAVITY*h*h/2;s.velocity-=GRAVITY*h;if(s.y<=floor&&s.velocity<=0){s.y=floor;s.velocity=0;s.grounded=true;}}}
 // A newly encountered raised surface cannot swallow the character.
 if(s.y<floor){s.y=floor;s.velocity=0;s.grounded=true;}
 return s;
}
// Sole depths are calibrated from the model's normalized bind pose. Test both
// feet against local ground, including when one foot reaches a raised curb.
export function footContactLift(feet,height){let lift=0;for(const foot of feet)lift=Math.max(lift,height(foot.x,foot.z)-(foot.y-foot.soleDepth));return Math.max(0,lift);}
export function walkingSurface(x,z,surfaces=[],fallback='concrete'){
 let highest=-Infinity,kind=fallback;
 for(const s of surfaces)if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ&&s.top>=highest){highest=s.top;kind=s.kind||'concrete';}
 return kind;
}
