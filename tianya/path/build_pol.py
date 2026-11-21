# -*- coding: utf-8 -*-
"""政治数据包组装：gen_pack.py 一次只装一章，本脚本按 spec_pol.py 的 CHAPTERS 把 4 课 + 综合探究
拼成一个 book，节点/单元结构与 gen_pack 输出完全一致（video=None 时的同构产物）。
用法：python3 build_pol.py"""
import json, os, importlib.util
BASE = os.path.dirname(os.path.abspath(__file__))

sp = importlib.util.spec_from_file_location('spec_pol', os.path.join(BASE, 'spec_pol.py'))
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

chapters = [dict(no=c['no'], title=c['title'], units=list(c['units'])) for c in S.CHAPTERS]
book = dict(subject=S.SUBJECT, book=S.BOOKNAME, version=S.VERSION,
            chapters=chapters,
            order=[u['id'] for u in S.UNITS], nodes=nodes, units=units, nodeUnit=nu)
out = os.path.join(BASE, '..', 'github', S.OUTFILE)
with open(out, 'w', encoding='utf-8') as f:
    f.write('var ' + S.VARNAME + ' = ' + json.dumps(book, ensure_ascii=False) + ';\n')
print('wrote', out, 'units', len(units), 'nodes', len(nodes), 'chapters', len(chapters))
