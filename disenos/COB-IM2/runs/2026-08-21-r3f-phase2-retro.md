<!-- review-status: applied 2026-08-21 · kit v1.17 -->
# COB-IM2 — design3d retro (2026-08-21, R3F Phase-2 delivery, user-supplied session)

**Scope:** the Phase-2 dashboard build of COB-IM2 14A — a React Three Fiber `DuctViewer.jsx` component
for the Next.js product, plus a no-build HTML preview. Captured from a user-supplied session log (NOT run
in this session), so its build claims are `[session-observed]`, not measured here. It is the concrete
Phase-2 that the same-day architecture retro (`2026-08-21-architecture-retro.md`) only reasoned about —
this validates its bridge rule and adds R3F-track kit deltas. Propose-only (Hard Rule 6): the user promotes.

## Observation — Phase 2 confirms the bridge rule, and surfaces R3F-track constraints

The architecture retro claimed the vanilla→R3F migration is low-cost IF the certified JSON is decoupled
from the render layer. This build did exactly that and confirms it `[session-observed]`: `DuctViewer.jsx`
takes the floor JSON **by prop, not import**, so the data can come from a FastAPI endpoint (multi-level)
instead of being bundled — the decoupled-data-layer bridge rule, in practice. The B11-Industrial design
vocabulary (title-block cartela, condensed labels, monospace figures-with-units, thin rules not shadows,
cold gray paper, plotter-pen cyan) carried across the migration unchanged — the design system held.

What Phase 2 surfaced that Phase 1 could not:

1. **Claude artifacts sandbox has no R3F/drei.** Its preinstalled set is `three` (r128), `recharts`,
   `d3` — not R3F or drei — so an R3F `.jsx` cannot render in a Claude artifact preview `[session-observed]`.
2. **Correction to the supplied preview mechanism** `[reasoned, known-from-tool-docs]`: the no-build HTML
   pulls React/three/fiber/drei from **esm.sh** via importmap + Babel standalone. That runs when the file
   is opened in a normal browser, but a **Claude Artifact CSP blocks all external hosts (esm.sh included)**
   — it allows only self-contained assets + Google Fonts. So this preview is BROWSER-ONLY; publishing it
   as a Claude artifact yields a blank, CSP-blocked page. A Claude-artifact R3F preview would require
   vendoring everything inline (heavy) — usually not worth it; preview R3F in a browser, not an artifact.

## Proposed (propose-only — user promotes)

- **DELTA candidate (TRACK-THREEJS §Generic defaults / a new §Phase-2 R3F track):**
  - **Delivery shape for R3F work:** ship (a) the real `.jsx` component for the Next.js project AND
    (b) a no-build HTML preview (esm.sh importmap + Babel standalone) — BROWSER-ONLY, not a Claude
    artifact (CSP). Never expect an R3F component to preview inside a Claude artifact.
  - **R3F per-frame idiom:** per-frame animation lives in `useFrame` on the Three objects (interpolate
    with `THREE.MathUtils.damp`, read state from `userData`), NEVER React state — driving 283 marks
    through React state would re-render React every frame. Applied on the GROUP, iterating children.
  - **drei `<Html>` for labels** instead of hand-drawn canvas sprites → crisp DOM text at any zoom
    (addresses the project's recurring sprite/canvas-label sharpness issue).
- **LEARNING (§Staged) — Next.js R3F silent-failure guard:** an R3F canvas needs
  `dynamic(() => import(...), { ssr: false })` AND an explicit parent height; with `height: 100%` under a
  zero-height parent the canvas collapses to a blank screen with **no error message**. Assert a non-zero
  parent height at integration.
- **LEARNING (§Staged) — elevation-axis dashboard pattern for HVAC:** a vertical BOD axis (scale from the
  real tag range, e.g. 3.32–4.82 m) with each real BOD reading as a tick shows where clearances cluster;
  dual handles filter the scene live (drop the ceiling handle to isolate low ducts = plenum/structure
  conflict hunting); pair with an exploded view (×4) because the real Z range (~1.5 m) renders flattened.
  Plus an object search box (type a VAV id → highlight) when many devices (30) span a large plate (52×38 m).

## Honesty

The Phase-2 build itself is `[session-observed]` from a user-supplied log — not executed or measured in
this session, so the R3F component's behavior is reported, not verified here. The ONE claim I did adjudicate
is the esm.sh/CSP correction, from the Artifact tool's documented CSP (self-contained + Google Fonts only) —
that one is a genuine correction to the supplied preview mechanism, not a transcription. The learnings are
strong candidates precisely because Phase 2 confirmed the architecture retro's central bet (decoupled data
layer, design-system continuity) rather than contradicting it.
