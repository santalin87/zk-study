# 数据库迁移规划（D1）

线上库：Cloudflare D1 `tianya-study`（Santalin87 账号）。
本目录就是迁移文件目录，`wrangler.toml` 里 `migrations_dir = "migrations"` 已指过来。
跑迁移用 wrangler 原生命令，不自己写 runner。

## 文件怎么编号

- 文件名：`0001_名字.sql`、`0002_名字.sql`……四位数字 + 下划线 + 英文短名。
- 编号只增不减，写好就别改名。
- 基线：`0001_init.sql` 是 2026-11-21 线上已有的 9 张表（`seed.sql` 里的 5 张 + Worker 运行时建的 4 张），只建表不插数据，全是 `IF NOT EXISTS`，在线上跑是空操作，只登记。

## 怎么写一个新迁移

- 一个迁移只做一件事（加一列、加一张表、加一个索引）。
- 只用这几类语句：`CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN`、`CREATE INDEX IF NOT EXISTS`。
- 禁止：`DROP TABLE`、`DELETE`、`UPDATE` 全表、`PRAGMA`、`BEGIN`/`COMMIT`（remote 的 D1 执行不接受后两类）。
- 数据回填（比如给新列填默认值）要写成 `UPDATE ... WHERE 新列 IS NULL`，可以重复跑也没事。

## 怎么跑

- 本地先试（本地开发库）：`wrangler d1 migrations apply tianya-study --local`
- 线上：CI 自动跑（见 `.github/workflows/tianya-study-deploy.yml`）；手动跑是 `wrangler d1 migrations apply tianya-study --remote`
- wrangler 自己记哪些跑过（库里的 `d1_migrations` 表），没跑过的按编号顺序跑，已跑过的不重复跑。别手改这张表。

## 改结构之前的规矩

1. 先拿恢复点：`wrangler d1 time-travel info tianya-study`，把 bookmark 记下来（恢复命令见 `RECOVERY.md` 第二节）。
2. 新迁移文件写好、本地跑通，再提交。
3. 绝不改已经上线的迁移文件；写错了就再写一个新迁移纠正。
4. 绝不直接上手改线上表。
5. 上线时记下：commit SHA、跑过的迁移编号。

## 题目数据不是迁移

题目、错题这些内容数据走 `webapp/seed.sql`（由 `seed.py` 从 `webapp/data/` 生成），不走迁移。
迁移只管表结构。
