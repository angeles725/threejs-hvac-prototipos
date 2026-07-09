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
hotel.angeles-group.org. No git remote on this repo → commits are local only. NOTE: the `cfut_`
Cloudflare token is short-lived and expired mid-session (API error 10000) — deploys pause until a
fresh token is supplied; committed work is unaffected and redeploys once the token is refreshed.

## 41.7 — Follow-up round (client feedback): biome polish, pool-room, room selection `[CERT]`

Client feedback after the first 4 iterations drove a second round (gaps G46-G48):
- **Biome was "muy feo"** → rebuilt `terrainColor`/`terrainH` (`:240-270`): adopts the voxel's proven
  palette (GRASS 0x66a851, SAND 0xd4c49a / SAND_D 0xc4b285, WET 0xb0997a) with `smoothstep`
  blends replacing hard z-band cutoffs; two-scale grass variation; streaky sand; a sin-crest beach
  dune that flattens at both the lawn (z=37) and the waterline (z=SHORE_Z). Displacement softened.
- **Floating-equipment bug** → `BUILT` became a multi-rectangle union (`:229-238`): the pool machine
  gear (filtrado x106.8, heater x109.8) was OUTSIDE the single flat rect (x1=84) since It.1, so the
  relief lifted it. Rect 2 {x100-116, z26-46} flattens that pad.
- **Pool machine-room ("cuarto de maquinas de alberca")** → added an open shelter (posts + back wall
  + roof, `:~313`) around the pool gear, restoring the voxel pool-hut. Audited the "you removed it"
  claim: git shows all 6 prior commits were ADDITIVE — it was never enclosed in the realistic build,
  only in the voxel; so this ADDS parity rather than restoring a deletion. `[CERT]`

## 41.8 — Verification constraint: NO WebGL in this environment (methodology) `[CERT-hw]`

**Confirmed repeatedly** (2026-07-06): this WSL/headless environment cannot create a WebGL context.
The chrome-devtools MCP browser fails at renderer init — `THREE.WebGLRenderer: A WebGL context could
not be created ... GL_RENDERER = ANGLE (Mesa, llvmpipe) ... BindToCurrentSequence failed`. A direct
probe (`canvas.getContext('webgl2')||'webgl'`) returns **false**; consequently the module's `<script>`
throws at `new THREE.WebGLRenderer(...)` and `window.__hotel` / `window.__roomClick` are never defined
(only the static DOM — `#roomPanel`, `#focusBadge` — exists). No system Chrome/SwiftShader binary is
installed for a puppeteer fallback either. So **screenshots, renderer.info draw/tri probes, and any
visual/interaction QA are impossible here** — there is no `[CERT-hw]` visual evidence for any 3D change
in RUN 8.

**Verification methodology actually used** (the ceiling of confidence available):
1. `node --check` on the extracted `<script type="module">` body — a real JS syntax gate (catches the
   brace/paren/label errors that are the main risk of large edits).
2. Static reasoning about Three.js API correctness + declaration/scope order (grep the definitions).
3. Deploy-byte verification: `curl ...?cb=<nonce>` vs `wc -c publish/...` to confirm production serves
   the new build (cache-buster needed even after switching to `no-cache`).
Visual sign-off is explicitly delegated to the user's real (GPU) browser at hotel.angeles-group.org.
Selection/camera bugs (e.g. the equipment panel "no salía") were diagnosed by code inspection +
robustness fixes (generous decoupled hitboxes, show-before-paint), NOT by observing the failure.

## 41.9 — Selection system: rooms → all equipment, camera focus, per-type predictive `[CERT]`

- Unified `selectUnit(id)` dispatches `roomData`→`selectRoom` / `equipData`→`selectEquip`; both share the
  raycaster, `roomOutline`, `#roomPanel`, and `deselectRoom`. 88 room + 18 equipment opacity-0 hitboxes.
- Equipment panel per-type 3rd metric (PRESIÓN/VIBRACIÓN/APROXIMACIÓN/NIVEL/ΔP), AMPERAJE, and a
  predictive diagnosis; SETPOINT tile hidden where meaningless.
- On select: `flyTo` frames the unit (dist ∝ size); a `#focusBadge` "VISTA ENFOCADA · <name> · Salir"
  + teal edge `#focusVignette` signal the focused state; Salir → `deselectRoom` + `goView('general')`.
- Panel anchored LEFT-center (`left:14px; top:50%`) so it doesn't block the view.
- Fixes this round: `#roomPanel` removed from the `.clean` hide list (was invisible inside the
  dashboard iframe `?clean=1`); equipment HITBOX decoupled from OUTLINE and made generous (exact-size
  boxes were only center-clickable); show-before-paint + try/catch so the panel always appears; `#temps`
  moved down (the enlarged legend overlapped it).

### Queued (G47/G48, needs the reference-dashboard pattern + hitbox architecture)
- **Room selection** (client ask): click a guest room → highlight it (outline/emissive) → data panel
  with **temperature, amperage (A), humidity (%RH)**. Blocker: rooms are one merged InstancedMesh
  (`roomsGroup`, `:6294+`) with no per-room identity → needs an invisible per-room hitbox grid +
  an `instanceId`→(floor,room) map. Reference UX: `cliente/Tridium/datacenter-c3ntro` and
  `dashboards-versiones/5-combinado.html` (under exploration).
- **Predictive/diagnostic framing** (client ask): a "mantenimiento PREDICTIVO antes que correctivo"
  panel/health read on the dashboard + per-room diagnosis (trend/anomaly/health score).

Loop exit criterion (client lens): the realistic scene reads unmistakably as a beachfront resort
(relief + coast + vegetation + life), carries every functional affordance the voxel scene had, and
holds desktop-viable draw/triangle counts. `[INFER]`
