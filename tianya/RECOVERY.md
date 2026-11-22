# 天娅学习站：恢复手册（RECOVERY.md）

> 只讲“坏了怎么办”。日常改动流程见代码提交记录。
> 2026-11-21 起草、2026-11-22 修订：代码已在 GitHub 仓库 santalin87/zk-study 的 `tianya/` 目录；
> 线上跑在 Cloudflare（Worker `tianya-study` + D1 库 `tianya-study` + R2 桶 `tianya-study-uploads`）；
> 阿里云杭州机只做国内入口转发，不存数据、不跑业务逻辑。

## 一、三个东西各管什么

| 东西 | 管什么 | 丢了找谁 |
|---|---|---|
| GitHub `tianya/` | 代码、配置、文档、数据库迁移脚本、建库配方 `webapp/seed.sql` 和题目数据 `webapp/data/` | git 历史就是备份 |
| Cloudflare D1 `tianya-study` | 活数据：天娅的进度、练习记录、错题、打卡 | D1 自带 Time Travel（见第二节） |
| Cloudflare R2 | 静态文件和视频（`spa/` 前缀） | GitHub 里的源文件重新传；视频找 Drive 和本地源文件 |

密钥只放两处：Cloudflare 后台和 GitHub Secrets，永远不进仓库、不进日志。
手机号、密码、token 不要写进任何日志。

## 二、数据库出问题：先 Time Travel

D1 自带 Time Travel，不用事先开。免费版能回到过去 7 天内任意一分钟，付费版 30 天。

1. 恢复命令：`wrangler d1 time-travel restore`
2. 恢复前会给一个书签（bookmark），恢复错了还能拿那个书签 undo。
3. 超过 7 天的恢复点没有兜底：定期导出不做（2026-11-22 决定：没有地方接收这些数据；题目等静态内容来自互联网、可以从 `webapp/seed.sql` 重建）。
   活数据（练习记录、进度）如果在 7 天前出问题，找不回来——这是接受了的缺口。
   改数据库结构之前，可以临时手动导一次（`wrangler d1 export`，文件放 R2 的 `backups/` 里，别进仓库）。

## 三、代码出问题：git 回滚 + 重新部署

1. 回到上一个好的提交：`git revert` 或 `git reset` 到上一个能跑的 commit SHA。
2. 重新部署 Worker，传 R2。
3. 用测试号过一遍关键路径：登录、做一道多选题、看打卡。

上线时记下 commit SHA 和 Worker 版本号，出了问题才知道回滚到哪一版。
代码版本用 git tag 打号（比如 v1.2.3），大改写一句说明。

## 四、R2 文件出问题：重新传

R2 没有版本功能，覆盖或者删了就找不回来。

- `spa/` 里的页面文件：按 GitHub 里的源文件重新传一遍就行。
- 视频：从 Drive 和本地的源文件重新传。

## 五、整站挂了：按这个顺序恢复

1. 代码从 git 拉下来。
2. 数据库 Time Travel 或导出文件恢复。
3. 视频从 Drive 传。
4. 重新部署 Worker 和 R2。
5. 测试号验证：登录、做一道多选题、看打卡。

## 六、数据库结构变化：写迁移文件，别直接改线上表

- 结构变化写成编号的迁移文件（0001、0002……），按顺序跑。完整规划见 `webapp/migrations/README.md`。
- 不要直接上手改线上表；改之前先拿一个恢复点（Time Travel 书签，`wrangler d1 time-travel info`）。
- 每次上线记下：commit SHA、Worker 版本号、跑过的迁移编号。

## 七、日志记三层，别混在一起

- 运行日志（出问题查这个）：Worker 的报错和请求记录走 Cloudflare 自带的 Workers Logs，后台能看，`wrangler tail` 能实时跟；要长期留就用 Logpush 把日志推到 R2 存下来。记成结构化的：时间、请求路径、耗时、报错。
- 业务事件（站里已经有了）：`usage_events`、`path_events` 这些表记的是谁做了什么（登录、做题、打卡），留着当业务记录；51LA 记的是多少人看、点了什么，是产品统计。这两个都不是查故障用的。
- 变更日志（谁改了什么）：代码看 git 提交记录，数据库结构变化看迁移文件，上线记录看每次部署记下的 commit SHA 和 Worker 版本号。

## 八、现在缺的三样

1. 恢复手册——就是这份，写进仓库就补上了。
2. 数据库定期导出——2026-11-22 决定不做（见第二节），只靠 7 天 Time Travel。
3. 自动部署——正在做：改完提交到 main，GitHub Actions 自动跑数据库迁移、部署 Worker、传 R2。需要把 Cloudflare API token 存进仓库的 GitHub Secrets（名叫 `CLOUDFLARE_API_TOKEN`），流程见 `.github/workflows/tianya-study-deploy.yml`。
