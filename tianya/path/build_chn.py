# -*- coding: utf-8 -*-
"""语文数据包组装：gen_pack 一次只装一章，本脚本按 spec_chn.CHAPTERS 拼 9 章成一册。
输出结构与 gen_pack 完全一致：{subject, book, version, chapters, order, nodes, units, nodeUnit}，
节点 = spec 元信息 + content + video，next 由 pre 反填。"""
import json, os, importlib.util
BASE = os.path.dirname(os.path.abspath(__file__))
sp = importlib.util.spec_from_file_location('spec_chn', os.path.join(BASE, 'spec_chn.py'))
S = importlib.util.module_from_spec(sp); sp.loader.exec_module(S)

content = {}
for fn in S.CONTENT_FILES:
    content.update(json.load(open(os.path.join(BASE, fn), encoding='utf-8')))
miss = [m for u in S.UNITS for m in u['members'] if m not in content]
assert not miss, f'missing content: {miss}'
extra = [k for k in content if k not in S.NODES]
assert not extra, f'content without node: {extra}'

units, nodes, nu, chapters, order = {}, {}, {}, [], []
for no, title, us in S.CHAPTERS:
    chapters.append(dict(no=no, title=title, units=[u['id'] for u in us]))
    for u in us:
        order.append(u['id'])
        units[u['id']] = dict(id=u['id'], name=u['name'], secs=u['secs'], pageFrom=u.get('pageFrom'),
                              pageTo=u.get('pageTo'), members=u['members'], video=None)
        for m in u['members']:
            nu[m] = u['id']
for nid, meta in S.NODES.items():
    d = dict(meta); d['content'] = content[nid]; d['video'] = None
    nodes[nid] = d
for nid, d in nodes.items():
    for pre in d['pre']:
        assert pre in nodes, f'bad pre: {nid} -> {pre}'
        nodes[pre]['next'].append(nid)

book = dict(subject=S.SUBJECT, book=S.BOOKNAME, version=S.VERSION,
            chapters=chapters, order=order, nodes=nodes, units=units, nodeUnit=nu)
out = os.path.join(BASE, '..', 'github', S.OUTFILE)
with open(out, 'w', encoding='utf-8') as f:
    f.write('var ' + S.VARNAME + ' = ' + json.dumps(book, ensure_ascii=False) + ';\n')
print('wrote', out, 'chapters', len(chapters), 'units', len(units), 'nodes', len(nodes))
