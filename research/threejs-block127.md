# Block 127 — Junction closure, end-caps & de-gloss propagation for rounded equipment (design3d)

> Verified **design3d improvement pass**: the fixes that carried [Block 126]'s rounded-geometry
> theory into the four `-realista-v1` catalog variants (tanques / filtrado / caldera / compresor)
> and the rounded-equipment showcase. Documents the de-gloss material recipe (the real "chrome
> mirror" fix), a 3-axis AABB gap check that replaces the Y-only `verticalGap`, end-cap and
> flange builders that close the open edges `edgeManifold` only detected, the regression watch
> that catches bbox growth from added caps, and the alternatives evaluated-and-rejected so they
> are not re-litigated. Every claim here was proven THIS session (headless Playwright +
> SwiftShader, kit unit checks, and merged kit PRs).
>
> **Block number:** B127. Range B125–B134 assigned to "core three.js library: numerical methods
> & core math" by **session-A (orchestrator on master) 2026-08-09**. B125 consumed (numerical
> methods), B126 consumed (curved/rounded geometry), B127 consumed here; next free in this range
> is B128.
>
> Sources (this session's own files/measurements, r160 API, deductions):
> `design3d-kit` PR #12 (rebase-merged: `checkGap3D`, `makeEndCap`, `makeFlange`) ·
> the four `disenos/**/*-realista-v1` variants + `showcase-rounded` (edited + headless-verified) ·
> Playwright + SwiftShader QA probes served by `python3 -m http.server` (this session) ·
> `threejs.org/docs/` r160 (LatheGeometry / CylinderGeometry / MeshPhysicalMaterial / Quaternion) ·
> Markers: `[CERT]` local-primary (our own files/measurements this session) ·
> `[CERT-web]` official r160 web/docs or GitHub r160 source · `[INFER]` deduction.
>
> Layer assignment: core Three.js library — geometry & visual quality (design3d kit).
> Connects [Block 125] (framing gate, envMapIntensity, signed-volume/edge-manifold, Quaternion
> setFromUnitVectors), [Block 126] (LatheGeometry open ends, PBR MULTIPLIER packing, round-edge
> normalMap), [Block 3] (PBR materials), [Block 8] (geometry toolkit), [Block 38] (visual QA).

---

## 127.1 — De-gloss is the D1 fix, NOT anisotropy

### The defect and the corrected recipe

The "chrome mirror" look on bare metal was NOT a missing-feature problem — it was an
**over-polished PBR recipe**: `roughnessBase` at **0.28–0.30** combined with
`envMapIntensity` **1.3–1.4** turns stainless into a mirror that reflects the studio
environment as hard specular smears `[CERT]` (measured across the four `-realista-v1`
variants this session). The corrected recipe is:

```
roughnessBase   = 0.50   // was 0.28–0.30
envMapIntensity = 1.0    // was 1.3–1.4
```

The map scalars stay at **1** so the packed roughness/metalness map drives the surface —
the **MULTIPLIER rule** from [Block 126] §126.E: `material.roughness`/`material.metalness`
multiply the sampled map channel, so leaving the scalar at 1 lets the texture be the single
source of truth `[CERT]`. Proven on all four variants: tanques, filtrado, and caldera were
de-glossed to 0.50/1.0; **compresor was already at 0.50/1.0** and served as the reference
baseline the other three were brought to `[CERT]`.

### Anisotropy was evaluated and DEFERRED (not a defect fix)

`MeshPhysicalMaterial.anisotropy` (+ a brushed directional `roughnessMap`) was evaluated as
a candidate and **deferred**: it is a satin **polish** for bare-stainless hero parts, not a
fix for the mirror defect `[CERT — decision]`. Two concrete costs drove the deferral:

- `anisotropy` lives on `MeshPhysicalMaterial`, so adopting it forces a
  `MeshStandardMaterial → MeshPhysicalMaterial` upgrade (heavier shader) across the affected
  parts `[CERT-web]` (threejs.org/docs/#api/en/materials/MeshPhysicalMaterial.anisotropy).
- The anisotropic-highlight render path is **unverified under SwiftShader** headless, so
  adopting it blind risks the same silent-skip class as `RectAreaLight` ([Block 125] §125.E)
  `[INFER]`.

r160 anisotropy API facts, for whenever it IS adopted `[CERT-web]`
(threejs.org/docs/#api/en/materials/MeshPhysicalMaterial):

- `material.anisotropy` is a **MeshPhysicalMaterial** property (not on MeshStandardMaterial).
- `material.anisotropyRotation` default is **1 rad** (not 0) — a non-obvious default that
  rotates the highlight if left unset.
- `material.anisotropyMap`: **RG = direction, B = strength**, and the texture must use
  `NoColorSpace` (it is signed-direction + scalar data, not color).

---

## 127.2 — `checkGap3D`: 3-axis AABB separation (replaces Y-only `verticalGap`)

`verticalGap` ([Block 125] lineage) measured separation on the **Y axis only**, so a junction
that floats horizontally or diagonally passed the gate while looking broken `[CERT]`. The new
pure `gap3D(a, b, eps)` measures true 3D AABB separation:

```
sep_k       = max(0, a.min_k − b.max_k, b.min_k − a.max_k)   for k ∈ {x, y, z}
gap         = ‖(sep_x, sep_y, sep_z)‖                        // Euclidean separation
touching    = gap <= eps
overlapping = strict INTERIOR overlap on EVERY axis          // face-touching is NOT overlap
```

The overlap test is a **strict interior** test on all three axes — two boxes that merely
share a face are *touching*, not *overlapping*, which is the correct semantics for a seated
junction `[CERT]` (contrast `Box3.intersectsBox`, which counts face-touching as intersecting —
[Block 125] §125.B). The async `checkJunction` wraps two meshes, building each AABB with
`Box3().setFromObject(mesh, true)` (precise traversal, [Block 125] §125.B) before calling
`gap3D` `[CERT]`.

Shipped in **design3d-kit PR #12** (rebase-merged) `[CERT]`. It immediately earned its keep:
it measured the **filtrado pump→motor lateral gap at 0.11 m** — a horizontal float the Y-only
gate reported as seated `[CERT]`. **Junction target: `gap <= 0.01 m`.**

---

## 127.3 — `makeEndCap`: annular / disk cap (closes what `edgeManifold` only detected)

`edgeManifold` ([Block 125] §125.B) **detected** open boundary edges (valence-1) but the kit
had **no FIX** — a diagnosis with no remedy `[CERT]`. `makeEndCap` supplies the remedy.

`annularCapData({ innerRadius, outerRadius, segments })` returns cap geometry data:

- `innerRadius === 0` → a **disk fan** (triangles from the center to the rim).
- `innerRadius > 0` → an **annulus ring** (a flat washer between two radii).
- Cap area `= π · (rOuter² − rInner²)`, **positivity-guarded** via `assertPositive` so a
  degenerate `rOuter <= rInner` cannot silently emit a zero/negative-area cap `[CERT]`
  (the [Block-lineage] derived-dimension positivity rule).

The async `makeEndCap` builds the cap in its local `+Z` plane, then orients it to an
arbitrary axis via `Quaternion.setFromUnitVectors(+Z, axis)` ([Block 125] §125.D — the
antiparallel branch is handled by three.js) `[CERT]`. It closed two real open bodies this
session `[CERT]`:

- the **openEnded insulation jacket** on **tanques** (caps added at both rims), and
- the **openEnded skirt** on **caldera**.

Both were open because their bodies are open-profile revolutions/cylinders: `LatheGeometry`
does **not** auto-cap the two ends of an open profile, and `CylinderGeometry`'s `openEnded`
parameter (constructor index 5) defaults `false` but is set true for these shells `[CERT-web]`
(threejs.org/docs/#api/en/geometries/LatheGeometry, .../CylinderGeometry — the openEnded
default and the LatheGeometry open-profile behavior).

---

## 127.4 — `makeFlange`: collar / bead junction boss

Where a pipe meets a shell, the pipe endpoint must sit **ON** the shell surface, not be buried
inside it. `makeFlange` builds the boss that makes that junction read as a real connection:

- `collarProfile` → a **watertight annular band** revolved via `LatheGeometry` (the profile is
  authored entirely in `x > 0` per [Block 126] §126.A so the revolution is non-degenerate)
  `[CERT]`.
- async `makeFlange` with two styles: **`'collar'`** (the revolved band) and **`'bead'`** (a
  `TorusGeometry` weld bead), each oriented along the joint axis `[CERT]`
  (TorusGeometry: threejs.org/docs/#api/en/geometries/TorusGeometry `[CERT-web]`).

Used as a **wall-penetration boss** this session: the **caldera recirculation pipe** endpoint
was at radius **0.53 < shell 0.65** — i.e. **buried 0.12 m inside** the shell. The fix projects
the endpoint radially onto the shell surface (radius → 0.65) and adds the flange boss at the
penetration `[CERT]`.

---

## 127.5 — Regression watch: added caps enlarge the subject bbox

Every geometry edit in §127.3–127.4 **grows the subject's bounding box** (a cap or coupling
adds volume past the old extent). Two gates must therefore be re-run on each variant after any
geometry edit `[CERT]`:

- **`checkFraming`** ([Block 125] §125.A — clip-w guarded bbox→NDC, crop/occupancy) because
  the enlarged bbox can push the subject past the frame or below the occupancy floor.
- **`checkMeshIntegrity`** ([Block 125] §125.B — signed-volume winding) because an annular cap
  built with a flipped ring winding inverts the local volume sign.

**Concrete case this pass:** the `showcase-rounded` framing was **pre-existing RED** —
occupancy **0.193 < the 0.25 floor** ([Block 125] §125.A well-framed heuristic), camera too far.
Fixed by dollying the hero camera **(4.5, 3.2, 6.6) → (3.34, 2.50, 4.90)**, raising occupancy to
**0.370** (inside `[0.25, 0.85]`) `[CERT]`.

### Verified-headless evidence table

Playwright + SwiftShader, served by `python3 -m http.server`, this session `[CERT]`. Draw/tri
counts are rasteriser-independent ([Block 56] validity boundary); all consoles were clean.

| Variant | Junction check | Framing | Draws / triangles |
|---|---|---|---|
| caldera | recirc-pipe→shell **gap 0** | ok | 61 / 19.6k |
| tanques | (caps at both rims) | ok | 32 / 12.3k |
| filtrado | pump→motor & bracket→volute **gaps 0** | ok | 47 / 15.4k |
| compresor | rotor→coupling **~1e-8**, coupling→motor **0** | ok | 50 / 9k |

**QA recipe notes** `[CERT]`:

- Puppeteer/Playwright probes must live **inside the project tree** — the ESM loader ignores
  `NODE_PATH`, so a probe outside the tree cannot resolve the project's `three` import.
- Wrap every probe in **`qa-lock.sh`**: the intermittent chrome failures are CPU **contention**
  across parallel sessions, not flakiness — retrying blindly deepens it ([Block-lineage] QA
  contention rule).

---

## 127.6 — Rejected-with-reason (so they are not re-litigated)

Each of these was considered this pass and **rejected** with a recorded reason `[CERT — decision]`:

- **`three-subdivide` Loop subdivision** ([Block 126] §126.C): adds an **npm dependency**,
  which violates the project's **zero-npm-dep / CDN-importmap** constraint; and its r160
  compatibility is unverified. Rejected.
- **`onBeforeCompile` SDF round-edge shader** ([Block 126] §126.D): **no vetted public r160
  recipe** exists, it carries a SwiftShader **shader-compile stall** risk (same class as
  `RectAreaLight`, [Block 125] §125.E), and the **round-edge-normal `normalMap`** already gives
  cheap soft edges at far lower risk. Rejected.
- **Corner-AO `aoMap`**: requires `geometry.attributes.uv1` plumbing (the 2nd UV set, renamed
  from `uv2` at r152 — [Block 126] §126.E) and **`BoxGeometry` lacks `uv1`**; the subtle gain
  is not worth the plumbing when the **baked contact shadow** already provides corner darkening.
  Rejected.
- **Shell AgX tonemapping + `scene.environmentIntensity` migration**: **ALREADY landed** in the
  `stainless-equipment-shell` template + a kit commit ([Block 125] §125.E confirmed
  `scene.environmentIntensity` is inert in r160; the migration to `material.envMapIntensity` and
  `AgXToneMapping` is done). **Nothing to build.**

---

## 127.7 — What landed (traceability)

- **`checkGap3D` / `gap3D` / `checkJunction`** (§127.2) — design3d-kit **PR #12**, rebase-merged.
- **`makeEndCap` / `annularCapData`** (§127.3) — same PR; closed the tanques jacket + caldera
  skirt open edges.
- **`makeFlange` / `collarProfile`** (§127.4) — same PR; un-buried the caldera recirc pipe.
- **Material de-gloss** (§127.1) — applied to tanques / filtrado / caldera `-realista-v1`
  (compresor already at baseline).
- **Camera dolly** (§127.5) — `showcase-rounded` hero camera moved to fix pre-existing framing RED.

All four variants + showcase re-verified headless (§127.5 table); tree left dirty (no commit).

---

## 127.8 — Pending / gaps

- **Anisotropic satin polish (§127.1)**: deferred, not done. Needs the
  `MeshStandardMaterial → MeshPhysicalMaterial` upgrade and a SwiftShader render verification
  before adoption on bare-stainless heroes.
- **`checkJunction` not yet wired into the catalog gate**: the builder shipped (PR #12) but the
  per-asset gate does not yet call it on every junction; junctions are checked ad hoc this pass.
- **`makeFlange` bead style unexercised**: only the `'collar'` style was used this pass; the
  `'bead'` (TorusGeometry weld) path shipped but has no in-catalog consumer yet.
</content>
</invoke>
