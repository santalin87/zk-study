#!/usr/bin/env python3
import sys

FRAGS = [
    ("集合这套语言是给后面学函数打底的，概念必须非常熟", "==集合这套语言是给后面学函数打底的，概念必须非常熟=="),
    ("把一些确定的、互不相同的对象看成一个整体，就是集合；整体里的每个对象叫元素", "==把一些确定的、互不相同的对象看成一个整体，就是集合；整体里的每个对象叫元素=="),
    ("还特别讲了空集：", "还特别讲了**空集**："),
    ("元素和集合的关系：属于和不属于", "元素和集合的关系：**属于**和**不属于**"),
    ("这个符号只能连元素和集合，不能拿来连两个集合", "==这个符号只能连元素和集合，不能拿来连两个集合=="),
    ("常用数集的记号要记牢：N 自然数（从 0 开始）、N* 或 N+ 正整数、Z 整数、Q 有理数、R 实数", "==常用数集的记号要记牢：N 自然数（从 0 开始）、N* 或 N+ 正整数、Z 整数、Q 有理数、R 实数=="),
    ("实数里只有三类是无理数", "实数里只有三类是**无理数**"),
    ("。确定性：「个子高的同学」", "。**确定性**：「个子高的同学」"),
    ("互异性：同一个元素只写一次，这是考得最多的性质", "==互异性：同一个元素只写一次，这是考得最多的性质=="),
    ("。无序性：谁写在前面都一样", "。**无序性**：谁写在前面都一样"),
    ("列举法把元素一个个写出来", "**列举法**把元素一个个写出来"),
    ("描述法写成 {x | 条件}", "**描述法**写成 {x | 条件}"),
    ("代表元素不同，集合完全不同", "==代表元素不同，集合完全不同=="),
    ("最后一块是区间表示法，初中没学过", "最后一块是**区间表示法**，初中没学过"),
    ("能取到的端点用中括号（闭），取不到用小括号（开），无穷大那头永远用小括号", "==能取到的端点用中括号（闭），取不到用小括号（开），无穷大那头永远用小括号=="),
]

def patch(path, frags, extra=None):
    src = open(path, encoding='utf-8').read()
    orig = src
    for old, new in frags:
        n = src.count(old)
        assert n == 1, f"{path}: fragment count {n} != 1 :: {old[:30]}"
        src = src.replace(old, new)
    if extra:
        for old, new, cnt in extra:
            n = src.count(old)
            assert n == cnt, f"{path}: anchor count {n} != {cnt} :: {old[:50]}"
            src = src.replace(old, new)
    open(path, 'w', encoding='utf-8').write(src)
    print(f"patched {path} ({len(orig)} -> {len(src)})")

# 1) vsum source + generated copies
for p in ['/home/hatch/workspace/study/path/gen_path.py',
          '/home/hatch/workspace/study/github/path.js',
          '/home/hatch/workspace/study/github-repo/tianya/path.js']:
    patch(p, FRAGS)

# 2) vtop: add VTOP dict in gen_path.py and assignment
gp = '/home/hatch/workspace/study/path/gen_path.py'
src = open(gp, encoding='utf-8').read()
anchor = "            vs = VSUM.get((video['bvid'], video['p']))\n            if vs:\n                video['vsum'] = vs\n"
assert src.count(anchor) == 1
vtop_code = anchor + "            vt = VTOP.get((video['bvid'], video['p']))\n            if vt:\n                video['vtop'] = vt\n"
src = src.replace(anchor, vtop_code)
vsum_def = "VSUM = {"
assert src.count(vsum_def) >= 1
vtop_dict = ("VTOP = {\n (BVID, 1): [\"把一些确定的、互不相同的对象看成一个整体，就是集合；整体里的每个对象叫元素。\", "
             "\"常用数集的记号要记牢：N 自然数（从 0 开始）、N* 或 N+ 正整数、Z 整数、Q 有理数、R 实数。\", "
             "\"同一个式子，代表元素不同，集合完全不同。\"],\n}\n\n")
i = src.find(vsum_def)
src = src[:i] + vtop_dict + src[i:]
open(gp, 'w', encoding='utf-8').write(src)
print("gen_path.py: VTOP added")

# 3) vtop field into generated path.js copies: insert after lesson1 vsum closing
VTOP_JSON = ', "vtop": ["把一些确定的、互不相同的对象看成一个整体，就是集合；整体里的每个对象叫元素。", "常用数集的记号要记牢：N 自然数（从 0 开始）、N* 或 N+ 正整数、Z 整数、Q 有理数、R 实数。", "同一个式子，代表元素不同，集合完全不同。"]'
TAIL = '点集别把点拆开写。"}'
for p in ['/home/hatch/workspace/study/github/path.js',
          '/home/hatch/workspace/study/github-repo/tianya/path.js']:
    src = open(p, encoding='utf-8').read()
    assert src.count(TAIL) == 1, f"{p}: tail count {src.count(TAIL)}"
    src = src.replace(TAIL, '点集别把点拆开写。"' + VTOP_JSON + '}')
    open(p, 'w', encoding='utf-8').write(src)
    print(f"vtop inserted {p}")
print("ALL DONE")
