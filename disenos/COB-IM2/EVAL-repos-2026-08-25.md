# Repo evaluation — 8 candidates against the COB-IM2 pipeline

Requested by session *Revision* on the user's list, with special focus on **img2threejs**
("how does its process work"). Evaluated against our actual constraints: vectorised-PDF DWG →
2D CAD extraction → three.js, level-4 HVAC, self-contained offline single-file HTML, client
deliverable.

Every licence below was read from the upstream `LICENSE` file or the GitHub API, not from a
README badge — after getting two licences wrong earlier today by trusting weaker sources.

---

## Verdict table

| # | Repo | Licence (verified) | Applies to us? | Verdict |
|---|---|---|---|---|
| 1 | [hoainho/img2threejs](https://github.com/hoainho/img2threejs) | **Apache-2.0** | Its *method* does not; its *tooling* already adopted | **Already pulled — and the rest is the wrong track.** See §1 |
| 2 | [BuildingGeneratorThreeJS](https://github.com/achrefelouafi/BuildingGeneratorThreeJS) | **MIT** | No — generates buildings from a Blender node graph, not from 2D | Skip. One idea worth stealing (§3) |
| 3 | [BasicProceduralBuilding](https://github.com/achrefelouafi/BasicProceduralBuilding) | **MIT** | No — same family | Skip; its `postfx.ts` is a trap (§3) |
| 4 | [PoleGeneratorThreeJS](https://github.com/achrefelouafi/PoleGeneratorThreeJS) | **MIT** | No | **Skip — it is not a library.** See §4 |
| 5 | [GeometryPainterThreeJS](https://github.com/achrefelouafi/GeometryPainterThreeJS) | **MIT** | Marginal | Skip the product, note one technique (§3) |
| 6 | [facebookresearch/ShapeR](https://github.com/facebookresearch/ShapeR) | **CC BY-NC 4.0** | — | **HARD STOP — NonCommercial.** See §2 |
| 7 | [bbdaii/three-pivot-controls](https://github.com/bbdaii/three-pivot-controls) | **MIT** | **Yes** | **The one genuine pull.** See §5 |
| 8 | [lightningpixel/modly](https://github.com/lightningpixel/modly) | **MIT** | No — Electron desktop app, needs a GPU | Skip (§6) |

Net: of eight candidates, **one** is worth vendoring, one is legally disqualifying, and the
priority item turns out to be something we already adopted a year of architecture from.

---

## 1. img2threejs — how the process actually works, and why it is the wrong track for CAD

**Licence: Apache-2.0** (permissive, patent grant, requires NOTICE retention). 13.8k stars,
**Python**, actively pushed.

### 1.1 The process

Input is **a single reference image**. Output is a TypeScript factory plus a JSON
`ObjectSculptSpec`. Between them sits a *staged sculpting pipeline*, quoting the README:

> "A staged sculpting pipeline turns the reference image into a spec, then generates and
> vision-reviews one build pass at a time — `blockout → structural → form → material →
> surface → lighting → interaction → optimization`"

Each stage is gated on a visual review: the tool renders the current model, packages a
side-by-side comparison sheet against the reference, and loops until the gate passes. Its
own framing of the division of labour is *"Scripts enforce, the model judges"* — roughly 90
Python modules under `forge/` handle validation, spec authoring, PBR extraction, comparison
packaging and pipeline state; the judging is done by a vision model.

Two properties worth being precise about, because they are commonly misread:

- **It is procedural generation, not reconstruction.** No photogrammetry, no mesh extraction,
  no depth estimation, no neural mesh model. It builds from primitives and procedural
  geometry until the render *looks like* the photo.
- **No GPU and no ML models are required** for the Python side — it is standard library. The
  intelligence is the agent driving it.

### 1.2 We already have it — the architecture, not just the snippet

Revision noted that design3d v1.10 adopted its CIEDE2000 colour metric
(`forge/_shared/color_metrics.py`, Apache-2.0). That undersells the overlap. Compare the
gate ladders:

```
img2threejs   blockout -> structural -> form -> material -> surface -> lighting     -> interaction    -> optimization
design3d      blockout -> structural ->      materials    -> surface -> lighting-camera -> interaction-ui -> optimization -> p6-final
```

(`~/.claude/skills/design3d/assets/gate-state.mjs:11-12`)

**Seven of eight stage names are the same.** design3d is already a port of this
architecture — staged passes, per-pass vision review, gate state machine, self-correcting
loop. There is no second adoption to make. The remaining delta is small and specific: the
`ObjectSculptSpec` JSON shape, and the comparison-sheet packaging, if we ever want a tighter
reference-vs-render artefact than the current review flow.

### 1.3 Why its method must not touch the CAD track

This is the part that matters, and it is a negative result.

img2threejs infers geometry from **appearance**. Our input is not a photo of an object — it
is 28 831 measured polylines carrying real coordinates, widths and BOD elevations, where our
entire value proposition is *provenance* (`w_src` / `h_src` / `bod_src`, measured vs
assumed). An appearance-matching loop would **invent** geometry that renders convincingly and
carries no provenance at all.

The project's own skill already ruled on this. design3d's CAD→3D intake ranking
(SKILL.md v1.17) puts CV-on-raster at **Route 2, "last resort, all [INFER]"**, because it
*"invents scale/elevation/semantics/co-registration"*. Running img2threejs's method on our
plans is precisely Route 2 with extra steps. It is also the exact failure mode measured
earlier today with FloorPP-Net: methods that consume appearance or depth cannot ingest a
vectorised PDF that has neither, and dressing that up as a pipeline does not create the
missing information.

**Verdict:** keep the CIEDE2000 adoption. Keep the ladder we already ported. Do not point its
image→geometry method at the drawings. It is an excellent tool for *sculpting an object from
a photograph* — which is a different project from *extracting a measured duct network from a
plan*.

---

## 2. ShapeR — hard stop, and this one is not a judgement call

**Licence: Creative Commons Attribution-NonCommercial 4.0 International.**

The GitHub API returns `NOASSERTION`, which is why a badge-level check would miss it. The
`LICENSE` file opens:

```
Attribution-NonCommercial 4.0 International
```

**NonCommercial disqualifies it outright for a client deliverable.** No amount of technical
fit changes that, so I did not evaluate the technique. Do not vendor it, do not adapt its
code, do not port its algorithm into our tooling. If someone wants the capability, the
conversation is with Meta about licensing, not with the repo.

Method note: `NOASSERTION` from the GitHub API is not "no licence" — it means GitHub's
detector did not match a standard template. It is a signal to **read the file**, and in this
case the file was disqualifying. `modly` returned the same `NOASSERTION` and turned out to
be plain MIT. Always open it.

---

## 3. The achrefelouafi family (2, 3, 5) — MIT, competent, and aimed elsewhere

All three are MIT and cleanly licensed. None does 2D→3D.

- **BuildingGeneratorThreeJS** (325★) is a reverse-engineered port of a Blender
  geometry-nodes graph (592 nodes) into a TypeScript placement algorithm, driving ~190
  pre-modelled parts from **one instanced GLB plus a JSON manifest**, with seeded RNG. It
  does not take a footprint and extrude it — the parameters are sliders, not geometry.
- **BasicProceduralBuilding** (25★) is the same pattern on a smaller graph, notable for
  claiming instance-for-instance verification against Blender's evaluated depsgraph.
- **GeometryPainterThreeJS** (69★) paints procedural geometry onto a sphere with shader
  displacement and WebGPU.

**Two things worth taking, neither of them code:**

1. **The kit pattern** — one instanced GLB + a JSON manifest + a placement algorithm. That is
   exactly the right shape for our *fittings* if we ever model elbows/tees/transitions as
   real geometry: author the fitting family once, instance it by transform. It validates the
   `forNode`/`mateMatrix` catalog approach already in the roadmap.
2. **BVH-accelerated surface picking** — GeometryPainter uses it for hit-testing. Independent
   confirmation of the `three-mesh-bvh` recommendation, though our own measurement still says
   profile before adopting.

**One thing to actively avoid:** BasicProceduralBuilding's `postfx.ts` cinematic stack —
bloom, vignette, animated grain, chromatic aberration. It is well built and it is *wrong for
us*. Every one of those effects destroys the legibility of a technical drawing. An engineer
reading duct clearances needs contrast and crisp edges, not film grain. The one
post-processing effect that helps a dense MEP scene is ambient occlusion, which we already
have queued as P3.

---

## 4. PoleGeneratorThreeJS — not a library

5★, MIT, but its README is an unmodified **Google AI Studio scaffold**:

> "Run and deploy your AI Studio app … Set the `GEMINI_API_KEY` in `.env.local` to your
> Gemini API key"

It is a generated app template requiring an API key, not a reusable generator. There is
nothing here to evaluate for cable/catenary routing or profile-along-path sweeping. If we
want swept profiles along a directrix, our own miter-joint work (RESEARCH §2.2) is further
along than this.

---

## 5. three-pivot-controls — the one genuine pull

**MIT.** Vanilla three.js, framework-free, explicitly *not* React-Three-Fiber (inspired by
drei's `PivotControls`, reimplemented without React). Peer dependency `three >= 0.150.0`, so
**our r160 satisfies it**. Pointer Events, so mouse and touch. Translate arrows, rotate rings
and scale handles render simultaneously in concentric rings rather than behind a mode switch.

**Why it fits our roadmap specifically:** two queued features need a 3D drag handle and we
have none.

- **P1 section planes.** Today the clip plane is driven by an HTML range slider. A pivot
  handle on the plane itself is how every serious MEP viewer does it, and it is what makes
  X/Z section planes usable at all — a slider per axis does not scale.
- **P5 measurement.** Placing and nudging measurement anchors in 3D.

**Cost, stated honestly:** TypeScript, built with Vite, ESM. Same treatment as everything
else — one offline `esbuild --format=iife` pass, then inline. Small surface, so this is the
cheapest of the bundling jobs on the list.

---

## 6. modly — inapplicable on three independent grounds

**MIT** (GitHub said `NOASSERTION`; the `LICENSE` file is plain MIT, © 2026 Lightning Pixel).
7.2k stars.

It is an **Electron desktop application** — TypeScript/Tailwind front end, Python/FastAPI
back end — that converts images to 3D meshes with local AI models (Hunyuan3D, TripoSG,
Trellis2) **running on your GPU**.

Three disqualifiers, any one sufficient: it is an application rather than a library; it needs
a GPU, and this machine is WSL2 without one; and its output is an inferred mesh from an
image, which is the same [INFER] route as §1.3 with no provenance. Nothing to pull.

---

## 7. What to actually do

1. **Vendor `three-pivot-controls`** (MIT, esbuild→IIFE) when P1 section planes land. It is
   the only item on this list that reaches our code.
2. **Keep img2threejs where it is** — CIEDE2000 in design3d, and the ladder we already
   ported. Do not extend it to the CAD track.
3. **Record ShapeR as licence-blocked** in the corpus so nobody re-evaluates it. CC BY-NC is
   permanent for our purposes.
4. **Steal the kit pattern** (instanced GLB + JSON manifest + placement algorithm) as
   validation for the fitting catalog, if fittings ever get real geometry.
5. **Do not add a cinematic post stack.** AO yes, bloom/grain/vignette no.

Nothing on this list changes the conclusions of `CRITIQUE-b16-roadmap.md`. In particular,
nothing here addresses the ~37% quantity undercount (§8) or the connectivity result (§7),
which remain the two findings that actually gate the deliverable. This list is viewer polish
and adjacent tooling; the open problems are in the extractor.

---

## Licence verification log

| Repo | GitHub API | LICENSE file | Used |
|---|---|---|---|
| hoainho/img2threejs | `Apache-2.0` | — | Apache-2.0 |
| achrefelouafi/BuildingGeneratorThreeJS | `MIT` | — | MIT |
| achrefelouafi/BasicProceduralBuilding | `MIT` | — | MIT |
| achrefelouafi/PoleGeneratorThreeJS | `MIT` | — | MIT |
| achrefelouafi/GeometryPainterThreeJS | `MIT` | — | MIT |
| facebookresearch/ShapeR | **`NOASSERTION`** | **CC BY-NC 4.0** | **CC BY-NC 4.0 — blocked** |
| bbdaii/three-pivot-controls | `MIT` | — | MIT |
| lightningpixel/modly | **`NOASSERTION`** | **MIT** | MIT |

The two `NOASSERTION` rows are the argument for the rule: the API's answer is a prompt to
open the file, and the file said opposite things in the two cases.

*The X/Twitter posts (chirovisuals, sharkydev001, monokern, DilumSanjaya) were not evaluated —
no repo, no licence, no code to assess. If any of them points at a repo, send the link and I
will run it through the same check.*
