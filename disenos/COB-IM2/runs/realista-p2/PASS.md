# WU-L4-REALISTA Phase 2 — PASS (galvanized presentation mode + honesty guards)

A data-viz <-> presentation toggle. Presentation mode renders the ductwork as brushed
galvanized metal; data mode keeps the provenance colours.

## Verified
- **Metal reads as galvanized** (GPU, the user's renderer): the fitting + duct show a metallic
  gradient and brushed texture, not flat boxes. Measured env-intensity sweep (?metal=N, @3D's
  bisection): duct top-face luminance 1.9->112 (too dark/steely), 4.5->163 (galvanized). Default
  set to **4.5** — measured for THIS page's darker procedural room, not the kit's RoomEnvironment
  1.9 (documented in code so it is not "corrected" back). SwiftShader under-renders the metal in
  the far overview but matches GPU up close (163 vs 164), so the read is GPU-judged.
- **Root cause of the earlier flat metal**: the fused geometry had NO `uv` attribute; a roughnessMap
  samples on uv, so without it the brushed map collapsed to a constant near-mirror. Fixed by deriving
  uv once in makeGeo (45deg world-planar). (Neither of the reviewer's two hypotheses — dark env, map
  not reaching the material — was the cause; it was the missing uv, found by a grep of the attribute.)
- **Two honesty guards (both required)**: a presentation-mode banner (top-centre, amber) declaring the
  mode hides provenance — the colour no longer distinguishes measured vs assumed height, 38.3% is
  assumed, accessory marking hidden, use data mode; and the bottom legend swaps its provenance chips
  for "el color NO codifica procedencia · usa el modo datos". The banner's earlier no-show was a CSS
  bug: `style.display=''` returns control to the sheet rule (`display:none`); fixed to `'block'`.
- **Toggle-restore (the runtime invariant static audit cannot prove)**: banner display `block` in
  realista -> `none` in data; and toggling realista->data at runtime is **AE=0 (byte-identical)** to a
  fresh data-mode load. @3D's construction-value audit (every setMode-touched property returns to its
  declared origin; setMode touches neither `side` nor `clippingPlanes`, so isolation + caps survive by
  construction) + this pixel diff confirm it.
- HUD 8.3% "sospechosa" row present (from Phase 1's finding). Dead `scene.environmentIntensity` line
  (no-op in r160) removed; `matTerm.metalness` aligned to the network material (was 0.5 vs 0.90 — the
  same galvanized rendered two ways; terminals hidden by default so invisible until that layer is on).

## Deviation from the kit recipe (declared, correct)
The kit's roughnessMap uses `Math.random()` for the brushed striations — which would break a pixel-diff
gate (a different texture each load = noise that eats the change signal). @3D seeded it with a fixed
mulberry32. Same look, deterministic — a gate, not a coin flip.

VERDICT: PASS. The presentation mode reads as galvanized metal ductwork, the toggle is invariant, and
the mode declares its own honesty cost. The larger visual win the user asked for, delivered without
letting the pretty mode pass as a survey.
