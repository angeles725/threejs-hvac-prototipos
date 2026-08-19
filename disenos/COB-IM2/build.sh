#!/usr/bin/env bash
# Rebuild the offline single-file deliverable cob-im2-3d.html from source.
# Needs internet ONLY at build time (vendored three is committed, so usually not even that).
set -e
cd "$(dirname "$0")"
# 1. regenerate the data layer from the DXF (read-only)
python3 extract-floor.py /home/cristian/investigacion/COB-IM2/raw cob-im2-floor.json
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
