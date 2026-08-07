# design3d v1.9 vs v1.8 — benchmark note (2026-08-07)

Scope: re-run `/design3d` on the two nave-panccadia equipos that paid a 2-attempt
"discovery" tax in the v1.8 run (mesa-trabajo, lavavajillas), with the improved
v1.9 kit, in a NEW folder (`equipos-v2/`) so the 18 v1.8 assets are untouched.
Built FRESH from spec + library recipe, blind to the v1.8 HTML.

## Result per hypothesis

### #1 gate-state green (flat-catalog `gate_passes:` subset) — CONFIRMED (measured)
Same real v1.8 materials evidence, two spec variants:
- v1.8 spec (no `gate_passes`): `gate-state.mjs` exit **1**, all 8 passes `locked`.
- v1.9 spec (`gate_passes: [materials]`): `gate-state.mjs` exit **0**, `materials passed`,
  "derivation coherent". Negative control (remove the line) → back to drift/exit 1.
Deterministic, reproducible. This is a clean v1.9 win.

### #2 recipe-from-P0 → stainless passes attempt1 — NOT SUPPORTED (confounded by reviewer variance)
Both fresh assets FAILED the materials gate on the stainless read across BOTH attempts:
- mesa-trabajo: brushed-stainless-read 0.57 (a1, spec material 0xc6cacc/0.95) → 0.57 (a2, recipe material 0xd2d6d8/0.9). threshold 0.78.
- lavavajillas: stainless-body-read 0.44 (a1) → 0.43 (a2). threshold 0.75.

Root-cause measurement (ImageMagick, mean gray of the stainless top, 0-255):
- v1.8 mesa render that a prior reviewer **PASSED at global 0.80**: mean gray **91.4**
- v1.9 mesa attempt2 that this reviewer **FAILED at 0.57**: mean gray **91.6**  (0.3% apart)

=> The two renders are pixel-equivalent on the material read, yet scored 0.57 vs 0.80.
The v1.8 run's OWN mesa attempt1 (dark, failed) scored 0.55 — this reviewer gives the
BRIGHT passing render (91.6) the same ~0.57 the earlier reviewer gave the dark one.
The blind reviewers are offset by ~one full attempt of calibration.

CONCLUSION: the design3d **materials gate is reviewer-variance-dominated on the
"brushed-stainless read" feature** (±~0.25 on identical pixels). "Attempts per asset"
is therefore NOT a reliable metric to compare kit versions — the v1.8 retro's
"11 PASS attempt-1 / 7 PASS attempt-2" split is partly reviewer luck, not asset quality.

### Secondary finding (real, separate): spec vs recipe material conflict
mesa-trabajo's spec `materials:` block (0xc6cacc / metalness 0.95 / roughness 0.34) is
genuinely darker/more-metallic than the library brushed-stainless-recipe (0xd2d6d8 / 0.9
/ 0.30) and the v1.8 HTML (which silently used the recipe values). A fresh build that
trusts the SPEC inherits a darker stainless. The v1.9 library extraction never reconciled
the source specs. attempt1(spec)=darker; attempt2(recipe)=v1.8 luminance parity.

## Actionable kit deltas (STAGED — for user promotion, per SELF-IMPROVEMENT §Hard boundary)
1. Give the materials gate an OBJECTIVE anchor so the stainless read stops being a coin flip:
   a deterministic script measures the render crop (mean luma / CIEDE2000 deltaE) against a
   per-material target declared in the spec — the reviewer confirms identity, the SCRIPT
   judges the value. (This is exactly img2threejs's model: comparison sheet + deltaE +
   `material_comparator.py`; push mechanical validation into scripts, spend model tokens
   only on true judgment.)
2. Reconcile each spec's `materials:` block with the library recipe when the recipe is the
   extracted source of truth (mesa spec carries stale darker values).
3. Feed the blind reviewer a comparison sheet (reference-or-target BESIDE the render), not a
   text-only promise — "one image per review".

## Evidence on disk
equipos-v2/{mesa-trabajo,lavavajillas}/runs/materials-attempt{1,2}.{png,review.json}
