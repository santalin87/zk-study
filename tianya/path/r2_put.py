#!/usr/bin/env python3
"""R2 上传（REST 显式账号 Santalin87，桶 tianya-study-uploads，curl 执行）。用法: r2_put.py <本地文件> <key> [...]"""
import json, os, subprocess, sys, tempfile
from urllib.parse import quote

out = subprocess.run(['/opt/hatch/bin/authdc', 'cred', 'surrogate', 'custom.cloudflare'],
                     capture_output=True, text=True).stdout
surr = json.loads(out)['credentials'][0]['surrogate']
ACCT = '34b542b32b08f95cd910bf8789fb6e44'
CT = {'.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.html': 'text/html; charset=utf-8'}
fd, cfg = tempfile.mkstemp()
os.write(fd, f'header = "Authorization: Bearer {surr}"\n'.encode()); os.close(fd); os.chmod(cfg, 0o600)
try:
    args = sys.argv[1:]
    for i in range(0, len(args), 2):
        path, key = args[i], args[i + 1]
        ext = '.' + key.rsplit('.', 1)[-1]
        url = f'https://api.cloudflare.com/client/v4/accounts/{ACCT}/r2/buckets/tianya-study-uploads/objects/' + '/'.join(quote(s) for s in key.split('/'))
        r = subprocess.run(['curl', '-s', '-K', cfg, '-X', 'PUT', '--data-binary', f'@{path}',
                            '-H', f'Content-Type: {CT.get(ext, "application/octet-stream")}',
                            '-w', '\nHTTP %{http_code}', url], capture_output=True, text=True, timeout=900)
        ok = '"success":true' in r.stdout or '"success": true' in r.stdout
        print(key, os.path.getsize(path), '->', 'OK' if ok else r.stdout[-200:])
        if not ok:
            sys.exit(1)
finally:
    os.remove(cfg)
