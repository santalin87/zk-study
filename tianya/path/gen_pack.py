# -*- coding: utf-8 -*-
"""通用学习路径数据包生成器：用法 python3 gen_pack.py spec_eng.py
spec 文件需定义：VARNAME, SUBJECT, BOOKNAME, VERSION, CHAPTER（dict no/title）,
UNITS（list，含可选 video dict）, NODES（dict）, VTOP, VSUM, VTECH, CONTENT_FILES, OUTFILE。"""
import json, os, sys, importlib.util
BASE = os.path.dirname(os.path.abspath(__file__))

spec_path = sys.argv[1]
sp = importlib.util.spec_from_file_location('spec', spec_path)
S = importlib.util.module_from_spec(sp); sp.loader.exec_module(S)

content = {}
for fn in S.CONTENT_FILES:
    content.update(json.load(open(os.path.join(BASE, fn), encoding='utf-8')))
miss = [m for u in S.UNITS for m in u['members'] if m not in content]
assert not miss, f'missing content: {miss}'

units, nodes, nu = {}, {}, {}
for u in S.UNITS:
    v = None
    if u.get('video'):
        v = dict(bvid=u['video']['bvid'], p=u['video']['p'], t=u['video']['t'], dur=u['video']['dur'],
                 **{'from': 0}, vtop=S.VTOP[u['id']], vsum=S.VSUM[u['id']], vtech=S.VTECH[u['id']], vgaokao=[])
    units[u['id']] = dict(id=u['id'], name=u['name'], secs=u['secs'], pageFrom=u.get('pageFrom'),
                          pageTo=u.get('pageTo'), members=u['members'], video=v)
    for m in u['members']:
        nu[m] = u['id']
for nid, meta in S.NODES.items():
    d = dict(meta); d['content'] = content[nid]; d['video'] = units[nu[nid]]['video']
    nodes[nid] = d
for nid, d in nodes.items():
    for pre in d['pre']:
        nodes[pre]['next'].append(nid)

book = dict(subject=S.SUBJECT, book=S.BOOKNAME, version=S.VERSION,
            chapters=[dict(no=S.CHAPTER['no'], title=S.CHAPTER['title'], units=[u['id'] for u in S.UNITS])],
            order=[u['id'] for u in S.UNITS], nodes=nodes, units=units, nodeUnit=nu)
out = os.path.join(BASE, '..', 'github', S.OUTFILE)
with open(out, 'w', encoding='utf-8') as f:
    f.write('var ' + S.VARNAME + ' = ' + json.dumps(book, ensure_ascii=False) + ';\n')
print('wrote', out, 'units', len(units), 'nodes', len(nodes))
