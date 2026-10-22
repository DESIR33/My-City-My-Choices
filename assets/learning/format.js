// Answer values are integers: money in cents, time in minutes after midnight, counts as whole numbers.
export const money=c=>{const a=Math.abs(c),d=Math.floor(a/100),r=String(a%100).padStart(2,'0');return (c<0?'-':'')+'$'+String(d).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+r};
export const cents=c=>c<100?c+'¢':money(c);
export function clock(min){
  const m=((min%1440)+1440)%1440,h=Math.floor(m/60),mm=m%60,h12=h%12===0?12:h%12;
  return h12+':'+String(mm).padStart(2,'0');
}
export function formatValue(value,format){
  if(format==='money')return money(value);
  if(format==='cents')return cents(value);
  if(format==='time')return clock(value)+(((value%1440)+1440)%1440>=720?' pm':' am');
  return String(value);
}
// Parse what a child types. Returns an integer in the question's unit, or null.
export function parseAnswer(text,format){
  const s=String(text??'').trim().toLowerCase().replace(/\s+/g,'');
  if(!s)return null;
  if(format==='money'||format==='cents'){
    if(/^\d+(¢|c|cents?)$/.test(s))return parseInt(s,10);
    const m=s.replace(/^\$/,'').replace(/,(?=\d{3})/g,'').match(/^(\d{1,6})(?:\.(\d{1,2}))?$/);
    if(!m)return null;
    return parseInt(m[1],10)*100+(m[2]?parseInt(m[2].padEnd(2,'0'),10):0);
  }
  if(format==='time'){
    const m=s.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
    if(!m)return null;
    let h=parseInt(m[1],10)%12;const mm=parseInt(m[2],10);
    if(mm>59||parseInt(m[1],10)>12||parseInt(m[1],10)<1)return null;
    if(m[3]==='pm')h+=12;
    return h*60+mm;
  }
  return /^\d{1,6}$/.test(s)?parseInt(s,10):null;
}
// Times in questions are daytime hours, so a typed 1:15 means 1:15 pm.
export function sameClock(a,b){return ((a-b)%720+720)%720===0}
