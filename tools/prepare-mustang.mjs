// Preserve the exact existing Ford template, including welded normals and
// projected rear lamps/plate. Run with the pinned Three dependency: node tools/prepare-mustang.mjs
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {prepareVehicleTemplate,mountVehicle} from '../assets/vehicles.js';
const mtl=new MTLLoader().parse(await readFile(new URL('../assets/MapleStreetMustang.mtl',import.meta.url),'utf8'),'');mtl.preload();
const original=new OBJLoader().setMaterials(mtl).parse(gunzipSync(await readFile(new URL('../assets/maple-mustang.obj.gz',import.meta.url))).toString());
const template=prepareVehicleTemplate(original);mountVehicle(new THREE.Group(),template,0xffffff);
const chunks=[];let offset=0;
function attribute(a){
  const type=a.array instanceof Float32Array?'f32':a.array instanceof Uint16Array?'u16':a.array instanceof Uint32Array?'u32':null;
  if(!type)throw new Error('Unsupported geometry attribute');
  const bytes=Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength),result={type,offset,count:a.array.length,itemSize:a.itemSize};
  chunks.push(bytes);offset+=bytes.length;const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}return result;
}
function geometry(g){
  g.computeBoundingBox();g.computeBoundingSphere();
  return {attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,attribute(a)])),index:g.index?attribute(g.index):null,groups:g.groups,min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray(),sphere:{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}};
}
const header=Buffer.from(JSON.stringify({version:1,names:template.body.names,centers:template.centers.map(c=>c.toArray()),body:geometry(template.body.geometry),panels:[...template.rearPanels].map(([key,g])=>[key,geometry(g)])}));
const prefix=Buffer.alloc(Math.ceil((4+header.length)/4)*4);prefix.writeUInt32LE(header.length);header.copy(prefix,4);
const raw=Buffer.concat([prefix,...chunks]),compressed=gzipSync(raw,{level:9,mtime:0});
await writeFile(new URL('../assets/vehicles/mustang-template.bin.gz',import.meta.url),compressed);
console.log(JSON.stringify({compressedBytes:compressed.length,decodedBytes:raw.length,vertices:template.body.geometry.attributes.position.count,panels:template.rearPanels.size}));
