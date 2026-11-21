#!/usr/bin/env python3
"""Rebuild the Tianya study site handover package.

Usage: python3 make_handover_package.py
Output: ~/workspace/tianya-study-handover.tar.gz

Includes code, data, specs and docs from ~/workspace/study/.
Excludes media files (.mp4/.mp3/.wav/...), caches, and the 9.3G
markup/ production intermediates (only small .json/.md/.txt/.csv
kept from markup/). Finished videos already live in R2 video/;
source media lives on Google Drive and the builder's local
math2/phy2/gap dirs -- pass those separately if ever needed.
No secrets are ever included: no tokens, keys, or .csv credentials.
"""
import os
import tarfile

SRC = os.path.expanduser("~/workspace/study")
OUT = os.path.expanduser("~/workspace/tianya-study-handover.tar.gz")
MEDIA = {".mp4", ".mp3", ".wav", ".m4a", ".mov", ".avi", ".webm", ".ogg", ".flac"}
SKIP_DIRS = {"__pycache__", "node_modules", ".git"}
SKIP_FILES = {".DS_Store"}


def keep(path, rel):
    name = os.path.basename(path)
    if name in SKIP_FILES:
        return False
    if os.path.isdir(path):
        return name not in SKIP_DIRS
    if os.path.splitext(name)[1].lower() in MEDIA:
        return False
    if name.endswith(".pyc"):
        return False
    parts = rel.split(os.sep)
    if "markup" in parts:
        # only small patch/meta files from markup/, never the bulk media
        return os.path.splitext(name)[1].lower() in {".json", ".md", ".txt", ".csv"}
    return True


def main():
    count = 0
    with tarfile.open(OUT, "w:gz") as tf:
        for root, dirs, files in os.walk(SRC):
            rel_dir = os.path.relpath(root, os.path.dirname(SRC))
            dirs[:] = [d for d in dirs if keep(os.path.join(root, d), os.path.join(rel_dir, d))]
            for f in sorted(files):
                p = os.path.join(root, f)
                rel = os.path.relpath(p, os.path.dirname(SRC))
                if not keep(p, rel):
                    continue
                tf.add(p, arcname=rel)
                count += 1
    print(f"{OUT}  {count} files  {os.path.getsize(OUT)/1024/1024:.1f} MB")


if __name__ == "__main__":
    main()
