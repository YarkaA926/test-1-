/* Живий реалістичний очний яблук (WebGL-шейдер).
   Очі моргає, робить саккади, стежить за курсором; при прокрутці камера пірнає у зіницю.
   Усе процедурне: жодних зображень і відео. */
(function(){
'use strict';
var cv=document.getElementById('eye');
var gl=null, prog=null, U={}, ok=false;
var W=0,H=0,SCALE=300,ZMAX=10,ZFULL=3,RS=1;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var light=0;

var VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
var FS=[
'precision highp float;',
'uniform vec2 uRes,uGaze;',
'uniform float uScale,uZoom,uBlink,uPupil,uReveal,uLight,uTime;',
'float ss(float a,float b,float x){float t=clamp((x-a)/(b-a),0.0,1.0);return t*t*(3.0-2.0*t);}',
'float h31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
'float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);',
' float a=h31(i),b=h31(i+vec3(1.,0.,0.)),c=h31(i+vec3(0.,1.,0.)),d=h31(i+vec3(1.,1.,0.));',
' float e=h31(i+vec3(0.,0.,1.)),g=h31(i+vec3(1.,0.,1.)),k=h31(i+vec3(0.,1.,1.)),m=h31(i+vec3(1.,1.,1.));',
' return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(k,m,f.x),f.y),f.z);}',
'float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,3.1,2.3);a*=0.5;}return s;}',
'float lidU(float x,float o){float u=x*0.97;float s=pow(max(1.0-u*u,0.0),0.85);return o*s*(1.0+0.20*u)+0.05*x;}',
'float lidL(float x,float o){float u=x*0.97;float s=pow(max(1.0-u*u,0.0),1.05);return -o*s*(1.0-0.08*u)+0.03*x;}',
'float sdBox(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.0))+min(max(d.x,d.y),0.0);}',
'void main(){',
' vec2 s=(gl_FragCoord.xy-0.5*uRes)/uScale;',
' vec2 ctr=vec2(uGaze.x*0.42,uGaze.y*0.20);',
' float wz=ss(1.0,1.7,uZoom);',
' vec2 p=ctr*wz+s/uZoom;',
// повіки
' float yuo=lidU(p.x,0.34-0.06*max(-uGaze.y,0.0));',
' float yl=lidL(p.x,0.27);',
' float yu=mix(yuo,yl+0.002,uBlink);',
' float e=min(yu-p.y,p.y-yl);',
' e=min(e,(1.0-abs(p.x))*1.1);',
// райдужка
' vec2 q=p-ctr; q.x/=(1.0-0.20*abs(uGaze.x));',
' float r=length(q)/0.40;',
' float an=atan(q.y,q.x);',
' vec2 cy=vec2(cos(an),sin(an));',
' float pr=mix(0.30,0.52,uPupil)*(1.0+0.02*(fbm(vec3(cy*3.0,1.0))-0.5));',
' float t=clamp((r-pr)/(1.0-pr),0.0,1.0);',
' float fib=fbm(vec3(cy*13.0,t*2.4));',
' float fib2=fbm(vec3(cy*30.0,t*5.0+9.0));',
' float crypt=ss(0.62,0.78,fbm(vec3(cy*5.0,t*3.0+4.0)));',
' vec3 amber=vec3(0.64,0.39,0.13);',
' vec3 blue=vec3(0.19,0.36,0.47);',
' vec3 ir=mix(amber,blue,ss(0.16,0.66,t+(fib-0.5)*0.28));',
' ir*=0.42+1.15*fib;',
' ir+=vec3(0.95,0.88,0.72)*pow(fib2,4.0)*0.55*(1.0-t*0.5);',
' ir*=1.0-0.55*crypt*ss(0.1,0.4,t);',
' float coll=exp(-pow((t-0.30)/0.07,2.0));',
' ir+=vec3(0.50,0.36,0.16)*coll*(0.22+0.45*fib);',
' ir*=mix(0.30,1.0,ss(0.0,0.10,t));',
' ir*=1.0-0.90*ss(0.70,1.0,r);',
' float pm=1.0-ss(pr-0.012,pr+0.012,r);',
' ir=mix(ir,vec3(0.004),pm);',
' float im=1.0-ss(0.99,1.02,r);',
// склера
' vec3 sc=vec3(0.90,0.88,0.85);',
' float side=abs(p.x);',
' sc*=1.0-0.58*pow(side,2.3);',
' sc*=1.0-0.20*ss(0.35,0.7,abs(p.y));',
' float vn=fbm(vec3(vec2(p.x*4.5,p.y*11.0),2.0));',
' float ridge=1.0-abs(2.0*vn-1.0);',
' float vein=ss(0.90,0.985,ridge)*ss(0.25,0.95,side);',
' sc=mix(sc,vec3(0.62,0.16,0.14),vein*0.55);',
' sc=mix(sc,vec3(0.80,0.42,0.38),ss(0.78,1.02,side)*0.55);',
' sc=mix(sc,vec3(0.86,0.52,0.48),ss(-0.80,-1.0,p.x)*0.6);',
' sc*=1.0-0.28*exp(-pow((r-1.12)/0.22,2.0));',
' vec3 eye=mix(sc,ir,im);',
// тіні від повік
' eye*=mix(0.26,1.0,ss(0.0,0.22,yu-p.y));',
' eye*=mix(0.72,1.0,ss(0.0,0.10,p.y-yl));',
// блики рогівки
' float cm=1.0-ss(1.0,1.14,r);',
' vec2 hp=vec2(-0.15,0.17)+ctr*0.45;',
' float hl=ss(0.014,-0.004,sdBox(p-hp,vec2(0.058,0.040)));',
' float bars=ss(0.004,0.0,abs(p.x-hp.x))+ss(0.004,0.0,abs(p.y-hp.y));',
' hl*=1.0-0.70*min(1.0,bars);',
' float hl2=ss(0.03,0.0,length(p-(vec2(0.10,-0.12)+ctr*0.45)))*0.38;',
' eye+=vec3(1.0)*(hl*0.95+hl2)*cm;',
' eye+=vec3(0.9,0.95,1.0)*0.06*ss(0.9,0.0,length(q-vec2(-0.06,0.07))/0.4)*cm;',
// слізна плівка
' eye=mix(eye,vec3(1.0),0.30*ss(0.02,0.0,abs(p.y-(yl+0.018)))*ss(1.0,0.8,side));',
// шкіра навколо
' float d=max(-e,0.0);',
' float dU=p.y-yu;',
' float lit=mix(0.40,1.0,uLight);',
' vec3 skin=vec3(0.90,0.70,0.60)*lit;',
' skin*=mix(0.55,1.0,ss(0.0,0.06,d));',
' float yy=p.y-0.04*p.x;',
' float dc=p.y-(0.04*p.x+0.10+0.50*exp(-pow(p.x/0.92,2.0)*1.3));',
' skin*=1.0-0.40*exp(-pow(dc/0.013,2.0))*step(0.0,yy);',
' float ell=length(vec2(p.x/1.42,yy/0.58));',
' float sa=(1.0-ss(0.62,1.0,ell))*mix(0.92,0.80,uLight);',
// вії
' float lu=p.x*(52.0-clamp(dU,0.0,0.2)*60.0);',
' float id=floor(lu);',
' float ln=0.05+0.10*fract(sin(id*91.7)*437.5);',
' float lash=ss(0.07,0.015,abs(fract(lu)-0.5))*ss(ln,ln*0.55,dU)*step(0.0,dU)*ss(1.02,0.85,side);',
' skin=mix(skin,vec3(0.02),lash*0.92);',
' sa=max(sa,lash*0.95);',
// склейка
' float aa=ss(-0.0015,0.0015,e);',
' vec3 col=mix(skin,eye,aa);',
' float al=mix(sa,1.0,aa);',
' float rim=exp(-pow(e/0.008,2.0));',
' col=mix(col,vec3(0.62,0.30,0.28),rim*0.5*ss(1.06,0.98,side));',
' al*=1.0-pm*aa*uReveal;',
' gl_FragColor=vec4(col*al,al);',
'}'
].join('\n');

function sh(type,src){ var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.error(gl.getShaderInfoLog(s)); return null; } return s; }
function init(){
  try{ gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false}); }catch(e){}
  if(!gl) return false;
  var v=sh(gl.VERTEX_SHADER,VS), f=sh(gl.FRAGMENT_SHADER,FS); if(!v||!f) return false;
  prog=gl.createProgram(); gl.attachShader(prog,v); gl.attachShader(prog,f); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  ['uRes','uGaze','uScale','uZoom','uBlink','uPupil','uReveal','uLight','uTime'].forEach(function(n){ U[n]=gl.getUniformLocation(prog,n); });
  gl.clearColor(0,0,0,0);
  return true;
}

/* ---------- «поведінка» ---------- */
var st={gx:0,gy:0,tx:0,ty:0,nextSacc:0.8,blink:0,nextBlink:3.2,blinkT:-1,blinkDur:0.3,dbl:false,pupil:0.45,
        zoom:1,pz:0,ptrT:-9,ptrX:0,ptrY:0};
var clock=0,last=0,running=false,visible=false,raf=0;

function rnd(a,b){ return a+Math.random()*(b-a); }
function smooth(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }

function update(dt){
  clock+=dt;
  var diving=st.pz>0.015;
  // саккади
  st.nextSacc-=dt;
  if(st.nextSacc<=0){
    st.nextSacc=rnd(0.7,2.8);
    if(Math.random()<0.28){ st.tx=rnd(-0.12,0.12); st.ty=rnd(-0.08,0.08); }
    else { st.tx=rnd(-0.85,0.85); st.ty=rnd(-0.55,0.5); }
  }
  if(clock-st.ptrT<3.2){ st.tx=st.ptrX; st.ty=st.ptrY; }
  if(diving){ st.tx=0; st.ty=0; }
  var k=1-Math.exp(-dt*(diving?6:16));
  st.gx+=(st.tx-st.gx)*k; st.gy+=(st.ty-st.gy)*k;
  // моргання
  if(!diving){
    st.nextBlink-=dt;
    if(st.blinkT<0 && st.nextBlink<=0){ st.blinkT=0; st.blinkDur=rnd(0.22,0.34); st.nextBlink=rnd(2.4,6.0); st.dbl=Math.random()<0.18; }
  }
  if(st.blinkT>=0){
    st.blinkT+=dt/st.blinkDur;
    var b=st.blinkT; var v=b<0.38? Math.sin(b/0.38*Math.PI/2) : Math.cos((b-0.38)/0.62*Math.PI/2);
    st.blink=Math.max(0,Math.min(1,v));
    if(b>=1){ st.blinkT=-1; st.blink=0; if(st.dbl){ st.nextBlink=0.12; st.dbl=false; } }
  } else st.blink*=0.8;
  // зіниця: дихання + мікроколивання, під час польоту розширюється
  var base=0.42+0.10*Math.sin(clock*0.55)+0.04*Math.sin(clock*2.3+1.0)+0.03*Math.sin(clock*5.1);
  var want=diving? Math.max(base,0.5+0.5*smooth(0.1,0.9,st.pz)) : base;
  st.pupil+=(want-st.pupil)*(1-Math.exp(-dt*5));
}
function draw(){
  gl.viewport(0,0,cv.width,cv.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(U.uRes,cv.width,cv.height);
  gl.uniform2f(U.uGaze,st.gx+0.006*Math.sin(clock*11.0),st.gy+0.006*Math.cos(clock*9.0));
  gl.uniform1f(U.uScale,SCALE*RS);
  gl.uniform1f(U.uZoom,st.zoom);
  gl.uniform1f(U.uBlink,st.blink);
  gl.uniform1f(U.uPupil,Math.max(0,Math.min(1,st.pupil)));
  gl.uniform1f(U.uReveal,smooth(ZFULL,ZFULL*2.3,st.zoom));
  gl.uniform1f(U.uLight,light);
  gl.uniform1f(U.uTime,clock);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
}
function loop(now){
  if(!running) return;
  var dt=Math.min(0.05,(now-last)/1000||0.016); last=now;
  update(dt); draw();
  raf=requestAnimationFrame(loop);
}
function start(){ if(!ok||!visible) return; if(reduce){ draw(); return; } if(!running){ running=true; last=performance.now(); raf=requestAnimationFrame(loop); } }
function stop(){ running=false; cancelAnimationFrame(raf); }

function resize(){
  if(!ok) return;
  var dpr=Math.min(window.devicePixelRatio||1,1.5);
  W=cv.clientWidth; H=cv.clientHeight;
  RS=dpr; var px=W*H*dpr*dpr; if(px>1.6e6) RS=dpr*Math.sqrt(1.6e6/px);
  cv.width=Math.round(W*RS); cv.height=Math.round(H*RS);
  SCALE = W<H ? W*0.46 : Math.min(W*0.34,H*0.62);
  var halfDiag=0.5*Math.sqrt(W*W+H*H)/SCALE;
  ZMAX=Math.max(6,1.12*halfDiag/0.21);
  ZFULL=Math.max(2.2,0.5*H/(SCALE*0.27));
  if(visible) draw();
}
window.addEventListener('resize',resize);
window.addEventListener('pointermove',function(e){
  if(!ok||!visible) return;
  var x=(e.clientX/Math.max(1,window.innerWidth))*2-1, y=-((e.clientY/Math.max(1,window.innerHeight))*2-1);
  st.ptrX=Math.max(-0.9,Math.min(0.9,x*1.0)); st.ptrY=Math.max(-0.6,Math.min(0.55,y*0.7)); st.ptrT=clock;
},{passive:true});
document.addEventListener('visibilitychange',function(){ if(document.hidden) stop(); else start(); });

ok=init();
window.Eye={
  ok:ok,
  /* pz: 0..1 — прогрес «занурення» у зіницю */
  setDive:function(pz){
    if(!ok) return;
    st.pz=pz; st.zoom=Math.exp(Math.log(ZMAX)*pz);
    var show=pz<0.995;
    if(show!==visible){ visible=show; cv.style.display=show?'block':'none'; if(show){ resize(); start(); } else stop(); }
    else if(visible){ if(reduce) draw(); else if(!running) start(); }
  },
  hide:function(){ if(!ok) return; visible=false; cv.style.display='none'; stop(); },
  /* 0..1: коли екран повністю всередині ока, можна показувати нейрони за зіницею */
  netOpacity:function(){ return ok? smooth(ZFULL*0.92,ZFULL*1.08,st.zoom) : 1; },
  setTheme:function(isLight){ light=isLight?1:0; if(visible) { if(reduce) draw(); } },
  resize:resize
};
if(ok){ visible=true; resize(); start(); }
})();
