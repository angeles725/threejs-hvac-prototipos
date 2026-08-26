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

- **WU2 (label→run height recovery) → NOT recoverable. CLOSED, three independent measurements.**
  investigador1 (1/284 ≥24" runs pass) + 121 (0/673 informative) + team A's WU2 (research-cob-im2
  PR #1, using the required width-gated binder, h=None uninterpolated). The decisive one is team A's
  **RANDOM-WIDTH CONTROL**: real width finds a width-matching label within 5m for **11.9% of unsized
  runs** vs **49.4% for a random ladder width** — real matches BELOW chance, i.e. nearby labels belong
  to OTHER ducts. Honestly-recoverable upper bound ≤ ~139 runs / ~97m = ~10% of the 971.8m gap, each
  needing per-run confirmation; ~89% is a drawing-completeness floor (size never tagged near the run).
  **Coverage is FINAL: 38.3% assumed / 61.7% measured BY LENGTH (trunk worst, 29.9%). There is no
  extractor height fix; Z cannot be closed.** (team A's pre-control draft overclaimed "27–99.7%
  recoverable"; the control corrected it before ship — the discipline working. investigador1 then
  REPRODUCED PR #1's numbers with independent code and confirmed the control is fair under BOTH a
  label-frequency null (50.3%) and a stricter uniform-ladder null (18.8%) — real 11.9% is below both.
  **WU2 is TRIPLE-CONFIRMED and settled.**)
- **MECO / clearance datum → confirmed ZERO in the DXF.** The clash gate's clearance arm must be
  handed a threshold externally; there is nothing in-drawing to derive it from.
- **H4 hardening → done. HARD-CONFIRMED** (three legs, above).

## RESOLVED — the 4" question (121 ran → then RENDERED it and self-corrected; investigador1 verified the ARITHMETIC only)

- **38.3% by length substantially STANDS.** The earlier 32–37% bracket is **RETRACTED** — it wrongly
  assumed the 4" runs were droppable. 121 plotted the 82.4mm cluster (matplotlib, headless — a picture,
  not a display) and looked: the 4" runs are mostly **REAL small branch ducts with genuinely unknown
  height**, so they BELONG in the denominator. Dropping them understates the gap.
- **Mechanism = INNER-PAIR SELECTION (the old H2 at small scale).** For sampled runs (L4_1598, L4_1825,
  14C) the extractor paired an **inner** line pair at 82.5mm instead of the true **outer** pair at
  ~105mm, and the imperial ladder snapped it back to 4" (101.6mm) — landing near the right width by
  accident. Perpendicular flanking-separation of 40 cluster runs: **31/40 at 89–105mm** (real 4"-scale
  ducts); only ~5/40 are detail geometry (e.g. L4_1183, a `BD-40"x20"` damper detail). So "misclassified
  width" is right, but it is wrong-PAIR selection, not a bogus run — the same H2 failure investigador1
  and 121 chased at trunk scale at the start, reappearing at small scale where it actually happens.
- **Honest correction: ≤ ~1 point** (only the ~5/40 → ~25 of 211 detail-geometry runs are droppable).
  "Coverage is better than 38.3%, never worse" holds in DIRECTION but the size is ~1 point, not 6.
- **Process note worth keeping:** investigador1's 31.9%/37.0% arithmetic was correct and reconciles
  exactly with 121's — but it verified the *arithmetic*, not the *interpretation* (droppable vs real);
  both had it wrong in the same direction until 121 rendered the picture. **A render beat a second
  arithmetic check.** (121's image: `scratchpad/cluster-82mm.png`, sent to the user.)

## OPEN — small threads

- **PR #1 §4 connectivity line — HOLD before merge.** team A's §4 (commit c3f3950) says "173/173 wide
  unlabeled runs join at both ends, zero floating"; investigador1 gets **162/173** under degree≥2 (6
  one-end, 5 truly isolated). The 173 count is exact; "zero floating" does NOT reproduce. May be a
  definitional difference (team A's "joined" looser than degree≥2) — reconcile the definition; do not
  ship a connectivity figure that doesn't reproduce. Height conclusion unaffected.
- **H2 — width/centreline accuracy**: still UNTESTED at trunk scale, but a **verified instance now
  exists at small-branch scale** — inner-pair selection in the 82.4mm cluster (see the 4" resolution).
  Bounded (~1 point of the denominator); a real small width-accuracy issue, not a coverage mover.
  **Latent-accuracy caveat (investigador1, worth keeping):** for ~order-25 of these runs the extractor's
  `w_raw` is off by up to ~20mm and the imperial LADDER SNAPS it to a plausible nominal size — so the
  error is invisible in every width-based metric; only `w_raw` exposes it. A pipeline that silently
  ladder-corrects imprecise raw measurements will do so even where the ladder lands on the wrong nominal.
- **~139 recoverable candidates** (all ≥8", zero 4", a loose upper bound) → 121's cad2d for
  human-in-loop per-run confirmation (Track A final close).
- **5mm-over-gate eyeball** (immaterial): a few 24"/26" runs sit 5mm over the gate from a '25"x20"'
  label — worth a manual look, does not change the frame.
- **[DONE] Eyeball the 82.4mm cluster** — 121 rendered it (matplotlib, headless); resolved above.

## OPERATIONAL HAZARD (anyone running captures/gates)

- **serve.py can bind a port ALREADY serving another session's tree** and fail silently — the probe
  then measures the WRONG tree and exits 0 (green light on the wrong files). 12 hit this on port 8123,
  moved to 8137. **Pin a unique port AND assert serve.py actually bound before trusting any gate/capture
  result.**

## DELIVERABLE FRAME (the honest pivot)

The remaining work is NOT recovering height (impossible — source-absent) but **honestly representing
what the source has and does not**:

1. **The viewer must SHOW the 38.3% absence, not hide it.** 121's `cob-im2-L4-cad2d.html` does this
   right — red `height UNKNOWN` = 1171 runs, reconciles to 971.8m / 2540.2m = **38.3%**, zero
   fabricated heights — and is the **reference pattern**. The shipped `system-3d` viewer does it
   WRONG (12's Defect-1: collapses provenance into one hidden color). Team A's viewer fix follows 121's.
   **Co-registration lesson** (team A's investigador caught a 20.1mm error on 14C — exactly the 20mm
   gate the tool exists to audit): "verify you're on the certified artifact" is NOT sufficient — 121 was
   on the certified *overlay* but had the *source* DXF in a different pipeline's frame. Two pipelines
   here carry different sheet offsets (`extract-graph.py` vs `extract-l4-full.py`). Register
   source→overlay from ONE frame source (`meta.sheets`); cross-check offsets between pipelines, never
   assume they match.
2. **Clash gate runs on what's known**: clearance-below on BOD (~99%); vertical-clash advisory on the
   61.7% measured height only — **permanently**, since the 38.3% will never be recovered (do not assume
   a top to make an unknown-height run clashable — render it as explicitly unknown).

## Defects — fixed this session (12, gate now LIVE after user unblock, commit 82af818)

- **Viewer provenance-legibility (Defect-1) → FIXED.** Was hiding the whole small class (1094.6m =
  43.1% by length) collapsed to one color; now shows height provenance on every run (121's cad2d
  pattern). This was the live §13 trap in the render.
- **§13.2 denominator trap, LIVE in the client-facing viewport → FIXED.** The HUD showed 20.7% (rect
  labels by COUNT, excluding 442 round-label runs) next to 38.3% by length — reconciling to nothing,
  in the deliverable. Both figures now name "de la longitud" (the exact prose trap the denominator rule
  targets, caught by the live gate).
- **Ortho-camera resize → FIXED** (same commit): frustum now recomputed on resize.

## Defects — remaining

- **Viewer framing** (found by the first live gate run): network crops past the right edge and overlaps
  the HUD. Now measurable, queued as its own WU on team A's viewer surface.

## Staged proposals (NOT applied — user promotes)

- **`/design3d` topology/clash gate** (`PROPOSAL-design3d-clash-gate.md`): port scottstts
  `geometry-quality-kit` (MIT). Clearance-below arm is data-ready (BOD ~99%, needs only an external
  MECO datum); vertical-clash arm is advisory + skips `h=None` runs; reads certified `L4-full.json`.

## New tooling (built + run this session)

- **Duct clash/clearance tool** (`tools/duct-clash.py`, report `CLASH-REPORT-L4.md`): shapely oriented
  footprint × Z-interval [BOD, BOD+h], adjacency-excluded, `h=None` SKIPPED per §13. First run on
  L4-full.json flagged **36 CANDIDATE run-to-run clashes — UNVERIFIED** — plus 143 unresolved (a run
  with unknown height, correctly not assumed) and 496 degenerate zero-length runs excluded. **Do NOT
  cite 36 as a finding yet.** The dominant pattern (branch/small crossing at similar BOD) is exactly
  where an incomplete extractor adjacency (a missed tee-connection) would masquerade as a clash, so the
  list is a mix of possible real coordination clashes and false positives. Needs topology cross-check +
  a visual spot-check of the top candidates (e.g. L4_0773 vs L4_0857 @ (102.78, 35.14)) in the cad2d
  viewer before any is reported. 5 of the 36 have <1mm² plan overlap (likely digitization artifacts).

## Reference outcomes

- **Repo eval** (`EVAL-repos-round2-2026-08-26.md`): no CAD pulls (all license-blocked or
  provenance-violating). `/design3d` ports = geometry-quality-kit + visual-validation. Dashboard =
  shadcn-ui (MIT) + tremor (Apache-2.0).
- **Adopted discipline**: name the denominator with every percentage; verify licenses at the upstream
  LICENSE file.
