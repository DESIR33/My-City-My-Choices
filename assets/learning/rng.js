// Seeded randomness: the same seed always gives the same question, so reloads cannot reroll.
export function hashSeed(seed){
  const s=String(seed);let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
  return h>>>0;
}
export function createRng(seed){
  let a=hashSeed(seed)||1;
  const next=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
  return {
    next,
    int:(lo,hi)=>lo+Math.floor(next()*(hi-lo+1)),
    pick:list=>list[Math.floor(next()*list.length)],
    chance:p=>next()<p,
    shuffle:list=>{const out=list.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
  };
}
