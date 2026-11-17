// Deterministic, progress-driven pigment reveal inspired by Shine's supplied shader.
// No clock-driven noise: every scroll position has the same ink shape in reverse.
const vertex = `attribute vec2 pos; varying vec2 uv; void main(){uv=pos*.5+.5;gl_Position=vec4(pos,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 uv; uniform sampler2D b;
uniform vec2 res; uniform vec2 sizeB; uniform float progress; uniform float portrait;
vec2 cover(vec2 q,vec2 sz,float focal){float ca=res.x/res.y;float ia=sz.x/sz.y;vec2 s=ca>ia?vec2(1.,ia/ca):vec2(ca/ia,1.);return q*s+vec2(.5,focal)*(1.-s);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);for(int i=0;i<4;i++){n+=a*noise(p);p=r*p*2.03+vec2(17.1,31.7);a*=.5;}return n;}
void main(){
vec2 q=vec2(uv.x,1.-uv.y); // DOM images upload in top-down order
vec3 cb=texture2D(b,cover(q,sizeB,.5)).rgb;
// Keep the real DOM video visible underneath. No second source-image render,
// therefore no object-fit/exposure discontinuity when the wash first appears.
// Match the real StudioShell room exactly; its controls reveal separately.
if(progress<=.0001){gl_FragColor=vec4(0);return;}if(progress>=.9999){gl_FragColor=vec4(cb,1);return;}
vec2 aspect=vec2(res.x/res.y,1.);vec2 p=q*aspect;
vec2 warp=vec2(fbm(p*2.+progress*.15),fbm(p*2.+vec2(5.2,1.3)-progress*.1));
float d1=length((p-vec2(.27*aspect.x,.68))*vec2(.82,1.));
float d2=length((p-vec2(.78*aspect.x,.27))*vec2(.85,1.1))+.15;
float dist=min(d1,d2);
float field=(dist*.90+fbm(p*2.1+(warp-.5)*1.3)*.22+(fbm(p*11.+warp)-.5)*.08-.08)/.9;
float d=mix(-.16,1.18,progress)-field;
float reveal=smoothstep(.01,.16,d);
float active=smoothstep(0.,.02,progress)*(1.-smoothstep(.97,1.,progress));
float band=smoothstep(-.055,.01,d)*(1.-smoothstep(.10,.26,d));
float rim=exp(-pow((d-.012)/.024,2.));
float pool=fbm(p*4.+warp);
vec3 pigment=mix(vec3(.13,.12,.18),vec3(.012,.013,.025),pool*.8+rim*.2);
float opacity=clamp((band*(.68+.25*pool)+rim*.54)*active,0.,.97);
float alpha=reveal*(1.-opacity)+opacity;
vec3 col=cb*reveal*(1.-opacity)+pigment*opacity;
col+=(hash(floor(q*res))-.5)*.016*band*active*alpha;
gl_FragColor=vec4(clamp(col,0.,1.),alpha);
}`;
export function createInk(canvas, destination) {
  const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
  if(!gl)throw new Error('WebGL unavailable');
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'pos');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const u=Object.fromEntries(['b','res','sizeB','progress','portrait'].map(k=>[k,gl.getUniformLocation(program,k)]));
  gl.activeTexture(gl.TEXTURE0);const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(u.b,0);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,destination);gl.uniform2f(u.sizeB,destination.naturalWidth,destination.naturalHeight);
  return {
    resize(w,h){const scale=Math.min(1,1280/w,900/h);canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(u.res,w,h);gl.uniform1f(u.portrait,w<700?1:0);},
    render(p){gl.useProgram(program);gl.uniform1f(u.progress,p);gl.drawArrays(gl.TRIANGLES,0,6);},
    dispose(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);}
  };
}
