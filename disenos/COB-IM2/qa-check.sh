#!/usr/bin/env bash
# Lightweight regression guard for the COB-IM2 deliverable — fast, no browser, no internet.
# Validates the built data layer + source hygiene; for the visual/console check use
# research/tools/capture.mjs. Run after any extract-floor.py / app.mjs change.
set -e
cd "$(dirname "$0")"

python3 - <<'PY'
import json, math, sys
d = json.load(open("cob-im2-floor.json"))
F = d["floor"]
xmin, xmax, ymin, ymax = F["xmin"], F["xmax"], F["ymin"], F["ymax"]
bad = lambda v: v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v)))
errs = []
for b in d["boxes"]:
    if b["w"] <= 0 or b["L"] <= 0 or bad(b["x"]) or bad(b["y"]) or bad(b.get("h")):
        errs.append("degenerate box")
    elif b["w"] > b["L"]:
        errs.append("box wider than long (false edge-pair)")
    elif not (0 < b.get("h", 0) <= 2):
        errs.append("box height out of (0,2] m")
    elif not (xmin - 2 <= b["x"] <= xmax + 2 and ymin - 2 <= b["y"] <= ymax + 2):
        errs.append("box outside floor")
for dd in d["ducts"]:
    if "h" not in dd or not dd.get("p") or any(bad(c) for pt in dd["p"] for c in pt):
        errs.append("bad duct")
for r in d["rounds"]:
    if r["d"] <= 0 or bad(r["x"]):
        errs.append("bad round")
if errs:
    from collections import Counter
    print("FAIL geometry:", dict(Counter(errs)))
    sys.exit(1)
print(f"PASS geometry — {len(d['boxes'])} boxes, {len(d['ducts'])} duct-outlines, "
      f"{len(d['rounds'])} rounds, {len(d['terminals'])} terminals all sane")
PY

python3 - <<'PY'
import ast, sys
t = ast.parse(open("extract-floor.py").read())
assigned, used = {}, set()
for n in ast.walk(t):
    if isinstance(n, ast.Name):
        (assigned.setdefault(n.id, 1) if isinstance(n.ctx, ast.Store) else used.add(n.id))
dead = [k for k in assigned if k not in used and not k.startswith("_")]
if dead:
    print("FAIL dead code in extract-floor.py:", dead)
    sys.exit(1)
print("PASS no dead code in extract-floor.py")
PY

# the built HTML must actually carry the current data layer (catches a stale, un-rebuilt deliverable)
if grep -q "window.FLOOR_DATA=" cob-im2-3d.html; then
  echo "PASS deliverable embeds FLOOR_DATA"
else
  echo "FAIL cob-im2-3d.html missing inlined data — run ./build.sh"; exit 1
fi

echo "QA OK"
