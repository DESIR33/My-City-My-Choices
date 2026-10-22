function notice(document,title,message,onReload){
 const overlay=document.createElement('section'),card=document.createElement('div'),heading=document.createElement('h2'),description=document.createElement('p'),button=document.createElement('button');
 overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
 overlay.style.cssText='position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:24px;background:#07120eea;color:#f2f6ef;font:16px/1.6 system-ui';
 card.style.cssText='max-width:420px;padding:28px;border-radius:20px;background:#183327;box-shadow:0 20px 70px #0008';
 heading.textContent=title;description.textContent=message;button.textContent='Reload with lighter graphics';button.className='primary';button.type='button';button.addEventListener('click',onReload);
 card.append(heading,description,button);overlay.append(card);document.body.append(overlay);document.exitPointerLock?.();button.focus?.();
 return {description,remove:()=>overlay.remove()};
}
export function showGraphicsUnavailable({document,onReload}){
 return notice(document,'3D graphics could not start','Reload with lighter graphics. If this continues, enable hardware acceleration or try a browser that supports WebGL 2.',onReload);
}
// A restored context does not restore GPU-generated environment maps reliably.
// Keep the world paused until an explicit reload rebuilds all graphics resources.
export function createGraphicsRecovery({canvas,document,onPause=()=>{},onReload=()=>{},onRestore=()=>{}}){
 let blocked=false,panel=null,recoveryRequested=false;
 function lost(event){event.preventDefault();if(blocked)return;blocked=true;try{onPause();}finally{panel=notice(document,'Graphics paused','Your device interrupted the picture. Reload with lighter graphics to return to your story.',onReload);}}
 function restored(){if(!panel)return;panel.description.textContent='Graphics are available again. Reloading with lighter graphics to return to your story.';if(recoveryRequested)return;recoveryRequested=true;if(onRestore()===false)panel.description.textContent='Graphics are available again. Tap below to reload with lighter graphics and return to your story.';}
 canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
 return {get blocked(){return blocked;},dispose(){canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);panel?.remove();}};
}
