#!/usr/bin/env bash
# Downloads the latest aircraft DB from wiedehopf/tar1090-db and places
# gzip-compressed shards into public/db/ as <KEY>.gz.
#
# The upstream repo stores files as db/<KEY>.js — they are already gzip;
# we rename them to .gz for our static serving setup.
#
# Usage:
#   ./scripts/vendor-db.sh          # fresh download (removes old data)
#   ./scripts/vendor-db.sh --skip-if-exists  # skip if public/db/ already populated
set -euo pipefail

REPO_URL="https://github.com/wiedehopf/tar1090-db.git"
DST="public/db"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

# --skip-if-exists: useful in CI / dev to avoid re-downloading every build
if [[ "${1:-}" == "--skip-if-exists" ]] && [[ -d "$DST" ]] && [[ -n "$(ls -A "$DST" 2>/dev/null)" ]]; then
  echo "vendor-db: $DST already exists, skipping download."
  exit 0
fi

echo "vendor-db: cloning tar1090-db (shallow)..."
git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$TMPDIR/tar1090-db"
cd "$TMPDIR/tar1090-db"
git sparse-checkout set db
cd - > /dev/null

# Clean old data and copy fresh
rm -rf "$DST"
mkdir -p "$DST"

count=0
for f in "$TMPDIR/tar1090-db/db"/*.js; do
  key="$(basename "$f" .js)"
  cp "$f" "$DST/$key.js"
  count=$((count + 1))
done

echo "vendor-db: vendored $count shards to $DST"
