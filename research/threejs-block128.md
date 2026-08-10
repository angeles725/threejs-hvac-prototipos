# Block 128 — Community-validated techniques for realistic equipment (three.js forum survey)

> A **forum/community research survey** (discourse.threejs.org + three.js docs/GitHub) run to
> VALIDATE and EXTEND the design3d kit against what the wider three.js community actually does.
> Confirms that our swept-tube end-cap fix ([Block 127] §127.3) is the community's most-robust
> method, corroborates the de-gloss material recipe ([Block 127] §127.1), and harvests a ranked
> ADOPT shortlist plus an explicit map of where design3d is ORIGINAL (has no forum precedent).
> Everything here is external-source evidence: no local render or measurement was produced this
> pass — the point is to cross-check our own conclusions against the community and mark the gaps.
>
> **Block number:** B128. Range B125–B134 assigned to "core three.js library: numerical methods
> & core math" by **session-A (orchestrator on master) 2026-08-09**. B125 consumed (numerical
> methods), B126 consumed (curved/rounded geometry), B127 consumed (junction closure / end-caps
> / de-gloss), B128 consumed here; next free in this range is B129. (Confirmed against
> `research/BLOCK-REGISTRY.md` next-free = B128 before this write.)
>
> Sources (community forum threads, official docs, three.js GitHub, secondary blogs):
> `discourse.threejs.org` threads (enumerated in §128.6) ·
> `threejs.org/docs/` r160 + `github.com/mrdoob/three.js` (release history, source, issues) ·
> prisoner849 / Mugen87 / donmccurdy maintainer + power-user posts + jsfiddles ·
> Markers: `[CERT-web]` official docs or three.js/GitHub source ·
> `[CERT-a]` forum thread / blog / 3rd-party repo (community secondary) · `[INFER]` deduction.
>
> Layer assignment: core Three.js library — geometry & visual quality (design3d kit).
> Connects [Block 127] (end-cap / de-gloss / makeFlange — the theory this survey validates),
> [Block 126] (LatheGeometry / RoundedBoxGeometry / matcap / PBR packing), [Block 125] (winding,
> envMapIntensity, RectAreaLight/SwiftShader risk), [Block 51] (curves / TubeGeometry),
> [Block 24] (matcap, baked AO), [Block 11] (BatchedMesh), [Block 20] (discourse as a source).

---

## 128.1 — Swept-tube end-cap fix — VALIDATED by the community

Our `makeSweptTube` `capEnds` fix ([Block 127] §127.3 lineage; the kit's swept-tube path) builds
each cap as a **fan from a single center vertex that REUSES the tube's own end-ring vertices**,
wound outward. This survey confirms that method **IS the community's most-robust technique** — it
is the same construction prisoner849 recommends as raw `BufferGeometry` `[CERT-a]`
(discourse.threejs.org/t/end-caps-of-tubegeometry/9655 , jsfiddle.net/prisoner849/6jp3snvq).

### Why the fan-from-shared-ring beats a placed CircleGeometry

Placing a separate `CircleGeometry` disk at each tube end is the naive fix, but its rim vertices
are **generated independently** of the tube's end ring — at any curvature or radius mismatch the
disk and tube edge do not share vertices, leaving a hairline **seam gap** `[CERT-a]` (same thread;
this is the failure mode prisoner849's fan avoids by reusing the existing ring). Our fix reuses
the ring, so the cap is watertight by construction `[INFER — from the shared-vertex property]`.

### TubeGeometry cannot cap natively

Maintainer **Mugen87** confirms `TubeGeometry` cannot cap its ends natively — the `closed`
parameter only **loops the PATH back on itself** (a torus-like closed sweep), it does NOT put a
flat lid on an open-ended tube `[CERT-a]` (discourse.threejs.org/t/end-caps-of-tubegeometry/9655).
So a cap must always be added by the consumer; there is no constructor flag for it.

### Winding is load-bearing; normals are shading-only

Maintainer **donmccurdy** (discourse.threejs.org/t/.../63784/2, winding-vs-normals) states the
governing rule `[CERT-a]`: **triangle WINDING order decides face culling**, while vertex
**normals are used only for shading** — the two are independent. Consequence for our fix: the
cap's winding is **load-bearing** (a back-wound cap gets culled and the tube end reads as an open
hole), so the kit's cap test asserts the cap's **geometric normal direction** (winding-derived),
not merely that a normal attribute exists `[INFER — application of donmccurdy's rule to our test]`.
This is the same principle as [Block 127] §127.3's signed-orientation cap check and [Block 125]'s
signed-volume winding gate.

### DoubleSide VERDICT: unnecessary with correct caps, and it carries costs

With correct outward-wound caps, `THREE.DoubleSide` is **UNNECESSARY** — it is the workaround for
NOT capping, not a fix `[INFER + CERT-a]`. It carries real costs, so the kit does not reach for it:

- **Shadow artifacts** — DoubleSide interacts badly with shadow biasing (three.js issue **#8692**)
  `[CERT-a]` (github.com/mrdoob/three.js/issues/8692).
- **~2× fragment cost** — both faces are shaded (community perf discussion, issue **#28535**)
  `[CERT-a]`.
- **Adreno GPU bugs** — DoubleSide has driver-specific breakage on Adreno mobile GPUs
  `[CERT-a]` (recurring forum reports).

DoubleSide is **legit only for a camera-inside-the-pipe / interior view**, where the back faces
must genuinely be seen. For solid equipment shown from outside, cap the ends and stay single-sided
`[INFER]`. Cross-ref [Block 127] §127.3 (the fix this validates) and [Block 125] §125.B (winding).

---

## 128.2 — Metal & lighting (validates the de-gloss recipe)

This section corroborates the [Block 127] §127.1 de-gloss recipe against community practice and
harvests the metal/lighting techniques the forum keeps recommending.

- **Native `anisotropy` + `anisotropyRotation`** on `MeshPhysicalMaterial` is the community answer
  for **brushed steel** — native since **r153**, present in r160 `[CERT-web]`
  (threejs.org/docs/#api/en/materials/MeshPhysicalMaterial); forum recipe at
  discourse.threejs.org/t/how-to-apply-brushed-metal-anisotropy-.../32945 `[CERT-a]`. This matches
  [Block 127] §127.1's DEFERRED anisotropy candidate: still needs a **SwiftShader smoke-test**
  before kit adoption (the anisotropic-highlight path is unverified headless, same silent-skip
  risk class as `RectAreaLight`, [Block 125] §125.E) `[INFER]`.

- **Matcaps (`MeshMatcapMaterial`)** = lights/env-free metal that renders **IDENTICALLY headless
  under SwiftShader** because the shade is a pure **UV lookup into the matcap sphere texture** by
  view-space normal, with **no light or environment dependency** `[CERT-web/INFER]`
  (threejs.org/docs; discourse.threejs.org/t/why-matcaps-look-so-good/90664 `[CERT-a]`). This is a
  strong **QA-stable fallback** for the metal look (cross-ref [Block 126] §126.D, [Block 24]).
  A **double-matcap** blend (base + overlay) adds specular pop — prisoner849
  (discourse.threejs.org/t/.../65190) `[CERT-a]`.

- **`metalness=1` with no env map = pure BLACK.** A fully-metallic surface reflects only the
  environment; with no IBL there is nothing to reflect, so it renders black `[CERT-web/INFER]`
  (recurring forum advice). The fix is **`RoomEnvironment` + `PMREMGenerator`** for a synthetic
  studio IBL, driven **per-material via `envMapIntensity`** — NOT `scene.environmentIntensity`,
  which is **r163+ and INERT in r160** ([Block 125] §125.E, [Block 127] §127.6 confirm this)
  `[CERT-web]`.

- **Roughness bands for industrial metal: 0.35–0.6** general, with polished stainless **~0.3**,
  painted steel **~0.5**, cast iron **~0.7** `[CERT-a — community consensus]`. This brackets our
  corrected `roughnessBase ~0.50` de-gloss recipe ([Block 127] §127.1) — the community range
  independently lands where we did.

- **`AgXToneMapping` (base variant)** is recommended over `ACESFilmicToneMapping` for
  **product/industrial** renders (AgX has a gentler, less-saturated highlight rolloff). **AgX was
  added in r160**; **`AgXPunchyToneMapping` is r161** and is therefore **NOT available at r160**
  `[CERT-web]` (three.js release history; discourse.threejs.org/t/.../60609 `[CERT-a]`). Tone
  mapping is a **zero-GPU-cost** post step. Cross-ref [Block 125] §125.E ([Block 6] tone-map menu).

---

## 128.3 — Geometry: rounding, ducts, cutaway, perf

- **Round-edged box via `ExtrudeGeometry`** using `Shape.absarc` for the corner arcs + bevel —
  prisoner849 (jsfiddle 303kdmnd) `[CERT-a]`. This is the "real geometry" rounding path parallel
  to [Block 126] §126.B RoundedBoxGeometry.

- **Zero-triangle vertex-shader rounded box via `onBeforeCompile`** — a box whose corners are
  rounded entirely in the **vertex shader** with a dynamic radius uniform, adding **no triangles**
  (discourse.threejs.org/t/.../8066) `[CERT-a]`. Being uniform-driven and geometry-free, it is
  **instancing-friendly** (all instances share one geometry, radius varies by uniform) `[INFER]`.
  NOTE: this is a **vertex-shader** displacement, distinct from [Block 126] §126.D's *fragment*
  onBeforeCompile SDF normal hack (which had no vetted r160 recipe) — this one moves vertices, so
  it is a different, lower-risk technique.

- **`ProfiledContourGeometry` (hofk, MIT, zero-dependency)** sweeps an **arbitrary 2D profile**
  (square/rectangular duct, I-beam, hex bar) along a **3D path** `[CERT-a]`
  (discourse.threejs.org/t/.../5801). This **fills the rectangular-HVAC-duct gap** that
  `TubeGeometry` structurally cannot cover — TubeGeometry sweeps only a **circle** ([Block 51],
  [Block 126] §126.F). For square/rectangular ducting, ProfiledContourGeometry is the answer.

- **Stencil cutaway capping** for interior reveal: a **two-pass back/front stencil** + a cap plane
  drawn where the stencil marks the cut, with `renderer.localClippingEnabled` for the clip planes
  (discourse.threejs.org/t/.../74018) `[CERT-a]`. The **stencil buffer defaults `true`** on the
  r160 `WebGLRenderer` (it becomes `false` at **r163+**) `[CERT-web]`, so r160 supports this
  out of the box. **Medium SwiftShader risk** — the stencil path is unverified headless; verify
  with a `stencil: true` renderer before kit adoption `[INFER]`.

- **`CatmullRomCurve3` at low tension (0.02–0.05)** for smooth **implicit pipe elbows**, with more
  `tubularSegments` on tightly-curved runs `[CERT-a]` (community routing advice). Consistent with
  [Block 126] §126.F / [Block 51] centripetal-default guidance.

- **Perf hierarchy** `[CERT-web/CERT-a]`:
  - **`BatchedMesh` (r153+)** = **one draw call for HETEROGENEOUS geometries that share a
    material** — it beats `InstancedMesh` (which requires **identical** geometry) and beats
    `mergeGeometries` (which **loses per-part color** identity) for mixed-part assemblies
    ([Block 11] §11.3, [Block 2]). Community writeup: codrops + discourse t/28776 `[CERT-a]`.
  - **`InstancedMesh`** for **repeated identical parts** (bolts, fins, studs) — one draw call for
    N copies of one geometry.
  - **`BufferGeometryUtils.mergeGeometries`** is the **r160 API name**; `mergeBufferGeometries`
    was **removed** `[CERT-web]` (r160 addons; [Block 2], [Block 10] migration ledger).

---

## 128.4 — ADOPT shortlist (ranked, GPU cost · SwiftShader risk · kit-role)

The six techniques worth pulling into design3d, ranked by return, each mapped to a concrete
design3d goal `[INFER — synthesis of §128.2–128.3 against the kit]`:

| # | Technique | GPU cost | SwiftShader risk | Kit role | design3d goal |
|---|---|---|---|---|---|
| 1 | Native `anisotropy` (+`anisotropyRotation`) | low (Physical shader) | **unverified — smoke-test FIRST** | **recipe** | metal (brushed stainless hero) |
| 2 | `AgXToneMapping` base | **zero** | none (post step) | **renderer recipe** | lighting (product/industrial look) |
| 3 | `BatchedMesh` (r153+) | low (fewer draws) | low (count-only, [Block 56]) | **assembly builder** | perf (mixed-part assemblies) |
| 4 | Stencil cutaway (2-pass + cap plane) | medium | **medium — verify `stencil:true`** | **builder + recipe** | cutaway (interior reveal) |
| 5 | Vertex-shader rounded box (`onBeforeCompile`) | **zero-tri** | medium (shader path) | **builder** | rounding (instancing-friendly) |
| 6 | `ProfiledContourGeometry` (ducts) | low | low (plain BufferGeometry) | **builder** | pipes/vessels (rectangular ducts) |

Each row maps to exactly one design3d goal axis (metal / lighting / perf / cutaway / rounding /
pipes) so the shortlist covers the kit's improvement fronts without overlap.

---

## 128.5 — Where design3d is ORIGINAL (forum gaps)

The survey found the forum has **NO good published answer** for the following — these are
design3d's **innovation frontier**, where the kit is ahead of the community `[INFER — negative
search result across the surveyed threads]`:

- **Automatic pipe-elbow radius generation** — the forum hand-tunes control points; no procedural
  elbow-radius solver was found.
- **Procedural flanges / weld-seam bosses** — we ship **`makeFlange`** (collar/bead, [Block 127]
  §127.4); the forum has no equivalent generator.
- **Zero-dependency CSG for nozzle-into-shell penetration** — the community reaches for
  three-bvh-csg (npm dep, [Block 46]); we need a zero-dep path for the vessel-penetration case.
- **Per-part color on stencil cutaway caps** — the §128.3 stencil recipe caps with a single plane
  color; keeping **per-part** color on the cut face is unsolved in the threads.
- **Industrial procedural normal maps** (rivets, bolt heads, weld ripple) — no procedural
  industrial-detail normal generator was found (cross-ref [Block 126] §126.D round-edge normalMap,
  [Block 9] CanvasTexture).
- **Superquadric / squircle geometry** — our superquadric builders ([Block 125]) have **no forum
  precedent** for equipment use.

These gaps justify continuing to build in the kit rather than importing a community solution.

---

## 128.6 — Primary sources

Forum threads and issues used in this survey (discourse.threejs.org unless noted) `[CERT-a]`,
official docs/source `[CERT-web]`:

| Topic | Thread / URL |
|---|---|
| End-caps of TubeGeometry (the fan fix) | discourse.threejs.org/t/end-caps-of-tubegeometry/**9655** (+ jsfiddle prisoner849 6jp3snvq) |
| Brushed-metal anisotropy | discourse …/how-to-apply-brushed-metal-anisotropy-…/**32945** |
| Why matcaps look so good | discourse …/why-matcaps-look-so-good/**90664** |
| Double-matcap blend (prisoner849) | discourse …/**65190** |
| RoomEnvironment / PMREM IBL | discourse …/**47017** |
| AgX tone mapping | discourse …/**60609** |
| Round-edged box (ExtrudeGeometry absarc) | discourse …/**1402** (+ jsfiddle 303kdmnd) |
| Vertex-shader rounded box (onBeforeCompile) | discourse …/**8066** |
| ProfiledContourGeometry (hofk) | discourse …/**5801** |
| Stencil cutaway capping | discourse …/**74018** |
| Winding vs normals (donmccurdy) | discourse …/**63784**/2 |
| BatchedMesh (codrops + discourse) | codrops writeup + discourse …/**28776** |
| DoubleSide shadow artifacts | github.com/mrdoob/three.js/issues/**8692** |
| DoubleSide fragment perf | github.com/mrdoob/three.js/issues/**28535** |
| Making realistic (general) | discourse …/**88207** |

---

## 128.7 — Pending / gaps (feeds the next pass)

- **Anisotropy SwiftShader smoke-test not run** (§128.2/§128.4 #1): the brushed-metal path must be
  rendered headless before kit adoption — same DEFERRED status as [Block 127] §127.1.
- **Stencil cutaway not verified headless** (§128.3/§128.4 #4): needs a `stencil: true` renderer
  smoke-test under SwiftShader before the cutaway builder ships.
- **No local measurement this pass**: this block is a survey; every ADOPT-row claim needs a
  local render/measurement to graduate from `[CERT-a]` (community) to `[CERT]` (proven in-tree).
- **The §128.5 originality gaps are unbuilt**: procedural elbow-radius, zero-dep nozzle CSG,
  per-part cutaway color, and industrial detail normal maps remain design3d frontier work.
