// One background transition can emit blur, visibilitychange and pagehide.
// Flush once, freeze immediately, and never restore focus behind another tab.
export function createSessionLifecycle({window,document,canSave=()=>true,save=()=>{},onAway=()=>{},onReturn=()=>{}}){
 let paused=!!document.hidden,away=paused,returnToGame=false,disposed=false;
 const listeners=[];
 function listen(target,type,fn){target.addEventListener(type,fn);listeners.push([target,type,fn]);}
 function leave(){
  if(disposed||away)return;
  away=true;paused=true;returnToGame=!!canSave();
  onAway();
  if(returnToGame)save();
 }
 function enter(){
  if(disposed||document.hidden||document.hasFocus?.()===false||!away)return;
  away=false;paused=false;
  const show=returnToGame;returnToGame=false;
  if(show)onReturn();
 }
 listen(window,'blur',leave);
 listen(window,'focus',enter);
 listen(document,'visibilitychange',()=>document.hidden?leave():enter());
 listen(window,'pagehide',leave);
 listen(window,'pageshow',enter);
 // Browsers supporting the Page Lifecycle API may freeze without pagehide.
 listen(document,'freeze',leave);
 listen(document,'resume',enter);
 return {get paused(){return paused;},dispose(){disposed=true;for(const [target,type,fn] of listeners)target.removeEventListener(type,fn);}};
}
