# -*- coding: utf-8 -*-
"""英语必修第一册（人教版2019）Unit 2 数据包规格：Travelling Around。
范围以 textbooks-toc.md 为准：Unit 2 Travelling Around（p23-34），
现在进行时表将来计划；写作 A travel plan。节点 sec 为本批内序号 1-3，
pre 只引用本批节点。"""
CRIT = ['能复述定义和公式', '能看懂例题的每一步', '能独立做对基础题', '能独立做对应用题', '能独立做对综合题并讲清思路']
def node(name, sec, secTitle, page, desc, pre):
    return dict(name=name, sec=sec, secTitle=secTitle, page=page, desc=desc,
                criteria=['能说出本节的核心概念', '能看懂课文/例句的每一步', '能独立做对基础题',
                          '能独立做对应用题', '能独立做对综合题并讲清思路'],
                diag=None, pre=pre, next=[])

VARNAME = 'PATH_BOOK_ENG'
SUBJECT = '英语'
BOOKNAME = '必修第一册'
VERSION = '人教版'
CHAPTER2 = dict(no='Unit 2', title='Travelling Around')
CONTENT_FILES2 = ['ch2/content_eng.json']

UNITS2 = [
 dict(id='u_eng_3', name='Unit 2 Travelling Around', secs='Unit 2', pageFrom=23, pageTo=34,
      members=['eng_e006', 'eng_e007', 'eng_e008'],
      video=dict(bvid='BV1KG4y1W7R3', p=1, t='必修一 Unit 2 课文讲解', dur='39:09')),
]
NODES2 = {
 'eng_e006': node('阅读：旅行日志里的秘鲁', 1, 'Unit 2 Travelling Around', 23,
    'Richard 的秘鲁旅行日志：按亚马逊→马丘比丘→库斯科→的的喀喀湖的行程顺序读，每站抓一个见闻关键词。', []),
 'eng_e007': node('语法：现在进行时表将来计划', 2, 'Unit 2 Travelling Around', 26,
    'be doing 表示按计划将发生的动作（go/come/leave/arrive 等位移动词为主），与 will、一般现在时表将来分清依据。', ['eng_e006']),
 'eng_e008': node('写作：旅行计划 A Travel Plan', 3, 'Unit 2 Travelling Around', 30,
    '四段结构：目的地与时间→行程安排→交通住宿→期待收尾，用将来表达呈现计划。', ['eng_e007']),
}
VTOP2 = {
 'u_eng_3': ['旅行日志先抓行程顺序，再抓每站见闻：亚马逊→马丘比丘→库斯科→的的喀喀湖。', 'be doing 表将来，核心是「已经安排好」，不是「正在做」。', '旅行计划四段式：目的地与时间、行程、交通住宿、期待收尾。'],
}
VSUM2 = {
 'u_eng_3': 'Unit 2 Travelling Around：==阅读是 Richard 的秘鲁旅行日志==，按**行程顺序**读四站——亚马逊雨林、马丘比丘、库斯科、的的喀喀湖（普诺一带），细节题都挂在站点上，人物的表兄是 Xavier；语法是**现在进行时表将来计划**（**be doing**，先分清已安排计划、will 临时决定、一般现在时時刻表三条路）；写作是**旅行计划四段式**（目的地与时间→行程安排→交通住宿→期待收尾），用将来表达呈现计划。配套视频为 Unit 2 课文讲解（39:09）。\n易错提醒：四站要按行程顺序记，第一站是亚马逊雨林，别凭名气把马丘比丘当成第一站。'
}

VTECH2 = {
 'u_eng_3': ['看到旅行日志类阅读 → 先按地点标行程顺序、定头尾两个锚点，再回原文定位每站细节。', '看到 be doing 的句子 → 先找将来时间标志再判断：有安排语境就是表将来，别急着译「正在」。', '写旅行计划 → 先列四段提纲再填句，写完扫一遍动词时态，过去式混进来就是写成了回忆。'],
}
