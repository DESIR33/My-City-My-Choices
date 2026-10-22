import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as homeRules from '../assets/home-life.js';
import {MODEL_HOME,houseInside} from '../assets/house-rules.js';
import {parseSaveFile,exportSave} from '../assets/save-backups.js';
import * as economy from '../assets/economy.js';

const {freshHomeLife,restoreHomeLife,homeAccess,homeProjectQuote,installHomeProject,HOME_PROJECTS}=homeRules;
const owner=restoreHomeLife(null,{choice:'owner',day:12});
assert.equal(owner.propertyId,MODEL_HOME.id);assert.ok(homeAccess(owner,99));assert.deepEqual(owner.improvements,[]);
const rent=restoreHomeLife(null,{choice:'rent',day:12});assert.equal(rent.rentThroughDay,18);assert.ok(homeAccess(rent,18));assert.ok(!homeAccess(rent,19));
const expired=restoreHomeLife(rent,{choice:'rent',day:99});assert.equal(expired.rentThroughDay,18);assert.ok(!homeAccess(expired,99));
for(const id of ['missing','__proto__','constructor'])assert.equal(homeProjectQuote(owner,id,500,12).ok,false);
assert.equal(homeProjectQuote(owner,'textiles',99,12).ok,false);assert.equal(homeProjectQuote(owner,'textiles',NaN,12).ok,false);assert.equal(homeProjectQuote(freshHomeLife(),'textiles',500,12).ok,false);
let state=owner,wallet=1000;for(const p of HOME_PROJECTS){const r=installHomeProject(state,p.id,wallet,12);assert.ok(r.ok);state=r.state;wallet=r.walletAfter;assert.equal(installHomeProject(state,p.id,wallet,12).ok,false);}
assert.equal(wallet,625);assert.equal(state.improvementSpent,375);assert.deepEqual(owner.improvements,[]);
const clean=restoreHomeLife({...state,improvements:['textiles','textiles','made-up'],reviewedDay:500,improvementSpent:999},{choice:'owner',day:12});assert.deepEqual(clean.improvements,['textiles']);assert.equal(clean.improvementSpent,100);assert.equal(clean.reviewedDay,12);
const save={stage:'done',goal:0,business:0,cash:6.25,saved:5,earned:1,spent:0,investment:0,x:MODEL_HOME.entry.x,z:MODEL_HOME.entry.z,homeLife:state};assert.deepEqual(parseSaveFile(exportSave(JSON.stringify(save))).save.homeLife,state);assert.throws(()=>parseSaveFile(JSON.stringify({...save,homeLife:[]})),/homeLife/);

// Run the shipped public handlers against a wallet and modal, without rendering.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
// Housing is intentionally multiline; include the complete installment handler.
const housingEnd=html.indexOf('const shopItems=',html.indexOf('function housingPanel('));
const housingSource=html.slice(html.indexOf('function housingPanel('),housingEnd);
const handlers=html.slice(html.indexOf("let settlingCueKey=''"),html.indexOf('const destinations={'));
const logs=[],c={...economy,systems:undefined,moneySystems:economy.systems,usd:d=>economy.formatDollars(d),...homeRules,MODEL_HOME,houseInside,avatarName:'Jesus',stage:'done',marketDay:2,cash:20,saved:4,housingChoice:'none',housingLoanBalance:0,housingSpent:0,homeLife:freshHomeLife(),driving:null,riding:null,carLife:{},garageCar:{position:{x:0,z:0}},business:0,businessStory:{history:[]},player:{position:{x:0,z:0,y:0}},sideJobEarned:0,logDecision:(...v)=>logs.push(v),moneySet(){},saveGame(){},hudText:s=>String(s).replace(/[<>]/g,''),storyMoney:n=>'$'+(n/100).toFixed(2),purchasePlanNote:()=>'',usePlanReserve(){},reviewPlannedSpend:()=>false,setCityDestination(){},openPlanner(){},startNextMarketDay(){}};
Object.assign(c,{navigationTarget:null,destinations:{modelHome:{}},applyNavigationTarget:t=>{c.navigationTarget=t;},objectiveSet:(title,hint)=>{c.objective={title,hint};},notify(){},closeGamePanel(){},setCityDestination(){}});
c.window=c;vm.createContext(c);c.show=s=>{vm.runInContext('homeProjectTicket=null',c);c.panel=s;};vm.runInContext(housingSource+handlers,c);
c.rentHome();assert.equal(c.cash,18);assert.equal(c.homeLife.rentThroughDay,8);c.rentHome();assert.equal(c.cash,18);
c.homeLife=restoreHomeLife(c.homeLife,{choice:'rent',day:8});assert.equal(c.homeLife.rentThroughDay,8);
c.marketDay=9;c.quoteHomeProject('textiles');c.buyHomeProject('textiles');assert.equal(c.cash,18);
c.rentHome();assert.equal(c.cash,16);assert.equal(c.homeLife.rentThroughDay,15);
c.quoteHomeProject('textiles');c.openHomeLife();c.buyHomeProject('textiles');assert.equal(c.cash,16,'Leaving a quote cancels it');
c.quoteHomeProject('textiles');c.cash+=.25;c.buyHomeProject('textiles');assert.equal(c.cash,16.25,'Changed balance invalidates the quote');c.cash-=.25;
c.quoteHomeProject('textiles');c.buyHomeProject('textiles');assert.equal(c.cash,15);assert.equal(c.homeLife.improvements[0],'textiles');c.buyHomeProject('textiles');assert.equal(c.cash,15);
c.buyHome();assert.equal(c.cash,10);assert.equal(c.housingLoanBalance,5);assert.equal(c.homeLife.tenure,'owner');assert.equal(c.homeLife.improvements.length,1);c.rentHome();c.buyHome();assert.equal(c.cash,10);
for(let i=0;i<6;i++)c.payHomeInstallment();assert.equal(c.cash,5);assert.equal(c.housingLoanBalance,0);assert.equal(c.saved,4);
c.finishHomeReview();assert.equal(c.homeLife.reviewedDay,0);c.player.position={x:MODEL_HOME.x+2,z:MODEL_HOME.z+3,y:MODEL_HOME.ground};c.finishHomeReview();assert.equal(c.homeLife.reviewedDay,9);const count=logs.length;c.finishHomeReview();assert.equal(logs.length,count);assert.equal(c.cash,5);
assert.match(html,/homeLife=restoreHomeLife\(s.homeLife/);assert.match(html,/JSON.stringify\(\{homeLife,house:/);assert.match(html,/homeLife=freshHomeLife\(\);syncHomeLife\(\)/);
console.log('Home life passed: migration, lease boundaries/renewal, immutable exact-cent projects, real modal/transaction handlers, canceled/stale/duplicate purchases, rent-to-own conversion, debt, physical daily review and portable saves.');
// Optional guidance preserves exact progress across pause, expiry and reload.
let settling={...owner,settling:'arrive'};
assert.equal(homeRules.advanceSettling(settling,'wardrobe'),settling);
assert.equal(homeRules.advanceSettling(freshHomeLife(),undefined).settling,'idle');
for(const event of ['entered','wardrobe','rested','reviewed']){const old=settling;settling=homeRules.advanceSettling(settling,event);assert.notEqual(settling,old);}
assert.equal(settling.settling,'done');assert.equal(homeRules.settlingCue(settling),null);assert.equal(homeRules.advanceSettling(settling,'reviewed'),settling);
const paused=restoreHomeLife({...owner,settling:'rest',settlingPaused:true},{choice:'owner',day:12});assert.equal(paused.settling,'rest');assert.equal(paused.settlingPaused,true);
assert.equal(restoreHomeLife({...owner,settling:'invalid'},{choice:'owner',day:12}).settling,'idle');
assert.equal(restoreHomeLife({...owner,settling:'rest'},{choice:'none',day:12}).settling,'idle');
