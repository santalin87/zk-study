# -*- coding: utf-8 -*-
"""林天娅学习档案库：建库 + 录入考试成绩。
用法：python3 build_db.py   （幂等：同一场考试重复录入会被替换）
后续新增考试时，在 EXAMS_DATA 里追加一条即可。
"""
import os
import sqlite3

BASE = os.path.expanduser("~/workspace/study")
DB = os.path.join(BASE, "lintianya.db")

STUDENT = {"name": "林天娅", "school": "宁德市高级中学", "grade": "高一"}

# exam: (考试名, 学期, 考试日期, 满分合计, 备注)
# scores: [(科目, 满分, 客观题得分, 主观题得分, 备注)]
EXAMS_DATA = [
    (
        ("2026-2027学年上学期第一次月考", "高一上学期", "2026-10", 900,
         "八科：语数外缺数学，政史地理化生+物理"),
        [
            ("历史", 100, 39, 21, ""),
            ("地理", 100, 30, 21, ""),
            ("政治", 100, 45, 14, ""),
            ("生物", 100, 30, 25, ""),
            ("化学", 100, 16, 15, "明显短板，需重点跟进"),
            ("语文", 150, 30, 70, ""),
            ("英语", 150, 70, 26.5, "主观偏弱"),
            ("物理", 100, 34, 27, ""),
        ],
        # files: [(科目, 本地相对路径)]
        [
            ("历史", "workspace/user/files/21534_2_a1bt.jpg"),
            ("地理", "workspace/user/files/21532_3_swqi.jpg"),
            ("政治", "workspace/user/files/21531_4_p6b0.jpg"),
            ("生物", "workspace/user/files/21530_5_2udy.jpg"),
            ("化学", "workspace/user/files/21529_6_ci3v.jpg"),
            ("语文", "workspace/user/files/21526_7_mpja.jpg"),
            ("英语", "workspace/user/files/21527_8_wvwi.jpg"),
            ("物理", "workspace/user/files/21528_9_odqr.jpg"),
        ],
    ),
]

SCHEMA = """
CREATE TABLE IF NOT EXISTS student(
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE, school TEXT, grade TEXT, updated TEXT
);
CREATE TABLE IF NOT EXISTS exams(
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE, term TEXT, exam_date TEXT,
    total_full REAL, note TEXT
);
CREATE TABLE IF NOT EXISTS scores(
    id INTEGER PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id),
    subject TEXT, full_score REAL,
    objective_score REAL, subjective_score REAL, total_score REAL,
    note TEXT,
    UNIQUE(exam_id, subject)
);
CREATE TABLE IF NOT EXISTS exam_files(
    id INTEGER PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id),
    subject TEXT, local_path TEXT,
    drive_file_id TEXT, drive_link TEXT,
    UNIQUE(exam_id, subject)
);
-- 逐题分析（等标准答案到后录入）
CREATE TABLE IF NOT EXISTS question_analysis(
    id INTEGER PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id),
    subject TEXT, question_no TEXT,
    full_score REAL, got_score REAL,
    error_type TEXT,        -- 知识盲区/审题偏差/计算失误/时间不够/表述不规范
    knowledge_point TEXT,
    note TEXT,
    UNIQUE(exam_id, subject, question_no)
);
"""


def main():
    os.makedirs(BASE, exist_ok=True)
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.executescript(SCHEMA)
    cur.execute(
        "INSERT OR REPLACE INTO student(name, school, grade, updated) "
        "VALUES(?,?,?,date('now'))",
        (STUDENT["name"], STUDENT["school"], STUDENT["grade"]),
    )
    for (exam_meta, scores, files) in EXAMS_DATA:
        name, term, exam_date, total_full, note = exam_meta
        cur.execute(
            "INSERT OR REPLACE INTO exams(name, term, exam_date, total_full, note)"
            " VALUES(?,?,?,?,?)",
            (name, term, exam_date, total_full, note),
        )
        exam_id = cur.execute(
            "SELECT id FROM exams WHERE name=?", (name,)
        ).fetchone()[0]
        for row in scores:
            subject, full, obj, subj, note_s = row
            cur.execute(
                "INSERT OR REPLACE INTO scores(exam_id, subject, full_score,"
                " objective_score, subjective_score, total_score, note)"
                " VALUES(?,?,?,?,?,?,?)",
                (exam_id, subject, full, obj, subj, obj + subj, note_s),
            )
        for subject, local_path in files:
            cur.execute(
                "INSERT OR IGNORE INTO exam_files(exam_id, subject, local_path)"
                " VALUES(?,?,?)",
                (exam_id, subject, local_path),
            )
    con.commit()

    # 自检输出
    print("== 成绩汇总 ==")
    for r in cur.execute(
        "SELECT e.name, s.subject, s.full_score, s.total_score, "
        "s.objective_score, s.subjective_score "
        "FROM scores s JOIN exams e ON s.exam_id=e.id "
        "ORDER BY s.id"
    ):
        print(r)
    tot = cur.execute(
        "SELECT SUM(total_score), SUM(full_score) FROM scores"
    ).fetchone()
    print("总分: %.1f / %.0f  (%.1f%%)" % (tot[0], tot[1], tot[0] / tot[1] * 100))
    con.close()
    print("DB:", DB)


if __name__ == "__main__":
    main()
