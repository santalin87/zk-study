# 英语·必修第一册（人教版2019）Unit 2 学习路径 — 完成报告

日期：2026-11-09。范围以 textbooks-toc.md 为准：Unit 2 Travelling Around（p23-34），现在进行时表将来计划；写作 A travel plan。本批只做内容生产，合并与部署由总控完成，本报告未改动任何已有文件。

## 做了几课几节点

- **1 课（单元）、3 个知识点节点**，交付数据文件 `ch2/content_eng.json` 与规格文件 `ch2/spec_eng2.py`（UNITS2 / NODES2 / VTOP2 / VSUM2 / VTECH2）。
- Unit 2 Travelling Around（u_eng_3，p23-34）：
  - eng_e006 阅读：旅行日志里的秘鲁（sec 1，p23，pre 无）
  - eng_e007 语法：现在进行时表将来计划（sec 2，p26，pre=eng_e006）
  - eng_e008 写作：旅行计划 A Travel Plan（sec 3，p30，pre=eng_e007）
- 每节点内容对象为九键同构结构（intro / learn / svg / svgCap / case / basics / apply / advance / pitfalls），已用脚本校验：键集合、题目数量、选择题 ans 下标与 why 对齐、每段 learn 至多一句 ==核心句==，全部通过。vgaokao 未写（未编造高考真题出处）。

## 视频核实结论

- u_eng_3 登记视频：**BV1KG4y1W7R3，时长 39:09（B 站 API 核对 2349 秒）**，标题口径「必修一 Unit 2 课文讲解」。
- 该视频是谷sir说英语「新人教版必修一课文讲解」合集里的 **第 3 集，对应 Unit 2**，为独立一集（有独立 BV 号），spec 中按 video=dict(bvid='BV1KG4y1W7R3', p=1, ...) 登记。

## 课文细节与语法核对结论

- 课文事实只采用可确认项，并逐项核对一致：
  - 作者为 **Richard**，文中亲属为其表兄（cousin）**Xavier**。
  - 秘鲁行程四站顺序：**亚马逊雨林 → 马丘比丘 → 库斯科 → 的的喀喀湖（普诺一带）**，阅读节点、案例题、基础题均按此顺序命题，无张冠李戴。
  - 马丘比丘与库斯科均落在**印加（Inca）**文明线上，内容表述只到这一可确认层级；拿不准的细节（如具体天数、逐日活动）一律未写。
- 语法核对：be doing 表将来限定为「已安排好的计划」，适用动词以 go / come / leave / arrive / start 等位移与行程动词为主；状态动词（know / like / belong）明确排除。与 will（临时决定/预测）、一般现在时（時刻表固定时刻）的分工在 learn、case、apply 三处口径一致。所有选择题已逐题自洽复核（时态、主谓、搭配、时间状语冲突）。

## 遗留问题

1. 本单元高考真题未放：在线达不到逐字可核级别，按纪律留空，待正规试卷库补录。
2. **第一章视频登记口径备注**：第一章 spec_eng.py 中 Welcome Unit 与 Unit 1 的视频登记用的是合集父级 BV（BV1gY4y1T73a）的分 P 写法（p=1 / p=2）；而经总控核实，该合集各单元实际是独立分集、各自有独立 BV（如 Unit 2 为 BV1KG4y1W7R3）。两处登记口径不一致，本次未改动第一章文件，仅在此备注，供总控后续统一口径时处理。

## 部署与实测（总控回填）

- 合并方式：总控 append_ch2.py 把 Unit 2 spec+内容追加进 path-eng.js（Welcome/Unit 1 数据未动）；path-eng.js?v=1→2。
- 发布：r2_put.py 上传 spa/path-eng.js（60672 B），返回 OK；https://20110419.xyz 与阿里云入口 http://121.43.120.148 两处均为 60672 B，与本地逐字节一致（index.html 同步更新为 109011 B）。
- 实测：Node 结构校验全过；jsdom 实测英语列表出现「Unit 2 Travelling Around」，课页可打开、首节点「阅读：旅行日志里的秘鲁」与 vtop 块正常，六科切换不串科。
- 合计：英语现共 3 课 8 节点（Welcome+Unit 1 共 2 课 5 节点 + Unit 2 共 1 课 3 节点）。
