(function(){
'use strict';
var SUBJECTS = window.SUBJECTS || [];
var app = document.getElementById('app');

/* ---------- сховище прогресу ---------- */
function load(){ try{ return JSON.parse(localStorage.getItem('prep_v1')||'{}'); }catch(e){ return {}; } }
function save(d){ try{ localStorage.setItem('prep_v1', JSON.stringify(d)); }catch(e){} }
var P = load();
function key(s,t){ return s+'/'+t; }
function rec(s,t){ return P[key(s,t)] || {}; }
function setRec(s,t,patch){ var k=key(s,t); P[k]=Object.assign(P[k]||{},patch); save(P); }

/* ---------- тема ---------- */
(function(){
  var t=null; try{ t=localStorage.getItem('prep_theme'); }catch(e){}
  if(!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark':'light';
  document.documentElement.dataset.theme=t;
  document.getElementById('theme').onclick=function(){
    var n=document.documentElement.dataset.theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=n; try{ localStorage.setItem('prep_theme',n); }catch(e){}
  };
})();

/* ---------- утиліти ---------- */
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function plain(html){ var d=document.createElement('div'); d.innerHTML=html; return d.textContent||''; }
function subj(id){ return SUBJECTS.filter(function(s){return s.id===id;})[0]; }
function topic(s,id){ return s && s.topics.filter(function(t){return t.id===id;})[0]; }
function pct(a,b){ return b? Math.round(a*100/b):0; }

/* ---------- екрани ---------- */
function home(){
  var h='<h1>Підготовка до пар</h1><p class="muted">Обери предмет і тему: конспект, а в кінці міні-тест.</p>';
  h+='<input class="search" id="q" placeholder="🔍 Пошук по всіх темах…" autocomplete="off"><div id="res"></div><div id="subs" class="grid two">';
  SUBJECTS.forEach(function(s){
    var done=s.topics.filter(function(t){return rec(s.id,t.id).best!=null;}).length;
    h+='<a class="card" href="#/'+s.id+'"><div class="t">'+(s.icon||'📘')+' '+esc(s.title)+'</div>'+
       '<div class="s">Тем: '+s.topics.length+' · тест пройдено: '+done+'</div></a>';
  });
  h+='</div>';
  app.innerHTML=h;
  var q=document.getElementById('q'), res=document.getElementById('res'), subs=document.getElementById('subs');
  q.oninput=function(){
    var v=q.value.trim().toLowerCase();
    if(v.length<2){ res.innerHTML=''; subs.style.display=''; return; }
    subs.style.display='none';
    var out='', n=0;
    SUBJECTS.forEach(function(s){ s.topics.forEach(function(t){
      var txt=plain(t.body||'');
      var inTitle=t.title.toLowerCase().indexOf(v)>-1, i=txt.toLowerCase().indexOf(v);
      if(inTitle||i>-1){
        n++;
        var snip=i>-1? '…'+esc(txt.slice(Math.max(0,i-40),i+90))+'…' : '';
        out+='<a class="card" href="#/'+s.id+'/'+t.id+'"><div class="t">'+esc(t.title)+'</div><div class="s">'+esc(s.title)+(snip?' · '+snip:'')+'</div></a>';
      }
    });});
    res.innerHTML = n? out : '<div class="empty">Нічого не знайдено</div>';
  };
}

function subjectPage(sid){
  var s=subj(sid); if(!s) return notFound();
  var h='<div class="crumbs"><a href="#/">Головна</a></div><h1>'+(s.icon||'')+' '+esc(s.title)+'</h1>';
  if(!s.topics.length){ app.innerHTML=h+'<div class="empty">Теми ще не додані.</div>'; return; }
  h+='<input class="search" id="q" placeholder="🔍 Пошук по темах предмету…" autocomplete="off"><div id="list">';
  s.topics.forEach(function(t){
    var r=rec(s.id,t.id), b='';
    if(r.read) b+='<span class="badge ok">прочитано</span>';
    if(r.best!=null) b+='<span class="badge '+(r.best>=70?'ok':'warn')+'">тест: '+r.best+'%</span>';
    h+='<a class="card" data-s="'+esc((t.title+' '+plain(t.body||'')).toLowerCase())+'" href="#/'+s.id+'/'+t.id+'">'+
       '<div class="t">'+(t.num!=null?t.num+'. ':'')+esc(t.title)+'</div>'+(t.summary?'<div class="s">'+esc(t.summary)+'</div>':'')+
       (b?'<div class="s">'+b+'</div>':'')+'</a>';
  });
  h+='</div>';
  app.innerHTML=h;
  var q=document.getElementById('q');
  q.oninput=function(){
    var v=q.value.trim().toLowerCase();
    [].forEach.call(document.querySelectorAll('#list .card'),function(c){
      c.style.display = (!v || c.dataset.s.indexOf(v)>-1)?'':'none';
    });
  };
}

function topicPage(sid,tid){
  var s=subj(sid), t=topic(s,tid); if(!t) return notFound();
  var r=rec(sid,tid);
  var h='<div class="crumbs"><a href="#/">Головна</a> › <a href="#/'+sid+'">'+esc(s.title)+'</a></div>';
  h+='<h1>'+(t.num!=null?t.num+'. ':'')+esc(t.title)+'</h1>';
  var body=t.body||'<p class="muted">Матеріал ще не доданий.</p>';
  // зміст з заголовків h2
  var tmp=document.createElement('div'); tmp.innerHTML=body;
  var hs=tmp.querySelectorAll('h2'), toc='';
  [].forEach.call(hs,function(el,i){ el.id='sec'+i; toc+='<a href="javascript:void(0)" data-go="sec'+i+'">'+esc(el.textContent)+'</a>'; });
  if(toc) h+='<div class="toc">'+toc+'</div>';
  h+='<div class="body">'+tmp.innerHTML+'</div>';
  if(t.test && t.test.length){
    h+='<div class="card" style="margin-top:24px"><div class="t">Міні-тест до теми</div><div class="s">'+t.test.length+' запитань'+(r.best!=null?' · найкращий результат: '+r.best+'%':'')+'</div>'+
       '<div style="margin-top:12px"><a class="btn" href="#/'+sid+'/'+tid+'/test">Пройти тест</a></div></div>';
  }
  h+='<div class="row"><button class="btn sec" id="read">'+(r.read?'✓ Прочитано (зняти)':'Позначити прочитаним')+'</button></div>';
  var idx=s.topics.indexOf(t), prev=s.topics[idx-1], next=s.topics[idx+1];
  if(prev||next){
    h+='<div class="row">'+(prev?'<a class="btn sec" href="#/'+sid+'/'+prev.id+'">← Попередня</a>':'<span></span>')+
       (next?'<a class="btn sec" href="#/'+sid+'/'+next.id+'">Наступна →</a>':'<span></span>')+'</div>';
  }
  app.innerHTML=h;
  document.getElementById('read').onclick=function(){ setRec(sid,tid,{read:!rec(sid,tid).read}); topicPage(sid,tid); };
  [].forEach.call(document.querySelectorAll('[data-go]'),function(a){
    a.onclick=function(){ var el=document.getElementById(a.dataset.go); if(el) el.scrollIntoView({behavior:'smooth'}); };
  });
}

/* ---------- тест ---------- */
function testPage(sid,tid,onlyIdx){
  var s=subj(sid), t=topic(s,tid); if(!t||!t.test||!t.test.length) return notFound();
  var order = onlyIdx || t.test.map(function(_,i){return i;});
  var pos=0, wrong=[], right=0, locked=false;
  function crumbs(){ return '<div class="crumbs"><a href="#/'+sid+'/'+tid+'">← До теми: '+esc(t.title)+'</a></div>'; }
  function show(){
    var qi=order[pos], q=t.test[qi]; locked=false;
    var h=crumbs()+'<div class="muted">Запитання '+(pos+1)+' з '+order.length+'</div><div class="bar"><i style="width:'+pct(pos,order.length)+'%"></i></div>';
    h+='<div class="q">'+esc(q.q)+'</div>';
    q.o.forEach(function(o,i){ h+='<button class="opt" data-i="'+i+'">'+esc(o)+'</button>'; });
    h+='<div id="after"></div>';
    app.innerHTML=h; window.scrollTo(0,0);
    [].forEach.call(document.querySelectorAll('.opt'),function(b){
      b.onclick=function(){
        if(locked) return; locked=true;
        var i=+b.dataset.i, opts=document.querySelectorAll('.opt');
        [].forEach.call(opts,function(x,j){
          if(j===q.a) x.classList.add('ok'); else if(j===i) x.classList.add('bad'); else x.classList.add('dim');
        });
        if(i===q.a) right++; else wrong.push({q:q,chosen:i});
        var a='';
        if(q.e) a+='<div class="expl">'+esc(q.e)+'</div>';
        a+='<button class="btn" id="nx">'+(pos+1<order.length?'Далі':'Показати результат')+'</button>';
        document.getElementById('after').innerHTML=a;
        document.getElementById('nx').onclick=function(){ pos++; pos<order.length? show() : finish(); };
      };
    });
  }
  function finish(){
    var p=pct(right,order.length), r=rec(sid,tid);
    if(!onlyIdx && (r.best==null || p>r.best)) setRec(sid,tid,{best:p});
    else if(!onlyIdx) setRec(sid,tid,{});
    var h=crumbs()+'<div class="score">'+p+'%</div><p style="text-align:center" class="muted">Правильно: '+right+' з '+order.length+'</p>';
    if(wrong.length){
      h+='<h3>Помилки</h3>';
      wrong.forEach(function(w){
        h+='<div class="card wrong"><b>'+esc(w.q.q)+'</b><div class="muted">Ваша відповідь: '+esc(w.q.o[w.chosen])+'</div><div class="g">✓ '+esc(w.q.o[w.q.a])+'</div>'+(w.q.e?'<div class="expl">'+esc(w.q.e)+'</div>':'')+'</div>';
      });
      h+='<button class="btn" id="again">Повторити лише помилки</button>';
    } else h+='<div class="card" style="text-align:center">Без жодної помилки 🎉</div>';
    h+='<div class="row"><a class="btn sec" href="#/'+sid+'/'+tid+'/test">Пройти заново</a><a class="btn sec" href="#/'+sid+'">До тем</a></div>';
    app.innerHTML=h; window.scrollTo(0,0);
    var ag=document.getElementById('again');
    if(ag) ag.onclick=function(){ var ids=wrong.map(function(w){return t.test.indexOf(w.q);}); testPage(sid,tid,ids); };
  }
  show();
}

function notFound(){ app.innerHTML='<div class="empty">Сторінку не знайдено.<br><br><a class="btn sec" href="#/">На головну</a></div>'; }

/* ---------- роутер ---------- */
function route(){
  var p=location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  window.scrollTo(0,0);
  if(!p.length) return home();
  if(p.length===1) return subjectPage(p[0]);
  if(p.length===2) return topicPage(p[0],p[1]);
  if(p[2]==='test') return testPage(p[0],p[1]);
  notFound();
}
window.addEventListener('hashchange',route);
route();
})();
