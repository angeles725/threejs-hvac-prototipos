# L4 viewer grading — design3d GATES ladder

Date: 2026-08-26 · Grader: Opus 5 (3D build/judge lane) · Status: **PREFLIGHT FAIL — no gate score is issuable**

## 0. Headline

Per `GATES.md` step 0, the evidence chain is preflighted *before* an attempt is spent. On this
machine the instrument does not exist:

| Requirement | State | Evidence |
|---|---|---|
| `node_modules/` | **absent** | `ls node_modules` → No such file or directory (repo root) |
| `puppeteer-core@^25.3.0` | declared, **not installed** | `package.json` deps vs empty `node_modules` |
| Chrome/Chromium binary | **absent** | `chromium`, `chromium-browser`, `google-chrome` not found; `~/.cache/puppeteer` absent |
| `window.__qaFraming` hook | **absent in all 5 viewers** | `grep -c __qaFraming` → 0 for every file |

Consequences, stated plainly rather than worked around:

- `capture.mjs`, `probe.mjs`, `preflight.mjs`, `framing-probe.mjs` cannot run → **no screenshots,
  no draw/tri medians, no console sidecar**.
- No `__qaFraming` → framing check is `status:'no-hook'`, a **SKIP, never a fabricated pass**
  (GATES.md, mechanical checks).
- No screenshots → **no blind vision review**, which GATES.md names as the *only* acceptance
  authority. "Evidence-gated advance": a verbal "looks good" is not a gate result.

Everything below is therefore **static analysis**, explicitly not a gate verdict.

## 1. Canonical viewer reconcile (design3d Hard Rule 1 / Execution step 2)

**Canonical = `cob-im2-L4-system-3d.html`.** Evidence, not size:

| | `cob-im2-L4-full-3d.html` | `cob-im2-L4-system-3d.html` |
|---|---|---|
| `stats.duct_runs` | 2132 | **2033** |
| `stats.total_length_m` | 2238.5 | **2540.2** |
| `by_class.trunk` | n=322, m=282.3 | n=391, m=364.3 |
| title | "Nivel 4 completo (14A+14B+14C)" | "Nivel 4 — sistema conectado" |
| provenance `w_src`/`h_src`/`bod_src` | present (2132/2132/2133) | present (2034/2033/2033) |

Fewer runs, greater length is the signature of commit `dbdece4` ("L4 final data — 2540m,
imperial-admission rule"): runs were merged and re-admitted, not dropped. `system-3d` is the later,
corrected dataset and the only one carrying the connectivity treatment.

**Stale-baseline flag:** `RESEARCH-viewer-upgrades.md` §0 profiles the 2132-run `full-3d` as
baseline. That baseline predates the 2540 m dataset. Any §5 effort estimate keyed to 2132 runs
should be re-read against 2033/2540.2 before it is quoted as current.

## 2. Static findings per candidate

| File | three | offline | clip planes | Edges | Ortho | provenance | verdict |
|---|---|---|---|---|---|---|---|
| `cob-im2-L4-system-3d.html` | r160 inlined | yes, no CDN refs | yes | yes | yes | **yes** | canonical |
| `cob-im2-L4-full-3d.html` | r160 inlined | yes | yes | yes | yes | yes | superseded (stale data) |
| `cob-im2-L4-complete-3d.html` | r160 inlined | yes | yes | yes | yes | **none found** | demo, not deliverable |
| `cob-im2-catalogo-3d.html` | r160 inlined | yes | yes | yes | yes | **none found** | catalogue, out of scope |
| `COB_Level4_Full_ThreeJS.html` | **r131** | yes | no | no | no | none | legacy, retire |

Self-containment is genuinely good: zero `src="http…"` / `href="http…"` in all five. The WSL2
offline constraint is already met by construction.

## 3. Confirmed defects (verified in source, not inferred)

1. **`RESEARCH-viewer-upgrades.md` §6.1 ortho-resize defect is REAL and present in BOTH candidates.**
   `cob-im2-L4-full-3d.html:54883` and `cob-im2-L4-system-3d.html:55150`:
   ```js
   addEventListener('resize', ()=>{
     camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
     renderer.setSize(innerWidth, innerHeight, false);
   });
   ```
   The render loop calls `renderer.render(scene, activeCam())`. When `activeCam()` returns the
   ortho camera, its frustum is never recomputed — the model stretches on resize. Confirmed.
2. **No geometry merging.** `grep -c "mergeGeometries\|BufferGeometryUtils"` → **0** in both.
   With ~2033 runs this is a per-run draw-call structure. Unquantified here because `probe.mjs`
   cannot run — it is a *hypothesis to measure*, not a finding.
3. **Unconditional `requestAnimationFrame` loop.** Renders every frame regardless of camera or
   scene change. Cheap to fix (render-on-demand), but again: no measurement, so no claim of impact.

## 4. Numbering collision — flagged, not resolved

`RESEARCH-viewer-upgrades.md` §5 uses its **own** P1–P13 *priority* numbering (P1 = stencil caps,
P2 = miter joints, P8 = ortho presets). design3d `PIPELINE.md` uses P0–P8 as a **phase DAG**
(P0 intake … P4 blockout, P5 build-out, P6 final review, P7 delivery, P8 retro). They are unrelated
scales. "Apply §5's P2 as a gated design3d pass" is well-formed only when read as: *a P5 build-out
sub-pass whose content is §5 item P2*. Stated so the two numbering systems are never silently merged.

## 5. The two things that would most improve the viewer

1. **Install the evidence chain, before any visual work.** `npm install` + a Chromium for
   `puppeteer-core`, and add the `window.__qaFraming` hook to the canonical viewer. Until then every
   pass is ungated by construction, and design3d's whole acceptance model is inert. This outranks
   miter joints, section caps, and AO — not because it is more visible, but because without it no
   later claim about them is checkable.
2. **§5 P1, capped section planes (stencil).** Section is the primary reading mode for MEP, and the
   viewer already has clipping planes wired — the caps are the missing half. §5 P2 (miter joints) is
   the better effort/appearance ratio, but it improves how the model *looks*; caps improve what the
   model can be *used for*.

## 6. Provenance discipline note

`system-3d` and `full-3d` carry `w_src`/`h_src`/`bod_src` per run. `complete-3d` and `catalogo-3d`
do not. Any visual upgrade must be applied to a provenance-carrying viewer, or the upgrade produces
geometry that renders convincingly and asserts nothing — the exact failure mode this project's
corpus (`CRITIQUE-b16-roadmap.md` §13) exists to prevent. 38.3% of network length still has an
**assumed** height; that must remain visible in the render, not smoothed away by better shading.
