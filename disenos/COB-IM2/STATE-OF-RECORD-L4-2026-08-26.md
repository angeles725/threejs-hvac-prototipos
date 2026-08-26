# COB-IM2 Level-4 — state of record (2026-08-26)

Single current-state snapshot, maintained by the orchestrator, to stop settled questions from being
re-opened (this corpus has re-litigated the same findings repeatedly — see `CRITIQUE-b16-roadmap.md`'s
14 addenda). Every percentage names its denominator (adopted discipline). Produced across three
coordinating sessions; each claim traces to the session that measured it.

## Team structure (producer / verifier split)

- **Team A** (presentation): writes the viewer (`system-3d`, sole writer) + Phase-2 UI; its
  investigador is sole writer of the extractor (`extract-l4-full.py`).
- **Team B** (verification + data-correctness, this orchestrator): independent verifier
  (investigador1, writes only measurement notes, never the extractor) + 2D CAD ground-truth viewer
  (121) + `/design3d` skill + git.
- **Interface contract**: the certified `L4-full.json`. One writer per file.

## SETTLED — do not re-open

| # | Finding | Evidence | Who |
|---|---|---|---|
| H1 | Fragmentation is **by-design**, not a defect. Two-tier: `MERGE_GAP=0.90` does real geometry merges; `BRIDGE_GAP=2.50` adds 0 m (topology-only) = the labeled inference layer. The 14.11m longest-run ceiling is by-design. **Raising MERGE_GAP regresses the B20 measured/inferred split.** | Code read at `extract-l4-full.py:780-870` | investigador1 (verified independently) |
| H4 | The 51/58/60m "long duct walls" are a **perimeter DIFFUSER run**, NOT a trunk. The trunk network (≥30") is the interior and is legitimately short-run per H1. **The §6/§8 "recover long runs" / ~37%-undercount thread is RETIRED — it was measuring the wrong geometry.** | **HARD-CONFIRMED, three independent legs**: (1) label-type read, (2) data-side ≤24"-only runs, (3) 49–62 per-tap CFM + LD-# tags spaced ~4.2m along each wall @ 100–200 CFM (linear-diffuser signature), zero trunk labels | investigador1 |
| — | Extractor is **INTERNALLY CONSISTENT, not proven complete**: where it binds a WxH label, width matches ≤1" (100% of 420 bound runs — `WIDTH_GATE=20mm` rejects mismatches). Topology coherent: 483 components, 345 branching nodes. | Certified `L4-full.json` | investigador1 |
| — | **Height coverage: 61.7% measured / 38.3% SOURCE-ABSENT, BY LENGTH.** The 38.3% gap is not misbound — the drawing simply does not label those heights: of 284 unknown-height runs ≥24", exactly 1 has a gate-passing label (3/673 across all widths). **Better binding cannot recover it — there is NO extractor fix for the gap; `h=None` is correct and stays.** BOD (vertical POSITION) is separately known for ~99% of runs; only the TOP (extent) is absent. | Re-run at the extractor's own gates on certified data + 121's full label export | investigador1 (independently confirmed) |
| — | **Disregard** 121's earlier "1 tee / 0.8% connected" alarm — it was a stale read of the superseded `L4-graph.json` (old n0/n1 pipeline, refuted in §12), not the certified file. | | investigador1 |

## RESOLVED since first draft

- **WU2 (label→run height recovery) → recoverable ≈ 0. CLOSED.** Independently confirmed by BOTH
  investigador1 (1/284 ≥24" runs pass the gate) and 121 (0/673 informative runs; 639 have a label
  within 2.5m but median best width-error 101.6mm = 5× the 20mm gate). The 38.3% height gap is
  **SOURCE-ABSENT** — unknown-height runs are dominantly 4–7" wide and the drawing carries essentially
  no rectangular size labels below 8". **Better binding cannot close it; there is no extractor height
  fix.** (This retires "WU2 recovers height", which was the presumed critical path.)
- **H4 hardening → done. HARD-CONFIRMED** (three legs, above).

## OPEN — what could still move a number

- **211 four-inch spurious-pair check** (121 running; investigador1 flagged the same). 211 informative
  unknown-height runs are 4" wide, snapped to the smallest imperial rung — implausible as real
  rectangular ducts. If some are spurious pairings, the unknown DENOMINATOR is inflated and real
  coverage is **better than 38.3% (never worse)**. One owner runs, the other verifies.
- **5mm-over-gate eyeball** (immaterial to the headline): a few 24"/26" runs sit 5mm over the width
  gate from a '25"x20"' label — worth a manual look, does not change the frame.
- **H2 — width/centreline accuracy** (right wall from the 3-parallel stack): **UNTESTED, unresolvable
  with current data** (no size labels on those stack lines) — NOT refuted. Parked.

## DELIVERABLE FRAME (the honest pivot)

The remaining work is NOT recovering height (impossible — source-absent) but **honestly representing
what the source has and does not**:

1. **The viewer must SHOW the 38.3% absence, not hide it.** 121's `cob-im2-L4-cad2d.html` does this
   right — red `height UNKNOWN` = 1171 runs, reconciles to 971.8m / 2540.2m = **38.3%**, zero
   fabricated heights — and is the **reference pattern**. The shipped `system-3d` viewer does it
   WRONG (12's Defect-1: collapses provenance into one hidden color). Team A's viewer fix follows 121's.
2. **Clash gate runs on what's known**: clearance-below on BOD (~99%); vertical-clash advisory on the
   61.7% measured height only — **permanently**, since the 38.3% will never be recovered (do not assume
   a top to make an unknown-height run clashable — render it as explicitly unknown).

## Known defects (not blocking WU2)

- **Viewer provenance-legibility (12's Defect-1, live in the shipped viewer).** The viewer hides the
  whole small class by default — **1094.6m = 43.1% by length** — collapsed to one color. Of that,
  **587.4m carries MEASURED height** whose provenance credit is denied, and **507.1m is genuinely
  assumed** and reads as certain (the §13 trap, live). The 587.4m is already inside the 61.7%-measured
  total — this is a display defect, **separate from WU2 gap-recovery**, on team A's viewer surface.
- **Ortho-camera resize** (`system-3d:55150`): ortho frustum not recomputed on resize; model stretches.

## Staged proposals (NOT applied — user promotes)

- **`/design3d` topology/clash gate** (`PROPOSAL-design3d-clash-gate.md`): port scottstts
  `geometry-quality-kit` (MIT). Clearance-below arm is data-ready (BOD ~99%, needs only an external
  MECO datum); vertical-clash arm is advisory + skips `h=None` runs; reads certified `L4-full.json`.

## Reference outcomes

- **Repo eval** (`EVAL-repos-round2-2026-08-26.md`): no CAD pulls (all license-blocked or
  provenance-violating). `/design3d` ports = geometry-quality-kit + visual-validation. Dashboard =
  shadcn-ui (MIT) + tremor (Apache-2.0).
- **Adopted discipline**: name the denominator with every percentage; verify licenses at the upstream
  LICENSE file.
