/* Нейро-анімація (canvas, псевдо-3D).
   home: політ крізь райдужку ока в нейронну мережу — кадри залежать від прокрутки (стоїть, коли прокрутка стоїть);
   після кінця прокрутки і на інших сторінках мережа «спалахує» безперервно у фоні. */
(function(){
'use strict';
var cv=document.getElementById('splash'), ctx=cv.getContext('2d');
var W=0,H=0,DPR=1,F=600,raf=0,running=false,last=0;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var ZP=260, FLIGHT=1500, ZEND=ZP+FLIGHT, GAP=80, FAR=1800, NPL=8;
var state={mode:'bg',p:0}, camZ=ZEND, clock=0, col={};

function readColors(){
  var dark=document.documentElement.dataset.theme!=='light';
  col.dark=dark;
  col.line = dark?'255,110,140':'190,16,46';
  col.soma = dark?'#ffd5dc':'#c8102e';
  col.glow = dark?'rgba(255,90,120,':'rgba(200,16,46,';
  col.pulse= dark?'#ffffff':'#ff3b5c';
  col.irisIn = dark?'#ff9aa9':'#ffb3bd';
  col.irisMid= dark?'#b81f3d':'#c8102e';
  col.irisOut= dark?'#2c0610':'#6e0a1b';
  col.fibre  = dark?'rgba(255,200,208,.28)':'rgba(255,255,255,.35)';
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=cv.clientWidth; H=cv.clientHeight; F=Math.min(W,H)*0.95+W*0.1;
  cv.width=W*DPR; cv.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
  schedule();
}
function h(a,b,c){ var x=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453; return x-Math.floor(x); }
function smooth(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
function node(k,i){
  var ang=h(k,i,1)*6.2832, r=38+h(k,i,2)*250;
  return {x:Math.cos(ang)*r, y:Math.sin(ang)*r, z:ZP+80+k*GAP+(h(k,i,3)-.5)*GAP*.7};
}

function drawNetwork(alphaMul){
  var cx=W/2, cy=H/2, T=camZ*0.004+clock;
  var swx=Math.sin(camZ*0.004+clock*0.3)*26, swy=Math.cos(camZ*0.0035+clock*0.25)*18;
  var kmin=Math.max(0,Math.floor((camZ+10-ZP-80)/GAP)-1), kmax=kmin+Math.ceil(FAR/GAP)+2;
  var k,i,c,a,b,s1,s2,d1,d2,al;
  ctx.lineCap='round';
  for(k=kmin;k<kmax;k++){
    for(i=0;i<NPL;i++){
      a=node(k,i); d1=a.z-camZ; if(d1<14) continue;
      s1=F/d1; var x1=cx+(a.x-swx)*s1, y1=cy+(a.y-swy)*s1;
      for(c=0;c<2;c++){
        var j=Math.floor(h(k,i,4+c)*NPL); b=node(k+1,j); d2=b.z-camZ; if(d2<14) continue;
        s2=F/d2; var x2=cx+(b.x-swx)*s2, y2=cy+(b.y-swy)*s2;
        var depth=Math.min(d1,d2)/FAR; al=(1-depth)*(1-depth)*Math.min(1,Math.min(d1,d2)/120)*alphaMul;
        if(al<0.02) continue;
        var mz=(a.z+b.z)/2-camZ, ms=F/Math.max(14,mz);
        var qx=cx+((a.x+b.x)/2+(h(k,i,6+c)-.5)*70-swx)*ms, qy=cy+((a.y+b.y)/2+(h(k,i,8+c)-.5)*70-swy)*ms;
        var active=h(k,i,10+c)>0.38;
        ctx.strokeStyle='rgba('+col.line+','+(al*(active?0.55:0.28))+')';
        ctx.lineWidth=Math.max(0.5,Math.min(3,s1*1.6));
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(qx,qy,x2,y2); ctx.stroke();
        if(active){
          var ph=(T*0.55+h(k,i,12+c))%1, u=1-ph;
          var px=u*u*x1+2*u*ph*qx+ph*ph*x2, py=u*u*y1+2*u*ph*qy+ph*ph*y2;
          var ps=s1+(s2-s1)*ph, r=Math.max(1.2,Math.min(9,ps*4.5));
          var g=ctx.createRadialGradient(px,py,0,px,py,r*3.2);
          g.addColorStop(0,col.glow+(0.85*al)+')'); g.addColorStop(1,col.glow+'0)');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,r*3.2,0,6.2832); ctx.fill();
          ctx.fillStyle=col.pulse; ctx.globalAlpha=Math.min(1,al*1.4);
          ctx.beginPath(); ctx.arc(px,py,r*0.55,0,6.2832); ctx.fill(); ctx.globalAlpha=1;
        }
      }
      // сома і дендрити
      var rr=Math.max(1.1,Math.min(14,s1*6));
      if(s1>0.22){
        ctx.strokeStyle='rgba('+col.line+','+(al*0.5)+')'; ctx.lineWidth=Math.max(.5,s1*1.1);
        ctx.beginPath();
        for(var d=0;d<6;d++){ var da=h(k,i,20+d)*6.2832, dl=(10+h(k,i,30+d)*14)*s1;
          ctx.moveTo(x1,y1); ctx.lineTo(x1+Math.cos(da)*dl,y1+Math.sin(da)*dl); }
        ctx.stroke();
      }
      var gg=ctx.createRadialGradient(x1,y1,0,x1,y1,rr*2.6);
      gg.addColorStop(0,col.glow+(0.6*al)+')'); gg.addColorStop(1,col.glow+'0)');
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(x1,y1,rr*2.6,0,6.2832); ctx.fill();
      ctx.fillStyle=col.soma; ctx.globalAlpha=Math.min(1,al*1.5);
      ctx.beginPath(); ctx.arc(x1,y1,rr*0.55,0,6.2832); ctx.fill(); ctx.globalAlpha=1;
    }
  }
}

function drawIris(){
  var d=ZP-camZ; if(d<F/60) return;
  if(d>ZP+260) return;
  var cx=W/2, cy=H/2, s=F/d, r0=(62+8*Math.sin(camZ*0.01))*s, r1=190*s;
  var rot=camZ*0.0015, n=170, i;
  // кільце з отвором-зіницею
  var g=ctx.createRadialGradient(cx,cy,r0,cx,cy,r1);
  g.addColorStop(0,col.irisIn); g.addColorStop(0.45,col.irisMid); g.addColorStop(1,col.irisOut);
  ctx.beginPath(); ctx.arc(cx,cy,r1,0,6.2832); ctx.arc(cx,cy,r0,0,6.2832,true);
  ctx.fillStyle=g; ctx.fill('evenodd');
  // волокна
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r1,0,6.2832); ctx.arc(cx,cy,r0,0,6.2832,true); ctx.clip('evenodd');
  ctx.strokeStyle=col.fibre; ctx.lineWidth=Math.max(0.6,s*0.9); ctx.beginPath();
  for(i=0;i<n;i++){
    var a=rot+i/n*6.2832+(h(i,1,1)-.5)*0.05, ra=r0*(1.0+h(i,2,1)*0.25), rb=r0+(r1-r0)*(0.55+h(i,3,1)*0.45);
    ctx.moveTo(cx+Math.cos(a)*ra,cy+Math.sin(a)*ra);
    ctx.quadraticCurveTo(cx+Math.cos(a+0.05)*(ra+rb)/2,cy+Math.sin(a+0.05)*(ra+rb)/2,cx+Math.cos(a+0.02)*rb,cy+Math.sin(a+0.02)*rb);
  }
  ctx.stroke();
  // коларет
  ctx.strokeStyle=col.fibre; ctx.lineWidth=Math.max(1,s*2);
  ctx.beginPath(); ctx.arc(cx,cy,r0+(r1-r0)*0.32,0,6.2832); ctx.stroke();
  ctx.restore();
  // межі
  ctx.strokeStyle='rgba(0,0,0,.45)'; ctx.lineWidth=Math.max(1.5,s*5);
  ctx.beginPath(); ctx.arc(cx,cy,r1,0,6.2832); ctx.stroke();
  ctx.strokeStyle='rgba('+col.line+',.55)'; ctx.lineWidth=Math.max(1,s*2.5);
  ctx.beginPath(); ctx.arc(cx,cy,r0,0,6.2832); ctx.stroke();
}

function frame(){
  ctx.clearRect(0,0,W,H);
  var nAlpha = smooth(ZP*0.35,ZP*0.95,camZ)*0.85+0.15*smooth(ZP*0.9,ZP+200,camZ);
  if(camZ>=ZP*0.35) drawNetwork(nAlpha);
  drawIris();
}
function needsLoop(){ return state.mode!=='home' || state.p>=1 || Math.abs(target()-camZ)>0.4; }
var ZSTART=-250, first=true;
function target(){ return ZSTART+state.p*(ZEND-ZSTART); }
function tick(now){
  var dt=Math.min(64,now-last||16); last=now;
  if(state.mode==='home' && state.p<1){
    camZ+=(target()-camZ)*Math.min(1,dt*0.011);
  } else {
    camZ+=dt*0.022; clock+=dt/1000;
  }
  frame();
  if(!reduce && needsLoop()) raf=requestAnimationFrame(tick); else running=false;
}
function schedule(){
  if(reduce){ frame(); return; }
  if(!running){ running=true; last=0; raf=requestAnimationFrame(tick); }
}
window.Splash={
  setHome:function(p){
    var wasBg=state.mode!=='home';
    state.mode='home'; state.p=Math.max(0,Math.min(1,p));
    if(first){ first=false; camZ=target(); }
    if(wasBg && state.p<1) { /* плавно повертаємося до позиції за прокруткою */ }
    schedule();
  },
  setBg:function(){ state.mode='bg'; state.p=1; if(camZ<ZEND) camZ=ZEND; schedule(); },
  refreshColors:function(){ readColors(); schedule(); },
  resize:resize
};
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',function(){ if(!document.hidden) schedule(); });
readColors(); resize();
})();
