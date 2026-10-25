// Bake current Senna normals and auxiliary lights, preserving original meshopt
// buffers/geometry. Run: node tools/prepare-ready-vehicles.mjs
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {preparePremiumVehicleTemplate} from '../assets/premium-vehicles.js';
import {mountVehicle} from '../assets/vehicles.js';
for(const mobile of [false,true])for(const id of ['gls','senna']){
  const suffix=mobile?'-mobile':'',bytes=gunzipSync(await readFile(new URL('../assets/vehicles/'+id+suffix+'.glb.gz',import.meta.url)));
  const jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),bin=bytes.subarray(28+jsonLength),chunks=[bin];let offset=bin.length;
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const before=[];gltf.scene.traverse(o=>{if(o.isMesh)before.push({object:o,geometry:o.geometry,association:gltf.parser.associations.get(o)});});
  const template=preparePremiumVehicleTemplate(gltf.scene,id,{mobile}),car=new THREE.Group();mountVehicle(car,template,0xffffff);
  for(const {object,geometry,association} of before){
    if(object.geometry===geometry)continue;
    // Map welded normals back to the original vertex slots. Keep original
    // positions/indices/UVs, wheel extras and all original compressed buffers.
    const normals=new Float32Array(geometry.attributes.position.count*3),source=object.geometry;
    const count=geometry.index?.count||geometry.attributes.position.count;
    for(let k=0;k<count;k++){
      const from=source.index?source.index.getX(k):k,to=geometry.index?geometry.index.getX(k):k,n=source.attributes.normal;
      normals[to*3]=n.getX(from);normals[to*3+1]=n.getY(from);normals[to*3+2]=n.getZ(from);
    }
    if(association?.meshes==null||association?.primitives==null)throw new Error('Missing source primitive association');
    const view=json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:normals.byteLength,target:34962})-1;
    const accessor=json.accessors.push({bufferView:view,componentType:5126,count:normals.length/3,type:'VEC3'})-1;
    json.meshes[association.meshes].primitives[association.primitives].attributes.NORMAL=accessor;
    chunks.push(Buffer.from(normals.buffer));offset+=normals.byteLength;
  }
  json.buffers[0].byteLength=offset;
  const scene=json.scenes[json.scene||0];scene.extras={...scene.extras,vehiclePreparation:{version:1,modelId:id,mobile,auxiliary:Object.fromEntries(Object.entries(template.auxiliary).map(([key,g])=>[key,g?.toJSON().data||null]))}};
  const encoded=Buffer.from(JSON.stringify(json)),padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);encoded.copy(padded);
  const binary=Buffer.concat(chunks),header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
  binHeader.writeUInt32LE(binary.length);binHeader.writeUInt32LE(0x004e4942,4);
  const output=Buffer.concat([header,padded,binHeader,binary]),compressed=gzipSync(output,{level:9});
  await writeFile(new URL('../assets/vehicles/'+id+suffix+'-ready.glb.gz',import.meta.url),compressed);
  console.log(id+suffix,compressed.length,'compressed bytes;',output.length,'decoded bytes; normals and auxiliary lamps prepared');
}
