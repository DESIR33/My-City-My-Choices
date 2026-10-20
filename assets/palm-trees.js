import * as THREE from 'three';

const UP=new THREE.Vector3(0,1,0);
const species=[{name:'Coconut',height:9.2,lean:1.05,radius:.24,spread:4.3,fronds:26},{name:'Coastal coconut',height:10.4,lean:1.8,radius:.26,spread:4.7,fronds:25},{name:'Royal',height:11.8,lean:.5,radius:.32,spread:3.9,fronds:28}];
function random(seed){let n=seed>>>0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
function builder(){
 const p=[],c=[],uv=[],wind=[],indices=[];
 return {vertex(v,color,u=0,t=0,w=0){const i=p.length/3;p.push(v.x,v.y,v.z);c.push(color.r,color.g,color.b);uv.push(u,t);wind.push(w);return i;},tri(a,b,d){indices.push(a,b,d);},quad(a,b,d,e){indices.push(a,b,d,a,d,e);},finish(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('palmWind',new THREE.Float32BufferAttribute(wind,1));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}};
}
function barkTextures(){
 // A repeatable data texture supplies fine ring scars, longitudinal fibres, and
 // rough bark without external downloads or large per-tree texture allocations.
 const width=256,height=1024,color=new Uint8Array(width*height*4),relief=new Uint8Array(width*height*4),rng=random(80123);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=x/width,v=y/height,ring=((v*42+.035*Math.sin(u*Math.PI*8))%1),scar=Math.exp(-Math.pow((ring-.12)/.09,2)),fibre=Math.sin(u*Math.PI*164+Math.sin(v*30)*1.2)*.035,noise=(rng()-.5)*.13;
  const tone=Math.max(.2,Math.min(.92,.68-scar*.23+fibre+noise)),i=(y*width+x)*4;
  color[i]=Math.round(150*tone);color[i+1]=Math.round(141*tone);color[i+2]=Math.round(120*tone);color[i+3]=255;
  const b=Math.round(170-scar*75+fibre*100+noise*100);relief[i]=relief[i+1]=relief[i+2]=b;relief[i+3]=255;
 }
 function texture(data,srgb=false){const t=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}
 return {map:texture(color,true),bump:texture(relief)};
}
export function createPalmTemplates(){
 const textures=barkTextures(),windTime={value:0};
 const bark=new THREE.MeshStandardMaterial({map:textures.map,bumpMap:textures.bump,bumpScale:.045,roughness:.96,vertexColors:true});
 const foliage=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide});
 foliage.onBeforeCompile=shader=>{shader.uniforms.palmTime=windTime;shader.vertexShader='attribute float palmWind;\nuniform float palmTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float palmPhase=0.0;
   #ifdef USE_INSTANCING
    palmPhase=instanceMatrix[3].x*.19+instanceMatrix[3].z*.037;
   #endif
   transformed.x+=sin(palmTime*.8+palmPhase+position.y*.4)*.11*palmWind;
   transformed.z+=sin(palmTime*.57+palmPhase+position.x*.7)*.075*palmWind;
 `);};
 foliage.customProgramCacheKey=()=> 'sunshore-palm-fronds-v2';
 function geometry(kind,detailed){
  const spec=species[kind],rng=random(7027+kind*349),trunk=builder(),crown=builder(),trunkRows=detailed?100:24,sides=detailed?16:8;
  const center=t=>new THREE.Vector3(spec.lean*t*t,spec.height*t,.26*Math.sin(t*Math.PI*.85));
  const barkColor=new THREE.Color(0xffffff);
  for(let y=0;y<=trunkRows;y++){
   const t=y/trunkRows,origin=center(t),tangent=center(Math.min(1,t+.005)).sub(center(Math.max(0,t-.005))).normalize(),q=new THREE.Quaternion().setFromUnitVectors(UP,tangent);
   const radius=spec.radius*(1-.35*t)+.16*Math.exp(-t*28)+.004*Math.sin(t*42*Math.PI*2);
   for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,v=new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius).applyQuaternion(q).add(origin);trunk.vertex(v,barkColor,j/sides,t);if(y<trunkRows&&j<sides){const i=y*(sides+1)+j;trunk.quad(i,i+sides+1,i+sides+2,i+1);}}
  }
  const tip=center(1),green=new THREE.Color(0x38683b),rachisColor=new THREE.Color(0x718342);
  // A short green crownshaft and old leaf bases conceal the cut cylinder end.
  function tube(b,curve,startRadius,endRadius,color,segments=12,radial=5,wind=0){
   const start=b.vertex(curve(0),color,0,0,wind);
   // Separate rings allow a tapered petiole with a continuous closed surface.
   const rings=[];for(let k=0;k<=segments;k++){const t=k/segments,origin=curve(t),tangent=curve(Math.min(1,t+.005)).sub(curve(Math.max(0,t-.005))).normalize(),q=new THREE.Quaternion().setFromUnitVectors(UP,tangent),ring=[];for(let j=0;j<=radial;j++){const a=j/radial*Math.PI*2;ring.push(b.vertex(new THREE.Vector3(Math.cos(a),0,Math.sin(a)).multiplyScalar(startRadius+(endRadius-startRadius)*t).applyQuaternion(q).add(origin),color,j/radial,t,wind*t));}rings.push(ring);if(k)for(let j=0;j<radial;j++)b.quad(rings[k-1][j],ring[j],ring[j+1],rings[k-1][j+1]);}
   for(let j=0;j<radial;j++)b.tri(start,rings[0][j+1],rings[0][j]);
  }
  tube(crown,t=>tip.clone().add(new THREE.Vector3(.03*t,(kind===2?1.05:.48)*t,0)),spec.radius*.76,spec.radius*.42,green,8,8);
  const origin=tip.clone().add(new THREE.Vector3(.02,kind===2?.85:.3,0));
  if(kind!==2&&detailed)for(let i=0;i<5;i++){const a=i*2.399,fruit=new THREE.Vector3(Math.cos(a)*.24,-.15-(i%2)*.17,Math.sin(a)*.24).add(origin),color=new THREE.Color(i%2?0x586739:0x75603b),rows=5,rad=7,base=[];for(let y=0;y<=rows;y++){const t=y/rows,ring=[];for(let j=0;j<=rad;j++){const a=j/rad*Math.PI*2,rr=Math.sin(t*Math.PI)*.15;ring.push(crown.vertex(fruit.clone().add(new THREE.Vector3(Math.cos(a)*rr,Math.cos(t*Math.PI)*.2,Math.sin(a)*rr)),color));}base.push(ring);if(y)for(let j=0;j<rad;j++)crown.quad(base[y-1][j],ring[j],ring[j+1],base[y-1][j+1]);}}
  const count=detailed?spec.fronds:18;
  for(let n=0;n<count;n++){
   const angle=n*2.399963+kind*.63+(rng()-.5)*.22,forward=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
   const tier=n%5,upright=tier===0,old=tier===4&&n>count-8,length=spec.spread*(upright?.63:old?.83:.88+rng()*.22),rise=upright?2.5:old?.25:1.1+rng()*.85,drop=upright?.7:old?3.3:1.9+rng()*.7,twist=(rng()-.5)*.22;
   const base=origin.clone().add(new THREE.Vector3(0,(rng()-.5)*.28,0));
   const spine=t=>base.clone().addScaledVector(forward,length*t).addScaledVector(side,Math.sin(t*Math.PI)*twist).add(new THREE.Vector3(0,rise*Math.sin(t*Math.PI*.75)-drop*t*t,0));
   const color=new THREE.Color(old?0x727044:[0x28552d,0x356f37,0x447d3b,0x2f6532,0x56833d][n%5]);
   tube(crown,spine,.037,.004,old?new THREE.Color(0x847343):rachisColor,detailed?16:6,detailed?5:3,1);
   const pairs=detailed?25:11;
   for(let k=0;k<pairs;k++)for(const sign of [-1,1]){
    const t=.13+k/(pairs-1)*.82,jitter=(rng()-.5)*.025,attach=spine(t+jitter),fan=Math.pow(Math.sin(t*Math.PI),.68),bladeLength=(.26+1.04*fan)*(old?.85:1)*( .9+rng()*.2),sweep=.16+(.5*t),direction=side.clone().multiplyScalar(sign).addScaledVector(forward,sweep).normalize(),across=new THREE.Vector3(-direction.z,0,direction.x);
    const colorAt=(v,edge)=>color.clone().multiplyScalar((edge?.85:1.04)*(1-.2*v));
    const point=v=>attach.clone().addScaledVector(direction,bladeLength*v).addScaledVector(forward,.08*v*v).add(new THREE.Vector3(0,-(.12+.32*t)*v*v,0));
    if(detailed){const rows=[];for(const v of [0,.5,1]){const mid=point(v),width=(v===0?.012:v===1?.001:.075+.025*fan),fold=(v===.5?.035:0);rows.push([crown.vertex(mid.clone().addScaledVector(across,-width),colorAt(v,true),0,v,t+(1-t)*v),crown.vertex(mid.clone().add(new THREE.Vector3(0,fold,0)),colorAt(v,false),.5,v,t+(1-t)*v),crown.vertex(mid.clone().addScaledVector(across,width),colorAt(v,true),1,v,t+(1-t)*v)]);}
      for(let r=0;r<2;r++)for(let j=0;j<2;j++)crown.quad(rows[r][j],rows[r+1][j],rows[r+1][j+1],rows[r][j+1]);
    }else{const mid=point(.48),width=.1;const a=crown.vertex(attach,color,0,0,t),b=crown.vertex(mid.clone().addScaledVector(across,-width),color,0,.5,t),c=crown.vertex(point(1),color,1,1,1),d=crown.vertex(mid.clone().addScaledVector(across,width),color,1,.5,t);crown.quad(a,b,c,d);}
   }
  }
  return {trunk:trunk.finish(),crown:crown.finish()};
 }
 const templates=species.map((s,i)=>({name:s.name,height:s.height,near:geometry(i,true),far:geometry(i,false)}));
 return {templates,bark,foliage,windTime};
}

export function createPalmGrove({scene,placements,groundHeight,mobile=false}){
 const kit=createPalmTemplates(),dummy=new THREE.Object3D(),groups=[],meshes=[];
 for(let tile=0;tile<5;tile++)for(let variant=0;variant<3;variant++){
  const trees=placements.filter((p,i)=>Math.floor(p.z/450)===tile&&(i%3)===variant);if(!trees.length)continue;
  const group={trees,near:[],far:[]};for(const level of ['near','far'])for(const part of ['trunk','crown']){const mesh=new THREE.InstancedMesh(kit.templates[variant][level][part],part==='trunk'?kit.bark:kit.foliage,trees.length);mesh.name=part==='trunk'?'Textured palm trunks':'Layered palm crowns';mesh.userData.palmDetail=level;mesh.count=0;mesh.visible=false;mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);group[level].push(mesh);meshes.push(mesh);}groups.push(group);
 }
 let last=null;
 function update(dt,eye){kit.windTime.value+=Math.max(0,dt||0);if(!eye)return;const threshold=mobile?72:110;if(last&&Math.hypot(eye.x-last.x,eye.z-last.z)<12)return;last={x:eye.x,z:eye.z};for(const group of groups){let near=0,far=0;for(const p of group.trees){const close=Math.hypot(p.x-eye.x,p.z-eye.z)<threshold,level=close?'near':'far',i=close?near++:far++;dummy.position.set(p.x,groundHeight(p.x,p.z),p.z);dummy.rotation.set(0,p.z*.017+p.x,0);dummy.scale.set(p.scale*(.93+((Math.abs(p.x*13+p.z*7)%17)/17)*.14),p.scale,p.scale);dummy.updateMatrix();for(const mesh of group[level])mesh.setMatrixAt(i,dummy.matrix);}for(const level of ['near','far'])for(const mesh of group[level]){mesh.count=level==='near'?near:far;mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();}}}
 update(0,{x:0,z:0});return {...kit,meshes,update};
}
