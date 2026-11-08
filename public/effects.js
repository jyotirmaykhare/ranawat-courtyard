const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const vertexShader = `
attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.0,1.0);}
`;
const fragmentShader = `
precision highp float;
uniform sampler2D uImage;uniform vec2 uPointer;uniform float uImageAspect;uniform float uCanvasAspect;
uniform float uProgress;uniform float uZoom;uniform float uWarp;uniform float uChromatic;varying vec2 vUv;
vec2 cover(vec2 uv){if(uImageAspect>uCanvasAspect){uv.x=(uv.x-.5)*uCanvasAspect/uImageAspect+.5;}else{uv.y=(uv.y-.5)*uImageAspect/uCanvasAspect+.5;}return uv;}
void main(){float strength=uProgress;vec2 movement=(uPointer-vec2(.5))*vec2(uCanvasAspect,1.0);vec2 direction=movement/max(length(movement),.2);
vec2 baseUv=mix(vUv,vec2(.5),uZoom*uProgress*.28);float band=sin(vUv.y*24.0+uPointer.x*5.0);float fineBand=sin(vUv.y*71.0-uPointer.y*4.0);
baseUv.x+=(band*.72+fineBand*.28)*uWarp*strength*.16;baseUv.y+=direction.y*uWarp*strength*.12;baseUv=cover(baseUv);
vec2 split=direction*uChromatic*strength;split.x+=band*uChromatic*strength*.35;
float red=texture2D(uImage,clamp(baseUv+split,0.0,1.0)).r;float green=texture2D(uImage,clamp(baseUv,0.0,1.0)).g;float blue=texture2D(uImage,clamp(baseUv-split,0.0,1.0)).b;
float alpha=texture2D(uImage,clamp(baseUv,0.0,1.0)).a;gl_FragColor=vec4(red,green,blue,alpha);}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
  return shader;
}

function mountChromaticImage(container) {
  const image = container.querySelector('img');
  if (!image || reduceMotion()) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = 'chromatic-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.classList.add('chromatic-image');
  container.append(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return () => container.classList.remove('chromatic-image'); }
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) { canvas.remove(); return () => container.classList.remove('chromatic-image'); }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.remove(); return () => container.classList.remove('chromatic-image'); }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['uImage','uPointer','uImageAspect','uCanvasAspect','uProgress','uZoom','uWarp','uChromatic'].map(name=>[name,gl.getUniformLocation(program,name)]));
  gl.uniform1i(uniforms.uImage,0); gl.uniform1f(uniforms.uZoom,.2); gl.uniform1f(uniforms.uWarp,.05); gl.uniform1f(uniforms.uChromatic,.01);
  const texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1); gl.clearColor(0,0,0,0);
  const pointer={x:.5,y:.5}, target={x:.5,y:.5}; let progress=0, targetProgress=0, loaded=false, disposed=false, frame=0, running=false, last=performance.now();
  const resize=()=>{const box=container.getBoundingClientRect();if(!box.width||!box.height)return;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform1f(uniforms.uCanvasAspect,box.width/box.height);};
  const render=time=>{if(disposed)return;const dt=Math.min((time-last)/1000,.05);last=time;progress+=(targetProgress-progress)*(1-Math.exp(-10*dt));pointer.x+=(target.x-pointer.x)*(1-Math.exp(-30*dt));pointer.y+=(target.y-pointer.y)*(1-Math.exp(-30*dt));
    gl.uniform1f(uniforms.uProgress,progress);gl.uniform2f(uniforms.uPointer,pointer.x,pointer.y);gl.clear(gl.COLOR_BUFFER_BIT);if(loaded)gl.drawArrays(gl.TRIANGLES,0,3);
    const rx=(.5-pointer.y)*5.4, ry=(pointer.x-.5)*5.4;canvas.style.transform=`perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.025)`;
    if(Math.abs(progress-targetProgress)<.001&&Math.abs(pointer.x-target.x)<.001&&Math.abs(pointer.y-target.y)<.001){running=false;return;}frame=requestAnimationFrame(render);};
  const request=()=>{if(running)return;running=true;last=performance.now();frame=requestAnimationFrame(render);};
  const move=e=>{const b=container.getBoundingClientRect();target.x=clamp((e.clientX-b.left)/b.width,0,1);target.y=1-clamp((e.clientY-b.top)/b.height,0,1);targetProgress=1;request();};
  const leave=()=>{target.x=.5;target.y=.5;targetProgress=0;request();};
  const textureImage=new Image();textureImage.crossOrigin='anonymous';textureImage.onload=()=>{if(disposed)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureImage);gl.uniform1f(uniforms.uImageAspect,textureImage.naturalWidth/textureImage.naturalHeight);loaded=true;container.classList.add('chromatic-ready');request();};textureImage.src=image.currentSrc||image.src;
  const observer=new ResizeObserver(()=>{resize();request();});observer.observe(container);container.addEventListener('pointermove',move,{passive:true});container.addEventListener('pointerleave',leave,{passive:true});resize();request();
  return ()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();container.removeEventListener('pointermove',move);container.removeEventListener('pointerleave',leave);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);container.classList.remove('chromatic-image','chromatic-ready');canvas.remove();};
}
export function mountChromaticImages(root=document){const cleanups=[...root.querySelectorAll('[data-chromatic-image]')].map(mountChromaticImage);return()=>cleanups.forEach(fn=>fn());}

const parallaxPositions=['top-left','top-right','mid-left','mid-right','bottom-left','bottom-right','far-left','far-right'];
export function mountParallaxHeroImages(root=document){
  const cleanups=[];
  root.querySelectorAll('[data-parallax-hero]').forEach(hero=>{
    const tiles=[...hero.querySelectorAll('[data-parallax-tile]')];if(!tiles.length)return;
    if(reduceMotion()||!matchMedia('(pointer:fine)').matches)return;
    let x=0,y=0,tx=0,ty=0,frame=0,disposed=false;
    const move=e=>{const b=hero.getBoundingClientRect();tx=clamp(((e.clientX-b.left)/b.width-.5)*2,-1,1);ty=clamp(((e.clientY-b.top)/b.height-.5)*2,-1,1);if(!frame)frame=requestAnimationFrame(tick);};
    const leave=()=>{tx=0;ty=0;if(!frame)frame=requestAnimationFrame(tick);};
    const tick=()=>{if(disposed)return;x+=(tx-x)*.09;y+=(ty-y)*.09;tiles.forEach(tile=>{const d=Number(tile.dataset.depth||.4);tile.style.transform=`translate3d(${(x*40*d).toFixed(2)}px,${(y*32*d).toFixed(2)}px,0)`;});if(Math.abs(tx-x)+Math.abs(ty-y)>.002)frame=requestAnimationFrame(tick);else frame=0;};
    hero.addEventListener('pointermove',move,{passive:true});hero.addEventListener('pointerleave',leave,{passive:true});
    cleanups.push(()=>{disposed=true;cancelAnimationFrame(frame);hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',leave);});
  });
  return()=>cleanups.forEach(fn=>fn());
}

function mountDotCanvas(canvas){
  const surface=canvas.parentElement;if(!surface)return()=>{};const ctx=canvas.getContext('2d');if(!ctx)return()=>{};
  let frame=0,start=0,active=false,disposed=false;const speed=3,spacing=9,dot=2.2;
  const resize=()=>{const b=surface.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.max(1,Math.round(b.width*dpr));canvas.height=Math.max(1,Math.round(b.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);};
  const random=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
  const draw=time=>{if(disposed||!active)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const elapsed=time-start,maxDistance=Math.hypot(w/2,h/2);ctx.clearRect(0,0,w,h);
    for(let y=spacing/2;y<h;y+=spacing)for(let x=spacing/2;x<w;x+=spacing){const seed=random(Math.floor(x/spacing),Math.floor(y/spacing));const delay=(Math.hypot(x-w/2,y-h/2)/maxDistance*520+seed*145)/speed;const alpha=clamp((elapsed-delay)/260,0,1)*(.16+seed*.3);if(alpha>0){ctx.fillStyle=`rgba(225,207,171,${alpha})`;ctx.beginPath();ctx.arc(x,y,dot,0,Math.PI*2);ctx.fill();}}
    if(elapsed<900/speed+520)frame=requestAnimationFrame(draw);else frame=0;
  };
  const enter=()=>{active=true;canvas.classList.add('is-revealing');resize();start=performance.now();cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);};
  const leave=()=>{active=false;cancelAnimationFrame(frame);frame=0;ctx.clearRect(0,0,canvas.width,canvas.height);canvas.classList.remove('is-revealing');};
  surface.addEventListener('pointerenter',enter);surface.addEventListener('pointerleave',leave);
  const observer=new ResizeObserver(resize);observer.observe(surface);resize();
  return()=>{disposed=true;leave();observer.disconnect();surface.removeEventListener('pointerenter',enter);surface.removeEventListener('pointerleave',leave);};
}
export function mountCanvasRevealEffects(root=document){const cleanups=[...root.querySelectorAll('[data-canvas-reveal]')].map(mountDotCanvas);return()=>cleanups.forEach(fn=>fn());}

function mountTiltCard(card){
  const layers=[...card.querySelectorAll('[data-card-depth]')];let rect;
  const move=e=>{rect=card.getBoundingClientRect();const x=clamp((e.clientX-rect.left)/rect.width,0,1),y=clamp((e.clientY-rect.top)/rect.height,0,1);card.style.transform=`perspective(1000px) rotateX(${((.5-y)*10).toFixed(2)}deg) rotateY(${((x-.5)*10).toFixed(2)}deg)`;layers.forEach(layer=>{layer.style.transform=`translateZ(${Number(layer.dataset.cardDepth||0)}px)`;});};
  const reset=()=>{card.style.transform='perspective(1000px) rotateX(0deg) rotateY(0deg)';layers.forEach(layer=>{layer.style.transform='translateZ(0px)';});};
  if(!reduceMotion()&&matchMedia('(pointer:fine)').matches){card.addEventListener('pointermove',move,{passive:true});card.addEventListener('pointerleave',reset,{passive:true});}
  return()=>{card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',reset);reset();};
}
export function mountThreeDCards(root=document){const cleanups=[...root.querySelectorAll('[data-3d-card]')].map(mountTiltCard);return()=>cleanups.forEach(fn=>fn());}
