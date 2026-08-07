# Block 53 — Objectively anchoring the design3d material-read gate: a MEASURED reviewer-variance failure and the CIEDE2000 ΔE00 fix adopted from img2threejs (Object Sculptor upstream)

> DOCUMENT-mode capture (METHODOLOGY §20) of a finding produced this session, on the SAME "better
> Three.js **design tools**" axis as [Block 52]. It answers "how do you stop a headless material/PBR
> gate from being a coin flip?" A benchmark of the `design3d` skill (v1.9 vs v1.8) re-built two
> stainless equipment assets FRESH and both FAILED the `materials` gate on the "reads as brushed 304
> stainless" feature — **but a pixel measurement showed the failing render was value-identical to the
> render a prior blind reviewer PASSED**. The gate's stainless judgment is **reviewer-variance-dominated**
> (±~0.25 on the same pixels). The fix is the one img2threejs ships and our older preserved snapshot did
> NOT: **CIEDE2000 ΔE00** (their v1.3 feature) as an OBJECTIVE colour/value anchor — a deterministic script
> measures a render crop's mean sRGB and compares it to a spec-declared target; the model confirms
> identity, the SCRIPT judges the value. Validated on the exact benchmark renders: ΔE00 collapses the
> reviewer-variance false-negative to **0.13** (imperceptible) while still catching a GENUINE
> spec-vs-recipe material bug at **11.7** (clearly-wrong). This is the "push mechanical validation into
> scripts, spend model tokens only on real judgment" philosophy design3d already inherited from this
> upstream — extended to the one axis that was still a guess.
>
> Subject version: `img2threejs` (github.com/img2threejs/img2threejs, v1.4.1, 10.2k★, Apache-2.0 ©2026
> hoainho) — the CURRENT upstream of the `design3d` skill (both run the ladder
> blockout→structural→form→material→surface→lighting→interaction→optimization; design3d's kit cites
> "Object Sculptor" as the state-machine/rubric source, `references/PIPELINE.md:30` `[CERT]`). NOTE the
> corpus already preserved an OLDER Object-Sculptor snapshot under
> `sources/design3d-skill/object-sculptor/` whose `scripts/` predate CIEDE2000 (no `color_metrics.py`,
> no `material_comparator.py`) — this block documents the NEWER color anchor. design3d kit @ v1.9
> (`~/.claude/skills/design3d`).
>
> Sources (preserved before citing): `sources/upstream/img2threejs_color_metrics_2026-08-07.py`
> (sha256 e4b720e9…, the ported math) · `sources/upstream/img2threejs_LICENSE_Apache-2.0.txt` ·
> the benchmark evidence on disk under `disenos/nave-panccadia/equipos-v2/` (renders + review JSONs +
> `runs/benchmark-note.md`) · the older `sources/design3d-skill/object-sculptor/` snapshot.
> Method: benchmark re-run of design3d (fresh builds, headless Playwright/SwiftShader captures via
> `research/tools/capture.mjs`, blind-reviewer agents); crop mean-sRGB measured with ImageMagick
> `convert ... -format %[fx:mean.*255]`; CIEDE2000 ported to JS from `color_metrics.py` and run on the
> measured means. Markers (§3): `[CERT]` local `file:line` / measured artifact · `[CERT-web]` official
> web (GitHub, URL+date 2026-08-07) · `[INFER]` deduction.

---

## 1. The failure: the material-read gate is reviewer-variance-dominated `[CERT]`

The `design3d` `materials` gate hands a BLIND reviewer a render + a TEXT promise from the spec
("brushed 304 stainless — satin, NOT dark matte, NOT chrome") and asks for a 0–1 score; a critical
feature below its threshold FAILS the pass (`GATES.md` §Verdict). Re-building `mesa-trabajo` and
`lavavajillas` fresh from spec + the library brushed-stainless recipe, BOTH failed the stainless
feature across two attempts each:

- `mesa-trabajo` `brushed-stainless-read` 0.57 / 0.78 (attempt1 AND attempt2) — `equipos-v2/mesa-trabajo/runs/materials-attempt{1,2}.review.json` `[CERT]`
- `lavavajillas` `stainless-body-read` 0.44 → 0.43 / 0.75 — `equipos-v2/lavavajillas/runs/materials-attempt{1,2}.review.json` `[CERT]`

The decisive measurement (mean gray 0–255 of the table-top crop, ImageMagick):

| render | mean sRGB (top crop) | blind-review verdict |
|---|---|---|
| v1.8 `mesa` `materials-attempt2.png` (the shipped, PASSED asset) | **(86.4, 92.3, 97.4)** | global **0.80 PASS** |
| v1.9 `mesa` attempt2 (recipe material) | **(86.7, 92.5, 97.7)** | feature **0.57 FAIL** |
| v1.9 `mesa` attempt1 (spec material) | (53.4, 57.6, 61.8) | feature 0.57 FAIL |

The v1.8-passing render and the v1.9-failing render are **within 0.3%** on the stainless value, yet were
scored 0.80 vs 0.57 by different blind reviewers. The v1.8 run's OWN mesa attempt1 (genuinely dark,
failed) also scored ~0.55 — i.e. this reviewer gives the BRIGHT passing render the same number a prior
reviewer gave the DARK failing one. **Conclusion `[CERT]`:** on the "does bare metal read satin" axis
the gate has ~±0.25 of reviewer noise on identical pixels, so **"attempts per asset" is NOT a valid
metric to compare kit versions** — the v1.8 retro's "11 PASS attempt-1 / 7 attempt-2" split is partly
reviewer luck. `[INFER]`: metalness ~0.9 faces reflect the dim `RoomEnvironment` and read as a flat
mid-grey that a strict reviewer calls "matte plastic" and a lenient one calls "satin 304" — a purely
verbal target cannot separate them.

## 2. Secondary, REAL finding: the spec's `materials:` block contradicts the library recipe `[CERT]`

Attempt1 used `mesa-trabajo`'s spec material (`#c6cacc` / metalness 0.95 / roughness 0.34) and measured
(53,58,62) — genuinely dark. Attempt2 used the library `brushed-stainless-recipe` values
(`#d2d6d8` / 0.9 / 0.30, what the v1.8 HTML silently shipped) and measured (87,93,98) — v1.8 parity.
So the v1.9 library extraction never reconciled the SOURCE specs: a fresh build that trusts the spec
inherits a darker stainless. This is a real bug the objective anchor (below) catches; the reviewer
variance is not.

## 3. The fix: CIEDE2000 ΔE00 as an objective colour/value anchor (from img2threejs) `[CERT-web]`/`[CERT]`

img2threejs's objective colour number is `ΔE00(mean_RGB(reference_crop), mean_RGB(render_crop))`
(`forge/stage4_review/material_comparator.py:119`, `[CERT-web]` 2026-08-07). The load-bearing math is
`forge/_shared/color_metrics.py` — pure `math` stdlib, no photo assumption: `srgb_to_lab` (sRGB→linear→
XYZ D65→CIELAB) + `ciede2000(lab1,lab2)` with the full R_T hue-rotation term, verified against Sharma
et al. test pairs (`sources/upstream/img2threejs_color_metrics_2026-08-07.py:24-107` `[CERT]`). CIEDE2000
corrects CIELAB's blue-region non-uniformity — it is the right "same hue-zone?" metric.

**Their plumbing does NOT port; the math does.** Their target colour always comes from a REFERENCE PHOTO
(their material registry declares roughness/metalness priors only — no base colour). Our equipment is
built from CAD envelopes with NO per-asset photo. The adaptation is to move the target from "photo" to a
**spec-declared value**, keeping the ΔE00 math verbatim `[INFER]`:

1. Copy/port `color_metrics.py` into `research/tools/` (pure math; trivially portable to JS to run inside
   `gate-state.mjs` with no Python hop — done for validation, see §4).
2. Declare a per-material target in the spec (no photo needed):
   `colorTarget: { srgb:[R,G,B], deltaE00Max:6.0, crop:{view,x,y,w,h} }` — the RENDERED target value
   (not the albedo hex, which ≠ the on-screen value after ACES tonemapping).
3. A deterministic probe (sibling of `probe.mjs`) takes the masked/explicit-rect mean sRGB of the crop
   off the PNG `capture.mjs` already writes, and computes `ΔE00(measured, target)`.
4. `gate-state.mjs` gates: PASS iff `ΔE00 ≤ deltaE00Max`. The stainless case now yields ONE number both
   "reviewers" must agree on — the 0.80/0.57 split disappears because there is no reviewer on the
   colour/value axis. (Roughness/gloss "does it read metallic" is a separate axis this does NOT solve.)

ΔE00 tolerance seed: ≤1 imperceptible, ≤3 tight, ≤6 "reads as the right material", >10 clearly wrong.

## 4. Validation — the anchor collapses the variance AND catches the real bug `[CERT]`

CIEDE2000 ported to JS from `color_metrics.py` and run on the measured means (`ΔE00` between two sRGB
triples):

| pair | ΔE00 | reading |
|---|---|---|
| v1.9 mesa attempt2 (recipe) **vs** v1.8-PASS | **0.129** | imperceptible → the render IS the passing render; the 0.57 FAIL was reviewer noise |
| v1.9 mesa attempt1 (spec material) **vs** v1.8-PASS | **11.70** | clearly-wrong → the anchor still catches the real §2 spec/recipe divergence |

So the ΔE00 gate would PASS attempt2 (fixing the false-negative a reviewer produced) and FAIL attempt1
(correctly flagging the genuine material bug) — resolving BOTH findings on one deterministic number.

## 5. TRAPS + license `[CERT]`

- **sRGB is load-bearing and must be verified first.** `srgb_to_lab` assumes the PNG is sRGB-encoded. Our
  `capture.mjs` uses `page.screenshot()` over a canvas whose renderer sets
  `outputColorSpace = SRGBColorSpace` (shell template) → the PNG IS sRGB, so ΔE is valid here `[CERT]`.
  A renderer NOT emitting sRGB would silently make every ΔE wrong — the single likeliest way to ship a
  green-but-meaningless gate.
- **Use an explicit crop rect, not img2threejs's auto foreground mask** (`extract_pbr_evidence.py:243`
  samples corners as background — misfires on a scene/multi-object shot) `[CERT-web]`.
- **Adopt only the `deltaE00` axis**, not `material_comparator.passed`/microstructure/directionalResponse
  — those compare two IMAGES' luma stats and need a reference render we don't have `[INFER]`.
- **Two colour impls exist in the repo — use `color_metrics.py` (CIEDE2000), not
  `extract_part_color_recipe.py` (CIE76 + Bradford, a photo-illuminant correction we don't need)**
  `[CERT-web]`.
- **License:** Apache-2.0, ©2026 hoainho, no `NOTICE` file (`sources/upstream/img2threejs_LICENSE_Apache-2.0.txt`
  `[CERT]`). Copying `color_metrics.py` requires: keep the Apache text in-repo, retain the copyright
  attribution, and mark the file modified ("Adapted from img2threejs, Apache-2.0 ©2026 hoainho"). No
  copyleft. `[CERT]`

## 6. What this is (kit boundary) `[INFER]`

The adoption is a STAGED proposal for the design3d kit — a run never edits the kit; the user promotes
(`SELF-IMPROVEMENT.md` §Hard boundary). The reusable tool (a `material-color-probe.mjs`) belongs in
`research/tools/` (project repo); the spec-schema `colorTarget` field and the `gate-state.mjs` ΔE gate
are kit-side deltas for the user to promote. Full evidence: `equipos-v2/runs/benchmark-note.md`.
