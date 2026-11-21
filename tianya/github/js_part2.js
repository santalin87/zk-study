/* ===== 今日任务 ===== */
function doneDays(){return lsGet('ty_days',{})}
function streak(){
  var days=doneDays();var s=0;var d=new Date();
  if(!days[todayStr()])d.setDate(d.getDate()-1);
  while(true){
    var k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(days[k]){s++;d.setDate(d.getDate()-1)}else break;
  }
  return s;
}
function markToday(){var days=doneDays();days[todayStr()]=true;lsSet('ty_days',days)}
function renderToday(){
  var due=CARDS.filter(function(c){return isDue(c.id)});
  var key='ty_task_'+todayStr();
  var done=lsGet(key,{});
  var mastered=CARDS.filter(function(c){return srGet(c.id).box>=3}).length;
  var h='<div class="card"><h2 style="margin-top:0">今日任务</h2>'
    +'<p class="mut">连续打卡 <b style="color:#2563eb">'+streak()+'</b> 天 · 卡片已掌握 '+mastered+' / '+CARDS.length+' 张</p>';
  var tasks=[
    {id:'t1',label:'复习到期卡片（'+due.length+' 张到期）',tab:'cards'},
    {id:'t2',label:'专项练习 5 题',tab:'practice'},
    {id:'t3',label:'默写工坊做一组',tab:'dict'}
  ];
  tasks.forEach(function(t){
    h+='<label class="task"><input type="checkbox" data-task="'+t.id+'"'+(done[t.id]?' checked':'')+'>'
      +'<span style="flex:1">'+esc(t.label)+'</span>'
      +'<button class="btn gray" style="width:auto;margin:0;padding:8px 14px" data-go="'+t.tab+'">去做</button></label>';
  });
  h+='<p class="mut">规则：卡片点"不会"明天再出现；连对几次，间隔会拉长到 4 天、7 天、15 天、30 天。忘了也没关系，它会自己回来。</p></div>';
  h+='<div class="card"><h2 style="margin-top:0">三个病根（提醒）</h2>'
    +'<p><b>1. 概念地基有洞</b>——先把概念弄懂，再刷题。</p>'
    +'<p><b>2. 输出说不到点上</b>——答题先想"得分点是什么"。</p>'
    +'<p><b>3. 选择题暗坑</b>——错题遮住答案重做，才算真会。</p>'
    +'<p class="mut">完整分析在「学习报告」里。</p></div>';
  app.innerHTML=h;
  app.querySelectorAll('[data-task]').forEach(function(cb){
    cb.addEventListener('change',function(){
      var d2=lsGet(key,{});d2[cb.getAttribute('data-task')]=cb.checked;lsSet(key,d2);
      if(cb.checked)markToday();
      renderToday();
    });
  });
  app.querySelectorAll('[data-go]').forEach(function(b){
    b.addEventListener('click',function(e){
      e.preventDefault();
      var t=b.getAttribute('data-go');
      var bs=document.querySelectorAll('#tabs button');
      bs.forEach(function(x){x.classList.toggle('on',x.getAttribute('data-t')===t)});
      curTab=t;render();
    });
  });
}
/* ===== 记忆卡片 ===== */
var CARD={list:[],idx:0,flipped:false,subject:'全部',dueOnly:true};
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
  h+='<p class="mut" style="margin:10px 0 4px">第 '+(CARD.idx+1)+' / '+CARD.list.length+' 张 · 熟练度盒子 '+r.box+' · 已复习 '+r.seen+' 次 <span class="pill">'+esc(c.subject)+'</span>'+(c.etype?' <span class="pill">'+esc(c.etype)+'</span>':'')+'</p>'
    +'<div class="card flash" id="flash" style="box-shadow:none;border:1px solid #e5e7eb;margin-top:8px">'
    +(CARD.flipped?'<div class="back">'+esc(c.back)+'</div>':'<div class="front">'+esc(c.front)+'</div><p class="mut" style="text-align:center">点卡片翻面看答案</p>')
    +'</div>'
    +'<div class="row"><button class="btn gray" id="cPrev">上一题</button><button class="btn gray" id="cNext">下一题</button></div>'
    +'<div class="row"><button class="btn red" id="cNo">不会</button><button class="btn green" id="cYes">会了</button></div>'
    +'<button class="btn" id="cSimilar">举一反三：练一道同类题</button>'
    +'</div>';
  app.innerHTML=h;bindCardHead();
  document.getElementById('flash').addEventListener('click',function(){CARD.flipped=!CARD.flipped;renderCards()});
  document.getElementById('cPrev').addEventListener('click',function(){CARD.idx=(CARD.idx-1+CARD.list.length)%CARD.list.length;CARD.flipped=false;renderCards()});
  document.getElementById('cNext').addEventListener('click',function(){CARD.idx=(CARD.idx+1)%CARD.list.length;CARD.flipped=false;renderCards()});
  document.getElementById('cYes').addEventListener('click',function(){srMark(c.id,true);markToday();CARD.flipped=false;CARD.idx++;renderCards()});
  document.getElementById('cNo').addEventListener('click',function(){srMark(c.id,false);markToday();CARD.flipped=false;CARD.idx++;renderCards()});
  document.getElementById('cSimilar').addEventListener('click',function(){goSimilar(c)});
}
function bindCardHead(){
  var s=document.getElementById('cSubj');
  if(s)s.addEventListener('change',function(){CARD.subject=s.value;CARD.idx=0;CARD.flipped=false;renderCards()});
  var d=document.getElementById('cDue');
  if(d)d.addEventListener('click',function(){CARD.dueOnly=!CARD.dueOnly;CARD.idx=0;CARD.flipped=false;renderCards()});
}
function goSimilar(card){
  /* 按知识点关键词在练习题里找同类题 */
  var kw=String(card.kp||'');
  var hit=D.practice.filter(function(p){
    var hay=(p.knowledge||'')+(p.stem||'');
    return kw&&hay.indexOf(kw.slice(0,4))>=0;
  });
  if(!hit.length&&card.kind==='wrong'){
    hit=D.practice.filter(function(p){return p.subject===card.subject});
  }
  if(!hit.length&&card.kind==='dict'){
    var others=D.dictation.filter(function(d){return d.set===card.raw.set&&d.id!==card.raw.id});
    if(others.length){DICT.set=card.raw.set;DICT.idx=0;switchTab('dict');return}
  }
  if(hit.length){PRAC.only=hit[0].id;PRAC.idx=0;PRAC.answered={};switchTab('practice')}
  else alert('暂时没有同类题，去专项练习随便练一道同科目的吧');
}
function switchTab(t){
  curTab=t;
  var bs=document.querySelectorAll('#tabs button');
  bs.forEach(function(x){x.classList.toggle('on',x.getAttribute('data-t')===t)});
  render();
}
