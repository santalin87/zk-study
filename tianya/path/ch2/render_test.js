// jsdom 功能实测：加载真实 index.html 内联脚本 + 全部数据包，逐科切换并打开第二章课页、展开节点。
const fs = require('fs');
const { JSDOM } = require('/tmp/domtest/node_modules/jsdom');
const GH = process.env.HOME + '/workspace/study/github/';
const html = fs.readFileSync(GH + 'index.html', 'utf-8');

const vc = new (require('/tmp/domtest/node_modules/jsdom').VirtualConsole)();
const errors = [];
vc.on('jsdomError', e => { const m = String(e.detail && e.detail.message || e.message); if (!/not implemented|Could not load|media/i.test(m)) errors.push(m); });
vc.on('error', m => errors.push(String(m)));

const dom = new JSDOM(html, { url: 'https://20110419.xyz/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.fetch = () => Promise.reject(new Error('offline-stub'));
w.LA = new Proxy({}, { get: () => () => {} }); // 51.la 统计 SDK 占位（生产环境由 CDN 提供）
w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
w.HTMLMediaElement.prototype.pause = function () {};
w.scrollTo = () => {};

// 全部 script 按文档顺序执行：src 的读本地同名文件，内联的直接 eval（与浏览器加载顺序一致）
const tagRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let m;
while ((m = tagRe.exec(html))) {
  const srcM = m[1].match(/src="([^"]+)"/);
  try {
    if (srcM) {
      const base = srcM[1].split('?')[0].split('/').pop();
      if (fs.existsSync(GH + base)) w.eval(fs.readFileSync(GH + base, 'utf-8'));
    } else if (m[2].trim()) w.eval(m[2]);
  } catch (e) { errors.push('script eval: ' + e.message); }
}

const doc = w.document;
let fail = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fail++; };

ok(typeof w.setPathSubj === 'function' && typeof w.renderPath === 'function' && typeof w.openUnit === 'function', 'shell functions present');

const subjUnits = {
  math: null, // 只回归：列表能渲染
  phy: ['u_phy2_1', 'u_phy2_2', 'u_phy2_3', 'u_phy2_4'],
  chem: ['u_chem_8', 'u_chem_11', 'u_chem_14'],
  eng: ['u_eng_3'],
  hist: ['u_hist_5', 'u_hist_7', 'u_hist_3', 'u_hist_4'],
  geo: ['u_geo_6', 'u_geo_7', 'u_geo_8'],
};
const bookOf = {};
for (const e of (w.SUBJ_BOOKS || [])) bookOf[e.key] = e.book;
ok(Object.keys(bookOf).length === 6, 'SUBJ_BOOKS has 6 subjects: ' + Object.keys(bookOf).join(','));

for (const [subj, units] of Object.entries(subjUnits)) {
  try { w.setPathSubj(subj); } catch (e) { ok(false, subj + ' setPathSubj threw: ' + e.message); continue; }
  const listHtml = doc.body.innerHTML;
  const book = bookOf[subj];
  const lastChapter = book.chapters[book.chapters.length - 1];
  ok(listHtml.includes(lastChapter.title) || units === null, subj + ' list shows last chapter title: ' + lastChapter.title);
  if (units) for (const uid of units) {
    const uname = book.units[uid].name;
    ok(listHtml.includes(uname), subj + ' list contains unit ' + uname);
    try { w.openUnit(uid); } catch (e) { ok(false, subj + ' openUnit ' + uid + ' threw: ' + e.message); continue; }
    const uh = doc.body.innerHTML;
    const firstNode = book.nodes[book.units[uid].members[0]];
    ok(uh.includes(firstNode.name), subj + ' unit page shows node ' + firstNode.name);
    ok(uh.includes('先看这三句') || !book.units[uid].video, subj + ' unit page ' + uid + ' vtop block (or no-video unit)');
  }
}
// 回归：切回数学、物理第一章课名仍在
w.setPathSubj('math');
ok(doc.body.innerHTML.includes('集合与常用逻辑用语'), 'math regression list ok');
w.setPathSubj('phy');
ok(doc.body.innerHTML.includes('运动、质点与参考系'), 'phy ch1 regression ok');

const realErrors = errors.filter(e => !/offline-stub|Failed to load|net::|resource/i.test(e));
console.log('page errors (filtered):', realErrors.slice(0, 5));
console.log(fail ? ('RENDER TEST FAILURES: ' + fail) : 'ALL RENDER TESTS PASS');
process.exit(fail ? 1 : 0);
