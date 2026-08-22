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
# v7: aggregate COLLINEAR segments into wall-lines BEFORE pairing, then pair nearest-mutual opposite
# walls PER SIDE. The prior segment-level matcher capped at ~16% of open length: its dominant misses
# (non-mutual + low-overlap, ~2,600 of 3,100 unpaired) were artefacts of one wall drawn as many short
# segments — a fragmentation defect, not genuine ambiguity (corpus probe edge-pairing-ceiling.py). Wall-
# line aggregation lifts coverage to ~52% (probe wallline-ceiling.py) with NO guard loosened: PAR/OVL/
# WMIN/L>w are unchanged. Per-side pairing lets one wall serve two ducts (banks) while a nearer wall on
# the same side blocks phantom aisle-fills; the ~45% residual is true single-line ducts and isolated
# fittings. Outline walls are KEPT (compact); each box fills INSIDE them (2 cm inset by the caller).
EP_LADDER = [0.13, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.60,
             0.70, 0.80, 0.90, 1.00, 1.20, 1.40, 1.60, 1.80, 2.00]
EP_WMIN, EP_WMAX, EP_PAR, EP_OVL = 0.13, 2.0, 0.99, 0.70
EP_MINL = 0.3          # min segment length fed to aggregation (drops glyph-scale noise)
EP_ANGTOL = 0.012      # ~0.7° — collinear if headings agree within this
EP_OFFTOL = 0.03       # collinear if perpendicular offsets agree within 3 cm


def _merge_iv(iv):
    """merge a list of 1-D intervals → disjoint sorted intervals."""
    iv = sorted(iv)
    out = [list(iv[0])]
    for a, b in iv[1:]:
        if a <= out[-1][1] + 1e-6:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def _isect_iv(A, B):
    """contiguous overlap sub-intervals between two disjoint-sorted interval sets (same axis)."""
    out = []; i = j = 0
    while i < len(A) and j < len(B):
        lo = max(A[i][0], B[j][0]); hi = min(A[i][1], B[j][1])
        if hi > lo:
            out.append((lo, hi))
        if A[i][1] < B[j][1]:
            i += 1
        else:
            j += 1
    return out


def edge_pair_boxes(segs):
    """segs = [(x1,y1,x2,y2,z)] → boxes[{x,y,w,L,ang,z}].

    Aggregate collinear segments into wall-lines, then emit a solid box for each contiguous overlap
    between a wall-line and its nearest-mutual opposite wall on either side.
    """
    # 1) cluster collinear segments into wall-lines (canonical heading in [0,pi), shared perp offset).
    lines = []   # {ux,uy, theta, off, intervals:[(t0,t1)], zw:[(len,z)]}
    for x1, y1, x2, y2, z in segs:
        dx, dy = x2 - x1, y2 - y1
        Ln = math.hypot(dx, dy)
        if Ln < EP_MINL:
            continue
        ux, uy = dx / Ln, dy / Ln
        if uy < 0 or (uy == 0 and ux < 0):        # canonicalise to the upper half-circle
            ux, uy = -ux, -uy
        theta = math.atan2(uy, ux)
        off = x1 * (-uy) + y1 * ux                 # signed perpendicular offset of the line
        t1, t2 = x1 * ux + y1 * uy, x2 * ux + y2 * uy
        t0, t1 = (t1, t2) if t1 < t2 else (t2, t1)
        hit = None
        for ln in lines:
            da = abs(theta - ln["theta"]); da = min(da, math.pi - da)
            if da <= EP_ANGTOL and abs(off - ln["off"]) <= EP_OFFTOL:
                hit = ln; break
        if hit is None:
            lines.append({"ux": ux, "uy": uy, "theta": theta, "off": off,
                          "intervals": [(t0, t1)], "zw": [(Ln, z)]})
        else:
            hit["intervals"].append((t0, t1)); hit["zw"].append((Ln, z))
    for ln in lines:
        ln["iv"] = _merge_iv(ln["intervals"])
        ln["cov"] = sum(b - a for a, b in ln["iv"])
        ln["z"] = sorted(ln["zw"])[len(ln["zw"]) // 2][1]   # median-by-count wall elevation

    n = len(lines)

    def valid_pair(a, b):
        """(d, overlap_subintervals) if a,b are opposite duct walls, else None. No guard loosened."""
        if abs(a["ux"] * b["ux"] + a["uy"] * b["uy"]) < EP_PAR:
            return None
        d = abs(a["off"] - b["off"])
        if not (EP_WMIN <= d <= EP_WMAX):
            return None
        ov = _isect_iv(a["iv"], b["iv"])
        ovl = sum(hi - lo for lo, hi in ov)
        span = min(a["cov"], b["cov"])
        if span <= 0 or ovl / span < EP_OVL or span <= d:   # OVL + L>w guard
            return None
        return (d, ov)

    # 2) nearest valid opposite wall per SIDE (+off / -off). One wall may serve two ducts; a nearer
    #    wall on the same side pre-empts a phantom fill across it.
    pos, neg = [None] * n, [None] * n
    for i in range(n):
        a = lines[i]; bp = (1e9, -1, None); bn = (1e9, -1, None)
        for j in range(n):
            if j == i:
                continue
            v = valid_pair(a, lines[j])
            if not v:
                continue
            d = v[0]
            if lines[j]["off"] > a["off"]:
                bp = min(bp, (d, j, v), key=lambda t: t[0])
            else:
                bn = min(bn, (d, j, v), key=lambda t: t[0])
        pos[i] = (bp[1], bp[2]) if bp[1] >= 0 else None
        neg[i] = (bn[1], bn[2]) if bn[1] >= 0 else None

    # 3) keep mutual pairs; emit one box per contiguous overlap (gaps are not filled).
    boxes = []
    for i in range(n):
        for e in (pos[i], neg[i]):
            if not e:
                continue
            j, v = e
            if i >= j:                            # dedupe unordered pair
                continue
            j_back = neg[j] if lines[j]["off"] > lines[i]["off"] else pos[j]
            if not (j_back and j_back[0] == i):   # mutual on this side?
                continue
            a, b = lines[i], lines[j]
            d, ov = v
            w = min(EP_LADDER, key=lambda s: abs(s - d))
            off_m = (a["off"] + b["off"]) / 2
            nx, ny = -a["uy"], a["ux"]
            zc = round((a["z"] + b["z"]) / 2, 2)
            for lo, hi in ov:
                L = hi - lo
                if L <= w:            # L>w per sub-interval (snapped w, matches qa) — skips junctions
                    continue
                tc = (lo + hi) / 2
                cx = off_m * nx + tc * a["ux"]
                cy = off_m * ny + tc * a["uy"]
                boxes.append({"x": round(cx, 3), "y": round(cy, 3), "w": w,
                              "L": round(L, 3), "ang": round(a["theta"], 4), "z": zc})
    return boxes


# B9 §9.3: the mech-room has NO named block — locate the AHU zones by their high-CFM discharge trunks
# (>=2500 CFM; the scattered 1800-CFM tags are secondary branches), then size a massing box to each
# dense sub-cluster. Split on a Y gap so the east zone's two stacks are not bridged into one void-
# filling slab. [INFER] context, padded to the equipment body — not certified geometry.
AHU_CFM_MIN = 2500     # plant-defining trunks (B9 table: central 5450/5000, east 2500x4)
AHU_ZGAP = 20.0        # X gap separating the central plant from the east zone
AHU_YGAP = 8.0         # Y gap splitting stacked sub-clusters within a zone
AHU_PAD = 2.0          # equipment-body margin around the discharge-tag cluster
AHU_MIN = 4.0          # min footprint so a single-column tag stack still renders a sane box


def _split(vals, key, gap):
    """split a list into runs where the consecutive gap in `key` exceeds `gap`."""
    vals = sorted(vals, key=key)
    groups, cur = [], [vals[0]]
    for v in vals[1:]:
        if key(v) - key(cur[-1]) > gap:
            groups.append(cur); cur = [v]
        else:
            cur.append(v)
    groups.append(cur)
    return groups


def build_ahu(trunks):
    """trunks=[(x,y,cfm)] (>=AHU_CFM_MIN, ownership-deduped) → boxes[{x,y,w,d,cfm}] per dense cluster."""
    boxes = []
    if not trunks:
        return boxes
    for zone in _split(trunks, lambda t: t[0], AHU_ZGAP):       # X: central vs east
        for stack in _split(zone, lambda t: t[1], AHU_YGAP):    # Y: split stacked sub-clusters
            xs = [t[0] for t in stack]; ys = [t[1] for t in stack]
            boxes.append({"x": round((min(xs) + max(xs)) / 2, 2),
                          "y": round((min(ys) + max(ys)) / 2, 2),
                          "w": round(max(max(xs) - min(xs) + 2 * AHU_PAD, AHU_MIN), 2),
                          "d": round(max(max(ys) - min(ys) + 2 * AHU_PAD, AHU_MIN), 2),
                          "cfm": max(t[2] for t in stack)})
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
    trunks = []   # (x, y, cfm) high-CFM discharge trunks → AHU zone anchors (B9 §9.3)
    gridX = {}
    allx, ally = [], []

    for k in ["14A", "14B", "14C"]:
        msp, dx, (lo, hi) = load(k)
        bod = collect_bod(msp, dx)
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

            # high-CFM discharge trunks (>=2500) → AHU zone anchors (B9 §9.3). Not PDF-scoped; the
            # ownership window dedups the same trunk co-registered into two sheets.
            if e.dxftype() == "MTEXT":
                mcfm = re.search(r'(\d{2,4})\s*CFM', e.text.replace('\n', ' '), re.I)
                if mcfm and int(mcfm.group(1)) >= AHU_CFM_MIN:
                    x = e.dxf.insert.x + dx
                    if lo <= x < hi:
                        trunks.append((round(x, 2), round(e.dxf.insert.y, 2), int(mcfm.group(1))))

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
    floor = {
        "xmin": round(min(allx), 2), "xmax": round(max(allx), 2),
        "ymin": round(min(ally), 2), "ymax": round(max(ally), 2),
        "gridX": {str(k): v for k, v in sorted(gridX.items())},
        "bod_median": 3.76,
    }
    ahu = build_ahu(trunks)   # B9 §9.3: massing boxes sized to the high-CFM discharge clusters [INFER]
    out = {
        "meta": {"unit": "m", "frame": "14A", "source": "COB-IM2 14A/B/C level 4 (INBAS)",
                 "provenance": "ducts+rounds+terminals=CERT; context=INFER traced; "
                               "ahu=INFER (massing sized to >=2500 CFM discharge cluster, B9 §9.3); "
                               "z=BOD tags; h=W\"xH\" label (B8 §8.3), nearest within 2.5 m else median"},
        "floor": floor,
        "ducts": ducts, "boxes": boxes, "rounds": rounds,
        "terminals": terminals, "context": context, "ahu": ahu,
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
    print(f"  AHU trunks(>={AHU_CFM_MIN} CFM)={len(trunks)} → {len(ahu)} massing box(es): "
          f"{[(a['x'], a['y'], a['w'], a['d']) for a in ahu]}")


if __name__ == "__main__":
    main()
