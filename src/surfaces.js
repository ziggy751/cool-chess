// Time lives in one shared uniform. Material programs remain cached while
// their animation is paused, including when the board is idle.
const patterns = {
  peppermint:'float band=sin((p.y+p.x*.47+p.z*.28)*30.-t*.16); float lace=smoothstep(-.23,.23,band); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.49,.022,.065),.67*lace); roughnessFactor*=.68+.21*lace;',
  sugar:'vec3 q=floor(p*vec3(120.,157.,139.)); float sugar=fract(sin(dot(q,vec3(19.19,31.63,71.3)))*637.33); float lace=1.-smoothstep(.09,.25,abs(sin((p.y+p.x*.13)*44.+sin(p.z*13.)*1.1))); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.91,.68,.44),.31*lace + .22*step(.94,sugar)); totalEmissiveRadiance+=step(.976,sugar)*(.55+.45*sin(t+p.z*21.))*vec3(.11,.08,.045);',
  vortex: 'float a=atan(p.z,p.x);float ripple=pow(.5+.5*sin(a*4.-p.y*21.+t*1.2),7.); diffuseColor.rgb*=.56+.38*ripple; totalEmissiveRadiance+=ripple*vec3(.10,.06,.23);',
  grid: 'vec3 g=abs(sin(p*vec3(35.,43.,36.)+vec3(t,-t*.7,t*.36))); float scan=(1.-smoothstep(.12,.28,min(g.x,min(g.y,g.z))))*(.55+.45*cos(p.y*8.-t*3.2)); diffuseColor.rgb*=.91+.09*scan; totalEmissiveRadiance+=scan*vec3(.035,.17,.26);',
  goldflow: 'float f=abs(sin(p.z*23.+p.y*11.+sin(p.x*17.3+p.y*5.)*2.6)); float mask=1.-smoothstep(.03,.16,f); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.67,.35,.065),mask*.66); totalEmissiveRadiance+=mask*(.58+.42*cos(p.y*27.-t*.85))*vec3(.19,.067,.009);',
  spectrum: 'vec3 wave=.5+.5*cos(vec3(0.,2.19,4.18)+p.y*15.+p.x*4.-t*.6); float rim=.28+.43*abs(sin(p.z*15.+t*.51)); diffuseColor.rgb=mix(diffuseColor.rgb, wave,.28*rim); totalEmissiveRadiance+=wave*rim*.055;',
  sunspots: 'float f=.5+.5*sin(p.y*27.+p.x*7.7+sin(p.z*13.3+t*.49)*3.4); float stripe=pow(f,11.); totalEmissiveRadiance+=stripe*vec3(.47,.156,.016); roughnessFactor*=.88+.12*f;',
  ribbons: 'float r=.5+.5*sin(p.y*17.+p.x*9.+sin(p.z*7.+t*.5)*2.8-t*.9); totalEmissiveRadiance+=r*r*mix(vec3(.025,.16,.096),vec3(.08,.047,.22),r);',
  ink: 'float f=.5+.5*sin(p.y*11.+p.x*14.+sin(p.z*18.+t*.4)*3.2-t*.9); diffuseColor.rgb*=.46+.54*smoothstep(.35,.62,f); roughnessFactor*=.72+.28*f;',

  liquid: 'float f = sin(p.y*15.0 + sin(p.x*7.0 + t*.6)*2.0 - t); diffuseColor.rgb *= .9 + .10*f; roughnessFactor *= .79+.20*f;',
  molten: 'float f=abs(sin(p.x*25.0+p.y*13.0+sin(p.z*16.0+p.y*9.0)*2.0+t*.32)); float v=1.0-smoothstep(.025,.21,f); diffuseColor.rgb *= .76+v*.18; totalEmissiveRadiance += v*vec3(1.1,.16,.022)*(.78+.22*sin(t*1.6+p.y*6.0));',
  frost: 'float f=abs(sin(p.y*25.0+p.x*12.0+sin(p.z*31.0+t*.3)*2.0)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.38,.69,.89),.18*(1.0-smoothstep(.13,.3,f))); roughnessFactor += .13*(1.0-f);',
  nebula: 'float f=sin(p.x*9.0 + sin(p.y*8.0+t*.45)*2.0 + p.z*7.0); vec3 c=floor((p+vec3(t*.013,0.,0.))*95.0); float n=fract(sin(dot(c,vec3(12.9898,78.233,37.719)))*43758.5453); totalEmissiveRadiance += vec3(.12,.032,.25)*f*f*.34 + step(.991,n)*vec3(.37,.45,.88);',
  storm: 'float f=1.0-smoothstep(.02,.10,abs(sin(p.x*17.0 + p.y*19.0 + sin(p.z*23.0+p.y*13.0)*2.0))); totalEmissiveRadiance += f*pow(.5+.5*sin(t*2.0+p.y*7.0),8.0)*vec3(.09,.2,.63);',
  hologram: 'float f=pow(.5+.5*sin(p.y*97.0-t*5.7),12.0); totalEmissiveRadiance+=f*vec3(.012,.12,.19); diffuseColor.rgb *= .86+.14*f;',
  marble: 'float f=abs(sin(p.x*8.0+p.y*6.0+p.z*9.0+sin(p.x*7.0-p.z*11.0)*1.1+t*.18)); diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.54,.29,.08),.65*(1.0-smoothstep(.025,.12,f))); roughnessFactor *= .87+.13*f;',
  phantom: 'float f=sin(p.y*12.0 - t + sin(p.x*7.0+p.z*9.0)); diffuseColor.rgb *= .83+.15*f; totalEmissiveRadiance += vec3(.06,.10,.12)*f*f*.2;',
  celestial: 'vec3 c=floor((p+vec3(0.,t*.02,0.))*65.0); float n=fract(sin(dot(c,vec3(12.9898,78.233,37.719)))*43758.5453); totalEmissiveRadiance += step(.982,n)*vec3(.48,.28,.07)*(.55+.45*sin(t*1.7+p.y*12.0));',
  mechanical: 'float f=sin(atan(p.z,p.x)*20.0-t*1.3+p.y*17.0); roughnessFactor *= .84+.16*f; diffuseColor.rgb *= .93+.07*f;',
  water: 'float f=sin(p.x*14.0+p.z*18.0-t*1.4)+sin(p.x*22.0-p.z*9.0+t); roughnessFactor *= .88+.06*f; diffuseColor.rgb*=.94+.05*f;',
}
export function animateSurface(material,pattern,uniform) {
  if (material.userData.pattern===pattern) return
  material.userData.pattern = pattern
  material.customProgramCacheKey = () => pattern || 'standard'
  material.onBeforeCompile = shader => {
    if (!patterns[pattern]) return
    shader.uniforms.finishTime = uniform
    shader.vertexShader = 'varying vec3 finishPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfinishPosition = position;')
    shader.fragmentShader = 'varying vec3 finishPosition;\nuniform float finishTime;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n{ vec3 p=finishPosition; float t=finishTime; '+patterns[pattern]+' }')
  }
  material.needsUpdate = true
}
