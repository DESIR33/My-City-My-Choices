// Stable assignments keep parked cars recognizable across reloads. Civilian
// slots are counted separately from police so both districts get the same mix.
export const FLEET_MODELS=Object.freeze({
  mustang:Object.freeze({brand:'Ford',model:'Mustang',name:'Ford Mustang'}),
  gls:Object.freeze({brand:'Mercedes-Benz',model:'GLS',name:'Mercedes-Benz GLS'}),
  senna:Object.freeze({brand:'McLaren',model:'Senna',name:'McLaren Senna'}),
});
export const FLEET_PAINTS=Object.freeze([
  {name:'Pearl white',color:0xf2f0e8},{name:'Silver',color:0xbec7d1},
  {name:'Graphite',color:0x343a43},{name:'Cobalt blue',color:0x215fbd},
  {name:'Cherry red',color:0xc92d39},{name:'Forest green',color:0x32684c},
  {name:'Champagne',color:0xbfa271},{name:'Papaya orange',color:0xf47a29},
  {name:'Ocean teal',color:0x218e96},{name:'Warm ivory',color:0xdad3bf},
  {name:'Sunburst yellow',color:0xf1c23d},{name:'Burgundy',color:0x783b59},
].map(Object.freeze));
const rotation=Object.freeze(['mustang','gls','mustang','gls','senna']);

export function civilianAppearance(index) {
  index=Number.isSafeInteger(index)&&index>=0?index:0;
  const modelId=rotation[index%rotation.length];
  // Five and twelve are coprime, so recurring model slots do not get locked
  // to one paint. The first McLaren gets the distinctive orange finish.
  const paint=FLEET_PAINTS[(index*5+(modelId==='senna'?11:0))%FLEET_PAINTS.length];
  return {index,modelId,...FLEET_MODELS[modelId],paintName:paint.name,color:paint.color};
}

export function availableFleetModel(appearance,available) {
  if(available.has(appearance.modelId))return appearance.modelId;
  const remaining=Object.keys(FLEET_MODELS).filter(id=>available.has(id));
  return remaining.length?remaining[appearance.index%remaining.length]:null;
}
