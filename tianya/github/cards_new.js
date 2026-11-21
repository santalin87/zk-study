/* ===== 记忆卡片 ===== */
var CARD={list:[],idx:0,flipped:false,subject:'全部',dueOnly:true,stage:0,picked:null,checkOpen:false};
function buildDeck(){
  var list=CARDS.filter(function(c){
    if(CARD.subject!=='全部'&&c.subject!==CARD.subject)return false;
    if(CARD.dueOnly&&!isDue(c.id))return false;
    return true;
  });
  list.sort(function(a,b){return srGet(a.id).box-srGet(b.id).box});
  CARD.list=list;
  if(CARD.idx>=list.length)CARD.idx=0;
}
function resetCardState(){CARD.stage=0;CARD.picked=null;CARD.checkOpen=false;CARD.flipped=false}
function renderCards(){
  buildDeck();
  var subjects=['全部','语文','数学','英语','物理','化学','生物','历史','政治','地理'];
  var h='<div class="card"><div class="row">'
    +'<select id="cSubj" style="flex:1">'+subjects.map(function(s){return '<option'+(s===CARD.subject?' selected':'')+'>'+s+'</option>'}).join('')+'</select>'
    +'<button class="btn gray" id="cDue" style="flex:0 0 auto;width:auto;margin:0;padding:10px 12px">'+(CARD.dueOnly?'只看到期':'看全部')+'</button></div>';
  if(!CARD.list.length){
    h+='<p class="mut" style="margin-top:14px">这个范围里没有到期的卡片。点"看全部"可以提前复习，或者去做专项练习。</p></div>';
    app.innerHTML=h;bindCardHead();return;
  }
  var c=CARD.list[CARD.idx];
  var r=srGet(c.id);
  h+='<p class="mut" style="margin:10px 0 4px">第 '+(CARD.idx+1)+' / '+CARD.list.length+' 张 · 熟练度盒子 '+r.box+' · 已复习 '+r.seen+' 次 <span class="pill">'+esc(c.subject)+'</span>'+(c.etype?' <span class="pill">'+esc(c.etype)+'</span>':'')+'</p>';
  if(c.kind==='wrong')h+=wrongCardHtml(c);
  else h+=dictCardHtml(c);
  h+='<div class="row"><button class="btn gray" id="cPrev">上一题</button><button class="btn gray" id="cNext">下一题</button></div></div>';
  app.innerHTML=h;bindCardHead();bindCardBody(c);
}
function wrongCardHtml(c){
  var w=c.raw;
  var h='';
  if(w.card_type==='concept'){
    /* 知识点卡：先讲透，再考一下 */
    h+='<div style="line-height:1.8;white-space:pre-wrap"><b>这个知识点当时没掌握：</b>\n'+esc(w.teach||w.note||'')+'</div>';
    if(CARD.stage===0){
      h+='<button class="btn" id="cReveal" style="margin-top:12px">学完了，考考我</button>';
    }else{
      h+=checkHtml(w);
      h+=rateHtml();
    }
    return h;
  }
  /* 重做卡：先做题，再看讲解 */
  h+='<p style="font-size:16px;line-height:1.75;white-space:pre-wrap">'+esc(w.stem||w.knowledge_point||'')+'</p>';
  if(w.options){
    var ansLetters=String(w.std_answer||'').replace(/[^A-D]/g,'');
    Object.keys(w.options).sort().forEach(function(k){
      var cls='opt';
      if(CARD.picked){
        if(ansLetters.indexOf(k)>=0)cls+=' ok';
        else if(k===CARD.picked)cls+=' bad';
      }
      h+='<button class="'+cls+'" data-copt="'+k+'">'+k+'. '+esc(w.options[k])+'</button>';
    });
  }
  if(CARD.stage===0){
    if(!w.options)h+='<button class="btn" id="cReveal">做完了，看答案和讲解</button>';
    else h+='<p class="mut">点一个选项，就是重做这道题</p>';
  }else{
    h+=learnHtml(w);
    h+=checkHtml(w);
    h+=rateHtml();
  }
  return h;
}
function learnHtml(w){
  var h='<div class="explain"><b>正确答案：</b>'+esc(w.std_answer||'')+'\n\n';
  if(w.why)h+='<b>当时错在：</b>'+esc(w.why)+'\n\n';
  h+='<b>把这个点弄懂：</b>\n'+esc(w.teach||w.note||'')+'</div>';
  return h;
}
function checkHtml(w){
  if(!w.check_q)return '';
  var h='<div style="margin-top:12px"><b>举一反三，验证一下：</b><p style="line-height:1.7;white-space:pre-wrap;margin:6px 0">'+esc(w.check_q)+'</p>';
  if(CARD.checkOpen)h+='<div class="explain">答案：'+esc(w.check_a||'')+'</div>';
  else h+='<button class="btn gray" id="cCheck">看这道小题的答案</button>';
  return h+'</div>';
}
function rateHtml(){
  return '<p class="mut" style="margin-top:14px">这张卡现在掌握得怎么样？</p><div class="row"><button class="btn red" id="cNo">还不会</button><button class="btn green" id="cYes">会了</button></div>';
}
function dictCardHtml(c){
  var h='<div class="card flash" id="flash" style="box-shadow:none;border:1px solid #e5e7eb;margin-top:8px">'
    +(CARD.flipped?'<div class="back">'+esc(c.back)+'</div>':'<div class="front">'+esc(c.front)+'</div><p class="mut" style="text-align:center">点卡片翻面看答案</p>')
    +'</div><div class="row"><button class="btn red" id="cNo">不会</button><button class="btn green" id="cYes">会了</button></div>';
  return h;
}
function bindCardBody(c){
  var prev=document.getElementById('cPrev');
  if(prev)prev.addEventListener('click',function(){CARD.idx=(CARD.idx-1+CARD.list.length)%CARD.list.length;resetCardState();renderCards()});
  var next=document.getElementById('cNext');
  if(next)next.addEventListener('click',function(){CARD.idx=(CARD.idx+1)%CARD.list.length;resetCardState();renderCards()});
  var rev=document.getElementById('cReveal');
  if(rev)rev.addEventListener('click',function(){CARD.stage=1;renderCards()});
  var chk=document.getElementById('cCheck');
  if(chk)chk.addEventListener('click',function(){CARD.checkOpen=true;renderCards()});
  app.querySelectorAll('[data-copt]').forEach(function(b){
    b.addEventListener('click',function(){
      if(CARD.stage===1)return;
      CARD.picked=b.getAttribute('data-copt');
      CARD.stage=1;renderCards();
    });
  });
  var fl=document.getElementById('flash');
  if(fl)fl.addEventListener('click',function(){CARD.flipped=!CARD.flipped;renderCards()});
  var yes=document.getElementById('cYes');
  if(yes)yes.addEventListener('click',function(){srMark(c.id,true);markToday();resetCardState();CARD.idx++;renderCards()});
  var no=document.getElementById('cNo');
  if(no)no.addEventListener('click',function(){srMark(c.id,false);markToday();resetCardState();CARD.idx++;renderCards()});
}
function bindCardHead(){
  var s=document.getElementById('cSubj');
  if(s)s.addEventListener('change',function(){CARD.subject=s.value;CARD.idx=0;resetCardState();renderCards()});
  var d=document.getElementById('cDue');
  if(d)d.addEventListener('click',function(){CARD.dueOnly=!CARD.dueOnly;CARD.idx=0;resetCardState();renderCards()});
}
function switchTab(t){
  curTab=t;
  var bs=document.querySelectorAll('#tabs button');
  bs.forEach(function(x){x.classList.toggle('on',x.getAttribute('data-t')===t)});
  render();
}
