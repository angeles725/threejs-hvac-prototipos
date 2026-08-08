# Block 54 — GPU-budget rendering for the Three.js equipment visor: the levers that cut GPU cost without losing quality

> DOCUMENT-mode capture (METHODOLOGY §20) of a finding produced this session, on the SAME "better
> Three.js **design tools / toolchain**" axis as [Block 52]/[Block 53]. It answers "what actually cuts
> GPU cost in the CLIENT-facing equipment visor, ranked by savings × applicability ÷ implementation cost —
> and what looks like an optimization but does NOT apply to our scenes?" This is a **scoping** block: it
> separates the levers with real payoff for room-scale, close-inspected equipment from the ones (LOD,
> aggressive instancing, dynamic-light baking) that add complexity our scenes never repay.
>
> **Applicability boundary (load-bearing):** this block is about the **client-facing browser visor running
> on a REAL GPU**. Our headless visual-QA path is Playwright + Chromium + **SwiftShader** — a CPU software
> rasterizer ([Block 26], [WebGL headless memory]) — so NONE of these GPU levers change what QA measures;
> SwiftShader is bound by CPU fill, not GPU VRAM/draw-call cost. The gate stays what [Block 53] made it
> (objective ΔE00 colour + blind reviewer), and this block adds an ORTHOGONAL runtime-cost budget that
> only the shipped page pays. `[INFER]`
>
> Sources (preserved before citing, all `sources/web-snapshots/`, fetched 2026-08-07): the three.js `dev`
> doc pages `…_BatchedMesh.html.md.md`, `…_InstancedMesh.html.md.md`, `…_KTX2Loader.html.md.md`,
> `…_GLTFLoader.html.md.md`, `…_LOD.html.md.md`, `…_OrbitControls.html.md.md`,
> `…_MeshStandardMaterial.ht.md`, `…_LightShadow.html.md.md` (raw.githubusercontent.com/mrdoob/three.js) ·
> the manual page `threejs.org_manual_en_rendering-on-demand.html.md` · GitHub issue
> `github.com_mrdoob_three.js_issues_23090.md`. Cross-refs: [Block 17] (optimization compendium), [Block 25]
> (glTF-Transform/gltfpack), [Block 40] (LOD applied+measured), [Block 27] (device budgets).
> Method: transcription + primary-source confirmation of each API claim against the fetched dev docs;
> no live GPU re-measurement (the axis is documented, not benchmarked, this iteration). Markers: `[CERT-web]`
> official three.js doc/repo (URL+date 2026-08-07) · `[CERT-a]` GitHub issue thread / secondary · `[CERT]`
> local corpus `file`/block cross-ref · `[INFER]` deduction.

---

## 1. Why a GPU budget at all — and the one number that reads it `[INFER]`

The visor renders a handful of equipment units (racks, shelving rows, worktables, machines) that the
client rotates and inspects up close. On a real GPU the cost that matters is: **VRAM** (textures +
geometry resident on the card), **draw calls** (CPU→GPU submission overhead), **shadow-map re-rasterization**
(a full extra scene render per shadow-casting light per frame), and **fragment work** (pixels × pixel
ratio). Every lever below attacks one of those four without touching the material/PBR *look* the [Block 53]
gate certifies. The single acceptance number to watch is `renderer.info.render.calls` (draw-call count):
frustum culling is on by default `[CERT-web]` (LOD doc / core behaviour), so an idle close-up should sit
well under ~100 draw calls — a plausible rule of thumb for a scene of this size `[INFER]`.

## 2. TOP 5 levers, ranked by (GPU savings × applicability) ÷ implementation cost

### 2.1 Render-on-demand — stop the rAF loop `[CERT-web]`/`[CERT-a]`

The biggest free win for a mostly-static inspector: **do not render continuously**. The three.js manual
"Rendering on Demand" states it directly — most examples set up a `requestAnimationFrame` loop, but "for
something that does not animate … rendering continuously is a waste of the device's power and … wastes the
user's battery"; the fix is "render once at the start and then render only when something changes"
`[CERT-web]` (`rendering-on-demand.html.md`). The manual's exact idiom: drop the rAF loop, call `render()`
once, and

```js
controls.addEventListener('change', render);   // OrbitControls dispatch 'change' on any camera change
```

so a frame is drawn only on camera/scene change `[CERT-web]`. **Zero quality loss** — the same pixels, just
not re-drawn 60×/s when nothing moves.

**The one caveat — the damping tail.** `OrbitControls` with `enableDamping = true` keeps easing the camera
for several frames *after* the input stops, and the docs are explicit that "if this is enabled, you must
call `update()` in your animation loop" `[CERT-web]` (`OrbitControls.html.md`, also for `autoRotate`).
Naïve render-on-demand freezes mid-glide because the `change` event has stopped firing while the inertia
is still integrating — this is exactly three.js issue **#23090** ("OrbitControls: Rendering on Demand when
`controls.enableDamping = true`"), which asks for on-demand rendering that still services the damping
animation `[CERT-a]` (`issues_23090.md`). The practical rule: while damping is enabled, keep rendering
until `controls.update()` reports the camera has settled, then stop — or disable damping in the visor.
In react-three-fiber this whole lever is one prop: `frameloop="demand"` plus `invalidate()` on the events
that should redraw `[INFER]` (R3F convention; not a core three.js API).

### 2.2 GPU-compressed textures (KTX2/Basis) + Draco + meshopt — the VRAM lever `[CERT-web]`

The largest and most compounding VRAM/bandwidth saving. A PNG/JPG texture decompresses to full **RGBA in
VRAM**; a **GPU-compressed** format (via `KTX2Loader`, KTX 2.0 / Basis Universal, glTF extension
`KHR_texture_basisu`) *stays compressed on the card*. The KTX2Loader doc: "A loader for KTX 2.0 GPU Texture
containers … supports Basis Universal GPU textures, which can be quickly transcoded to a wide variety of GPU
texture compression formats" `[CERT-web]` (`KTX2Loader.html.md`). **The setup order is load-bearing** —
`detectSupport(renderer)` must be called BEFORE loading so the loader picks a transcode target the GPU
supports:

```js
loader.setTranscoderPath('examples/jsm/libs/basis/');
loader.detectSupport(renderer);      // BEFORE loadAsync
```
`[CERT-web]` (`KTX2Loader.html.md`). Wire the three decoders into `GLTFLoader`, whose doc confirms all three
setters — `.setKTX2Loader(ktx2Loader)`, `.setDRACOLoader(dracoLoader)` (Draco geometry,
`KHR_draco_mesh_compression`), `.setMeshoptDecoder(meshoptDecoder)` (meshopt, `EXT_meshopt_compression`)
`[CERT-web]` (`GLTFLoader.html.md`). Offline, produce the compressed GLB once with gltfpack (cross-ref
[Block 25] `[CERT]`): `gltfpack -i in.glb -o out.glb -cc -tc` (`-tc` = KTX2/Basis textures, `-cc` = meshopt
geometry) `[CERT-a]`. Codec choice: **UASTC** (near-lossless) for normal/data maps, **ETC1S** for albedo
`[CERT-a]` (Basis Universal convention; the KTX2 doc references the BasisU/UASTC HDR spec `[CERT-web]`).
Order-of-magnitude: staying compressed in VRAM is roughly **4–6× less** than the decoded RGBA a plain
PNG would occupy `[INFER]`. This is the biggest lever and it **compounds across every repeated unit**.

### 2.3 Geometry instancing — collapse repeated units to one draw call `[CERT-web]`

Our racks/shelving/equipment rows repeat the same geometry many times — the textbook instancing case.
`THREE.InstancedMesh(geometry, material, count)` is "a special version of a mesh with instanced rendering
support … will help you to reduce the number of draw calls" `[CERT-web]` (`InstancedMesh.html.md`); place
each unit with `setMatrixAt(i, matrix)`. N identical units → **1 draw call**, zero visual change. When the
units differ in *geometry* but share a *material*, use `THREE.BatchedMesh` — "a special version of a mesh
with multi-draw batch rendering support … for a large number of objects with the same material but with
different geometries or world transformations", built with `addGeometry(geom)` then `addInstance(geomId)`
`[CERT-web]` (`BatchedMesh.html.md`). Applicability caveat (§4): instancing where repetition is LOW is pure
added complexity for no draw-call win `[INFER]`.

### 2.4 Shadow-cost control — cap map size, freeze static rigs `[CERT-web]`

A shadow-casting light re-rasterizes the scene into a depth map; that is often the single most expensive
thing in an otherwise-simple equipment scene. Two documented controls:

- **Cap the map size.** `LightShadow.mapSize` "defines the width and height of the shadow map. Higher values
  give better quality shadows at the cost of computation time … Default is `(512,512)`" `[CERT-web]`
  (`LightShadow.html.md`). Keep the key light at 1024, secondaries at 512.
- **Freeze the shadow for a static scene.** `LightShadow.autoUpdate` "enables automatic updates of the
  light's shadow. If you do not require dynamic lighting / shadows, you may set this to `false`" `[CERT-web]`.
  Then render the shadow exactly once on change via `LightShadow.needsUpdate`: "when set to `true`, shadow
  maps will be updated in the next `render` call. If you have set … `autoUpdate` to `false`, you will need
  to set this property to `true` and then make a render call" `[CERT-web]` (`LightShadow.html.md`). With
  both false, the shadow pass is skipped every frame — the equipment doesn't move, so the shadow never
  needs re-baking. Minimize the count of real-time shadow-casting lights overall. (Note: VSM is unsupported
  for PointLight shadows — a known engine limitation `[CERT-a]`, cross-ref [Block 5].)

### 2.5 Pixel-ratio cap + resource sharing `[CERT-web]`/`[INFER]`

Fragment work scales with `devicePixelRatio²`; an uncapped retina display can quadruple pixel cost for no
perceptible gain. Cap it: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` `[CERT-a]`
(standard three.js guidance, cross-ref [Block 17]/[Block 27]). Share **one** `Material` and one
`BufferGeometry` instance across identical units rather than cloning (fewer GPU uploads, better batching);
merge static, never-moving geometry with `BufferGeometryUtils.mergeGeometries` to cut draw calls `[CERT-a]`
(cross-ref [Block 17]). Request the discrete GPU with `powerPreference: 'high-performance'` on the renderer
`[INFER]`. Frustum culling is already on by default, so off-screen units cost nothing `[CERT-web]`.

## 3. Bigger investment (not top-5): baked lightmaps for the static shell `[CERT-web]`

For the parts of a scene whose lighting NEVER changes (a building shell, a fixed room around the equipment),
pre-baking light into a texture is "essentially free at render time" — the GPU samples a texture instead of
evaluating lights. `MeshStandardMaterial` supports it directly: `.lightMap` "represents pre-baked light …
Requires a second set of UVs", scaled by `.lightMapIntensity` (typically `texture.colorSpace =
LinearSRGBColorSpace`) `[CERT-web]`; `.aoMap` — "the red channel of this texture is used as the ambient
occlusion map. Requires a second set of UVs", scaled by `.aoMapIntensity` `[CERT-web]`
(`MeshStandardMaterial.ht.md`). The load-bearing constraint is the **second UV set** (`uv1`, addressed via
`texture.channel = 1`): both maps ignore the primary UVs. Cost side: a Blender bake + a UV2 unwrap per
static asset (cross-ref [Block 28] round-trip). Worth it ONLY where lighting is truly static — never on
anything the client can relight or on dynamic equipment.

## 4. What does NOT apply (honest scoping) `[CERT-web]`/`[INFER]`

- **LOD — SKIP for the visor.** `THREE.LOD` swaps detail by camera distance: `addLevel(object, distance,
  hysteresis)` and `update(camera)` in the render loop (with `autoUpdate` gating) `[CERT-web]`
  (`LOD.html.md`). But it pays off only when geometry **recedes** far enough that low-detail versions are
  indistinguishable. Our equipment is inspected up close at roughly constant distance, so every LOD level
  would render at its highest tier anyway — pure authoring + memory overhead for no frame win `[INFER]`.
  Reconsider ONLY for long equipment rows / plant-floor scenes that genuinely recede into distance
  (that is the measured win in [Block 40], a building far-shell — a different scene shape).
- **Aggressive instancing at low repetition** = complexity with no draw-call payoff (§2.3) `[INFER]`.
- **Baked lighting on anything dynamic** — a lightmap is wrong the instant the light or object moves (§3).
- **None of the above touch the SwiftShader QA path** — it is CPU-fill-bound, not GPU-bound, so these
  levers neither help nor are measured by headless QA `[INFER]`.

## 5. Acceptance gates to record `[INFER]`

For the shipped visor, record: (a) `renderer.info.render.calls` < ~100 on an idle close-up; (b)
`renderer.getPixelRatio()` ≤ 2; (c) KTX2/Basis mandatory for all maps (no raw PNG/JPG textures shipped);
(d) shadows frozen (`autoUpdate=false`) for static rigs, mapSize ≤ 1024 key / 512 secondary; (e) frame-time
sampled with `stats-gl` (WebGL/WebGPU timer-query stats panel) on a representative client GPU. These are
runtime-cost gates ORTHOGONAL to the [Block 53] material/ΔE00 gate — a scene can pass one and fail the
other independently.

## 6. What this is (kit boundary) `[INFER]`

These are runtime deltas for the **client visor build**, not the design3d QA loop. The offline steps
(gltfpack `-cc -tc`, KTX2 encode, UV2 bake) belong in the asset pipeline ([Block 25]/[Block 28]); the
runtime steps (render-on-demand, instancing, frozen shadows, DPR cap) belong in the visor shell template.
A run never edits the kit; the user promotes any shell-template change (SELF-IMPROVEMENT §Hard boundary,
cross-ref [Block 53] §6). Nothing here changes the headless gate.
