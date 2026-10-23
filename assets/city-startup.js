// Keep the large inline runtime inert on phones until setup is complete. This
// module has no Three.js dependency and never reads or writes saved progress.
export function mountCityStartup(doc,win){
  const root=doc.querySelector('#intro'),source=doc.querySelector('#cityRuntime');
  if(!root||!source||root.dataset.bootMounted)return null;root.dataset.bootMounted='true';
  const mobile=!!win.matchMedia?.('(any-pointer: coarse)').matches;
  root.dataset.cityDeferred=String(mobile);root.dataset.cityState='idle';
  let injected=false,pending=null;
  const emit=()=>doc.dispatchEvent(new win.Event('city:boot-state'));
  function fail(){root.dataset.cityState='failed';pending=null;if(!root.dataset.cityError)root.dataset.cityError='The city couldn’t finish loading. Your saved story is unchanged. Reload to try again.';emit();}
  function launch(action=null){
    if(injected)return false;injected=true;pending=action;root.dataset.cityState='loading';emit();
    const script=doc.createElement('script');script.type='module';script.textContent=source.textContent;script.addEventListener('error',fail,{once:true});
    doc.body.appendChild(script);return true;
  }
  doc.addEventListener('city:launch',event=>{const id=event.detail?.action;if(['begin','continueStory','introBackups'].includes(id))launch(id);});
  doc.addEventListener('city:setup-error',()=>{if(injected&&root.dataset.cityState==='loading')fail();});
  doc.addEventListener('city:ready',()=>{Promise.resolve().then(()=>{
    if(!injected||root.dataset.cityReady!=='true'||root.dataset.cityError)return;
    root.dataset.cityState='ready';root.dataset.cityDeferred='false';const action=pending;pending=null;emit();
    if(action)doc.querySelector('#'+action)?.click();
  });});
  emit();if(!mobile)launch();
  return {launch,get started(){return injected;}};
}
if(typeof window!=='undefined'&&typeof document!=='undefined')mountCityStartup(document,window);
