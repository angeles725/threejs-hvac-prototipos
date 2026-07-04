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
- Flat-color `MeshStandardMaterial`, no textures, no environment map.
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
- [ ] Glass: use `opacity: 1` with `transmission` (currently mixed — double attenuation). [B3 §3.4]
- [ ] Add `texture.colorSpace = THREE.SRGBColorSpace` to color CanvasTextures. [B9 §9.3]
- [ ] Rebuild the r128 legacy `data_center` voxel onto the current template. [B10 §10.3]

Performance (effort-ordered):
- [ ] Backport `renderer.shadowMap.autoUpdate = false` (+ `needsUpdate = true`) to all
      static-sun files — already proven in `cuarto-3d.html`. [B5 §5.4, B11 §11.4]
- [ ] Collapse voxel color groups with `setColorAt`/`instanceColor`. [B2 §2.3]
- [ ] Evaluate per-palette `BatchedMesh` for realistic assemblies (available in r160). [B11 §11.3]

Optional upgrades: environment map for the voxel pass · `NearestFilter` for pixel-true voxel
textures · MapControls for plan scenes · AgX tone mapping (already in r160).

## Corpus map

`INDEX.md` → 12 blocks (`threejs-block*.md`) + `CATALOG.md` + `RESEARCH-STATE.md`.
Research method: Research-SDD (`/home/cristian/investigacion/sdd-investigacion/research-sdd`).
