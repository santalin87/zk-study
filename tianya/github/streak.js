/* 打卡 / 连续学习系统 V1+V2（2026-11-12，手写，不引任何库与克隆仓）
   规则来源：打卡研究报告 §4（Duolingo 冻结/补卡模式 + 懒滚动 + 徽章档位）。
   打卡 = 当天完成任一：复习≥10 张闪卡 / 完成 1 节五档自评 / 完成 1 次 3 题小测。
   没有可空点的“打卡”按钮：只在三个学习动作的完成回调里调用。
   云端同步：状态存 localStorage 'ty_streak'，随 SYNC_KEYS 里的 ty_streak 经 /api/state 整包同步。
   时区：一律 Asia/Shanghai；禁用 toISOString().slice(0,10)。
   不做：联赛、宝石商店、扣血/爱心、XP/等级（V3 再说）。 */
var Streak = (function () {
  var TZ = 'Asia/Shanghai';
  var KEY = 'ty_streak';
  var BADGES = [
    { id: 'first_day', days: 1, icon: '🌱', name: '初露锋芒' },
    { id: 'streak_3', days: 3, icon: '🔥', name: '三日渐热' },
    { id: 'streak_7', days: 7, icon: '🔥🔥', name: '一周坚持' },
    { id: 'streak_14', days: 14, icon: '💪', name: '两周不辍' },
    { id: 'streak_30', days: 30, icon: '🏅', name: '一月之星' },
    { id: 'streak_60', days: 60, icon: '🚀', name: '六十天征途' },
    { id: 'streak_100', days: 100, icon: '👑', name: '百日筑基' },
    { id: 'streak_180', days: 180, icon: '🏆', name: '半年磨剑' },
    { id: 'streak_365', days: 365, icon: '🎓', name: '高考倒计时 365' }
  ];
  function todayStr(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d || new Date()); }
  function hourMin() { var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':'); return { h: parseInt(p[0], 10), m: parseInt(p[1], 10) }; }
  function dayDiff(a, b) { var pa = a.split('-').map(Number), pb = b.split('-').map(Number); return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000); }
  function addDays(ds, n) { var p = ds.split('-').map(Number); return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date(Date.UTC(p[0], p[1] - 1, p[2] + n))); }
  function blank() { return { v: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: '', checkinDates: [], frozenDates: [], makeupDates: [], freezes: 0, freezesEarnedAt: 0, makeupsLeft: 1, makeupsResetMonth: '', lastMakeupDate: '', badges: [], badgeEarnedAt: {}, todayCards: [], todayCardsDate: '', todayQuiz: 0, todayQuizDate: '', pendingBreak: null, makeupArmed: false }; }
  function load() { try { var v = localStorage.getItem(KEY); if (v) { var s = JSON.parse(v); if (s && typeof s === 'object') return s; } } catch (e) {} return blank(); }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} try { if (window.__tySyncHook) window.__tySyncHook(KEY); } catch (e) {} }
  function toast(msg) {
    try {
      var olds = document.querySelectorAll('#streakToast');
      if (olds.length > 1) olds[0].remove();
      var d = document.createElement('div'); d.id = 'streakToast'; d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#111827;color:#fff;padding:12px 18px;border-radius:12px;font-size:15px;z-index:300;max-width:86%;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)';
      document.body.appendChild(d);
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 4000);
    } catch (e) {}
  }
  function rollover(s, today) {
    if (s.todayCardsDate !== today) { s.todayCards = []; s.todayCardsDate = today; }
    if (s.todayQuizDate !== today) { s.todayQuiz = 0; s.todayQuizDate = today; }
  }
  function checkBadges(s) {
    var fresh = [];
    BADGES.forEach(function (b) { if (s.currentStreak >= b.days && s.badges.indexOf(b.id) < 0) { s.badges.push(b.id); s.badgeEarnedAt[b.id] = todayStr(); fresh.push(b); } });
    if (fresh.length) toast('🏅 新徽章：' + fresh.map(function (b) { return b.icon + b.name; }).join('、'));
  }
  function earnFreezes(s) {
    var got = 0;
    while (s.currentStreak - s.freezesEarnedAt >= 7 && s.freezes < 2) { s.freezes++; s.freezesEarnedAt += 7; got++; }
    if (got) toast('连续 ' + s.currentStreak + ' 天！获得 ' + got + ' 张冻结卡 ❄️（共 ' + s.freezes + ' 张）');
  }
  /* 核心：学习动作完成时调用一次。同一天重复调用无变化；次日 +1；断档按冻结/补卡流程走。 */
  function recordStudyActivity(s, today) {
    if (s.lastActiveDate === today) return false;
    var gap = s.lastActiveDate ? dayDiff(s.lastActiveDate, today) : Infinity;
    if (gap === 1) { s.currentStreak += 1; }
    else if (gap > 1) {
      var missed = gap - 1, i;
      if (s.freezes >= missed) {
        for (i = 1; i <= missed; i++) s.frozenDates.push(addDays(today, -i));
        s.freezes -= missed; s.currentStreak += 1;
        toast('❄️ 冻结卡自动保住了连续纪录（用了 ' + missed + ' 张，还剩 ' + s.freezes + ' 张）');
      } else {
        if (missed === 1 && !s.pendingBreak) s.pendingBreak = { missedDate: addDays(today, -1), streakBefore: s.currentStreak };
        if (s.makeupArmed && s.pendingBreak && dayDiff(s.pendingBreak.missedDate, today) > 2) { s.pendingBreak = null; s.makeupArmed = false; }
        s.currentStreak = 1;
      }
    } else { s.currentStreak = 1; }
    s.lastActiveDate = today;
    if (s.checkinDates.indexOf(today) < 0) s.checkinDates.push(today);
    if (s.checkinDates.length > 365) s.checkinDates = s.checkinDates.slice(s.checkinDates.length - 365);
    if (s.currentStreak > s.longestStreak) s.longestStreak = s.currentStreak;
    earnFreezes(s); checkBadges(s);
    return true;
  }
  function noteCardReviewed(id) {
    try {
      var s = load(), today = todayStr(); rollover(s, today);
      if (s.todayCards.indexOf(id) < 0) s.todayCards.push(id);
      var done = false;
      if (s.todayCards.length >= 10) done = recordStudyActivity(s, today);
      save(s); updateHeader();
      if (s.makeupArmed && s.todayCards.length >= 15) tryMakeupRestore();
      if (done) toast('✅ 今天已打卡！连续 ' + s.currentStreak + ' 天 🔥');
    } catch (e) {}
  }
  function noteSelfAssessed(uid) {
    try {
      var s = load(), today = todayStr(); rollover(s, today);
      var done = recordStudyActivity(s, today);
      save(s); updateHeader();
      if (done) toast('✅ 今天已打卡！连续 ' + s.currentStreak + ' 天 🔥');
    } catch (e) {}
  }
  function noteQuizAnswered() {
    try {
      var s = load(), today = todayStr(); rollover(s, today);
      s.todayQuiz += 1;
      var done = false;
      if (s.todayQuiz >= 3) done = recordStudyActivity(s, today);
      save(s); updateHeader();
      if (s.makeupArmed && s.todayQuiz >= 5) tryMakeupRestore();
      if (done) toast('✅ 今天已打卡！连续 ' + s.currentStreak + ' 天 🔥');
    } catch (e) {}
  }
  /* 补卡：断后 48 小时内、完成补课任务（15 张卡或 5 道题）后恢复断前数值。每月 1 张，两次补卡至少间隔 7 天。 */
  function tryMakeupRestore() {
    try {
      var s = load(), today = todayStr();
      if (!s.makeupArmed || !s.pendingBreak) return false;
      if (s.makeupsLeft <= 0) return false;
      if (dayDiff(s.pendingBreak.missedDate, today) > 2) { s.pendingBreak = null; s.makeupArmed = false; save(s); return false; }
      if (s.lastMakeupDate && dayDiff(s.lastMakeupDate, today) < 7) return false;
      s.makeupsLeft -= 1; s.lastMakeupDate = today;
      s.makeupDates.push(s.pendingBreak.missedDate);
      s.currentStreak = s.pendingBreak.streakBefore + 1;
      s.lastActiveDate = today;
      if (s.checkinDates.indexOf(today) < 0) s.checkinDates.push(today);
      if (s.currentStreak > s.longestStreak) s.longestStreak = s.currentStreak;
      s.pendingBreak = null; s.makeupArmed = false;
      earnFreezes(s); checkBadges(s);
      save(s); updateHeader();
      toast('🩹 补卡成功！连续纪录恢复到 ' + s.currentStreak + ' 天');
      refreshCard();
      return true;
    } catch (e) { return false; }
  }
  function useMakeup() {
    try {
      var s = load(), today = todayStr();
      if (!s.pendingBreak) return;
      if (s.makeupsLeft <= 0) { toast('本月补卡已用完，下个月 1 号会再发 1 张'); return; }
      if (dayDiff(s.pendingBreak.missedDate, today) > 2) { toast('补卡过期了（断后 48 小时内可用），重新开始攒吧'); s.pendingBreak = null; s.makeupArmed = false; save(s); refreshCard(); return; }
      if (s.lastMakeupDate && dayDiff(s.lastMakeupDate, today) < 7) { toast('补卡两次至少间隔 7 天，这次先重新开始攒吧'); return; }
      s.makeupArmed = true; save(s);
      toast('补卡已就位：今天复习 15 张卡或答 5 道题，就能恢复连续 ' + s.pendingBreak.streakBefore + ' 天');
      refreshCard();
    } catch (e) {}
  }
  function giveUpBreak() {
    try { var s = load(); s.pendingBreak = null; s.makeupArmed = false; save(s); refreshCard(); } catch (e) {}
  }
  /* 读时结算（页面加载时调用，无定时任务）：每月 1 日重置补卡；冻结自动抵扣；断档生成待补卡状态。 */
  function settleOnLoad() {
    try {
      var s = load(), today = todayStr(), changed = false;
      var month = today.slice(0, 7);
      if (s.makeupsResetMonth !== month) { s.makeupsLeft = 1; s.makeupsResetMonth = month; changed = true; }
      rollover(s, today);
      if (s.lastActiveDate && s.lastActiveDate !== today) {
        var gap = dayDiff(s.lastActiveDate, today);
        if (gap >= 2) {
          var missed = gap - 1, i;
          if (s.freezes >= missed) {
            for (i = 1; i <= missed; i++) s.frozenDates.push(addDays(today, -i));
            s.freezes -= missed; s.lastActiveDate = addDays(today, -1); changed = true;
          } else if (missed === 1) {
            if (!s.pendingBreak) { s.pendingBreak = { missedDate: addDays(today, -1), streakBefore: s.currentStreak }; changed = true; }
            if (s.currentStreak !== 1) { s.currentStreak = 1; changed = true; }
          } else {
            if (s.currentStreak !== 1) { s.currentStreak = 1; changed = true; }
            if (s.pendingBreak) { s.pendingBreak = null; s.makeupArmed = false; changed = true; }
          }
        }
      }
      if (s.pendingBreak && dayDiff(s.pendingBreak.missedDate, today) > 2) { s.pendingBreak = null; s.makeupArmed = false; changed = true; }
      if (changed) save(s);
      updateHeader();
      return s;
    } catch (e) { return load(); }
  }
  function view() {
    var s = load(), today = todayStr();
    var hm = hourMin();
    return { s: s, today: today, doneToday: s.lastActiveDate === today, hour: hm.h, minsLeft: (23 - hm.h) * 60 + (59 - hm.m) };
  }
  function attendance30(s, today) {
    var from = addDays(today, -29), n = 0, i, d, has = {};
    s.checkinDates.forEach(function (x) { has[x] = 1; });
    s.frozenDates.forEach(function (x) { has[x] = 1; });
    s.makeupDates.forEach(function (x) { has[x] = 1; });
    for (i = 0; i < 30; i++) { d = addDays(from, i); if (has[d]) n++; }
    return n;
  }
  function heatmapHtml(s, today) {
    var dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7; /* 0=周一 */
    var start = addDays(today, -(15 * 7 + dow));
    var has = {}, fr = {}, mk = {};
    s.checkinDates.forEach(function (x) { has[x] = 1; });
    s.frozenDates.forEach(function (x) { fr[x] = 1; });
    s.makeupDates.forEach(function (x) { mk[x] = 1; });
    var cells = '', i, d, cls, tip;
    for (i = 0; i < 112; i++) {
      d = addDays(start, i);
      cls = 'hm0'; tip = d;
      if (mk[d]) { cls = 'hmM'; tip = d + ' · 补卡恢复'; }
      else if (fr[d]) { cls = 'hmF'; tip = d + ' · 冻结卡保住'; }
      else if (has[d]) { cls = 'hm1'; tip = d + ' · 已打卡'; }
      if (d === today) cls += ' hmT';
      cells += '<div class="hm ' + cls + '" title="' + tip + '"></div>';
    }
    return '<div class="hmgrid">' + cells + '</div><p class="mut" style="margin:6px 0 0"><span style="color:#22c55e">■</span> 打过卡 &nbsp;<span style="color:#38bdf8">■</span> 冻结卡保住 &nbsp;<span style="color:#f59e0b">■</span> 补卡恢复 &nbsp;<span style="color:#cbd5e1">■</span> 没打卡</p>';
  }
  function cardHtml() {
    var v = view(), s = v.s, h = '';
    h += '<div class="card" style="border:2px solid #f97316">';
    h += '<h2 style="margin-top:0">🔥 连续打卡 <b style="color:#ea580c">' + s.currentStreak + '</b> 天</h2>';
    h += '<p style="margin:4px 0">最长纪录 ' + s.longestStreak + ' 天 · ❄️ 冻结卡 ' + s.freezes + ' / 2 张 · 🩹 本月补卡剩 ' + s.makeupsLeft + ' 张</p>';
    h += '<p style="margin:4px 0">' + (v.doneToday ? '今天已打卡 ✅ 明天继续，就能到 ' + (s.currentStreak + 1) + ' 天。' : '今天还没打卡：复习 10 张卡，或完成 1 节自评，或答 3 道题，任意一个就行。') + '</p>';
    if (!v.doneToday && v.hour >= 20) {
      h += '<div class="streak-banner' + (v.minsLeft <= 90 ? ' urgent' : '') + '">⏰ 今天还没打卡，连续 ' + s.currentStreak + ' 天将在 ' + Math.floor(v.minsLeft / 60) + ' 小时 ' + (v.minsLeft % 60) + ' 分钟后结束。做 10 张卡就能保住。</div>';
    }
    if (s.pendingBreak) {
      h += '<div class="streak-recover"><b>昨天漏了一天。</b>断之前是连续 ' + s.pendingBreak.streakBefore + ' 天。';
      if (s.makeupArmed) {
        h += '<br>补卡已就位：今天再复习 ' + Math.max(0, 15 - s.todayCards.length) + ' 张卡（已复习 ' + s.todayCards.length + ' 张），或答 ' + Math.max(0, 5 - s.todayQuiz) + ' 道题，就能恢复。';
      } else {
        h += '<br><button class="btn" data-streak="makeup" style="width:auto;padding:9px 16px;margin:8px 8px 0 0">用补卡恢复（本月剩 ' + s.makeupsLeft + ' 张）</button><button class="btn gray" data-streak="giveup" style="width:auto;padding:9px 16px;margin:8px 0 0">重新开始攒</button>';
      }
      h += '</div>';
    }
    var att = attendance30(s, v.today);
    h += '<p style="margin:8px 0 2px">近 30 天出勤 <b>' + att + ' / 30</b>（' + Math.round(att / 30 * 100) + '%）· 断一次也不怕，出勤率只掉一点。</p>';
    h += heatmapHtml(s, v.today);
    h += '<p style="margin:10px 0 4px"><b>徽章</b></p><div class="badges">';
    BADGES.forEach(function (b) {
      var got = s.badges.indexOf(b.id) >= 0;
      h += '<div class="badge' + (got ? ' got' : '') + '">' + b.icon + '<br>' + b.name + '<br><span>' + (got ? '已获得' : '连续 ' + s.currentStreak + ' / ' + b.days + ' 天') + '</span></div>';
    });
    h += '</div><p class="mut" style="margin:6px 0 0">打卡只算真学习：复习卡片、自评、做题才算，点按钮不算。冻结卡每满 7 天挣 1 张（上限 2 张），漏 1 天自动用掉；补卡每月 1 张，断后 48 小时内可用。</p>';
    h += '</div>';
    return h;
  }
  function updateHeader() {
    try {
      var el = document.getElementById('streakFlame'); if (!el) return;
      var s = load(), today = todayStr();
      var done = s.lastActiveDate === today;
      el.textContent = '🔥 ' + s.currentStreak + '天' + (done ? ' ✅' : '') + (s.freezes ? ' ❄️×' + s.freezes : '');
    } catch (e) {}
  }
  function bindCard() {
    try {
      var card = document.getElementById('streakCard'); if (!card) return;
      card.querySelectorAll('[data-streak]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-streak');
          if (k === 'makeup') useMakeup();
          else if (k === 'giveup') giveUpBreak();
        });
      });
    } catch (e) {}
  }
  function refreshCard() {
    try { var card = document.getElementById('streakCard'); if (!card) return; card.innerHTML = cardHtml(); bindCard(); } catch (e) {}
  }
  return { settleOnLoad: settleOnLoad, updateHeader: updateHeader, cardHtml: cardHtml, refreshCard: refreshCard, bindCard: bindCard, noteCardReviewed: noteCardReviewed, noteSelfAssessed: noteSelfAssessed, noteQuizAnswered: noteQuizAnswered, useMakeup: useMakeup, _load: load, _todayStr: todayStr, _dayDiff: dayDiff };
})();
