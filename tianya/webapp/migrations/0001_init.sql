-- 0001_init.sql —— 基线快照：2026-11-21 线上已有的 9 张表
-- 只建表、不插数据；全部用 IF NOT EXISTS，所以在已有数据的线上库跑也是空操作。
-- 这是迁移体系的起点：之后的结构变化都写新编号的迁移文件，见同目录 README.md。
-- 注意：remote 的 D1 执行不接受 PRAGMA 和 BEGIN/COMMIT；本文件没有这两类语句。

CREATE TABLE IF NOT EXISTS questions(
  id TEXT PRIMARY KEY, subject TEXT, type TEXT, stem TEXT,
  options TEXT, answer TEXT, explain TEXT, points REAL,
  knowledge TEXT, source TEXT);

CREATE TABLE IF NOT EXISTS dictation(
  id TEXT PRIMARY KEY, subject TEXT, set_name TEXT, prompt TEXT,
  answer TEXT, explain TEXT, tags TEXT);

CREATE TABLE IF NOT EXISTS mistakes(
  id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT, question_no TEXT,
  full_score REAL, got_score REAL, student_answer TEXT, std_answer TEXT,
  error_type TEXT, knowledge_point TEXT, note TEXT);

CREATE TABLE IF NOT EXISTS records(
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, subject TEXT,
  mode TEXT, ref_id TEXT, user_answer TEXT, correct INTEGER,
  points_earned REAL);

CREATE TABLE IF NOT EXISTS scores(
  subject TEXT PRIMARY KEY, score REAL, full REAL);

-- 以下 4 张表是 Worker 运行时自动建的（见 src/worker.js），这里一并记入基线，
-- 这样新环境（本地开发库）只跑迁移就能建齐，不用先跑一遍 Worker。
CREATE TABLE IF NOT EXISTS site_users (phone TEXT PRIMARY KEY, name TEXT, first_ts INTEGER, last_ts INTEGER, logins INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS usage_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, phone TEXT, name TEXT, event TEXT, detail TEXT);

CREATE TABLE IF NOT EXISTS user_state (phone TEXT PRIMARY KEY, name TEXT, data TEXT, updated INTEGER);

CREATE TABLE IF NOT EXISTS path_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, node TEXT, kind TEXT, item TEXT, ok INTEGER, detail TEXT);
