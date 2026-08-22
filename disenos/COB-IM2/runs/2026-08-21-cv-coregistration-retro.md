<!-- review-status: pending -->
# design3d retro (2026-08-21) — CV co-registration (SIFT/RANSAC) invents a scale the CAD does not have

**Scope:** a user-supplied session that extended the CV-on-raster approach to MULTI-SHEET assembly —
co-registering sheets B→C with SIFT + Lowe ratio + RANSAC on the DWG preview rasters (73 matches → 17
inliers → a similarity transform), using C as the general floor, B registered onto C, A held as
detail-only because its automatic match was low-confidence. Captured to improve the CAD→3D tool.
`[session-observed]` for that session; `[CERT]`/`[CERT-live]` for the checks below. Propose-only
(Hard Rule 6): the user promotes. Companion to `2026-08-21-cv-fallback-retro.md`.

## Observation — the CV transform re-derives, imperfectly, what B4 already certifies exactly

The session's SIFT/RANSAC transform B→C was **scale ≈ 0.9174, rotation ≈ −0.37°, plus a pixel-space
offset**. But the three sheets are ONE floor drawn in ONE CAD frame at 1 unit = 1 m (B1), so they
co-register by **pure translation** — B4 certified exactly that: offsets B→A +37.235, C→A +33.775, no
scale, no rotation, content-verified by duct nearest-neighbour overlap (not by feature-match confidence).
Two sheets in the same model-space unit system are 1:1 by construction. `[CERT]`

So the 0.9174 scale and −0.37° rotation are **artifacts of rasterizing each preview at a different
pixels-per-metre ratio**, not real geometry. A pure translation SUCCEEDING at aligning duct content (B4)
is itself the proof there is no inter-sheet scale — a 0.917 scale would have made translation-only fail.
The CV recovered a relationship the CAD does not contain. `[CERT]`/`[INFER]`

Verification honesty `[CERT-live]`: my first check — comparing raw HVAC extents (Yspan B/C = 1.1376) —
is NOT a clean scale test, because B and C cover DIFFERENT thirds of the floor (B 8.76–51.14, C
11.83–49.08), so their extents differ for coverage reasons, not scale. The real proof is B1 (unit) + B4
(translation-only, content-verified), not that ratio — recording the bad specimen so it is not reused.

## Proposed (propose-only — user promotes)

- **DELTA candidate (CAD→3D intake ranking, extends the cv-fallback retro):** co-registration has the
  same route order as geometry. Route 1 (default): assemble sheets from their SHARED CAD coordinate
  frame — a translation the drawing already carries (B4), verified by content overlap, deterministic, no
  confidence gate. Route 2 (raster-only fallback): SIFT + Lowe + RANSAC on previews — a legitimate tool
  ONLY when there are no CAD coordinates, and it INVENTS scale/rotation from raster px/m differences.
  Never use CV co-registration when the sheets share a CAD frame.
- **LEARNING (§Staged) — "sheet won't register with confidence" is a CV-only failure.** The session held
  A out because its SIFT match was low-confidence. With real coordinates there is no such ambiguity: B4
  registered ALL THREE (A/B/C) by duct-content overlap and B7 partitioned them draw-once. A confidence
  gate is a symptom of feature-matching on rasters, not a property of the data.
- **LEARNING (§Staged) — CV invents what the CAD enumerates:** the session's "6 column candidates" (from
  connected components) vs the certified 18-axis grid (B2); same pattern as scale, elevation, semantics.
- **No GATES change.**

## Honesty

The session is `[session-observed]` (not run here). The load-bearing claim — that the CV 0.917 scale is
spurious — rests on B1 (1 unit = 1 m) and B4 (translation-only co-registration, content-verified), both
already certified in the corpus; and I explicitly discarded my own extent-ratio measurement as a bad
specimen rather than lean on it. The session's own verdict ("a reconstruction for visualization / digital
twin, not for exact construction quantities") is correct and is exactly the line our entity-based pipeline
crosses: certified coordinates give measurements, CV on previews gives a proportion.
