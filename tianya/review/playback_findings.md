# 错题复习页 · 视频时间点跳转调查结论

调查日期：2026-11-16。只做调查，未改任何现有文件。
线上站：`https://tianya-study.santalin87.workers.dev`（另经 nginx 反代 `20110419.xyz`，本次未核对 nginx 配置，以下链接示例一律用 workers.dev 域名）。

## 结论（先看这三条）

1. **B 站嵌入：`t` 参数可用，单位是秒，不用改站内代码。** B 站外链播放器官方文档明确写了 `t`（number）：「跳转到媒体的初始时间点，单位：秒」。站内 iframe 现在是写死不带 `t` 的，但复习页完全可以自己拼一个带 `t` 的 `player.bilibili.com/player.html` 链接/iframe 直接用，不依赖站内代码。
2. **自托管视频：最稳的方案是复习页自己放一个 `<video>`，不要只给一个裸链接。** 写法：`<video src="…/video/m1.mp4#t=147">`，再加 JS 兜底——等 `loadedmetadata` 触发后设 `video.currentTime = 147`。这样在 Chrome / Edge / Firefox / Safari 的页面内播放基本都稳。**只给一个 `…mp4#t=147` 裸链接让手机浏览器地址栏打开，是「可能行、不保证」**：媒体片段 `#t=` 在 `<video src>` 里是标准行为，但直接在地址栏打开时各浏览器表现不一（见证据 §5），不能当主方案。
3. **想「链回站内课页、让课页自动跳到某秒」：现在做不到，必须改站内代码。** 站内 SPA 根本没有「课的 URL」——课的状态只存在内存变量里，刷新就丢，URL 里也没有任何时间参数。最小改动见 §6。

| 复习页想达到的效果 | 能否直接做 | 是否要改站内代码 |
|---|---|---|
| B 站视频跳到某秒（复习页自己嵌 iframe 或外链） | 能，直接拼带 `t` 的 player.html | 否 |
| 自托管视频跳到某秒（复习页自己嵌 `<video>`） | 能，`#t=` + `currentTime` 兜底 | 否 |
| 自托管视频跳到某秒（只给一个 mp4 裸链接） | 不稳，别当主方案 | 否（但效果不保证） |
| 链到站内课页、课页打开就跳到某秒 | 不能，站内没有课的 URL、也不读任何时间参数 | **是**（见 §6） |

---

## 1. B 站嵌入：`t` 参数可用，单位秒

### 站内现状：iframe 写死，不带 `t`

站内两处渲染 B 站视频的代码，src 都是只拼 `bvid + page + high_quality=1`，没有 `t`：

- `~/workspace/study/github/index.html:1180`（线上 9 科站的课页渲染，`renderUnit` 内）：
  ```js
  h+='<div class="vidbox"><iframe src="https://player.bilibili.com/player.html?bvid='+u.video.bvid+'&page='+u.video.p+'&high_quality=1" allowfullscreen loading="lazy"></iframe></div>'
  ```
- `~/workspace/study/github-repo/tianya/index.html:849`（数学单科旧快照，同款写法）：
  ```js
  +'<div class="vidbox"><iframe src="https://player.bilibili.com/player.html?bvid='+u.video.bvid+'&page='+u.video.p+'&high_quality=1" allowfullscreen loading="lazy"></iframe></div>'
  ```

### 官方依据：`t` 是秒

B 站外链播放器官方使用说明（`https://player.bilibili.com`，2026-11-16 实查）：

| 参数名 | 类型 | 说明 |
|---|---|---|
| `bvid` | `string` | UGC 视频 ID（必填，aid、bvid 选其一） |
| `p` | `number` | 多 P 视频的集数，从 1 开始计数 |
| `t` | `number` | **跳转到媒体的初始时间点，单位：秒** |
| `autoplay` / `muted` | `boolean` | 自动播放 / 静音 |

注意两点：

- `t` 只定**初始位置**，不等同于自动播放。手机浏览器普遍拦截带声音的自动播放；想自动播要再加 `autoplay=1&muted=1`，且仍受浏览器策略限制（本次未真机实测）。
- 同一个 `t` 参数在 `www.bilibili.com/video/BV…?p=N&t=S` 的普通视频页链接里也有效（`t` 同样以秒计，也接受 `1m23s` 这种写法），适合复习页做「在 B 站打开」的外链；但复习页内嵌播放首选 `player.html`。

### 复习页可用的 B 站链接格式（完整示例）

取自站内真实数据：数学 m1 课，`bvid=BV1Ek4y1w7ma`，`page=1`，分段表里 147 秒是「元素与集合：属于 / 不属于」（见 §3）：

```
https://player.bilibili.com/player.html?bvid=BV1Ek4y1w7ma&page=1&high_quality=1&t=147
```

复习页直接这样嵌即可，不用改站内代码：

```html
<iframe src="https://player.bilibili.com/player.html?bvid=BV1Ek4y1w7ma&page=1&high_quality=1&t=147"
        allowfullscreen loading="lazy"></iframe>
```

---

## 2. 自托管视频：站内已有「分段直达」，但只在课页内点击时有效

### 先说一个前提：以哪个前端为准

本次查到两个前端，两者**不一样**，结论以线上 9 科站为准：

- `~/workspace/study/github/index.html`（125KB，SUBJ_BOOKS 出现 20 处，9 科全量）：有自托管 `<video>`、有分段直达。这是线上站的谱系——Worker 从 R2 的 `spa/index.html` 提供首页（`worker.js:1186`），上传走通用上传器 `~/workspace/study/path/r2_put.py`（本地文件 → 指定 R2 key），`~/workspace/study/markup/batch3-status.md:30` 也记载了「`r2_put.py` 上传 `video/<slug>.mp4/.vtt` + spa 数据文件 + `spa/index.html`」的流程。
- `~/workspace/study/github-repo/tianya/index.html`（86KB，`SUBJ_BOOKS` 出现 0 次，数学单科旧快照）：**全文没有任何 `<video>`、没有任何 `currentTime` / `seek`，只有 B 站 iframe**。不要拿它当自托管的依据。

### 自托管视频怎么渲染

`~/workspace/study/github/index.html:1163-1168`（`renderUnit` 内，`u.video` 存在时先查自托管表，查不到才回落 B 站 iframe）：

```js
var SELF_VIDEOS={"BV1Ek4y1w7ma|1": {"src": "/video/m1.mp4", "vtt": "/video/m1.vtt", "segs": [[0, "集合是什么：确定的对象打包成整体"], [147, "元素与集合：属于 / 不属于"], [333, "空集：一个元素都没有的集合"], ...]}, ...};
if(window.SELF_VIDEO_PACKS)SELF_VIDEO_PACKS.forEach(function(p){for(var k in p)SELF_VIDEOS[k]=p[k]});
var sv=SELF_VIDEOS[u.video.bvid+'|'+u.video.p];
...
h+='<div class="vidbox"><video controls playsinline preload="metadata" src="'+sv.src+'"><track kind="subtitles" label="中文字幕" srclang="zh" src="'+sv.vtt+'" default></video></div>'
```

要点：

- 键是 `bvid|p`，值是 `{src: "/video/xxx.mp4", vtt: "/video/xxx.vtt", segs: [[秒, 标题], …]}`。`segs` 的时间就是**秒**（如 147、333），复习页要用的时间点可以直接取这里的现成数据，不用重新听写。
- 内联表只有数学 m1–m4（`BV1Ek4y1w7ma|1`→m1、`BV1TP411h7U2|1`→m2、`BV11p4y1F78j|1`→m3、`BV1KF411S7aq|1`→m4）；其余科目靠 `window.SELF_VIDEO_PACKS` 扩展包，来自 `~/workspace/study/github/path.js`、`path-phy.js`、`path-chem.js`、`path-bio.js`、`path-chn.js`、`path-geo.js`、`path-hist.js`、`path-pol.js`（如生物 bio1–bio21、语文 chn1–chn20、物理 phy1–phy5、政治 pol1–pol5、地理 geo1–geo8、化学 chem1、历史 hist7）。同款模板另见 `~/workspace/study/path/pathmod.js:201-205`。
- `<video>` 没有 `id`，只有 `controls playsinline preload="metadata"`，src 是站内相对路径 `/video/xxx.mp4`，字幕是同名 `.vtt`。

### 现成的跳转逻辑：分段直达 chips → `currentTime`

`~/workspace/study/github/index.html:1174-1176`（渲染「分段直达」按钮，`data-seek` 存秒数）：

```js
sv.segs.forEach(function(sg){var mm=String(Math.floor(sg[0]/60)),ss=('0'+(sg[0]%60)).slice(-2);h+='<span class="chip2" data-seek="'+sg[0]+'">'+mm+':'+ss+' '+esc(sg[1])+'</span>'});
```

`~/workspace/study/github/index.html:1281-1284`（`bindUnit` 里的点击处理——**这是全站唯一的时间点跳转逻辑**）：

```js
app.querySelectorAll('[data-seek]').forEach(function(el){el.addEventListener('click',function(){
  var v=document.querySelector('.vidbox video');if(!v)return;
  v.currentTime=parseFloat(el.getAttribute('data-seek'));var pr=v.play();if(pr&&pr.catch)pr.catch(function(){});
})});
```

即：点一下 → 直接给 `<video>` 设 `currentTime`（秒）→ `play()`。同款代码另见 `~/workspace/study/path/pathmod.js:316-318`。

注意这个现成机制的边界（复习页照搬时要补）：

- 它**没有等 `loadedmetadata`**。站内能工作是因为用户点按钮时视频通常已加载好元数据（`preload="metadata"`）。复习页自动跳转时必须先等 `loadedmetadata` 再设 `currentTime`，否则在元数据未就绪时设值可能被忽略或抛错。
- 它只在**课页已经渲染出 `<video>` 之后**才有效；它不读 URL，不接受外部传入的时间。

### 站内没有任何 `?t=` / `#t=` 路由

- `~/workspace/study/webapp/src/worker.js` 全文搜不到 `currentTime`、`#t`、`"t"`：`serveVideo` 只看 `Range` 请求头，不看任何查询参数或 hash（hash 本来也不会发到服务器）。
- `~/workspace/study/github/index.html` 全文搜 `location.` 只有一处 `location.reload()`（第 304 行，云同步后重载），**没有任何 `location.search` / `location.hash` / `URLSearchParams` 的读取**。所以 `/?t=147`、`/#t=147` 这类链接打到站内首页会被直接忽略。

---

## 3. 复习页可用的自托管链接格式（完整示例）

仍用数学 m1（`BV1Ek4y1w7ma`，`/video/m1.mp4`，147 秒「元素与集合」）：

### 主方案（最稳）：复习页自己嵌 `<video>`，`#t=` + `currentTime` 双保险

```html
<video id="rv" controls playsinline preload="metadata"
       src="https://tianya-study.santalin87.workers.dev/video/m1.mp4#t=147"></video>
<script>
  var v = document.getElementById('rv');
  v.addEventListener('loadedmetadata', function () {
    if (Math.abs(v.currentTime - 147) > 1) v.currentTime = 147;
  });
</script>
```

为什么双保险：`#t=147` 是 W3C Media Fragments 标准写法（`#t=[开始秒],[结束秒]`，只写开始就是从该秒播到完），`<video src>` 里各主流浏览器都认；但个别浏览器/场景下片段可能不生效，`loadedmetadata` 后再设一次 `currentTime` 就把口子堵上了。**这是本次调查推荐的唯一主方案。**

### 备用方案（效果不保证）：直接给裸链接

```
https://tianya-study.santalin87.workers.dev/video/m1.mp4#t=147
```

点开后由手机浏览器自己的播放器接管。能不能跳到 147 秒，取决于该浏览器对地址栏媒体片段的支持（见 §5），不要当主方案。

### 后端为什么撑得住跳转：Range 已实测

`~/workspace/study/webapp/src/worker.js:1103-1137`（`serveVideo`）：

```js
async function serveVideo(env, req, name) {
  if (!name || name.includes('..') || name.includes('/')) return new Response('Not Found', { status: 404 });
  const key = 'video/' + name;
  ...
  headers.set('accept-ranges', 'bytes');
  const range = req.headers.get('range');
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      ...
      const obj = await env.R2.get(key, { range: r });
      ...
      headers.set('content-range', 'bytes ' + off + '-' + (off + len - 1) + '/' + total);
      return new Response(obj.body, { status: 206, headers });
    }
  }
  const obj = await env.R2.get(key);
  ...
  return new Response(obj.body, { headers });
}
```

路由在 `worker.js:1184`：`if (path.startsWith('/video/')) return serveVideo(env, req, decodeURIComponent(path.slice(7)));`。文件名只允许单层（不能含 `/`），类型只认 `mp4 / vtt / srt`。线上实测（2026-11-16，curl）：

- `HEAD /video/m1.mp4` → `200`，`Content-Type: video/mp4`，`Accept-Ranges: bytes`，`Content-Length: 82324527`（约 82MB）；
- `Range: bytes=0-99` → **`206`，正好 100 字节**；
- 根路径 `/` → `200`。

结论：跳到中间某秒时浏览器发 Range 请求、服务器回 206 分段，**不需要先下完整 82MB**，跳转机制在服务端没有障碍。

---

## 4. 课的路由格式：没有「课的 URL」

站内 SPA 的课定位全在内存里，没有任何 URL 形态：

- `~/workspace/study/github/index.html:947`：`var PATHV={view:'list',id:null,openMid:null,caseSt:{},ans:{}};`
- `~/workspace/study/github/index.html:1016`：`function openUnit(uid,mid){PATHV.view='unit';PATHV.id=uid;PATHV.openMid=mid||null;PATHV.caseSt={};PATHV.ans={};renderPath();window.scrollTo(0,0)}`——点课只是改内存变量再重渲染，不写 URL。
- `~/workspace/study/github/index.html:1647-1661`（`navSnapshot` / `afterNav`）：前进后退用的 `history.pushState({snap:s},'')`，快照里只有 tab、卡片、练习、默写等状态，**没有 `PATHV.view` / `PATHV.id`，也没有任何时间字段**；连浏览器后退都恢复不了当前是哪一课。
- 启动代码（文件末尾）只从 `localStorage` 读 `ty_subj`（当前科目），不读 URL 参数。

所以不存在 `/lesson/xxx`、`#/xxx`、`?unit=xxx` 这种东西。复习页今天**没有任何办法**用一个链接把用户送到站内某一课的某一秒。

---

## 5. 手机浏览器直接打开：能确认的 / 不能确认的

### 能确认的（有代码或实测依据）

- **B 站 `player.html` 链接手机能直接打开播放**：它是 B 站官方给「站外嵌入」用的播放器，设计用途就是被第三方页面 iframe 嵌入；站内已在用同款 iframe（`github/index.html:1180`），复习页照抄带 `t` 的版本没有新增的跨域问题。`t` 的语义有官方文档背书（见 §1）。
- **自托管 mp4 链接手机能直接打开播放**：`serveVideo` 不做 Referer 校验、不做登录校验、不设任何防盗链（`worker.js:1103-1137` 通篇没有任何 Referer / 鉴权检查，也没有 `Access-Control-Allow-Origin`——普通播放不需要 CORS，`<video>` / 直接导航都不受 CORS 限制）。实测 `/video/m1.mp4` 返回 200 + `Accept-Ranges: bytes`，Range 回 206。
- **复习页跨域嵌 `<video>` 播 mp4 不需要改 Worker**：同上，播放本身不走 CORS。

### 不能确认的（本次未实测，需真机验证）

- **`…mp4#t=147` 裸链接在手机浏览器地址栏里是不是一定跳到 147 秒**：`#t=` 是 W3C Media Fragments 标准，`<video src>` 里 Chrome / Edge / Firefox / Safari 都支持；但**直接在地址栏打开**时各家表现不一——MDN 旧文档明确写 Gecko（Firefox）只在 media 元素 `src` 里支持、不在地址栏；另有资料指出 iOS/WebKit 对 blob 存储的媒体片段不支持。手头这台 iPhone 是天娅的 iPhone 12（在恢复模式里，本次无法真机验证），所以裸链接方案只能标「不保证」。
- **B 站 iframe 在微信/QQ 等 App 内置浏览器里的表现**：本次只查了官方文档与站内代码，未在内置浏览器实测；如复习页主要在微信里打开，建议留一个「在 B 站打开」的外链（`https://www.bilibili.com/video/BV1Ek4y1w7ma?p=1&t=147`）做退路。
- **复习页跨域时字幕 `.vtt` 能不能加载**：`<track>` 字幕是受 CORS 约束的，而 `serveVideo` 目前**不返回 `Access-Control-Allow-Origin`**。复习页如果和学习站不同源、又想要字幕，字幕大概率加载失败；要修得改 Worker 给 `/video/*.vtt` 加 CORS 头（或把复习页与学习站放同源）。视频画面本身不受影响。
- **复习页用 `fetch()` 拉视频 / 读字幕文本**：同样会被 CORS 挡住（无 `Access-Control-Allow-Origin`），本次只确认了「播放」不受影响。

---

## 6. 如果坚持要「链回站内课页自动跳秒」，需要改站内代码（最小改动清单）

以下三步缺一不可，都是新逻辑、不是改参数：

1. **给课一个 URL 入口**：启动时读 URL 参数，例如 `?unit=<uid>&mid=<知识点id>&t=<秒>`（或 `#unit=…&t=…`），读到就 `openUnit(uid, mid)`。现在启动代码不读任何 URL 参数（见 §4）。
2. **B 站课**：`renderUnit` 里拼 iframe src 时把 `t` 带上——`…player.html?bvid=…&page=…&high_quality=1&t=<秒>`。现在 src 是写死的（`github/index.html:1180`）。
3. **自托管课**：`bindUnit` 里渲染出 `<video>` 后，等 `loadedmetadata` 再设 `video.currentTime = <秒>`（可复用现成的 `data-seek` 处理逻辑 `github/index.html:1281-1284`，只是触发点从「用户点击」改成「页面加载后自动执行」）。注意 `PATHV` 快照（`navSnapshot`，`github/index.html:1647-1652`）里没有课 id，后退恢复也要顺带补，否则刷新/后退会丢课。

在改动落地之前，复习页不要依赖「链回课页」这条路；先用 §1、§3 的「复习页自己嵌播放器」方案。

---

## 证据清单（文件 : 行号）

| 结论 | 依据 |
|---|---|
| B 站 iframe 写死无 `t` | `study/github/index.html:1180`；`study/github-repo/tianya/index.html:849` |
| `t` 单位是秒 | B 站官方文档 `https://player.bilibili.com`（QueryString 参数表：`t \| number \| 跳转到媒体的初始时间点，单位：秒`；`p \| number \| 多 P 视频的集数，从 1 开始计数`），2026-11-16 实查 |
| 自托管 `<video>` 渲染、`segs` 秒数 | `study/github/index.html:1163-1168`；同款模板 `study/path/pathmod.js:201-205`；扩展包 `study/github/path.js`、`path-phy.js`、`path-bio.js`、`path-chn.js`、`path-geo.js`、`path-pol.js`、`path-chem.js`、`path-hist.js` |
| 现成跳转：`currentTime` | `study/github/index.html:1281-1284`（`data-seek` → `v.currentTime=parseFloat(...)` + `play()`）；`study/path/pathmod.js:316-318` |
| 分段 chips 渲染 | `study/github/index.html:1174-1176` |
| 课状态只在内存、无 URL | `study/github/index.html:947`（`PATHV`）、`:1016`（`openUnit`）、`:1647-1661`（`navSnapshot`/`afterNav` 无课 id、无时间字段）；全文无 `location.search`/`location.hash` 读取（仅 `:304` 一处 `location.reload()`） |
| `serveVideo` 支持 Range 回 206 | `study/webapp/src/worker.js:1103-1137`；路由 `:1184`；SPA 路由 `:1186-1188`；Worker 全文无 `?t=`/`#t=` 处理 |
| 线上实测 | `HEAD /video/m1.mp4` → 200 / `video/mp4` / `Accept-Ranges: bytes` / 82,324,527 字节；`Range: bytes=0-99` → 206 / 100 字节；`/` → 200（2026-11-16 curl） |
| `#t=` 媒体片段标准与浏览器差异 | W3C Media Fragments URI（`#t=[开始],[结束]`，秒）；MDN 旧注：Gecko 只在 media 元素 `src` 里支持、不在地址栏；iOS/WebKit 对 blob 存储片段不支持（见 replayer.app 说明）；`<video src>` 内各主流浏览器基本支持 |
| 旧快照无自托管 | `study/github-repo/tianya/index.html`：`SUBJ_BOOKS` 0 处，`<video>`/`currentTime`/`seek` 均为 0 处 |

未改动任何现有文件；本报告是唯一新增文件。
