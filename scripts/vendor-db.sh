#!/usr/bin/env bash
# Copies the original gzip-compressed DB trie shards into public/db/,
# renaming <KEY>.js -> <KEY>.gz (the bytes are already gzip; the original
# server served them with Content-Encoding: gzip and a .js name).
set -euo pipefail
SRC="tar1090/src/db-0c1185b"
DST="public/db"
mkdir -p "$DST"
count=0
for f in "$SRC"/*.js; do
  key="$(basename "$f" .js)"
  cp "$f" "$DST/$key.gz"
  count=$((count + 1))
done
echo "Vendored $count shards to $DST"
