#!/usr/bin/env python3
"""重排月考错题复习页 V2：只改呈现与结构，数据与跳转逻辑原样保留。
输入：monthly1-review.v1.html（V1 原稿）
输出：monthly1-review.html（V2）
改动：
  1. <style> 整块换成站内 SPA 设计规范（配色/字体/卡片/导航/分段控件/进度条，手机优先 + @media 1024px）
  2. 页头换成站内蓝头 + “回学习站”链接；用法说明重写（讲清三种标签 + “不用看视频”备注，保留“看完一题，点右上角 ✕ 关掉”原句）
  3. 增加：进度卡片（总进度条）、科目跳转 chips（带 x/y 进度）、筛选 seg（全部/待看/已看完）、每题“✓看完”打勾（localStorage 存本机）
  4. 科目 <section> 改为站内 .kpsec 折叠块（默认展开，summary 带 x/y 进度）
  5. 唯一的 .tag.novid（橙虚线）改为 .note 备注块（文字内容逐字保留），与灰色 gap 彻底区分
  6. 播放器 modal 与跳转脚本逐字保留；新增脚本只负责打勾/进度/筛选/跳转，不碰播放逻辑
"""
import re

SRC = '/home/hatch/workspace/study/review/monthly1-review.v1.html'
DST = '/home/hatch/workspace/study/review/monthly1-review.html'

html = open(SRC, encoding='utf-8').read()
lines = html.split('\n')
assert len(lines) == 70, len(lines)

# 定位：样式行、body 行、结尾行（动态定位，不硬编码下标）
style_end = next(i for i, l in enumerate(lines) if l.startswith('</style>'))
assert lines[style_end].startswith('</style></head><body><header>'), lines[style_end][:60]
tail_idx = next(i for i, l in enumerate(lines) if '</body></html>' in l)
assert lines[tail_idx].strip() == '</script></body></html>', lines[tail_idx]
# 播放脚本：lines 中 '<script>' 之后、tail 之前
script_open = next(i for i, l in enumerate(lines) if l.strip() == '<script>')
assert script_open < tail_idx

# ---------- 1. 新样式：站内 SPA 设计规范，手机优先 ----------
NEW_CSS = """*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:#f3f4f6;color:#111827;line-height:1.6}
header{background:#2563eb;color:#fff;padding:14px 16px}
header .hdr-in{max-width:720px;margin:0 auto}
header a.back{color:#fff;font-size:14px}
header h1{margin:6px 0 0;font-size:19px}
header p{margin:2px 0 0;font-size:12px;opacity:.85}
main{padding:12px;max-width:720px;margin:0 auto}
.card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.card p{margin:4px 0}
.mut{color:#6b7280;font-size:14px}
.jumpbar{position:sticky;top:0;z-index:30;background:#f3f4f6;padding:8px 0 4px}
.chips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;-webkit-overflow-scrolling:touch}
.chip{flex:0 0 auto;padding:7px 13px;border:1px solid #d1d5db;background:#fff;border-radius:999px;font-size:14px;cursor:pointer;white-space:nowrap}
.chip .c{color:#2563eb;font-weight:600}
.seg{display:flex;background:#e5e7eb;border-radius:10px;padding:3px;margin:4px 0 8px}
.seg button{flex:1;padding:9px;border:0;border-radius:8px;background:transparent;font-size:15px;cursor:pointer;color:#374151}
.seg button.on{background:#fff;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12);color:#111827}
.pbar{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:8px 0}
.pbar i{display:block;height:100%;background:#2563eb}
.kpsec{border:1px solid #e5e7eb;border-radius:12px;margin:10px 0;background:#fff;scroll-margin-top:120px}
.kpsec>summary{padding:13px 14px;font-weight:600;font-size:15.5px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.kpsec>summary::-webkit-details-marker{display:none}
.kpsecbody{padding:0 14px 12px}
.sub{font-size:12px;color:#6b7280;margin:0 0 8px}
.q{border-top:1px solid #eef1f5;padding:10px 0}
.q:first-of-type{border-top:none}
.q.done{opacity:.55}
.qhead{display:flex;align-items:center;gap:8px;font-size:14px;flex-wrap:wrap}
.qhead b{font-size:15px}
.qhead .sp{flex:1}
.score{color:#dc2626;font-weight:700}
.etype{color:#6b7280;font-size:12px}
.donelbl{font-size:13px;color:#6b7280;white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:4px}
.donelbl input{width:20px;height:20px;accent-color:#2563eb;margin:0}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.tag{display:block;text-align:left;background:#f0fdf4;border:1px solid #16a34a;border-radius:10px;padding:8px 10px;font-size:14px;color:#14532d;cursor:pointer;min-height:44px}
.tag.whole{background:#eff6ff;border-color:#2563eb;color:#1d4ed8}
.tag-sub{display:block;font-size:12px;opacity:.85;margin-top:2px}
.tag.gap{background:#f3f4f6;border:1px dashed #9ca3af;color:#6b7280;cursor:default}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:14px;line-height:1.7;margin-top:8px}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#fef3c7;color:#92400e;margin:2px 4px 2px 0}
.gaplist li{margin:6px 0;font-size:14px}
.gaplist .why{color:#6b7280;font-size:12px}
.pend li{margin:6px 0;font-size:14px}
footer{padding:0 16px 30px;font-size:12px;color:#9ca3af}
/* 播放器弹窗（V1 原样） */
#modal{position:fixed;inset:0;background:rgba(0,0,0,.82);display:none;z-index:99;align-items:flex-start;justify-content:center;padding:12px}
#modal.open{display:flex}
.player{width:100%;max-width:720px;background:#000;border-radius:12px;overflow:hidden;margin-top:8vh}
.player .bar{display:flex;align-items:center;gap:8px;background:#111;color:#fff;padding:8px 10px;font-size:13px}
.player .bar .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.player .bar button{background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;font-size:14px}
.player video,.player iframe{display:block;width:100%;aspect-ratio:16/9;background:#000;border:0}
.pseg{color:#ccc;font-size:12px;padding:8px 10px;background:#111}
.opennew{display:block;text-align:center;color:#9ecbff;font-size:12px;padding:6px;background:#111}
@media (min-width:1024px){
main{max-width:860px}
header .hdr-in{max-width:860px}
header h1{font-size:21px}
.card{padding:22px}
}"""

# 注意：V1 样式里 .seg 同时被播放器分段条复用（.seg{color:#ccc...}），与站内分段控件 .seg 冲突。
# 处理：播放器分段条改名 .pseg（modal 里的 <div class="seg" id="pseg"> 同步改名），筛选控件独占 .seg。

# 替换样式：lines[1..style_end-1] 是旧样式行，lines[style_end] 以 </style> 开头
new_lines = [lines[0], NEW_CSS] + lines[style_end:]
body_idx = 1  # new_lines[1] 是 NEW_CSS，new_lines[2] 是原 style_end 行
body = new_lines[2]
assert body.startswith('</style></head><body><header>')

# 播放器分段条改名，避免与筛选 .seg 冲突
body = body.replace('<div class="seg" id="pseg">', '<div class="pseg" id="pseg">', 1)

# ---------- 2. 页头：站内蓝头 + 回站链接 ----------
old_header = re.search(r'<header>.*?</header>', body).group(0)
new_header = ('<header><div class="hdr-in"><a class="back" href="/">‹ 回学习站</a>'
              '<h1>第一次月考错题复习</h1>'
              '<p>林天娅 · 高一上第一次月考（2026-10-19）· 宁德市高级中学</p></div></header>')
body = body.replace(old_header, new_header, 1)

# ---------- 3. 用法说明：重写，讲清三种标签 + “不用看视频”，保留 ✕ 原句 ----------
old_howto = re.search(r'<div class="howto">.*?</div>', body, re.S).group(0)
new_howto = ('<div class="card"><b>怎么用：</b>点<span style="color:#16a34a;font-weight:700">绿色标签</span>，'
             '直接跳到视频里讲这个知识点的那一分钟，不用从头看；'
             '<span style="color:#2563eb;font-weight:700">蓝色标签</span>是“整课重看”，这节课没有分到秒，只能从头看；'
             '<span style="color:#6b7280;font-weight:700">灰色标签</span>是站内暂时没有讲这个知识点的视频，先记下来，等补了视频再看。'
             '黄色备注“不用看视频”是这题本身不用看（比如算错数，方法是对的）——它不是缺视频，别跟灰色弄混。'
             '看完一题，点右上角 ✕ 关掉，继续下一题。'
             '下面每题右上角点“✓看完”打勾，进度存在这台手机上；上面按科目跳、按“待看 / 已看完”筛，一科一科过。</div>')
body = body.replace(old_howto, new_howto, 1)

# ---------- 4. 进度卡片 + 科目跳转 + 筛选（插在 <main> 之后） ----------
sections = re.findall(r'<section>(.*?)</section>', body, re.S)
assert len(sections) == 11, len(sections)
subjects = []
for s in sections[:9]:
    name = re.search(r'<h2>(.*?)</h2>', s).group(1)
    nq = len(re.findall(r'<div class="q">', s))
    subjects.append((name, nq))
assert sum(n for _, n in subjects) == 120, subjects

chips_html = ''.join(
    f'<button class="chip" data-sec="sec{i}">{name} <span class="c" id="chip-sec{i}">0/{n}</span></button>'
    for i, (name, n) in enumerate(subjects))
top_html = (
    '<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline">'
    '<b>复习进度</b><span class="mut" id="progText">已看完 0 / 120 题</span></div>'
    '<div class="pbar"><i id="progBar" style="width:0%"></i></div>'
    '<p class="mut">带时间点 68 · 整课重看 45 · 站内暂无视频 29 · 不用看视频 1 · 待题干 20 道</p></div>'
    f'<div class="jumpbar"><div class="chips" id="chips">{chips_html}</div>'
    '<div class="seg" id="filterSeg"><button data-f="all" class="on">全部</button>'
    '<button data-f="todo">待看</button><button data-f="done">已看完</button></div></div>')
body = body.replace('<main>', '<main>' + top_html, 1)

# ---------- 5. 科目 section -> .kpsec 折叠块；每题加 data-qid + 打勾 ----------
sec_pat = re.compile(r'<section>(.*?)</section>', re.S)
out_parts = []
pos = 0
sec_idx = 0
for m in sec_pat.finditer(body):
    out_parts.append(body[pos:m.start()])
    inner = m.group(1)
    name_m = re.search(r'<h2>(.*?)</h2>', inner)
    if name_m and sec_idx < 9:
        name = name_m.group(1)
        def add_qid(qm, name=name):
            q = qm.group(0)
            b = re.search(r'<div class="qhead"><b>(.*?)</b>', q)
            qno = b.group(1) if b else '?'
            qid = f'{name}|{qno}'
            q = q.replace('<div class="q">', f'<div class="q" data-qid="{qid}">', 1)
            q = re.sub(r'(<div class="qhead">.*?)</div>',
                       r'\1<span class="sp"></span><label class="donelbl"><input type="checkbox" data-done="' + qid + '"> ✓看完</label></div>',
                       q, count=1, flags=re.S)
            return q
        inner = re.sub(r'<div class="q">.*?(?=<div class="q">|$)', add_qid, inner, flags=re.S)
        # novid span -> note 备注块（仅 1 处，文字逐字保留）
        def novid_to_note(nm):
            span = nm.group(0)
            title = re.search(r'title="([^"]*)"', span).group(1)
            text = re.search(r'>(.*?)<span class="tag-sub">', span, re.S).group(1)
            return (f'<div class="note"><b>不用看视频：</b>{text}'
                    f'<span class="mut">（{title}）</span></div>')
        inner = re.sub(r'<span class="tag novid"[^>]*>.*?<span class="tag-sub">.*?</span></span>', novid_to_note, inner, flags=re.S)
        sub_m = re.search(r'<p class="sub">.*?</p>', inner, re.S)
        sub_html = sub_m.group(0) if sub_m else ''
        inner_wo = re.sub(r'<h2>.*?</h2>', '', inner, count=1)
        inner_wo = re.sub(r'<p class="sub">.*?</p>', '', inner_wo, count=1, flags=re.S)
        new_sec = (f'<details class="kpsec subj" id="sec{sec_idx}" open>'
                   f'<summary><span>{name}</span><span class="mut" id="sum-sec{sec_idx}" style="font-weight:400">0/{subjects[sec_idx][1]} 已看完</span></summary>'
                   f'<div class="kpsecbody">{sub_html}{inner_wo}</div></details>')
        out_parts.append(new_sec)
        sec_idx += 1
    else:
        h2 = name_m.group(1) if name_m else ''
        inner_wo = re.sub(r'<h2>.*?</h2>', '', inner, count=1)
        out_parts.append(f'<details class="kpsec" open><summary><span>{h2}</span></summary>'
                         f'<div class="kpsecbody">{inner_wo}</div></details>')
    pos = m.end()
out_parts.append(body[pos:])
body = ''.join(out_parts)
assert sec_idx == 9, sec_idx

new_lines[2] = body

# ---------- 6. 新增脚本：打勾/进度/筛选/科目跳转（附在播放脚本之后，不动播放逻辑） ----------
NEW_SCRIPT = """<script>
(function(){
var KEY='ty_review_done_v1';
var done={}; try{done=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){done={}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(done))}catch(e){}}
function qs(){return document.querySelectorAll('.q[data-qid]')}
function update(){
  var total=0,nd=0,per={};
  qs().forEach(function(q){
    var id=q.getAttribute('data-qid'),d=!!done[id];
    total++;
    var sec=q.closest('details'),sid=sec?sec.id:null;
    if(sid){per[sid]=per[sid]||{t:0,d:0};per[sid].t++;if(d)per[sid].d++;}
    q.classList.toggle('done',d);
    var cb=q.querySelector('input[data-done]');if(cb)cb.checked=d;
    if(d)nd++;
  });
  var pt=document.getElementById('progText');if(pt)pt.textContent='已看完 '+nd+' / '+total+' 题';
  var pb=document.getElementById('progBar');if(pb)pb.style.width=(total?Math.round(nd/total*100):0)+'%';
  Object.keys(per).forEach(function(sid){
    var c=document.getElementById('chip-'+sid),s=document.getElementById('sum-'+sid);
    if(c)c.textContent=per[sid].d+'/'+per[sid].t;
    if(s)s.textContent=per[sid].d+'/'+per[sid].t+' 已看完';
  });
}
var curF='all';
function applyFilter(){
  qs().forEach(function(q){
    var d=!!done[q.getAttribute('data-qid')];
    q.style.display=(curF==='all'||(curF==='todo'&&!d)||(curF==='done'&&d))?'':'none';
  });
  document.querySelectorAll('details.kpsec.subj').forEach(function(sec){
    var any=false;
    sec.querySelectorAll('.q').forEach(function(q){if(q.style.display!=='none')any=true;});
    sec.style.display=any?'':'none';
    if(curF!=='all')sec.open=true;
  });
}
document.addEventListener('change',function(e){
  var cb=e.target.closest?e.target.closest('input[data-done]'):null;if(!cb)return;
  var id=cb.getAttribute('data-done');
  if(cb.checked)done[id]=1;else delete done[id];
  save();update();applyFilter();
});
var fs=document.getElementById('filterSeg');
if(fs)fs.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('button[data-f]'):null;if(!b)return;
  curF=b.getAttribute('data-f');
  fs.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});
  applyFilter();
});
var ch=document.getElementById('chips');
if(ch)ch.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('button[data-sec]'):null;if(!b)return;
  if(curF!=='all'){curF='all';
    fs.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-f')==='all')});
    applyFilter();}
  var sec=document.getElementById(b.getAttribute('data-sec'));if(!sec)return;
  sec.open=true;sec.scrollIntoView();
});
update();
})();
</script>"""

# 插入新脚本：放在原播放脚本闭合之后、</body> 之前（不能插进 <script>…</script> 内部）
tail_new_idx = next(i for i, l in enumerate(new_lines) if '</body></html>' in l)
tail_line = new_lines[tail_new_idx]
assert tail_line.strip() == '</script></body></html>', tail_line
new_lines[tail_new_idx] = '</script>\n' + NEW_SCRIPT + '\n</body></html>'

out = '\n'.join(new_lines)
open(DST, 'w', encoding='utf-8').write(out)
print('written', len(out), 'bytes')
