// 数据包完整性校验：加载 github/path-*.js，逐科核结构、内容九键、答案下标、引用完整性。
const fs = require('fs');
const GH = process.env.HOME + '/workspace/study/github/';
const files = { math: 'path.js', phy: 'path-phy.js', chem: 'path-chem.js', eng: 'path-eng.js', hist: 'path-hist.js', geo: 'path-geo.js' };
const vars = { math: 'PATH_BOOK', phy: 'PATH_BOOK_PHY', chem: 'PATH_BOOK_CHEM', eng: 'PATH_BOOK_ENG', hist: 'PATH_BOOK_HIST', geo: 'PATH_BOOK_GEO' };
let fail = 0;
const err = m => { fail++; console.log('  FAIL', m); };

for (const [k, f] of Object.entries(files)) {
  const code = fs.readFileSync(GH + f, 'utf-8');
  const ctx = { window: {} };
  const packs = [];
  ctx.window.SELF_VIDEO_PACKS = packs;
  new Function('window', 'SELF_VIDEO_PACKS', code + ';window.__book=' + vars[k] + ';')(ctx.window, packs);
  if (k === 'math') { console.log('math: legacy book (different content conventions), counts only — skipped deep checks'); continue; }
  const b = ctx.window.__book;
  console.log(k, '| chapters:', b.chapters.map(c => c.no + ':' + c.title).join(' / '),
    '| units:', Object.keys(b.units).length, '| nodes:', Object.keys(b.nodes).length, '| order:', b.order.length);
  if (b.order.length !== Object.keys(b.units).length) err(k + ' order != units count');
  const seenOrder = new Set(b.order);
  for (const uid of Object.keys(b.units)) if (!seenOrder.has(uid)) err(k + ' unit not in order: ' + uid);
  for (const c of b.chapters) for (const uid of c.units) if (!b.units[uid]) err(k + ' chapter refs missing unit ' + uid);
  for (const [uid, u] of Object.entries(b.units)) {
    for (const m of u.members) {
      if (!b.nodes[m]) err(k + ' member missing node ' + m);
      if (b.nodeUnit[m] !== uid) err(k + ' nodeUnit mismatch ' + m);
    }
    if (u.video && u.video.vsum !== undefined && typeof u.video.vsum !== 'string') err(k + ' vsum not string ' + uid);
  }
  const KEYS = ['advance', 'apply', 'basics', 'case', 'intro', 'learn', 'pitfalls', 'svg', 'svgCap'];
  for (const [nid, n] of Object.entries(b.nodes)) {
    if (!n.content) { err(k + ' node no content ' + nid); continue; }
    for (const key of KEYS) if (!(key in n.content)) err(k + ' ' + nid + ' content missing ' + key);
    for (const grp of ['basics', 'apply']) for (const q of (n.content[grp] || [])) {
      if (!(q.ans >= 0 && q.ans < q.opts.length)) err(k + ' ' + nid + ' ' + grp + ' ans out of range');
    }
    if (!Array.isArray(n.content.learn) || !n.content.learn.length) err(k + ' ' + nid + ' learn empty');
    for (const pre of (n.pre || [])) {
      const pid = typeof pre === 'string' ? pre : pre.id;
      if (!b.nodes[pid] && !/^(jr_|chem_|phy_|eng_|hist_|geo_)/.test(pid)) err(k + ' ' + nid + ' pre unknown ' + pid);
      if (!b.nodes[pid] && !pid.startsWith('jr_')) err(k + ' ' + nid + ' pre not in book: ' + pid);
    }
  }
}
console.log(fail ? ('TOTAL FAILURES: ' + fail) : 'ALL STRUCTURE CHECKS PASS');
process.exit(fail ? 1 : 0);
