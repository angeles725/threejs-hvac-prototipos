#!/usr/bin/env bash
# Rebuild the offline single-file deliverable cob-im2-3d.html from source.
# Needs internet ONLY at build time (vendored three is committed, so usually not even that).
set -e
cd "$(dirname "$0")"
# 1. regenerate the data layer from the DXF (read-only)
#    the certified corpus keeps only .dwg; convert to .dxf with libredwg if needed.
RAW="/home/cristian/investigacion/COB-IM2/raw"
DXF="$RAW"
if ! ls "$RAW"/14A.dxf >/dev/null 2>&1; then
  DXF="$(mktemp -d)"
  for k in 14A 14B 14C; do dwg2dxf -o "$DXF/$k.dxf" "$RAW/$k.dwg"; done
fi
# clean up on any exit: the temp DXF dir (only if we made one, ~130 MB) + the bundle scratch file
cleanup() { [ "$DXF" != "$RAW" ] && rm -rf "$DXF"; rm -f /tmp/cob-bundle.js; }
trap cleanup EXIT
python3 extract-floor.py "$DXF" cob-im2-floor.json
# 2. bundle the viewer (app.mjs + vendored three) into one import-free ESM
npx --yes esbuild@0.19.11 app.mjs --bundle --format=esm \
  --alias:three=./vendor/three.module.js --outfile=/tmp/cob-bundle.js --log-level=warning
# 3. assemble offline HTML (HUD + inlined JSON + inlined bundle, zero network)
python3 - <<'PY'
j=open("cob-im2-floor.json").read(); b=open("/tmp/cob-bundle.js").read()
head=open("_hud.html").read()
open("cob-im2-3d.html","w").write(head+'<script>window.FLOOR_DATA='+j+';</scr'+'ipt>\n<script type="module">\n'+b+'\n</scr'+'ipt>\n</body>\n</html>\n')
print("wrote cob-im2-3d.html")
PY
