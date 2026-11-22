#!/usr/bin/env python3
"""CI 用 R2 上传：把本地目录传到 tianya-study-uploads 桶。
用法：ci_r2_upload.py <本地目录> <key 前缀> [<本地目录> <key 前缀> ...]
例如：ci_r2_upload.py tianya/github spa/ tianya/review spa/review/
凭据：环境变量 CLOUDFLARE_API_TOKEN（CI 里是 GitHub Secrets）；本地测试时没设就用本机 surrogate。
账号：环境变量 CLOUDFLARE_ACCOUNT_ID，默认 Santalin87。上传走 REST PUT，显式指定账号。
跳过：隐藏文件（. 开头）和 .bak 备份文件。
"""
import json, os, subprocess, sys, tempfile
from urllib.parse import quote

ACCT = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '34b542b32b08f95cd910bf8789fb6e44')
BUCKET = 'tianya-study-uploads'
CT = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
      '.vtt': 'text/vtt; charset=utf-8', '.webmanifest': 'application/manifest+json',
      '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8'}


def token():
    t = os.environ.get('CLOUDFLARE_API_TOKEN')
    if t:
        return t
    out = subprocess.run(['/opt/hatch/bin/authdc', 'cred', 'surrogate', 'custom.cloudflare'],
                         capture_output=True, text=True).stdout
    return json.loads(out)['credentials'][0]['surrogate']


def put(cfg, path, key):
    ext = '.' + key.rsplit('.', 1)[-1].lower() if '.' in key else ''
    url = (f'https://api.cloudflare.com/client/v4/accounts/{ACCT}/r2/buckets/{BUCKET}/objects/'
           + '/'.join(quote(s) for s in key.split('/')))
    r = subprocess.run(['curl', '-s', '-K', cfg, '-X', 'PUT', '--data-binary', f'@{path}',
                        '-H', f'Content-Type: {CT.get(ext, "application/octet-stream")}',
                        '-w', '\nHTTP %{http_code}', url],
                       capture_output=True, text=True, timeout=900)
    ok = '"success":true' in r.stdout or '"success": true' in r.stdout
    print(key, os.path.getsize(path), '->', 'OK' if ok else r.stdout[-200:])
    return ok


def main():
    args = sys.argv[1:]
    if len(args) < 2 or len(args) % 2:
        print(__doc__)
        sys.exit(2)
    fd, cfg = tempfile.mkstemp()
    os.write(fd, f'header = "Authorization: Bearer {token()}"\n'.encode())
    os.close(fd)
    os.chmod(cfg, 0o600)
    try:
        failed = 0
        for i in range(0, len(args), 2):
            src, prefix = args[i], args[i + 1].rstrip('/') + '/'
            for root, _dirs, files in os.walk(src):
                for name in sorted(files):
                    if name.startswith('.') or '.bak' in name:
                        continue
                    path = os.path.join(root, name)
                    key = prefix + os.path.relpath(path, src).replace(os.sep, '/')
                    if not put(cfg, path, key):
                        failed += 1
        if failed:
            print(f'{failed} 个文件上传失败')
            sys.exit(1)
        print('全部上传成功')
    finally:
        os.remove(cfg)


main()
