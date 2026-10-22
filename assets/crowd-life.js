// What standing townspeople do between walks. Clips are Microsoft Rocketbox
// motions (MIT), built by tools/prepare-motions.mjs as `${set}_${file}.glb`.
export const AMBIENT_MOTIONS=Object.freeze({
 look:'idle_look_around_01',
 phone:'cell_phone_textmessage',
 wait:'idle_waiting_01',
 talk:'gestic_talk_neutral_01',
 talk2:'gestic_talk_relaxed_01',
 listen:'gestic_listen_neutral_01',
 nod:'gestic_listen_accept_01'
});
// Clips that show a phone in the right hand.
export const PHONE_MOTIONS=Object.freeze(['phone']);

const LONER=['idle','look','idle','phone','wait','look','idle','phone'];
// Deterministic schedule so a reload looks the same and tests can predict it.
// `mode` is 'loner' (alone) or 'talk' (in a conversation); `turn` 0/1 offsets
// partners so one talks while the other listens.
export function ambientMotion(mode,time,{seed=0,turn=0}={}){
 const t=Math.max(0,time)+seed*3.7;
 if(mode==='talk'){
  const beat=Math.floor(t/6)+turn,speaking=beat%2===0;
  return speaking?(Math.floor(t/12)%2?'talk2':'talk'):(Math.floor(t/18)%3===0?'nod':'listen');
 }
 return LONER[Math.floor(t/9)%LONER.length];
}

// Seated idles for anyone on a chair, bench or couch (player included). The
// clips carry the sitting pose; the game only lifts the pelvis to the seat.
export const SEATED_MOTIONS=Object.freeze({
 sit:'sit_chair_idle_neutral_01',
 sitLook:'sit_chair_idle_look_around',
 sitBreathe:'sit_chair_breathe_01',
 sitRelaxed:'sit_chair_idle_relaxed_01'
});
const SEATED=['sit','sitLook','sit','sitBreathe','sit','sitRelaxed'];
export function seatedMotion(time,{seed=0}={}){return SEATED[Math.floor((Math.max(0,time)+seed*2.9)/10)%SEATED.length];}

// Phones get a smaller crowd so fewer distinct models load at once.
export const CROWD_LIMITS=Object.freeze({desktop:{adults:Infinity,children:Infinity},mobile:{adults:6,children:2}});
