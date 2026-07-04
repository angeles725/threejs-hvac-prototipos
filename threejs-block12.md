# Block 12 — SYNTHESIS: the voxel-first → realistic-second workflow

> **Terminal synthesis block (G14)**: consolidates B1-B11 into the team's working pipeline —
> what each stage is, what Three.js machinery powers it, what the shared template guarantees,
> and the verified divergences/opportunities. Block TYPE: **synthesis/applied** — per
> METHODOLOGY §11 a high [INFER]/[CERT] ratio here is expected and healthy (claims cite blocks,
> not new sources).
>
> Sources: corpus blocks [Block 1]-[Block 11] (each internally cited to file:line / official
> docs) · the prototype corpus itself.
> Method: cross-block consolidation; no new external sources. Markers:
> `[CERT]` local primary source (via cited block) · `[CERT-web]` official web (via cited block)
> · `[INFER]` synthesis deduction.
>
> Layer 5 (workflow). This block is the corpus's answer to "how do we work".

---

## 12.1 — The pipeline, as physically evidenced `[CERT]`

The corpus itself records a two-stage pipeline: **the same equipment exists as a voxel prototype
first and a realistic prototype second** — trane-rtu, liebert-split, split-system,
chiller-aircooled, cuarto-frio all have paired files, sharing UI overlay structure line-for-line
([Block 1] §1.1). File dates run voxel-early → realistic-late per equipment ([Block 1] §1.1,
§1.5 timeline notes). The user's stated process ("primero voxel art, después diseño 3D más
realista") matches what the artifacts show `[CERT]` (corpus pairing) + `[INFER]` (order from
dates + statement).

## 12.2 — Stage 1: voxel massing `[CERT via blocks]`

| Concern | Technique | Block |
|---|---|---|
| Geometry | ONE shared `BoxGeometry(1,1,1)`; one `InstancedMesh` per color group, `setMatrixAt` fill, `needsUpdate` honored | [Block 2] §2.3 |
| Animation | moving parts kept OUT of the InstancedMesh as `Group`s ("PARTES ANIMADAS...") | [Block 2] §2.3 |
| Materials | `MeshStandardMaterial` flat colors — no maps, no environment | [Block 3] §3.1, [Block 1] §1.4 |
| Light | the house 3-light rig (sun 1.5 + blue fill `0x88aaff` + teal rim `0x00d4aa` + ambient ~0.25) | [Block 4] §4.2 |
| Camera | `PerspectiveCamera` FOV ≈40° — fake isometric, never true ortho | [Block 7] §7.1 |

**Role in the pipeline** `[INFER]`: fastest possible massing — silhouette, proportion, color
blocking, and part decomposition (which voxel groups will later become parametric assemblies) at
one cube of granularity, with the SAME renderer/color/shadow pipeline the realistic pass will
use, so lighting/tone decisions carry over instead of restarting.

## 12.3 — Stage 2: realistic build-out `[CERT via blocks]`

| Concern | Technique | Block |
|---|---|---|
| Geometry | parametric census — Cylinder 54 / Box 39 / Torus 24 / Sphere 21 + Extrude(bevel), Lathe, curved Shapes, direct vertex editing | [Block 8] §8.1/§8.3 |
| Materials | 20-entry named PBR palette (galv 0.45/0.82 ... concrete 0.9/0.04), Physical for gloss/glass, emissive accents | [Block 3] §3.3 |
| Environment | `RoomEnvironment` → `PMREMGenerator.fromScene(0.04)` → `scene.environment` (no HDR downloads) | [Block 4] §4.1 |
| Depth | per-scene-scaled `THREE.Fog` | [Block 1] §1.4 |
| Texture | CanvasTexture fins/nameplates — draw, don't download | [Block 9] §9.1 |
| Shadows | PCFSoft 2048², hand-fit ortho frustum, bias −0.0003; newest file bakes them once | [Block 5] §5.2/§5.4 |

**Role in the pipeline** `[INFER]`: presentation fidelity on the massing already validated in
stage 1 — the voxel file acts as the dimensional/compositional spec; the realistic file re-spends
the budget on surface (PBR + IBL) and part detail instead of layout.

## 12.4 — The shared template: why the hand-off is cheap `[CERT via blocks]`

Both stages run the SAME scaffolding — r0.160.0 importmap, ACESFilmic + sRGB output with
per-scene exposure, PCFSoft shadows, 3-light rig, OrbitControls (damping 0.08), identical
resize/rAF plumbing, DOM overlays ([Block 1] §1.3, [Block 6] §6.4). Consequence `[INFER]`: a
voxel→realistic transition swaps the CONTENT layers (geometry source, materials, environment,
textures) while the pipeline layers (renderer, color, shadows, camera, controls, UI) persist
untouched — that is the structural reason the two-pass workflow is cheap and consistent. The
template is also ALIVE: the newest file already evolved it (baked shadows, cheaper PCF —
[Block 5] §5.4), and history shows the same evolution pattern from the r128 legacy ([Block 10]
§10.3).

## 12.5 — Verified divergences and next opportunities (the punch list)

**Correctness (docs-contract divergences, each cited in its block):**
1. Glass mixes `transmission:0.9` with `opacity:0.5` — docs mandate `opacity:1` ([Block 3] §3.4).
2. Color CanvasTextures missing `colorSpace = SRGBColorSpace` ([Block 9] §9.3).
3. Legacy r128 file lags on 4 contract axes — rewrite onto the template ([Block 10] §10.3).

**Performance (effort-ordered playbook, [Block 11] §11.4):**
backport baked shadows (22 files, one line each) → `instanceColor` collapse for voxel color
groups → per-palette `BatchedMesh` for realistic assemblies (r160-available, proven locally) →
measure with `renderer.info`.

**Optional stage upgrades:** environment map for the voxel stage (the one documented "best
results" knob it skips — [Block 3] §3.1), `NearestFilter` canvas textures for pixel-true voxel
aesthetics ([Block 9] §9.4), MapControls for plan scenes ([Block 7] §7.4), AgX tone mapping
already shipped in r160 ([Block 6] §6.3).

## 12.6 — Connections

- Consolidates **[Block 1]-[Block 11]** — every row above cites its evidence block.
- Companion deliverable: `WORKFLOW.md` (repo root) — the team-facing write-up of this block.
- Open gaps at STOP: G11 (post-processing), G13 (GLTF/DCC pipeline) — both are stage-2 upgrade
  paths, neither blocks the current workflow.
