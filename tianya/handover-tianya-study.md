# 天娅学习站 — 交接文档（给接手的 Muse）

整理：Cooper（主 Muse），2026-11-19。此文件供接手天娅学习站后续开发的另一个 Muse 账号使用，用户转交。读完这份文档、拿到代码包、配好下面第 6 节的凭据，就能对接上。

## 0. 先看这三句

- **动态站完整代码在 GitHub 仓库 santalin87/zk-study 的 tianya/ 目录下。** 2026-11-20 由 Cooper 分两批推上去。之前 2026-10-21 推的静态版子集是同一目录下的旧文件（index.html、data.js、img.js、path.js），其中 index.html 已换成跳转到动态站 https://20110419.xyz/ 的页面，其余三个旧文件暂留作死文件、可在 GitHub 网页上删除。接手方在自己的 GitHub 连接里选上 zk-study 这个仓库后直接改，不用再传代码包。
- **本文件不含任何密钥、token、密码明文。** 所有凭据都要用户单独给你（第 6 节列了清单和给法）。不要用我的凭据包，也不要让我把凭据写进文档——每个 Muse 的凭据要单独建、各自可吊销（之前 agent2、agent3 就是这么办的）。
- **不要直接动线上数据。** 孩子的学习进度存在云端 D1 里，改代码前先备份，发布后先用测试号验证（第 13 节检查单）。

## 1. 项目概览

- 用户：林文华（叫“华”），孩子林天娅，高一在读（宁德市高级中学）。站是给天娅一个人用的学习站，不是公开产品。
- 站点入口（三个都通，同一个站）：
  - 主入口：https://20110419.xyz
  - Worker 直连：https://tianya-study.santalin87.workers.dev
  - 国内入口：http://121.43.120.148（阿里云杭州机 Nginx 反代，域名未备案所以国内走 IP）
- 家长看板：https://tianya-study.santalin87.workers.dev/parent（不公开，首页无链接，知道地址才能进）。
- 登录：名字 + 手机号软门槛，无密码，localStorage 键 ty_user；数据按手机号隔离。抽查一律用“测试”号 19900000009，不要用孩子本人的号做测试。
- 需求从哪里来：用户会在新的盘聊里直接提调整需求；成绩对比讨论在另一个盘聊（月考成绩对比），那个盘聊只讨论学习内容、不做站上执行。
- 用户的工作方式（照这个来）：给一个目标（做什么、做到什么程度），你自己去跑、自己去测试；只在需要授权（登录验证、须本人配合、花钱）时才找用户；用户最后真机验收。已经解决的问题不用跟用户说，只有需要用户帮着做选择的时候才找用户。

## 2. 架构与数据流

浏览器 → 20110419.xyz（Worker 自定义域）或 121.43.120.148（阿里云 Nginx 反代）→ Cloudflare Worker `tianya-study` → D1 `tianya-study` + R2 `tianya-study-uploads`。

- 首页是单页应用（SPA）：Worker 把 R2 里 `spa/index.html` 原样吐出来（no-cache），JS/CSS/数据文件也走 R2 的 `spa/` 前缀。本地源在代码包的 `github/` 目录。
- Worker 自身还直接提供几个独立页面：`/practice`（专项练习）、`/dictation`（默写工坊）、`/mistakes`（错题本）、`/parent`（家长看板）、`/ai`（问 AI）。这些页面的代码在 `webapp/src/worker.js` 一个文件里（模板字符串内联 CSS/JS，零外部依赖）。
- 视频：自托管的走 R2 `video/` 前缀（支持 Range 分段拉取）；其余走 B 站嵌入播放器。
- 进度 = 云端唯一权威：12 个同步键整包经 `/api/state` 存 D1 的 `user_state` 表（键名见第 8 节）。不要只改本机 localStorage 就算完事。
- 天铄学习站是另一个 Worker（`tianshuo-study`），通过服务绑定挂在 `/ts/*` 下转发，与本站无关，改站时别碰这条转发。

## 3. 账号与资源清单

| 资源 | 名字 / ID | 账号 | 备注 |
|---|---|---|---|
| Cloudflare 账号 | Santalin87，account_id `34b542b32b08f95cd910bf8789fb6e44` | Santalin87 | Worker、D1、R2 都在这个账号下 |
| Worker | `tianya-study` | Santalin87 | 当前版本 0abb89a9（2026-11-16 部署） |
| D1 | `tianya-study`，database_id `d5816ad2-aff0-42b3-bbcd-2b3ac96ae1b0` | Santalin87 | 表见第 8 节 |
| R2 | 桶 `tianya-study-uploads` | Santalin87 | 前缀：`spa/`（站文件）、`video/`（自托管视频） |
| 域名 | 20110419.xyz | 待确认 | 2026-11-02 起以 Worker 自定义域方式原生绑定（之前绕 EdgeOne，已拆掉）；改 DNS/路由前先用 wrangler 或 API 查自定义域确认所在账号，不要假设 |
| 阿里云轻量服务器 | 实例 `9058bf0e21f54e8980da9e1f27767a92`，cn-hangzhou，公网 IP 121.43.120.148 | 用户阿里云账号 | 2 核 2G / 40G ESSD / 200M，预付到期 2027-11-09；Nginx 反代 20110419.xyz，后端与数据仍在 Cloudflare；Tailscale 设备名 aliyun-hz（100.81.240.107） |
| GitHub | 仓库 santalin87/zk-study | santalin87 | 只用于“提问”功能读 issues；站点代码不在这个仓库 |
| 51LA 统计 | 应用 xuexi，ID 3Rd5inBkg1muJqzT | — | 只读统计，三个事件埋点：切换 Tab、评会了不会、打卡 |
| Google Drive | — | santalin87 | 视频源文件与音频备份放这里；站本身不依赖 Drive |

## 4. 代码包说明

随附的代码包是 `tianya-study-handover.tar.gz`（与本文件放一起转交）。包里有：

- `github/`：SPA 本地源（index.html、data.js、path-*.js、streak.js、sw.js、manifest.json、icons/、widgets/）。`index.html` 是上线文件本体，内含三段内联脚本。
- `webapp/`：Worker 单文件 `src/worker.js`、`wrangler.toml`、`seed.sql` / `seed_remote.sql`、`data/`（physics.json、math.json、chem.json、dictation.json、mistakes.json）、`tools/seed.py`、`BUILD_NOTES.md`。
- `path/`：只含脚本与规格（gen_*.py、spec_*.py、r2_put.py 等），视频/音频源文件已排除。
- `review/`：月考错题复习页 `monthly1-review.html` 与生成脚本 `rebuild_v2.py`。
- `reports/`：各科分析与半期考后 3 周学习计划。
- `markup/`：只含小的 .json/.md 补丁说明；`build_db.py`、`highlight_patch.py` 在包根目录。

包里**没有**的东西（故意的）：

- 视频/音频源文件（.mp4/.mp3 等）。成品视频已在 R2 的 `video/` 前缀；源文件在 Google Drive 与我方 `math2/`、`phy2/`、`gap/` 目录。需要做新视频时再向用户要源文件，不要为了一次交接传 11G。
- `markup/` 下 9.3G 的视频生产中间件。需要重跑整套视频生产管线时再单独处理。
- 任何密钥、token、AccessKey、SSH 私钥。见第 6 节。

重建代码包的方法：包里自带 `make_handover_package.py`，在包根目录跑 `python3 make_handover_package.py` 即可重新打包（同样排除媒体文件）。

另：同一份完整代码已在 GitHub 仓库 santalin87/zk-study 的 tianya/ 目录（2026-11-20，两批提交），以仓库为准；代码包是同一份内容的打包备份。注意仓库里不含 6 个二进制小文件（4 个 PWA 图标、lintianya.db、push-paths.bin）与 markup/ 的 36MB 视频生产补丁。

## 5. 接口清单（能直接通过接口用）

### 5.1 Cloudflare：有，有 REST API + wrangler CLI

- API 根地址：`https://api.cloudflare.com/client/v4`，鉴权是 `Authorization: Bearer <API token>`。
- 推荐用 wrangler CLI，不要手写部署协议：`npx --yes wrangler@4 deploy`（在 `webapp/` 目录跑，`CLOUDFLARE_API_TOKEN` 环境变量放 token；如遇 npm registry 407，改用 npx 缓存里的 wrangler.js 直接 `node` 运行）。
- 常用操作：
  - 部署 Worker：`wrangler deploy`（`wrangler.toml` 里已 pin 好 account_id、D1 绑定、R2 绑定）。
  - 查/改 D1：`wrangler d1 execute tianya-study --remote --command "SELECT ..."` 或 `--file seed.sql`。注意：`wrangler d1 execute` 必须在有 `wrangler.toml` 的项目目录下跑；seed.sql 不接受 `PRAGMA` 与显式 `BEGIN;`/`COMMIT;`。
  - R2 对象上传：走 REST API `PUT /client/v4/accounts/{account_id}/r2/buckets/{bucket}/objects/{key}`，显式指定账号（不要只用 `wrangler r2 object put`，它不支持 `--account-id`，多账号环境下可能传进错误账号的同名桶——已实测踩过两次）。现成的封装是 `path/r2_put.py`，但它的取 token 部分是按我的凭据写的（见 5.1 末尾）。
  - 读线上页面验证：`curl https://20110419.xyz/`（不要用 Python urllib 默认 UA 请求 Cloudflare 前台，1010 会拦；curl 没问题）。
- 我的凭据你用不了：我这边是 `custom.cloudflare` 连接器经 surrogate 取 token，那是绑在我这个 Muse 账号上的。接手方二选一：(a) 在你那边走 Cloudflare 连接流程连上 Santalin87 账号；(b) 用户在 Cloudflare 后台新建一个专用 API token（最小权限：Workers Scripts 编辑、D1 编辑、R2 编辑，Zone 只读），经安全通道交给你。token 只能走安全通道，不要贴在聊天里。
- `path/r2_put.py` 改造提示：它现在从我的 authdc 取 surrogate；接手后把取 token 那几行改成读你自己的 `CLOUDFLARE_API_TOKEN` 环境变量（其余逻辑、显式账号、中文 key 分段 quote 编码都不用动）。

### 5.2 阿里云：有，有 OpenAPI + RunCommand + SSH

- OpenAPI：SWAS（轻量应用服务器），地域 cn-hangzhou，接口 `https://swas.cn-hangzhou.aliyuncs.com/`，AccessKey 签名（HMAC-SHA1）。现成的封装是 `swas_cmd.py`（RunCommand，不用 SSH 就能在服务器上跑 shell 命令），但它读的是我本机的 `~/.aliyun/accesskey.csv`；接手后要么用户给你一份 AccessKey、你把路径改成你自己的文件，要么直接用阿里云 CLI / SDK。
- SSH：服务器 sshd 常驻监听 22 + 443 双端口，密钥登录。我的沙盒出网只放行 443，所以我走 443（经代理 CONNECT 到 121.43.120.148:443）；你的沙盒先试直连 22，不通再走 443。SSH 私钥要用户单独给你（见第 6 节）。
- Tailscale：服务器已入网（aliyun-hz，100.81.240.107）。你的设备要先入网、再由用户在 Tailscale 管理端批准，才能走内网地址连它。Tailscale 的 `down`/`up` 不是重启，会把设备登出，别用。
- Nginx 配置在服务器 `/etc/nginx/` 里（`sites-enabled/default` 是实际生效的反代，`conf.d/genie.conf` 是另一个 server_name 的配置，备份文件不要放进 `sites-enabled/` 或 `conf.d/`）。改 Nginx 前先在服务器上备份，改完 `nginx -t` 再重载。

### 5.3 其他接口（可选）

- GitHub API：读 santalin87/zk-study 的 issues（站内“提问”功能的数据源）。需要时用户给你 GitHub 连接或 token；不是接手必需。
- Google Drive API：视频源文件与音频备份。需要做新视频时再连。
- 51LA：只读统计，不用接。

## 6. 凭据清单（本文件不含明文，向用户要）

2026-11-20 更新：凭据已由 Cooper 按用户要求建好，见随附凭据包 `tianya-study-agent-creds.zip`（Cloudflare token、阿里云 AccessKey、SSH 密钥对各一份，README 里有用法与撤销方法）。注意：SSH 公钥尚未装进服务器（见凭据包 README 的待办一项），其余两项已实测可用。下面这张表仍列出凭据的用途与权限范围，供核对。

| 凭据 | 用途 | 怎么给 | 备注 |
|---|---|---|---|
| Cloudflare API token（Santalin87 账号，专用新建） | wrangler 部署、D1、R2 上传 | 用户新建后经安全通道给你，或在你那边走 Cloudflare 连接流程 | 最小权限：Workers Scripts 编辑、D1 编辑、R2 编辑；不要给能管整个账号的 Global Key |
| 阿里云 AccessKey（建议新建 RAM 用户，不要复用 cooper-agent） | SWAS OpenAPI / RunCommand | 用户新建 RAM 用户 + AccessKey 后经安全通道给你 | 只给操作这台轻量服务器的权限；新用户独立可吊销 |
| 阿里云服务器 SSH 私钥 | SSH 登录 121.43.120.148 | 用户把私钥文件单独给你（或给你新配一把：在服务器 authorized_keys 里加你的公钥） | 不要用我的私钥文件；给新 Muse 配新钥匙是之前 agent2/agent3 的做法 |
| Tailscale 入网批准 | 内网连服务器与用户电脑 | 你的设备入网后，用户在 Tailscale 管理端点批准 | 批准前走不了内网地址 |
| Google 账号连接（可选） | Drive 视频源、Gmail（如需） | 在你那边走 Google 连接流程 | 做新视频时才需要 |
| GitHub 连接（可选） | 读 zk-study issues | 在你那边走 GitHub 连接流程 | 不是接手必需 |

另请注意：

- 付款授权码协议只约束我（Cooper），不自动约束接手方。凡是会产生实际扣费的操作（Workers 付费升级、超免费额度、付费 API），接手方不要用“我以前同意过”当授权；花钱的规则由用户和接手方另行约定，执行前先报事项与预计金额、等用户点头。
- Worker 的密钥（问 AI、语音转录等）以 secret 形式存在 Worker 上，不在仓库里。接手后先跑 `wrangler secret list` 看有哪些 secret（只看名字，不读值）；需要新增或轮换时再向用户要。
- 51LA、D1 免费额度：D1 每日读 500 万行 / 写 10 万行是账号级（全账号所有库共享，北京时间 8 点重置）。撞上限时等重置，或用户拍板升 Workers 付费版（每月 5 美元，走上一条的花钱规则）。

## 7. 本地开发与发布流程

### 7.1 改主站（SPA，`github/index.html`）——最常见的活

1. 改前备份：`cp index.html index.html.bak-YYYYMMDD-<事项>`。
2. 改文件。`index.html` 是内联三段脚本的单文件；三段改完后逐段抽出来 `node --check`（不要只查一段）。
3. 改数据文件（`data.js`、`path-*.js` 等）必须同步升 `index.html` 里对应 `?v=`（根目录 .js 有 max-age=3600，不升号浏览器一小时内拿旧文件）。
4. 发布：`python3 path/r2_put.py github/index.html spa/index.html`（先按 5.1 末尾把取 token 改成你自己的）。
5. 验证：`curl https://20110419.xyz/ -o /tmp/x.html`，核对 md5 与本地一致、且新代码在里面；再用测试号在浏览器里走一遍改动点。

### 7.2 改 Worker（`webapp/src/worker.js`）

1. `node --check src/worker.js`。
2. 在 `webapp/` 目录跑 `npx --yes wrangler@4 deploy`（`CLOUDFLARE_API_TOKEN` 放你的 token）。
3. 部署后直接 curl 对应接口验证（例如 `/api/practice/subjects`）。

### 7.3 改 D1 数据（题目、默写、错题）

1. 改 `webapp/data/*.json`，跑 `python3 tools/seed.py` 生成 `seed.sql`（幂等）。
2. `wrangler d1 execute tianya-study --remote --file seed.sql`。
3. 注意：seed 只建表不清空 `records` 表（孩子的练习记录要保留）；不要手动 DELETE 业务表。

### 7.4 改月考错题复习页

1. 改 `review/monthly1-review.html`（生成脚本是 `review/rebuild_v2.py`，改数据源后重跑它）。
2. 发布：`python3 path/r2_put.py review/monthly1-review.html spa/review/monthly1-review.html`。
3. `/review/` 路由是 no-cache，发布即生效；手机排版要真机看一眼。

### 7.5 上新视频

1. 下载后统一压成 720p crf32（内容看得清为准，不必高清），先 B 站、找不到再抖音；字幕先验内容，不行再用 Groq 自转。
2. 传 R2 `video/` 前缀（走 5.1 的 REST 方式），再更新数据文件里的视频登记（`?v=` 同步升，见 7.1）。
3. 自托管视频与 B 站嵌入的取舍、选片标准（高赞优先、讲课活跃不照本宣科）见第 9 节。

## 8. 数据模型

D1 `tianya-study` 的表：

- seed 建的：`questions`（id、subject、type、stem、options、answer、explain、points、knowledge、source；type 有 single/multi/fill/exp/calc/solve）、`dictation`（默写）、`mistakes`（错题）、`records`（练习记录：ts、subject、mode、ref_id、user_answer、correct、points_earned）、`scores`（九科成绩）。
- Worker 运行时自动建的：`site_users`、`usage_events`、`user_state`、`path_events`（还有问 AI 的会话表，以 worker.js 为准）。
- 云端进度同步（唯一权威）：12 个键整包经 `/api/state` 存 `user_state` 表：ty_path_status、ty_path_ev、ty_path_log、ty_sr、ty_favs、ty_prac_done、ty_days、ty_daylog、ty_conc_ok、ty_plan_reviewed、ty_subj、ty_streak。
- 本机 localStorage 里同名键是缓存，不要只改本机就当改完了；改完要确认云端同步到了（看 `/api/state` 的 GET 返回）。

## 9. 内容标准与工序铁律（改站前必读，照做）

- 改数据文件必须同步升 index.html 里对应 `?v=`；改 index.html 前先备份；三段内联脚本改后逐段 node --check；发布走 r2_put.py，Worker 改动走 wrangler。
- vtech 必须是 [标题, 说明] 数组对（字符串会把整课打死）；PATH_BOOK 必须 var 声明（const 会在科目切换赋值时抛错）；补标铁律：只插标记、原文逐字不变。
- 内容标准：三层高亮——加粗只给考点词、荧光黄底色只给每段唯一一句核心句、易错提醒用橙红色单独成行；每课小结顶部另设“先看这三句”；每课须另提炼「解题技巧」块，尽量附历年高考与大型模拟考真题（标明年份卷别、附答案与所用技巧），不编造年份出处。福建用新课标全国 I 卷，真题优先级：新课标 I / 新高考 I ＞ 其他全国卷与地方卷 ＞ 大型质检/模拟。
- 试卷与答题卡不一致时以答题卡为准；严禁由试卷草稿反推“当时已经会做”。
- 选片标准：高赞优先、讲课活跃不照本宣科；字幕先验内容、不行 Groq 自转；统一 720p crf32；先 B 站、找不到再抖音。
- 大白话原则：面向泛人群写作少用专业名词；概念置换只能由深往浅，换成一看就懂的生活词，不许换成行话。
- 选题与内容讨论在“月考成绩对比”盘聊，站上执行只在调整盘聊（现在由你接手后，用户会在新地方提需求，以用户说的为准）。

## 10. 已上线功能清单（2026-11-17 基线）

- 九科：数学必修一 23 课 76 节点；物理 2 章 8 课 20 节点；化学 2 章 14 课 23 节点；英语 3 课 8 节点；历史 2 单元 8 课 16 节点；地理 2 章 8 课 15 节点；语文 9 章 20 课 32 节点；生物 6 章 21 课 27 节点；政治 5 课 11 节点。
- 自托管视频全量：数学 m1–m23、物理 phy1–phy5、化学 chem1、历史 hist7、地理 geo1–geo8、生物 bio1–bio21、政治 pol1–pol5、语文 chn1–chn20；其余 B 站嵌入。
- 打卡系统 V1+V2（streak.js?v=1，冻结卡、补卡、徽章、热力图、20:00 横幅）；PWA 已上线（manifest + 图标是 Cooper 猫）；平抛互动玩具嵌在物理自由落体课。
- 月考错题复习页 V2（`/review/monthly1-review.html`，导航“月考错题复习”独立标签）：140 道错题，68 时间点 / 45 整课 / 29 无视频（英语 25）/ 1 不用看视频；进度打勾存本机 localStorage；`/review/` 路由 no-cache。
- 学习计划：半期考后 3 周系统学习计划在 `reports/学习计划_半期考后系统安排.md`。
- 半期考成绩基线：542.5/1050，比月考降 30，全在语数英；数学 46/150 新垫底；化学 +6、政治 +5 唯二上涨。

## 11. 待办 / 待验证（按现状，未做完的）

- 天娅 iPhone 真机验证：PWA 安装、打卡全链路、PhET iframe 内嵌、ty_streak 首次云端同步、离线缓存飞行模式回放、复习页手机排版、B 站 t 参数是否真跳到那一秒。
- 20 道缺题干等试卷照片（地理 10、数学 8、政治 9、历史 19），照片一到归因 + 复习页同步更新。
- 历史第 3 题标准答案 D vs B，向老师核对后再定复习口径。
- 英语 25 个知识点无视频（听力/阅读/完形/语法填空/写作专项），需新找视频补。
- 各科第二章高考真题留空，待正规试卷库补录。
- 未拍板、不要擅自做：Atlas 报告的建议（FSRS、速览进复习队列、课前小测等）、打卡 V3（XP/等级）、其余四个玩具（圆周运动、v-t 图像拆解、弹簧、酸碱滴定）。

## 12. 最近一次改动（2026-11-17，多选题修复）

孩子反馈“多选框不能多选”。排查全站后坏的是两处：①主站「练习」专项练习（index.html renderPractice，选项是点一下就锁死的按钮，8 道多选题 phy-05~08、math-09~11、che-10 永远答不对）；②「记忆卡片」错题重做卡（wrongCardHtml，同样一点就锁死，5 道多选重做题：物理 8、生物 24-(2)-①、数学 9/10/11）。

改法：多选题显示「多选题」标记 + 提示，点选项只切换蓝框选中态（可取消），点「提交」才判分（选对全绿、错选红）；单选题保持一点即答不变。重做卡判分改用标准答案开头的字母（旧代码是从整段讲解里抠 A–D，数学长讲解会把四个选项全标绿）。备份 `github/index.html.bak-20261117-multiselect`；三段内联脚本 node --check 全过；经 r2_put.py 发布 spa/index.html，线上 md5 与本地一致；浏览器实测通过（测试号 19900000009）。

没坏的不用动：Worker `/practice` 页本身就是多选框（radio 单选 / checkbox 多选）；复习页「✓看完」和今日任务打勾是各题独立的框，本来就能多勾；学习路径小测全是单选题。

一个未证实现象（先记下，不作定论）：实测浏览器称第 4/15 题前后两次题干不同、疑似顺序会变；但代码里练习列表是按 data.js 顺序过滤、无洗牌逻辑（buildPrac），等孩子真用时再看。

## 13. 接手检查单（按顺序做，全过才算接上）

1. 解压代码包，核对 `github/index.html` 与线上 `curl https://20110419.xyz/` 的 md5 一致（或确认本地就是最新版）。
2. 配好 Cloudflare token 后跑：`cd webapp && wrangler d1 execute tianya-study --remote --command "SELECT subject, COUNT(*) AS n FROM questions GROUP BY subject"`，应返回物理 15、数学 19、化学 17（questions 表共 51 题，含 single 22、multi 8、fill 11、solve 5、calc 3、exp 2）。
3. 打开三个入口确认 200：https://20110419.xyz/、https://tianya-study.santalin87.workers.dev/、http://121.43.120.148/（第三个经阿里云反代，国内 IP 直访）。
4. 用测试号 19900000009 登录，点「练习」：第 5 题（物理，速度与加速度）应是多选题，点 C、D 再提交应显示“答对了”；再点一道单选题，应一点即判分。
5. SSH 上阿里云（先试 22，不通走 443），`nginx -t` 通过，确认反代配置在位。
6. 代码已在 GitHub 仓库 santalin87/zk-study 的 tianya/ 目录；在你自己的 GitHub 连接里选上这个仓库，直接改、直接提交；以后每次发布前先 commit（不要再出现“唯一副本只在某个 Muse 沙盒里”的状态）。

## 14. 已知坑（前人踩过的，别再踩）

- R2 上传账号坑：Cloudflare 凭据可能同时挂多个账号；`wrangler r2 object put` 不支持 `--account-id`，可能传进错误账号的同名桶。上传一律走 REST API 显式指定账号（account_id 34b542b32b08f95cd910bf8789fb6e44），传完用 Worker 的地址 GET 验证（HEAD 会被 405 拒绝）。
- D1 限额是账号级：每日读 500 万行 / 写 10 万行，全账号所有库共享，北京时间 8 点重置；多建库不增加导入速度。seed 导入前先算好行数预算。
- 学习站首屏渲染时序坑：index.html 内联脚本是多段的，靠前段落执行期直接调靠后段落才定义的函数会 ReferenceError；首屏 render 里只能用已加载的数据文件提供的量，或加 typeof 守卫。
- 数据包声明坑：要被壳重新赋值的全局量必须用 var 声明（const 会在赋值时抛错）。
- 缓存坑：根目录.js 有 max-age=3600，改了数据文件必须同步升 index.html 里的 `?v=`，否则浏览器一小时内拿旧文件。
- 写文件坑（给接手方自己的提醒）：muse.write 写大文件时会静默删掉【】及其包裹的内容，也会吞掉 `??` 前的空格与 Python 代码行首缩进；凡是依赖精确匹配的改文件操作走 edit，写完 grep 核对数量。
- 浏览器任务“叫停”未必真停：要真停一个浏览器任务，用窗口关闭，不要只靠消息里写“停下”。
- 附件是写时快照：要交付的文件先把内容全部改定，最后用一个新路径整份生成再附上；已发过的路径改内容后重附不可靠。

## 15. 关键文件索引

| 文件 | 作用 |
|---|---|
| `github/index.html` | 主站 SPA 本体（上线文件，三段内联脚本） |
| `github/data.js` | 成绩、错题、练习、默写、概念、辨析（window.STUDY_DATA） |
| `github/path-*.js` | 九科学习路径数据包 |
| `github/streak.js`、`github/sw.js`、`github/manifest.json` | 打卡、PWA |
| `webapp/src/worker.js` | Worker 单文件：全部 API + 5 个页面 |
| `webapp/wrangler.toml` | Worker 配置（account_id、D1、R2、AI、服务绑定） |
| `webapp/seed.sql`、`webapp/seed_remote.sql` | D1 建表 + 种子数据 |
| `webapp/data/*.json` | 题目等源数据 |
| `webapp/tools/seed.py` | JSON 转 seed.sql 生成器 |
| `webapp/BUILD_NOTES.md` | Worker 构建说明（API 表、判分规则、本地测试方法） |
| `path/r2_put.py` | R2 上传（REST 显式账号；取 token 部分需按 5.1 改成你自己的） |
| `review/monthly1-review.html`、`review/rebuild_v2.py` | 月考错题复习页与生成脚本 |
| `reports/学习计划_半期考后系统安排.md` | 半期考后 3 周系统学习计划 |
| `handover-tianya-study.md` | 本文件 |
| `make_handover_package.py` | 重建代码包的脚本 |

—— 文档完。接手后如有拿不准的，先问用户，不要猜；花钱、动线上数据、改登录方式三件事，动手前一定先向用户确认。 —
