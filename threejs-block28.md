# Block 28 — Blender ↔ three.js round-trip for organic/baked HVAC parts

> Research of **G28** (medium priority, run-4 final gap): the corpus's equipment is 100% procedural
> `THREE.*Geometry` code ([Block 8]) — nothing organic, nothing UV-unwrapped-for-baking, nothing a
> parametric extrude/lathe call can reach. This block documents the official Blender glTF I/O
> add-on's export contract (what maps to glTF PBR, what does **not** export), the Cycles baking
> workflow that produces the AO texture [Block 24] §24.2 already identified as needing a `uv2` set,
> and assembles a round-trip recipe: procedural prototype → `GLTFExporter` → Blender touch-ups/bake
> → re-export → [Block 25] optimize → `GLTFLoader`. Does not cover Blender's animation/rigging
> export (out of scope — corpus has no skinned/animated equipment) or texture-painting workflows
> beyond the AO/normal bake case already motivated by [Block 24].
>
> Sources: Blender Manual (docs.blender.org, official), preserved verbatim —
> `sources/web-snapshots/docs.blender.org_manual_en_latest_addons_import_export_scene_gltf2.html.md`
> (`https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html`, Blender 5.1
> Manual, fetched 2026-07-04) and
> `sources/web-snapshots/docs.blender.org_manual_en_latest_render_cycles_baking.html.md`
> (`https://docs.blender.org/manual/en/latest/render/cycles/baking.html`, fetched 2026-07-04) ·
> context7 `/mrdoob/three.js` (GLTFLoader/MeshStandardMaterial doc pages, queried 2026-07-04,
> cross-referencing [Block 19]'s already-cited loader contract) · corpus cross-refs ([Block 19],
> [Block 24], [Block 25], [Block 22]).
> Markers: `[CERT-web]` official web (URL + date, this block's primary evidence type) · `[CERT]`
> local corpus file:line · `[INFER]` deduction (mostly: assembling the multi-tool recipe from
> independently cited steps, and applying Blender's stated contract to specific corpus materials).
>
> Layer 4 — Cross-cutting (asset pipeline, run 4, final gap of this run). Connects [Block 19],
> [Block 24] §24.2, [Block 25], [Block 22].

---

## 28.1 — Scope: why this gap exists at all `[INFER]`

Every prior asset-pipeline block ([Block 19], [Block 25]) documented the *export/optimize/load*
chain assuming the input scene already exists as three.js code. That assumption holds for the
corpus's entire current inventory — HVAC equipment built from primitive geometries ([Block 8]:
`CylinderGeometry` ×54, `ExtrudeGeometry`, `LatheGeometry`, direct vertex edits). It stops holding
the moment a part is organic (fan blades with aerodynamic twist, gasket/foam with irregular
silhouette, a manufacturer decal/badge with fine typographic detail) or needs a **baked** texture
(AO, combined lighting) that requires authored UVs a procedural builder never produces. Those parts
are cheaper to sculpt/UV-unwrap/bake in a DCC tool and bring back as glTF than to fight into
`BufferGeometry` calls — this block is the contract for that path, not a replacement for [Block 8]'s
procedural toolkit `[INFER]`.

## 28.2 — Blender's glTF 2.0 add-on: export contract `[CERT-web]`

Official, built-in (enabled by default) add-on, `File ‣ Import/Export ‣ glTF 2.0 (.glb, .gltf)`
(Blender 5.1 Manual, `addons/import_export/scene_gltf2.html`) `[CERT-web]`. Contract points that
matter for a three.js-bound export:

| Setting | Contract | Citation |
|---|---|---|
| **Y Up** (Transform) | "Export using glTF convention, +Y up" — Blender's native Z-up scene is reoriented to glTF's Y-up on export, no manual rotation needed | `[CERT-web]` |
| **Apply Modifiers** (Data - Mesh) | "Export objects using the evaluated mesh, meaning the resulting mesh after all Modifiers have been calculated" — Subdivision/Boolean/Mirror modifiers must be baked into the exported mesh, they are not preserved as live modifiers | `[CERT-web]` |
| **File format** | Three variants: **glTF Binary (`.glb`)** — single file, "makes it easy to share or copy the model to other systems"; **glTF Separate** (`.gltf`+`.bin`+textures) — easier to hand-edit JSON/images post-export; **glTF Embedded** (`.gltf`, base64) — least efficient, plain-text-only use case | `[CERT-web]` |
| **Mesh triangulation** | "quads and n-gons are automatically converted to triangles when exporting to glTF. Discontinuous UVs and flat-shaded edges may result in moderately higher vertex counts... such vertices are separated for export" — an expected, not a bug, vertex-count increase versus the Blender-side count | `[CERT-web]` |
| **Draco compression** (Data - Compression) | "Compress meshes using Google Draco" with per-attribute quantization sliders (Position/Normal/Texture Coordinates/Color/Generic) — this is the Blender-side producer for the same `KHR_draco_mesh_compression` extension [Block 25] §25.2's `gltf-transform draco` command also targets | `[CERT-web]` |
| **GPU Instances** (Data - Scene Graph) | Exports repeated-mesh objects (same mesh data, multiple objects) using `EXT_mesh_gpu_instancing` — same extension [Block 25] §25.4 maps to plain `GLTFLoader`, no extra module; constraint: "Instances must be meshes... must all be children of the same object... doesn't manage material variation" | `[CERT-web]` |
| **Units** | glTF's own convention (not Blender-specific): meters, +Y up — the same right-handed, Y-up world three.js's `Scene`/`Object3D` hierarchy already assumes, so a correctly-exported `.glb` needs no unit/axis correction on the three.js side beyond the ordinary "does 1 unit == 1 meter feel right for this scene's scale" sanity check `[INFER]` (glTF spec convention applied; not independently re-queried here — out of scope, three.js's Y-up world is the well-established baseline every prior block in this corpus already assumes). |

**What does NOT export**: only what the exporter can trace back to a **Principled BSDF node graph**
or a handful of specifically-recognized node patterns (§28.3). Any procedural shader logic living
purely in Blender's node graph (noise textures, math-node-driven patterns, anything not baked to an
Image Texture node) has no glTF equivalent and is silently dropped — the add-on documentation's
entire "Exported Materials" section is a whitelist of *recognized node arrangements*, not a general
shader compiler `[INFER]` (structure of §28.3's source material).

## 28.3 — Material mapping: Principled BSDF → glTF PBR channels `[CERT-web]`

"The core material system in glTF supports a metal/rough PBR workflow" with six core channels: Base
Color, Metallic, Roughness, Baked Ambient Occlusion, Normal Map (tangent space, +Y up), Emissive
(`addons/import_export/scene_gltf2.html`, Materials) `[CERT-web]`. Per-channel export rules:

| glTF channel | Blender-side requirement | Citation |
|---|---|---|
| **Base Color** | Principled BSDF's *Base Color* input — unconnected → the socket's default color; Image Texture node connected → that image; also accepts an RGB node or an Ambient Occlusion node's color output routed into Base Color | `[CERT-web]` |
| **Metallic + Roughness** | Read directly from the BSDF's *Metallic*/*Roughness* sliders if unconnected. If textured: glTF packs **metallic → blue channel, roughness → green channel** of one image — recommended Blender wiring is a Separate RGB node feeding G→Roughness, B→Metallic, with the source Image Texture's Color Space set to **Non-Color**; matching this wiring lets the exporter copy the image verbatim (no re-encode, faster export) | `[CERT-web]` |
| **Baked Ambient Occlusion** | No native Principled BSDF slot for this — requires a custom **`glTF Material Output`** node group (Shader Editor Add-ons, `Add > Output > glTF Material Output`) with an `Occlusion` input wired to an Image Texture; glTF stores occlusion in the **red channel**, optionally packed into the same image as roughness/metallic (an "ORM" texture: Occlusion-R, Roughness-G, Metallic-B) | `[CERT-web]` |
| **Normal Map** | Image Texture (Non-Color) → Normal Map node (must stay **Tangent Space**, the only space glTF supports) → BSDF *Normal* input; strength copied through | `[CERT-web]` |
| **Emissive** | Image Texture → BSDF *Emission* input (or a separate Emission shader added in); if the base color/roughness aren't otherwise needed, set Base Color to black and Roughness to 1.0 to isolate the emissive read; any emissiveFactor channel `> 1.0` triggers `KHR_materials_emissive_strength` | `[CERT-web]` |
| Clearcoat / Sheen / Specular / Anisotropy / Transmission / IOR / Volume | Each maps to a corresponding `KHR_materials_*` extension when the matching BSDF input is non-default or textured (e.g. nonzero *Clearcoat* → `KHR_materials_clearcoat`, R=clearcoat/G=clearcoat-roughness channel packing) | `[CERT-web]` |

This is a **direct line back to [Block 22]'s corrected palette** `[INFER]`: any corpus material
brought through Blender for touch-ups (e.g. `copper`'s corrected hue, [Block 22] §22.5) round-trips
cleanly through this Base-Color/Metallic/Roughness mapping — provided the metallic-binary rule
([Block 22] §22.3) is respected in the Blender node graph too, since the glTF metallic/roughness
model on the Blender export side is the *identical* BRDF three.js's `MeshStandardMaterial` consumes
on import ([Block 19] §19.1's `GLTFLoader` contract, not re-derived here).

## 28.4 — Baking workflow: producing the AO texture [Block 24] §24.2 needs `[CERT-web]`

[Block 24] §24.2 established that three.js's `aoMap` "requires a second set of UVs" and flagged
authoring a `uv2` set as "a non-trivial ask for the corpus's procedurally-built geometry that has
never authored a second UV channel." Blender's Cycles bake panel (`Render ‣ Bake`) is the concrete
answer to that gap:

- **Setup requirement**: "Baking requires a mesh to have a UV map, and either a Color Attribute or
  an Image Texture node with an image to be baked to" — the **Active** Image Texture node is the
  bake target (`render/cycles/baking.html`, Setup) `[CERT-web]`.
- **Bake Type → Ambient Occlusion**: "Bakes ambient occlusion as specified in the World panels.
  Ignores all lights in the scene" — a dedicated, lights-independent AO pass, distinct from the
  **Combined** type (bakes materials+textures+lighting) or **Normal** type (bakes surface normals to
  RGB, default space **Tangent**, default channel swizzle **R:+X, G:+Y, B:+Z** — explicitly the
  space/swizzle "Keep... when using this bake panel for glTF," per the glTF-addon docs' own
  cross-reference to this page) `[CERT-web]`.
- **Selected to Active**: "Bake shading on the surface of selected objects to the active object. The
  rays are cast from the low-poly object inwards towards the high-poly object" — the standard
  high-poly-detail-onto-low-poly-UVs technique, with `Cage`/`Max Ray Distance`/`Extrusion` controls
  for problem geometry, and a documented CPU-memory caveat: "join the high-poly objects before
  baking" to avoid crashes `[CERT-web]`.
- **Margin**: a pixel border generated around UV islands ("Extend" or "Adjacent Faces" fill methods)
  "to avoid discontinuities at UV seams, due to texture filtering and mip-mapping" — relevant at
  runtime for any texture-filtered `aoMap` sample near an island edge `[CERT-web]`.

**Smart UV Project vs manual seams** `[INFER]` (general Blender modeling knowledge, not
independently re-fetched — kept short per this block's own scope): Blender's *Smart UV Project*
operator auto-generates non-overlapping UV islands from face-angle heuristics — fast, no manual
seam-marking, but seams land wherever the angle threshold decides, which can cross visually
prominent surfaces (a fan blade's face, a nameplate). Manually marking seams (`Ctrl+E > Mark Seam`)
along natural edges (part boundaries, hidden undersides) gives control over where seams are
invisible at the cost of manual authoring time. For a one-off bake-then-export HVAC part (this
block's use case) Smart UV Project is the pragmatic default; manual seams are worth the time only
for parts with a hero camera angle where a seam artifact would be visible.

**Tie-in**: the baked AO texture from this workflow, once wired to the `glTF Material Output` node's
`Occlusion` input (§28.3), exports with the mesh's existing UV map as `TEXCOORD_0` in the glTF file
— getting that texture into three.js's `aoMap` slot at runtime still requires the mesh to carry a
distinct `uv2` attribute on the three.js side per [Block 24] §24.2's documented material-doc
constraint; this block does not re-verify whether `GLTFLoader` auto-derives `uv2` from a
single-UV-set glTF file internally — that is `GLTFLoader`'s own parsing logic, out of scope for a
Blender-side document and not covered by [Block 19]'s existing citations either `[INFER]` (honest
gap flag, not asserted either way).

## 28.5 — three.js side: what already covers this, not re-derived `[CERT]` + `[CERT-web]`

- **Loader contract**: `GLTFLoader`'s basic load pattern, Draco leg (`DRACOLoader`), and KTX2
  texture leg are [Block 19] §19.1's contract, unchanged here — a Blender-exported `.glb` is
  consumed exactly like any other glTF file `[CERT-web]` (cited there, not re-derived).
- **Material construction**: `gltf.scene`'s meshes arrive with `MeshStandardMaterial` instances
  populated from the glTF metallic-roughness channels documented in §28.3 — this is the same BRDF
  [Block 22] audits, so a Blender-authored material lands in three.js with the identical
  base-color/metallic/roughness semantics as a hand-written `new THREE.MeshStandardMaterial({...})`
  call `[INFER]` (glTF metallic-roughness spec ↔ `MeshStandardMaterial` mapping, corroborated by
  context7 `webgpu_compute_rasterizer_ibl.html` snippet showing `sourceMaterial.roughnessMap`'s green
  channel and `.metalnessMap`'s blue channel read exactly per the glTF packing convention §28.3
  documents — same G=roughness/B=metallic convention on both the Blender-export and three.js-import
  sides) `[CERT-web]`.
- **Optimization**: the exported `.glb`, whether Draco-compressed at the Blender step (§28.2) or
  left raw, is exactly the kind of input [Block 25]'s `gltf-transform`/`gltfpack` recipes (§25.5)
  operate on — no special-casing needed for a Blender-origin file versus a `GLTFExporter`-origin
  one; both are just glTF.

## 28.6 — Round-trip recipe (assembled) `[INFER-assembled]`

```
Path A (procedural prototype, has no organic/baking need):
  procedural code (THREE.*Geometry, [Block 8])
    ──GLTFExporter.parse({binary:true})──▶  equipment.glb  [Block 19] §19.2
    ──gltf-transform / gltfpack optimize──▶  equipment.optimized.glb  [Block 25] §25.5
    ──GLTFLoader.load()──▶  scene  [Block 19] §19.1

Path B (this block's gap — organic part or baked AO/normal needed):
  procedural prototype (rough starting geometry, optional)
    ──GLTFExporter──▶  draft.glb
    ──Blender import (glTF add-on)──▶  sculpt/model organic detail,
                                        UV-unwrap (Smart UV Project or manual seams, §28.4),
                                        wire glTF-compatible node graph (§28.3),
                                        Cycles bake AO/Normal to Image Texture (§28.4)
    ──Blender glTF export (Apply Modifiers ON, Y Up, Draco optional)──▶  authored.glb  [Block 19]
    ──gltf-transform / gltfpack optimize──▶  authored.optimized.glb  [Block 25] §25.5
    ──GLTFLoader.load()──▶  scene, MeshStandardMaterial with aoMap (needs uv2, §28.4 tie-in)
```

Path B's Blender step is the only new stage this block adds; everything upstream (procedural draft,
optional) and downstream (optimize, load) is already-documented contract from [Block 19]/[Block 25].

## 28.7 — When to author FROM Blender instead of round-tripping `[INFER]`

Not every part benefits from starting as three.js code. Author directly in Blender, skip Path A's
draft-export step entirely, when:

- **The shape is organic or has no clean parametric description** — fan blades with aerodynamic
  twist, gaskets/foam with irregular silhouette, cable bundles — anything [Block 8]'s
  Cylinder/Torus/Extrude/Lathe toolkit can't reach without unreasonable vertex-by-vertex code
  `[INFER]` (complements, does not contradict, [Block 8]'s own stated toolkit scope).
- **A bake is required** — AO/normal detail transfer needs Blender's Cycles bake panel (§28.4)
  regardless of whether the base mesh started as three.js code or not; if a bake is already in the
  plan, there's little reason to also maintain a parallel procedural-code version of the same part.
- **Fine typographic/decal detail** — manufacturer nameplates/badges are already the corpus's
  `CanvasTexture` `fillText` pattern ([Block 9] §9.1) for flat labels; a *sculpted* raised badge
  (embossed logo) is the case where Blender authoring wins, since that's real geometry + a normal
  bake, not a flat texture.

Stay in procedural code (Path A) for anything [Block 8] already covers economically — cylindrical
tanks/coils/compressor bodies, box-like panels/skids — where a DCC round-trip adds authoring
overhead for no shape the code can't already produce.

## 28.8 — Connections

- **[Block 19]** — the `GLTFExporter`/`GLTFLoader` contract this block's round-trip (§28.6) sits
  around; §19.1's loader mechanics and §19.2's exporter options are not re-derived, only referenced.
- **[Block 24]** §24.2 — the `aoMap`/`uv2` requirement this block's baking workflow (§28.4) is the
  authoring answer to; the open question of whether `GLTFLoader` auto-derives `uv2` from a
  single-TEXCOORD glTF file is flagged, not resolved, in §28.4.
- **[Block 25]** — the optimize step every Blender-exported `.glb` still needs before
  `GLTFLoader.load()`; this block adds one upstream stage (Blender authoring), nothing downstream.
- **[Block 22]** — the metallic-roughness BRDF and metallic-binary authoring rule this block's §28.3
  material mapping shares verbatim with the glTF spec's own model; a Blender-authored material must
  respect the same binary rule to round-trip correctly into the corrected palette.
- **RUN 4 STOP**: with G28 closed, all run-4 gaps (G22-G28) are covered. Run 5 (G29-G32, HVAC domain
  + dashboards + terrain + BIM) auto-continues per user authorization (§ RESEARCH-STATE.md stop
  control).
