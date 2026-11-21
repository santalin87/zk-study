/* ===== 学习路径 v2：单元制（2026-11-02 改版：一节一单元、同视频合并、视频不中断） ===== */
var PATHV={view:'list',id:null,openMid:null,caseSt:{},ans:{}};
var PATH_BOOK_MATH=PATH_BOOK,PATH_SUBJ='math';
var PATH_VER={math:'必修第一册（人教A版）',phy:'必修第一册（鲁科版）'};
function setPathSubj(s){if(s===PATH_SUBJ)return;if(s==='phy'&&typeof PATH_BOOK_PHY==='undefined')return;PATH_SUBJ=s;PATH_BOOK=(s==='phy'?PATH_BOOK_PHY:PATH_BOOK_MATH);PATHV.view='list';PATHV.id=null;renderPath();window.scrollTo(0,0)}
function subjTabsHtml(){if(typeof PATH_BOOK_PHY==='undefined')return '';return '<div style="margin:0 0 4px"><span class="chip2'+(PATH_SUBJ==='math'?' on':'')+'" data-subj="math">数学</span> <span class="chip2'+(PATH_SUBJ==='phy'?' on':'')+'" data-subj="phy">物理</span></div>'}
function bindSubjTabs(root){root.querySelectorAll('[data-subj]').forEach(function(el){el.addEventListener('click',function(){setPathSubj(el.getAttribute('data-subj'))})})}
var LVNAMES=['未开始','已预习','已学过','看懂了','能应用','综合应用'];
var LVCOLORS=['#9ca3af','#60a5fa','#38bdf8','#34d399','#2563eb','#7c3aed'];
function pStatus(){return lsGet('ty_path_status',{})}
function pEv(){return lsGet('ty_path_ev',{})}
function pLog(){return lsGet('ty_path_log',[])}
function pathLv(uid){
  var st=pStatus(),s=st[uid];
  if(s)return s.lv;
  var u=PATH_BOOK.units[uid],mx=0;
  if(u)u.members.forEach(function(m){var ms=st[m];if(ms&&ms.lv>mx)mx=ms.lv});
  return mx;
}
function unitEv(uid){
  var ev=pEv(),u=PATH_BOOK.units[uid],out={apply:0,adv:0,redoN:0,redoTot:0,redoDue:0};
  var ue=ev[uid]||{};
  if(ue.apply)out.apply=ue.apply;
  if(ue.adv)out.adv=ue.adv;
  if(u)u.members.forEach(function(m){
    var e=ev[m]||{},n=PATH_BOOK.nodes[m];
    if(n&&n.content&&n.content.case){out.redoTot++;if(e.redo)out.redoN++}
    if(e.apply&&!out.apply)out.apply=e.apply;
    if(e.adv&&!out.adv)out.adv=e.adv;
    if(e.redoDue&&(!out.redoDue||e.redoDue<out.redoDue))out.redoDue=e.redoDue;
  });
  return out;
}
function markEv(uid,mid,field){
  var ev=pEv(),now=Date.now();
  ev[mid]=ev[mid]||{};ev[mid][field]=now;
  ev[uid]=ev[uid]||{};ev[uid][field]=now;
  lsSet('ty_path_ev',ev);
}
function pathLogEv(node,kind,item,ok,detail){
  var log=pLog();log.push({ts:Date.now(),node:node,kind:kind,item:item||'',ok:(ok===null||ok===undefined?null:(ok?1:0)),detail:detail||''});
  if(log.length>800)log=log.slice(log.length-800);lsSet('ty_path_log',log);
  try{fetch('/api/path-event',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({node:node,kind:kind,item:item||'',ok:(ok===null||ok===undefined?null:(ok?1:0)),detail:detail||''})}).catch(function(){})}catch(e){}
}
function lvOptions(cur){
  var h='';for(var i=0;i<6;i++)h+='<option value="'+i+'"'+(i===cur?' selected':'')+'>'+LVNAMES[i]+'</option>';return h;
}
function pathSetStatus(uid,lv,selEl){
  var ev=unitEv(uid);
  if(lv===4&&!ev.apply){alert('「能应用」要先做对这一课里的应用题，才算数。先去做题，做对了这里会自动解锁。');if(selEl)selEl.value=pathLv(uid);var a=document.querySelector('[data-applysec]');if(a){a.open=true;a.scrollIntoView({behavior:'smooth'})}return false}
  if(lv===5&&!ev.adv){alert('「综合应用」要先做对这一课里的综合题。先去挑战，做对了再回来选。');if(selEl)selEl.value=pathLv(uid);var b=document.querySelector('[data-advsec]');if(b){b.open=true;b.scrollIntoView({behavior:'smooth'})}return false}
  var st=pStatus();st[uid]={lv:lv,ts:Date.now()};lsSet('ty_path_status',st);
  pathLogEv(uid,'status','',null,LVNAMES[lv]);
  return true;
}
function pathReviewItems(){
  var B=PATH_BOOK,now=Date.now(),week=now-7*864e5,log=pLog(),bad={},ev=pEv(),st=pStatus(),out=[];
  function unitOf(node){if(B.units[node])return{uid:node,mid:null};if(B.nodeUnit[node])return{uid:B.nodeUnit[node],mid:node};return null}
  function has(uid){return out.some(function(o){return o.uid===uid})}
  log.forEach(function(e){if(e.ts>=week&&(e.kind==='quiz'||e.kind==='redo')&&e.ok===0){var r=unitOf(e.node);if(r)bad[r.uid]=(bad[r.uid]||0)+1}});
  Object.keys(bad).forEach(function(uid){out.push({uid:uid,why:'本周做错 '+bad[uid]+' 次'})});
  Object.keys(ev).forEach(function(k){var e=ev[k];if(e.redoDue&&e.redoDue<=now){var r=unitOf(k);if(r&&B.units[r.uid]&&!has(r.uid))out.push({uid:r.uid,mid:r.mid,why:'案例重做还没通过'})}});
  Object.keys(st).forEach(function(k){var s=st[k];if(s.lv>=1&&s.lv<=3&&s.ts<week){var r=unitOf(k);if(r&&B.units[r.uid]&&!has(r.uid))out.push({uid:r.uid,why:'停在「'+LVNAMES[s.lv]+'」超过一周了'})}});
  return out.slice(0,8);
}
function renderPath(){if(PATHV.view==='unit'&&PATHV.id&&PATH_BOOK.units[PATHV.id])renderUnit(PATHV.id);else renderPathList()}
function openUnit(uid,mid){PATHV.view='unit';PATHV.id=uid;PATHV.openMid=mid||null;PATHV.caseSt={};PATHV.ans={};renderPath();window.scrollTo(0,0)}
function renderPathList(){
  var B=PATH_BOOK,tot=B.order.length,start=0,lv3=0,lv4=0,memTot=0;
  B.order.forEach(function(uid){var u=B.units[uid];memTot+=u.members.length;var lv=pathLv(uid);if(lv>0)start++;if(lv>=3)lv3++;if(lv>=4)lv4++});
  var intro=(PATH_SUBJ==='phy')?('必修第一册（鲁科版）· 第一章 运动的描述 · '+tot+' 课（'+memTot+' 个知识点打包成课，其余章节陆续补上）· 顺序不限，想先学哪课都可以。状态自己评：「能应用」要做对应用题、「综合应用」要做对综合题才算数。'):(PATH_VER[PATH_SUBJ]+' · 全册 '+tot+' 课（'+memTot+' 个知识点打包成课，一次学一课）· 顺序不限，想先学哪课都可以。状态自己评：「能应用」要做对应用题、「综合应用」要做对综合题才算数。');
  var h='<div class="card">'+subjTabsHtml()+'<h3 style="margin:2px 0 6px">学习路径 · '+esc(B.subject)+'</h3>'
    +'<p class="mut" style="margin:2px 0">'+intro+'</p>'
    +'<div class="pbar"><i style="width:'+Math.round(lv4/tot*100)+'%"></i></div>'
    +'<p style="margin:4px 0;font-size:14px">已启动 '+start+' 课 · 看懂及以上 '+lv3+' 课 · 能应用及以上 '+lv4+' 课</p></div>';
  var rev=pathReviewItems();
  h+='<div class="card"><h4 style="margin:2px 0 8px">本周复盘（自动生成）</h4>';
  if(!rev.length)h+='<p class="mut" style="margin:2px 0">本周还没有需要复盘的内容。做错的题、没通过的案例重做、停了一周没往前的课，会自动出现在这里。</p>';
  rev.forEach(function(r){h+='<span class="chip2" data-unit="'+r.uid+'" data-mid="'+(r.mid||'')+'">'+esc(B.units[r.uid].name)+' · '+esc(r.why)+'</span>'});
  h+='</div>';
  B.chapters.forEach(function(ch){
    var done=ch.units.filter(function(uid){return pathLv(uid)>=4}).length;
    h+='<div class="card"><h4 style="margin:2px 0 4px">'+esc(ch.no)+' '+esc(ch.title)+' <span class="mut" style="font-size:12px">'+ch.units.length+' 课 · 能应用 '+done+'</span></h4>';
    ch.units.forEach(function(uid){
      var u=B.units[uid],lv=pathLv(uid);
      var memNames=u.members.map(function(m){return B.nodes[m].name}).join(' · ');
      h+='<div class="kprow" data-unit="'+uid+'"><div class="kn">'+esc(u.name)+(u.video?' <span class="pill" style="background:#fdf2f8;color:#9d174d">视频</span>':'')+'<span class="ks">'+esc(u.secs)+' 节 · 课本第 '+u.pageFrom+' 页 · 含 '+u.members.length+' 个知识点：'+esc(memNames)+'</span></div>'
        +'<span style="width:10px;height:10px;border-radius:99px;background:'+LVCOLORS[lv]+';flex:none"></span>'
        +'<select class="lvsel" data-lvsel="'+uid+'">'+lvOptions(lv)+'</select></div>';
    });
    h+='</div>';
  });
  h+='<div class="card"><p class="mut" style="margin:2px 0">其他科目（语文、英语、化学、生物、政治、历史、地理）的路径会按同一套框架陆续补上。</p></div>';
  app.innerHTML=h;bindList();bindSubjTabs(app);afterNav();
}
function bindList(){
  app.querySelectorAll('[data-unit]').forEach(function(el){
    el.addEventListener('click',function(e){if(e.target.tagName==='SELECT')return;openUnit(el.getAttribute('data-unit'),el.getAttribute('data-mid')||null)});
  });
  app.querySelectorAll('[data-lvsel]').forEach(function(sel){
    sel.addEventListener('click',function(e){e.stopPropagation()});
    sel.addEventListener('change',function(){if(pathSetStatus(sel.getAttribute('data-lvsel'),parseInt(sel.value,10),sel))renderPathList()});
  });
}
function evBadgesHtml(uid){
  var ev=unitEv(uid);
  return '<span class="evd'+(ev.redoTot&&ev.redoN>=ev.redoTot?' ok':'')+'">案例重做 '+ev.redoN+'/'+ev.redoTot+'</span>'
    +'<span class="evd'+(ev.apply?' ok':'')+'">应用题'+(ev.apply?' ✓ 已通过':' 未通过')+'</span>'
    +'<span class="evd'+(ev.adv?' ok':'')+'">综合题'+(ev.adv?' ✓ 已通过':' 未通过')+'</span>';
}
function pqHtml2(uid,mid,group,items){
  if(!items||!items.length)return '';
  var h='';
  items.forEach(function(it,ix){
    var key=mid+'|'+group+ix,got=PATHV.ans[key];
    h+='<div class="pq" id="pq-'+mid+'-'+group+ix+'" style="margin:12px 0"><p style="font-size:15.5px;line-height:1.7;margin:4px 0">'+esc(it.q)+'</p>';
    (it.opts||[]).forEach(function(op,oi){
      var cls='opt';if(got!==undefined){if(oi===it.ans)cls+=' ok';else if(oi===got)cls+=' bad'}
      h+='<button class="'+cls+'" data-pq="'+key+'" data-oi="'+oi+'">'+'ABCD'[oi]+'. '+esc(op)+'</button>';
    });
    if(got!==undefined)h+='<div class="explain">'+(got===it.ans?'答对了。':'答错了，正确答案 '+'ABCD'[it.ans]+'。')+'\n\n'+esc(it.why||'')+'</div>';
    h+='</div>';
  });
  return h;
}
function caseHtml(uid,mid){
  var n=PATH_BOOK.nodes[mid],cs=n.content.case,st=PATHV.caseSt[mid]||{mode:'read',hints:0,shown:false};
  var ev=pEv()[mid]||{};
  var h='<h4 style="margin:2px 0 6px">案例精讲 · '+esc(cs.title)+(cs.tier==='redo'?' <span class="pill">要自己重做</span>':'')+'</h4>'
    +'<div class="seg"><button data-casemode="read"'+(st.mode==='read'?' class="on"':'')+'>看讲解</button><button data-casemode="redo"'+(st.mode==='redo'?' class="on"':'')+'>自己重做一遍</button></div>'
    +'<p style="font-size:15.5px;line-height:1.75;margin:8px 0">'+esc(cs.q)+'</p>';
  if(st.mode==='read'){
    (cs.talk||[]).forEach(function(t){h+='<p style="font-size:15px;line-height:1.85;margin:6px 0">'+esc(t)+'</p>'});
    h+='<div class="caseans">完整解答：\n'+(cs.steps||[]).map(function(s,i){return (i+1)+'. '+esc(s)}).join('\n')+'\n答案：'+esc(cs.a)+'</div>';
  }else{
    h+='<p class="mut" style="margin:4px 0">先自己在草稿纸上做一遍。卡住了再点提示，一次只看一条。</p>';
    (cs.hints||[]).forEach(function(ht,ix){if(ix<st.hints)h+='<div class="hintbox">提示 '+(ix+1)+'：'+esc(ht)+'</div>'});
    if(st.hints<(cs.hints||[]).length)h+='<button class="btn gray" data-casehint="1" style="width:auto;padding:8px 14px">给我一条提示</button> ';
    if(!st.shown)h+='<button class="btn gray" data-caseshow="1" style="width:auto;padding:8px 14px">做完了，看解答对一对</button>';
    if(st.shown){
      h+='<div class="caseans">完整解答：\n'+(cs.steps||[]).map(function(s,i){return (i+1)+'. '+esc(s)}).join('\n')+'\n答案：'+esc(cs.a)+'</div>'
        +'<p style="margin:8px 0"><button class="btn" data-redook="1" style="width:auto;padding:9px 16px">我做出来了</button> <button class="btn gray" data-redono="1" style="width:auto;padding:9px 16px">还没做出来</button></p>'
        +(ev.redo?'<p class="mut">这个案例你已经重做通过了。</p>':'');
    }
  }
  return h;
}
function bindCase(uid,mid){
  var box=document.getElementById('case-'+mid);if(!box)return;
  function rerender(){box.innerHTML=caseHtml(uid,mid);bindCase(uid,mid)}
  box.querySelectorAll('[data-casemode]').forEach(function(b){b.addEventListener('click',function(){
    PATHV.caseSt[mid]=PATHV.caseSt[mid]||{mode:'read',hints:0,shown:false};
    PATHV.caseSt[mid].mode=b.getAttribute('data-casemode');PATHV.caseSt[mid].hints=0;PATHV.caseSt[mid].shown=false;rerender();
  })});
  var hb=box.querySelector('[data-casehint]');if(hb)hb.addEventListener('click',function(){PATHV.caseSt[mid].hints++;rerender()});
  var sb=box.querySelector('[data-caseshow]');if(sb)sb.addEventListener('click',function(){PATHV.caseSt[mid].shown=true;rerender()});
  var ro=box.querySelector('[data-redook]');if(ro)ro.addEventListener('click',function(){
    var ev=pEv();ev[mid]=ev[mid]||{};ev[mid].redo=Date.now();delete ev[mid].redoDue;lsSet('ty_path_ev',ev);
    pathLogEv(mid,'redo','case',true,'');alert('记下了：这个案例你已经能自己做出来。');refreshUnitBits(uid);rerender();
  });
  var rn=box.querySelector('[data-redono]');if(rn)rn.addEventListener('click',function(){
    var ev=pEv();ev[mid]=ev[mid]||{};ev[mid].redoDue=Date.now()+2*864e5;lsSet('ty_path_ev',ev);
    pathLogEv(mid,'redo','case',false,'');alert('没关系，已经帮你记进复盘：过两天它会出现在「本周复盘」里，再做一遍。');rerender();
  });
}
function refreshUnitBits(uid){
  var b=document.getElementById('evBadges');if(b)b.innerHTML=evBadgesHtml(uid);
  var u=PATH_BOOK.units[uid];if(!u)return;
  u.members.forEach(function(mid){
    var mk=document.getElementById('marks-'+mid);if(!mk)return;
    var ev=pEv()[mid]||{};
    mk.textContent=(ev.redo?' 重做✓':'')+(ev.apply?' 应用✓':'')+(ev.adv?' 综合✓':'');
  });
}
function memberMatchWrong(mname,w){
  var kp=w.knowledge_point||'';
  return kp&&(kp.indexOf(mname.slice(0,3))>=0||mname.indexOf(kp.slice(0,3))>=0);
}
function renderUnit(uid){
  var B=PATH_BOOK,u=B.units[uid];if(!u){PATHV.view='list';renderPathList();return}
  var ch=null;B.chapters.forEach(function(c){if(c.units.indexOf(uid)>=0)ch=c});
  var lv=pathLv(uid);
  var openMid=PATHV.openMid;
  if(!openMid){
    openMid=u.members[0];
    for(var i=0;i<u.members.length;i++){var e0=pEv()[u.members[i]]||{};if(!e0.apply){openMid=u.members[i];break}}
  }
  var h='<div class="card" style="padding:10px 16px"><button class="btn gray" id="uBack" style="width:auto;margin:0;padding:8px 14px">← 返回学习路径</button></div>';
  h+='<div class="card"><h3 style="margin:2px 0 4px">'+esc(u.name)+'</h3>'
    +'<p class="mut" style="margin:2px 0">'+esc(B.subject)+' · '+PATH_VER[PATH_SUBJ]+' · '+(ch?esc(ch.no)+' '+esc(ch.title)+' · ':'')+esc(u.secs)+' 节 · 课本第 '+u.pageFrom+' 页起</p>'
    +'<p style="margin:8px 0"><span class="mut">我目前处于：</span><select class="lvsel" id="uLvSel" style="max-width:130px">'+lvOptions(lv)+'</select></p>'
    +'<p id="evBadges" style="margin:4px 0">'+evBadgesHtml(uid)+'</p>'
    +'<p style="margin:8px 0 2px"><span class="mut">这一课包含：</span>'+u.members.map(function(m){return '<span class="chip2" data-gomember="'+m+'">'+esc(B.nodes[m].name)+'</span>'}).join('')+'</p></div>';
  if((u.preUnits&&u.preUnits.length)||(u.junior&&u.junior.length)){
    h+='<div class="card"><h4 style="margin:2px 0 6px">看不懂？先补这一课</h4><p style="margin:2px 0">';
    (u.preUnits||[]).forEach(function(p){h+='<span class="chip2" data-unit="'+p.id+'">'+esc(p.name)+'</span>'});
    (u.junior||[]).forEach(function(p){h+='<span class="chip2 jz">'+esc(p.stage)+' · '+esc(p.name)+'</span>'});
    h+='</p></div>';
  }
  if(u.video){
    var SELF_VIDEOS={'BV1UnJQzbEBm|1':{src:'/video/l1.mp4',vtt:'/video/l1.vtt',segs:[[0,'集合与元素：什么是集合'],[140,'空集'],[227,'属于/不属于 · 常用数集'],[563,'元素三性质：确定、互异、无序'],[940,'列举法与描述法'],[1548,'区间表示法']]},'BV1UnJQzbEBm|3':{src:'/video/l2.mp4',vtt:'/video/l2.vtt',segs:[[0,'子集与真子集：包含关系怎么记'],[310,'集合相等：互为子集'],[355,'关系填空练习：点集、字母、代表元素的坑'],[608,'交集：取公共部分'],[752,'并集：有的都收进来'],[832,'补集：先认全集，再取对立面'],[942,'高考题型例练：交并补三连']]},'BV1UnJQzbEBm|15':{src:'/video/l3.mp4',vtt:'/video/l3.vtt',segs:[[0,'先认四种关系：高考就这四个选项'],[100,'核心句：前是后的充分、后是前的必要'],[277,'充要：两个方向都能推'],[411,'例1：且与或的方向'],[501,'例2：先解不等式，数轴比大小'],[583,'例3：先化简再比对']]},'BV1UnJQzbEBm|21':{src:'/video/l4.mp4',vtt:'/video/l4.vtt',segs:[[0,'存在与任意：有就行 vs 都要满足'],[259,'命题的否定：量词翻面、结论否定'],[331,'范围不能改：2014 天津卷例题'],[397,'「且」变「或」：不都是 ≠ 都不是'],[645,'假命题先否定：转成恒成立求参数'],[763,'压轴赏析：2014 北京卷量词大题']]}};
    var sv=SELF_VIDEOS[u.video.bvid+'|'+u.video.p];
    h+='<div class="card"><h4 style="margin:2px 0 4px">老师讲解（预习、看懂阶段先看这个）</h4>';
    if(sv){
      h+='<div class="vidbox"><video controls playsinline preload="metadata" src="'+sv.src+'"><track kind="subtitles" label="中文字幕" srclang="zh" src="'+sv.vtt+'" default></video></div>'
        +'<p class="mut" style="margin:2px 0">本站自存版（720p，带字幕，进度随便拖）· 原视频：'+esc(u.video.from)+'《'+esc(u.video.t)+'》<a href="https://www.bilibili.com/video/'+u.video.bvid+'?p='+u.video.p+'" target="_blank" rel="noopener">在 B 站打开</a>。看视频时做下面的题，视频不会停、不会重头播。</p>';
      h+='<p style="margin:8px 0 2px"><b style="font-size:13.5px">倍速</b> '
        +[0.8,1,1.25,1.5,1.75].map(function(r){return '<span class="chip2'+(r===1?' on':'')+'" data-rate="'+r+'">'+r+'×</span>'}).join('')
        +'<span class="chip2" data-pip="1">浮窗</span></p>';
      if(sv.segs&&sv.segs.length){
        h+='<p style="margin:8px 0 2px"><b style="font-size:13.5px">分段直达（点一下，从那段开始看）</b></p><p style="margin:2px 0">';
        sv.segs.forEach(function(sg){var mm=String(Math.floor(sg[0]/60)),ss=('0'+(sg[0]%60)).slice(-2);h+='<span class="chip2" data-seek="'+sg[0]+'">'+mm+':'+ss+' '+esc(sg[1])+'</span>'});
        h+='</p>';
      }
    }else{
      h+='<div class="vidbox"><iframe src="https://player.bilibili.com/player.html?bvid='+u.video.bvid+'&page='+u.video.p+'&high_quality=1" allowfullscreen loading="lazy"></iframe></div>'
        +'<p class="mut" style="margin:2px 0">'+esc(u.video.from)+'《'+esc(u.video.t)+'》· 看视频时做下面的题，视频不会停、不会重头播。</p>';
    }
    if(u.video.vsum){
      if(u.video.vtop&&u.video.vtop.length){h+='<div class="vtop"><div class="vtopt">先看这三句</div>'+u.video.vtop.map(function(s){return '<p>'+esc(s)+'</p>'}).join('')+'</div>';}
      h+='<div class="vsumwrap"><div class="vsum" id="vsum">'+u.video.vsum.split('\n').map(function(p){var t=esc(p).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/==([^=]+)==/g,'<mark class="hl">$1</mark>');return p.indexOf('易错提醒')===0?'<p class="warn">'+t+'</p>':'<p>'+t+'</p>'}).join('')+'</div>'
        +'<button class="btn gray" id="vsumBtn" style="width:auto;padding:7px 14px;margin-top:6px">展开全部</button></div>'
        +'<p class="mut" style="margin:4px 0 0">'+(sv?'视频内容速览（按本课真实字幕整理，方便预习和复习时快速过一遍）':'视频内容速览（按本节课内容整理，方便预习和复习时快速过一遍）')+'</p>';
    }
    if(u.video.vtech&&u.video.vtech.length){
      h+='<div class="vtech"><p style="margin:12px 0 4px"><b>解题技巧（考试就靠这些手法拿分）</b></p>'
        +u.video.vtech.map(function(t,i){return '<p style="margin:3px 0;font-size:14.5px;line-height:1.7"><b>技巧'+(i+1)+' · '+esc(t[0])+'</b>：'+esc(t[1])+'</p>'}).join('')+'</div>';
    }
    if(u.video.vgaokao&&u.video.vgaokao.length){
      h+='<div class="vgaokao"><p style="margin:12px 0 4px"><b>高考真题（出处已核，答案已验算）</b></p>'
        +u.video.vgaokao.map(function(g){return '<p style="margin:3px 0;font-size:14.5px;line-height:1.7"><b>'+esc(g.src)+'</b>：'+esc(g.q)+'<br>'+esc(g.opts)+'<br><mark class="hl">答案 '+esc(g.ans)+'</mark>。'+esc(g.why)+'</p>'}).join('')+'</div>';
    }
    h+='</div>';
  }
  h+='<div class="card"><h4 style="margin:2px 0 6px">掌握标准（对着自查）</h4>';
  u.members.forEach(function(mid){
    var n=B.nodes[mid];
    if(n.criteria&&n.criteria.length){
      h+='<p style="margin:8px 0 2px"><b>'+esc(n.name)+'</b></p><ul style="margin:2px 0;padding-left:20px;line-height:1.8;font-size:14.5px">';
      n.criteria.forEach(function(x){h+='<li>'+esc(x)+'</li>'});
      h+='</ul>';
    }
  });
  h+='</div>';
  u.members.forEach(function(mid){
    var n=B.nodes[mid],c=n.content||null,ev=pEv()[mid]||{};
    h+='<details class="kpsec" id="sec-'+mid+'"'+(mid===openMid?' open':'')+(c&&c.apply&&c.apply.length?' data-applysec="1"':'')+(c&&c.advance?' data-advsec="1"':'')+'>'
      +'<summary>'+esc(n.sec)+' '+esc(n.name)+'<span class="mut" style="font-weight:400;font-size:12.5px" id="marks-'+mid+'">'+(ev.redo?' 重做✓':'')+(ev.apply?' 应用✓':'')+(ev.adv?' 综合✓':'')+'</span></summary><div class="kpsecbody">';
    if(n.diag){
      h+='<details class="diag"><summary>热身自测（先想一想，再点开看答案）</summary><p style="font-size:14.5px;line-height:1.7;margin:6px 0">'+esc(n.diag.question)+'</p><p class="mut" style="margin:2px 0">答案：'+esc(n.diag.answer)+'</p></details>';
    }
    h+='<p style="font-size:15px;line-height:1.75;margin:6px 0">'+esc(n.desc)+'</p>';
    if(c){
      h+='<p style="font-size:15px;line-height:1.85;margin:4px 0">'+esc(c.intro)+'</p>';
      (c.learn||[]).forEach(function(b){h+='<p style="font-size:15px;line-height:1.85;margin:8px 0"><b>'+esc(b.h)+'。</b>'+esc(b.p)+'</p>'});
      if(c.svg)h+='<figure class="kpfig">'+c.svg+'<div class="cap">'+esc(c.svgCap||'')+'</div></figure>';
      if(c.case)h+='<div class="casebox" id="case-'+mid+'">'+caseHtml(uid,mid)+'</div>';
      if(c.basics&&c.basics.length)h+='<h4 style="margin:14px 0 4px">基础练习（确认真的看懂了）</h4>'+pqHtml2(uid,mid,'b',c.basics);
      if(c.apply&&c.apply.length)h+='<h4 style="margin:14px 0 4px">应用题（做对任意一道，才能选「能应用」）</h4>'+pqHtml2(uid,mid,'a',c.apply);
      if(c.advance){
        h+='<h4 style="margin:14px 0 4px">综合题（做对才能选「综合应用」）</h4>';
        if(c.advance.kind==='mcq')h+=pqHtml2(uid,mid,'v',[c.advance]);
        else{
          h+='<p style="font-size:15.5px;line-height:1.75;margin:6px 0">'+esc(c.advance.q)+'</p>'
            +'<details class="diag"><summary>在草稿纸上做完后，点开看参考答案</summary><div class="caseans">'+esc(c.advance.a)+'</div></details>'
            +'<p style="margin:8px 0"><button class="btn" data-advok="'+mid+'" style="width:auto;padding:9px 16px">对照答案，我做对了</button></p>'
            +(ev.adv?'<p class="mut">综合题已通过，可以选「综合应用」了。</p>':'');
        }
      }
      if(c.pitfalls&&c.pitfalls.length){
        h+='<h4 style="margin:14px 0 4px">易错点</h4><ul style="margin:4px 0;padding-left:20px;line-height:1.8;font-size:14.5px">';
        c.pitfalls.forEach(function(x){h+='<li>'+esc(x)+'</li>'});
        h+='</ul>';
      }
    }else{
      h+='<p style="margin:2px 0;line-height:1.8">这个知识点的图文精讲还在打磨中。先看上面的老师讲解视频和课本，再对着「掌握标准」自查。</p>';
    }
    h+='</div></details>';
  });
  var rel=[],seenW={};
  u.members.forEach(function(mid){
    var n=B.nodes[mid];
    (D.wrong||[]).forEach(function(w){
      if(w.subject==='数学'&&!seenW[w.key]&&memberMatchWrong(n.name,w)){seenW[w.key]=1;rel.push(w)}
    });
  });
  rel=rel.slice(0,4);
  if(rel.length){
    h+='<div class="card"><h4 style="margin:2px 0 4px">你在月考里错过的相关题（点一下直接跳过去重做）</h4>';
    rel.forEach(function(w){h+='<div class="wrongrow" data-wkey="'+esc(w.key||'')+'">第 '+esc(w.question_no)+' 题 · '+esc(w.knowledge_point)+' · 得 '+esc(w.got_score)+'/'+esc(w.full_score)+' 分 <span style="color:#2563eb">→ 去重做</span></div>'});
    h+='</div>';
  }
  h+='<div class="card"><h4 style="margin:2px 0 8px">学完这一课，往哪走</h4><div class="navrow">';
  if(u.prevU)h+='<button class="btn gray" data-unit="'+u.prevU.id+'">← 课本上一课<br><span style="font-size:13px">'+esc(u.prevU.name)+'</span></button>';
  if(u.nextU)h+='<button class="btn" data-unit="'+u.nextU.id+'">课本下一课 →<br><span style="font-size:13px">'+esc(u.nextU.name)+'</span></button>';
  h+='</div>';
  var deep=(u.nextUnits||[]).filter(function(x){return !u.nextU||x.id!==u.nextU.id});
  if(deep.length){
    h+='<p style="margin:10px 0 4px"><b>想深入：沿知识路径往下走</b>（学完这一课才学得动它们）</p><p style="margin:2px 0">';
    deep.forEach(function(x){h+='<span class="chip2 nx" data-unit="'+x.id+'">'+esc(x.name)+'</span>'});
    h+='</p>';
  }
  h+='</div>';
  app.innerHTML=h;bindUnit(uid);afterNav();
}
function bindUnit(uid){
  var back=document.getElementById('uBack');if(back)back.addEventListener('click',function(){PATHV.view='list';renderPath();window.scrollTo(0,0)});
  var sel=document.getElementById('uLvSel');if(sel)sel.addEventListener('change',function(){pathSetStatus(uid,parseInt(sel.value,10),sel)});
  var vb=document.getElementById('vsumBtn');if(vb)vb.addEventListener('click',function(){var v=document.getElementById('vsum');var open=v.classList.toggle('open');vb.textContent=open?'收起':'展开全部'});
  app.querySelectorAll('[data-unit]').forEach(function(el){el.addEventListener('click',function(){openUnit(el.getAttribute('data-unit'),null)})});
  app.querySelectorAll('[data-gomember]').forEach(function(el){el.addEventListener('click',function(){
    var mid=el.getAttribute('data-gomember'),sec=document.getElementById('sec-'+mid);
    if(sec){sec.open=true;sec.scrollIntoView({behavior:'smooth'})}
  })});
  app.querySelectorAll('[data-wkey]').forEach(function(el){el.addEventListener('click',function(){jumpToWrong(el.getAttribute('data-wkey'))})});
  app.querySelectorAll('[data-seek]').forEach(function(el){el.addEventListener('click',function(){
    var v=document.querySelector('.vidbox video');if(!v)return;
    v.currentTime=parseFloat(el.getAttribute('data-seek'));var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});
  })});
  app.querySelectorAll('[data-rate]').forEach(function(el){el.addEventListener('click',function(){
    var v=document.querySelector('.vidbox video');if(!v)return;
    v.playbackRate=parseFloat(el.getAttribute('data-rate'));
    app.querySelectorAll('[data-rate]').forEach(function(x){x.classList.remove('on')});
    el.classList.add('on');
  })});
  app.querySelectorAll('[data-pip]').forEach(function(el){el.addEventListener('click',function(){
    var v=document.querySelector('.vidbox video');if(!v)return;
    try{
      if(document.pictureInPictureElement){document.exitPictureInPicture();}
      else if(v.requestPictureInPicture){v.requestPictureInPicture();}
      else if(v.webkitSetPresentationMode){v.webkitSetPresentationMode(v.webkitPresentationMode==='picture-in-picture'?'inline':'picture-in-picture');}
      else{alert('这个浏览器不支持浮窗，可以用全屏看。')}
    }catch(e){alert('浮窗没打开，先点一下播放再试试。')}
  })});
  app.querySelectorAll('[data-advok]').forEach(function(b){b.addEventListener('click',function(){
    var mid=b.getAttribute('data-advok');markEv(uid,mid,'adv');pathLogEv(mid,'quiz','adv',true,'self');
    alert('综合题通过，现在可以把状态选成「综合应用」了。');refreshUnitBits(uid);
  })});
  app.querySelectorAll('[data-pq]').forEach(function(b){b.addEventListener('click',function(){
    var key=b.getAttribute('data-pq'),oi=parseInt(b.getAttribute('data-oi'),10);
    if(PATHV.ans[key]!==undefined)return;
    PATHV.ans[key]=oi;
    var parts=key.split('|'),mid=parts[0],g=parts[1].charAt(0),ix=parseInt(parts[1].slice(1),10);
    var n=PATH_BOOK.nodes[mid],c=n.content||{},item=null;
    if(g==='b')item=(c.basics||[])[ix];else if(g==='a')item=(c.apply||[])[ix];else if(g==='v')item=c.advance;
    if(!item)return;
    var ok=oi===item.ans;
    var box=document.getElementById('pq-'+mid+'-'+parts[1]);
    if(box){
      box.querySelectorAll('[data-pq]').forEach(function(x){
        var xoi=parseInt(x.getAttribute('data-oi'),10);
        if(xoi===item.ans)x.classList.add('ok');else if(xoi===oi)x.classList.add('bad');
      });
      var ex=document.createElement('div');ex.className='explain';
      ex.textContent=(ok?'答对了。':'答错了，正确答案 '+'ABCD'[item.ans]+'。')+'\n\n'+(item.why||'');
      box.appendChild(ex);
    }
    pathLogEv(mid,'quiz',parts[1],ok,'');
    if(ok&&(g==='a'||g==='v')){
      markEv(uid,mid,g==='a'?'apply':'adv');refreshUnitBits(uid);
    }
  })});
  PATH_BOOK.units[uid].members.forEach(function(mid){
    var n=PATH_BOOK.nodes[mid];
    if(n.content&&n.content.case)bindCase(uid,mid);
  });
}
function findPathUnit(kp){
  if(!kp)return null;
  var B=PATH_BOOK,found=null;
  B.order.forEach(function(uid){
    if(found)return;
    var u=B.units[uid];
    for(var i=0;i<u.members.length;i++){if(memberMatchWrong(B.nodes[u.members[i]].name,{knowledge_point:kp})){found=uid;break}}
  });
  return found;
}
