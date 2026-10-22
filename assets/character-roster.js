// Every character model the game can load. All are Microsoft Rocketbox avatars
// (MIT, see assets/characters/ATTRIBUTION.md). `source` is the Rocketbox folder the
// model and its specular scan come from. `bones` is the skeleton prefix (children
// use Bip02). Story and customizable characters use the original six; `crowd`
// models dress background townspeople so the streets are not full of twins.
export const MODELS=Object.freeze({
 child:{file:'female-child-01.glb',set:'f',height:1.4,source:'Children/Female_Child_01',bones:'Bip02'},
 boy:{file:'male-child-01.glb',set:'m',height:1.38,source:'Children/Male_Child_01',bones:'Bip02'},
 mom:{file:'female-adult-01.glb',set:'f',height:1.72,source:'Adults/Female_Adult_01'},
 maya:{file:'female-adult-05.glb',set:'f',height:1.7,source:'Adults/Female_Adult_05'},
 neighbor:{file:'male-adult-02.glb',set:'m',height:1.8,source:'Adults/Male_Adult_02'},
 casual:{file:'male-adult-09.glb',set:'m',height:1.76,source:'Adults/Male_Adult_09'},
 f02:{file:'crowd/female-adult-02.glb',set:'f',height:1.66,source:'Adults/Female_Adult_02',crowd:true},
 f04:{file:'crowd/female-adult-04.glb',set:'f',height:1.69,source:'Adults/Female_Adult_04',crowd:true},
 f12:{file:'crowd/female-adult-12.glb',set:'f',height:1.64,source:'Adults/Female_Adult_12',crowd:true},
 f13:{file:'crowd/female-adult-13.glb',set:'f',height:1.68,source:'Adults/Female_Adult_13',crowd:true},
 f15:{file:'crowd/female-adult-15.glb',set:'f',height:1.71,source:'Adults/Female_Adult_15',crowd:true},
 fp02:{file:'crowd/female-party-02.glb',set:'f',height:1.67,source:'Adults/Female_Party_02',crowd:true},
 m03:{file:'crowd/male-adult-03.glb',set:'m',height:1.77,source:'Adults/Male_Adult_03',crowd:true},
 m04:{file:'crowd/male-adult-04.glb',set:'m',height:1.83,source:'Adults/Male_Adult_04',crowd:true},
 m08:{file:'crowd/male-adult-08.glb',set:'m',height:1.79,source:'Adults/Male_Adult_08',crowd:true},
 m12:{file:'crowd/male-adult-12.glb',set:'m',height:1.85,source:'Adults/Male_Adult_12',crowd:true},
 m14:{file:'crowd/male-adult-14.glb',set:'m',height:1.74,source:'Adults/Male_Adult_14',crowd:true},
 m17:{file:'crowd/male-adult-17.glb',set:'m',height:1.78,source:'Adults/Male_Adult_17',crowd:true},
 fc02:{file:'crowd/female-child-02.glb',set:'f',height:1.34,source:'Children/Female_Child_02',bones:'Bip02',crowd:true,child:true},
 mc02:{file:'crowd/male-child-02.glb',set:'m',height:1.36,source:'Children/Male_Child_02',bones:'Bip02',crowd:true,child:true}
});
export const CROWD_ADULTS=Object.freeze(Object.keys(MODELS).filter(k=>MODELS[k].crowd&&!MODELS[k].child));
export const CROWD_CHILDREN=Object.freeze(Object.keys(MODELS).filter(k=>MODELS[k].crowd&&MODELS[k].child));
// Deterministic pick so the same street always has the same faces after a reload.
export function crowdModel(seed,{child=false}={}){const pool=child?CROWD_CHILDREN:CROWD_ADULTS,n=Math.abs(Math.floor(seed))||0;return pool[n%pool.length];}
// Specular intensity scans → glTF roughness (0.98 − √s, kept between .2 and .95).
export function roughnessFromSpecular(s){return Math.min(.95,Math.max(.2,.98-Math.sqrt(Math.max(0,s))));}
