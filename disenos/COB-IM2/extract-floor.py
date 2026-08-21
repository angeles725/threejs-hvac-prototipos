#!/usr/bin/env python3
"""COB-IM2 level-4 floor extractor → cob-im2-floor.json (§19 build data layer).

Consumes the certified corpus findings:
  B1 unit=1m · B2 grid from bubbles (9.20 m bays) · B4 co-registration offsets ·
  B5 double-line duct outlines · B6 round ø sizes · B7 spatial-partition merge ·
  B8 BOD elevations + rect W"xH" labels · B9 terminals + AHU · B10 ghosted context.

Read-only over the DXF. Output coordinates are in 14A's frame, metres.
Usage: extract-floor.py [raw_dir] [out.json]
"""
import ezdxf, re, json, math, sys
from collections import Counter, defaultdict

RAW = sys.argv[1] if len(sys.argv) > 1 else "/home/cristian/investigacion/COB-IM2/raw"
OUT = sys.argv[2] if len(sys.argv) > 2 else "cob-im2-floor.json"

# B4 co-registration offsets into 14A frame (X only; Y ~0)
OFF = {"14A": 0.0, "14B": 37.235, "14C": 33.775}
# B7 spatial-partition ownership (draw-once at seam midpoints)
OWN = {"14A": (-1e9, 89.5), "14B": (89.5, 143.0), "14C": (143.0, 1e9)}
IN2M = 0.0254
# B8 §8.2: rectangular ducts carry a W"xH" inch label on the PDF text layer (502 labels, 46 sizes).
RECT = re.compile(r'(\d{1,2})"\s*[xX]\s*(\d{1,2})"')
# B8 §8.3: the nearest label within SNAP_R metres owns a run's height; beyond it, fall back to the
# labeled median. 2.5 m covers ~83% of drawn duct length (median run→label distance is 1.56 m).
SNAP_R = 2.5
clean = lambda t: re.sub(r'[{}]', '', re.sub(r'\\[A-Za-z][^;]*;', '', t)).strip()


def load(k):
    doc = ezdxf.readfile(f"{RAW}/{k}.dxf")
    return doc.modelspace(), OFF[k], OWN[k]


def collect_bod(msp, dx):
    """BOD (bottom-of-duct) tag points in A-frame: [(x,y,z)]."""
    pts = []
    for e in msp:
        if e.dxftype() != "MTEXT":
            continue
        m = re.search(r'BOD\s*([+-]?\d{1,2}\.\d{1,2})', e.text.replace('\n', ' '))
        if m:
            z = float(m.group(1))
            if 0 < z < 6:
                pts.append((e.dxf.insert.x + dx, e.dxf.insert.y, z))
    return pts


def nearest_bod(x, y, bod, default):
    if not bod:
        return default
    best, bz = 1e18, default
    for bx, by, bz2 in bod:
        d = (bx - x) ** 2 + (by - y) ** 2
        if d < best:
            best, bz = d, bz2
    return bz if best < 25 else default  # only trust within 5 m


def main():
    ducts, rounds, terminals, context = [], [], [], []
    rlabels = []  # (x, y, w_m, h_m) rectangular W"xH" section labels, A-frame
    gridX = {}
    allx, ally = [], []
    bod_all = []

    for k in ["14A", "14B", "14C"]:
        msp, dx, (lo, hi) = load(k)
        bod = collect_bod(msp, dx)
        bod_all += bod
        med = 3.76
        for e in msp:
            if not e.dxf.hasattr('layer'):
                continue
            lay = e.dxf.layer
            up = lay.upper()

            # grid bubbles (numbered) → axis X in A-frame
            if e.dxftype() == "MTEXT" and lay.startswith("PDF"):
                c = clean(e.text)
                if re.fullmatch(r'[0-9]{1,2}', c) and e.dxf.insert.y > 48:
                    gridX[int(c)] = round(e.dxf.insert.x + dx, 2)
                # terminal type tags
                m = re.search(r'\b([A-Z]{2})-\d{1,2}\b', e.text)
                if m and m.group(1) in ("SD", "LD", "RR", "CD", "BD", "FD", "ER", "SR"):
                    x = e.dxf.insert.x + dx
                    if lo <= x < hi:
                        terminals.append({"x": round(x, 2), "y": round(e.dxf.insert.y, 2),
                                          "t": m.group(1)})
                # rectangular section label W"xH" (B8 §8.2) → per-duct height source
                mr = RECT.search(e.text.replace('\n', ' '))
                if mr:
                    x = e.dxf.insert.x + dx
                    if lo <= x < hi:
                        rlabels.append((x, e.dxf.insert.y,
                                        int(mr.group(1)) * IN2M, int(mr.group(2)) * IN2M))

            # HVAC duct outlines
            if ('HVAC' in up or 'DUCT' in up):
                if e.dxftype() == "LWPOLYLINE":
                    p = [(round(q[0] + dx, 3), round(q[1], 3)) for q in e.get_points()]
                    if len(p) < 2:
                        continue
                    cx = sum(q[0] for q in p) / len(p)
                    if not (lo <= cx < hi):
                        continue
                    cy = sum(q[1] for q in p) / len(p)
                    z = nearest_bod(cx, cy, bod, med)
                    ducts.append({"p": p, "z": round(z, 2)})
                    allx += [q[0] for q in p]; ally += [q[1] for q in p]
                elif e.dxftype() == "CIRCLE":
                    x = e.dxf.center.x + dx
                    if not (lo <= x < hi):
                        continue
                    y = e.dxf.center.y
                    rounds.append({"x": round(x, 2), "y": round(y, 2),
                                   "d": round(2 * e.dxf.radius, 3),
                                   "z": round(nearest_bod(x, y, bod, med), 2)})

            # ghosted context: PDF2 long polylines (B10: >8 m = perimeter/walls/cores)
            if lay.startswith("PDF") and e.dxftype() == "LWPOLYLINE":
                p = [(q[0], q[1]) for q in e.get_points()]
                if len(p) < 2:
                    continue
                L = sum(math.dist(p[i], p[i + 1]) for i in range(len(p) - 1))
                if L > 8:
                    cx = sum(q[0] for q in p) / len(p) + dx
                    if lo <= cx < hi:
                        context.append({"p": [[round(q[0] + dx, 2), round(q[1], 2)] for q in p]})

    # per-duct height from the nearest W"xH" label (B8 §8.3); unlabelled runs → labeled median.
    hs = sorted(h for _, _, _, h in rlabels)
    h_fallback = round(hs[len(hs) // 2], 3) if hs else 0.30
    grid = defaultdict(list)
    for i, (lx, ly, _, _) in enumerate(rlabels):
        grid[(int(lx // SNAP_R), int(ly // SNAP_R))].append(i)
    labeled = 0
    for d in ducts:
        p = d["p"]
        cx = sum(q[0] for q in p) / len(p)
        cy = sum(q[1] for q in p) / len(p)
        gi, gj = int(cx // SNAP_R), int(cy // SNAP_R)
        best, bh = SNAP_R * SNAP_R, None
        for a in range(gi - 1, gi + 2):
            for b in range(gj - 1, gj + 2):
                for i in grid.get((a, b), ()):
                    lx, ly, _, lh = rlabels[i]
                    dd = (lx - cx) ** 2 + (ly - cy) ** 2
                    if dd < best:
                        best, bh = dd, lh
        if bh is not None:
            d["h"] = round(bh, 3)
            labeled += 1
        else:
            d["h"] = h_fallback

    # floor extent from grid + duct envelope (B2)
    xs = sorted(gridX.values())
    floor = {
        "xmin": round(min(allx), 2), "xmax": round(max(allx), 2),
        "ymin": round(min(ally), 2), "ymax": round(max(ally), 2),
        "gridX": {str(k): v for k, v in sorted(gridX.items())},
        "bod_median": 3.76,
    }
    out = {
        "meta": {"unit": "m", "frame": "14A", "source": "COB-IM2 14A/B/C level 4 (INBAS)",
                 "provenance": "ducts+rounds+terminals=CERT; context=INFER traced; "
                               "z=BOD tags; h=W\"xH\" label (B8 §8.3), nearest within 2.5 m else median"},
        "floor": floor,
        "ducts": ducts, "rounds": rounds, "terminals": terminals, "context": context,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {OUT}")
    print(f"  ducts={len(ducts)} rounds={len(rounds)} terminals={len(terminals)} "
          f"context={len(context)} grid_axes={len(gridX)}")
    print(f"  rect labels={len(rlabels)} · ducts with a labeled height={labeled} "
          f"({100*labeled/len(ducts):.0f}% by count) · fallback h={h_fallback} m")
    print(f"  floor X[{floor['xmin']},{floor['xmax']}] Y[{floor['ymin']},{floor['ymax']}] "
          f"({floor['xmax']-floor['xmin']:.0f}x{floor['ymax']-floor['ymin']:.0f} m)")
    print(f"  terminals by type: {dict(Counter(t['t'] for t in terminals))}")


if __name__ == "__main__":
    main()
