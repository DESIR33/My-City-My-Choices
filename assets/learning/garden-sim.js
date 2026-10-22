// Garden Club: three pretend plans with the same kind of odds as the design doc.
import {createRng} from './rng.js';

export const GARDEN_PLANS=Object.freeze([
  Object.freeze({id:'jar',name:'Seed Jar',odds:'Always grows 2%',outcomes:[{p:1,factor:1.02}]}),
  Object.freeze({id:'steady',name:'Steady Garden',odds:'7 in 10 seasons +6%, 3 in 10 seasons −3%',outcomes:[{p:.7,factor:1.06},{p:.3,factor:.97}]}),
  Object.freeze({id:'weather',name:'Weather Garden',odds:'Half the seasons +30%, half the seasons −20%',outcomes:[{p:.5,factor:1.3},{p:.5,factor:.8}]})
]);
export const SEASONS_PER_PLAN=5;
export const gardenPlan=id=>GARDEN_PLANS.find(p=>p.id===id)||null;

function factorFor(plan,r){let acc=0;for(const o of plan.outcomes){acc+=o.p;if(r<acc)return o.factor}return plan.outcomes.at(-1).factor}

// One path of values in cents: start, then one value per season.
export function simulate(planId,startCents,seasons,seed){
  const plan=gardenPlan(planId);if(!plan)throw Error('Unknown plan '+planId);
  const rng=createRng('garden:'+planId+':'+seed),path=[startCents];let v=startCents;
  for(let i=0;i<seasons;i++){v=v*factorFor(plan,rng.next());path.push(Math.round(v))}
  return path;
}

// Many runs summarized: percentiles and the share that ended below the start.
export function summarize(planId,startCents,seasons,runs,seed){
  const ends=[];
  for(let i=0;i<runs;i++)ends.push(simulate(planId,startCents,seasons,seed+':'+i).at(-1));
  ends.sort((a,b)=>a-b);
  const q=f=>ends[Math.min(ends.length-1,Math.floor(f*ends.length))];
  return {p10:q(.1),median:q(.5),p90:q(.9),mean:Math.round(ends.reduce((s,v)=>s+v,0)/ends.length),belowStart:ends.filter(v=>v<startCents).length/ends.length};
}

// SVG of test runs for each plan, drawn inside the game panel. Colors come from CSS variables.
export function pathsSvg(paths,{width=420,height=210}={}){
  const all=paths.flatMap(p=>p.values),n=paths[0].values.length-1,min=0;
  const step=[100,200,500,1000,2000,2500,5000,10000,20000,50000].find(s=>Math.max(...all)/s<=5)||100000,max=step*Math.ceil(Math.max(...all)/step);
  const L=40,R=width-12,T=12,B=height-28,x=i=>L+(R-L)*i/n,y=v=>B-(B-T)*(v-min)/(max-min||1);
  const start=paths[0].values[0];
  let svg='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Test runs for each garden plan" class="gardenChart">';
  for(let v=0;v<=max;v+=step){svg+='<line x1="'+L+'" x2="'+R+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'" class="grid"/><text x="'+(L-6)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">$'+(v/100).toFixed(0)+'</text>'}
  svg+='<line x1="'+L+'" x2="'+R+'" y1="'+y(start).toFixed(1)+'" y2="'+y(start).toFixed(1)+'" class="start"/>';
  svg+='<text x="'+L+'" y="'+(height-8)+'">Season 0</text><text x="'+R+'" y="'+(height-8)+'" text-anchor="end">Season '+n+'</text>';
  for(const p of paths){
    svg+='<polyline class="path '+p.id+'" fill="none" points="'+p.values.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ')+'"/>';
    svg+='<circle class="end '+p.id+'" r="4" cx="'+x(n).toFixed(1)+'" cy="'+y(p.values.at(-1)).toFixed(1)+'"/>';
  }
  return svg+'</svg>';
}
