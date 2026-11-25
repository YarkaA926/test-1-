(function(){
'use strict';
var SUBJECTS = window.SUBJECTS || [], I18N = window.I18N;
var app = document.getElementById('app');
var topEl = document.getElementById('top');

/* ---------- налаштування ---------- */
function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} return null; }
var lang = ls('prep_lang');
if(!I18N[lang]) lang='uk';
var themePref = ls('prep_theme') || 'dark';
var fs = parseFloat(ls('prep_fs')||'1') || 1;

function tr(k,vars){ var s=(I18N[lang]&&I18N[lang][k])||I18N.uk[k]||k; if(vars) for(var v in vars) s=s.replace('{'+v+'}',vars[v]); return s; }
function T(x){ if(x && typeof x==='object' && !Array.isArray(x)) return x[lang]!=null?x[lang]:x.uk; return x; }
function hasLang(x){ return !(x && typeof x==='object' && !Array.isArray(x)) || x[lang]!=null; }

function applyTheme(){
  var th = themePref==='auto' ? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : themePref;
  document.documentElement.dataset.theme=th;
  if(window.Splash) Splash.refreshColors();
  if(window.Eye) Eye.setTheme(th==='light');
}
function applyStatic(){
  document.documentElement.lang = lang;
  document.documentElement.style.setProperty('--fs',fs);
  document.title = tr('brand');
  document.getElementById('brand').textContent = '🔬 '+tr('brand');
  document.getElementById('gear').setAttribute('aria-label',tr('settings'));
  document.getElementById('splashText').innerHTML='<div class="st">'+esc(tr('splashTitle'))+'</div><div class="sh">'+esc(tr('hint'))+' ↓</div>';
}

/* ---------- прогрес ---------- */
function load(){ try{ return JSON.parse(ls('prep_v1')||'{}'); }catch(e){ return {}; } }
var P = load();
function save(){ ls('prep_v1',JSON.stringify(P)); }
function rec(s,t){ return P[s+'/'+t] || {}; }
function setRec(s,t,patch){ var k=s+'/'+t; P[k]=Object.assign(P[k]||{},patch); save(); }

/* ---------- утиліти ---------- */
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function plain(html){ var d=document.createElement('div'); d.innerHTML=html; return d.textContent||''; }
function subj(id){ return SUBJECTS.filter(function(s){return s.id===id;})[0]; }
function topic(s,id){ return s && s.topics.filter(function(t){return t.id===id;})[0]; }
function pct(a,b){ return b? Math.round(a*100/b):0; }
function tname(t){ return (t.num!=null?t.num+'. ':'')+T(t.title); }


/* ---------- відео: око на головній, клітини з боків інших сторінок ---------- */
var HV=document.getElementById('heroVid');
var SV=[].slice.call(document.querySelectorAll('.side video'));
var heroState='idle', sideState='idle';
var heroDur=0, heroT=0, heroTarget=0, heroRaf=0, heroLast=0, idleMode=false, idlePh=0;
function syncEngines(){
  var home=!document.body.classList.contains('nosplash');
  var netOff = home ? heroState==='ok' : sideState==='ok';
  if(window.Splash){ if(netOff) Splash.off(); else Splash.on(); }
  if(window.Eye && (!home || heroState==='ok')) Eye.hide();
}
function loadHero(){
  if(heroState!=='idle') return;
  heroState='loading'; document.body.classList.add('heroLoading');
  function done(ok){
    document.body.classList.remove('heroLoading');
    heroState=ok?'ok':'fail';
    document.body.classList.toggle('hasHero',ok);
    syncEngines(); onScroll();
  }
  HV.addEventListener('loadedmetadata',function(){ heroDur=HV.duration||0; done(heroDur>1); },{once:true});
  HV.addEventListener('error',function(){ done(false); },{once:true});
  HV.muted=true; HV.src='media/eye.mp4'; HV.load();
}
function loadSide(){
  if(sideState!=='idle') return;
  sideState='loading';
  SV.forEach(function(v,i){
    v.muted=true;
    v.addEventListener('loadedmetadata',function(){ if(i===1 && v.duration>2) try{ v.currentTime=v.duration/2; }catch(e){} },{once:true});
    v.addEventListener('loadeddata',function(){
      if(sideState!=='ok'){ sideState='ok'; document.body.classList.add('hasSide'); syncEngines(); }
    },{once:true});
    v.addEventListener('error',function(){ if(i===0 && sideState!=='ok'){ sideState='fail'; syncEngines(); if(window.Splash&&document.body.classList.contains('nosplash')) Splash.setBg(); } },{once:true});
    v.src='media/cells.mp4'; v.load();
  });
}
function playSide(on){ SV.forEach(function(v){ if(on){ var pr=v.play(); if(pr&&pr.catch) pr.catch(function(){}); } else v.pause(); }); }
function heroUpdate(p){
  idleMode = p>=0.985;
  heroTarget = Math.min(heroDur-0.04,p*heroDur);
  if(!heroRaf){ heroLast=performance.now(); heroRaf=requestAnimationFrame(heroTick); }
}
function heroTick(now){
  heroRaf=0;
  if(heroState!=='ok' || document.body.classList.contains('nosplash')) return;
  var dt=Math.min(0.06,(now-heroLast)/1000||0.016); heroLast=now;
  var end=heroDur-0.04, L=end-heroDur*0.35;
  if(idleMode){
    idlePh+=dt*0.6;
    var m=idlePh%(2*L), tri=m<L?m:2*L-m;
    heroT=heroTarget=end-tri;
  } else { idlePh=0; heroT+=(heroTarget-heroT)*Math.min(1,dt*10); }
  if(!HV.seeking && Math.abs(HV.currentTime-heroT)>0.015){ try{ HV.currentTime=heroT; }catch(e){} }
  if(idleMode || Math.abs(heroTarget-heroT)>0.01) heroRaf=requestAnimationFrame(heroTick);
}

/* ---------- стан сторінки ---------- */
var scrollHandlers=[];
function resetPage(isHome){
  scrollHandlers=[];
  document.body.classList.toggle('nosplash',!isHome);
  app.classList.toggle('sheet',!isHome);
  document.getElementById('readbar').hidden=true;
  document.getElementById('splashText').style.display=isHome?'':'none';
  if(!isHome){ if(window.Eye) Eye.hide(); document.getElementById('splash').style.opacity=''; loadSide(); playSide(true); if(window.Splash) Splash.setBg(); }
  else { playSide(false); loadHero(); }
  syncEngines();
}
function onScroll(){
  var y=window.scrollY, vh=window.innerHeight;
  var home=!document.body.classList.contains('nosplash');
  if(home){
    var cb=document.getElementById('courses'), S=Math.max(300,(cb?cb.offsetTop:vh*4)-vh*0.3);
    var p=Math.min(1,y/S);
    if(heroState==='ok'){
      heroUpdate(p);
      document.getElementById('splashText').style.opacity=Math.max(0,1-p*10);
    } else if(heroState==='fail'){
      var pz=Math.min(1,p/0.22);
      if(window.Eye&&Eye.ok) Eye.setDive(pz);
      Splash.setHome(Math.max(0,(p-0.14)/0.86));
      document.getElementById('splash').style.opacity=(window.Eye&&Eye.ok)?Eye.netOpacity():1;
      document.getElementById('splashText').style.opacity=Math.max(0,1-pz*8);
    }
    topEl.classList.toggle('over',p<0.04);
  } else topEl.classList.remove('over');
  document.getElementById('toTop').hidden = y<600;
  scrollHandlers.forEach(function(f){f(y);});
}
window.addEventListener('scroll',onScroll,{passive:true});
document.getElementById('toTop').onclick=function(){ window.scrollTo({top:0,behavior:'smooth'}); };

var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
  es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
},{threshold:.15}) : null;
function reveals(){ [].forEach.call(document.querySelectorAll('.reveal'),function(el){ if(io) io.observe(el); else el.classList.add('in'); }); }

/* ---------- екрани ---------- */
var activeCourse = 1;
function home(){
  resetPage(true);
  var h='<div class="intro"></div>';
  h+='<section class="greet reveal"><h1>'+esc(tr('greet'))+'</h1></section>';
  h+='<section class="reveal" id="courses">';
  var last=null; try{ last=JSON.parse(ls('prep_last')||'null'); }catch(e){}
  if(last){ var ls_=subj(last.s), lt=topic(ls_,last.t);
    if(lt) h+='<a class="card cont" href="#/'+last.s+'/'+last.t+'"><div class="s">'+esc(tr('lastOpened'))+'</div><div class="t">'+esc(tname(lt))+' →</div></a>'; }
  h+='<input class="search" id="q" placeholder="🔍 '+esc(tr('searchAll'))+'" autocomplete="off"><div id="res"></div>';
  h+='<div id="courseBox"><div class="tabs" role="tablist">';
  [1,2,3].forEach(function(c){ h+='<button class="tab" role="tab" data-c="'+c+'" aria-selected="'+(c===activeCourse)+'">'+c+' '+esc(tr('course'))+'</button>'; });
  h+='</div><div id="tabPanel"></div></div></section>';
  app.innerHTML=h;
  function drawTab(){
    var list=SUBJECTS.filter(function(s){return (s.course||1)===activeCourse;});
    var o='';
    if(!list.length) o='<div class="empty">'+esc(tr('soonCourse'))+'</div>';
    else { o='<div class="grid two">'; list.forEach(function(s){
      var done=s.topics.filter(function(t){return rec(s.id,t.id).best!=null;}).length;
      o+='<a class="card" href="#/'+s.id+'"><div class="t">'+(s.icon||'📘')+' '+esc(T(s.title))+'</div><div class="s">'+esc(tr('topics'))+': '+s.topics.length+' · '+esc(tr('testsDone'))+': '+done+'</div></a>';
    }); o+='</div>'; }
    document.getElementById('tabPanel').innerHTML=o;
    [].forEach.call(document.querySelectorAll('.tab'),function(b){ b.setAttribute('aria-selected',(+b.dataset.c===activeCourse)); });
  }
  drawTab();
  [].forEach.call(document.querySelectorAll('.tab'),function(b){ b.onclick=function(){ activeCourse=+b.dataset.c; drawTab(); }; });
  var q=document.getElementById('q'), res=document.getElementById('res'), box=document.getElementById('courseBox');
  q.oninput=function(){
    var v=q.value.trim().toLowerCase();
    if(v.length<2){ res.innerHTML=''; box.style.display=''; return; }
    box.style.display='none';
    var out='',n=0;
    SUBJECTS.forEach(function(s){ s.topics.forEach(function(t){
      var txt=plain(T(t.body)||''), i=txt.toLowerCase().indexOf(v), ti=T(t.title).toLowerCase().indexOf(v)>-1;
      if(ti||i>-1){ n++; var snip=i>-1?'…'+esc(txt.slice(Math.max(0,i-40),i+90))+'…':'';
        out+='<a class="card" href="#/'+s.id+'/'+t.id+'"><div class="t">'+esc(tname(t))+'</div><div class="s">'+esc(T(s.title))+(snip?' · '+snip:'')+'</div></a>'; }
    });});
    res.innerHTML = n?out:'<div class="empty">'+esc(tr('nothing'))+'</div>';
  };
  reveals(); window.scrollTo(0,0); onScroll();
}

function subjectPage(sid){
  var s=subj(sid); if(!s) return notFound();
  resetPage(false);
  var h='<div class="crumbs"><a href="#/">'+esc(tr('home'))+'</a></div><h1>'+(s.icon||'')+' '+esc(T(s.title))+'</h1>';
  if(!s.topics.length){ app.innerHTML=h+'<div class="empty">'+esc(tr('noTopics'))+'</div>'; window.scrollTo(0,0); onScroll(); return; }
  h+='<input class="search" id="q" placeholder="🔍 '+esc(tr('search'))+'" autocomplete="off"><div id="list">';
  s.topics.forEach(function(t){
    var r=rec(s.id,t.id), b='';
    if(r.read) b+='<span class="badge ok">'+esc(tr('read'))+'</span>';
    if(r.best!=null) b+='<span class="badge '+(r.best>=70?'ok':'warn')+'">'+esc(tr('test'))+': '+r.best+'%</span>';
    h+='<a class="card" data-s="'+esc((T(t.title)+' '+plain(T(t.body)||'')).toLowerCase())+'" href="#/'+s.id+'/'+t.id+'">'+
       '<div class="t">'+esc(tname(t))+'</div>'+(T(t.summary)?'<div class="s">'+esc(T(t.summary))+'</div>':'')+(b?'<div class="s">'+b+'</div>':'')+'</a>';
  });
  h+='</div>'; app.innerHTML=h; window.scrollTo(0,0); onScroll();
  var q=document.getElementById('q');
  q.oninput=function(){ var v=q.value.trim().toLowerCase();
    [].forEach.call(document.querySelectorAll('#list .card'),function(c){ c.style.display=(!v||c.dataset.s.indexOf(v)>-1)?'':'none'; }); };
}

function topicPage(sid,tid){
  var s=subj(sid), t=topic(s,tid); if(!t) return notFound();
  resetPage(false); ls('prep_last',JSON.stringify({s:sid,t:tid}));
  var r=rec(sid,tid);
  var h='<div class="crumbs"><a href="#/">'+esc(tr('home'))+'</a> › <a href="#/'+sid+'">'+esc(T(s.title))+'</a></div><h1>'+esc(tname(t))+'</h1>';
  var bodySrc=T(t.body)||'<p class="muted">'+esc(tr('noMaterial'))+'</p>';
  var tmp=document.createElement('div'); tmp.innerHTML=bodySrc;
  var toc=''; [].forEach.call(tmp.querySelectorAll('h2'),function(el,i){ el.id='sec'+i; toc+='<a href="javascript:void(0)" data-go="sec'+i+'">'+esc(el.textContent)+'</a>'; });
  if(!hasLang(t.body)) h+='<div class="note">'+esc(tr('onlyUk'))+'</div>';
  if(toc) h+='<div class="toc">'+toc+'</div>';
  h+='<div class="body">'+tmp.innerHTML+'</div>';
  var tests=T(t.test)||[];
  if(tests.length){
    h+='<div class="card" style="margin-top:26px"><div class="t">'+esc(tr('miniTest'))+'</div><div class="s">'+tests.length+' '+esc(tr('questions'))+(r.best!=null?' · '+esc(tr('best'))+': '+r.best+'%':'')+'</div>'+
       '<div style="margin-top:12px"><a class="btn" href="#/'+sid+'/'+tid+'/test">'+esc(tr('startTest'))+'</a></div></div>';
  }
  h+='<div class="row"><button class="btn sec" id="read">'+esc(r.read?tr('unmark'):tr('markRead'))+'</button></div>';
  var idx=s.topics.indexOf(t), prev=s.topics[idx-1], next=s.topics[idx+1];
  if(prev||next) h+='<div class="row">'+(prev?'<a class="btn sec" href="#/'+sid+'/'+prev.id+'">'+esc(tr('prev'))+'</a>':'<span></span>')+(next?'<a class="btn sec" href="#/'+sid+'/'+next.id+'">'+esc(tr('next'))+'</a>':'<span></span>')+'</div>';
  app.innerHTML=h; window.scrollTo(0,0);
  document.getElementById('read').onclick=function(){ setRec(sid,tid,{read:!rec(sid,tid).read}); topicPage(sid,tid); };
  [].forEach.call(document.querySelectorAll('[data-go]'),function(a){ a.onclick=function(){ var el=document.getElementById(a.dataset.go); if(el) el.scrollIntoView({behavior:'smooth'}); }; });
  var rb=document.getElementById('readbar'); rb.hidden=false; var bar=rb.firstElementChild;
  scrollHandlers.push(function(y){ var max=document.documentElement.scrollHeight-window.innerHeight; bar.style.width=(max>0?Math.min(100,y*100/max):0)+'%'; });
  onScroll();
}

/* ---------- тест ---------- */
function testPage(sid,tid,onlyIdx){
  var s=subj(sid), t=topic(s,tid), tests=t&&T(t.test); if(!tests||!tests.length) return notFound();
  resetPage(false);
  var order=onlyIdx||tests.map(function(_,i){return i;});
  var pos=0, wrong=[], right=0, locked=false;
  function crumbs(){ return '<div class="crumbs"><a href="#/'+sid+'/'+tid+'">'+esc(tr('back'))+': '+esc(T(t.title))+'</a></div>'; }
  function show(){
    var q=tests[order[pos]]; locked=false;
    var h=crumbs()+'<div class="muted">'+esc(tr('qOf',{n:pos+1,m:order.length}))+'</div><div class="bar"><i style="width:'+pct(pos,order.length)+'%"></i></div><div class="q">'+esc(q.q)+'</div>';
    q.o.forEach(function(o,i){ h+='<button class="opt" data-i="'+i+'">'+esc(o)+'</button>'; });
    h+='<div id="after"></div>'; app.innerHTML=h; window.scrollTo(0,0);
    [].forEach.call(document.querySelectorAll('.opt'),function(b){ b.onclick=function(){
      if(locked) return; locked=true; var i=+b.dataset.i;
      [].forEach.call(document.querySelectorAll('.opt'),function(x,j){ x.classList.add(j===q.a?'ok':(j===i?'bad':'dim')); });
      if(i===q.a) right++; else wrong.push({q:q,chosen:i});
      var a=q.e?'<div class="expl">'+esc(q.e)+'</div>':'';
      a+='<button class="btn" id="nx">'+esc(pos+1<order.length?tr('nextQ'):tr('showRes'))+'</button>';
      document.getElementById('after').innerHTML=a;
      document.getElementById('nx').onclick=function(){ pos++; pos<order.length?show():finish(); };
    };});
  }
  function finish(){
    var p=pct(right,order.length), r=rec(sid,tid);
    if(!onlyIdx && (r.best==null||p>r.best)) setRec(sid,tid,{best:p});
    var h=crumbs()+'<div class="score">'+p+'%</div><p style="text-align:center" class="muted">'+esc(tr('correct',{r:right,m:order.length}))+'</p>';
    if(wrong.length){
      h+='<h3>'+esc(tr('mistakes'))+'</h3>';
      wrong.forEach(function(w){ h+='<div class="card wrong"><b>'+esc(w.q.q)+'</b><div class="muted">'+esc(tr('yourAns'))+': '+esc(w.q.o[w.chosen])+'</div><div class="g">✓ '+esc(w.q.o[w.q.a])+'</div>'+(w.q.e?'<div class="expl">'+esc(w.q.e)+'</div>':'')+'</div>'; });
      h+='<button class="btn" id="again">'+esc(tr('repeatWrong'))+'</button>';
    } else h+='<div class="card" style="text-align:center">'+esc(tr('perfect'))+'</div>';
    h+='<div class="row"><a class="btn sec" href="#/'+sid+'/'+tid+'/test">'+esc(tr('retake'))+'</a><a class="btn sec" href="#/'+sid+'">'+esc(tr('toTopics'))+'</a></div>';
    app.innerHTML=h; window.scrollTo(0,0);
    var ag=document.getElementById('again');
    if(ag) ag.onclick=function(){ testPage(sid,tid,wrong.map(function(w){return tests.indexOf(w.q);})); };
  }
  show(); onScroll();
}

function notFound(){ resetPage(false); app.innerHTML='<div class="empty">'+esc(tr('notFound'))+'<br><br><a class="btn sec" href="#/">'+esc(tr('toHome'))+'</a></div>'; onScroll(); }

/* ---------- налаштування (панель) ---------- */
var panel=document.getElementById('panel'), panelBg=document.getElementById('panelBg');
function openPanel(){
  function seg(items,cur,attr,cls){ return '<div class="seg '+(cls||'')+'">'+items.map(function(i){ return '<button data-'+attr+'="'+i[0]+'" aria-pressed="'+(i[0]===cur)+'">'+i[1]+'</button>'; }).join('')+'</div>'; }
  panel.innerHTML='<h3>⚙️ '+esc(tr('settings'))+'</h3>'+
   '<div class="grp"><div class="lbl">'+esc(tr('theme'))+'</div>'+seg([
      ['dark','<span class="swatch" style="background:#000;border-color:#555"></span>'+esc(tr('tDark'))],
      ['light','<span class="swatch" style="background:#fff;border-color:#999"></span>'+esc(tr('tLight'))],
      ['auto','<span class="swatch" style="background:linear-gradient(90deg,#000 50%,#fff 50%);border-color:#777"></span>'+esc(tr('tAuto'))]],themePref,'theme')+'</div>'+
   '<div class="grp"><div class="lbl">'+esc(tr('lang'))+'</div>'+seg([['uk','Українська'],['ru','Русский'],['en','English']],lang,'lang')+'</div>'+
   '<div class="grp"><div class="lbl">'+esc(tr('fontSize'))+'</div>'+seg([['0.9','A−'],['1','A'],['1.15','A+'],['1.3','A++']],String(fs),'fs','h')+'</div>'+
   '<div class="grp"><button class="danger" id="reset">'+esc(tr('resetProgress'))+'</button></div>'+
   '<button class="btn sec" id="pclose">'+esc(tr('close'))+'</button>';
  panel.hidden=false; panelBg.hidden=false;
  [].forEach.call(panel.querySelectorAll('[data-theme]'),function(b){ b.onclick=function(){ themePref=b.dataset.theme; ls('prep_theme',themePref); applyTheme(); openPanel(); }; });
  [].forEach.call(panel.querySelectorAll('[data-lang]'),function(b){ b.onclick=function(){ lang=b.dataset.lang; ls('prep_lang',lang); applyStatic(); route(); openPanel(); }; });
  [].forEach.call(panel.querySelectorAll('[data-fs]'),function(b){ b.onclick=function(){ fs=parseFloat(b.dataset.fs); ls('prep_fs',String(fs)); applyStatic(); openPanel(); }; });
  document.getElementById('reset').onclick=function(){ if(confirm(tr('resetAsk'))){ P={}; save(); ls('prep_last','null'); closePanel(); route(); } };
  document.getElementById('pclose').onclick=closePanel;
}
function closePanel(){ panel.hidden=true; panelBg.hidden=true; }
document.getElementById('gear').onclick=openPanel; panelBg.onclick=closePanel;
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePanel(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener&&matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){ if(themePref==='auto') applyTheme(); });

/* ---------- роутер ---------- */
function route(){
  var p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!p.length) return home();
  if(p.length===1) return subjectPage(p[0]);
  if(p.length===2) return topicPage(p[0],p[1]);
  if(p[2]==='test') return testPage(p[0],p[1]);
  notFound();
}
window.addEventListener('hashchange',route);
applyTheme(); applyStatic(); route();
})();
