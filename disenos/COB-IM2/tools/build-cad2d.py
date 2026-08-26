#!/usr/bin/env python3
"""Build the L4 2D CAD ground-truth viewer.

WHY THIS EXISTS
---------------
Every existing L4 artifact shows what the PIPELINE concluded. `cad-view.py`
renders the source, but as a static PNG: one layer toggle costs a 35-50 s
re-parse and a new file. So nobody can look at the drawing and the extraction
side by side and ask "is that what the source actually says?" in under a minute.

This builds an interactive plan of the SOURCE DXF entities, with the extractor's
own output as a toggleable overlay, so the two can be compared by eye.

THE RULE IT ENFORCES: source entities are drawn EXACTLY as the DXF holds them.
Where a duct side is drawn as three near-parallel lines, all three are drawn.
Nothing is collapsed, merged, paired, or de-duplicated on the way in -- that
collapsing is precisely the step under suspicion, so the viewer must not repeat
it or it cannot be used to audit it.

READ-ONLY over the source DXFs. Writes one self-contained HTML file.

Usage: build-cad2d.py [out.html]
"""
import json
import math
import os
import re
import sys
import time

import ezdxf

RESEARCH = "/home/cristian/investigacion/COB-IM2"
DXF_PATH = {
    "14A": f"{RESEARCH}/raw/COB-IM2_14A_level_4.dxf",
    "14B": f"{RESEARCH}/raw/COB-IM2_14B_level_4.dxf",
    "14C": f"{RESEARCH}/raw/COB-IM2_14C_level_4.dxf",
}
# Verbatim from tools/l4/extract-graph.py OFFSETS -- the global 14A frame.
# 14B [CERT] structural grid. 14C [INFER-strong] chained via 14B.
OFFSETS = {
    "14A": (0.000000, 0.000000),
    "14B": (37.239900, -0.506700),
    "14C": (33.779900, -1.038400),
}
FULL_JSON    = f"{RESEARCH}/tools/out/L4-full.json"   # certified artifact (supersedes L4-graph.json)
CONTEXT_JSON = f"{RESEARCH}/tools/l4/out/L4-context.json"

# Content window in the global frame. The sheets carry a title-block/detail tail
# out at X < -900 that would otherwise dominate a fit-to-extents view. The window
# reaches to X=380 so the M-HVAC-DUCT legend strip (X 244-370) is still carried --
# it is real source content on a duct layer -- but the opening view fits the PLAN
# only, so the legend never decides the zoom. See FIT_LAYERS.
CLIP = (0.0, 380.0, 0.0, 60.0)

SIZE_RE  = re.compile(r'(\d+)"\s*[xX]\s*(\d+)"')          # byte-identical to extract-graph.py
ROUND_RE = re.compile(r'(\d+)\s*"?\s*(?:ø|Ø|O\.?D\.?|DIA)', re.I)
BOD_RE   = re.compile(r'BOD\s*(\d+(?:\.\d+)?)')             # byte-identical to extract-graph.py
CFM_RE   = re.compile(r'(\d+(?:\.\d+)?)\s*CFM', re.I)
BOD_PLAUSIBLE = (2.0, 6.0)   # level-4 ceiling band; outside this a BOD is flagged, never dropped
Q = 10000.0    # quantisation: 0.1 mm. The width gate under audit is 15-20 mm,
               # so the viewer must resolve two orders of magnitude finer.

SRC_LAYERS = {
    "HVAC - Ductos": "ducts",
    "M-HVAC-DUCT":   "mduct",
    "PDF_Text":      "labels",
    "PDF2_Text":     "labels",
    "PDF3_Text":     "labels",
    "PDF4_Text":     "labels",   # re-bucketed per label kind below
}

FIT_LAYERS = {"ducts", "lsize", "lbod"}   # layers that define the opening view

LAYER_DEFS = [
    ("ducts",  "HVAC - Ductos (source)",   "#4ea1ff", True),
    ("mduct",  "M-HVAC-DUCT (legend)",     "#8b7fd4", False),
    ("lsize",  "Size labels W\u00d7H / \u00f8",   "#e8c25a", True),
    ("lbod",   "BOD elevations",           "#4ec9a7", True),
    ("lbad",   "BOD out of range \u26a0",       "#f85149", True),
    ("linfo",  "CFM / tags / dims",        "#7d8899", False),
    ("grid",   "Column grid [INFERRED]",   "#5a6472", False),
    ("rlab",   "Runs \u00b7 height from label", "#3fb950", False),
    ("rrnd",   "Runs \u00b7 height label-round", "#58a6ff", False),
    ("runk",   "Runs \u00b7 height UNKNOWN",     "#f85149", False),
    ("nodes",  "Nodes (deg \u2265 3 filled)",    "#ff9f43", False),
    ("fit",    "Fittings",                  "#2ecc71", False),
    ("term",   "Terminals / equipment",     "#d2a8ff", False),
]


def _strip_mtext(raw):
    s = re.sub(r'\{[^}]*\}', '', raw)
    s = re.sub(r'\\[A-Za-z][^;]*;', '', s).replace('\\P', ' ').strip()
    return s


def clipped(xs, ys):
    x0, x1, y0, y1 = CLIP
    return not (max(xs) < x0 or min(xs) > x1 or max(ys) < y0 or min(ys) > y1)


def enc(pts):
    """Delta-encode to 0.1 mm integers: [x0, y0, dx1, dy1, ...]."""
    out = [int(round(pts[0][0] * Q)), int(round(pts[0][1] * Q))]
    px, py = out[0], out[1]
    for x, y in pts[1:]:
        ix, iy = int(round(x * Q)), int(round(y * Q))
        out.append(ix - px)
        out.append(iy - py)
        px, py = ix, iy
    return out


def polylen(pts, closed):
    seq = pts + [pts[0]] if closed else pts
    return sum(math.dist(seq[i], seq[i + 1]) for i in range(len(seq) - 1))


def extract():
    ents = []
    counts = {k: 0 for k, _, _, _ in LAYER_DEFS}
    sheets = ["14A", "14B", "14C"]

    for si, sid in enumerate(sheets):
        t0 = time.time()
        doc = ezdxf.readfile(DXF_PATH[sid])
        ox, oy = OFFSETS[sid]
        for e in doc.modelspace():
            lay = SRC_LAYERS.get(e.dxf.layer)
            if lay is None:
                continue
            t = e.dxftype()
            h = e.dxf.handle
            try:
                if t == "LWPOLYLINE":
                    pts = [(v[0] + ox, v[1] + oy) for v in e.get_points()]
                    cl = bool(e.closed)
                elif t == "POLYLINE":
                    pts = [(v.dxf.location[0] + ox, v.dxf.location[1] + oy) for v in e.vertices]
                    cl = bool(e.is_closed)
                elif t == "LINE":
                    pts = [(e.dxf.start[0] + ox, e.dxf.start[1] + oy),
                           (e.dxf.end[0] + ox, e.dxf.end[1] + oy)]
                    cl = False
                elif t == "SPLINE":
                    pts = [(p[0] + ox, p[1] + oy) for p in e.flattening(0.005)]
                    cl = False
                elif t == "SOLID":
                    vs = [e.dxf.vtx0, e.dxf.vtx1, e.dxf.vtx3, e.dxf.vtx2]
                    pts = [(v[0] + ox, v[1] + oy) for v in vs]
                    cl = True
                elif t in ("CIRCLE", "ARC"):
                    c = e.dxf.center
                    cx, cy, r = c[0] + ox, c[1] + oy, float(e.dxf.radius)
                    if not clipped([cx - r, cx + r], [cy - r, cy + r]):
                        continue
                    d = {"l": lay, "s": si, "h": h, "t": t,
                         "c": [int(round(cx * Q)), int(round(cy * Q)), int(round(r * Q))]}
                    if t == "ARC":
                        d["a"] = [round(float(e.dxf.start_angle), 4),
                                  round(float(e.dxf.end_angle), 4)]
                    ents.append(d)
                    counts[lay] += 1
                    continue
                elif t in ("TEXT", "MTEXT"):
                    raw = e.text if t == "MTEXT" else e.dxf.text
                    txt = _strip_mtext(raw)
                    if not txt:
                        continue
                    ins = e.dxf.insert
                    x, y = ins[0] + ox, ins[1] + oy
                    if not clipped([x], [y]):
                        continue
                    d = {"l": lay, "s": si, "h": h, "t": "TEXT",
                         "c": [int(round(x * Q)), int(round(y * Q))],
                         "x": txt[:80],
                         "r": round(float(getattr(e.dxf, "rotation", 0.0)), 2)}
                    m = SIZE_RE.search(txt)
                    mr = ROUND_RE.search(txt)
                    mb = BOD_RE.search(txt)
                    mc = CFM_RE.search(txt)
                    if m:
                        d["sz"] = [int(m.group(1)), int(m.group(2))]
                    elif mr:
                        d["rd"] = int(mr.group(1))
                    if mb:
                        d["bod"] = float(mb.group(1))
                    if mc:
                        d["cfm"] = float(mc.group(1))
                    # bucket: an out-of-range BOD gets its own layer so it is
                    # visible as suspect rather than silently mixed in or dropped
                    if "bod" in d:
                        lo, hi = BOD_PLAUSIBLE
                        d["l"] = "lbod" if lo <= d["bod"] <= hi else "lbad"
                    elif "sz" in d or "rd" in d:
                        d["l"] = "lsize"
                    else:
                        d["l"] = "linfo"
                    lay = d["l"]
                    ents.append(d)
                    counts[lay] += 1
                    continue
                else:
                    continue
            except Exception:
                continue

            if len(pts) < 2:
                continue
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            if not clipped(xs, ys):
                continue
            ents.append({"l": lay, "s": si, "h": h, "t": t, "cl": 1 if cl else 0,
                         "p": enc(pts), "L": round(polylen(pts, cl), 4)})
            counts[lay] += 1
        print(f"  {sid}: parsed in {time.time()-t0:.1f}s", file=sys.stderr)

    # ---- extractor output, as an overlay to diff against the source ----
    # L4-full.json is the certified artifact; L4-graph.json is superseded and
    # is deliberately NOT read here. Runs are bucketed by HEIGHT PROVENANCE so
    # the assumed-Z gap is visible without reading a number.
    graph_meta = None
    H_LAYER = {"label": "rlab", "label-round": "rrnd", "unknown": "runk"}
    if os.path.exists(FULL_JSON):
        g = json.load(open(FULL_JSON))
        graph_meta = {"meta": g.get("meta", {}).get("stats"),
                      "source": os.path.basename(FULL_JSON),
                      "extraction": g.get("meta", {}).get("extraction"),
                      "bod_datum": g.get("meta", {}).get("bod_datum")}
        for r in g.get("runs", []):
            lay = H_LAYER.get(r.get("h_src"), "runk")
            pts = [tuple(r["p0"][:2]), tuple(r["p1"][:2])]
            ents.append({"l": lay, "s": -1, "h": str(r.get("id")), "t": "RUN", "cl": 0,
                         "p": enc(pts), "w": r.get("w"), "ht": r.get("h"),
                         "hs": r.get("h_src"), "ws": r.get("w_src"),
                         "bod": r.get("bod"), "bs": r.get("bod_src"),
                         "lb": r.get("label"), "cls": r.get("cls"), "shp": r.get("shape"),
                         "L": round(r.get("L", 0.0), 4)})
            counts[lay] += 1
        for n in g.get("nodes", []):
            ents.append({"l": "nodes", "s": -1, "h": f'n{n["x"]:.2f},{n["y"]:.2f}', "t": "NODE",
                         "c": [int(round(n["x"] * Q)), int(round(n["y"] * Q))],
                         "dg": n.get("deg")})
            counts["nodes"] += 1
        for f in g.get("fittings", []):
            ents.append({"l": "fit", "s": -1, "h": str(f.get("node")), "t": "FIT",
                         "c": [int(round(f["x"] * Q)), int(round(f["y"] * Q))],
                         "k": f.get("kind")})
            counts["fit"] += 1
        for tm in g.get("terminals", []) + g.get("equipment", []):
            ents.append({"l": "term", "s": -1, "h": str(tm.get("tag")), "t": "TERM",
                         "c": [int(round(tm["x"] * Q)), int(round(tm["y"] * Q))],
                         "k": tm.get("type"), "cfm": tm.get("cfm")})
            counts["term"] += 1

    ctx_flags = None
    if os.path.exists(CONTEXT_JSON):
        c = json.load(open(CONTEXT_JSON))
        ctx_flags = c.get("flags")
        for col in c.get("grid_columns", []):
            ents.append({"l": "grid", "s": -1,
                         "h": f'{col.get("axis_x")}-{col.get("axis_y")}', "t": "COL",
                         "c": [int(round(col["x"] * Q)), int(round(col["y"] * Q))]})
            counts["grid"] += 1

    return ents, counts, graph_meta, ctx_flags, sheets


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "cob-im2-L4-cad2d.html")
    tpl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cad2d-template.html")

    print("reading source DXFs (read-only)...", file=sys.stderr)
    ents, counts, gmeta, cflags, sheets = extract()

    xs, ys = [], []
    for e in ents:
        if "p" in e and e["p"]:
            p = e["p"]
            x, y = p[0], p[1]
            xs.append(x / Q); ys.append(y / Q)
            for i in range(2, len(p), 2):
                x += p[i]; y += p[i+1]
                xs.append(x / Q); ys.append(y / Q)
        elif "c" in e:
            xs.append(e["c"][0] / Q); ys.append(e["c"][1] / Q)
    bounds = [min(xs), min(ys), max(xs), max(ys)]

    # Opening view fits the plan geometry, not the off-plan legend strip.
    fxs, fys = [], []
    for e in ents:
        if e["l"] not in FIT_LAYERS:
            continue
        if e.get("p"):
            p = e["p"]; x, y = p[0], p[1]
            fxs.append(x / Q); fys.append(y / Q)
            for i in range(2, len(p), 2):
                x += p[i]; y += p[i+1]
                fxs.append(x / Q); fys.append(y / Q)
        elif e.get("c"):
            fxs.append(e["c"][0] / Q); fys.append(e["c"][1] / Q)
    fit_bounds = [min(fxs), min(fys), max(fxs), max(fys)] if fxs else bounds

    prov = ("<b>Provenance.</b> Source layers are drawn exactly as the DXF holds them &mdash; "
            "nothing merged, paired or de-duplicated. Derived overlays are pipeline OUTPUT, not source: "
            "the column grid is <b>INFERRED</b> (" + (cflags or {}).get("column_grid_source", "?") + "), "
            "runs/nodes/fittings come from <b>L4-full.json</b> (certified; L4-graph.json is superseded and not used). "
            "Do not read a derived overlay as ground truth.")

    data = {
        "meta": {
            "q": Q, "sheets": sheets, "bounds": bounds, "fit": fit_bounds, "clip": list(CLIP),
            "counts": counts, "built": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
            "offsets": OFFSETS, "provenance": prov,
            "graph": gmeta, "context_flags": cflags,
            "source": {k: os.path.basename(v) for k, v in DXF_PATH.items()},
        },
        "layers": [{"id": i, "name": n, "color": c, "on": o} for i, n, c, o in LAYER_DEFS],
        "ents": ents,
    }

    blob = json.dumps(data, separators=(",", ":"))
    html = open(tpl_path, encoding="utf-8").read().replace("__DATA__", blob)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)

    print(f"\nwrote {out}  ({len(html)/1048576:.1f} MB)", file=sys.stderr)
    print(f"  bounds  X[{bounds[0]:.2f}, {bounds[2]:.2f}]  Y[{bounds[1]:.2f}, {bounds[3]:.2f}]", file=sys.stderr)
    for k, v in counts.items():
        print(f"  {k:8} {v:7d}", file=sys.stderr)


if __name__ == "__main__":
    main()
