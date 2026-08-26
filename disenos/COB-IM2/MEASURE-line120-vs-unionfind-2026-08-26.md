# Does the line-120 identity loss survive the union-find rebuild?

Date: 2026-08-26 · Independent geometry-side read (no writes in Track A's tree)
Subject: `/home/cristian/investigacion/COB-IM2/tools/probes-creador/extract-l4-full.py` (1088+ lines, HEAD a29d14d, clean)

> **Correction, 2026-08-26.** This report first named `tools/l4/extract-graph.py` as the subject.
> That file writes `L4-graph.json`, an older parallel pipeline. The producer of the shipped
> `L4-full.json` is `tools/probes-creador/extract-l4-full.py` (`OUT` at line 21) — as
> `L4-full.json`'s own `meta.extraction` string says: *"parallel-segment-pair + graph
> (probes-creador)"*. I read past it. All **measurements** below were taken on `L4-full.json`
> itself and are unaffected; the **line references** and the merge constants are corrected to the
> real producer. Its architecture is the same design: explode at 109-114, union-find
> `merge_collinear` at 360-438 emitting `parts`, bridging at 819-868.
Data: `tools/out/L4-full.json` — 2033 runs / 2540.2 m (the canonical dataset baked into `cob-im2-L4-system-3d.html`)

## Verdict

**No. The rebuild recovers, it is converged at its own tolerance, and there is no targeted fix to make
at line 120.** `CRITIQUE-b16-roadmap.md` §6.2 identifies a real mechanism but misreads what it costs.

## 1. The explode is not a defect — it is the primitive

The extractor's unit is not a polyline. It is a **parallel segment pair**: a duct centreline is derived
from *two* parallel wall segments, which routinely come from two different polylines. §2
(`parallel_pairs_occluded`) consumes segments from a shared pool under a `used` set, and a run's length
is the **on-axis overlap** of its two walls, not the length of any polyline.

The explode at `extract-l4-full.py:109-114` — `rng = range(n) if (e.dxf.flags & 1) else range(n-1)` — is
therefore load-bearing. Preserving polyline identity there would starve the pairing pool of the fitting
edges that close runs at elbows and tees. §6.2's `28 831 → 191 484` is an accurate count of a
deliberate step, not evidence of damage.

## 2. The rebuild demonstrably works

`parts` in the shipped output is the fragment count per run:

| parts | runs | % runs | length | % length |
|---|---|---|---|---|
| 1 | 1675 | 82.4% | 1686.5 m | 66.4% |
| 2 | 302 | 14.9% | 635.5 m | 25.0% |
| 3 | 30 | 1.5% | 122.1 m | 4.8% |
| 4 | 21 | 1.0% | 70.9 m | 2.8% |
| 6 | 4 | 0.2% | 17.3 m | 0.7% |
| 8 | 1 | 0.0% | 8.1 m | 0.3% |

2485 fragments → 2033 runs (**1.22x**). 358 runs (17.6%), carrying **33.6% of network length**, were
assembled from more than one fragment. Merged runs have p50 2.25 m against p50 0.61 m for unmerged.
A rebuild that recovered nothing would read 1.00x and a flat parts=1 column.

## 3. The merge is converged — nothing is left on the table

Re-running `merge_collinear`'s exact criteria (ang≤1.0°, `MERGE_OFF`=0.05, w≤0.02, `MERGE_GAP`=0.90)
against the **shipped** 2033 runs yields 1969 — **1.03x**. The merge already did its job.

## 4. The 14.11 m ceiling is a tolerance artifact, not an identity artifact

Sweeping `gap_tol` over the shipped runs:

| `MERGE_GAP` | runs after | compress | max span | ≥15 m | ≥20 m |
|---|---|---|---|---|---|
| **0.90 (shipped)** | 1969 | 1.03x | 14.11 m | 0 | 0 |
| 1.20 | 1906 | 1.07x | 14.11 m | 0 | 0 |
| 1.50 | 1859 | 1.09x | **32.97 m** | 10 | 4 |
| 2.00 | 1772 | 1.15x | **139.34 m** | 4 | 3 |
| 2.50 | 1688 | 1.20x | 139.34 m | 10 | 5 |
| 4.00 | 1625 | 1.25x | 147.24 m | 10 | 10 |

Two things follow.

**(a) The residual gaps sit well clear of the tolerance.** Zero collinear same-width neighbour pairs
have a gap in (0.30, 0.50]; the distribution is 96 in (0.5,1.0], 163 in (1.0,1.5], 393 in (1.5,2.5],
with **p50 = 1.62 m** — nearly 2x `MERGE_GAP`. The source itself already says so at line 785:
*"MERGE_GAP=0.90 m never reached them."* The 14.11 m ceiling is stable from 0.90 through 1.20.

**(b) Raising the tolerance is not the fix.** The floor footprint is 153.13 x 42.0 m. At
`MERGE_GAP` 2.00 the longest "duct" becomes 139.34 m — the building chained end to end. The chaining
cliff sits between **1.50 and 2.00 m**, and the shipped 0.90 is safely below it. §8.1's ≥20 m runs are
only reachable at a tolerance that simultaneously manufactures that 139 m artifact.

## 5. Two hypotheses tested, both refuted

**Mine, refuted:** the gaps are classified fittings interrupting the wall pair. **0 of 652** candidate
gap midpoints lie within 1.0 m of any of the 1157 classified fittings (684 elbow / 217 tee /
188 transition / 68 cross). Fittings carry a `node` field — they sit at run *endpoints* and are already
consumed by §7. Radii 0.5, 0.75, 1.0 m all return zero.

**Weak:** a perpendicular duct crosses the gap. Only 111/652 (17%) have a near-perpendicular run within
0.6 m of the gap midpoint; 170 have nothing within 1.2 m.

**What the gaps actually are:** candidate gaps have own-width p50 **0.102 m (4")** and gap/width
p50 **10.9**. These are small ducts with voids ten times their own width. That is absent drawing
content, not lost geometry — the extractor cannot recover what the DXF does not draw.

## 6. The gap question is already answered, deliberately

`extract-l4-full.py:791` sets `BRIDGE_GAP = 2.50` (env-overridable, `BRIDGE_OFF = 0.06`) and the
bridging pass at 819-868 emits the 168-entry `bridges` array, each with an explicit `gap`
(e.g. `{"a":26,"b":110,"gap":2.278,"node":51,"w":0.6096}`), adding **0 m** of geometry — topology only.

So the residual band is not unhandled: `MERGE_GAP`=0.90 closes the measured joins, and (0.90, 2.50] is
*already* the bridging domain — the inference layer that moves connectivity from the measured 3.3% to
the inferred 19.5%. My 652 candidate gaps ARE that domain. Loosening `MERGE_GAP` into it would fold
inference into the **measured** layer and destroy exactly the distinction B20 spent itself establishing.
That would be a regression wearing a fix's clothes.

## 7. Consequence for Track A

There is no targeted fix at `extract-graph.py:120-124`. §6.2 should be marked **measured and closed**.
The binding problem is unchanged and is not XY continuity: **38.3% of network length still has an
assumed height**. Z is what blocks a clash test, and no amount of centreline merging produces it.
