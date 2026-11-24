/* Заставка: ядро та електрони на орбітах (canvas). Зникає при прокрутці. */
(function(){
'use strict';
var cv=document.getElementById('splash'), ctx=cv.getContext('2d');
var W=0,H=0,DPR=1,raf=0,running=false,t0=performance.now();
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var col={};
function readColors(){
  var cs=getComputedStyle(document.documentElement);
  var dark=document.documentElement.dataset.theme==='dark';
  col.dark=dark;
  col.e=dark?'#ff6a85':'#c8102e';
  col.orbit=dark?'rgba(255,110,140,.38)':'rgba(200,16,46,.30)';
  col.core=dark?'#ffe3e8':'#c8102e';
  col.glow=dark?'rgba(255,80,110,.55)':'rgba(200,16,46,.35)';
  col.dust=dark?'rgba(255,170,190,.5)':'rgba(200,16,46,.35)';
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=cv.clientWidth; H=cv.clientHeight;
  cv.width=W*DPR; cv.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
  if(!running) draw(performance.now());
}
var dust=[]; for(var i=0;i<46;i++) dust.push({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.4,s:Math.random()*.15+.03,p:Math.random()*6.28});
var orbits=[{a:0,tilt:0,e:2},{a:Math.PI/3,tilt:0,e:2},{a:2*Math.PI/3,tilt:0,e:2}];

function draw(now){
  var t=(now-t0)/1000;
  ctx.clearRect(0,0,W,H);
  var cx=W/2, cy=H*0.46, R=Math.min(W,H)*0.30;
  // пил
  ctx.fillStyle=col.dust;
  dust.forEach(function(d){
    var y=((d.y - t*d.s*0.05)%1+1)%1, tw=.5+.5*Math.sin(t*1.5+d.p);
    ctx.globalAlpha=.25+.5*tw; ctx.beginPath(); ctx.arc(d.x*W,y*H,d.r,0,6.283); ctx.fill();
  });
  ctx.globalAlpha=1;
  // орбіти
  var rot=t*0.25;
  orbits.forEach(function(o,idx){
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(o.a+rot*(idx%2?-1:1)*0.6);
    ctx.strokeStyle=col.orbit; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.ellipse(0,0,R,R*0.36,0,0,6.283); ctx.stroke();
    // електрони зі шлейфом
    for(var k=0;k<2;k++){
      var base=t*(1.1+idx*0.25)+k*Math.PI+idx*1.3;
      for(var j=14;j>=0;j--){
        var ang=base-j*0.07, x=Math.cos(ang)*R, y=Math.sin(ang)*R*0.36;
        ctx.globalAlpha=(1-j/15)*0.55; ctx.fillStyle=col.e;
        ctx.beginPath(); ctx.arc(x,y,Math.max(1,5-j*0.3),0,6.283); ctx.fill();
      }
      ctx.globalAlpha=1;
      var ex=Math.cos(base)*R, ey=Math.sin(base)*R*0.36;
      var g=ctx.createRadialGradient(ex,ey,0,ex,ey,16);
      g.addColorStop(0,col.glow); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ex,ey,16,0,6.283); ctx.fill();
      ctx.fillStyle=col.e; ctx.beginPath(); ctx.arc(ex,ey,5,0,6.283); ctx.fill();
    }
    ctx.restore();
  });
  // ядро
  var pulse=1+0.08*Math.sin(t*2.2);
  var g2=ctx.createRadialGradient(cx,cy,0,cx,cy,R*0.55*pulse);
  g2.addColorStop(0,col.glow); g2.addColorStop(1,'transparent');
  ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(cx,cy,R*0.55*pulse,0,6.283); ctx.fill();
  ctx.fillStyle=col.core; ctx.beginPath(); ctx.arc(cx,cy,10*pulse,0,6.283); ctx.fill();
}
function loop(now){ if(!running) return; draw(now); raf=requestAnimationFrame(loop); }
function start(){ if(running||reduce) { if(reduce) draw(performance.now()); return; } running=true; raf=requestAnimationFrame(loop); }
function stop(){ running=false; cancelAnimationFrame(raf); }

window.Splash={
  init:function(){ readColors(); resize(); },
  refreshColors:function(){ readColors(); if(!running) draw(performance.now()); },
  start:start, stop:stop, resize:resize
};
window.addEventListener('resize',resize);
readColors(); resize();
})();
