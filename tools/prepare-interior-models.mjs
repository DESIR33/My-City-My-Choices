#!/usr/bin/env node
// Builds furnished-interior models from owner-supplied FBX files:
//   assets/interior/bedroom-set.glb   bed, nightstands, rug, ottoman and bedside decor
//                                     from bedroom_01.fbx (a full staged room; walls,
//                                     wardrobe, curtains and ceiling lamps are left out)
//   assets/interior/accent-cabinet.glb  Laurens accent cabinet with its decor
// Neither FBX ships its textures (they point at the author's local drives), so each
// part gets a believable PBR material by name. Run from the repository root:
//   npm install --no-save three@0.180.0 @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 \
//     @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1
//   node tools/prepare-interior-models.mjs --bedroom /path/bedroom_01.fbx --cabinet /path/LaurensAccentCabinet.FBX
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';

let NodeIO,Document,getBounds,ALL_EXTENSIONS,F,MeshoptSimplifier,THREE,FBXLoader,BGU;
try{({NodeIO,Document,getBounds}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptSimplifier}=await import('meshoptimizer'));THREE=await import('three');({FBXLoader}=await import('three/examples/jsm/loaders/FBXLoader.js'));BGU=await import('three/examples/jsm/utils/BufferGeometryUtils.js');}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),OUT='assets/interior';await mkdir(OUT,{recursive:true});
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const srgb=hex=>[16,8,0].map(s=>(((hex>>s)&255)/255)**2.2);
const tris=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
function finishMaterials(doc,palette){
  for(const m of doc.getRoot().listMaterials()){const look=palette(m.getName());m.setBaseColorTexture(null).setMetallicRoughnessTexture(null).setNormalTexture(null).setEmissiveTexture(null).setOcclusionTexture(null);
    m.setBaseColorFactor([...srgb(look[0]),look[3]??1]).setRoughnessFactor(look[1]).setMetallicFactor(look[2]).setAlphaMode((look[3]??1)<1?'BLEND':'OPAQUE').setDoubleSided(!!look[4]);m.setName(look.name||m.getName());}
}
async function capPrimitives(doc,cap,error){for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){const n=(p.getIndices()?.getCount()??0)/3;if(n>cap)F.simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:cap/n,error,lockBorder:false});}await doc.transform(F.weld(),F.prune());}

// ---- Bedroom: keep the furniture nodes only.
if(arg('--bedroom')){
  const tmp=await mkdtemp(join(tmpdir(),'bedroom-'));execFileSync(FBX2GLTF,['--binary','--input',arg('--bedroom'),'--output',join(tmp,'b')],{stdio:'ignore'});
  const doc=await io.read(join(tmp,'b.glb'));await rm(tmp,{recursive:true,force:true});
  const KEEP=/^(andersen_01_01[0-8]|Object004|Object005|DS_06_01|MELLAL HAND-KNOTTED WOOL RUG|Coco Republic Baxter Ottoman Square)$/;
  const root=doc.getRoot(),before=tris(doc);
  for(const n of root.listNodes())if(n.getMesh()&&!KEEP.test(n.getName()))n.setMesh(null);
  await doc.transform(F.prune());
  // Part colours by original material name (textures were not shipped with the FBX).
  const P={
    'andersen_01_Material #21546432435':[0x5f5a54,.92,0,1,false],   // upholstered bed frame
    'andersen_01_Material #21543213214':[0x49423b,.9,0,1,false],    // headboard and ottoman fabric
    'Material #21544324235':[0xece6da,.88,0,1,false],               // fitted sheet
    'andersen_01_Material #2431546432':[0xf3efe6,.9,0,1,false],     // duvet and pillows
    'andersen_01_Material #21546546547':[0xb59a74,.85,0,1,false],   // folded throw
    'NATURAL CHALET OAK':[0xb08a5e,.55,0,1,false],                  // nightstands
    'Material #2003701078':[0x3a332d,.6,0,1,false],                 // plinths and drawer fronts
    'MELLAL HAND-KNOTTED WOOL RUG-001':[0xcfc4b1,.97,0,1,false],    // wool rug
    'Metal':[0xb59658,.3,1,1,false],
    'CPh_DS_06_gold_02':[0xc2a061,.28,1,1,false],'CPh_DS_06_book_01':[0x6f7f86,.8,0],'CPh_DS_06_book_02':[0xd8cdb8,.8,0],'CPh_DS_06_vase_01':[0xe9e4da,.25,0],
    'CPh_DS_06_candle_01':[0xf4efe4,.6,0],'CPh_DS_06_candleroot_01':[0x222222,.7,0],'CPh_DS_06_plant_01':[0x8a7b62,.8,0],'CPh_DS_06_plantleaf_01':[0x5d6e48,.75,0,1,true],
    'CPh_DS_06_cups_01':[0xeeeae2,.2,0],'CPh_DS_06_coffee_01':[0x3b2a1e,.4,0],'CPh_DS_06_coffee_02':[0x6b4f3a,.5,0],'CPh_DS_06_woodstiks_01':[0x7a5a3c,.8,0],'CPh_DS_06_basestiks_01':[0xd6d0c4,.5,0]
  };
  finishMaterials(doc,name=>P[name]||[0x8c857b,.8,0]);
  await doc.transform(F.dedup(),F.flatten(),F.join({keepNamed:false}),F.weld(),F.prune());
  await capPrimitives(doc,9000,.004);
  const ratio=Math.min(1,Number(arg('--bedroom-triangles')||60000)/tris(doc));
  await doc.transform(F.simplify({simplifier:MeshoptSimplifier,ratio,error:.003,lockBorder:false}),F.weld(),F.prune(),F.quantize());
  await io.write(join(OUT,'bedroom-set.glb'),doc);const b=getBounds(root.listScenes()[0]);
  console.log('bedroom',before,'→',tris(doc),'triangles; bounds',b.min.map(v=>v.toFixed(2)).join(','),'→',b.max.map(v=>v.toFixed(2)).join(','));
}

// ---- Accent cabinet: the FBX ends mid-way through its connection list. Repair the
// node tree in memory, parse it with three's FBXLoader and rebuild the glTF.
if(arg('--cabinet')){
  const src=new Uint8Array(await readFile(arg('--cabinet'))),fixed=repairFbx(src);
  globalThis.self??=globalThis;THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
  const quiet=console.warn;console.warn=()=>{};const obj=new FBXLoader().parse(fixed.buffer,'');console.warn=quiet;obj.updateMatrixWorld(true);
  const doc=new Document(),buffer=doc.createBuffer(),mesh=doc.createMesh('accent-cabinet'),mats=new Map();
  // FBX units are centimetres; the cabinet front faces +Z after re-centring on its footprint.
  const C={'white pain ':[0xeee9df,.42,0,'lacquer'],'Material #29':[0xc9a35e,.26,1,'brass'],'ceiling':[0xd9d4c9,.35,0,'panel'],'Material #30':[0xd8d2c6,.3,0,'ceramic'],'Material #26':[0xf0ebe0,.7,0,'books'],'Material #31':[0x8b8f88,.4,.2,'stone'],'Wax':[0xf3eee3,.55,0,'wax']};
  const box=new THREE.Box3();obj.traverse(o=>{if(o.isMesh&&!/^Circle00[56]$/.test(o.name))box.expandByObject(o);});
  const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2;let count=0;
  obj.traverse(o=>{if(!o.isMesh||/^Circle00[56]$/.test(o.name))return; // the round wall mirror stays with the wall, not the cabinet
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);g.scale(.01,.01,.01);g.translate(-cx*.01,0,-cz*.01);
    const groups=g.groups.length?g.groups:[{start:0,count:g.attributes.position.count,materialIndex:0}],list=Array.isArray(o.material)?o.material:[o.material];
    for(const grp of groups){const name=list[grp.materialIndex]?.name||'white pain ',look=C[name]||C['white pain '];
      if(!mats.has(look[3]))mats.set(look[3],doc.createMaterial(look[3]).setBaseColorFactor([...srgb(look[0]),1]).setRoughnessFactor(look[1]).setMetallicFactor(look[2]));
      // Creased normals: smooth across curves, sharp on edges sharper than 35°.
      const part=new THREE.BufferGeometry();part.setAttribute('position',new THREE.BufferAttribute(g.attributes.position.array.slice(grp.start*3,(grp.start+grp.count)*3),3));
      const creased=BGU.toCreasedNormals(BGU.mergeVertices(part,1e-5),35*Math.PI/180),pos=creased.attributes.position.array,nor=creased.attributes.normal.array;
      mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer)).setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from({length:pos.length/3},(_,i)=>i)).setBuffer(buffer)).setMaterial(mats.get(look[3])));count+=grp.count/3;}
  });
  doc.createScene().addChild(doc.createNode('accent-cabinet').setMesh(mesh));
    await doc.transform(F.join({keepNamed:false}),F.weld(),F.dedup(),F.prune());await capPrimitives(doc,6000,.004);
  await doc.transform(F.simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,Number(arg('--cabinet-triangles')||22000)/tris(doc)),error:.004,lockBorder:false}),F.weld(),F.prune(),F.quantize());
  await io.write(join(OUT,'accent-cabinet.glb'),doc);const b=getBounds(doc.getRoot().listScenes()[0]);
  console.log('cabinet',count,'→',tris(doc),'triangles; bounds',b.min.map(v=>v.toFixed(2)).join(','),'→',b.max.map(v=>v.toFixed(2)).join(','));
}

// Truncated binary FBX 7.x: keep complete Connections records, reattach the missing
// tail (parents, geometry and materials, in the order Max writes them), close the tree.
function repairFbx(b){
  const dv=new DataView(b.buffer,b.byteOffset,b.byteLength),u32=o=>dv.getUint32(o,true);
  const node=o=>{const end=u32(o),n=u32(o+4),pl=u32(o+8),nl=b[o+12];return {end,n,pl,nl,name:new TextDecoder().decode(b.subarray(o+13,o+13+nl)),props:o+13+nl,first:o+13+nl+pl};};
  const props=(o,n)=>{const out=[];for(let i=0;i<n;i++){const t=String.fromCharCode(b[o++]);if(t==='L'){out.push(dv.getBigInt64(o,true));o+=8;}else if(t==='S'||t==='R'){const l=u32(o);out.push(new TextDecoder('latin1').decode(b.subarray(o+4,o+4+l)));o+=4+l;}else if(t==='I'){out.push(dv.getInt32(o,true));o+=4;}else if(t==='D'){out.push(dv.getFloat64(o,true));o+=8;}else if(t==='F'){o+=4;out.push(0);}else if(t==='Y'){o+=2;out.push(0);}else if(t==='C'){o+=1;out.push(0);}else{const cl=u32(o+8);o+=12+cl;out.push(null);}}return out;};
  let o=27,objects=null,conn=null;while(o<b.length){const nd=node(o);if(!nd.end)break;if(nd.name==='Objects')objects=o;if(nd.name==='Connections'){conn=o;break;}o=nd.end;}
  if(conn===null||node(conn).end<=b.length)return b;
  const models=[],geoms=[],textures=[],mats=new Map();let c=node(objects).first;
  while(c<node(objects).end){const nd=node(c);if(!nd.end)break;const pr=props(nd.props,nd.n);if(nd.name==='Model')models.push({id:pr[0],name:pr[1].split('\0')[0],mesh:pr[2]==='Mesh'});if(nd.name==='Geometry')geoms.push(pr[0]);if(nd.name==='Texture')textures.push(pr[0]);if(nd.name==='Material')mats.set(pr[1].split('\0')[0],pr[0]);c=nd.end;}
  const records=[];c=node(conn).first;while(c+13<=b.length){const end=u32(c);if(!end||end>b.length)break;records.push(props(node(c).props,node(c).n));c=end;}
  const keepEnd=c,child=new Map(records.map(r=>[r[1],r[2]])),hasGeo=new Set(records.filter(r=>geoms.includes(r[1])).map(r=>r[2])),hasMat=new Set(records.filter(r=>[...mats.values()].includes(r[1])).map(r=>r[2]));
  const lastGroup=[...models].reverse().find(m=>!m.mesh&&child.has(m.id)),add=[];
  for(const m of models)if(!child.has(m.id))add.push([m.id,lastGroup.id]);
  const free=geoms.filter(g=>!child.has(g)),need=models.filter(m=>m.mesh&&!hasGeo.has(m.id));need.forEach((m,i)=>free[i]!==undefined&&add.push([free[i],m.id]));
  // Textures were never shipped; give orphaned texture nodes the root as parent so parsers skip them.
  for(const t of textures)if(!child.has(t)&&!records.some(r=>r[2]===t))add.push([t,0n]);
  const guess=n=>/^Circle/.test(n)?'Material #31':/^(Line00[5-8]|Shape)/.test(n)?'Material #29':/^Line/.test(n)?'Material #30':'Material #26';
  for(const m of need)if(!hasMat.has(m.id)&&mats.has(guess(m.name)))add.push([mats.get(guess(m.name)),m.id]);
  const parts=[b.subarray(0,keepEnd)];let size=keepEnd;
  for(const [ch,pa] of add){const pl=new Uint8Array(25),pv=new DataView(pl.buffer);pl[0]=83;pv.setUint32(1,2,true);pl[5]=79;pl[6]=79;pl[7]=76;pv.setBigInt64(8,ch,true);pl[16]=76;pv.setBigInt64(17,pa,true);
    const rec=new Uint8Array(13+1+pl.length),rv=new DataView(rec.buffer);rv.setUint32(0,size+rec.length,true);rv.setUint32(4,3,true);rv.setUint32(8,pl.length,true);rec[12]=1;rec[13]=67;rec.set(pl,14);parts.push(rec);size+=rec.length;}
  parts.push(new Uint8Array(26));size+=26;const out=new Uint8Array(size+200);let p=0;for(const part of parts){out.set(part,p);p+=part.length;}
  new DataView(out.buffer).setUint32(conn,size-13,true);return out;
}
