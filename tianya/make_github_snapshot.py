#!/usr/bin/env python3
"""Build the GitHub snapshot staging dir for the Tianya study site.

Usage: python3 make_github_snapshot.py [--with-markup]
Output: ~/workspace/tianya-push/tianya/  (repo paths are tianya/...)
        ~/workspace/tianya-push-manifest-batch<N>  (NUL-delimited manifests)

Selection: same as the handover tarball (text files only; no media, no
binaries, no caches, no sync records), EXCLUDING:
  - github-repo/ (the old static files already on GitHub at tianya/)
  - markup/ (36 MB of video-production JSON patches; deferred unless
    --with-markup is passed, and even then it is split into its own batches)
  - imgs-src/ (all binary images)
The old static entry tianya/index.html is replaced by a redirect page to
https://20110419.xyz/ (the dynamic site); GitHub Pages cannot run the
dynamic site, so the repo is code storage only.
Manifests are split so each batch stays under the 16 MiB push_files limit.
"""
import os, shutil, sys

SRC = os.path.expanduser("~/workspace/study")
STAGE = os.path.expanduser("~/workspace/tianya-push")
DST = os.path.join(STAGE, "tianya")
MEDIA = {".mp4", ".mp3", ".wav", ".m4a", ".mov", ".avi", ".webm", ".ogg", ".flac"}
BIN = {".png", ".jpg", ".jpeg", ".ico", ".db", ".bin", ".tar.gz", ".zip", ".webp"}
SKIP_DIRS = {"__pycache__", "node_modules", ".git", "github-repo", "imgs-src"}
REDIRECT = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=https://20110419.xyz/">
<title>天娅的学习小站已搬家</title>
</head>
<body>
<p>天娅的学习小站已搬到动态站：<a href="https://20110419.xyz/">https://20110419.xyz/</a>，正在跳转……</p>
</body>
</html>
"""


def keep(rel, name):
    ext = os.path.splitext(name)[1].lower()
    if name.endswith(".muse-github-snapshot-sync.json") or ".tmp-" in name:
        return False
    if ext in MEDIA or ext in BIN or name.endswith(".pyc"):
        return False
    parts = rel.split(os.sep)
    if "markup" in parts:
        return False  # deferred; see --with-markup note in docstring
    return True


def main():
    if os.path.exists(STAGE):
        shutil.rmtree(STAGE)
    os.makedirs(DST)
    files = []  # (repo_rel, size)
    for root, dirs, names in os.walk(SRC):
        rel_dir = os.path.relpath(root, SRC)
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in sorted(names):
            src = os.path.join(root, f)
            rel = f if rel_dir == "." else os.path.join(rel_dir, f)
            if not keep(rel, f):
                continue
            try:
                with open(src, "rb") as fh:
                    data = fh.read()
                data.decode("utf-8")
            except (OSError, UnicodeDecodeError):
                print("skip non-utf8:", rel)
                continue
            dst = os.path.join(DST, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(src, dst)
            files.append(("tianya/" + rel.replace(os.sep, "/"), len(data)))
    # redirect page replaces the old static entry
    with open(os.path.join(DST, "index.html"), "w") as fh:
        fh.write(REDIRECT)
    files.append(("tianya/index.html", len(REDIRECT.encode())))
    # split into batches <= 15 MiB
    LIMIT = 4 * 1024 * 1024
    batches, cur, cur_size = [], [], 0
    for rel, sz in sorted(files):
        if cur and cur_size + sz > LIMIT:
            batches.append(cur)
            cur, cur_size = [], 0
        cur.append(rel)
        cur_size += sz
    if cur:
        batches.append(cur)
    for i, b in enumerate(batches, 1):
        mp = os.path.expanduser(f"~/workspace/tianya-push-manifest-batch{i}")
        with open(mp, "wb") as fh:
            for rel in b:
                fh.write(rel.encode() + b"\x00")
        total = sum(sz for rel, sz in files if rel in set(b))
        print(f"batch{i}: {len(b)} files, {total/1024/1024:.2f} MiB -> {mp}")
    print(f"total: {len(files)} files, {sum(s for _, s in files)/1024/1024:.2f} MiB, {len(batches)} batches")


if __name__ == "__main__":
    main()
