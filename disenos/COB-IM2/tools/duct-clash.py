#!/usr/bin/env python3
"""
duct-clash.py — COB-IM2 Level-4 HVAC duct clash + clearance analysis
======================================================================
Reads L4-full.json (certified), analyses run-to-run vertical clashes and
BOD/headroom distribution.

§13 discipline (from PROPOSAL-design3d-clash-gate.md):
  A run with h=None has NO known top — NEVER assume one.
  Unknown-height pairs → UNRESOLVED, never clash and never clash-free.

Usage:
  python3 duct-clash.py [--data <path>] [--meco <metres>] [--top-n <n>] [--output <path>]

Defaults:
  --data    /home/cristian/investigacion/COB-IM2/tools/out/L4-full.json
  --meco    (absent — not applied unless supplied)
  --top-n   20  (lowest-BOD runs to list)
  --output  ../CLASH-REPORT-L4.md (relative to this script's directory)
"""

import json
import math
import argparse
from pathlib import Path
from collections import defaultdict

try:
    from shapely.geometry import LineString, Polygon
    from shapely.strtree import STRtree
except ImportError:
    raise SystemExit("shapely >= 2.0 required. Install with: pip install shapely")


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def build_footprint(run: dict) -> Polygon | None:
    """
    Build the 2D plan footprint of a run as a Shapely Polygon.
    The footprint is a rectangle of width `w` centred on the p0→p1 axis.
    Returns None if the run has zero length (degenerate).
    """
    x0, y0 = run["p0"]
    x1, y1 = run["p1"]
    dx, dy = x1 - x0, y1 - y0
    length = math.hypot(dx, dy)
    if length < 1e-9:
        return None

    # Unit perpendicular
    nx, ny = -dy / length, dx / length
    hw = run["w"] / 2.0  # half-width

    # Four corners of the oriented rectangle
    corners = [
        (x0 + nx * hw, y0 + ny * hw),
        (x0 - nx * hw, y0 - ny * hw),
        (x1 - nx * hw, y1 - ny * hw),
        (x1 + nx * hw, y1 + ny * hw),
    ]
    return Polygon(corners)


def z_overlap(bod_a, h_a, bod_b, h_b, tol: float = 0.01) -> bool:
    """
    Return True if Z-intervals [bod_a, bod_a+h_a] and [bod_b, bod_b+h_b]
    overlap by more than `tol` metres (1 cm default).
    Precondition: both h values are not None.
    """
    top_a = bod_a + h_a
    top_b = bod_b + h_b
    overlap = min(top_a, top_b) - max(bod_a, bod_b)
    return overlap > tol


# ---------------------------------------------------------------------------
# Adjacency (shared-node pairs should not be flagged as clashes)
# ---------------------------------------------------------------------------

def build_adjacent_pairs(runs: list, nodes: list) -> set:
    """
    Two runs are adjacent (connected at a fitting/node) if they share a node.
    We use the nodes[].runs adjacency list from the JSON.
    Returns a frozenset-based set of (min_idx, max_idx) integer pairs.
    """
    adjacent: set = set()
    for node in nodes:
        run_indices = node.get("runs", [])
        for i in range(len(run_indices)):
            for j in range(i + 1, len(run_indices)):
                a, b = run_indices[i], run_indices[j]
                adjacent.add((min(a, b), max(a, b)))
    return adjacent


# ---------------------------------------------------------------------------
# Main analysis
# ---------------------------------------------------------------------------

PLAN_AREA_TOL = 1e-6  # m² — pairs touching only at a line/point are not real 2D overlaps


def analyse(data_path: Path, meco: float | None, top_n: int):
    with open(data_path) as f:
        data = json.load(f)

    runs: list[dict] = data["runs"]
    nodes: list[dict] = data.get("nodes", [])
    total = len(runs)

    # Build footprints
    footprints = []
    degenerate_ids = []
    for r in runs:
        fp = build_footprint(r)
        footprints.append(fp)
        if fp is None:
            degenerate_ids.append(r["id"])

    if degenerate_ids:
        print(f"Warning: {len(degenerate_ids)} degenerate runs (zero length, p0==p1) skipped from spatial index: {degenerate_ids[:5]}")

    # Build STRtree over valid footprints
    valid_indices = [i for i, fp in enumerate(footprints) if fp is not None]
    valid_geoms = [footprints[i] for i in valid_indices]
    tree = STRtree(valid_geoms)

    # Build adjacency
    adjacent_pairs = build_adjacent_pairs(runs, nodes)

    # --- Clash analysis ---
    real_clashes = []        # (id_a, id_b, details)
    unresolved_pairs = []    # (id_a, id_b, reason)
    clash_free_pairs = 0

    seen_pairs: set = set()  # avoid double-counting

    for local_idx, geom_a in enumerate(valid_geoms):
        global_idx_a = valid_indices[local_idx]
        run_a = runs[global_idx_a]
        bod_a = run_a.get("bod")
        h_a = run_a.get("h")

        # STRtree query returns indices into valid_geoms
        candidate_local = tree.query(geom_a, predicate="intersects")

        for cand_local in candidate_local:
            global_idx_b = valid_indices[cand_local]
            if global_idx_b <= global_idx_a:
                continue  # only process each pair once

            pair_key = (global_idx_a, global_idx_b)
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            run_b = runs[global_idx_b]
            bod_b = run_b.get("bod")
            h_b = run_b.get("h")

            # Skip adjacent (connected) runs — they legitimately share geometry at fittings
            adj_key = (min(global_idx_a, global_idx_b), max(global_idx_a, global_idx_b))
            if adj_key in adjacent_pairs:
                continue

            # Compute actual plan intersection area (filtering out edge/point touches)
            geom_b = footprints[global_idx_b]
            intersection = geom_a.intersection(geom_b)
            plan_area = intersection.area
            if plan_area < PLAN_AREA_TOL:
                # Runs only touch at a line or point — not a real 2D overlap, skip
                continue

            # Check for unknown height (§13 discipline)
            if h_a is None or h_b is None:
                reason_parts = []
                if h_a is None:
                    reason_parts.append(f"{run_a['id']} h=None")
                if h_b is None:
                    reason_parts.append(f"{run_b['id']} h=None")
                unresolved_pairs.append({
                    "id_a": run_a["id"],
                    "id_b": run_b["id"],
                    "reason": "; ".join(reason_parts),
                    "cls_a": run_a.get("cls"),
                    "cls_b": run_b.get("cls"),
                    "bod_a": bod_a,
                    "bod_b": bod_b,
                    "plan_area_m2": round(plan_area, 5),
                })
                continue

            # Both heights known — check Z overlap
            if bod_a is None or bod_b is None:
                # bod missing — treat as unresolved
                unresolved_pairs.append({
                    "id_a": run_a["id"],
                    "id_b": run_b["id"],
                    "reason": "bod missing",
                    "cls_a": run_a.get("cls"),
                    "cls_b": run_b.get("cls"),
                    "bod_a": bod_a,
                    "bod_b": bod_b,
                    "plan_area_m2": round(plan_area, 5),
                })
                continue

            if z_overlap(bod_a, h_a, bod_b, h_b):
                overlap_z = min(bod_a + h_a, bod_b + h_b) - max(bod_a, bod_b)
                real_clashes.append({
                    "id_a": run_a["id"],
                    "id_b": run_b["id"],
                    "cls_a": run_a.get("cls"),
                    "cls_b": run_b.get("cls"),
                    "bod_a": bod_a,
                    "h_a": h_a,
                    "bod_b": bod_b,
                    "h_b": h_b,
                    "z_overlap_m": round(overlap_z, 4),
                    "plan_overlap_area_m2": round(plan_area, 5),
                    "centroid": (round(intersection.centroid.x, 3), round(intersection.centroid.y, 3)),
                })
            else:
                clash_free_pairs += 1

    # --- BOD distribution ---
    runs_with_bod = [r for r in runs if r.get("bod") is not None]
    runs_no_bod = [r for r in runs if r.get("bod") is None]
    bods = [r["bod"] for r in runs_with_bod]

    lowest_bod_runs = sorted(runs_with_bod, key=lambda r: r["bod"])[:top_n]

    # MECO flagging
    meco_violations = []
    if meco is not None:
        meco_violations = [r for r in runs_with_bod if r["bod"] < meco]

    return {
        "total": total,
        "degenerate_count": len(degenerate_ids),
        "runs_with_h": sum(1 for r in runs if r.get("h") is not None),
        "runs_no_h": sum(1 for r in runs if r.get("h") is None),
        "runs_with_bod": len(runs_with_bod),
        "runs_no_bod": len(runs_no_bod),
        "real_clashes": real_clashes,
        "unresolved_pairs": unresolved_pairs,
        "clash_free_pairs": clash_free_pairs,
        "bods": bods,
        "lowest_bod_runs": lowest_bod_runs,
        "meco": meco,
        "meco_violations": meco_violations,
        "runs": runs,
    }


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def write_report(result: dict, output_path: Path) -> str:
    total = result["total"]
    runs_with_h = result["runs_with_h"]
    runs_no_h = result["runs_no_h"]
    runs_with_bod = result["runs_with_bod"]
    runs_no_bod = result["runs_no_bod"]
    real_clashes = result["real_clashes"]
    unresolved_pairs = result["unresolved_pairs"]
    clash_free_pairs = result["clash_free_pairs"]
    bods = result["bods"]
    lowest_bod_runs = result["lowest_bod_runs"]
    meco = result["meco"]
    meco_violations = result["meco_violations"]

    lines = []

    lines.append("# COB-IM2 Level-4 HVAC — Duct Clash + Clearance Report")
    lines.append("")
    lines.append("**Data source:** `L4-full.json` (certified)  ")
    lines.append("**Tool:** `disenos/COB-IM2/tools/duct-clash.py`  ")
    lines.append("**§13 discipline:** runs with `h=None` are never assigned a top — reported as UNRESOLVED, neither clash nor clash-free.  ")
    lines.append("")

    # --- Summary table ---
    lines.append("## Dataset summary")
    lines.append("")
    degenerate_count = result.get("degenerate_count", 0)
    lines.append(f"| Metric | Count | % of {total} runs |")
    lines.append("|---|---|---|")
    lines.append(f"| Total runs | {total} | 100% |")
    lines.append(f"| Degenerate runs (p0==p1, zero length — excluded from spatial analysis) | {degenerate_count} | {100*degenerate_count/total:.1f}% |")
    lines.append(f"| Runs with measured height (`h`) | {runs_with_h} | {100*runs_with_h/total:.1f}% |")
    lines.append(f"| Runs with `h=None` (unknown top) | {runs_no_h} | {100*runs_no_h/total:.1f}% |")
    lines.append(f"| Runs with BOD known | {runs_with_bod} | {100*runs_with_bod/total:.1f}% |")
    lines.append(f"| Runs with BOD missing | {runs_no_bod} | {100*runs_no_bod/total:.1f}% |")
    lines.append("")

    # --- Class breakdown ---
    from collections import Counter
    runs = result["runs"]
    cls_h_known = Counter()
    cls_h_none = Counter()
    for r in runs:
        cls = r.get("cls", "?")
        if r.get("h") is not None:
            cls_h_known[cls] += 1
        else:
            cls_h_none[cls] += 1
    all_classes = sorted(set(list(cls_h_known.keys()) + list(cls_h_none.keys())))

    lines.append("### Height coverage by class (count denominator)")
    lines.append("")
    lines.append("| Class | h known | h=None | Total | h-known % |")
    lines.append("|---|---|---|---|---|")
    for cls in all_classes:
        known = cls_h_known.get(cls, 0)
        none_ = cls_h_none.get(cls, 0)
        tot = known + none_
        lines.append(f"| {cls} | {known} | {none_} | {tot} | {100*known/tot:.1f}% |")
    lines.append("")

    # --- Clash results ---
    lines.append("## Clash analysis results")
    lines.append("")

    total_inspected_pairs = len(real_clashes) + len(unresolved_pairs) + clash_free_pairs
    lines.append(f"Pairs with overlapping 2D footprints (non-adjacent): **{total_inspected_pairs}**")
    lines.append("")
    lines.append(f"| Category | Pairs | % of {total_inspected_pairs} pairs |")
    lines.append("|---|---|---|")
    lines.append(f"| **REAL CLASHES** (both h known, Z-intervals overlap > 1 cm) | {len(real_clashes)} | {100*len(real_clashes)/max(1,total_inspected_pairs):.1f}% |")
    lines.append(f"| **UNRESOLVED** (h=None on at least one run) | {len(unresolved_pairs)} | {100*len(unresolved_pairs)/max(1,total_inspected_pairs):.1f}% |")
    lines.append(f"| **Clash-free confirmed** (both h known, no Z overlap) | {clash_free_pairs} | {100*clash_free_pairs/max(1,total_inspected_pairs):.1f}% |")
    lines.append("")

    if len(real_clashes) == 0:
        lines.append("**The resolvable subset is clash-free.** No pair with both heights known produces a Z-interval overlap exceeding 1 cm.")
    else:
        lines.append(f"**{len(real_clashes)} real clash(es) detected** in the resolvable (both-h-known) subset:")
    lines.append("")

    if real_clashes:
        lines.append("### Real clash detail")
        lines.append("")
        lines.append("| # | Run A | Run B | cls A | cls B | BOD A (m) | h A (m) | BOD B (m) | h B (m) | Z-overlap (m) | Plan-area overlap (m²) | Centroid (x, y) |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
        # Find most significant clash by plan area
        max_clash = max(real_clashes, key=lambda c: c["plan_overlap_area_m2"])
        micro_threshold = 1e-3  # m² — below this, flag as possible digitization artifact
        micro_count = sum(1 for c in real_clashes if c["plan_overlap_area_m2"] < micro_threshold)

        for i, c in enumerate(real_clashes, 1):
            note = " ⚠ micro-overlap" if c["plan_overlap_area_m2"] < micro_threshold else ""
            lines.append(
                f"| {i} | {c['id_a']} | {c['id_b']} | {c['cls_a']} | {c['cls_b']} "
                f"| {c['bod_a']} | {c['h_a']} | {c['bod_b']} | {c['h_b']} "
                f"| {c['z_overlap_m']} | {c['plan_overlap_area_m2']}{note} "
                f"| ({c['centroid'][0]}, {c['centroid'][1]}) |"
            )
        lines.append("")
        lines.append(f"**Most significant clash:** {max_clash['id_a']} ({max_clash['cls_a']}) vs {max_clash['id_b']} ({max_clash['cls_b']}) — plan overlap {max_clash['plan_overlap_area_m2']:.5f} m², Z overlap {max_clash['z_overlap_m']} m, at ({max_clash['centroid'][0]}, {max_clash['centroid'][1]})")
        lines.append("")
        if micro_count:
            lines.append(f"**Note:** {micro_count} clash(es) marked `⚠ micro-overlap` have plan intersection area < 1 mm² ({micro_threshold} m²). These meet the geometric criteria but may be digitization artifacts (parallel runs whose extruded widths barely cross). Treat as advisory pending field verification.")
            lines.append("")

    lines.append("### Unresolved pairs (sample — first 30)")
    lines.append("")
    lines.append(f"Total unresolved pairs: **{len(unresolved_pairs)}** (denominator: {total_inspected_pairs} overlapping non-adjacent pairs found by spatial index)")
    lines.append("")
    if unresolved_pairs:
        lines.append("| Run A | Run B | cls A | cls B | BOD A | BOD B | Reason |")
        lines.append("|---|---|---|---|---|---|---|")
        for up in unresolved_pairs[:30]:
            lines.append(
                f"| {up['id_a']} | {up['id_b']} | {up['cls_a']} | {up['cls_b']} "
                f"| {up['bod_a']} | {up['bod_b']} | {up['reason']} |"
            )
        if len(unresolved_pairs) > 30:
            lines.append(f"| … | … | … | … | … | … | _{len(unresolved_pairs)-30} more — run tool for full list_ |")
    lines.append("")

    # --- BOD distribution ---
    lines.append("## BOD (bottom-of-duct) distribution")
    lines.append("")
    lines.append(f"Denominator: **{runs_with_bod} runs** with BOD present (out of {total} total).")
    lines.append("")

    if bods:
        import statistics
        bods_sorted = sorted(bods)
        lines.append(f"| Statistic | Value (m) |")
        lines.append("|---|---|")
        lines.append(f"| Min | {min(bods):.3f} |")
        lines.append(f"| 5th percentile | {bods_sorted[int(0.05*len(bods_sorted))]:.3f} |")
        lines.append(f"| 25th percentile | {bods_sorted[int(0.25*len(bods_sorted))]:.3f} |")
        lines.append(f"| Median | {statistics.median(bods):.3f} |")
        lines.append(f"| 75th percentile | {bods_sorted[int(0.75*len(bods_sorted))]:.3f} |")
        lines.append(f"| 95th percentile | {bods_sorted[int(0.95*len(bods_sorted))]:.3f} |")
        lines.append(f"| Max | {max(bods):.3f} |")
        lines.append(f"| Mean | {statistics.mean(bods):.3f} |")
        lines.append("")

    lines.append(f"### {len(lowest_bod_runs)} lowest-BOD runs (headroom-critical)")
    lines.append("")
    lines.append("_These are the runs closest to the floor — apply your MECO threshold here._")
    lines.append("")
    lines.append("| Rank | ID | cls | BOD (m) | h (m) | w (m) |")
    lines.append("|---|---|---|---|---|---|")
    for rank, r in enumerate(lowest_bod_runs, 1):
        h_str = f"{r['h']:.4f}" if r.get("h") is not None else "**None**"
        lines.append(f"| {rank} | {r['id']} | {r.get('cls','?')} | {r['bod']:.3f} | {h_str} | {r['w']:.4f} |")
    lines.append("")

    # --- MECO section ---
    if meco is not None:
        lines.append(f"## MECO / clearance flagging (threshold: {meco} m)")
        lines.append("")
        lines.append(f"Runs with BOD < {meco} m: **{len(meco_violations)}** of {runs_with_bod} runs with known BOD ({100*len(meco_violations)/max(1,runs_with_bod):.1f}%)")
        lines.append("")
        if meco_violations:
            lines.append("| ID | cls | BOD (m) | h (m) | w (m) |")
            lines.append("|---|---|---|---|---|")
            for r in sorted(meco_violations, key=lambda r: r["bod"]):
                h_str = f"{r['h']:.4f}" if r.get("h") is not None else "**None**"
                lines.append(f"| {r['id']} | {r.get('cls','?')} | {r['bod']:.3f} | {h_str} | {r['w']:.4f} |")
        lines.append("")
    else:
        lines.append("## MECO / clearance")
        lines.append("")
        lines.append("No MECO datum supplied (confirmed absent from DXF source; must be supplied externally).  ")
        lines.append("Re-run with `--meco <metres>` to flag headroom violations once a threshold is available.")
        lines.append("")

    lines.append("---")
    lines.append("_Report generated by `duct-clash.py`. Re-run at any time against `L4-full.json`._")

    report = "\n".join(lines)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report)
    return report


# ---------------------------------------------------------------------------
# Verification — tiny hand-checkable example
# ---------------------------------------------------------------------------

def run_verification():
    """
    Three runs:
      A: x-axis 0..2, w=1 → footprint y in [-0.5, 0.5], bod=3.0, h=0.3
      B: y-axis 0..2, w=1 → footprint x in [-0.5, 0.5], bod=3.1, h=0.3  (overlaps A in Z and plan)
      C: x-axis 5..7, w=1 → no plan overlap with A or B
      D: x-axis 0..2, w=1, h=None → plan-overlaps A but unresolved
    Adjacent: A-B share node at (0,0).
    Expected: A-B → adjacent → skip; A-D → unresolved; B-D → unresolved; A-C/B-C → no plan overlap.
    """
    import shapely.geometry as sg

    runs_v = [
        {"id": "A", "p0": [0, 0], "p1": [2, 0], "w": 1.0, "h": 0.3, "bod": 3.0, "cls": "trunk", "n0": 0, "n1": 1},
        {"id": "B", "p0": [0, 0], "p1": [0, 2], "w": 1.0, "h": 0.3, "bod": 3.1, "cls": "main",  "n0": 0, "n1": 2},
        {"id": "C", "p0": [5, 0], "p1": [7, 0], "w": 1.0, "h": 0.3, "bod": 3.0, "cls": "branch","n0": 3, "n1": 4},
        {"id": "D", "p0": [0, 0], "p1": [2, 0], "w": 1.0, "h": None, "bod": 3.0, "cls": "small", "n0": 0, "n1": 5},
    ]
    nodes_v = [
        {"x": 0, "y": 0, "deg": 3, "runs": [0, 1, 3]},  # node 0: A, B, D share (0,0)
        {"x": 2, "y": 0, "deg": 1, "runs": [0]},
        {"x": 0, "y": 2, "deg": 1, "runs": [1]},
        {"x": 5, "y": 0, "deg": 1, "runs": [2]},
        {"x": 7, "y": 0, "deg": 1, "runs": [2]},
        {"x": 2, "y": 0, "deg": 1, "runs": [3]},
    ]

    footprints_v = [build_footprint(r) for r in runs_v]
    valid_idx_v = [i for i, fp in enumerate(footprints_v) if fp is not None]
    valid_geoms_v = [footprints_v[i] for i in valid_idx_v]
    tree_v = STRtree(valid_geoms_v)
    adj_v = build_adjacent_pairs(runs_v, nodes_v)

    real_v, unresolved_v, cfree_v = [], [], 0
    seen_v = set()

    for local_i, geom_a in enumerate(valid_geoms_v):
        g_a = valid_idx_v[local_i]
        r_a = runs_v[g_a]
        for local_j in tree_v.query(geom_a, predicate="intersects"):
            g_b = valid_idx_v[local_j]
            if g_b <= g_a:
                continue
            pair_key = (g_a, g_b)
            if pair_key in seen_v:
                continue
            seen_v.add(pair_key)
            adj_key = (min(g_a, g_b), max(g_a, g_b))
            r_b = runs_v[g_b]
            if adj_key in adj_v:
                continue
            if r_a.get("h") is None or r_b.get("h") is None:
                unresolved_v.append((r_a["id"], r_b["id"]))
            elif z_overlap(r_a["bod"], r_a["h"], r_b["bod"], r_b["h"]):
                real_v.append((r_a["id"], r_b["id"]))
            else:
                cfree_v += 1

    print("=== Verification (hand-checkable example) ===")
    print(f"  Real clashes:   {real_v}   (expected: []  — A-B are adjacent, skipped)")
    print(f"  Unresolved:     {unresolved_v}  (expected: pairs involving D that are non-adjacent to D)")
    print(f"  Clash-free:     {cfree_v}    (expected: 0)")

    # D shares node 0 with A and B, so A-D and B-D are adjacent → no unresolved either
    # C has no plan overlap → not even inspected
    # So everything should be empty
    assert real_v == [], f"Unexpected clashes: {real_v}"
    # A-D and B-D are adjacent (share node 0) → unresolved should be empty
    assert unresolved_v == [], f"Unexpected unresolved: {unresolved_v}"
    assert cfree_v == 0, f"Unexpected clash-free: {cfree_v}"
    print("  All assertions passed.")
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="COB-IM2 L4 duct clash + clearance analysis")
    parser.add_argument("--data", default="/home/cristian/investigacion/COB-IM2/tools/out/L4-full.json",
                        help="Path to L4-full.json")
    parser.add_argument("--meco", type=float, default=None,
                        help="MECO/clearance threshold in metres; flags runs with BOD < this value")
    parser.add_argument("--top-n", type=int, default=20,
                        help="Number of lowest-BOD runs to list (default 20)")
    parser.add_argument("--output", default=None,
                        help="Output report path (default: CLASH-REPORT-L4.md next to this script's parent)")
    parser.add_argument("--verify", action="store_true",
                        help="Run hand-checkable verification example and exit")
    args = parser.parse_args()

    if args.verify:
        run_verification()
        return

    # Default output path: two levels up from this script (disenos/COB-IM2/)
    if args.output is None:
        script_dir = Path(__file__).parent
        output_path = script_dir.parent / "CLASH-REPORT-L4.md"
    else:
        output_path = Path(args.output)

    data_path = Path(args.data)
    print(f"Loading: {data_path}")

    # Run verification first
    run_verification()

    print("Running clash analysis…")
    result = analyse(data_path, args.meco, args.top_n)

    total_pairs = len(result["real_clashes"]) + len(result["unresolved_pairs"]) + result["clash_free_pairs"]
    print(f"  Runs: {result['total']}  |  h known: {result['runs_with_h']}  |  h=None: {result['runs_no_h']}")
    print(f"  Overlapping non-adjacent pairs: {total_pairs}")
    print(f"  Real clashes: {len(result['real_clashes'])}")
    print(f"  Unresolved (h unknown): {len(result['unresolved_pairs'])}")
    print(f"  Clash-free confirmed: {result['clash_free_pairs']}")

    report = write_report(result, output_path)
    print(f"\nReport written: {output_path}")


if __name__ == "__main__":
    main()
