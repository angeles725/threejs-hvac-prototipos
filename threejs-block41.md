# Block 41 — Voxel→Realistic parity gap + living-environment build (relief, animated sea, biomes)

> **What**: Establishes the feature-parity gap between the voxel-art beach hotel
> (`voxel/hotel-playa-hvac-voxel.html`) and the realistic assembled hotel
> (`hotel-realista-ensamblado.html`), then **applies** the first parity/immersion iteration to the
> realistic scene: procedural terrain relief with per-vertex biome colors (grass/yard/sand/wet-sand),
> a GPU wave-displaced sea (`onBeforeCompile`), and a gradient sky background — replacing the flat
> "infinite plane" ground + static flat sea. Optimization-first: the terrain stays 1 draw call, the
> sea waves run 100% on the GPU (0 CPU cost), the sky is `scene.background` (no geometry).
> **Scope**: the parity inventory (what voxel has that realistic lacked); vertex-color + procedural
> displacement on a single `PlaneGeometry`; `MeshStandardMaterial.onBeforeCompile` wave injection
> with analytic normals; `scene.background` gradient. NOT the remaining iterations (vegetation,
> per-floor temperature, zone isolation, flow particles) — those are queued below.
> **Sources**:
> - `voxel/hotel-playa-hvac-voxel.html` (r0.160.0 voxel prototype) — environment `:196-219, :3211-3305`,
>   beach relief `beachH()` `:3215-3233`, lawns `:2781-2788`, palms `palm()` `:2846-2860`, per-unit
>   ON/OFF state machine + control panel `:4188-4197, HTML :61-102`, zone isolation `:4494-4527`,
>   sprite labels `:3444-3481` `[CERT]`.
> - `hotel-realista-ensamblado.html` (r0.160.0 realistic prototype) — new environment block
>   `:198-312` (terrain, sea shader, sky), loop wave hook `:~703`, raycast filter `:~700` `[CERT]`.
> - `threejs-block31.md` (Terrain/relief, G31) — heightmap displacement theory this applies `[CERT-doc]`.
> **Method + markers**: `[CERT]` prototype source file:line · `[CERT-doc]` prior research block ·
> `[INFER]` deduction. Block type: **PARITY MAP + APPLIED** (build-phase iteration, §19).
> **Verification note**: syntax validated (`node --check` on the extracted module — PASS). Visual QA
> is DEFERRED to real hardware: the WSL/headless environment cannot create a WebGL context
> (`llvmpipe`/ANGLE `BindToCurrentSequence failed`), so no `[CERT-hw]` screenshot exists yet. `[INFER]`

---

## 41.1 — Parity inventory: what the voxel scene has that realistic lacked `[CERT]`

Both scenes model the same resort (8-floor tower, full CHW/condenser HVAC plant, pool). The voxel
scene is the mature reference ("handled for a long time"); the realistic scene is the PBR second
pass. Gap, verified by reading both files:

| Feature | Voxel | Realistic (before B41) | Parity action |
|---|---|---|---|
| Terrain relief | beach dunes via `beachH()` sin-noise `:3215-3233` | flat `PlaneGeometry(320,320)`, 0 relief | **B41.3 done** — procedural displacement |
| Grass / lawns | 7 lawn patches `:2781-2788` | none | **B41.3 done** — biome vertex color |
| Beach / sand biomes | SAND/SAND_D/SAND_W bands | single sand-colored plane | **B41.3 done** — vertex color by z |
| Sea | flat plane, static `:208-219` | flat plane, static `:227-231` | **B41.4 done** — GPU wave shader |
| Sky | canvas gradient texture `:134-148` | flat background color | **B41.5 done** — `scene.background` gradient |
| Paths / boardwalk | malecón + beach paths `:3211-3213, :3302` | none | queued G43 |
| Beach/pool furniture | loungers, umbrellas, palapas, jacuzzi `:2790-2843, :3236-3305` | minimal | queued G43 |
| Vegetation | palms only (12) `:2846-2860, :3236` | palms only (9) `:6098` | queued G43 (bushes + beach grass) |
| Per-unit ON/OFF panel | full `state{}` + HTML panel `:4188-4197` | systems/anim/corte toggles only | queued G44 |
| Zone isolation (AISLAR) | isolate-by-zone `:4494-4527` | click-to-zoom only | queued G44 |
| Sprite scene labels | "MAR CARIBE"/"PLAYA"/"MALECON" `:3444-3481` | baked nameplates only | queued G44 |
| Detail panel on select | name/zone/state `:4438-4560` | camera fly only | queued G44 |
| **Per-floor temperature** | **absent** | **absent** | queued G45 (NEW — neither has it) |
| Flow particles in pipes | stripped in transplant (`:1516` comment) | none | queued G44 |

**Realistic already exceeds voxel** on: 88 furnished rooms (voxel = schematic hints), two-level
`THREE.LOD` (B40), instanced equipment LOD (G41), PBR materials + IBL. So parity is *additive* to
the realistic scene, not a rebuild. `[CERT]`

## 41.2 — Optimization budget for the environment `[INFER]`

The scene baseline is ~687 draws / 920,380 tris (B40 commit). Every parity addition is constrained
to preserve desktop viability:

- **Terrain**: one `Mesh`, 1 draw call. 200×200 segments = 80,802 tris. Biome color is a
  `color` `BufferAttribute` (no extra draw, no texture fetch). `[CERT]`
- **Sea**: displacement + normals in the vertex shader → GPU-side, **0 CPU cost per frame**; the CPU
  only writes one float uniform (`uTime`). Light mesh: 96×56 = 10,752 tris. `[CERT]`
- **Sky**: `scene.background = CanvasTexture` → screen-space, no geometry, no depth/clip cost. `[CERT]`

## 41.3 — Terrain relief + biomes on ONE plane `[CERT]`

Rejected the flat plane. Built a segmented `PlaneGeometry(320,320,200,200)` and, per vertex:
1. Map local→world: the plane is rotated `-π/2` about X, so local `+Z` → world `+Y` (height) and
   local `+Y` → world `-Z`. World coords: `wx = localX + PLANT.cx`, `wz = -localY + PLANT.cz`.
2. Displace `pos.setZ(i, terrainH(wx,wz))`. `terrainH` = 4-octave value-noise `fbm` masked to **0
   inside the built rectangle** `BUILT{x0:2,x1:84,z0:-10,z1:40}` (smooth 10 m falloff) so no equipment
   floats; plus a beach dune band (z 38→SHORE_Z) that flattens to 0 at the waterline.
3. Color `pos → terrainColor`: wet-sand (z≥46), sand (z≥37), yard concrete (built rect), else grass
   with per-vertex `_vnoise` variation. Written into a `color` attribute; material
   `MeshStandardMaterial({vertexColors:true})`. `computeVertexNormals()` after displacement so
   lighting follows the relief. `[CERT]`

**Load-bearing rule** `[INFER]`: displacement MUST be zero under the built footprint. Equipment sits
at `y=0`; undulating the ground beneath it would break the "everything rests on the floor" invariant
(Fase 1 convention). The `BUILT` mask enforces this — relief appears only on the periphery, gardens,
and beach, which is exactly where the eye reads "coast", not "infinite plane".

## 41.4 — GPU sea: `onBeforeCompile` wave displacement + analytic normal `[CERT]`

`MeshStandardMaterial.onBeforeCompile` injects a wave into the stock PBR shader (keeps IBL/tonemap):
- A `uTime` uniform is wired to a JS-side `seaUniforms` object (shared reference) so the loop updates
  one float: `seaUniforms.uTime.value = now * 0.0011`.
- In `<beginnormal_vertex>`: compute `ph` = sum of 3 sines of `position.x`/`position.y`, and the
  analytic gradient `dhx`,`dhy` → `objectNormal = normalize(vec3(-dhx,-dhy,1))`. This makes the water
  *respond to light and IBL reflection* as it moves (a height-only displacement would look dead).
- In `<begin_vertex>`: `transformed.z += ph`.

A near animated patch (waves) sits in front of the beach; a large flat `seaFar` at `y=-0.5` fills the
horizon (its far edge is clipped by `camera.far=500` where fog `95→340` has already dissolved it —
edge-less). The near patch base `y=0.05` stays above `seaFar` even in wave troughs (amp ≈ ±0.34), so
the static plane never pokes through. `[CERT]` / `[INFER]`

## 41.5 — Sky as `scene.background` (rejected the dome) `[CERT]`

Considered a `SphereGeometry` sky dome (like the voxel canvas-sky) but rejected it: a dome inside
`camera.far=500` with fog and `OrbitControls.maxDistance=130` risks far-plane clipping and depth /
render-order conflicts with the horizon sea — untestable here without WebGL. Instead a vertical
gradient `CanvasTexture` is assigned to `scene.background`: screen-space, unaffected by fog, no
clipping, cheapest possible. A sun-disc `Sprite` (`fog:false`) is placed along the sun-light
direction at `sun.position × 4` (magnitude ~307 < far) so it never clips. `[CERT]`

## 41.6 — Iteration roadmap (the client-satisfaction loop) `[INFER]`

Driven as a build loop, each iteration syntax-checked + committed + rebuilt to `publish/` (obfuscated):

- **It.1 (G42)**: relief + biomes + animated sea + sky. **DONE + DEPLOYED** (commit 365a43e).
- **It.2 (G43)**: vegetation (14 palms + 36 bushes + 40 dune-grass tufts), boardwalk + garden path,
  beach furniture (10 lounger+umbrella clusters + 3 palapas) — all instanced/merged, +12 draws.
  **DONE + DEPLOYED.**
- **It.3 (G45)**: per-floor average temperature — simulated per-floor °C (setpoint + height gradient
  + 1 Hz live oscillation), #temps HUD panel + 8 floating color-coded sprite labels, +8 draws.
  NEW capability (neither voxel nor realistic had it). **DONE + DEPLOYED.**
- **It.4 (G44)**: voxel-parity interactions — scene wayfinding labels (MAR CARIBE/PLAYA/MALECON/CASA
  DE MAQUINAS/HOTEL, +5 draws) **DONE + DEPLOYED**; pipe/duct correctness audit vs voxel + any fixes
  and flow cues **in progress**.

**Deploy cadence**: each iteration is `node build-publish.mjs` (obfuscated) → `wrangler pages deploy
publish --project-name=hotel-energia --branch=main`. Production live at hotel-energia.pages.dev /
hotel.angeles-group.org. No git remote on this repo → commits are local only.

Loop exit criterion (client lens): the realistic scene reads unmistakably as a beachfront resort
(relief + coast + vegetation + life), carries every functional affordance the voxel scene had, and
holds desktop-viable draw/triangle counts. `[INFER]`
