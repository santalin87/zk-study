/* ===== 专项练习 ===== */
var PRAC={list:[],idx:0,answered:{},subject:'全部',only:null};
function buildPrac(){
  var list=D.practice.filter(function(p){
    if(PRAC.only)return p.id===PRAC.only;
    if(PRAC.subject!=='全部'&&p.subject!==PRAC.subject)return false;
    return true;
  });
  PRAC.list=list;
  if(PRAC.idx>=list.length)PRAC.idx=0;
}
function renderPractice(){
  buildPrac();
  var h='<div class="card">';
  if(PRAC.only){
    h+='<p><span class="pill">举一反三</span> <button class="btn gray" id="pAll" style="width:auto;display:inline-block;margin:0;padding:6px 12px">回到全部练习</button></p>';
  }else{
    h+='<select id="pSubj">'+['全部','物理','数学','化学'].map(function(s){return '<option'+(s===PRAC.subject?' selected':'')+'>'+s+'</option>'}).join('')+'</select>';
  }
  if(!PRAC.list.length){h+='<p class="mut">没有题目</p></div>';app.innerHTML=h;bindPracHead();return}
  var q=PRAC.list[PRAC.idx];
  var ans=PRAC.answered[q.id];
  h+='<p class="mut" style="margin-top:10px">第 '+(PRAC.idx+1)+' / '+PRAC.list.length+' 题 · '+esc(q.subject)+' · '+esc(q.knowledge||'')+' · '+q.points+' 分</p>'
    +'<p style="font-size:17px;line-height:1.7;white-space:pre-wrap">'+esc(q.stem)+'</p>';
  var opts=q.options||{};
  Object.keys(opts).sort().forEach(function(k){
    var cls='opt';
    if(ans){
      if(k===q.answer)cls+=' ok';
      else if(k===ans)cls+=' bad';
    }
    h+='<button class="'+cls+'" data-opt="'+k+'">'+k+'. '+esc(opts[k])+'</button>';
  });
  if(ans){
    h+='<div class="explain">'+(ans===q.answer?'答对了。':'答错了，正确答案 '+esc(q.answer)+'。')+'\n\n'+esc(q.explain||'')+'</div>';
  }
  h+='<div class="row"><button class="btn gray" id="pPrev">上一题</button><button class="btn gray" id="pNext">下一题</button></div></div>';
  app.innerHTML=h;bindPracHead();
  app.querySelectorAll('[data-opt]').forEach(function(b){
    b.addEventListener('click',function(){
      if(PRAC.answered[q.id])return;
      PRAC.answered[q.id]=b.getAttribute('data-opt');
      markToday();
      var done=lsGet('ty_prac_done',{});done[q.id]=PRAC.answered[q.id]===q.answer;lsSet('ty_prac_done',done);
      renderPractice();
    });
  });
  document.getElementById('pPrev').addEventListener('click',function(){PRAC.idx=(PRAC.idx-1+PRAC.list.length)%PRAC.list.length;renderPractice()});
  document.getElementById('pNext').addEventListener('click',function(){PRAC.idx=(PRAC.idx+1)%PRAC.list.length;renderPractice()});
}
function bindPracHead(){
  var s=document.getElementById('pSubj');
  if(s)s.addEventListener('change',function(){PRAC.subject=s.value;PRAC.idx=0;renderPractice()});
  var a=document.getElementById('pAll');
  if(a)a.addEventListener('click',function(){PRAC.only=null;PRAC.idx=0;renderPractice()});
}
/* ===== 默写工坊 ===== */
var DICT={set:'方程式默写',idx:0,revealed:false};
function normEq(s){
  return String(s||'').replace(/\s+/g,'').replace(/＝/g,'=').replace(/→/g,'=').replace(/↑/g,'up').replace(/↓/g,'dn').replace(/△/g,'').replace(/（/g,'(').replace(/）/g,')');
}
function renderDict(){
  var sets=[];D.dictation.forEach(function(d){if(sets.indexOf(d.set)<0)sets.push(d.set)});
  var items=D.dictation.filter(function(d){return d.set===DICT.set});
  if(DICT.idx>=items.length)DICT.idx=0;
  var d=items[DICT.idx];
  var h='<div class="card"><select id="dSet">'+sets.map(function(s){return '<option'+(s===DICT.set?' selected':'')+'>'+esc(s)+'</option>'}).join('')+'</select>'
    +'<p class="mut" style="margin-top:10px">第 '+(DICT.idx+1)+' / '+items.length+' 条 · '+esc(d.subject)+'</p>'
    +'<p style="font-size:18px;line-height:1.7">'+esc(d.prompt)+'</p>';
  if(DICT.set==='方程式默写'){
    h+='<input type="text" id="dInput" placeholder="在这里写方程式，比如 2Na + 2H2O = 2NaOH + H2↑">'
      +'<button class="btn" id="dCheck">检查</button><div id="dResult"></div>';
  }
  if(DICT.revealed){
    h+='<div class="explain">答案：'+esc(d.answer)+'\n\n'+esc(d.explain||'')+'</div>'
      +'<div class="row"><button class="btn red" id="dNo">没记住</button><button class="btn green" id="dYes">记住了</button></div>';
  }else{
    h+='<button class="btn gray" id="dShow">看答案</button>';
  }
  h+='<div class="row"><button class="btn gray" id="dPrev">上一条</button><button class="btn gray" id="dNext">下一条</button></div></div>';
  app.innerHTML=h;
  document.getElementById('dSet').addEventListener('change',function(e){DICT.set=e.target.value;DICT.idx=0;DICT.revealed=false;renderDict()});
  document.getElementById('dPrev').addEventListener('click',function(){DICT.idx=(DICT.idx-1+items.length)%items.length;DICT.revealed=false;renderDict()});
  document.getElementById('dNext').addEventListener('click',function(){DICT.idx=(DICT.idx+1)%items.length;DICT.revealed=false;renderDict()});
  var sh=document.getElementById('dShow');
  if(sh)sh.addEventListener('click',function(){DICT.revealed=true;renderDict()});
  var ck=document.getElementById('dCheck');
  if(ck)ck.addEventListener('click',function(){
    var v=document.getElementById('dInput').value;
    var ok=normEq(v)===normEq(d.answer);
    document.getElementById('dResult').innerHTML='<div class="explain">'+(ok?'写对了。再点"看答案"对一遍细节（气体符号、条件）。':'不对。点"看答案"看看错在哪。')+'</div>';
    DICT.revealed=true;
    setTimeout(renderDict,900);
  });
  var dy=document.getElementById('dYes');
  if(dy)dy.addEventListener('click',function(){srMark('d'+d.id,true);markToday();DICT.idx++;DICT.revealed=false;renderDict()});
  var dn=document.getElementById('dNo');
  if(dn)dn.addEventListener('click',function(){srMark('d'+d.id,false);markToday();DICT.idx++;DICT.revealed=false;renderDict()});
}
/* ===== 错题本 ===== */
var BOOK={subject:'全部',kw:''};
function renderBook(){
  var subjects=['全部','语文','数学','英语','物理','化学','生物','历史','政治','地理'];
  var list=D.wrong.filter(function(w){
    if(BOOK.subject!=='全部'&&w.subject!==BOOK.subject)return false;
    if(BOOK.kw&&(w.knowledge_point||'').indexOf(BOOK.kw)<0&&(w.note||'').indexOf(BOOK.kw)<0)return false;
    return true;
  });
  var h='<div class="card"><div class="row"><select id="bSubj" style="flex:1">'+subjects.map(function(s){return '<option'+(s===BOOK.subject?' selected':'')+'>'+s+'</option>'}).join('')+'</select></div>'
    +'<input type="text" id="bKw" placeholder="搜知识点，比如：配平、刹车、集合" value="'+esc(BOOK.kw)+'" style="margin-top:8px">'
    +'<p class="mut">共 '+list.length+' 道错题（第一次月考）。点任意一道可以展开看解析。</p></div>';
  list.forEach(function(w,i){
    h+='<div class="card" style="cursor:pointer" data-w="'+i+'"><b>'+esc(w.subject)+' · 第'+esc(w.question_no)+'题</b> '
      +(w.error_type?'<span class="pill">'+esc(w.error_type)+'</span>':'')
      +'<p style="margin:6px 0">'+esc(w.knowledge_point||'')+'</p>'
      +'<p class="mut" style="margin:0">你答：'+esc(w.student_answer||'—')+' · 正确：'+esc(w.std_answer||'—')+' · 得分 '+w.got_score+'/'+w.full_score+'</p>'
      +'<div class="explain" style="display:none">'+esc(w.note||'暂无解析')+'</div></div>';
  });
  app.innerHTML=h;
  document.getElementById('bSubj').addEventListener('change',function(e){BOOK.subject=e.target.value;renderBook()});
  var kw=document.getElementById('bKw');
  kw.addEventListener('change',function(){BOOK.kw=kw.value;renderBook()});
  app.querySelectorAll('[data-w]').forEach(function(el){
    el.addEventListener('click',function(){
      var ex=el.querySelector('.explain');
      ex.style.display=ex.style.display==='none'?'block':'none';
    });
  });
}
/* ===== 提问 ===== */
function renderAsk(){
  var newUrl='https://github.com/santalin87/zk-study/issues/new?labels=tianya-q&title='+encodeURIComponent('[提问] ')+'&body='+encodeURIComponent('科目：\n题目（可以把题目打出来，或者写试卷第几题）：\n\n我卡在哪里：\n');
  var h='<div class="card"><h2 style="margin-top:0">我要提问</h2>'
    +'<p>遇到弄不懂的题，点下面按钮提交。爸爸和 AI 老师看到后会回答，答案会出现在这个页面下面。不用等，提交完先去做别的题。</p>'
    +'<a class="btn" href="'+newUrl+'" target="_blank" rel="noopener">提交新问题（需要登录 GitHub）</a>'
    +'<p class="mut">没有 GitHub 账号的话，把问题发给爸爸代提交也行。</p></div>'
    +'<div class="card"><h2 style="margin-top:0">我的问题</h2><div id="qaList"><p class="mut">加载中…</p></div></div>';
  app.innerHTML=h;
  fetch('https://api.github.com/repos/santalin87/zk-study/issues?labels=tianya-q&state=all&per_page=50')
    .then(function(r){return r.json()})
    .then(function(list){
      var box=document.getElementById('qaList');
      if(!box)return;
      if(!Array.isArray(list)||!list.length){box.innerHTML='<p class="mut">还没有提过问题</p>';return}
      box.innerHTML=list.map(function(it){
        return '<div class="qa"><b>'+esc(it.title)+'</b> <span class="pill">'+(it.state==='open'?'等回答':'已回答/关闭')+'</span>'
          +'<p style="white-space:pre-wrap;line-height:1.7">'+esc(it.body||'')+'</p>'
          +'<button class="btn gray" data-c="'+it.number+'" style="margin:0">看回答（'+it.comments+'）</button><div id="cmt'+it.number+'"></div></div>';
      }).join('');
      box.querySelectorAll('[data-c]').forEach(function(b){
        b.addEventListener('click',function(){
          var n=b.getAttribute('data-c');
          fetch('https://api.github.com/repos/santalin87/zk-study/issues/'+n+'/comments')
            .then(function(r){return r.json()})
            .then(function(cs){
              document.getElementById('cmt'+n).innerHTML=(cs||[]).map(function(c){
                return '<div class="ans"><b>'+esc(c.user.login)+'：</b>\n'+esc(c.body||'')+'</div>';
              }).join('')||'<p class="mut">还没有回答</p>';
            });
        });
      });
    })
    .catch(function(){
      var box=document.getElementById('qaList');
      if(box)box.innerHTML='<p class="mut">网络不通，暂时加载不了问题列表</p>';
    });
}
/* ===== 学习报告 ===== */
function renderReport(){
  var order=['语文','英语','数学','物理','历史','政治','生物','地理','化学'];
  var map={};D.scores.forEach(function(x){map[x.subject]=x});
  var total=0,full=0;
  var h='<div class="card"><h2 style="margin-top:0">成绩看板 · 高一上第一次月考</h2>';
  order.forEach(function(s){
    var x=map[s];if(!x)return;
    total+=x.score;full+=x.full;
    var pct=Math.round(x.score/x.full*100);
    h+='<div style="margin:8px 0"><div>'+s+' <b>'+x.score+'</b> / '+x.full+'（'+pct+'%）</div><div class="bar"><i style="width:'+pct+'%"></i></div></div>';
  });
  h+='<p><b>总分 '+total+' / '+full+'</b></p></div>';
  h+='<div class="card"><h2 style="margin-top:0">三个病根</h2>'
    +'<p><b>1. 概念地基有洞</b>——化学方程式从不配平、物理刹车不算停止时间、地理把"大气逆辐射"写成"反射"。不是粗心，是真不会。</p>'
    +'<p><b>2. 输出说不到点上</b>——政治"四个彻底结束"一个没写出来，历史江南农业关键词全缺。有话，但写不到得分点上。</p>'
    +'<p><b>3. 选择题暗坑</b>——地理错 10 题、生物错 7 题、化学错 6 题。拿回试卷后遮答案重做复盘。</p></div>';
  var sr=srAll();var boxes=[0,0,0,0,0,0,0];
  CARDS.forEach(function(c){boxes[srGet(c.id).box]++});
  var pracDone=lsGet('ty_prac_done',{});var pracOk=0,pracN=0;
  Object.keys(pracDone).forEach(function(k){pracN++;if(pracDone[k])pracOk++});
  h+='<div class="card"><h2 style="margin-top:0">我的进度（这台设备）</h2>'
    +'<p>连续打卡：<b>'+streak()+'</b> 天</p>'
    +'<p>卡片熟练度分布（盒子 0 到 6，越高越熟）：'+boxes.join(' · ')+'，共 '+CARDS.length+' 张</p>'
    +'<p>专项练习已做：'+pracN+' 题，答对 '+pracOk+' 题</p>'
    +'<p class="mut">进度存在这台手机的浏览器里，换手机不会同步。每天打开做一点，比一次做很多更管用。</p></div>';
  app.innerHTML=h;
}
render();
