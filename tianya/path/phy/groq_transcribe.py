#!/usr/bin/env python3
"""用 Groq whisper-large-v3 转录 mp3，产出 groq_<tag>.json / <tag>.vtt / <tag>.txt。
用法: python3 groq_transcribe.py <mp3路径> <tag>   （产物落在 mp3 所在目录）"""
import json, os, sys, urllib.request, uuid

mp3, tag = sys.argv[1], sys.argv[2]
outdir = os.path.dirname(os.path.abspath(mp3))
key = open(os.path.expanduser('~/.config/groq/keys.txt'), encoding='utf-8').read().split()[0]

boundary = '----muse' + uuid.uuid4().hex
parts = []
def field(name, value):
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
def filefield(name, fname, data, ctype):
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{fname}"\r\nContent-Type: {ctype}\r\n\r\n'.encode() + data + b'\r\n')
field('model', 'whisper-large-v3')
field('language', 'zh')
field('response_format', 'verbose_json')
filefield('file', os.path.basename(mp3), open(mp3, 'rb').read(), 'audio/mpeg')
parts.append(f'--{boundary}--\r\n'.encode())
body = b''.join(parts)
req = urllib.request.Request('https://api.groq.com/openai/v1/audio/transcriptions',
                             data=body, headers={'Authorization': f'Bearer {key}',
                                                 'Content-Type': f'multipart/form-data; boundary={boundary}'})
res = json.load(urllib.request.urlopen(req, timeout=900))
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
