# Block 40 — THREE.LOD applied & measured: the hotel building far-shell (before/after)

> **What**: Applies `THREE.LOD` to the assembled hotel scene's heaviest *singleton* — the PBR
> tower — as a two-level LOD (near = full furnished tower, far = lightweight opaque shell), and
> **measures the before/after draw/triangle cost with a live browser probe**. Turns the *theory*
> of [Block 17] §17.1 (LOD as an optimization) into a *measured* result on a real prototype, and
> surfaces the honest finding that the building is **not** this scene's triangle bottleneck.
> **Scope**: `THREE.LOD` auto-update contract (r160); the singleton-vs-instanced applicability
> rule; the far-shell construction technique (omit interior, swap `transmission` glass for opaque);
> and the measured Δ draws/tris. NOT a scene-wide LOD (equipment LOD is left as a new gap).
> **Sources**:
> - `hotel-realista-ensamblado.html` (r0.160.0 prototype) — the LOD site `:300-347` and the
>   `buildEdificio(detail)` refactor `:5344-5345, :5402-5404, :5514-5515` `[CERT]`.
> - `sources/probes/2026-07-06-lod-edificio-B40.txt` — Puppeteer/SwiftShader GL-hook probe, HI vs
>   LO + the assemble per-equipment breakdown `[CERT-hw]` / `[CERT]`.
> - `sources/web-snapshots/2026-07-06-lod-autoupdate-context7.md` — context7 `/mrdoob/three.js`
>   (LOD.autoUpdate, migration r105→r106, `webgl_lod.html`) `[CERT-web]`.
> **Method + markers**: `[CERT-hw]` live browser probe · `[CERT]` prototype source file:line ·
> `[CERT-web]` official docs via context7 (snapshotted) · `[INFER]` deduction. Block type:
> **APPLIED + EVIDENCE** (an applied optimization validated by measurement).

---

## 40.1 — `THREE.LOD` auto-update: no manual call in the loop `[CERT-web]`

`THREE.LOD` is a container with N levels, each a full `Object3D`; per frame it shows exactly one,
picked by camera distance to the LOD's world origin.

| Fact | Value | Source |
|---|---|---|
| `LOD.autoUpdate` default | `true` | context7 LOD.html `[CERT-web]` |
| Who calls `lod.update(camera)` when `autoUpdate=true` | `WebGLRenderer`, every frame | migration r105→r106 `[CERT-web]` |
| Since | **r106** (this prototype: r160) | migration guide `[CERT-web]` |
| `addLevel(object, distance)` | distance `0` = nearest / most-detailed | `webgl_lod.html` `[CERT-web]` |
| To force a level (measurement) | set `autoUpdate=false`, toggle each level's `.visible` | `[INFER]` from the update contract |

Consequence in the prototype: the render loop is **untouched** — `renderer.render(scene, camera)`
runs `edLOD.update(camera)` internally (`hotel-realista-ensamblado.html:344` `[CERT]`, comment
records this). No `lod.update` appears anywhere in the loop; the switch is automatic by distance.

## 40.2 — Applicability: LOD fits singletons, NOT dispersed InstancedMesh `[CERT]` / `[INFER]`

`THREE.LOD` measures distance to **one** world origin. This is the load-bearing design rule for
this scene, whose objects have two natures:

- **Singletons** (the building, each unique equipment) — one object, one origin → `THREE.LOD` fits
  natively. The building was chosen as the LOD subject for exactly this reason. `[INFER]`
- **Dispersed `InstancedMesh`** (chillers ×4 at z=4.1…25.1, pumps ×6, the 88 room bays) — one draw
  covers copies scattered across space, with `frustumCulled=false`. A single LOD origin cannot give
  each copy its own level, so `THREE.LOD` does **not** apply; instanced LOD must be manual (dual
  hi/lo `InstancedMesh` toggled by distance-to-cluster). `[INFER]` (grounded in the assemble
  contract, [Block 2] + `hotel-realista-ensamblado.html:216-227` `[CERT]`)

## 40.3 — Far-shell construction: omit interior, kill the transmission pass `[CERT]`

`buildEdificio(detail='hi')` takes a detail flag; `const hi = detail === 'hi'` gates the near-only
content (`:5344-5345` `[CERT]`). The LOD wires two builds:

```
const edHi = buildEdificio('hi');   // near: full furnished tower
const edLo = buildEdificio('lo');   // far : lightweight shell
const edLOD = new THREE.LOD();
edLOD.addLevel(edHi, 0);            // :304
edLOD.addLevel(edLo, EDIF_LOD_DIST); // :305  EDIF_LOD_DIST = 95 m (:300)
```
(`hotel-realista-ensamblado.html:300-305` `[CERT]`)

What `'lo'` drops or cheapens (each an `if (hi)` guard or a conditional material):

| Element | HI | LO | Rationale |
|---|---|---|---|
| 88 furnished rooms (`roomsGroup`) | full (beds, TV, VAV, ducts…) | **omitted** | interior, invisible at distance — largest interior block (`:5514-5515` `[CERT]`) |
| Facade / lobby / side glass | `MeshPhysicalMaterial transmission` | **opaque `GLASS_LO`** | `transmission` forces an extra backbuffer pass; `facadeGlass = hi ? M.GLASS : GLASS_LO` (`:5402-5404` `[CERT]`) |
| Pool + rooftop water | `transmission` | opaque `WATER_LO` | same fillrate reason `[CERT]` |
| Mullions, balcony rails, handrails, palm fronds, corridor emissive | present | omitted | fine detail imperceptible far `[CERT]` |
| Mass, podium, roof, porte-cochère, window silhouette, palm trunks | present | **kept** | the building's identity at distance `[INFER]` |

A demo affordance: key **`L`** cycles `auto → HI → LO` (`edLodMode`, `:312-323` `[CERT]`), setting
`autoUpdate=false` and toggling `.visible` to freeze a level for capture; the HUD `#lodN` echoes it.

## 40.4 — Measured before/after `[CERT-hw]`

Probe: Puppeteer + Chrome/SwiftShader, GL-hook draw-counter (the [Block 26] §26.2 recipe), median
of the last ~180 frames. Camera at (46,27,48), building centre (55,0,3) → dist ~53 m < 95 m, so
`auto` resolves to HI; `L`×2 forces LO. Level confirmed live by the HUD.

| Level (HUD) | Draws | Triangles |
|---|---|---|
| **HI** (`HI · auto`) | 692 | 921,744 |
| **LO** (`LO · lo`) | 656 | 854,424 |
| **Δ building HI→LO** | **−36 (−5.2%)** | **−67,320 (−7.3%)** |

`[CERT-hw]` `sources/probes/2026-07-06-lod-edificio-B40.txt`. HI (692 / 921,744) matches the known
baseline (commit 1eb2525: 687 / 920,380) → the LOD refactor did **not** regress the scene.

**Why the global saving is modest — the building is not the bottleneck.** The assemble
`console.log` breakdown `[CERT]` (same probe file):

| Group | Draws (geo) | Triangles (geo, color pass) |
|---|---|---|
| Chillers ×4 | 24 | 142,688 |
| Pumps ×6 | 29 | 131,028 |
| Tower ×1 | 41 | 39,946 |
| Other equipment ×7 | ~212 | ~106,930 |
| **All equipment** | **306 (+2 floor/grid)** | **420,592** |

Chillers + pumps alone = **273,716 tris (65% of equipment)**. The equipment — dispersed
`InstancedMesh`, not the building — dominates the tri budget, so switching the *building* to a shell
moves only −7.3% of the scene. `[INFER]` The initial `[INFER]` "the building is heaviest (transmission
+ 88 rooms)" is **corrected** by this `[CERT-hw]` measurement: it is heaviest *per unit* but a small
share of the whole.

**Honest limitation.** Draws/tris do **not** capture the `transmission` **fillrate** cost (the extra
backbuffer render-target) that LO removes; real GPU-time saving may exceed −7.3%, but was not measured
— under SwiftShader (software) fps is not representative of a real GPU. `[INFER]`

## 40.5 — Connections

- **[Block 17] §17.1** — LOD/BVH/culling optimization *theory* (context7). B40 is its *applied +
  measured* counterpart on a real prototype; confirms the auto-update contract in practice.
- **[Block 26]** — DYNAMIC baseline; B40 reuses its GL-hook probe recipe (§26.2) and its
  `[CERT-hw]` methodology for the before/after.
- **[Block 11] §11.x** — performance / `renderer.info` / instancing; B40's finding that instanced
  equipment dominates the budget extends B11's draw-call model with a concrete tri breakdown.
- **[Block 2]** — InstancedMesh contract; grounds §40.2's rule that dispersed instancing is
  incompatible with a single-origin `THREE.LOD`.
- **Uncovered gap → G41**: the high-return LOD target is the *equipment* (chillers+pumps = 65% of
  equipment tris), via dual hi/lo `InstancedMesh` or geometry decimation — not the building.
