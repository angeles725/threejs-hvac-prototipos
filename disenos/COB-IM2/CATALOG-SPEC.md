# COB duct & pipe catalog — spec + build/judge plan

Goal: a reusable, parametric **duct and pipe** component catalog for three.js, usable across COB.
Foundation already exists: `disenos/COB-IM2/lib/hvac-catalog.js` (428 lines, port-based mating
contract, `ringRect`/`ringRound`, `IN()` helper). This spec says what to add, grounded in what
COB-IM2 actually contains, and who builds and judges it.

## Grounding — what the COB-IM2 L4 drawings actually carry (measured)

All three L4 sheets are **HVAC-duct only** — layers `HVAC - Ductos` / `M-HVAC-DUCT`. **There is no
piping/plumbing layer.** So:

- **Duct catalog = grounded in COB data.** Real families present:
  - **Rectangular: 46 distinct WxH sizes** (in): most common `8x8` (87), `12x8` (55), `10x8` (54),
    `14x12` (39), `10x10` (31) … up to `60x20`, `44x44`, `40x20`, `30x18`. Full set = @121's WU.
  - **Round: 5 diameters** — `6"` (435, dominant), `10"`, `8"`, `12"`, `4"`.
  - **Fittings** (from the extractor): elbow 684 · tee 217 · transition 188 · cross 68.
  - **Dampers**: BD / FD / SD / MD callouts.
  - **Terminals / diffusers**: SD 257 · LD 164 (linear diffuser) · RR 86 · CD 45.
- **Pipe catalog = NOT in these drawings.** No pipe data exists in COB-IM2 L4. The pipe side must be
  built from **standard sizes/schedules** (steel NPS + schedule, copper type L, PVC), parametric and
  reusable — NOT extracted from COB. If plumbing/process sheets exist elsewhere, route them to @121
  and we extract; until then, pipes are standard-catalog, and every pipe component is labelled
  `provenance: standard-catalog` (never `[CERT]`), so nobody mistakes a standard elbow for a
  COB-measured one.

## The component contract (already in hvac-catalog.js — keep it)

Every generator returns `{ geometry, ports, meta }`. A **port** is the mating contract:
`{ id, p:[x,y,z], dir:[x,y,z], shape:'rect'|'round', w,h | d }`, `dir` pointing OUT, two components
mate when `portA.dir = -portB.dir` and sections agree. Canonical frame: +X flow, +Y up (height along
Y), origin at inlet face. Units metres; `IN(n)` for inches. **Every component records `provenance`
(`cob-measured` for duct families present in the drawings, `standard-catalog` for pipes/derived) and
its source size.**

## Catalog scope to build

**Ducts (cob-measured):** rectangular section (any WxH), round section (any Ø), elbow (rect + round,
parametric radius/angle), tee, cross, transition (rect→rect, rect→round), reducer, damper block,
end cap, and the terminal/diffuser families (SD/LD/RR/CD) as parametric blocks.
**Pipes (standard-catalog):** straight pipe (NPS + schedule OD/wall), 90°/45° elbow, tee, reducer,
flange, cap. Diameters from standard tables, not COB.

## Build & judge plan

### Who builds
- **@121 — inventory extraction (data WU).** Emit the definitive duct family list from the 3 L4 DXFs:
  the full distinct WxH set with counts, the round-Ø set, fitting counts, damper + terminal families,
  co-registered to `L4-full.json`'s frame (use `L4-LABELS-ALL-CERTFRAME.json`). One JSON:
  `catalog/cob-l4-duct-inventory.json`. This is the "what sizes are real" ground truth the 3D
  generators enumerate against.
- **@12 — 3D parametric generators (build WU, via `/design3d`).** Extend `hvac-catalog.js` with the
  components above, each gated through the design3d P0–P8 ladder. One asset at a time, gate each
  before the next (design3d Hard Rule 4). Ports must mate; provenance must be recorded.

### Who judges — the four-coordinator panel (this is request 2)
`/design3d` builds 3D through a **pass-locked gated pipeline**: `blockout → structural → materials →
surface → lighting → interaction → optimization → final`, each pass **captured** and **blind-reviewed**,
advancing only when the gate PASSES (max 2 correction retries, then STOP with evidence). The user's
directive: **@orquestador, @investigador, @orquestador1, @investigador1 are the judges.** So for each
catalog component:
1. @12 produces a pass capture (per design3d GATES.md — headless harness, deterministic `--cam`).
2. The four of us score it independently (PASS/FAIL + one-line reason), **blind where practical**
   (design3d's blind-review protocol; escalate to a 2/3 panel when a pass BOUNCES across attempts).
3. Advance only on panel PASS. A component isn't catalogued until it clears final.
Judging rubric per component: (a) ports mate and sections agree, (b) dimensions match the declared
size to the imperial ladder, (c) provenance recorded correctly, (d) renders legibly (technical, no
cinematic post — AO only), (e) no console/geometry errors in the capture.

## Honest limitations to carry
- Pipes are standard-catalog, not COB-measured — labelled as such.
- Terminal/diffuser geometry is representative, not a manufacturer part — `provenance: standard`.
- This catalog is component geometry; it does not assert the L4 network's height/Z (that gap is a
  documented drawing-completeness floor — see `~/investigacion/COB-IM2/tools/l4/HEIGHT-Z-GROUND-TRUTH.md`).

## Proven process to reuse — from `disenos/nave-panccadia/equipos/` (already did this)

nave-panccadia built an equipment catalog the same shape we need. Adopt its working method verbatim
where it fits; these are battle-tested with retros behind them.

1. **Folder-as-contract, PNG-as-thumbnail.** Each component is a folder `catalog/<slug>/` holding
   `<slug>.html` (self-contained viewer), `design-spec.yaml` (the contract), and
   `runs/{<slug>.png, <slug>.console.json, <slug>.review.json, progress.yaml}`. The gate-capture PNG
   IS the catalog thumbnail — one artifact, two jobs. (`nave-panccadia/equipos/catalogo.html:81-97`)
2. **Static data-driven catalog, no build step.** `catalogo.html` hardcodes a `GROUPS` array
   (`{title, items:[{slug,name,dim}]}`) grouped by family (for us: rectangular / round / elbow / tee
   / cross / transition / reducer / damper / terminal / pipe) and renders one card per item linking
   `<slug>/<slug>.html`. Reusable almost verbatim.
3. **Declare `gate_passes:` per asset** (their #1 confirmed lesson). A simple pipe/duct section needs
   only `[materials]`; a fitting `[structural, materials]`. Forcing the full 8-pass ladder makes the
   gate un-passable for a flat catalog and tempts a checker-bypass. (`equipos/runs/2026-08-07-retro.md`)
4. **DesignSpec is the single contract**: `complexity` (8 axes → tier), `critical_features` with
   numeric `threshold`s, `references[]` with `[CERT]` provenance markers, `dimensions_real` as
   `{value, confidence}`, `perf_budget {draws, tris}` MEASURED not guessed, and — critical for a
   duct/pipe catalog — the `hierarchy.attachment` **socket schema** (`parent_socket`,
   `local_start/end`, `contact_type`, `embed_depth`, `overlap`, `gap_tolerance`) for how connectors
   mate. It subsumes the port contract. **Framing (accurate):** those fields are *furniture-proven*
   in nave-panccadia (foot-cup / leg-tube specs), NOT HVAC-proven. They transfer on their OWN MERITS
   — `embed_depth` prevents a fitting double-count (the class of the 1157-fitting error), and a
   validator enforces the physics — not on precedent. 121 adopted it with HVAC contact types
   (`contact_type: flange` per ASME B16.5 / `socket-weld` per B16.11 / `duct` per SMACNA TDC-TDF),
   and `embed_depth` carries a `CERT-unavailable` marker since no drawing gives it. Do not cite it as
   "proven for HVAC"; it is adopted-on-merits with HVAC-specific types.
5. **Objective anchors, not reviewer coin-flips.** The materials gate is reviewer-variance-dominated
   (±0.25 on pixel-identical renders). Put a `colorTarget {srgb, deltaE00Max, crop}` + `invariant_tests`
   (assert via `console.error`, never `console.assert`) in the spec — a SCRIPT judges the dimension/
   colour, the model judges only identity. (`equipos-v2/runs/benchmark-note.md`)
6. **Capture every articulated state; derive cameras.** A real defect showed only in a second
   (articulated) capture; hardcoded cameras lie. Use `fitView(subject, az, el)` + framing-probe.
7. **Reusable material recipes apply directly** — but split the provenance. SMACNA/ASME specify
   **gauge, coating, and dimensions** `[STANDARD]`; they say NOTHING about PBR shading, so the
   `metalness 0.9 / roughness 0.30` numbers are `[LOOK]`, backed by no standard. Never write
   "metalness per SMACNA" — that invents a citation (same error class as a legend stating a length
   its geometry contradicts). So: material MEANING (galvanised steel, 26-ga, G90 coating) `[STANDARD]`;
   shading numbers `[LOOK]`. The recipes: `brushed-stainless-recipe` (env intensity 2.15 +
   HemisphereLight + frontal fill + roughness 0.30) for galvanised-steel ducts, `transmission-free-glass`
   (MeshStandard opacity ~0.4, NOT MeshPhysical.transmission — stalls SwiftShader) for clear/PVC pipe.
   r160 gotcha: `material.envMapIntensity`, NOT `scene.environmentIntensity` (added r163; a no-op in r160).
8. **Retro + operator-amendments, propose-never-apply.** Each spec keeps an `operator_amendments`
   block (asked→done+measurement); each run writes `runs/<date>-retro.md` that STAGES lessons, never
   silently mutates the kit. Kit A/B tests go in an isolated sibling folder so shipped assets stay
   frozen (`equipos-v2/`).
