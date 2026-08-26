# §6 long-run loss — experiment design, hypotheses, and acceptance contract

Owner: investigador1 (team B, independent verifier). Team A's investigador implements the
extractor edit; this document is the **input** and the **acceptance contract** their fix is
measured against. Nothing here edits the extractor.

## The target file (verified)

The certified `L4-full.json` (sha `7533dccba521779c`, 2540.2 m / 2033 runs / 168 bridges — the
generation `CRITIQUE-b16-roadmap.md` §12/§14 measured and every viewer loads) is produced by
**`tools/probes-creador/extract-l4-full.py`**, NOT `extract-graph.py`. The defect line is
`extract-l4-full.py:109-114` — the `LWPOLYLINE` explode that appends anonymous
`(pts[i], pts[i+1])` segments to a flat list and **discards the parent polyline handle**. Any
fix must edit this file so `L4-full.json` actually changes. (`extract-graph.py` writes a
different, non-certified artifact `L4-graph.json`; editing it moves nothing the viewers see.)

Immutable baseline: git tag `baseline-L4-2026-08-26` in `~/investigacion/COB-IM2`.

## The measured facts (two independent parses, agree to the digit)

- The three walls are **single straight `LWPOLYLINE`s** in source (jog = 0 on all of them), yet
  the extractor's longest run is 14.11 m and there are **zero** runs ≥ 20 m.
- Each corridor carries a **stack of 3+ near-parallel straight lines** per side, with
  **asymmetric** gaps of 340–760 mm. The outer-pair widths also land on real duct sizes
  (36″/48″/40″), so the stack is **not** one duct drawn thrice.
- The pairing is **greedy, smallest-width-first, one-time consumption**
  (`if i in used or j in used: continue`), followed by an **occlusion** reject.

## The three hypotheses (they need different fixes)

| # | Mechanism | Predicted signature | Correct fix |
|---|---|---|---|
| **H1** run-split | occlusion test rejects the trunk pair wherever a side-branch crosses between its walls | intended pair exists in `candidates` but is `OCCLUDED` at branch points; run breaks into ≤14 m pieces | parent-identity: same-parent collinear segments stay one run regardless of per-segment occlusion |
| **H2** wrong-pair | with 3 candidates/side, a narrower spurious pair sorts first and **consumes** a wall segment before the true pair forms | intended pair is `CONSUMED` (partner already `used`) by a narrower pair | selection fix: prefer pairings consistent with parent spans / longest-overlap, not smallest-width |
| **H3** under-count | the corridor holds **two real ducts**; the search finds one and misses the other | two distinct size labels on one stack; one run emitted where two are correct | admit both duct pairs (not a single wide run) |

**H2 and H3 produce the same symptom (short/missing trunk) by different mechanisms.** The
discriminator is the **MTEXT size labels** near each corridor: two distinct sizes on one stack
⇒ H3 (correct output is **two** runs); one size ⇒ H2 (one duct, wrong pair chosen). This is why
"restore the single 51/58/60 m run" is **not** a safe acceptance criterion until the labels
resolve duct-count — forcing a single wide run under H3 would merge two real ducts and is the
same invented-continuity error the corpus fell into five times (§12/§14).

## Acceptance contract (what the fix must satisfy)

1. **Correctness of duct-count first.** Per corridor, the emitted run(s) must match the
   label-resolved duct-count (1 under H2, 2 under H3) — not a preset "single run" target.
2. **Long runs recovered** where labels confirm a single long duct: it returns as one run at its
   true length (≤ 0.1 m tolerance), and runs ≥ 20 m stop being zero.
3. **Connectivity moves off 3.3%** (measured-only largest component; report the range with the
   inference labelled, per §14).
4. **Quantities stay within the §9 ±3% band** vs the baseline total (2540.2 m). A larger move is
   a regression to explain, not a win to ship.
5. **No new false pairs.** Tees/elbows still pair; any occlusion-bypass for same-parent segments
   must not re-introduce pairs the occlusion test was protecting against (the H2 regression risk).
6. **`L4-full.json` sha changes** and the viewers are re-pointed only after 1–5 pass.

## Verification method (read-only, mine)

- Diff candidate `L4-full.json` against the baseline tag: run-length histogram, runs ≥ 20 m,
  the three corridors' emitted runs vs the label-resolved truth, total length, component count.
- Re-run the read-only pairing replica (`diag_h1_h2.py`) on the candidate to confirm the
  intended pairs now form and no new spurious pairs appear at the control corridors.
- Controls: the 37.277 m verticals (14A easy, 14B hard — 4-deep with real 238/477 mm jogs).

## RESOLUTION (2026-08-26) — three-team convergence

**The §6.2/§8.1 premise was wrong. The extractor is measured-correct on the trunk network.**

**H1 (run-split): CONCEDED**, verified independently by reading `extract-l4-full.py:780-870`.
The two-tier design is genuine — `MERGE_GAP=0.90` does real 0-gap geometry merges;
`BRIDGE_GAP=2.50` (:791) does topology-only bridging (:815-870) that adds **zero metres** (the
labeled 168-bridge inference layer, connectivity 3.3%→19.5%). The 14.11 m ceiling is by-design
tolerance (residual gaps p50 1.62 m sit in the (0.90, 2.50] bridge domain). The explode is the
pairing **primitive** (run length = wall-overlap, walls from different polylines), so
parent-identity would starve the pool. §6.2 = **measured-and-closed**.

**H2 (wrong-pair) + H3 (under-count): EMPTY.** 121's MTEXT labels killed the discriminator —
**no size label sits on any of the 12 stack lines** (nearest is the same single label 0.26–2.4 m
off to one side); 11/12 candidate pair-widths have no label within 3 m.

**H4 (the correct reframe, confirmed independently from shipped `L4-full.json`):** the
51/58/60 m "duct walls" are a **perimeter linear-diffuser run** (6″ø taps + LD-1/LD-2 + CFM),
**not trunk**. Perimeter band (y≈8/50): 25 runs, all ≤24″, **zero ≥30″**. The real trunk
network (≥30″ runs) is the plan interior (187 runs, median midpoint x=103.6 y=28.0, matching the
trunk-label cluster x 83–107 / y 14–29) and is legitimately short-run (fitting-fragmented, the
by-design H1 behavior). **"Recover the long walls" is the wrong acceptance criterion.**

**Open question (flagged, not a finding — avoids the entities-vs-length trap):** 84% of the 187
wide (≥30″) runs are <1 m (96 are <0.5 m). Run-count ≫ label-count is *expected* (one labeled
trunk fragments into many runs), **not** over-count. The only residual: are the 96 sub-0.5 m wide
pairs geometrically real or spurious (W_MAX 2.40 m + ladder-snap at MIN_OVERLAP 0.25 m)? Settled
by the label→run binding, not by counts. Handed to team A's height-orphan probe.

**Real gate (pivot):** 38.3% of network length has an assumed height. Height has **no geometric
path** (all polylines elevation=0; only WxH labels carry it), so the **label→run binding** is the
shared critical artifact fixing both height and wide-run validity. Next: independent verification
of team A's WU2 (Z ground-truth).

*Superseded acceptance criteria (1: single-run recovery, 2: runs ≥20 m) — withdrawn: they
assumed the perimeter diffuser lines were trunk mains. Criteria 3–6 (connectivity range,
±3% quantities, no false pairs, sha change) remain valid for any future extractor change.*
