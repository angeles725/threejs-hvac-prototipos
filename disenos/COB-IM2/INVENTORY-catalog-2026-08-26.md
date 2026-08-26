# Duct + pipe catalog — P0 inventory before any building

Date: 2026-08-26 · design3d Step 0 (check-before-building) · No geometry authored.

Three briefs arrived for this task (Orquestador, Orquestador1, investigador1). Two of them say
"don't build from scratch"; none of the three lists everything that already exists. This is that
list, measured.

## What exists

| # | Artifact | What it is | Parametric? | Gated? |
|---|---|---|---|---|
| 1 | `disenos/COB-IM2/lib/hvac-catalog.js` (428 lines) | **13 parametric duct generators** with a real port contract | **yes** | **no** |
| 2 | `disenos/COB-IM2/cob-im2-catalogo-3d.html` | gallery rendering those generators | — | no (no `__qaFraming`, no provenance fields) |
| 3 | `disenos/ducteria/` | **8-piece duct catalog**, voxel + realistic PBR | no — fixed sizes | ready in `library/INDEX.md` |
| 4 | `disenos/tuberia-hidraulica/` | **13-piece pipe catalog**, voxel + realistic PBR | no — **fixed Ø4"** | ready in `library/INDEX.md` |
| 5 | `disenos/catalog/` | 106 **equipment** assets (chillers, AHUs, pumps, VAV…) | n/a | done per `catalog.yaml` |

### 1 — `lib/hvac-catalog.js`, the parametric layer

`straightRect · straightRound · elbowRect · elbowRound · teeRect · transitionRect ·
transitionRectRound · capRect · vavBox · diffuser · flexConnector · damperRect · pipeRound`

plus `mateMatrix`, `portsCompatible`, `forNode`, and a documented port contract
(`{id, p, dir, shape, w/h|d}`, `dir` points out, mate when `portA.dir = -portB.dir`). Canonical
frame `+X` flow / `+Y` up / origin at the inlet face; metres; `IN(n)` helper.

This is the thing the briefs describe building. It is already built.

### 4 — the pipe catalog Orquestador called "the actual GAP"

`disenos/tuberia-hidraulica/…-realistic-v1.html` — *"CATALOGO TUBERIA HIDRAULICA · 13 piezas ·
Ø4in base"*:

> TRAMO BRIDADO Ø4" · CODO 90° BRIDADO · TEE BRIDADA · REDUCCION CONCENTRICA · VALVULA COMPUERTA ·
> VALVULA MARIPOSA · VALVULA CHECK · COLADOR TIPO Y · JUNTA FLEXIBLE · MANOMETRO · TERMOMETRO ·
> SOPORTE TRAPECIO · TRAMO AISLADO Ø4"

That covers straight, elbow, tee, reducer, flange, and **three** valve types — the whole requested
pipe list except union/coupling and hanger (the trapeze support is the hanger). The gap is not
*existence*. It is that every piece is **hard-coded at Ø4"**.

`library/INDEX.md` also carries `pipe-run` (waypoint piping), `rmf-frames` (twist-free tube frames)
and `lathe-body` (revolution bodies — flanges).

## The real gaps

1. **Nothing parametric is gated.** `lib/hvac-catalog.js` has no `design-spec.yaml`, no gate
   evidence, no manifest. Gating it is the single highest-value item and it authors no new geometry.
2. **Fixed-size → size-driven.** Both showcase catalogs are one-size. Making the Ø4" pipe family
   NPS-driven, and the 8 duct pieces ladder-driven, is the actual pipe-side work.
3. **`cross` is aliased to `teeRect`** (`forNode`, line ~420). The certified data has **68 crosses**;
   every one renders as a tee. A real defect, not a missing feature.
4. **Missing terminal types.** `diffuser` is generic; the data distinguishes **SD 249 · LD 152 ·
   CD 42 · RR 86**. `vavBox` exists; equipment is **VAV ×90 only** — there is no FCU or AHU in the
   L4 data, so building those is speculative for this project.
5. **No JSON manifest** per component (family, params, provenance, gate evidence).

## Contract mismatch worth deciding before we build

`catalog.yaml` binds one slug → one `<slug>.html` + `design-spec.yaml` + a `colorTarget` for the
ΔE00 gate. A **parametric family spanning a size ladder is not that shape** — an elbow family is
one generator over N sizes, not N assets. Either the family registers as a single slug whose
evidence set spans representative sizes, or `catalog.yaml` grows a family type. Decide before
authoring, not after.

## Corrections to the briefs

**Orquestador1's fitting counts are the superseded dataset.** The brief says *"elbow 611,
transition 219, tee 276, cross 70"*. Measured from certified `L4-full.json` @ a29d14d:

| | brief (stale) | certified |
|---|---|---|
| elbow | 611 | **684** |
| tee | 276 | **217** |
| transition | 219 | **188** |
| cross | 70 | **68** |

Those are the 2132-run figures from the superseded `full-3d` dataset — the same stale baseline
flagged this morning in `GRADING-viewers-2026-08-26.md`.

**investigador1's size list is partly wrong** — and so was my first correction of it, in two ways.
Both are recorded here rather than edited away.

> **Correction 1 (my denominator).** The counts below are over the **420 size-LABELED rect runs**,
> not the 1591 rect runs this section originally claimed. 1591 is the rect population; only 420
> carry a size label. I stated the wrong denominator in the same document where I proposed the rule
> about always naming it.
>
> **Correction 2 (my phrasing).** I wrote that `34x20` and `30x18` "do not appear in the top set".
> They are present — 4 runs each, ranks 17 and 16 of 35 distinct sizes, just under the 14-row cutoff
> I showed without naming. investigador1 verified them with run ids (`L4_0857/0858/0869/0896` and
> `L4_1489/1689/1914/1936`), and `28x20` likewise at rank 18. A reader could reasonably have taken
> my sentence to mean absent, and a judge working from it could fail a correctly-built 30x18.
>
> **Authoritative ladder: 35 distinct rect sizes over 420 size-labeled rect runs**, from
> `L4-full.json` sha `7533dccb…` (= commit `a29d14d`). Verified independently here.

Top of that ladder by count:

| label | n | | label | n |
|---|---|---|---|---|
| 8"x8" | 74 | | 24"x4" | 9 |
| 12"x8" | 57 | | 24"x24" | 9 |
| 10"x8" | 50 | | 14"x14" | 8 |
| 14"x12" | 50 | | 14"x10" | 8 |
| 12"x10" | 29 | | 24"x10" | 6 |
| 10"x10" | 28 | | 60"x20" | **5** |
| 12"x12" | 24 | | | |
| 16"x14" | 11 | | | |

`60"x20"` is 5 runs at rank 14 — real, but not a top size. `24"x4"` (9) and `14"x14"` (8) rank
above it and are missing from the brief. `34x20`, `30x18` and `28x20` sit at ranks 16–18 with 4 runs
each.

**And the round family is effectively one size.** 442 round runs: **6"Ø ×433**, then 10"Ø ×4,
4"Ø ×2, 8"Ø ×2, 12"Ø ×1. Building a five-size round family serves nine runs.

## Recommended order

1. Gate `lib/hvac-catalog.js` as-is (spec + evidence + manifest). No new geometry.
2. Fix `cross` — 68 runs currently rendering as the wrong fitting.
3. Make the Ø4" pipe family NPS-driven.
4. Terminal types SD/LD/CD/RR, by measured count.
5. Everything else only if COB actually contains it.

---

## Addendum — measured gate readiness of the three catalogs

Written after the table above, because "exists" and "usable as a gated component" turned out to be
very different states.

| | offline | three.js | `design-spec.yaml` | `__qaFraming` | `__cam` (Hard Rule 9) |
|---|---|---|---|---|---|
| `tuberia-hidraulica/…-realistic-v1.html` | **no — unpkg CDN** | not inlined | **none** | no | **no** |
| `ducteria/…-realistic-v1.html` | **no — unpkg CDN** | not inlined | **none** | no | **no** |
| `COB-IM2/cob-im2-catalogo-3d.html` | yes | inlined r160 | **none** | no | yes |

Both catalogs that `library/INDEX.md` lists as `ready` inject an importmap pointing at
`https://unpkg.com/three@0.160.0`. They do not open without internet, and their capture would carry
network failures in the console sidecar — a mechanical FAIL before any judge sees them. The brief's
"offline/self-contained" requirement is not a new constraint on them; it is an existing violation.

None of the three has a `design-spec.yaml`. **They were never gated through design3d** — `ready` in
`library/INDEX.md` marks a usable pointer, not a gate result. Neither showcase exposes `__cam`, so
Hard Rule 9 (deterministic scripted viewpoint) cannot be satisfied for either without editing them.

`cob-im2-catalogo-3d.html`'s apparent external URLs are comment links inside the inlined three.js
source (`en.wikipedia.org/wiki/Smoothstep`, `geomalgorithms.com`) — not fetches. It is genuinely
self-contained.

### What this changes

The pipe-side work is now three things, in order, and only the third is modelling:

1. **Inline three.js** in both showcases, or rebuild them on the self-contained pattern
   `cob-im2-catalogo-3d.html` already uses. Without this nothing can pass a mechanical check.
2. **Add `__cam` + `__qaFraming`**, then author the `design-spec.yaml` each one never had.
3. **Then** make the Ø4" family NPS-driven.

Their dimensional evidence is also thin: the only numeric trace in the pipe file is `4.5` — correct
as the ASME B36.10M outside diameter for NPS 4, but unsourced in the file. P1 has to supply the
ladder with a citation before P2 can declare `dimensions_real`.
