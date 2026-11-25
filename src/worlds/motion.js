import * as T from 'three'

const colorFinish='\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n'

export function fall(craft,options) {
  const {center=[0,0,0],span=[28,19,20],count=100,color=0xffffff,speed=1,width=.28,style='snow'}=options
  const rain=style==='rain'
  const geometry=new T.BufferGeometry()
  const seeds=[]
  const positions=[]
  for(let i=0;i<(craft.detail==='low'?Math.round(count/2):count);i++){
    positions.push((craft.rng()-.5)*span[0],craft.rng()*span[1],(craft.rng()-.5)*span[2])
    seeds.push(craft.rng())
  }
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3))
  geometry.setAttribute('seed',new T.Float32BufferAttribute(seeds,1))
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,toneMapped:false,
    uniforms:{time:{value:0},extent:{value:span[1]},speed:{value:speed},width:{value:width},tint:{value:new T.Color(color)}},
    vertexShader:`
      attribute float seed;
      uniform float time, extent, speed, width;
      varying float fade;
      void main(){
        vec3 p=position;
        p.y=mod(p.y-time*speed*(.62+seed*.63),extent);
        p.x+=sin(seed*33.+time*(.55+seed))*(.2+seed*.6)+p.y*${rain?'.11':'.018'};
        vec4 projected=modelViewMatrix*vec4(p,1.);
        fade=smoothstep(0.,2.,p.y)*smoothstep(0.,2.,extent-p.y)*(.38+seed*.45);
        gl_PointSize=clamp(width*380./max(8.,-projected.z),1.4,24.);
        gl_Position=projectionMatrix*projected;
      }`,
    fragmentShader:`
      uniform vec3 tint;
      varying float fade;
      void main(){
        vec2 uv=gl_PointCoord-.5;
        float f=1.-smoothstep(.05,.48,length(uv*${rain?'vec2(6.5,.88)':'vec2(1.)'}));
        gl_FragColor=vec4(tint,f*fade);
        ${colorFinish}
      }`,
  })
  const points=new T.Points(geometry,material)
  points.position.set(...center)
  points.frustumCulled=false
  craft.architecture.add(points)
  craft.actions.push(time=>{material.uniforms.time.value=time})
}

export function fireplace(craft,x,y,z) {
  const flame=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
    uniforms:{time:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 vUv;
      uniform float time;
      float fire(vec2 p,float seed){
        float stem=(p.x-.5)*2.;
        float bend=sin(time*2.2+seed+p.y*5.4)*(.05+p.y*.19);
        float tongues=.65+.23*sin(p.y*11.-time*5.+seed)+.09*sin(time*8.2+p.y*17.);
        float width=max(.025,(1.-p.y)*(.44+tongues*.24));
        return smoothstep(width,.014,abs(stem-bend))*smoothstep(1.,.1,p.y)*smoothstep(0.,.13,p.y);
      }
      void main(){
        float f=fire(vUv,0.)*.74+fire(vUv+vec2(-.19,.08),2.1)*.22+fire(vUv+vec2(.21,.14),4.)*.25;
        float core=pow(max(f,0.),2.65);
        gl_FragColor=vec4(mix(vec3(.94,.075,.006),vec3(1.5,1.21,.46),core),f*.91);
        ${colorFinish}
      }`,
  })
  for(let i=0;i<4;i++){
    const mesh=craft.mesh(new T.PlaneGeometry(3.8,4.0),flame,x,y+1.7,z)
    mesh.rotation.y=i*Math.PI/4
  }
  const coals=craft.lit(0x241515,{emissive:0xf23b0a,emissiveIntensity:.52})
  for(let i=0;i<12;i++){
    const coal=craft.mesh(new T.IcosahedronGeometry(.23+craft.rng()*.25,1),coals,
      x+(craft.rng()-.5)*3,y+.12,z+(craft.rng()-.5)*1.7)
    coal.scale.y=.36
  }
  const logs=craft.wood(0x5a2e1b)
  for(let i=0;i<3;i++){
    const log=craft.cylinder(.19,.23,2.45,x+(i-1)*.31,y+.24+i*.13,z-.15+i*.21,logs,10)
    log.rotation.set(.12,0,Math.PI*.5+(i-1)*.13)
  }
  const light=craft.glow(0xff8219,430,24,x,y+1.4,z+.66)
  fall(craft,{center:[x,y,z],span:[2.8,4.1,1.2],count:24,color:0xfaa149,speed:-1.15,width:.12})
  craft.actions.push(time=>{
    flame.uniforms.time.value=time
    light.intensity=395+50*Math.sin(time*6.1)+25*Math.sin(time*10.9)
  })
}

export function water(craft,{width,depth,x=0,y=-3.3,z=0,tint=0x2e6878,lava=false,flow=1}) {
  const geometry=new T.PlaneGeometry(width,depth,craft.detail==='low'?14:34,craft.detail==='low'?10:22)
  geometry.rotateX(-Math.PI/2)
  const material=new T.ShaderMaterial({
    side:T.DoubleSide,uniforms:{time:{value:0},tint:{value:new T.Color(tint)},flow:{value:flow}},
    vertexShader:`uniform float time, flow; varying vec3 positionWorld; varying vec2 coords;
      void main(){
        coords=position.xz;
        vec3 p=position;
        p.y+=sin(p.x*.36+p.z*.29-time*flow)*.12+sin(p.x*.61-p.z*.22+time*flow*1.3)*.064;
        positionWorld=(modelMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(positionWorld,1.);
      }`,
    fragmentShader:`uniform float time,flow;uniform vec3 tint;varying vec3 positionWorld;varying vec2 coords;
      void main(){
        float a=sin(coords.x*.72+sin(coords.y*.63+time*flow)*1.5-time*flow);
        float b=sin(coords.y*1.08+sin(coords.x*.44-time*flow*.7)*1.3+time*flow);
        float glint=pow(max(0.,.5+.25*a+.25*b),9.);
        float facing=1.-abs(normalize(cameraPosition-positionWorld).y);
        vec3 base=tint*(.63+.2*a+.14*b)+glint*vec3(${lava?'1.,.24,.02':'.34,.53,.60'});
        gl_FragColor=vec4(base+pow(facing,3.)*vec3(${lava?'.25,.018,.001':'.17,.21,.28'}),1.);
        ${colorFinish}
      }`,
  })
  const mesh=craft.mesh(geometry,material,x,y,z)
  craft.actions.push(time=>{material.uniforms.time.value=time})
  return mesh
}

export function worldStars(craft,tint=0xe1edff) {
  const coords=[],colors=[]
  const color=new T.Color(tint)
  for(let i=0;i<(craft.detail==='low'?500:1280);i++){
    const u=craft.rng()*2-1,theta=craft.rng()*Math.PI*2,r=119,rho=Math.sqrt(1-u*u)
    coords.push(Math.cos(theta)*rho*r,u*r,Math.sin(theta)*rho*r)
    const light=.35+craft.rng()*.65
    colors.push(color.r*light,color.g*light,color.b*light)
  }
  const geometry=new T.BufferGeometry()
  geometry.setAttribute('position',new T.Float32BufferAttribute(coords,3))
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  const mesh=new T.Points(geometry,new T.PointsMaterial({size:.2,vertexColors:true,sizeAttenuation:true,toneMapped:false,fog:false}))
  craft.architecture.add(mesh)
}
