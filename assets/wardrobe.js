import {scaled} from './economy.js';
// Catalogue prices are Sprout money; clothingPrice() scales them to the active tier.
export const clothingPrice=(item,tier)=>scaled(item.price,'clothes',tier);
export const CLOTHING_STORE=Object.freeze({x:42,z:30,entry:{x:42,z:42},counter:{x:45,z:23.6}});
export const CLOTHING_SLOTS=Object.freeze({top:'Tops',bottom:'Trousers',shoes:'Shoes',hat:'Hats',backpack:'Bags'});
export const CLOTHES=Object.freeze([
 {id:'starter-top',slot:'top',name:'Original shirt',price:0,color:null},
 {id:'shirt',slot:'top',name:'City T-shirt',price:200,color:0xb85c4a},
 {id:'shirt-sage',slot:'top',name:'Sage T-shirt',price:200,color:0x63805d},
 {id:'shirt-lilac',slot:'top',name:'Lilac T-shirt',price:250,color:0x9274ab},
 {id:'shirt-stripe',slot:'top',name:'Coastal striped shirt',price:300,color:0x3b8591,pattern:1},
 {id:'shirt-navy',slot:'top',name:'Midnight T-shirt',price:250,color:0x253d59},
 {id:'starter-bottom',slot:'bottom',name:'Original jeans',price:0,color:null},
 {id:'pants-denim',slot:'bottom',name:'Indigo jeans',price:250,color:0x345574},
 {id:'pants-charcoal',slot:'bottom',name:'Charcoal jeans',price:250,color:0x44494e},
 {id:'pants-sand',slot:'bottom',name:'Sand trousers',price:250,color:0xb8a381},
 {id:'starter-shoes',slot:'shoes',name:'Original sneakers',price:0,color:null},
 {id:'shoes',slot:'shoes',name:'Everyday blue sneakers',price:300,color:0x4e7796},
 {id:'shoes-white',slot:'shoes',name:'Cloud white sneakers',price:300,color:0xe5e1d8},
 {id:'none-hat',slot:'hat',name:'No hat',price:0,color:null},
 {id:'hat',slot:'hat',name:'Sun hat',price:200,color:0xe0b957},
 {id:'hat-cream',slot:'hat',name:'Cream sun hat',price:250,color:0xe7d9b9},
 {id:'none-backpack',slot:'backpack',name:'No bag',price:0,color:null},
 {id:'backpack',slot:'backpack',name:'Canvas backpack',price:400,color:0x657e92},
 {id:'backpack-olive',slot:'backpack',name:'Olive backpack',price:400,color:0x66734a},
]);
const starters={top:'starter-top',bottom:'starter-bottom',shoes:'starter-shoes',hat:'none-hat',backpack:'none-backpack'};
export function freshWardrobe(colors={}){return {owned:Object.values(starters),equipped:{...starters},starter:{shirt:colors.shirt??0x496d84,shoes:colors.shoes??0x303f52},receipts:[],spent:0};}
export function restoreWardrobe(saved,legacy={},colors={}){
 const s=freshWardrobe({shirt:legacy.shirt?0x496d84:colors.shirt,shoes:legacy.shoes?0x303f52:colors.shoes});
 if(saved&&typeof saved==='object'){
  s.owned=[...new Set([...s.owned,...(Array.isArray(saved.owned)?saved.owned.filter(id=>CLOTHES.some(i=>i.id===id)):[])])];
  for(const slot of Object.keys(starters)){const id=saved.equipped?.[slot];if(s.owned.includes(id)&&CLOTHES.some(i=>i.id===id&&i.slot===slot))s.equipped[slot]=id;}
  for(const key of ['shirt','shoes'])if(Number.isInteger(saved.starter?.[key])&&saved.starter[key]>=0&&saved.starter[key]<=0xffffff)s.starter[key]=saved.starter[key];
  s.receipts=Array.isArray(saved.receipts)?saved.receipts.filter(r=>r&&Number.isSafeInteger(r.total)&&r.total>0&&Array.isArray(r.items)&&r.items.every(id=>CLOTHES.some(i=>i.id===id))).slice(-30):[];
  s.spent=Number.isSafeInteger(saved.spent)&&saved.spent>=0?saved.spent:0;
 }else for(const id of ['shirt','shoes','hat','backpack'])if(legacy[id]===true){s.owned.push(id);s.equipped[CLOTHES.find(i=>i.id===id).slot]=id;}
 return s;
}
export function buyClothes(state,wallet,ids,day=1){
 if(!Array.isArray(ids)||!ids.length||ids.some(id=>!CLOTHES.some(i=>i.id===id)))return {ok:false,state,wallet,reason:'Choose an item from the shop.'};
 const items=[...new Set(ids)].map(id=>CLOTHES.find(i=>i.id===id)).filter(i=>i.price>0&&!state.owned.includes(i.id)),total=items.reduce((n,i)=>n+clothingPrice(i),0);
 if(!items.length||!Number.isSafeInteger(wallet)||wallet<total)return {ok:false,state,wallet,reason:items.length?'Your wallet does not cover this basket.':'These clothes are already yours.'};
 const equipped={...state.equipped};for(const item of items)equipped[item.slot]=item.id;
 return {ok:true,items,total,wallet:wallet-total,state:{...state,owned:[...state.owned,...items.map(i=>i.id)],equipped,spent:state.spent+total,receipts:[...state.receipts,{items:items.map(i=>i.id),total,day}].slice(-30)}};
}
export function wearClothing(state,id){const item=CLOTHES.find(i=>i.id===id);if(!item||!state.owned.includes(id))return {ok:false,state};return {ok:true,state:{...state,equipped:{...state.equipped,[item.slot]:id}}};}
export function wardrobeAppearance(state){
 const item=slot=>CLOTHES.find(i=>i.id===state.equipped[slot]),top=item('top'),pants=item('bottom'),shoes=item('shoes'),hat=item('hat'),bag=item('backpack');
 return {shirt:top.color??state.starter.shirt,topPattern:top.pattern||0,pants:pants.color,shoes:shoes.color??state.starter.shoes,hatColor:hat.color??0xe0b957,backpackColor:bag.color??0x657e92,wardrobe:{hat:hat.price>0,backpack:bag.price>0}};
}
