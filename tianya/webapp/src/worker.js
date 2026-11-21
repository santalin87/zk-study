'use strict';
/* 天娅的学习小站 tianya-study — 单文件 Worker（API + 页面）
   约定：所有 SQL 用参数绑定；所有动态 HTML 输出经 esc() 转义。 */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const normWide = (s) => String(s ?? '').replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
const norm = (s) => normWide(s).replace(/\s+/g, '');
/* 答案可能是 JSON 数组字符串（填空多空），解析成数组 */
function parseAns(a) {
  if (Array.isArray(a)) return a.map(String);
  const t = String(a ?? '').trim();
  if (t.startsWith('[')) {
    try { const v = JSON.parse(t); if (Array.isArray(v)) return v.map(String); } catch (e) {}
  }
  return [t];
}
/* 填空/实验/计算：按空给分；支持 || 备选答案；方程式走专用判分 */
const isEqAns = (s) => /【条件/.test(String(s)) || (/=/.test(String(s)) && /\+/.test(String(s)));
/* 化学方程式规范形：条件可写在式中任意位置（=点燃= 或 点燃均可），↑↓ 漏写也算对 */
const canonEq = (s) => norm(s).replace(/[=＝→⇒]+/g, '=');
function gradeEq(std, user) {
  const parts = splitCond(std);
  let u = norm(user);
  if (!u) return { ok: 0, hasCond: false, loose: false };
  let hasCond = false;
  if (parts.cond) {
    const cn = norm(parts.cond);
    if (u.includes(cn)) { hasCond = true; u = u.split(cn).join(''); }
  }
  u = canonEq(u);
  const c = canonEq(parts.core);
  if (u === c) return { ok: 1, hasCond, loose: false };
  if (stripSym(u) === stripSym(c)) return { ok: 1, hasCond, loose: true };
  return { ok: 0, hasCond, loose: false };
}
function gradeOneBlank(std, user) {
  const u = norm(user);
  if (!u) return 0;
  const alts = String(std ?? '').split('||');
  for (const a of alts) {
    if (isEqAns(a)) { if (gradeEq(a, user).ok) return 1; }
    else if (u === norm(a)) return 1;
  }
  return 0;
}
function gradeBlanks(ansArr, userArr) {
  const ua = Array.isArray(userArr) ? userArr.map((x) => String(x ?? '')) : [String(userArr ?? '')];
  const detail = ansArr.map((a, i) => gradeOneBlank(a, ua[i] || ''));
  const hit = detail.reduce((s, x) => s + x, 0);
  return { frac: ansArr.length ? hit / ansArr.length : 0, detail };
}
const stripSym = (s) => String(s ?? '').replace(/[↑↓]/g, '');
/* 化学方程式答案里的【条件：X】拆出来单独检查（用 unicode 转义避开字面括号） */
function splitCond(a) {
  const s = String(a ?? '');
  const m = s.match(/[\u3010]\u6761\u4ef6\uff1a([^\u3011]+)[\u3011]/);
  return { cond: m ? m[1].trim() : '', core: s.replace(/[\u3010]\u6761\u4ef6\uff1a[^\u3011]*[\u3011]/g, '') };
}
const json = (obj, status) => new Response(JSON.stringify(obj), {
  status: status || 200,
  headers: { 'content-type': 'application/json; charset=utf-8' },
});
const html = (s) => new Response(s, {
  headers: { 'content-type': 'text/html; charset=utf-8' },
});

/* 多选答案归一化：兼容 "CD"、"C,D"、["C","D"]、'["C","D"]' */
function normLetters(v) {
  let arr;
  if (Array.isArray(v)) {
    arr = v;
  } else {
    const t = String(v ?? '').trim();
    if (t.startsWith('[')) {
      try { arr = JSON.parse(t); } catch (e) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
    } else if (/[,]/.test(t)) {
      arr = t.split(',');
    } else {
      arr = t.replace(/[^A-Za-z]/g, '').split('');
    }
  }
  return arr.map((x) => String(x).trim().toUpperCase())
    .filter((x) => /^[A-Z]$/.test(x)).sort().join('');
}

function grade(type, answer, userAnswer) {
  if (type === 'single') {
    return norm(userAnswer).toUpperCase() === norm(answer).toUpperCase() ? 1 : 0;
  }
  if (type === 'multi') {
    const a = normLetters(answer);
    const u = normLetters(userAnswer);
    return a !== '' && a === u ? 1 : 0;
  }
  return 0; /* fill/exp/calc/solve 走 check 内的专用逻辑 */
}

async function readBody(req) {
  try { return await req.json(); } catch (e) { return {}; }
}

/* ---------------- API ---------------- */
const ROOT_CAUSE_VERSION = 1; // 病根文字改了就 +1
async function apiScores(env) {
  const r = await env.DB.prepare('SELECT subject, score, full FROM scores').all();
  const list = r.results || [];
  // 版本 = 分数拼接 hash + 病根版本，任一变了首页就弹一次
  let h = 0;
  const s = JSON.stringify(list.map(function(x){return [x.subject,x.score,x.full]}));
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return json({ scores: list, version: 'v' + (h >>> 0).toString(36) + 'r' + ROOT_CAUSE_VERSION });
}

async function apiPracticeSubjects(env) {
  const r = await env.DB.prepare(
    'SELECT subject, COUNT(*) AS count FROM questions GROUP BY subject'
  ).all();
  return json(r.results || []);
}

async function apiPracticeQuestions(env, subject) {
  if (!subject) return json({ error: '缺少 subject 参数' }, 400);
  const r = await env.DB.prepare(
    'SELECT id, type, stem, options, answer, points, knowledge FROM questions WHERE subject = ? ORDER BY id'
  ).bind(subject).all();
  const list = (r.results || []).map((q) => {
    const blanks = (q.type === 'fill' || q.type === 'exp' || q.type === 'calc') ? parseAns(q.answer).length : 1;
    return { id: q.id, type: q.type, stem: q.stem, options: q.options, points: q.points, knowledge: q.knowledge, blanks };
  });
  return json(list);
}

async function apiPracticeCheck(env, body) {
  const qid = body && body.qid;
  if (!qid) return json({ error: '缺少 qid' }, 400);
  const q = await env.DB.prepare(
    'SELECT id, subject, type, answer, explain, points FROM questions WHERE id = ?'
  ).bind(qid).first();
  if (!q) return json({ error: '题目不存在' }, 404);
  if (body.reveal_only) return json({ answer: q.answer, explain: q.explain, reveal: true });
  const ua = body.user_answer;
  let correct = 0, pointsEarned = 0, detail = null;
  let answerOut = q.answer;
  if (q.type === 'single' || q.type === 'multi') {
    correct = grade(q.type, q.answer, ua);
    pointsEarned = correct ? q.points : 0;
  } else if (q.type === 'solve' && body.self_correct !== undefined && body.self_correct !== null) {
    /* 解答题：孩子看完答案后自评 */
    correct = body.self_correct ? 1 : 0;
    pointsEarned = correct ? q.points : 0;
  } else {
    /* fill / exp / calc：按空给分 */
    const ansArr = parseAns(q.answer);
    const g = gradeBlanks(ansArr, ua);
    detail = g.detail;
    correct = g.frac === 1 ? 1 : 0;
    pointsEarned = Math.round(q.points * g.frac * 2) / 2;
    answerOut = ansArr;
  }
  const uaStr = Array.isArray(ua) ? ua.join(' | ') : String(ua ?? '');
  await env.DB.prepare(
    'INSERT INTO records (ts, subject, mode, ref_id, user_answer, correct, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(Date.now(), q.subject, 'practice', q.id, uaStr.slice(0, 500), correct, pointsEarned).run();
  return json({
    correct, answer: answerOut, explain: q.explain,
    points_earned: pointsEarned, detail,
  });
}

async function apiDictationSets(env) {
  const r = await env.DB.prepare(
    'SELECT set_name AS "set", subject, COUNT(*) AS count FROM dictation GROUP BY set_name, subject ORDER BY subject, set_name'
  ).all();
  const list = (r.results || []).map((x) => ({ set: x.set, subject: x.subject, count: x.count, auto: x.set === '方程式默写' ? 1 : 0 }));
  return json(list);
}

async function apiDictationItems(env, set) {
  if (!set) return json({ error: '缺少 set 参数' }, 400);
  const r = await env.DB.prepare(
    'SELECT id, prompt, subject FROM dictation WHERE set_name = ? ORDER BY id'
  ).bind(set).all();
  return json(r.results || []);
}

async function apiDictationCheck(env, body) {
  const qid = body && body.qid;
  if (!qid) return json({ error: '缺少 qid' }, 400);
  const d = await env.DB.prepare(
    'SELECT id, subject, set_name, answer, explain FROM dictation WHERE id = ?'
  ).bind(qid).first();
  if (!d) return json({ error: '默写项不存在' }, 404);
  if (body.reveal_only) return json({ answer: d.answer, explain: d.explain, reveal: true });
  let correct = 0, tip = '';
  const userText = String(body.user_text ?? '');
  if (d.set_name === '方程式默写') {
    const g = gradeEq(d.answer, userText);
    correct = g.ok;
    if (correct && g.loose) tip = '方程式主体正确，但别漏了气体 ↑ / 沉淀 ↓ 符号。';
    if (correct && splitCond(d.answer).cond && !g.hasCond) tip += '反应条件别漏：' + splitCond(d.answer).cond + '。';
  } else if (body.self_correct !== undefined && body.self_correct !== null) {
    /* 概念卡/表述/词句：默完对照后自评 */
    correct = body.self_correct ? 1 : 0;
  } else {
    return json({ error: '需要自评', need_self: true }, 400);
  }
  await env.DB.prepare(
    'INSERT INTO records (ts, subject, mode, ref_id, user_answer, correct, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(Date.now(), d.subject, 'dictation', d.id, userText.slice(0, 500), correct, 0).run();
  return json({ correct, answer: d.answer, explain: d.explain, tip });
}

/* 登录与使用记录（2026-11-04）：姓名+手机号软登录（不验证），后台按手机号记录使用情况 */
const USAGE_ADMIN_KEY = 'ty-admin-7f3k9';
async function ensureUserTables(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS site_users (phone TEXT PRIMARY KEY, name TEXT, first_ts INTEGER, last_ts INTEGER, logins INTEGER DEFAULT 0)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS usage_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, phone TEXT, name TEXT, event TEXT, detail TEXT)').run();
}
async function logUsage(env, phone, name, event, detail) {
  try {
    await ensureUserTables(env);
    await env.DB.prepare('INSERT INTO usage_events (ts, phone, name, event, detail) VALUES (?, ?, ?, ?, ?)').bind(Date.now(), String(phone || '').slice(0, 20), String(name || '').slice(0, 40), String(event || '').slice(0, 30), String(detail || '').slice(0, 200)).run();
  } catch (e) { /* 记录失败不影响使用（如当日写额度已满） */ }
}
async function apiLogin(env, body) {
  const name = String(body.name || '').trim().slice(0, 20);
  const phone = String(body.phone || '').trim();
  if (!name || !/^1\d{10}$/.test(phone)) return json({ error: '姓名或手机号格式不对' }, 400);
  try {
    await ensureUserTables(env);
    await env.DB.prepare('INSERT INTO site_users (phone, name, first_ts, last_ts, logins) VALUES (?, ?, ?, ?, 1) ON CONFLICT(phone) DO UPDATE SET name = excluded.name, last_ts = excluded.last_ts, logins = logins + 1').bind(phone, name, Date.now(), Date.now()).run();
    await logUsage(env, phone, name, 'login', '登录');
  } catch (e) { /* 写额度满等情况下仍放行，记录待恢复后补 */ }
  return json({ ok: true });
}
async function apiUsage(env, body) {
  const phone = String(body.phone || '').trim();
  if (!/^1\d{10}$/.test(phone)) return json({ error: '手机号不对' }, 400);
  await logUsage(env, phone, body.name, body.event, body.detail);
  return json({ ok: true });
}
/* 学习进度云同步（2026-11-10）：本机进度（路径自评、卡片复习、收藏、打卡等）整包按手机号存云端，换设备同号登录自动恢复 */
async function ensureStateTable(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS user_state (phone TEXT PRIMARY KEY, name TEXT, data TEXT, updated INTEGER)').run();
}
async function apiStateSave(env, body) {
  const phone = String(body.phone || '').trim();
  const name = String(body.name || '').trim().slice(0, 20);
  if (!/^1\d{10}$/.test(phone)) return json({ error: '手机号不对' }, 400);
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return json({ error: '数据不对' }, 400);
  const data = JSON.stringify(body.data);
  if (data.length > 900000) return json({ error: '数据过大' }, 413);
  const ts = Date.now();
  try {
    await ensureStateTable(env);
    await env.DB.prepare('INSERT INTO user_state (phone, name, data, updated) VALUES (?, ?, ?, ?) ON CONFLICT(phone) DO UPDATE SET name = excluded.name, data = excluded.data, updated = excluded.updated').bind(phone, name, data, ts).run();
  } catch (e) { return json({ error: '保存失败' }, 500); }
  return json({ ok: true, updated: ts });
}
async function apiStateLoad(env, q) {
  const phone = String(q.get('phone') || '').trim();
  if (!/^1\d{10}$/.test(phone)) return json({ error: '手机号不对' }, 400);
  try {
    await ensureStateTable(env);
    const row = await env.DB.prepare('SELECT data, updated FROM user_state WHERE phone = ?').bind(phone).first();
    if (!row) return json({ ok: true, data: null });
    let data = null;
    try { data = JSON.parse(row.data); } catch (e) { data = null; }
    return json({ ok: true, data, updated: row.updated });
  } catch (e) { return json({ ok: true, data: null }); }
}
async function apiUsageAdmin(env, q) {
  if (q.get('key') !== USAGE_ADMIN_KEY) return new Response('Forbidden', { status: 403 });
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = ts => new Date(ts).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  let users = [], counts = [], recent = [];
  try {
    await ensureUserTables(env);
    users = (await env.DB.prepare('SELECT phone, name, first_ts, last_ts, logins FROM site_users ORDER BY last_ts DESC').all()).results || [];
    counts = (await env.DB.prepare('SELECT phone, event, COUNT(*) AS n FROM usage_events GROUP BY phone, event ORDER BY phone, n DESC').all()).results || [];
    recent = (await env.DB.prepare('SELECT ts, phone, name, event, detail FROM usage_events ORDER BY id DESC LIMIT 200').all()).results || [];
  } catch (e) { /* 表还不存在时显示空 */ }
  const cntMap = {};
  counts.forEach(r => { (cntMap[r.phone] = cntMap[r.phone] || []).push(escH(r.event) + ' × ' + r.n); });
  const uRows = users.map(u => '<tr><td>' + escH(u.name) + '</td><td>' + escH(u.phone) + '</td><td>' + u.logins + '</td><td>' + fmt(u.first_ts) + '</td><td>' + fmt(u.last_ts) + '</td><td>' + (cntMap[u.phone] || []).join('，') + '</td></tr>').join('');
  const eRows = recent.map(r => '<tr><td>' + fmt(r.ts) + '</td><td>' + escH(r.name) + '</td><td>' + escH(r.phone) + '</td><td>' + escH(r.event) + '</td><td>' + escH(r.detail) + '</td></tr>').join('');
  const page = '<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>学习站使用记录</title><style>body{font-family:sans-serif;margin:16px;color:#111827}table{border-collapse:collapse;width:100%;margin:10px 0 24px}th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:13px;text-align:left}th{background:#111827;color:#fff}h2{margin:18px 0 4px}</style></head><body>'
    + '<h2>登录用户</h2><table><tr><th>姓名</th><th>手机号</th><th>登录次数</th><th>首次登录</th><th>最近登录</th><th>使用统计（事件 × 次数）</th></tr>' + (uRows || '<tr><td colspan="6">暂无</td></tr>') + '</table>'
    + '<h2>最近使用记录（最新 200 条）</h2><table><tr><th>时间（北京）</th><th>姓名</th><th>手机号</th><th>事件</th><th>详情</th></tr>' + (eRows || '<tr><td colspan="5">暂无</td></tr>') + '</table></body></html>';
  return html(page);
}

/* 学习路径事件记录（2026-11-02）：状态变更/答题对错/案例重做都落库，供家长端学情分析与周复盘 */
async function apiPathEvent(env, body) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS path_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, node TEXT, kind TEXT, item TEXT, ok INTEGER, detail TEXT)').run();
  const node = String(body.node || '').slice(0, 40);
  const kind = String(body.kind || '').slice(0, 20);
  if (!node || !kind) return json({ error: '参数缺失' }, 400);
  const ok = body.ok === null || body.ok === undefined ? null : (body.ok ? 1 : 0);
  await env.DB.prepare('INSERT INTO path_events (ts, node, kind, item, ok, detail) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), node, kind, String(body.item || '').slice(0, 60), ok, String(body.detail || '').slice(0, 200)).run();
  if ((kind === 'quiz' || kind === 'redo') && ok !== null) {
    await env.DB.prepare('INSERT INTO records (ts, subject, mode, ref_id, user_answer, correct, points_earned) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(Date.now(), '数学', 'path', node, kind, ok, 0).run();
  }
  if (body.phone) await logUsage(env, body.phone, body.uname, 'path', kind + ' · ' + node + (ok === null ? '' : (ok ? ' · 答对' : ' · 答错')));
  return json({ ok: true });
}

async function apiPathSummary(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS path_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, node TEXT, kind TEXT, item TEXT, ok INTEGER, detail TEXT)').run();
  const since = Date.now() - 30 * 86400000;
  const agg = await env.DB.prepare("SELECT node, kind, COUNT(*) AS n, COALESCE(SUM(ok),0) AS ok_sum FROM path_events WHERE ts >= ? AND kind IN ('quiz','redo') GROUP BY node, kind ORDER BY node").bind(since).all();
  const st = await env.DB.prepare("SELECT node, detail, MAX(ts) AS ts FROM path_events WHERE kind = 'status' GROUP BY node").all();
  const recent = await env.DB.prepare('SELECT ts, node, kind, item, ok, detail FROM path_events ORDER BY id DESC LIMIT 50').all();
  return json({ agg: agg.results || [], status: st.results || [], recent: recent.results || [] });
}

async function apiMistakes(env, subject) {
  const cols = 'id, subject, question_no, full_score, got_score, student_answer, std_answer, error_type, knowledge_point, note, mastered, redo_count';
  let r;
  if (subject) {
    r = await env.DB.prepare(
      'SELECT ' + cols + ' FROM mistakes WHERE subject = ? ORDER BY subject, question_no'
    ).bind(subject).all();
  } else {
    r = await env.DB.prepare(
      'SELECT ' + cols + ' FROM mistakes ORDER BY subject, question_no'
    ).all();
  }
  return json(r.results || []);
}

/* 错题详情（含上传原图）、标会了、重做计数 */
async function apiMistakeDetail(env, id) {
  const r = await env.DB.prepare(
    "SELECT m.*, (SELECT image_key FROM uploads WHERE '上传' || id = m.question_no) AS upload_image FROM mistakes m WHERE m.id = ?"
  ).bind(id).all();
  const m = (r.results || [])[0];
  if (!m) return json({ error: '不存在' }, 404);
  return json(m);
}
async function apiMistakeMastered(env, id, body) {
  const v = body && body.mastered ? 1 : 0;
  await env.DB.prepare('UPDATE mistakes SET mastered = ? WHERE id = ?').bind(v, id).run();
  return json({ ok: true, mastered: v });
}
async function apiMistakeRedo(env, id) {
  await env.DB.prepare('UPDATE mistakes SET redo_count = redo_count + 1 WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function apiStats(env) {
  const bySubject = await env.DB.prepare(
    'SELECT subject, mode, COUNT(*) AS attempts, COALESCE(SUM(correct),0) AS correct FROM records GROUP BY subject, mode ORDER BY subject, mode'
  ).all();
  const cutoff = Date.now() - 14 * 86400 * 1000;
  const daily = await env.DB.prepare(
    "SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') AS day, COUNT(*) AS attempts, COALESCE(SUM(correct),0) AS correct FROM records WHERE ts >= ? GROUP BY day ORDER BY day"
  ).bind(cutoff).all();
  const recent = await env.DB.prepare(
    'SELECT ts, subject, mode, ref_id, correct FROM records ORDER BY id DESC LIMIT 20'
  ).all();
  return json({
    by_subject: bySubject.results || [],
    daily: daily.results || [],
    recent: recent.results || [],
  });
}

/* ---------------- 页面 ---------------- */
const CSS = '*{box-sizing:border-box;margin:0;padding:0}'
+ 'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:#f4f6fb;color:#1f2937;font-size:17px;line-height:1.65}'
+ '.top{background:#2563eb;color:#fff;padding:16px;font-size:21px;font-weight:800;text-align:center}'
+ '.nav{display:flex;background:#fff;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:5}'
+ '.nav a{flex:1;text-align:center;padding:13px 2px;font-size:15px;color:#6b7280;text-decoration:none}'
+ '.nav a.on{color:#2563eb;font-weight:700;box-shadow:inset 0 -3px 0 #2563eb}'
+ '.wrap{max-width:640px;margin:0 auto;padding:12px 12px 60px}'
+ '.card{background:#fff;border-radius:14px;padding:16px;margin:12px 0;box-shadow:0 1px 4px rgba(0,0,0,.07)}'
+ 'h2{font-size:18px;margin:2px 0 10px}'
+ '.btn{display:block;width:100%;padding:15px;font-size:18px;font-weight:700;color:#fff;background:#2563eb;border:0;border-radius:12px;margin:10px 0;cursor:pointer;text-decoration:none;text-align:center}'
+ '.btn.green{background:#059669}.btn.gray{background:#6b7280}'
+ '.opt{display:block;padding:13px 14px;border:2px solid #e5e7eb;border-radius:10px;margin:8px 0;font-size:16px;cursor:pointer;background:#fff}'
+ '.opt input{margin-right:10px;transform:scale(1.35)}'
+ 'textarea,input[type=text]{width:100%;font-size:17px;padding:13px;border:2px solid #e5e7eb;border-radius:10px;font-family:inherit;background:#fff}'
+ 'textarea{min-height:110px;resize:vertical}'
+ '.bar{height:14px;background:#e5e7eb;border-radius:7px;overflow:hidden;margin:6px 0}'
+ '.bar>i{display:block;height:100%;background:#2563eb;border-radius:7px}'
+ '.ok{color:#059669;font-weight:800}.bad{color:#dc2626;font-weight:800}'
+ '.mut{color:#6b7280;font-size:14px}'
+ '.explain{background:#f0fdf4;border-left:4px solid #10b981;padding:12px;border-radius:0 10px 10px 0;margin:10px 0;white-space:pre-wrap}'
+ '.chip{display:inline-block;padding:9px 15px;margin:4px;background:#eef2ff;color:#3730a3;border-radius:20px;font-size:15px;cursor:pointer;border:0}'
+ '.chip.on{background:#3730a3;color:#fff}'
+ 'table{width:100%;border-collapse:collapse;font-size:14px}'
+ 'th,td{border:1px solid #e5e7eb;padding:8px;text-align:left;vertical-align:top}'
+ 'th{background:#f9fafb}'
+ '.prog{font-size:15px;color:#6b7280;text-align:center;margin:8px 0}'
+ '.stem{font-size:18px;font-weight:600;margin:6px 0 10px;white-space:pre-wrap}'
+ '.db{display:flex;align-items:flex-end;height:110px;gap:6px;margin:10px 0}'
+ '.db>div{flex:1;background:#bfdbfe;border-radius:6px 6px 0 0;position:relative;min-height:4px}'
+ '.db span{position:absolute;top:-20px;left:0;right:0;text-align:center;font-size:11px;color:#374151}';

function shell(title, navOn, body) {
  const nav = [
    ['/', '首页'],
    ['/practice', '专项练习'],
    ['/dictation', '默写工坊'],
    ['/mistakes', '错题本'],
    ['/upload', '传错题'],
    ['/ai', '问 AI'],
    ['/parent', '学习报告'],
  ].map((n) => '<a href="' + n[0] + '"' + (n[0] === navOn ? ' class="on"' : '') + '>' + n[1] + '</a>').join('');
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
    + '<title>' + esc(title) + '</title><style>' + CSS + '</style></head>'
    + '<body><div class="top">' + esc(title) + '</div>'
    + '<div class="nav">' + nav + '</div>'
    + '<div class="wrap">' + body + '</div></body></html>';
}

/* 首页 */
function pageHome() {
  const body = ''
    + '<div class="card"><h2>今日任务</h2>'
    + '<p class="mut">点进去开做，做完就是打卡。</p>'
    + '<a class="btn" href="/dictation?set=' + encodeURIComponent('方程式默写') + '">化学方程式默写 15 分钟</a>'
    + '<a class="btn" href="/practice?subject=' + encodeURIComponent('物理') + '">物理专项练习</a>'
    + '<a class="btn" href="/practice?subject=' + encodeURIComponent('数学') + '">数学专项练习</a>'
    + '<a class="btn" href="/dictation?set=' + encodeURIComponent('标志性表述') + '">政治表述默写</a>'
    + '<a class="btn" href="/dictation?set=' + encodeURIComponent('概念辨析') + '">概念辨析卡</a></div>'
    + '<div id="reportMask" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:60"></div>'
    + '<div id="reportModal" style="display:none;position:fixed;top:8%;left:5%;right:5%;max-height:84%;overflow-y:auto;background:#fff;border-radius:16px;z-index:61;padding:18px">'
    + '<h2 style="margin-top:0">成绩看板 · 高一上第一次月考</h2><div id="mScores"><p class="mut">加载中…</p></div>'
    + '<h2>三个病根</h2>'
    + '<p><b>1. 概念地基有洞</b>——化学方程式从不配平、物理刹车不算停止时间、地理把"大气逆辐射"写成"反射"。不是粗心，是真不会。</p>'
    + '<p><b>2. 输出说不到点上</b>——政治"四个彻底结束"一个没写出来，历史江南农业关键词全缺。有话，但写不到得分点上。</p>'
    + '<p><b>3. 选择题暗坑</b>——地理错 10 题、生物错 7 题、化学错 6 题。拿回试卷后遮答案重做复盘。</p>'
    + '<p class="mut" style="font-size:13px">完整版随时去「学习报告」查看。</p>'
    + '<button class="btn" id="hideReport">知道了，隐藏</button>'
    + '</div>'
    + '<script>'
    + "fetch('/api/scores').then(function(r){return r.json()}).then(function(d){"
    + "var seen=null;try{seen=localStorage.getItem('report_seen_v')}catch(e){}"
    + "if(seen===d.version)return;"
    + "var order=['语文','英语','数学','物理','历史','政治','生物','地理','化学'];"
    + "var map={};(d.scores||[]).forEach(function(x){map[x.subject]=x});"
    + "var h='';order.forEach(function(s){var x=map[s];if(!x)return;"
    + "var pct=Math.round(x.score/x.full*100);"
    + "h+='<div style=\"margin:8px 0\"><div>'+s+' <b>'+x.score+'</b> / '+x.full+'（'+pct+'%）</div><div class=\"bar\"><i style=\"width:'+pct+'%\"></i></div></div>'});"
    + "document.getElementById('mScores').innerHTML=h||'<p class=\"mut\">暂无成绩数据</p>';"
    + "document.getElementById('reportMask').style.display='block';"
    + "document.getElementById('reportModal').style.display='block';"
    + "document.getElementById('hideReport').addEventListener('click',function(){"
    + "try{localStorage.setItem('report_seen_v',d.version)}catch(e){}"
    + "document.getElementById('reportMask').style.display='none';"
    + "document.getElementById('reportModal').style.display='none'});"
    + "});"
    + '</scr' + 'ipt>';
  return shell('天娅的学习小站', '/', body);
}

/* 专项练习页 */
function pagePractice() {
  const body = ''
    + '<div class="card" id="pick"><h2>选科目</h2><div id="subs"><p class="mut">加载中…</p></div></div>'
    + '<div id="quiz" style="display:none">'
    + '<div class="prog" id="prog"></div>'
    + '<div class="card"><div class="stem" id="stem"></div><div id="mut" class="mut"></div><div id="opts"></div>'
    + '<div id="fb"></div>'
    + '<button class="btn" id="submitBtn">提交</button>'
    + '<button class="btn green" id="selfOkBtn" style="display:none">我做对了</button>'
    + '<button class="btn gray" id="selfNoBtn" style="display:none">我做错了</button>'
    + '<button class="btn gray" id="nextBtn" style="display:none">下一题</button>'
    + '</div></div>'
    + '<div class="card" id="done" style="display:none"><h2>本轮完成</h2><p id="doneText" style="font-size:20px"></p>'
    + '<button class="btn" id="againBtn">再来一轮</button></div>'
    + '<script>'
    + "var qs=[],idx=0,okN=0,gotP=0,totP=0,subject='';"
    + "var params=new URLSearchParams(location.search);var preSub=params.get('subject')||'';"
    + "function escH(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}"
    + "function fmtAns(a){if(a==null)return '';if(Array.isArray(a))return a.join('；');var t=String(a).trim();if(t.charAt(0)==='['){try{var v=JSON.parse(t);if(Array.isArray(v))return v.join('；')}catch(e){}}return t}"
    + "fetch('/api/practice/subjects').then(function(r){return r.json()}).then(function(d){"
    + "var h='';d.forEach(function(x){h+='<button class=\"chip'+(x.subject===preSub?' on':'')+'\" data-s=\"'+escH(x.subject)+'\">'+escH(x.subject)+'（'+x.count+'题）</button>'});"
    + "document.getElementById('subs').innerHTML=h||'<p class=\"mut\">暂无题目</p>';"
    + "var cs=document.querySelectorAll('#subs .chip');cs.forEach(function(c){c.addEventListener('click',function(){start(c.getAttribute('data-s'))})});"
    + "if(preSub)start(preSub);});"
    + "function start(s){subject=s;fetch('/api/practice/questions?subject='+encodeURIComponent(s)).then(function(r){return r.json()}).then(function(d){"
    + "qs=d;idx=0;okN=0;gotP=0;totP=0;document.getElementById('pick').style.display='none';"
    + "document.getElementById('done').style.display='none';document.getElementById('quiz').style.display='block';show()})}"
    + "function show(){var q=qs[idx];if(!q)return;"
    + "document.getElementById('prog').textContent='第 '+(idx+1)+' / '+qs.length+' 题 · '+subject;"
    + "document.getElementById('stem').textContent=q.stem;"
    + "document.getElementById('mut').textContent=(q.knowledge?'考查：'+q.knowledge+' · ':'')+q.points+' 分';"
    + "var o=document.getElementById('opts');o.innerHTML='';"
    + "if(q.type==='single'||q.type==='multi'){var opts={};try{opts=JSON.parse(q.options||'{}')}catch(e){}"
    + "Object.keys(opts).forEach(function(k){var l=document.createElement('label');l.className='opt';"
    + "var inp=document.createElement('input');inp.type=q.type==='single'?'radio':'checkbox';inp.name='ans';inp.value=k;"
    + "l.appendChild(inp);l.appendChild(document.createTextNode(k+'. '+opts[k]));o.appendChild(l)})}"
    + "else if(q.type==='solve'){var t=document.createElement('textarea');t.id='ansText';t.placeholder='在纸上写出完整过程，或把思路写在这里';o.appendChild(t);"
    + "var ph=document.createElement('p');ph.className='mut';ph.textContent='解答题：写完后点「看答案」，对照步骤后自评。';o.appendChild(ph)}"
    + "else{var n=q.blanks||1;for(var i=0;i<n;i++){var w=document.createElement('input');w.type='text';w.className='blankInp';w.placeholder='第 '+(i+1)+' 空';w.style.margin='0 0 8px';o.appendChild(w)}}"
    + "document.getElementById('fb').innerHTML='';"
    + "var sb=document.getElementById('submitBtn');sb.style.display='block';sb.textContent=(q.type==='solve'?'看答案':'提交');"
    + "document.getElementById('selfOkBtn').style.display='none';document.getElementById('selfNoBtn').style.display='none';"
    + "document.getElementById('nextBtn').style.display='none';}"
    + "document.getElementById('submitBtn').addEventListener('click',function(){var q=qs[idx];"
    + "if(q.type==='solve'){"
    + "fetch('/api/practice/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({qid:q.id,reveal_only:1})})"
    + ".then(function(r){return r.json()}).then(function(res){"
    + "var h='<p class=\"mut\">标准答案：</p><p><b>'+escH(fmtAns(res.answer))+'</b></p>';"
    + "h+='<div class=\"explain\">讲思路：'+escH(res.explain||'（暂无讲解）')+'</div>';"
    + "h+='<p class=\"mut\">对照上面的步骤，你的过程写对了吗？</p>';"
    + "document.getElementById('fb').innerHTML=h;"
    + "document.getElementById('submitBtn').style.display='none';"
    + "document.getElementById('selfOkBtn').style.display='block';document.getElementById('selfNoBtn').style.display='block';});return;}"
    + "var ua;"
    + "if(q.type==='single'){var r=document.querySelector('input[name=ans]:checked');ua=r?r.value:''}"
    + "else if(q.type==='multi'){ua=[];document.querySelectorAll('input[name=ans]:checked').forEach(function(c){ua.push(c.value)})}"
    + "else{ua=[];document.querySelectorAll('.blankInp').forEach(function(w){ua.push(w.value)})}"
    + "fetch('/api/practice/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({qid:q.id,user_answer:ua})})"
    + ".then(function(r){return r.json()}).then(function(res){"
    + "if(res.correct)okN++;gotP+=res.points_earned||0;totP+=q.points;"
    + "var h='<p class=\"'+(res.correct?'ok':'bad')+'\" style=\"font-size:20px\">'+(res.correct?'答对了！':'再想想')+'</p>';"
    + "if(res.detail){var dh='';res.detail.forEach(function(dd,i){dh+='<span class=\"'+(dd?'ok':'bad')+'\">第'+(i+1)+'空 '+(dd?'✓':'✗')+'</span> '});h+='<p>'+dh+'</p>'}"
    + "h+='<p>正确答案：<b>'+escH(fmtAns(res.answer))+'</b>（+'+res.points_earned+' 分）</p>';"
    + "h+='<div class=\"explain\">讲思路：'+escH(res.explain||'（暂无讲解）')+'</div>';"
    + "document.getElementById('fb').innerHTML=h;"
    + "document.getElementById('submitBtn').style.display='none';document.getElementById('nextBtn').style.display='block';"
    + "document.getElementById('nextBtn').textContent=idx<qs.length-1?'下一题':'看成绩';})});"
    + "document.getElementById('selfOkBtn').addEventListener('click',function(){selfMark(true)});"
    + "document.getElementById('selfNoBtn').addEventListener('click',function(){selfMark(false)});"
    + "function selfMark(ok){var q=qs[idx];var t=document.getElementById('ansText');var w=t?t.value:'';"
    + "fetch('/api/practice/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({qid:q.id,user_answer:w,self_correct:ok?1:0})})"
    + ".then(function(r){return r.json()}).then(function(res){"
    + "if(res.correct)okN++;gotP+=res.points_earned||0;totP+=q.points;"
    + "document.getElementById('selfOkBtn').style.display='none';document.getElementById('selfNoBtn').style.display='none';"
    + "document.getElementById('nextBtn').style.display='block';"
    + "document.getElementById('nextBtn').textContent=idx<qs.length-1?'下一题':'看成绩';})}"
    + "document.getElementById('nextBtn').addEventListener('click',function(){idx++;if(idx<qs.length){show()}else{"
    + "document.getElementById('quiz').style.display='none';document.getElementById('done').style.display='block';"
    + "document.getElementById('doneText').textContent='本轮 '+qs.length+' 题，答对 '+okN+' 题，得 '+gotP+' / '+totP+' 分';}});"
    + "document.getElementById('againBtn').addEventListener('click',function(){start(subject)});"
    + '</scr' + 'ipt>';
  return shell('专项练习', '/practice', body);
}

/* 默写工坊页 */
function pageDictation() {
  const body = ''
    + '<div class="card" id="pick"><h2>选默写集</h2><div id="sets"><p class="mut">加载中…</p></div></div>'
    + '<div id="quiz" style="display:none">'
    + '<div class="prog" id="prog"></div>'
    + '<div class="card"><div class="stem" id="prompt"></div><div id="mut" class="mut"></div>'
    + '<textarea id="ansText" placeholder="默写在这里，写完点核对"></textarea>'
    + '<div id="fb"></div>'
    + '<button class="btn" id="checkBtn">核对</button>'
    + '<button class="btn gray" id="nextBtn" style="display:none">下一条</button>'
    + '</div></div>'
    + '<div class="card" id="done" style="display:none"><h2>本轮完成</h2><p id="doneText" style="font-size:20px"></p>'
    + '<button class="btn" id="againBtn">再来一轮</button></div>'
    + '<script>'
    + "var items=[],idx=0,okN=0,setName='',autoMap={};"
    + "var params=new URLSearchParams(location.search);var preSet=params.get('set')||'';"
    + "function escH(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}"
    + "fetch('/api/dictation/sets').then(function(r){return r.json()}).then(function(d){"
    + "var h='';d.forEach(function(x){autoMap[x.set]=x.auto;h+='<button class=\"chip'+(x.set===preSet?' on':'')+'\" data-s=\"'+escH(x.set)+'\">'+escH(x.set)+'（'+escH(x.subject)+' '+x.count+'条'+(x.auto?'·自动批改':'·自评')+'）</button>'});"
    + "document.getElementById('sets').innerHTML=h||'<p class=\"mut\">暂无默写集</p>';"
    + "var cs=document.querySelectorAll('#sets .chip');cs.forEach(function(c){c.addEventListener('click',function(){start(c.getAttribute('data-s'))})});"
    + "if(preSet)start(preSet);});"
    + "function start(s){setName=s;fetch('/api/dictation/items?set='+encodeURIComponent(s)).then(function(r){return r.json()}).then(function(d){"
    + "items=d;idx=0;okN=0;document.getElementById('pick').style.display='none';"
    + "document.getElementById('done').style.display='none';document.getElementById('quiz').style.display='block';show()})}"
    + "function show(){var it=items[idx];if(!it)return;"
    + "document.getElementById('prog').textContent='第 '+(idx+1)+' / '+items.length+' 条 · '+setName;"
    + "document.getElementById('prompt').textContent=it.prompt;"
    + "document.getElementById('mut').textContent='科目：'+it.subject+(autoMap[setName]?' · 自动批改':' · 默完对照后自评');"
    + "document.getElementById('ansText').value='';document.getElementById('fb').innerHTML='';"
    + "document.getElementById('checkBtn').style.display='block';document.getElementById('nextBtn').style.display='none';}"
    + "document.getElementById('checkBtn').addEventListener('click',function(){var it=items[idx];"
    + "var t=document.getElementById('ansText').value;"
    + "if(autoMap[setName]){"
    + "fetch('/api/dictation/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({qid:it.id,user_text:t})})"
    + ".then(function(r){return r.json()}).then(function(res){"
    + "if(res.correct)okN++;"
    + "var h='<p class=\"'+(res.correct?'ok':'bad')+'\" style=\"font-size:20px\">'+(res.correct?'默写正确！':'再想想，对照一下')+'</p>';"
    + "if(res.tip)h+='<p class=\"bad\">'+escH(res.tip)+'</p>';"
    + "h+='<p>标准答案：<b>'+escH(res.answer)+'</b></p>';"
    + "h+='<div class=\"explain\">讲思路：'+escH(res.explain||'（暂无讲解）')+'</div>';"
    + "showFb(h);});}else{"
    + "fetch('/api/dictation/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({qid:it.id,reveal_only:1})})"
    + ".then(function(r){return r.json()}).then(function(res){"
    + "var h='<p class=\"mut\">标准答案：</p><p><b>'+escH(res.answer)+'</b></p>';"
    + "h+='<div class=\"explain\">讲思路：'+escH(res.explain||'（暂无讲解）')+'</div>';"
    + "h+='<p class=\"mut\">对照标准答案，你记住了吗？</p>';"
    + "h+='<button class=\"btn green\" id=\"dOk\">我记住了</button><button class=\"btn gray\" id=\"dNo\">还要再记</button>';"
    + "document.getElementById('fb').innerHTML=h;"
    + "document.getElementById('checkBtn').style.display='none';"
    + "document.getElementById('dOk').addEventListener('click',function(){dSelf(1)});"
    + "document.getElementById('dNo').addEventListener('click',function(){dSelf(0)});});}});"
    + "function dSelf(ok){var it=items[idx];var t=document.getElementById('ansText').value;"
    + "fetch('/api/dictation/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({qid:it.id,user_text:t,self_correct:ok?1:0})})"
    + ".then(function(r){return r.json()}).then(function(res){if(res.correct)okN++;showFb('')})}"
    + "function showFb(h){if(h)document.getElementById('fb').innerHTML=h;"
    + "document.getElementById('checkBtn').style.display='none';document.getElementById('nextBtn').style.display='block';"
    + "document.getElementById('nextBtn').textContent=idx<items.length-1?'下一条':'看成绩';}"
    + "document.getElementById('nextBtn').addEventListener('click',function(){idx++;if(idx<items.length){show()}else{"
    + "document.getElementById('quiz').style.display='none';document.getElementById('done').style.display='block';"
    + "document.getElementById('doneText').textContent='本轮 '+items.length+' 条，写对 '+okN+' 条，正确率 '+Math.round(okN/items.length*100)+'%';}});"
    + "document.getElementById('againBtn').addEventListener('click',function(){start(setName)});"
    + '</scr' + 'ipt>';
  return shell('默写工坊', '/dictation', body);
}

/* AI 问答页（会话式） */
function pageAi() {
  const body = ''
    + '<div class="card" style="padding:0">'
    + '<div style="display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:10">'
    + '<button id="sessBtn" style="flex:0 0 auto;height:40px;padding:0 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;font-size:15px">☰ 历史对话</button>'
    + '<div id="sessTitle" style="flex:1;font-size:13px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center"></div>'
    + '<button id="newSessBtn" style="flex:0 0 auto;height:40px;padding:0 12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;font-size:15px">＋ 新对话</button>'
    + '</div>'
    + '<div id="drawerMask" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.35);z-index:40"></div>'
    + '<div id="drawer" style="display:none;position:fixed;top:0;left:0;bottom:0;width:80%;max-width:320px;background:#fff;z-index:50;overflow-y:auto">'
    + '<div style="display:flex;align-items:center;padding:12px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff"><b style="flex:1">历史对话</b><button id="drawerX" style="border:0;background:none;font-size:18px">✕</button></div>'
    + '<div id="sessList"><p class="mut" style="padding:12px">加载中…</p></div>'
    + '</div>'
    + '<div style="padding:12px">'
    + '<div id="msgs"></div>'
    + '<div id="imgPrev" style="margin:6px 0"></div>'
    + '<textarea id="q" placeholder="把你的问题写在这里，比如：这道物理题为什么选B？"></textarea>'
    + '<div style="display:flex;gap:8px;margin-top:8px">'
    + '<button class="btn" id="imgBtn" style="flex:0 0 52px;width:auto;margin:0;padding:12px 0">📷</button>'
    + '<button class="btn" id="sendBtn" style="flex:1;width:auto;margin:0;padding:12px 0">发送</button></div>'
    + '<input type="file" id="imgFile" accept="image/*" style="display:none">'
    + '</div></div>'
    + '<script>'
    + "fetch('/api/scores').then(function(r){return r.json()}).then(function(d){"
    + "var order=['语文','英语','数学','物理','历史','政治','生物','地理','化学'];"
    + "var map={};(d.scores||d).forEach(function(x){map[x.subject]=x});"
    + "var h='';order.forEach(function(s){var x=map[s];if(!x)return;"
    + "var pct=Math.round(x.score/x.full*100);"
    + "h+='<div style=\"margin:8px 0\"><div>'+s+' <b>'+x.score+'</b> / '+x.full+'（'+pct+'%）</div><div class=\"bar\"><i style=\"width:'+pct+'%\"></i></div></div>'});"
    + "document.getElementById('pScores').innerHTML=h||'<p class=\"mut\">暂无成绩数据</p>'});"
    + "function escH(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}"
    + "var curSession=null,firstLoad=true;"
    + "function getSeen(){try{return JSON.parse(localStorage.getItem('ai_seen')||'{}')}catch(e){return{}}}"
    + "function setSeen(sid,cnt){var m=getSeen();m[sid]=cnt;try{localStorage.setItem('ai_seen',JSON.stringify(m))}catch(e){}}"
    + "function sessTitle(s){var t=(s.title||'').trim();if(!t)t='图片提问';return t.length>18?t.slice(0,18)+'…':t}"
    + "function dt2(ts){var d=new Date(ts);return (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')}"
    + "function openDrawer(){document.getElementById('drawer').style.display='block';document.getElementById('drawerMask').style.display='block';loadSessions()}"
    + "function closeDrawer(){document.getElementById('drawer').style.display='none';document.getElementById('drawerMask').style.display='none'}"
    + "document.getElementById('sessBtn').addEventListener('click',openDrawer);"
    + "document.getElementById('drawerX').addEventListener('click',closeDrawer);"
    + "document.getElementById('drawerMask').addEventListener('click',closeDrawer);"
    + "document.getElementById('newSessBtn').addEventListener('click',function(){curSession=null;document.getElementById('sessTitle').textContent='';document.getElementById('msgs').innerHTML='<p class=\\'mut\\'>开始一个新的话题吧</p>';window.scrollTo(0,0)});"
    + "function loadSessions(){fetch('/api/ai/sessions').then(function(r){return r.json()}).then(function(d){"
    + "var seen=getSeen(),h='';"
    + "d.forEach(function(s){var dot=(s.deep_cnt||0)>(seen[s.session_id]||0);"
    + "h+='<div data-sid=\\''+s.session_id+'\\' data-title=\\''+escH(sessTitle(s))+'\\' data-dc=\\''+(s.deep_cnt||0)+'\\' style=\\'padding:12px;border-bottom:1px solid #f3f4f6;cursor:pointer\\'>'"
    + "+'<div style=\\'font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\\'>'+(dot?'<span style=\\'color:#dc2626\\'>● </span>':'')+escH(sessTitle(s))+'</div>'"
    + "+'<div class=\\'mut\\' style=\\'font-size:12px;margin-top:2px\\'>'+dt2(s.last_ts)+' · '+s.cnt+'条'+(s.deep_cnt?' · 🆕'+s.deep_cnt:'')+'</div></div>'});"
    + "document.getElementById('sessList').innerHTML=h||'<p class=\\'mut\\' style=\\'padding:12px\\'>还没有对话</p>';"
    + "var nodes=document.querySelectorAll('#sessList [data-sid]');nodes.forEach(function(n){n.addEventListener('click',function(){"
    + "openSession(n.getAttribute('data-sid'),n.getAttribute('data-title'),parseInt(n.getAttribute('data-dc')||'0'))})});"
    + "updateNavDot(d,seen)});}"
    + "function updateNavDot(d,seen){var hasNew=d.some(function(s){return (s.deep_cnt||0)>(seen[s.session_id]||0)});"
    + "var links=document.querySelectorAll('.nav a');links.forEach(function(a){if(a.getAttribute('href')==='/ai'){"
    + "a.innerHTML=hasNew?'问 AI <span style=\\'color:#dc2626\\'>●</span>':'问 AI'}})}"
    + "function openSession(sid,title,dc){curSession=sid;setSeen(sid,dc||0);document.getElementById('sessTitle').textContent=title;closeDrawer();load()}"
    + "var imgFile=null;"
    + "function render(d){var h='';d.forEach(function(m){"
    + "var qb=escH(m.question);"
    + "if(m.image_key){qb+='<br><img src=\\'/img/'+encodeURIComponent(m.image_key)+'\\' style=\\'max-width:200px;border-radius:8px;margin-top:6px\\'>'}"
    + "h+='<div style=\\'margin:10px 0;text-align:right\\'><span style=\\'display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;max-width:85%;text-align:left;white-space:pre-wrap\\'>'+qb+'</span></div>';"
    + "if(m.answer){h+='<div style=\\'margin:10px 0\\'><span style=\\'display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 14px;border-radius:14px 14px 14px 4px;max-width:92%;white-space:pre-wrap\\'>'+escH(m.answer)+'</span></div>'}"
    + "else{h+='<div style=\\'margin:10px 0\\'><span class=\\'mut\\'>老师正在看题，稍等…</span></div>'}"
    + "if(m.deep_answer){h+='<div style=\\'margin:10px 0\\'><div style=\\'font-size:13px;color:#b45309;margin-bottom:4px\\'>🆕 老师完整讲解</div><span style=\\'display:inline-block;background:#fffbeb;border:1px solid #fde68a;padding:10px 14px;border-radius:14px 14px 14px 4px;max-width:92%;white-space:pre-wrap\\'>'+escH(m.deep_answer)+'</span></div>'}});"
    + "document.getElementById('msgs').innerHTML=h||'<p class=\\'mut\\'>还没有提问，在下面输入你的问题吧</p>';"
    + "setTimeout(function(){var nearBottom=(document.body.scrollHeight-window.innerHeight-window.scrollY)<200;if(firstLoad||nearBottom){window.scrollTo(0,document.body.scrollHeight)}firstLoad=false},50)}"
    + "function load(){var url='/api/ai/history'+(curSession?'?session='+encodeURIComponent(curSession):'');fetch(url).then(function(r){return r.json()}).then(render)}"
    + "document.getElementById('imgBtn').addEventListener('click',function(){document.getElementById('imgFile').click()});"
    + "document.getElementById('imgFile').addEventListener('change',function(){"
    + "imgFile=this.files[0]||null;var p=document.getElementById('imgPrev');"
    + "if(imgFile){var url=URL.createObjectURL(imgFile);"
    + "p.innerHTML='<img src=\\''+url+'\\' style=\\'max-width:160px;border-radius:8px;vertical-align:middle\\'> <button class=\\'chip\\' id=\\'imgX\\'>✕ 去掉</button>';"
    + "document.getElementById('imgX').addEventListener('click',function(){imgFile=null;document.getElementById('imgFile').value='';p.innerHTML=''})}"
    + "else{p.innerHTML=''}});"
    + "document.getElementById('sendBtn').addEventListener('click',function(){"
    + "var t=document.getElementById('q').value.trim();"
    + "if(!t&&!imgFile)return;"
    + "var b=this;b.textContent='发送中…';b.disabled=true;"
    + "var done=function(ok,err,sid){b.textContent='发送';b.disabled=false;"
    + "if(ok){if(sid&&!curSession){curSession=sid}document.getElementById('q').value='';imgFile=null;document.getElementById('imgFile').value='';document.getElementById('imgPrev').innerHTML='';"
    + "var qt=t||'图片提问';document.getElementById('sessTitle').textContent=qt.length>18?qt.slice(0,18)+'…':qt;"
    + "load();loadSessions()}"
    + "else{alert(err||'发送失败')}};"
    + "if(imgFile){var fd=new FormData();fd.append('question',t);fd.append('image',imgFile);if(curSession)fd.append('session_id',curSession);"
    + "fetch('/api/ai/ask',{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(res){done(res.ok,res.error,res.session_id)})}"
    + "else{var payload={question:t};if(curSession)payload.session_id=curSession;"
    + "fetch('/api/ai/ask',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json()}).then(function(res){done(res.ok,res.error,res.session_id)})}"
    + "});"
    + "load();loadSessions();setInterval(function(){load()},10000);setInterval(function(){loadSessions()},60000);"
    + '</scr' + 'ipt>';
  return shell('问 AI 老师', '/ai', body);
}


/* 传错题页 */
function pageUpload() {
  const body = ''
    + '<div class="card"><h2>传错题</h2>'
    + '<p class="mut">把做错的题拍下来传上来，会分析错因、写好讲解，放进你的错题本。整张卷子可以一次选多张（最多10张）一起提交。</p>'
    + '<p class="mut">科目</p><div id="subs" style="margin:6px 0"></div>'
    + '<input type="file" id="file" accept="image/*" multiple style="margin:10px 0;font-size:16px">'
    + '<div id="prev" style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0"></div>'
    + '<textarea id="note" placeholder="哪道题？一句话说下（选填）"></textarea>'
    + '<div id="fb"></div>'
    + '<button class="btn" id="upBtn">提交</button></div>'
    + '<script>'
    + "var subject='数学';"
    + "var subs=['语文','数学','英语','物理','化学','生物','历史','地理','政治'];"
    + "var h='';subs.forEach(function(s,i){h+='<button class=\"chip'+(i===1?' on':'')+'\" data-s=\"'+s+'\">'+s+'</button>'});"
    + "document.getElementById('subs').innerHTML=h;"
    + "var cs=document.querySelectorAll('#subs .chip');cs.forEach(function(c){c.addEventListener('click',function(){cs.forEach(function(x){x.classList.remove('on')});c.classList.add('on');subject=c.getAttribute('data-s')})});"
    + "document.getElementById('file').addEventListener('change',function(){"
    + "var p=document.getElementById('prev');p.innerHTML='';var fs=this.files;"
    + "if(fs.length>10){alert('一次最多选10张');this.value='';return}"
    + "for(var i=0;i<fs.length;i++){var url=URL.createObjectURL(fs[i]);"
    + "p.innerHTML+='<img src=\"'+url+'\" style=\"width:72px;height:72px;object-fit:cover;border-radius:8px\">'}});"
    + "document.getElementById('upBtn').addEventListener('click',function(){"
    + "var fs=document.getElementById('file').files;if(!fs.length){document.getElementById('fb').innerHTML='<p class=\"bad\">先选图片</p>';return}"
    + "var fd=new FormData();for(var i=0;i<fs.length;i++){fd.append('image',fs[i])}"
    + "fd.append('subject',subject);fd.append('note',document.getElementById('note').value);fd.append('batch_id','b'+Date.now());"
    + "var b=document.getElementById('upBtn');b.textContent='上传中…';b.disabled=true;"
    + "fetch('/api/upload',{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(res){"
    + "b.textContent='提交';b.disabled=false;"
    + "if(res.ok){document.getElementById('fb').innerHTML='<p class=\"ok\">已收到 '+res.count+' 张！分析好讲解后会放进错题本。</p>';document.getElementById('file').value='';document.getElementById('note').value='';document.getElementById('prev').innerHTML=''}"
    + "else{document.getElementById('fb').innerHTML='<p class=\"bad\">'+res.error+'</p>'}})});"
    + '</scr' + 'ipt>';
  return shell('传错题', '/upload', body);
}

/* 错题本页 */
function pageMistakes() {
  const subs = ['全部', '语文', '英语', '数学', '物理', '历史', '政治', '生物', '地理', '化学'];
  const chips = subs.map((s, i) =>
    '<button class="chip' + (i === 0 ? ' on' : '') + '" data-s="' + (i === 0 ? '' : s) + '">' + s + '</button>'
  ).join('');
  const body = ''
    + '<div class="card"><h2>按科目筛</h2><div id="chips">' + chips + '</div>'
    + '<div style="margin-top:10px"><button class="chip on" id="tabTodo">错题 (<span id="cTodo">0</span>)</button> '
    + '<button class="chip" id="tabDone">会了 (<span id="cDone">0</span>)</button></div>'
    + '<p class="mut">「会了」栏留着考前复习用。</p></div>'
    + '<div id="list"><p class="mut" style="text-align:center">加载中…</p></div>'
    + '<script>'
    + "fetch('/api/scores').then(function(r){return r.json()}).then(function(d){"
    + "var order=['语文','英语','数学','物理','历史','政治','生物','地理','化学'];"
    + "var map={};(d.scores||d).forEach(function(x){map[x.subject]=x});"
    + "var h='';order.forEach(function(s){var x=map[s];if(!x)return;"
    + "var pct=Math.round(x.score/x.full*100);"
    + "h+='<div style=\"margin:8px 0\"><div>'+s+' <b>'+x.score+'</b> / '+x.full+'（'+pct+'%）</div><div class=\"bar\"><i style=\"width:'+pct+'%\"></i></div></div>'});"
    + "document.getElementById('pScores').innerHTML=h||'<p class=\"mut\">暂无成绩数据</p>'});"
    + "function escH(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}"
    + "function line(k,v){return v?'<p><b>'+k+'：</b>'+escH(v)+'</p>':''}"
    + "var all=[],curSub='',curTab=0;"
    + "function setMastered(id,v){fetch('/api/mistake/mastered?id='+id,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mastered:v})}).then(function(){load()})}"
    + "function render(){"
    + "var todo=all.filter(function(m){return !m.mastered}),done=all.filter(function(m){return m.mastered});"
    + "document.getElementById('cTodo').textContent=todo.length;"
    + "document.getElementById('cDone').textContent=done.length;"
    + "var list=(curTab===0?todo:done);"
    + "if(curSub)list=list.filter(function(m){return m.subject===curSub});"
    + "var h='';list.forEach(function(m){"
    + "h+='<div class=\"card\"><p><b>'+escH(m.subject)+'</b> · 第 '+escH(m.question_no)+' 题 <span class=\"mut\">（得分 '+m.got_score+'/'+m.full_score+'）</span></p>';"
    + "h+=line('你的答案',m.student_answer)+line('正确答案',m.std_answer)+line('错因',m.error_type)+line('知识点',m.knowledge_point)+line('备注',m.note);"
    + "if(curTab===0){h+='<div style=\"margin-top:8px\"><button class=\"btn\" style=\"padding:8px 16px\" onclick=\"location.href=\\'/redo?id='+m.id+'\\'\">自己做一遍</button> <button class=\"chip\" data-done=\"'+m.id+'\">会了 ✓</button></div>'}"
    + "else{h+='<div style=\"margin-top:8px\"><button class=\"btn\" style=\"padding:8px 16px\" onclick=\"location.href=\\'/redo?id='+m.id+'\\'\">举一反三</button> <button class=\"chip\" data-undone=\"'+m.id+'\">不会</button></div>'}"
    + "h+='</div>'});"
    + "document.getElementById('list').innerHTML=h||'<p class=\"mut\" style=\"text-align:center\">'+(curTab===0?'这一科没有错题，继续保持':'这一栏还没有内容')+'</p>';"
    + "document.querySelectorAll('[data-done]').forEach(function(b){b.addEventListener('click',function(){if(confirm('确定已经掌握这道题了吗？'))setMastered(b.getAttribute('data-done'),1)})});"
    + "document.querySelectorAll('[data-undone]').forEach(function(b){b.addEventListener('click',function(){setMastered(b.getAttribute('data-undone'),0)})});"
    + "}"
    + "function load(){fetch('/api/mistakes').then(function(r){return r.json()}).then(function(d){all=d;render()})}"
    + "document.getElementById('tabTodo').addEventListener('click',function(){curTab=0;this.classList.add('on');document.getElementById('tabDone').classList.remove('on');render()});"
    + "document.getElementById('tabDone').addEventListener('click',function(){curTab=1;this.classList.add('on');document.getElementById('tabTodo').classList.remove('on');render()});"
    + "var cs=document.querySelectorAll('#chips .chip');cs.forEach(function(c){c.addEventListener('click',function(){"
    + "cs.forEach(function(x){x.classList.remove('on')});c.classList.add('on');curSub=c.getAttribute('data-s');render()})});"
    + "load();"
    + '</scr' + 'ipt>';
  return shell('错题本', '/mistakes', body);
}

/* 自己做一遍：原题 + 举一反三，做完对答案自评 */
function pageRedo(id) {
  const mid = String(id || '').replace(/[^0-9]/g, '') || '0';
  const body = ''
    + '<div class="card"><h2>自己做一遍</h2><div id="q"><p class="mut">加载中…</p></div></div>'
    + '<div class="card" id="simCard" style="display:none"><h2>举一反三</h2><div id="sim"></div><p class="mut" id="simEmpty" style="display:none">老师正在准备举一反三，下次来就有。</p></div>'
    + '<div class="card" id="ansCard" style="display:none"><h2>答案与讲解</h2><div id="ans"></div>'
    + '<div style="margin-top:12px"><button class="btn" id="okBtn">✅ 我做对了</button> '
    + '<button class="chip" id="noBtn" style="margin-left:8px">❌ 还没掌握</button></div></div>'
    + '<div class="card" id="actCard"><button class="btn" id="showAns">做完了，看答案</button> '
    + '<a href="/mistakes" style="margin-left:12px">返回错题本</a></div>'
    + '<script>'
    + "var MID='" + mid + "';"
    + "function escH(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}"
    + "function line(k,v){return v?'<p><b>'+k+'：</b>'+escH(v)+'</p>':''}"
    + "fetch('/api/mistake?id='+MID).then(function(r){return r.json()}).then(function(m){"
    + "if(m.error){document.getElementById('q').innerHTML='<p class=\"mut\">题目不存在</p>';return}"
    + "var h='<p><b>'+escH(m.subject)+'</b> · 第 '+escH(m.question_no)+' 题</p>';"
    + "if(m.upload_image){h+='<img src=\"/img/'+encodeURIComponent(m.upload_image)+'\" style=\"max-width:100%;border-radius:8px\">'}"
    + "h+=line('知识点',m.knowledge_point)+line('上次错因',m.error_type)+line('备注',m.note);"
    + "h+='<p class=\"mut\">先自己做一遍，做完点下面的「做完了，看答案」。</p>';"
    + "document.getElementById('q').innerHTML=h;"
    + "var sim=[];try{sim=JSON.parse(m.similar||'[]')}catch(e){sim=[]}"
    + "if(sim.length){var sh='';sim.forEach(function(s,i){"
    + "sh+='<p><b>举一反三 '+(i+1)+'：</b>'+escH(s.q)+'</p>';"
    + "sh+='<p class=\"simA\" style=\"display:none;color:#15803d\"><b>答案：</b>'+escH(s.a)+'</p>'});"
    + "document.getElementById('sim').innerHTML=sh;document.getElementById('simCard').style.display='block'}"
    + "else{document.getElementById('simCard').style.display='block';document.getElementById('simEmpty').style.display='block'}"
    + "window._ans=line('正确答案',m.std_answer)+line('讲解',m.note);"
    + "});"
    + "document.getElementById('showAns').addEventListener('click',function(){"
    + "document.getElementById('ans').innerHTML=window._ans||'<p class=\"mut\">暂无答案</p>';"
    + "document.getElementById('ansCard').style.display='block';"
    + "document.querySelectorAll('.simA').forEach(function(e){e.style.display='block'});"
    + "document.getElementById('actCard').style.display='none';"
    + "fetch('/api/mistake/redo?id='+MID,{method:'POST'});"
    + "});"
    + "document.getElementById('okBtn').addEventListener('click',function(){"
    + "fetch('/api/mistake/mastered?id='+MID,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mastered:1})})"
    + ".then(function(){location.href='/mistakes'})});"
    + "document.getElementById('noBtn').addEventListener('click',function(){"
    + "fetch('/api/mistake/mastered?id='+MID,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mastered:0})})"
    + ".then(function(){location.href='/mistakes'})});"
    + '</scr' + 'ipt>';
  return shell('自己做一遍', '/mistakes', body);
}

/* 学习报告页（家长看板，孩子可见） */
function pageParent() {
  const body = ''
    + '<div class="card"><h2>成绩看板 · 高一上第一次月考</h2><div id="pScores"><p class="mut">加载中…</p></div></div>'
    + '<div class="card"><h2>三个病根</h2>'
    + '<p><b>1. 概念地基有洞</b>——化学方程式从不配平、物理刹车不算停止时间、地理把"大气逆辐射"写成"反射"。不是粗心，是真不会。</p>'
    + '<p><b>2. 输出说不到点上</b>——政治"四个彻底结束"一个没写出来，历史江南农业关键词全缺。有话，但写不到得分点上。</p>'
    + '<p><b>3. 选择题暗坑</b>——地理错 10 题、生物错 7 题、化学错 6 题。拿回试卷后遮答案重做复盘。</p></div>'
    + '<div class="card"><p class="mut">以下数据来自孩子的练习与默写记录</p>'
    + '<h2>总览</h2><div id="total"><p class="mut">加载中…</p></div></div>'
    + '<div class="card"><h2>分科目分模式正确率</h2><div id="tbl" style="overflow-x:auto"></div></div>'
    + '<div class="card"><h2>近 14 天练习量</h2><div id="daily"><p class="mut">暂无数据</p></div></div>'
    + '<div class="card"><h2>最近 20 条记录</h2><div id="recent" style="overflow-x:auto"></div></div>'
    + '<div class="card"><h2>错题上传</h2><div id="ups"><p class="mut">加载中…</p></div></div>'
    + '<script>'
    + "fetch('/api/scores').then(function(r){return r.json()}).then(function(d){"
    + "var order=['语文','英语','数学','物理','历史','政治','生物','地理','化学'];"
    + "var map={};(d.scores||d).forEach(function(x){map[x.subject]=x});"
    + "var h='';order.forEach(function(s){var x=map[s];if(!x)return;"
    + "var pct=Math.round(x.score/x.full*100);"
    + "h+='<div style=\"margin:8px 0\"><div>'+s+' <b>'+x.score+'</b> / '+x.full+'（'+pct+'%）</div><div class=\"bar\"><i style=\"width:'+pct+'%\"></i></div></div>'});"
    + "document.getElementById('pScores').innerHTML=h||'<p class=\"mut\">暂无成绩数据</p>'});"
    + "function escH(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]})}"
    + "function modeName(m){return m==='practice'?'练习':(m==='dictation'?'默写':m)}"
    + "function dt(ts){var d=new Date(ts);return (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')}"
    + "fetch('/api/stats').then(function(r){return r.json()}).then(function(d){"
    + "var bs=d.by_subject||[],daily=d.daily||[],recent=d.recent||[];"
    + "var tp=0,tc=0,mp=0,mc=0;bs.forEach(function(x){tp+=x.attempts;tc+=x.correct;if(x.mode==='practice'){mp+=x.attempts}else if(x.mode==='dictation'){mc+=x.attempts}});"
    + "document.getElementById('total').innerHTML='<p style=\"font-size:18px\">总练习 <b>'+mp+'</b> 题 · 总默写 <b>'+mc+'</b> 条 · 总正确率 <b>'+(tp?Math.round(tc/tp*100):0)+'%</b></p>';"
    + "var h='<table><tr><th>科目</th><th>模式</th><th>次数</th><th>答对</th><th>正确率</th></tr>';"
    + "bs.forEach(function(x){var pct=x.attempts?Math.round(x.correct/x.attempts*100):0;"
    + "h+='<tr><td>'+escH(x.subject)+'</td><td>'+modeName(x.mode)+'</td><td>'+x.attempts+'</td><td>'+x.correct+'</td><td>'+pct+'%</td></tr>'});"
    + "h+='</table>';document.getElementById('tbl').innerHTML=h;"
    + "if(daily.length){var mx=0;daily.forEach(function(x){if(x.attempts>mx)mx=x.attempts});"
    + "var bh='<div class=\"db\">';daily.forEach(function(x){var hh=mx?Math.round(x.attempts/mx*100):4;"
    + "bh+='<div style=\"height:'+hh+'%\"><span>'+x.attempts+'</span></div>'});bh+='</div>';"
    + "bh+='<p class=\"mut\">'+daily[0].day+' ~ '+daily[daily.length-1].day+'</p>';"
    + "document.getElementById('daily').innerHTML=bh;}"
    + "var rh='<table><tr><th>时间</th><th>科目</th><th>模式</th><th>题目</th><th>结果</th></tr>';"
    + "recent.forEach(function(x){rh+='<tr><td>'+dt(x.ts)+'</td><td>'+escH(x.subject)+'</td><td>'+modeName(x.mode)+'</td><td>'+escH(x.ref_id)+'</td><td>'+(x.correct?'<span class=\"ok\">对</span>':'<span class=\"bad\">错</span>')+'</td></tr>'});"
    + "rh+='</table>';document.getElementById('recent').innerHTML=rh;"
    + "});"
    + "fetch('/api/uploads').then(function(r){return r.json()}).then(function(d){"
    + "var groups={},order=[];"
    + "d.forEach(function(u){var k=u.batch_id||('s'+u.id);if(!groups[k]){groups[k]=[];order.push(k)}groups[k].push(u)});"
    + "var h='';order.forEach(function(k){var us=groups[k];var u0=us[0];"
    + "var st=u0.status==='done'?'<span class=\"ok\">已分析</span>':(u0.status==='error'?'<span class=\"bad\">图片有问题</span>':'<span class=\"mut\">待分析</span>');"
    + "h+='<div class=\"card\" style=\"margin:8px 0\"><p><b>'+escH(u0.subject)+'</b> · '+dt(u0.ts)+' · '+st+(us.length>1?' · 共'+us.length+'张':'')+'</p>';"
    + "if(u0.note)h+='<p class=\"mut\">'+escH(u0.note)+'</p>';"
    + "us.forEach(function(u){h+='<a href=\"/img/'+encodeURIComponent(u.image_key)+'\" target=\"_blank\"><img src=\"/img/'+encodeURIComponent(u.image_key)+'\" style=\"max-width:100%;border-radius:8px;margin:6px 0\"></a>';"
    + "if(u.analysis)h+='<div class=\"explain\">'+escH(u.analysis)+'</div>'});"
    + "h+='</div>'});"
    + "document.getElementById('ups').innerHTML=h||'<p class=\"mut\">还没有上传</p>'});"
    + '</scr' + 'ipt>';
  return shell('学习报告', '', body);
}

/* ---------------- AI 问答：快问快答（Workers AI 同步）+ 深度回答（定时任务稍后写回） ---------------- */
/* R1 类推理模型会先输出 <think> 思考过程，只保留最终答案 */
const cleanQuick = (t) => {
  let s = String(t || '');
  const i = s.indexOf('</think>');
  if (i >= 0) s = s.slice(i + 8);
  return s.trim().slice(0, 2000);
};
async function quickAnswer(env, question, debug, history) {
  const models = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/openai/gpt-oss-120b', '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b'];
  const errs = [];
  const msgs = [
    { role: 'system', content: '你是高一学生的AI老师。直接回答问题：先给一句话结论，再给2-3步关键思路，200字以内。用中文。不要输出思考过程，不要以学生口吻说话，直接讲答案。如果学生纠正你，先承认再修正，不要重复错误答案。' },
  ];
  if (history) msgs.push(...history);
  msgs.push({ role: 'user', content: question });
  for (const m of models) {
    try {
      const r = await env.AI.run(m, {
        max_tokens: 500,
        messages: msgs,
      });
      const t = cleanQuick(r && r.response);
      if (t) return { text: t, errs };
      errs.push(m + ': empty, raw=' + JSON.stringify(r).slice(0, 200));
    } catch (e) { errs.push(m + ': ' + String((e && e.message) || e).slice(0, 160)); }
  }
  return { text: '', errs };
}
/* 看图快答：视觉模型读题；不可用则返回空，走深度批处理 */
async function quickAnswerVision(env, imageKey, question, historyText) {
  try {
    const obj = await env.R2.get(imageKey);
    if (!obj) return { text: '', err: 'R2 miss' };
    const buf = await obj.arrayBuffer();
    let prompt = '你是高一学生的AI老师。仔细看这张照片，看清楚细节再回答，不要猜测。如果是尺子、仪表等测量工具，务必读准起始刻度和结束刻度。';
    if (historyText) prompt += '以下是之前的对话，供参考：' + historyText;
    prompt += (question ? '学生现在问：' + question : '请描述这张照片的关键内容') + '。直接给出简洁回答：先给结论，再给2-3步关键思路，200字以内。用中文。';
    const r = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image: Array.from(new Uint8Array(buf)),
      prompt: prompt,
      max_tokens: 500,
    });
    const t = cleanQuick(r && r.response);
    return { text: t, err: t ? '' : 'empty, raw=' + JSON.stringify(r).slice(0, 200) };
  } catch (e) { return { text: '', err: String((e && e.message) || e).slice(0, 200) }; }
}
/* 繁体转简体（Whisper 常输出繁体） */
const T2S_MAP = {"學":"学","習":"习","說":"说","話":"话","讀":"读","寫":"写","開":"开","關":"关","門":"门","問":"问","題":"题","點":"点","頭":"头","體":"体","國":"国","園":"园","圖":"图","場":"场","塊":"块","聲":"声","時":"时","間":"间","動":"动","會":"会","來":"来","個":"个","們":"们","這":"这","為":"为","麼":"么","樣":"样","種":"种","類":"类","邊":"边","過":"过","達":"达","運":"运","靜":"静","麵":"面","發":"发","髮":"发","乾":"干","幹":"干","後":"后","裡":"里","錶":"表","鐘":"钟","鐵":"铁","銀":"银","銅":"铜","鋼":"钢","鉛":"铅","錄":"录","線":"线","網":"网","絡":"络","電":"电","腦":"脑","視":"视","頻":"频","親":"亲","愛":"爱","見":"见","覺":"觉","觀":"观","認":"认","識":"识","課":"课","試":"试","驗":"验","證":"证","議":"议","論":"论","語":"语","詞":"词","詩":"诗","畫":"画","聲":"声","遠":"远","近":"近","進":"进","遠":"远","選":"选","擇":"择","適":"适","應":"应","廣":"广","廠":"厂","歷":"历","壓":"压","參":"参","號":"号","單":"单","寫":"写","軍":"军","農":"农","冠":"冠","馮":"冯","馬":"马","鳥":"鸟","魚":"鱼","龍":"龙","龜":"龟","黃":"黄","黑":"黑","紅":"红","綠":"绿","藍":"蓝","頭":"头","買":"买","賣":"卖","費":"费","貴":"贵","貧":"贫","賬":"账","號":"号","碼":"码","車":"车","輛":"辆","轉":"转","輪":"轮","軟":"软","硬":"硬","盤":"盘","標":"标","準":"准","備":"备","複":"复","雜":"杂","雙":"双","單":"单","儘":"尽","盡":"尽","務":"务","勝":"胜","勞":"劳","勢":"势","勤":"勤","勸":"劝","勵":"励","邁":"迈","還":"还","這":"这","連":"连","週":"周","過":"过","道":"道","達":"达","違":"违","遠":"远","遺":"遗","遼":"辽","還":"还","邏":"逻","郵":"邮","鄉":"乡","鄧":"邓","鄭":"郑","鄰":"邻","醜":"丑","醫":"医","醬":"酱","釋":"释","裡":"里","重":"重","野":"野","量":"量","金":"金","釘":"钉","針":"针","釣":"钓","鈴":"铃","鐵":"铁","鐘":"钟","鑒":"鉴","門":"门","閃":"闪","閉":"闭","開":"开","閏":"闰","閒":"闲","間":"间","閙":"闹","閥":"阀","閣":"阁","閱":"阅","閱":"阅","陳":"陈","陸":"陆","陽":"阳","陰":"阴","階":"阶","際":"际","隨":"随","險":"险","隱":"隐","隻":"只","雙":"双","雜":"杂","雞":"鸡","難":"难","雲":"云","電":"电","霧":"雾","靈":"灵","靜":"静","面":"面","響":"响","頁":"页","頂":"顶","頃":"顷","項":"项","順":"顺","須":"须","預":"预","領":"领","頸":"颈","顆":"颗","題":"题","額":"额","顏":"颜","願":"愿","類":"类","顧":"顾","顯":"显","風":"风","飛":"飞","飄":"飘","館":"馆","馬":"马","驗":"验","驚":"惊","驕":"骄","高":"高","鬥":"斗","鬧":"闹","鬱":"郁","魚":"鱼","魯":"鲁","鮮":"鲜","鳥":"鸟","鳴":"鸣","鴻":"鸿","黃":"黄","齊":"齐"};
function t2s(s){return String(s||'').split('').map(function(ch){return T2S_MAP[ch]||ch}).join('')}
/* 语音转文字 */
async function apiAiTranscribe(env, req) {
  let form;
  try { form = await req.formData(); } catch (e) { return json({ error: '解析失败' }, 400); }
  const f = form.get('audio');
  if (!f || typeof f === 'string') return json({ error: '没有音频' }, 400);
  if (f.size > 5 * 1024 * 1024) return json({ error: '录音太长，请控制在60秒内' }, 400);
  try {
    const buf = await f.arrayBuffer();
    const r = await env.AI.run('@cf/openai/whisper', { audio: Array.from(new Uint8Array(buf)) });
    return json({ ok: true, text: t2s(String((r && r.text) || '').trim()) });
  } catch (e) {
    const msg = String((e && e.message) || e).slice(0, 200);
    if (req.url.includes('debug=1')) return json({ error: msg }, 500);
    return json({ error: '语音转文字暂不可用，请直接打字' }, 500);
  }
}
async function apiAiAsk(env, req, query) {
  const ct = req.headers.get('content-type') || '';
  let question = '', imageFile = null, sessionId = '';
  if (ct.includes('multipart/form-data')) {
    let form;
    try { form = await req.formData(); } catch (e) { return json({ error: '解析失败' }, 400); }
    question = String(form.get('question') || '').trim().slice(0, 2000);
    sessionId = String(form.get('session_id') || '').slice(0, 40);
    const f = form.get('image');
    if (f && typeof f !== 'string') imageFile = f;
  } else {
    const body = await readBody(req);
    question = String(body && body.question || '').trim().slice(0, 2000);
    sessionId = String(body && body.session_id || '').slice(0, 40);
  }
  if (!question && !imageFile) return json({ error: '问题不能为空' }, 400);
  let imageKey = '';
  if (imageFile) {
    const tp = imageFile.type || '';
    if (!tp.startsWith('image/')) return json({ error: '只能上传图片' }, 400);
    if (imageFile.size > 10 * 1024 * 1024) return json({ error: '图片不能超过 10MB' }, 400);
    const ext = tp === 'image/png' ? 'png' : tp === 'image/webp' ? 'webp' : 'jpg';
    imageKey = 'q/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    await env.R2.put(imageKey, imageFile.stream(), { httpMetadata: { contentType: tp } });
  }
  // 取同会话最近历史做上下文（最多4轮）
  let histMsgs = [], histText = '', sessImageKey = '';
  if (sessionId) {
    try {
      const hr = await env.DB.prepare(
        'SELECT question, answer, image_key FROM ai_chats WHERE session_id=? ORDER BY id DESC LIMIT 4'
      ).bind(sessionId).all();
      const rows = (hr.results || []).reverse();
      rows.forEach(function(rw) {
        if (rw.question) histMsgs.push({ role: 'user', content: String(rw.question).slice(0, 500) });
        if (rw.answer) histMsgs.push({ role: 'assistant', content: String(rw.answer).slice(0, 500) });
        if (rw.image_key && !sessImageKey) sessImageKey = rw.image_key;
      });
      histText = rows.map(function(rw){ return '问:' + String(rw.question||'').slice(0,200) + ' 答:' + String(rw.answer||'').slice(0,200); }).join('\n');
    } catch (e) {}
  }
  // 纯文字追问但会话里有图：带上最近的图一起看
  const visionKey = imageKey || sessImageKey;
  let quick = '', visionErr = '';
  if (visionKey) { const v = await quickAnswerVision(env, visionKey, question, histText); quick = v.text; visionErr = v.err; }
  // 视觉失败时降级：有文字问题就用纯文字快答，避免无限 pending
  let fallbackNote = '';
  if (!quick && question) {
    const t = await quickAnswer(env, question, null, histMsgs.length ? histMsgs : null);
    if (t.text) { quick = t.text; if (imageKey) fallbackNote = '（注：图片暂时看不了，先按你的文字回答）\n'; }
  }
  let st, finalAnswer;
  if (quick) { st = 'answered'; finalAnswer = fallbackNote + quick; }
  else {
    st = 'pending';
    finalAnswer = imageKey
      ? '图片收到了，但我现在看不了图。请把题目打字发给我，我直接给你讲。'
      : '这个问题暂时答不上来，稍后再试。';
  }
  if (!sessionId) sessionId = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r = await env.DB.prepare(
    'INSERT INTO ai_chats (ts, question, answer, image_key, status, session_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(Date.now(), question, finalAnswer, imageKey, st, sessionId).run();
  const out = { ok: true, id: r.meta.last_row_id, answer: finalAnswer, pending: false, session_id: sessionId };
  if (query && query.get('debug')) out.debug = visionErr || 'ok';
  return json(out);
}

async function apiAiHistory(env, query) {
  const sid = query ? String(query.get('session') || '').slice(0, 40) : '';
  let r;
  if (sid) {
    r = await env.DB.prepare(
      'SELECT id, ts, question, answer, deep_answer, image_key, status, session_id FROM ai_chats WHERE session_id=? ORDER BY id ASC LIMIT 100'
    ).bind(sid).all();
  } else {
    r = await env.DB.prepare(
      'SELECT id, ts, question, answer, deep_answer, image_key, status, session_id FROM ai_chats ORDER BY id DESC LIMIT 30'
    ).all();
    r.results = (r.results || []).reverse();
  }
  return json(r.results || []);
}

async function apiAiSessions(env) {
  const r = await env.DB.prepare(
    `SELECT session_id, MIN(ts) as first_ts, MAX(ts) as last_ts, COUNT(*) as cnt,
     SUM(CASE WHEN deep_answer IS NOT NULL AND deep_answer<>'' THEN 1 ELSE 0 END) as deep_cnt,
     (SELECT question FROM ai_chats a2 WHERE a2.session_id=a.session_id ORDER BY id ASC LIMIT 1) as title
     FROM ai_chats a WHERE session_id<>'' GROUP BY session_id ORDER BY last_ts DESC LIMIT 30`
  ).all();
  return json(r.results || []);
}

/* ---------------- 错题上传 ---------------- */
async function apiUpload(env, req) {
  let form;
  try { form = await req.formData(); } catch (e) { return json({ error: '解析上传失败' }, 400); }
  const files = form.getAll('image').filter(f => f && typeof f !== 'string');
  const subject = String(form.get('subject') || '');
  const note = String(form.get('note') || '');
  const batchId = String(form.get('batch_id') || '');
  if (!files.length) return json({ error: '请选择图片' }, 400);
  if (files.length > 10) return json({ error: '一次最多传 10 张' }, 400);
  const ids = [];
  for (const file of files) {
    const ctype = file.type || '';
    if (!ctype.startsWith('image/')) return json({ error: '只能上传图片' }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: '单张图片不能超过 10MB' }, 400);
    const ext = ctype === 'image/png' ? 'png' : ctype === 'image/webp' ? 'webp' : ctype === 'image/gif' ? 'gif' : 'jpg';
    const key = 'u/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    await env.R2.put(key, file.stream(), { httpMetadata: { contentType: ctype } });
    const r = await env.DB.prepare(
      'INSERT INTO uploads (ts, subject, note, image_key, status, batch_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(Date.now(), subject, note.slice(0, 500), key, 'pending', batchId).run();
    ids.push(r.meta.last_row_id);
  }
  return json({ ok: true, ids, count: ids.length });
}

async function apiUploads(env) {
  const r = await env.DB.prepare(
    'SELECT id, ts, subject, note, image_key, status, analysis, COALESCE(batch_id,\'\') as batch_id FROM uploads ORDER BY id DESC LIMIT 60'
  ).all();
  return json(r.results || []);
}

async function serveImg(env, key) {
  if (!key || !(key.startsWith('u/') || key.startsWith('q/')) || key.includes('..')) return new Response('Not Found', { status: 404 });
  const obj = await env.R2.get(key);
  if (!obj) return new Response('Not Found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
}

async function serveVideo(env, req, name) {
  if (!name || name.includes('..') || name.includes('/')) return new Response('Not Found', { status: 404 });
  const key = 'video/' + name;
  const types = { mp4: 'video/mp4', vtt: 'text/vtt; charset=utf-8', srt: 'text/plain; charset=utf-8' };
  const ext = name.split('.').pop().toLowerCase();
  const headers = new Headers();
  headers.set('content-type', types[ext] || 'application/octet-stream');
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', ext === 'mp4' ? 'public, max-age=86400' : 'public, max-age=3600');
  const range = req.headers.get('range');
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      const r = {};
      if (m[1] === '') { r.suffix = parseInt(m[2], 10); }
      else { r.offset = parseInt(m[1], 10); if (m[2] !== '') r.length = parseInt(m[2], 10) - r.offset + 1; }
      const obj = await env.R2.get(key, { range: r });
      if (!obj) return new Response('Not Found', { status: 404 });
      const total = obj.size;
      const off = obj.range && obj.range.offset != null ? obj.range.offset : (r.offset || 0);
      const len = obj.range && obj.range.length != null ? obj.range.length : total - off;
      headers.set('content-range', 'bytes ' + off + '-' + (off + len - 1) + '/' + total);
      headers.set('content-length', String(len));
      return new Response(obj.body, { status: 206, headers });
    }
  }
  const obj = await env.R2.get(key);
  if (!obj) return new Response('Not Found', { status: 404 });
  headers.set('content-length', String(obj.size));
  return new Response(obj.body, { headers });
}

async function serveSpa(env, key, type, cache) {
  const obj = await env.R2.get(key);
  if (!obj) return null;
  const headers = new Headers();
  headers.set('content-type', type);
  headers.set('cache-control', cache);
  return new Response(obj.body, { headers });
}

/* ---------------- 路由 ---------------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const q = url.searchParams;
    /* 天铄学习站子路径转发（2026-10-23 加）：/ts/* 经服务绑定转 tianshuo-study Worker，天娅站原有路由不受影响 */
    if ((path === '/ts' || path.startsWith('/ts/')) && env.TIANSHUO) {
      const tu = new URL(url.toString());
      tu.pathname = path.slice(3) || '/';
      return env.TIANSHUO.fetch(new Request(tu.toString(), req));
    }
    try {
      if (path === '/api/scores') return apiScores(env);
      if (path === '/api/practice/subjects') return apiPracticeSubjects(env);
      if (path === '/api/practice/questions') return apiPracticeQuestions(env, q.get('subject'));
      if (path === '/api/practice/check' && req.method === 'POST') return apiPracticeCheck(env, await readBody(req));
      if (path === '/api/dictation/sets') return apiDictationSets(env);
      if (path === '/api/dictation/items') return apiDictationItems(env, q.get('set'));
      if (path === '/api/dictation/check' && req.method === 'POST') return apiDictationCheck(env, await readBody(req));
      if (path === '/api/path-event' && req.method === 'POST') return apiPathEvent(env, await readBody(req));
      if (path === '/api/path-summary') return apiPathSummary(env);
      if (path === '/api/login' && req.method === 'POST') return apiLogin(env, await readBody(req));
      if (path === '/api/usage' && req.method === 'POST') return apiUsage(env, await readBody(req));
      if (path === '/api/state' && req.method === 'POST') return apiStateSave(env, await readBody(req));
      if (path === '/api/state' && req.method === 'GET') return apiStateLoad(env, q);
      if (path === '/admin-usage') return apiUsageAdmin(env, q);
      if (path === '/api/mistakes') return apiMistakes(env, q.get('subject'));
      if (path === '/api/mistake' && req.method === 'GET') return apiMistakeDetail(env, q.get('id'));
      if (path === '/api/mistake/mastered' && req.method === 'POST') return apiMistakeMastered(env, q.get('id'), await readBody(req));
      if (path === '/api/mistake/redo' && req.method === 'POST') return apiMistakeRedo(env, q.get('id'));
      if (path === '/redo') return html(pageRedo(q.get('id')));
      if (path === '/api/stats') return apiStats(env);
      if (path === '/api/upload' && req.method === 'POST') return apiUpload(env, req);
      if (path === '/api/uploads') return apiUploads(env);
      if (path === '/api/ai/ask' && req.method === 'POST') return apiAiAsk(env, req, q);
      if (path === '/api/ai/transcribe' && req.method === 'POST') return apiAiTranscribe(env, req);
      if (path === '/api/ai/history') return apiAiHistory(env, q);
      if (path === '/api/ai/sessions') return apiAiSessions(env);
      if (path.startsWith('/img/')) return serveImg(env, decodeURIComponent(path.slice(5)));
      if (path.startsWith('/video/')) return serveVideo(env, req, decodeURIComponent(path.slice(7)));
      /* GitHub 版 SPA 同步（2026-10-31）：根路径与 data.js / img.js 走 R2 的 spa/ 前缀（文件与 GitHub Pages 线上版同源，内含 51LA 统计与三事件埋点）；R2 缺失时根路径回退旧首页 */
      if (path === '/' || path === '/index.html') { const r = await serveSpa(env, 'spa/index.html', 'text/html; charset=utf-8', 'no-cache'); if (r) return r; if (path === '/index.html') return new Response('Not Found', { status: 404 }); }
      if (/^\/[a-z0-9-]+\.js$/.test(path)) { const r = await serveSpa(env, 'spa' + path, 'application/javascript; charset=utf-8', 'public, max-age=3600'); if (r) return r; return new Response('Not Found', { status: 404 }); }
      if (path.startsWith('/widgets/') && /^\/widgets\/[a-z0-9-]+\.html$/.test(path)) { const r = await serveSpa(env, 'spa' + path, 'text/html; charset=utf-8', 'public, max-age=3600'); if (r) return r; return new Response('Not Found', { status: 404 }); }
      /* 月考错题复习页（2026-11-16）：单文件复习页走 R2 的 spa/review/ 前缀；no-cache——复习页随归因更新而改版，旧版缓存会让孩子看到绿头老页 */
      if (path.startsWith('/review/') && /^\/review\/[a-z0-9-]+\.html$/.test(path)) { const r = await serveSpa(env, 'spa' + path, 'text/html; charset=utf-8', 'no-cache'); if (r) return r; return new Response('Not Found', { status: 404 }); }
      /* PWA（2026-11-14）：manifest 与图标走 R2 的 spa/ 前缀 */
      if (path === '/manifest.json') { const r = await serveSpa(env, 'spa/manifest.json', 'application/manifest+json', 'public, max-age=3600'); if (r) return r; return new Response('Not Found', { status: 404 }); }
      if (path.startsWith('/icons/') && /^\/icons\/[a-z0-9-]+\.png$/.test(path)) { const r = await serveSpa(env, 'spa' + path, 'image/png', 'public, max-age=86400'); if (r) return r; return new Response('Not Found', { status: 404 }); }
      if (path === '/') return html(pageHome());
      if (path === '/practice') return html(pagePractice());
      if (path === '/dictation') return html(pageDictation());
      if (path === '/mistakes') return html(pageMistakes());
      if (path === '/upload') return html(pageUpload());
      if (path === '/ai') return html(pageAi());
      if (path === '/parent') return html(pageParent());
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return json({ error: '服务器错误' }, 500);
    }
  },
};
