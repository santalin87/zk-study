# -*- coding: utf-8 -*-
"""把第二章 spec（ch2/spec_<subj>2.py）+ 内容（ch2/content_<subj>.json）合并进
已上线的第一章数据包（~/workspace/study/github/path-<subj>.js），只追加、不改第一章内容。
历史额外处理 FILL_VIDEOS/FILL_VSUM（第3、4课视频补登，总控已核实、任务授权）。
用法: python3 append_ch2.py <phy|chem|eng|hist|geo>"""
import json, os, sys, importlib.util

BASE = os.path.dirname(os.path.abspath(__file__))
PATH_DIR = os.path.dirname(BASE)
GH = os.path.join(PATH_DIR, '..', 'github')

CFG = {
 'phy':  dict(var='PATH_BOOK_PHY', file='path-phy.js', style='phy',
              chapter=dict(no='第二章', title='匀变速直线运动')),
 'chem': dict(var='PATH_BOOK_CHEM', file='path-chem.js', style='pack',
              chapter=dict(no=2, title='元素与物质世界')),
 'eng':  dict(var='PATH_BOOK_ENG', file='path-eng.js', style='pack',
              chapter=dict(no='Unit 2', title='Travelling Around')),
 'hist': dict(var='PATH_BOOK_HIST', file='path-hist.js', style='pack',
              chapter=dict(no='第二单元', title='三国两晋南北朝的民族交融与隋唐统一多民族封建国家的发展')),
 'geo':  dict(var='PATH_BOOK_GEO', file='path-geo.js', style='pack',
              chapter=dict(no='第二章', title='地球上的大气')),
}
PHY_FROM = '锦城大同教育·必修一同步课'
PHY_BVID = 'BV18E411q7SW'


def load_spec(subj):
    p = os.path.join(BASE, f'spec_{subj}2.py')
    sp = importlib.util.spec_from_file_location(f'spec_{subj}2', p)
    m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
    return m


def main():
    subj = sys.argv[1]
    cfg = CFG[subj]
    S = load_spec(subj)
    content = json.load(open(os.path.join(BASE, f'content_{subj}.json'), encoding='utf-8'))

    fpath = os.path.join(GH, cfg['file'])
    raw = open(fpath, encoding='utf-8').read()
    tail = ''
    if subj == 'phy':
        head, tail = raw.split(';\n', 1)
        js = head.split(' = ', 1)[1]
        tail = ';\n' + tail
    else:
        js = raw.strip()
        assert js.startswith('var ' + cfg['var'] + ' = ') and js.endswith(';')
        js = js[len('var ' + cfg['var'] + ' = '):-1]
    book = json.loads(js)
    before_units = set(book['units']); before_nodes = set(book['nodes'])

    units2, nodes2, nu2 = {}, {}, {}
    for u in S.UNITS2:
        uid = u['id']
        if cfg['style'] == 'phy':
            v = None
            if u.get('p'):
                v = dict(bvid=PHY_BVID, p=u['p'], t=u['vt'], **{'from': PHY_FROM},
                         vtop=S.VTOP2[uid], vsum=S.VSUM2[uid], vtech=S.VTECH2[uid])
            units2[uid] = dict(id=uid, name=u['name'], secs=u['secs'], pageFrom=u['pageFrom'],
                               pageTo=u['pageTo'], members=u['members'], video=v)
        else:
            v = None
            if u.get('video'):
                vv = u['video']
                v = dict(bvid=vv['bvid'], p=vv['p'], t=vv['t'], dur=vv['dur'], **{'from': 0},
                         vtop=S.VTOP2[uid], vsum=S.VSUM2[uid], vtech=S.VTECH2[uid], vgaokao=[])
            units2[uid] = dict(id=uid, name=u['name'], secs=u['secs'], pageFrom=u.get('pageFrom'),
                               pageTo=u.get('pageTo'), members=u['members'], video=v)
        for m in u['members']:
            nu2[m] = uid

    for nid, meta in S.NODES2.items():
        assert nid in content, f'content missing {nid}'
        d = dict(meta)
        d['content'] = content[nid]
        if cfg['style'] == 'phy':
            u = next(x for x in S.UNITS2 if nid in x['members'])
            d['video'] = dict(bvid=PHY_BVID, p=u['p'], t=u['vt'], **{'from': PHY_FROM}) if u.get('p') else None
        else:
            d['video'] = units2[nu2[nid]]['video']
        nodes2[nid] = d

    if cfg['style'] == 'pack':
        # 与 gen_pack/gen_chem 相同的自动 next 回填（仅第二章内部）
        for nid, d in nodes2.items():
            for pre in d['pre']:
                assert pre in nodes2, f'{subj} pre {pre} not in ch2 nodes'
                nodes2[pre]['next'].append(nid)
    else:
        # 物理：给第一章末尾两节点补 next 指针（纯图链接追加，与 gen 程序自身行为一致）
        link = dict(id='phy2_h001', name='匀变速直线运动与速度公式')
        for src in ('phy_h009', 'phy_h011'):
            if link not in book['nodes'][src]['next']:
                book['nodes'][src]['next'].append(link)

    if subj == 'hist':
        import importlib.util as iu
        sp = iu.spec_from_file_location('spec_hist', os.path.join(PATH_DIR, 'spec_hist.py'))
        H = iu.module_from_spec(sp); sp.loader.exec_module(H)
        for uid, vv in S.FILL_VIDEOS.items():
            v = dict(bvid=vv['bvid'], p=vv['p'], t=vv['t'], dur=vv['dur'], **{'from': 0},
                     vtop=H.VTOP[uid], vsum=S.FILL_VSUM[uid], vtech=H.VTECH[uid], vgaokao=[])
            book['units'][uid]['video'] = v
            for m in book['units'][uid]['members']:
                book['nodes'][m]['video'] = v

    ch = dict(cfg['chapter']); ch['units'] = [u['id'] for u in S.UNITS2]
    book['chapters'].append(ch)
    book['order'].extend(u['id'] for u in S.UNITS2)
    book['units'].update(units2)
    book['nodes'].update(nodes2)
    book['nodeUnit'].update(nu2)

    assert before_units <= set(book['units']) and before_nodes <= set(book['nodes'])
    out = 'var ' + cfg['var'] + ' = ' + json.dumps(book, ensure_ascii=False) + ';\n' + (tail.lstrip(';\n').join(['', '']) if False else '')
    if subj == 'phy':
        out = 'var ' + cfg['var'] + ' = ' + json.dumps(book, ensure_ascii=False) + tail
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(out)
    print(subj, 'merged: +units', len(units2), '+nodes', len(nodes2),
          '| total units', len(book['units']), 'nodes', len(book['nodes']),
          '| chapters', [(c['no'], c['title']) for c in book['chapters']])


if __name__ == '__main__':
    main()
