#!/usr/bin/env bash
# Rebuilds the site with your live API URL baked in and zips it for Netlify Drop.
# Usage:  bash tools/make-drop-zip.sh https://your-api.onrender.com
set -euo pipefail
API_URL="${1:?usage: make-drop-zip.sh <api-url>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/client"
VITE_API_URL="$API_URL" npm run build

cd "$ROOT"
rm -f crown-clipper-site.zip
python3 - "$ROOT" <<'PY'
import os, sys, zipfile
root = sys.argv[1]
src = os.path.join(root, 'client', 'dist')
out = os.path.join(root, 'crown-clipper-site.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _, files in os.walk(src):
        for f in sorted(files):
            full = os.path.join(dirpath, f)
            z.write(full, os.path.relpath(full, src))
print('Done:', out)
PY
