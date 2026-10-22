import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import * as rules from '../assets/home-life.js';
import {MODEL_HOME} from '../assets/house-rules.js';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {parseSaveFile,exportSave} from '../assets/save-backups.js';

const {freshHomeLife,restoreHomeLife,installHomeProject,restyleHome,TEXTILE_STYLES}=rules;
const owner=restoreHomeLife(null,{choice:'owner',day:2});
const installed=installHomeProject(owner,'textiles',100,2);
assert.equal(installed.walletAfter,0);assert.equal(installed.state.improvementSpent,100);
assert.equal(restyleHome(owner,'sage',2).ok,false);
assert.equal(restyleHome(freshHomeLife(),'clay',2).ok,false);
for(const id of ['unknown','__proto__','constructor',null,{},'SAGE'])assert.equal(restyleHome(installed.state,id,2).ok,false);
for(const style of TEXTILE_STYLES){
 const result=restyleHome(installed.state,style.id,2);assert.equal(result.ok,true);assert.equal(result.state.textileStyle,style.id);
 assert.equal(result.state.improvementSpent,100);assert.deepEqual(result.state.improvements,['textiles']);
 assert.equal(installHomeProject(result.state,'textiles',100,2).ok,false);
 const raw={stage:'done',goal:0,business:0,cash:0,saved:7,earned:0,spent:0,investment:0,x:MODEL_HOME.x,z:MODEL_HOME.z,homeLife:result.state};
 const restored=restoreHomeLife(parseSaveFile(exportSave(JSON.stringify(raw))).save.homeLife,{choice:'owner',day:2});
 assert.equal(restored.textileStyle,style.id);
}
assert.equal(installed.state.textileStyle,'ocean','Restyling leaves prior state immutable');
assert.equal(restoreHomeLife({...installed.state,textileStyle:undefined},{choice:'owner',day:2}).textileStyle,'ocean');
assert.equal(restoreHomeLife({...installed.state,textileStyle:'bad'},{choice:'owner',day:2}).textileStyle,'ocean');
assert.equal(restoreHomeLife({...installed.state,textileStyle:'clay',improvements:[]},{choice:'owner',day:2}).textileStyle,'ocean');
assert.equal(restoreHomeLife({...installed.state,textileStyle:'clay'},{choice:'none',day:2}).textileStyle,'ocean');
const rental={...installed.state,tenure:'rent',rentThroughDay:8,textileStyle:'sage'};
assert.equal(restyleHome(rental,'clay',8).ok,true);assert.equal(restyleHome(rental,'clay',9).ok,false);
assert.equal(restoreHomeLife(rental,{choice:'rent',day:9}).textileStyle,'sage','An expired lease preserves installed decor');

const q=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>q})};
const scene=new THREE.Scene(),m=c=>new THREE.MeshStandardMaterial({color:c});
const home=createLandmarkHouse({scene,visualKit:{wood:m,brick:m,siding:m,roofing:m,masonry:m},obstacles:[],groundSurfaces:[]});
const materials=new Set(),geometries=new Set(),textures=new Map();let rug;
scene.traverse(o=>{if(!o.isMesh)return;geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material]){materials.add(mat);if(mat.color?.getHex()===0x9a8671)rug=mat;if(mat.map)textures.set(mat.map,mat.map.version);}});
assert.ok(rug);const colliderCount=home.colliders.length;
home.applyLiving(installed.state,{name:'Decorator'});
for(const texture of textures.keys())textures.set(texture,texture.version);
for(let i=0;i<3000;i++){
 const style=TEXTILE_STYLES[i%TEXTILE_STYLES.length];home.applyLiving({...installed.state,textileStyle:style.id},{name:'Decorator'});
 assert.equal(rug.color.getHex(),style.rug);assert.equal(home.beds[0].duvet.material.color.getHex(),style.fabric);assert.equal(home.beds[1].duvet.material.color.getHex(),style.guest);
}
scene.traverse(o=>{if(o.isMesh){assert.ok(geometries.has(o.geometry));for(const mat of Array.isArray(o.material)?o.material:[o.material])assert.ok(materials.has(mat));}});
assert.equal(home.colliders.length,colliderCount);for(const [texture,version] of textures)assert.equal(texture.version,version,'Restyling does not upload the welcome plaque or another texture');
home.applyLiving(rental);assert.equal(rug.color.getHex(),TEXTILE_STYLES[1].rug);
home.applyLiving({...installed.state,textileStyle:'invalid'});assert.equal(rug.color.getHex(),TEXTILE_STYLES[0].rug);
home.applyLiving(freshHomeLife());assert.equal(rug.color.getHex(),0x9a8671);assert.equal(home.beds[0].duvet.material.color.getHex(),0x819385);assert.equal(home.beds[1].duvet.material.color.getHex(),0x9f8b76);

// Execute the shipped panel and action: money, eligibility, repeat clicks and save dispatch.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('window.openHomeProjects='),html.indexOf('let homeProjectTicket=null;'));
let saves=0,syncs=0;
const c={...rules,MODEL_HOME,stage:'done',driving:null,riding:null,marketDay:2,homeLife:installed.state,cash:0,saved:7,spent:3,housingLoanBalance:5,
 hudText:s=>String(s),storyMoney:n=>'$'+(n/100).toFixed(2),show:h=>{c.markup=h;},syncHomeLife(){syncs++;home.applyLiving(c.homeLife);},saveGame(){saves++;}};
c.window=c;vm.createContext(c);vm.runInContext(source,c);
c.openHomeProjects();assert.match(c.markup,/Ocean blue · Selected/);assert.match(c.markup,/Free restyle/);assert.equal((c.markup.match(/homeSwatches/g)||[]).length,3);
c.chooseHomeStyle('sage');assert.equal(c.homeLife.textileStyle,'sage');assert.match(c.markup,/Garden sage · Selected/);assert.equal(saves,1);assert.equal(syncs,1);
c.chooseHomeStyle('sage');assert.equal(saves,1,'Repeated selection is idempotent');
for(const [key,value] of [['driving',{}],['riding',{}],['stage','customer']]){const old=c[key];c[key]=value;c.chooseHomeStyle('clay');assert.equal(c.homeLife.textileStyle,'sage');c[key]=old;}
c.chooseHomeStyle('bad');assert.equal(saves,1);
c.homeLife=rental;c.marketDay=9;c.chooseHomeStyle('clay');assert.equal(c.homeLife.textileStyle,'sage');assert.match(c.markup,/renew your rental/);assert.equal(saves,1);
c.homeLife={...rental,rentThroughDay:15};c.chooseHomeStyle('clay');assert.equal(c.homeLife.textileStyle,'clay');assert.equal(saves,2);
assert.deepEqual([c.cash,c.saved,c.spent,c.housingLoanBalance],[0,7,3,5]);assert.equal(c.homeLife.improvementSpent,100);
c.homeLife=owner;c.openHomeProjects();assert.equal((c.markup.match(/aria-pressed="false" disabled/g)||[]).length,3);c.chooseHomeStyle('sage');assert.equal(c.homeLife,owner);
console.log('Home decor passed: legacy/invalid/portable saves, one-time unlock, lease boundaries, free and repeat-safe real UI handlers, actual rug/sofa/bed materials and 3,000 allocation-free scene updates.');
