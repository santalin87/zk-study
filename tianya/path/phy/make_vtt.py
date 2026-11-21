#!/usr/bin/env python3
"""把 Groq verbose_json 响应转成 <tag>.vtt + <tag>.txt。用法: make_vtt.py <resp.json> <tag> <outdir>"""
import json, os, sys
resp, tag, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
res = json.load(open(resp, encoding='utf-8'))
json.dump(res, open(os.path.join(outdir, f'groq_{tag}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
segs = res['segments']
def ts(s):
    h = int(s // 3600); m = int((s % 3600) // 60); ss = s - h * 3600 - m * 60
    return f'{h:02d}:{m:02d}:{ss:06.3f}'
with open(os.path.join(outdir, f'{tag}.vtt'), 'w', encoding='utf-8') as f:
    f.write('WEBVTT\n\n')
    for sg in segs:
        f.write(f"{ts(sg['start'])} --> {ts(sg['end'])}\n{sg['text'].strip()}\n\n")
with open(os.path.join(outdir, f'{tag}.txt'), 'w', encoding='utf-8') as f:
    last = -10
    for sg in segs:
        if sg['start'] - last >= 8:
            f.write(f"\n[{int(sg['start']//60):02d}:{int(sg['start']%60):02d}] "); last = sg['start']
        f.write(sg['text'].strip() + ' ')
print(tag, 'segments:', len(segs), 'duration:', round(segs[-1]['end']) if segs else 0)
