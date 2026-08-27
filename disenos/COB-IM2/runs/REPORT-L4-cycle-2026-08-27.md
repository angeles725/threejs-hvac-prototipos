# COB-IM2 Level 4 — design3d cycle REPORT (2026-08-27)

Dual-track run: @3D (Opus 5) built the viewers; Revisor (Opus 4.8) gated each work unit and
committed. All work is a retrofit gate over the existing L4 viewers (spec-less; assumed thresholds
recorded in each review). Every claim below is measured, not eyeballed.

## Work units, gates, commits

| WU | What | Verification | Commit |
|----|------|--------------|--------|
| WU-L4-A | system-3d opens framed on bay ejes 9-10; `__qaFraming` measures the presented subject; HUD declares one-bay-vs-whole-network; non-bay ductwork HIDDEN by clipping (not dimming) | framing-probe (overlapsHUD=false, occupancy 0.31) + **2-judge blind panel** (composition 0.80 / honesty 1.0) after a user-authorized approach change (dim→hide) when 3 dim attempts failed the blind | f116ce1 |
| WU-L4-B1 | system-3d stencil section caps close the bay-clip see-through + 124 loft end-caps | before/after cut-region pixel diff 0→169738; capdebug=1 magenta exactly at the 7 cut cross-sections; framing regression intact | 91ffeb3 |
| WU-L4-B2 | full-3d same caps (its height clip) + 217 loft caps; adds ?clip flag | capdebug=1 magenta at cuts (positive) + no-clip no-magenta (**negative control**) + solid cut faces | 3d969d6 |
| WU-L4-B r2 | honest cut-face colour (matte 0xe0e6ea + legend chip), ?ortho verification, `__meshData` hook | rendered cap-vs-measured dE 18.8–40.8; ortho caps render; **boundary-edge count 992→0 (sys) / 1736→0 (full)** = lofts measured watertight | 48f10d1 |

catalogo-3d: diagnosed OUT — its `hvac-catalog.js` sweep caps duct ends by default; not the clip defect.

## Key diagnoses (all measured)

- **WU-L4-A**: "frame the bay AABB + dim the rest" cannot isolate a 12 m bay of a 153 m plant at
  occupancy 0.31 oblique — the dim was measurably modest (−10% mean); HIDE (an invariant: only the
  bay's ducts draw) delivered the read. Doctrine: when a feature fails twice near-threshold,
  change the MECHANISM, don't keep calibrating.
- **WU-L4-B1 no-op**: stencil caps drew nothing because `renderOrder` on a THREE.Group becomes its
  subtree's `groupOrder`, sorted BEFORE renderOrder — the caps drew before the count passes, against
  a zeroed stencil. Caught by before/after byte-identical on the SAME renderer (GPU + SwiftShader),
  bisected with a ?capdebug magenta mode. Fix: group.renderOrder=0.
- **WU-L4-B r2**: the gray cap read as a provenance class (CIE76 dE 6.5/7.7 to accessory/measured);
  a cut through an assumed-height (orange) duct lied about provenance. Fixed by a matte non-class
  colour + legend declaration — the same honesty rule as the WU-A dimming legend.

## Verification instruments used
framing-probe.mjs (SwiftShader) · capture.mjs (+ `--gpu` D3D12 diagnostic) · ?capdebug magenta
bisection · before/after same-renderer pixel diff · CIE76 dE on sampled pixels · boundary-edge
count over the `__meshData` buffer · 2-judge blind panel.

## Instrument fix shipped
`capture.mjs` dropped the browser's favicon "Failed to load resource" console echo (was a false
console-dirty on every self-contained page).

## Follow-ups (non-blocking)
- system-3d `?clip` flag for its height slider (minor; its bay clip is always active so caps are
  exercised by default).
- inv2 dominance fixture (mvp + per-run AABBs) and inv4 DXF snippets — pending.

## Kit feedback (folded into design3d-kit by the inv1–4 team, held-not-deployed)
render-order-inversion gotcha · negative-control doctrine · measure-before/after-on-same-renderer ·
verifiability of render-only techniques (debug mode or geometry) · snapDivergence gate valley (9 mm,
measured over 2033 runs) · declare re-purposed visual channels · orchestrator pre-look ≠ verdict.
