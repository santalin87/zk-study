# -*- coding: utf-8 -*-
"""生物数据包组装：gen_pack.py 一次只装一章，本脚本按 spec_bio.CHAPTERS 依次装入 6 章，
拼出 chapters 数组，输出格式与 gen_pack 完全一致（units/nodes/nodeUnit/order/chapters/subject/book/version）。
用法：python3 build_bio.py"""
import json, os, importlib.util
BASE = os.path.dirname(os.path.abspath(__file__))

sp = importlib.util.spec_from_file_location('spec_bio', os.path.join(BASE, 'spec_bio.py'))
S = importlib.util.module_from_spec(sp); sp.loader.exec_module(S)

content = {}
for fn in S.CONTENT_FILES:
    content.update(json.load(open(os.path.join(BASE, fn), encoding='utf-8')))

units, nodes, nu, chapters, order = {}, {}, {}, [], []
for ch in S.CHAPTERS:
    ch_units = []
    for u in ch['units']:
        miss = [m for m in u['members'] if m not in content]
        assert not miss, f"missing content: {miss}"
        units[u['id']] = dict(id=u['id'], name=u['name'], secs=u['secs'], pageFrom=u.get('pageFrom'),
                              pageTo=u.get('pageTo'), members=u['members'], video=None)
        ch_units.append(u['id']); order.append(u['id'])
        for m in u['members']:
            nu[m] = u['id']
    chapters.append(dict(no=ch['no'], title=ch['title'], units=ch_units))
    for nid, meta in ch['nodes'].items():
        d = dict(meta); d['content'] = content[nid]; d['video'] = None
        nodes[nid] = d
for nid, d in nodes.items():
    for pre in d['pre']:
        nodes[pre]['next'].append(nid)

book = dict(subject=S.SUBJECT, book=S.BOOKNAME, version=S.VERSION,
            chapters=chapters, order=order, nodes=nodes, units=units, nodeUnit=nu)
out = os.path.join(BASE, '..', 'github', S.OUTFILE)
with open(out, 'w', encoding='utf-8') as f:
    f.write('var ' + S.VARNAME + ' = ' + json.dumps(book, ensure_ascii=False) + ';\n')
print('wrote', out, 'chapters', len(chapters), 'units', len(units), 'nodes', len(nodes))
