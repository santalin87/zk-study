# -*- coding: utf-8 -*-
"""把 data/*.json 转成 seed.sql（建表 + INSERT），幂等可重复执行。
用法：python3 tools/seed.py   → 生成 seed.sql
注意：records 表只建表不清空（孩子的练习记录要保留）。
"""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data")
OUT = os.path.join(BASE, "seed.sql")


def q(v):
    """SQL 字符串转义；None -> NULL；数字原样。"""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def j(v):
    """JSON 序列化：只有数组/对象才转 JSON，字符串/数字原样存，避免 '"B"' 这类带引号。"""
    if v is None:
        return "NULL"
    if isinstance(v, (dict, list)):
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return q(v)


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


SCHEMA = """
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
  error_type TEXT, knowledge_point TEXT, note TEXT,
  mastered INTEGER DEFAULT 0, similar TEXT DEFAULT '', redo_count INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS records(
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, subject TEXT,
  mode TEXT, ref_id TEXT, user_answer TEXT, correct INTEGER,
  points_earned REAL);
CREATE TABLE IF NOT EXISTS scores(
  subject TEXT PRIMARY KEY, score REAL, full REAL);
"""

# 八科成绩（与答题卡红笔批注一致）
SCORES = [
    ("语文", 100, 150),
    ("英语", 96.5, 150),
    ("物理", 61, 100),
    ("历史", 60, 100),
    ("政治", 59, 100),
    ("生物", 55, 100),
    ("地理", 51, 100),
    ("化学", 31, 100),
]


def main():
    out = ["PRAGMA journal_mode=WAL;", "BEGIN;"]
    out.append(SCHEMA)

    # questions：物理 + 数学 + 化学（幂等：先清后插）
    out.append("DELETE FROM questions;")
    n_q = 0
    for name in ("physics.json", "math.json", "chem.json"):
        for it in load(name):
            out.append(
                "INSERT INTO questions(id,subject,type,stem,options,answer,explain,points,knowledge,source) VALUES("
                + ",".join([
                    q(it.get("id")), q(it.get("subject")), q(it.get("type")),
                    q(it.get("stem")),
                    q(json.dumps(it.get("options"), ensure_ascii=False) if it.get("options") else None),
                    j(it.get("answer")), q(it.get("explain")),
                    q(it.get("points")), q(it.get("knowledge")), q(it.get("source")),
                ]) + ");"
            )
            n_q += 1

    # dictation：73 条默写
    out.append("DELETE FROM dictation;")
    n_d = 0
    for it in load("dictation.json"):
        tags = it.get("tags")
        out.append(
            "INSERT INTO dictation(id,subject,set_name,prompt,answer,explain,tags) VALUES("
            + ",".join([
                q(it.get("id")), q(it.get("subject")), q(it.get("set")),
                q(it.get("prompt")), q(it.get("answer")), q(it.get("explain")),
                q(",".join(tags) if tags else None),
            ]) + ");"
        )
        n_d += 1

    # mistakes：283 条错题（id 自增，不指定；重导时保留 mastered/similar/redo_count）
    out.append("CREATE TEMP TABLE IF NOT EXISTS _mkeep AS SELECT subject, question_no, mastered, similar, redo_count FROM mistakes;")
    out.append("DELETE FROM mistakes;")
    n_m = 0
    for it in load("mistakes.json"):
        out.append(
            "INSERT INTO mistakes(subject,question_no,full_score,got_score,student_answer,std_answer,error_type,knowledge_point,note) VALUES("
            + ",".join([
                q(it.get("subject")), q(it.get("question_no")),
                q(it.get("full_score")), q(it.get("got_score")),
                q(it.get("student_answer")), q(it.get("std_answer")),
                q(it.get("error_type")), q(it.get("knowledge_point")),
                q(it.get("note")),
            ]) + ");"
        )
        n_m += 1

    # 恢复重导前的掌握进度（按 subject+question_no 匹配）
    out.append("UPDATE mistakes SET mastered=COALESCE((SELECT mastered FROM _mkeep k WHERE k.subject=mistakes.subject AND k.question_no=mistakes.question_no),0),"
               " similar=COALESCE((SELECT similar FROM _mkeep k WHERE k.subject=mistakes.subject AND k.question_no=mistakes.question_no),''),"
               " redo_count=COALESCE((SELECT redo_count FROM _mkeep k WHERE k.subject=mistakes.subject AND k.question_no=mistakes.question_no),0);")
    out.append("DROP TABLE IF EXISTS _mkeep;")

    # scores：八科成绩
    out.append("DELETE FROM scores;")
    for s, score, full in SCORES:
        out.append(
            "INSERT INTO scores(subject,score,full) VALUES(%s,%s,%s);"
            % (q(s), q(score), q(full))
        )

    out.append("COMMIT;")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print("seed.sql 已生成: questions=%d dictation=%d mistakes=%d scores=%d"
          % (n_q, n_d, n_m, len(SCORES)))


if __name__ == "__main__":
    main()
