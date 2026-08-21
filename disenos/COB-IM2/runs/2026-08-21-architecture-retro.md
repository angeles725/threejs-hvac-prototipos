<!-- review-status: pending -->
# COB-IM2 — design3d retro (2026-08-21, architecture decision, user-directed)

**Scope:** COB-IM2 DWG→3D reconstruction (research-sdd corpus #26 + the `disenos/COB-IM2/` viewer).
Captured at the user's explicit request to record an ARCHITECTURE decision — NOT a P8 design-run close
(COB-IM2 is a research-sdd reconstruction, not a design3d run). Propose-only (Hard Rule 6): nothing here
is applied to the kit; the user promotes.

## Observation (evidence-pinned) — offline single-file is a PHASE, not the product

The kit's current default (SKILL v1.13 / TRACK-THREEJS §Generic defaults) is "new threejs designs are
authored modular and delivered as an offline single-file `dist/`". COB-IM2 confirms that default is
correct — `disenos/COB-IM2/cob-im2-3d.html` is a ~5 MB double-click viewer, zero network, QA-verified
(`qa-render-offline.png`), rebuilt byte-reproducibly by `build.sh`. Vanilla Three.js + esbuild was the
right tool: the scene is data-driven static geometry (26,366 duct meshes from `cob-im2-floor.json`),
merged buffers and a hand-driven render loop, no React-shaped UI state.

What the user clarified is the SCOPE of that default: for the CAD→3D→dashboard class of work, the
offline single-file is the **Phase-1 deliverable of the reconstruction/dev process**, not the end
product. The end product is an **interactive dashboard**, for which React + React Three Fiber is the
right tool — and there the offline constraint does not apply. So "offline single-file is the delivery"
is true for Phase 1 and mis-scoped if read as "the delivery, always".

The load-bearing engineering point: the migration Phase 1 → Phase 2 is NOT a rewrite IF the certified
data layer is decoupled. The durable, hard-won asset is the JSON (`extract-floor.py → cob-im2-floor.json`)
— every certified number traces to a corpus block. Both the vanilla viewer and a future R3F dashboard
consume that same JSON. And because R3F IS Three.js underneath, the geometry-building code
(`THREE.Shape`/`ExtrudeGeometry`, merged buffers) is reusable inside R3F via `<primitive>`. Only the
UI/state shell is rewritten; the reconstruction carries over.

## Proposed (propose-only — user promotes)

- **DELTA candidate (TRACK-THREEJS §Generic defaults, or a new §Architecture phases):**
  Name a **two-phase architecture for CAD→3D→dashboard deliverables**:
  - **Phase 1 — Reconstruction (default today):** vanilla Three.js, modular src + offline single-file
    `dist/`. Goal = CERTIFIED geometry from the DWG. Offline is a DEV/RECONSTRUCTION constraint here
    (double-click review, no server, reproducible gate), not a product constraint.
  - **Phase 2 — Product (out of current default scope):** React + React Three Fiber, online, the
    interactive dashboard. Offline no longer applies.
  - **Bridge rule (the reason it is not a rewrite):** the certified JSON data layer is the contract
    between phases; keep it decoupled from the render layer. R3F reuses the Phase-1 geometry via
    `<primitive>` (R3F = Three.js), so Phase-1 work is never throwaway.
- **LEARNING (§Staged):** "Offline single-file is the RECONSTRUCTION-phase deliverable for CAD→3D work,
  not necessarily the product; when the product is a dashboard, plan a vanilla→R3F migration and
  decouple the certified data layer up front so the geometry carries over."
- **No GATES/PIPELINE change:** this scopes an existing default; it does not alter any gate.

## Honesty

An architecture-decision capture, not a defect finding. Pinned to a real, QA-verified Phase-1
deliverable and to the kit's existing offline default (v1.13). One claim is REASONED, not measured: that
the vanilla→R3F migration is low-cost because R3F wraps Three.js and the JSON is the durable asset — no
Phase-2 build exists yet to prove the migration cost. It should be validated on the first real dashboard
port, not taken as certified. Separately pending (the user redirected to this retro first): validating
`minimum_rotated_rectangle` for per-duct width, and capturing the DWG-reader bring-up ladder — both
belong in their own retro, not folded in here.
