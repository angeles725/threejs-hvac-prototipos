# Team Workflow — Voxel First, Realistic Second

> How this team builds HVAC equipment visualizations with Three.js. Distilled from the
> Research-SDD corpus in this repo (evidence: [Block 12](threejs-block12.md), which cites
> Blocks 1-11; every claim below is backed by a cited block).

## The pipeline

Every piece of equipment goes through **two passes**:

```
1. VOXEL PASS  (voxel/<equipo>-voxel.html)          2. REALISTIC PASS  (<equipo>-realistic.html)
   fast massing & composition            ──────▶       presentation fidelity
```

### Pass 1 — Voxel art (massing)

Goal: silhouette, proportions, color blocking, and part decomposition — at one-cube granularity.

- One shared `BoxGeometry(1,1,1)` + one `InstancedMesh` per color group (`setMatrixAt` +
  `instanceMatrix.needsUpdate`). Animated parts live OUTSIDE the InstancedMesh as `Group`s.
- Flat-color `MeshStandardMaterial`, no textures. (Both passes share the RoomEnvironment IBL — corrected 2026-07-04, B1 §1.4.)
- Camera: `PerspectiveCamera` FOV ~40° (fake isometric — deliberately not OrthographicCamera).

### Pass 2 — Realistic (build-out)

Goal: presentation-grade surfaces on the massing validated in pass 1. The voxel file is the
dimensional/compositional spec.

- Parametric geometry: Cylinder (workhorse), Torus, Extrude (beveled), Lathe, curved Shapes,
  direct vertex editing for bespoke parts (fan blades).
- Named PBR material palette (`const M = {...}`) — metalness/roughness per surface family;
  `MeshPhysicalMaterial` for clearcoat/glass; emissive for lit screens/LEDs.
- IBL: `scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture` — no HDR
  downloads, prototypes stay self-contained.
- Per-scene `THREE.Fog` for depth; `CanvasTexture` for fins and nameplates (draw, don't download).

### Shared template (both passes — do not fork it)

r0.160.0 via importmap/unpkg · `ACESFilmicToneMapping` + exposure 1.05-1.15 (calibrate per
scene) · `SRGBColorSpace` output · `PCFSoftShadowMap` 2048² with hand-fit shadow frustum +
bias −0.0003 · 3-light rig (white key 1.5 / blue fill `0x88aaff` / teal rim `0x00d4aa` /
ambient ~0.25) · OrbitControls with `dampingFactor 0.08` · `setPixelRatio(min(dpr, 2))` ·
DOM overlays for UI. This shared scaffolding is WHY the pass-1 → pass-2 hand-off is cheap:
only content layers change; the pipeline layers persist.

## Punch list (from the research, with evidence)

Correctness:
- [x] Glass: `opacity:1` with transmission — DONE 2026-07-04 (8 sites/6 files, commit 2750b9d)
- [x] CanvasTexture SRGBColorSpace — DONE 2026-07-04 (10 sites/7 files, commit 2750b9d)
- [x] Rebuild r128 legacy data_center — DONE 2026-07-04 (1,086→37 draws, 29x, commit bc9e2d8)

Performance (effort-ordered):
- [x] Baked shadows backported — DONE 2026-07-04 (22 files + caster exclusions + re-bake on user toggles, commit d420dab)
- [ ] Collapse voxel color groups with `setColorAt`/`instanceColor`. [B2 §2.3]
- [ ] Evaluate per-palette `BatchedMesh` for realistic assemblies (available in r160). [B11 §11.3]

Optional upgrades: environment map for the voxel pass · `NearestFilter` for pixel-true voxel
textures · MapControls for plan scenes · AgX tone mapping (already in r160).

## Run 2 additions — rendering, optimization, and field-proven techniques

Evidence: Blocks 13-19 (rendering methods, optimization II, 18 external case studies, MapLibre,
post-processing, asset pipeline). Techniques worth adopting, effort-ordered:

Quick wins:
- [ ] On-demand rendering while idle (render on `controls change` + resize; stay continuous
      only during damping/autoRotate/fan animation). [B13 §13.2]
- [ ] Selective bloom on HMI screens/LEDs — the truthful version of today's faked
      PointLight/emissive glow; composes with on-demand rendering. [B18 §18.2]
- [ ] Texture/material variant switcher (a `<select>` swapping palette entries — insulation/
      paint finishes). [B15 §15.2 d23]

Structural upgrades:
- [ ] Voxel-as-far-LOD: `lod.addLevel(realistic, 0)` + `lod.addLevel(voxel, far)` — the two-pass
      workflow already produces both detail levels; facility scenes get LOD for free. [B17 §17.2]
- [ ] Parametric configurator: sliders (Tweakpane) → regenerate procedural geometry — MUST pair
      with `dispose()` of replaced geometry or GPU memory leaks per drag. [B14 §14.3, B17 §17.5]
- [ ] OutlinePass component highlighting (click → outline a part; pairs with raycast
      `instanceId` picking). [B18 §18.3]
- [ ] Data-driven instanced grids: bind InstancedMesh instances to live sensor streams
      (fan arrays, coil temperature grids). [B15 §15.2 d37]
- [ ] GPU particle flow for refrigerant/airflow through ductwork. [B15 §15.2 d26/d33]

Publish stage (new, optional third pass):
- [ ] `GLTFExporter` (.glb) per prototype — unlocks: georeferenced equipment on MapLibre site
      maps, an auto-framing catalog viewer, DCC round-trips, path-traced marketing stills.
      Gotcha: `onlyVisible: true` default drops hidden LOD levels. [B19, B16 §16.3]

Platform decisions (deliberate, not drop-in): WebGPU/TSL pass (field-confirmed wave — 4/8
demos + half the dasprinzip series), MapLibre site maps (leaves the self-contained-HTML
constraint), path tracing. [B13 §13.4, B14 §14.2, B16]

## Run 3 additions — forum gotchas and batch-III techniques

Mobile correctness (act on these BEFORE any iOS demo):
- [ ] DataTextures needing linear filtering on iOS: use `HalfFloatType`, never `FloatType`
      (or drop to `NearestFilter`) — field-verified failure + fix. [B20 §20.1]
- [ ] Profile per-frame work against 120 Hz (ProMotion), not 60 Hz. [B20 §20.1]

New techniques (constructor-level evidence):
- [ ] `MeshSurfaceSampler` + `InstancedMesh` scattering — rivets/bolts/vents over a base mesh
      (replaces hand-written positional loops). [B21 §21.1 Sacred Pearl]
- [ ] Fat lines (`LineSegments2`/`LineMaterial`) for crisp duct/pipe outlines. [B21 §21.1]
- [ ] VAT (baked per-instance animation textures) + InstancedMesh for animated fans/vibration
      at scale — see `manthrax/three-vat`. [B20 §20.2]
- [ ] Product reference: atlas3d.space — AI-labeled exploded/X-ray GLB inspection is the
      closest analog to a "realistic-mode equipment UI". [B21 §21.1]

Ongoing source: discourse.threejs.org (Questions = gotchas with maintainer replies; Resources =
battle-tested techniques). Search: `site:discourse.threejs.org <topic>` or `/tag/<name>`.
Fetch note: discourse serves crawler HTML directly; reddit needs old.reddit.com. [B20 §20.3]

## Runs 4-5 additions — design craft, measured budgets, and the HVAC domain

Design craft (make it LOOK right):
- [x] Corrected PBR palette applied — DONE 2026-07-04 (14 entries + copper F0 + 2 latent bugs fixed, commit e43e06f)
- [ ] Adopt the studio-lighting recipe (RectAreaLight softboxes; the house rig already sits at
      ~3.75:1 key:fill). [B23]
- [ ] Pick from the cheap-wins catalog per pass: matcap (voxel), baked aoMap (uv2!), blob
      shadows, vertexColors, gradient backgrounds. None in use today. [B24]

Measured performance (numbers, not vibes — probe: `tools/probe.mjs`):
- Baseline [CERT-hw]: cuarto-frio-plano 2,747 draws/frame · trane-rtu-realistic 1,539 ·
  cuarto-3d 1,013 (baked shadows visible in the counter) · voxel files 379-737 draws but
  >500k tris/frame. [B26]
- Inverted bottlenecks: realistic = draw-bound (→ BatchedMesh/merge, now measured priority #1);
  voxel = triangle-bound (→ LOD/simplify/instanceColor). Budgets per device class in [B27].

Publish pipeline: GLTFExporter → gltf-transform 4.4.1 / gltfpack 1.2 (both verified running
via npx) → GLTFLoader legs. Recipes per destination in [B25]; Blender round-trip (bake AO to
uv2, Principled→glTF mapping) in [B28].

HVAC domain (run 5):
- Equipment viewer checklist — top 4 items need ZERO new subsystems: exploded views (existing
  Groups), X-ray (`depthWrite:false`+`renderOrder`), CSS2D hotspots, ISA-101 status colors
  (gray default, color = abnormal ONLY). [B29]
- Dashboard architecture: CSS2DRenderer layer + 1Hz telemetry → dirty-flag → render-on-demand +
  DOM charts in side panels; layout/alarm tiers per the preserved Monash BAS standard. [B30]
- Site context: 3 terrain recipes (stylized pad / real DEM patch via free AWS Terrarium tiles /
  MapLibre native terrain). [B31]
- Buildings: plan-extrusion (already practiced in cuarto-frio-plano!) vs web-ifc/@thatopen (real
  BIM handoffs) vs OSM massing — decision table in [B32 §32.4].

## Corpus map

`INDEX.md` → 19 blocks (`threejs-block*.md`) + `CATALOG.md` + `RESEARCH-STATE.md` +
`sources/web-snapshots/` (27 preserved external sources).
Research method: Research-SDD (`/home/cristian/investigacion/sdd-investigacion/research-sdd`).
