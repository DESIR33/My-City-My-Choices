// Prepared Mustang geometry. OBJ parsing, welding and rear-panel projection are
// build-time work; runtime views share the packed, aligned attribute buffers.
import * as THREE from 'three';

export function decodeVehicleTemplate(buffer) {
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<8||buffer.byteLength>48*1024*1024)throw new Error('Invalid vehicle template');
  const size=new DataView(buffer).getUint32(0,true);
  if(size<2||size>65536||size+4>buffer.byteLength)throw new Error('Invalid vehicle template header');
  const header=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,4,size))),base=Math.ceil((4+size)/4)*4;
  if(header.version!==1||!Array.isArray(header.names)||header.centers?.length!==4||!Array.isArray(header.panels))throw new Error('Unsupported vehicle template');
  function geometry(data){
    const g=new THREE.BufferGeometry();
    const attribute=d=>{
      const Type={f32:Float32Array,u16:Uint16Array,u32:Uint32Array}[d.type];
      if(!Type||!Number.isSafeInteger(d.offset)||d.offset<0||d.offset%4||!Number.isSafeInteger(d.count)||d.count<1||![1,2,3,4].includes(d.itemSize)||d.count%d.itemSize||base+d.offset+d.count*Type.BYTES_PER_ELEMENT>buffer.byteLength)throw new Error('Invalid vehicle attribute');
      return new THREE.BufferAttribute(new Type(buffer,base+d.offset,d.count),d.itemSize);
    };
    for(const [name,d] of Object.entries(data.attributes))g.setAttribute(name,attribute(d));
    if(data.index)g.setIndex(attribute(data.index));
    for(const group of data.groups)g.addGroup(group.start,group.count,group.materialIndex);
    g.boundingBox=new THREE.Box3(new THREE.Vector3().fromArray(data.min),new THREE.Vector3().fromArray(data.max));
    g.boundingSphere=new THREE.Sphere(new THREE.Vector3().fromArray(data.sphere.center),data.sphere.radius);
    return g;
  }
  const body={geometry:geometry(header.body),names:header.names};
  const centers=header.centers.map(c=>{if(c.length!==3||!c.every(Number.isFinite))throw new Error('Invalid vehicle wheel');return new THREE.Vector3().fromArray(c);});
  const rearSurface=new THREE.Mesh(body.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));rearSurface.updateMatrixWorld();
  return {body,centers,rearSurface,rearPanels:new Map(header.panels.map(([key,data])=>[key,geometry(data)]))};
}
