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
| H4 | The 51/58/60m "long duct walls" are a **perimeter DIFFUSER run** (6"ø taps + LD-/CFM labels), NOT a trunk. The trunk network (≥30") is the interior and is legitimately short-run per H1. **The §6/§8 "recover long runs" / ~37%-undercount thread is RETIRED — it was measuring the wrong geometry.** | 6"ø taps + CFM labels on the specific walls | investigador1 (direct evidence; NOT independently double-confirmed — 12's proximity test was uninformative) |
| — | Extractor is **INTERNALLY CONSISTENT, not proven complete**: where it binds a WxH label, width matches ≤1" (100% of 420 bound runs — `WIDTH_GATE=20mm` rejects mismatches). Topology coherent: 483 components, 345 branching nodes. | Certified `L4-full.json` | investigador1 |
| — | **Height coverage: 61.7% measured / 38.3% assumed, BY LENGTH.** BOD (bottom-of-duct = vertical POSITION) is known for 2015/2033 runs (~99%). The gap is vertical EXTENT (duct TOP = height), **trunk-concentrated (~30% of trunk runs covered).** | | investigador1 |
| — | **Disregard** 121's earlier "1 tee / 0.8% connected" alarm — it was a stale read of the superseded `L4-graph.json` (old n0/n1 pipeline, refuted in §12), not the certified file. | | investigador1 |

## OPEN — the single critical path

- **WU2 — the label→run binding.** The one artifact that settles everything downstream: (a) the
  38.3%-by-length assumed-height gap, and (b) the validity of the 96 sub-0.5m wide fragments (≥30"
  runs; `W_MAX=2.40` + ladder-snap `MIN_OVERLAP=0.25`). **Method constraint (hard):** must use the
  extractor's OWN width-gated binder (`WIDTH_GATE=20mm`, `LABEL_MAX_DIST=2.5m`), NOT a spatial-nearest
  binder — the naive binder produced 121's misleading 27%. Every recovered height must trace to a
  width-matched label; `h=None` stays uninterpolated (§13). **Owner:** team A's investigador.
  **Verifier:** investigador1 (reads the method itself). *In progress.*
- **H2 — width/centreline accuracy** (does the pairing pick the right wall from the 3-parallel
  polyline stack): **UNTESTED and unresolvable with current data** (no size labels on those stack
  lines) — NOT refuted. Parked until data allows.
- **H4 hardening** (non-blocking; H4 is already treated as retired). Pending investigador1
  confirming its evidence granularity: if its "6"ø taps + LD-/CFM" read is **per-tap-CFM-along-the-
  wall-length** (the diffuser signature), H4 is confirmed at the discriminating standard; if it is
  **presence-only**, run the cheap tightened per-tap-CFM check. Worth it because H4 is the one
  load-bearing claim everyone now builds on, and this corpus has retracted load-bearing claims before
  (confetti verdict, 37% undercount, bridges-inert — all withdrawn).

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
