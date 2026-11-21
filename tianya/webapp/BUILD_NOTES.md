# tianya-study 构建说明

天娅的学习小站 —— Cloudflare Worker + D1 单文件应用（API + 五个 HTML 页面，模板字符串内联 CSS/JS，零外部依赖，手机端优先）。

## 目录结构

```
webapp/
├── wrangler.toml # Worker 配置（name/account_id/D1 绑定均已填好）
├── src/worker.js # 单文件：全部 API + 5 个页面
├── data/ # 源数据（JSON）
│ ├── physics.json # 15 道物理题（题干/选项/答案/讲解全）
│ ├── math.json # 19 道数学题（同上）
│ ├── dictation.json # 73 条默写（方程式30/词句急救15/标志性表述8/概念辨析20）
│ └── mistakes.json # 283 条错题（逐题核对记录）
├── tools/seed.py # JSON → seed.sql 生成器（幂等）
├── seed.sql # 生成的数据文件（已生成，直接可用）
└── BUILD_NOTES.md # 本文件
```

## D1 表结构

- `questions(id TEXT PK, subject, type, stem, options, answer, explain, points REAL, knowledge, source)`
type: single/multi/fill/exp/calc/solve；options 存 JSON 对象字符串
- `dictation(id TEXT PK, subject, set_name, prompt, answer, explain, tags)`
- `mistakes(id INTEGER PK AUTOINCREMENT, subject, question_no, full_score, got_score, student_answer, std_answer, error_type, knowledge_point, note)`
- `records(id INTEGER PK AUTOINCREMENT, ts INTEGER, subject, mode, ref_id, user_answer, correct, points_earned)`
mode: practice/dictation；ts 为毫秒时间戳。**seed 只建表不清空此表**（孩子的练习记录要保留）
- `scores(subject TEXT PK, score, full)` —— 八科成绩

## API（全部 JSON）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/scores | 八科成绩 |
| GET | /api/practice/subjects | [{subject,count}] |
| GET | /api/practice/questions?subject=物理 | 题目（不含 answer/explain） |
| POST | /api/practice/check {qid,user_answer} | 判分 + 写 records |
| GET | /api/dictation/sets | [{set,subject,count}] |
| GET | /api/dictation/items?set=方程式默写 | [{id,prompt,subject}] |
| POST | /api/dictation/check {qid,user_text} | 判分 + 写 records |
| GET | /api/mistakes?subject= | 错题列表（为空返回全部） |
| GET | /api/stats | {by_subject, daily(近14天), recent(20条)} |

判分规则：normalize 去掉全部空白后比较；single 转大写比较；multi 把字母排序后比较（answer 兼容 "CD" 与 ["C","D"] 两种形态）；fill/calc/solve/exp 与默写均为宽松比较。

## 页面

- `/` 首页：天娅的学习小站 —— 成绩看板（8 科横向条形）、三个病根、今日任务、导航。**首页不放家长看板链接**
- `/practice` 专项练习：选科 → 逐题卡片（单选/多选/文本）→ 提交判分 → 正确答案 + 讲解 → 进度与本轮正确率
- `/dictation` 默写工坊：选集（支持 `?set=` 直达）→ prompt + 默写框 → 核对 → 标准答案 + 讲思路
- `/mistakes` 错题本：科目 chips 筛选 + 错题卡片
- `/parent` 家长看板：总练习/默写数、正确率、分科表、近 14 天条形、最近 20 条（知道 URL 才能访问，未公开链接）

## 本地测试方法

```bash
cd webapp
# 1. 生成 seed.sql
python3 tools/seed.py
# 2. sqlite3 冒烟测试（建库 + 计数 + 幂等重跑）
rm -f /tmp/t.db && sqlite3 /tmp/t.db < seed.sql
sqlite3 /tmp/t.db "SELECT 'q',COUNT(*) FROM questions UNION ALL SELECT 'd',COUNT(*) FROM dictation UNION ALL SELECT 'm',COUNT(*) FROM mistakes;"
# 期望：q|34 d|73 m|283
# 3. worker 语法检查
node --check src/worker.js
# 4. 功能测试（23 项，stub D1 跑全 API + 页面）
node /tmp/test_worker.mjs # 测试脚本见 /tmp（临时），通过 23/23
```

D1 上云后导入：`wrangler d1 execute tianya-study --remote --file seed.sql`（部署前手动执行一次即可；重复执行安全，幂等）。

## 注意事项

1. 所有 SQL 均为参数绑定，无字符串拼接；所有动态 HTML 输出经 `esc()` 转义。
2. `seed.sql` 重复执行不会清空 `records` 表（只 DELETE 业务表），孩子的练习记录不受影响。
3. 物理题干中的标记为复原数据说明，练习页原样展示（数据原样入库，未做清洗）。
4. 数学含 `solve`（解答）题型，按宽松文本比较判分，讲解即给分依据。
5. `/parent` 仅靠 URL 访问，未在任何页面放置入口；如需保护可后续加简单口令。
