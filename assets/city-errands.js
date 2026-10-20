// Visible first-job steps and the outfits used to get ready. Money stays in the wallet.
export const OUTFITS = Object.freeze([
  {id:'everyday', name:'Everyday clothes', shirt:0x496d84, shoes:0x303f52, detail:'The blue shirt you arrived in.'},
  {id:'work', name:'Work clothes', shirt:0x1d4e3c, shoes:0x241c16, detail:'A neat green shirt and dark shoes for a job.'},
  {id:'market', name:'Market clothes', shirt:0xb85c4a, shoes:0x4e7796, detail:'A bright shirt for walking the neighborhood.'},
]);

export function freshErrand() {
  return {found:false, dressed:false, ready:false, paid:false, outfit:'everyday'};
}

export function outfitById(id) {
  return OUTFITS.find(outfit => outfit.id === id) || OUTFITS[0];
}

export function restoreErrand(saved) {
  const state = freshErrand();
  if (!saved || typeof saved !== 'object') return state;
  state.found = !!saved.found;
  state.dressed = !!saved.dressed;
  state.ready = !!saved.ready;
  state.paid = !!saved.paid;
  state.outfit = OUTFITS.some(outfit => outfit.id === saved.outfit) ? saved.outfit : 'everyday';
  if (state.outfit === 'work') state.dressed = true;
  if (state.paid) {state.found = true; state.dressed = true; state.ready = true;}
  return state;
}

export function wearOutfit(state, id) {
  const outfit = OUTFITS.find(item => item.id === id);
  if (!outfit) return {ok:false, state, reason:'That outfit is not in the closet.'};
  return {ok:true, outfit, state:{...state, outfit:outfit.id, dressed:state.dressed || outfit.id === 'work'}};
}

export function readJobBoard(state) {
  return {...state, found:true};
}

export function clockInForJob(state) {
  if (state.paid) return {ok:false, state, reason:'You already finished today’s shift.'};
  if (!state.found) return {ok:false, state, reason:'Read the help-wanted board first.'};
  if (state.outfit !== 'work') return {ok:false, state, reason:'Change into work clothes at home before the shift starts.'};
  return {ok:true, pay:2, state:{...state, found:true, dressed:true, ready:true, paid:true, outfit:'work'}};
}

export function jobSteps(state) {
  return [
    {id:'find', done:!!state.found, text:'Find the help-wanted board by your home'},
    {id:'dress', done:state.outfit === 'work' || !!state.paid, text:'Get ready: change into work clothes at home'},
    {id:'return', done:!!state.paid, text:'Go back to the board wearing those clothes'},
    {id:'pay', done:!!state.paid, text:'Check your wallet for the $2 pay'},
  ];
}

