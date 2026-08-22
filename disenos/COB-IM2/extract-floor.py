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
# v5: a closed duct footprint becomes a solid box sized by its minimum-area rectangle (B14). The width
# floor is 0.13 m (keeps 6" ducts; rejects text-glyph closed polys at 25-75 mm — B14 §14.2).
BOX_WMIN, BOX_WMAX, BOX_LMAX = 0.13, 2.0, 60.0
clean = lambda t: re.sub(r'[{}]', '', re.sub(r'\\[A-Za-z][^;]*;', '', t)).strip()


def _hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo = []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    up = []
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def mrr(pts):
    """Minimum-area rectangle (B14): (width, length, cx, cy, angle) — angle = long-axis heading."""
    h = _hull(pts)
    if len(h) < 3:
        return None
    best = None
    n = len(h)
    for i in range(n):
        ax, ay = h[i]; bx, by = h[(i+1) % n]
        ex, ey = bx-ax, by-ay
        Ln = math.hypot(ex, ey)
        if Ln < 1e-9:
            continue
        ux, uy = ex/Ln, ey/Ln
        vx, vy = -uy, ux
        us = [(px-ax)*ux + (py-ay)*uy for px, py in h]
        vs = [(px-ax)*vx + (py-ay)*vy for px, py in h]
        umin, umax = min(us), max(us)
        vmin, vmax = min(vs), max(vs)
        w, d = umax-umin, vmax-vmin
        area = w*d
        if best is None or area < best[0]:
            uc, vc = (umin+umax)/2, (vmin+vmax)/2
            cx, cy = ax+uc*ux+vc*vx, ay+uc*uy+vc*vy
            best = (area, w, d, cx, cy, ux, uy, vx, vy)
    _, w, d, cx, cy, ux, uy, vx, vy = best
    if w >= d:
        width, length, angx, angy = d, w, ux, uy
    else:
        width, length, angx, angy = w, d, vx, vy
    return (round(width, 3), round(length, 3), round(cx, 3), round(cy, 3),
            round(math.atan2(angy, angx), 4))


# B6 §6.4: pair opposite walls among open double-line straight segments → solid boxes with true width.
# Guards (B6 §6.3 pollution): parallel + ≥70% overlap + mutual-closest + width floor 0.13 m (drops the
# 0.10 m false-pair peak, keeps 6"). Validated by corpus probe edge-pairing.py. The outline walls are
# KEPT (compact polylines, no segment explosion — that ballooned the offline file 2.4x); the box fills
# INSIDE them (2 cm inset, applied by the caller) so there is no z-fight and no size blow-up.
EP_LADDER = [0.13, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60,
             0.70, 0.80, 0.90, 1.00, 1.20, 1.40, 1.60, 1.80, 2.00]
EP_WMIN, EP_WMAX, EP_PAR, EP_OVL = 0.13, 2.0, 0.99, 0.70


def edge_pair_boxes(segs):
    """segs = [(x1,y1,x2,y2,z)] → boxes[{x,y,w,L,ang,z}] for mutual-closest opposite-wall pairs."""
    EP_MINL = 0.3   # min segment length; 0.3 (vs 0.5) adds ~48% more clean pairs, same width profile
    S = []
    for x1, y1, x2, y2, z in segs:
        dx, dy = x2 - x1, y2 - y1
        Ln = math.hypot(dx, dy)
        S.append(None if Ln < EP_MINL else ((x1 + x2) / 2, (y1 + y2) / 2, dx / Ln, dy / Ln, Ln / 2, z))
    grid = defaultdict(list)
    for i, s in enumerate(S):
        if s:
            grid[(int(s[0] // EP_WMAX), int(s[1] // EP_WMAX))].append(i)

    def perp(a, b):
        return abs((b[0] - a[0]) * (-a[3]) + (b[1] - a[1]) * a[2])

    def overlap(a, b):
        def proj(px, py):
            return (px - a[0]) * a[2] + (py - a[1]) * a[3]
        tb = sorted([proj(b[0] - b[2] * b[4], b[1] - b[3] * b[4]),
                     proj(b[0] + b[2] * b[4], b[1] + b[3] * b[4])])
        return max(0.0, min(a[4], tb[1]) - max(-a[4], tb[0])) / min(2 * a[4], 2 * b[4])

    best = [None] * len(S)
    for i, a in enumerate(S):
        if not a:
            continue
        gi, gj = int(a[0] // EP_WMAX), int(a[1] // EP_WMAX)
        bd, bj = 1e9, -1
        for u in range(gi - 1, gi + 2):
            for v in range(gj - 1, gj + 2):
                for j in grid.get((u, v), ()):
                    b = S[j]
                    if j == i or abs(a[2] * b[2] + a[3] * b[3]) < EP_PAR:
                        continue
                    d = perp(a, b)
                    if not (EP_WMIN <= d <= EP_WMAX) or d >= bd or overlap(a, b) < EP_OVL:
                        continue
                    bd, bj = d, j
        best[i] = (bj, bd) if bj >= 0 else None

    boxes = []
    for i, bi in enumerate(best):
        if not bi:
            continue
        j, d = bi
        if best[j] and best[j][0] == i and i < j:
            a, b = S[i], S[j]
            boxes.append({"x": round((a[0] + b[0]) / 2, 3), "y": round((a[1] + b[1]) / 2, 3),
                          "w": min(EP_LADDER, key=lambda s: abs(s - d)),
                          "L": round(min(2 * a[4], 2 * b[4]), 3),
                          "ang": round(math.atan2(a[3], a[2]), 4), "z": a[5]})
    return boxes


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
    boxes = []    # v5: closed footprints as solid MRR boxes {x,y,w,L,ang,z} (B14)
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
                    allx += [q[0] for q in p]; ally += [q[1] for q in p]
                    # v5: a closed footprint with a duct-sized MRR width → solid box, not outline walls
                    if e.closed and len(p) >= 3:
                        m = mrr(p)
                        if m and BOX_WMIN <= m[0] <= BOX_WMAX and m[1] <= BOX_LMAX:
                            w, L, bx, by, ang = m
                            boxes.append({"x": bx, "y": by, "w": w, "L": L,
                                          "ang": ang, "z": round(z, 2)})
                            continue
                    ducts.append({"p": p, "z": round(z, 2)})
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
    def assign_h(cx, cy):
        gi, gj = int(cx // SNAP_R), int(cy // SNAP_R)
        best, bh = SNAP_R * SNAP_R, None
        for a in range(gi - 1, gi + 2):
            for b in range(gj - 1, gj + 2):
                for i in grid.get((a, b), ()):
                    lx, ly, _, lh = rlabels[i]
                    dd = (lx - cx) ** 2 + (ly - cy) ** 2
                    if dd < best:
                        best, bh = dd, lh
        return (round(bh, 3), True) if bh is not None else (h_fallback, False)

    # v6: edge-pair the OPEN double-line outlines into solid boxes (B6 §6.4); walls stay compact.
    segs = []
    for d in ducts:
        p, z = d["p"], d["z"]
        for i in range(len(p) - 1):
            segs.append((p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], z))
    edge_boxes = edge_pair_boxes(segs)
    for eb in edge_boxes:                       # 2 cm inset → the fill sits inside the outline walls
        eb["w"] = round(max(0.05, eb["w"] - 0.02), 3)
    boxes += edge_boxes

    labeled = 0
    for d in ducts:
        p = d["p"]
        d["h"], lab = assign_h(sum(q[0] for q in p) / len(p),
                               sum(q[1] for q in p) / len(p))
        labeled += lab
    for b in boxes:
        b["h"], lab = assign_h(b["x"], b["y"])
        labeled += lab

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
        "ducts": ducts, "boxes": boxes, "rounds": rounds,
        "terminals": terminals, "context": context,
    }
    with open(OUT, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {OUT}")
    print(f"  ducts(walls)={len(ducts)} boxes(solid: MRR closed + edge-paired open)={len(boxes)} "
          f"(edge-paired={len(edge_boxes)}) rounds={len(rounds)} "
          f"terminals={len(terminals)} context={len(context)} grid_axes={len(gridX)}")
    print(f"  rect labels={len(rlabels)} · runs with a labeled height={labeled} "
          f"({100*labeled/(len(ducts)+len(boxes)):.0f}% by count) · fallback h={h_fallback} m")
    print(f"  floor X[{floor['xmin']},{floor['xmax']}] Y[{floor['ymin']},{floor['ymax']}] "
          f"({floor['xmax']-floor['xmin']:.0f}x{floor['ymax']-floor['ymin']:.0f} m)")
    print(f"  terminals by type: {dict(Counter(t['t'] for t in terminals))}")


if __name__ == "__main__":
    main()
