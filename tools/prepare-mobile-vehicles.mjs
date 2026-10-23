// Extract only the authored medium/distant bodies and wheel rigs. This build
// never ships the largest geometry to phones. Requires only the pinned Three.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:'+blob.type+';base64,'+Buffer.from(value).toString('base64');this.onloadend?.();});}};
for(const id of ['gls','senna']){
 const input=new URL('../assets/vehicles/'+id+'.glb.gz',import.meta.url),bytes=gunzipSync(await readFile(input));
 const {scene}=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const remove=[];scene.traverse(o=>{if(/^near_(body|LF|RF|LR|RR)$/.test(o.name))remove.push(o);});for(const object of remove)object.removeFromParent();
 const output=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:false});
 const compressed=gzipSync(new Uint8Array(output),{level:9});await writeFile(new URL('../assets/vehicles/'+id+'-mobile.glb.gz',import.meta.url),compressed);
 console.log(id,compressed.length,'bytes; medium/distant geometry only');
}
