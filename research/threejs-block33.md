# Block 33 — The template as a system: a design-library architecture proposal

> Research of **the shared scaffolding as a first-class module system**: this block quantifies
> how much of the 27-prototype corpus is byte-level copy-paste (renderer/color/shadow/rig/loop
> setup) and how the RESCUED client-integration files independently re-solve the identical
> problem, then proposes a standalone-HTML-compatible `lib/` for this design studio. This is a
> **design/applied block**: §33.1 is evidence-grade [CERT]; §33.2-§33.5 are an architecture
> proposal assembled from the corpus's own patterns — high [INFER] density is expected and
> declared, not a research gap. Closes G33 (run 6, opening a new 7-gap backlog).
>
> Sources: local corpus — all 27 `*.html` prototypes (root + `voxel/`) `[CERT]`; rescued client
> files `client-designs/tridium-datacenter/three-renderer.js`,
> `client-designs/honeywell-mx60/SharedEnv.js` + `UpDetail.js` + `CarcamoDetail.js`,
> `client-designs/bms-casino/CasinoHVAC3D.jsx` + `RtuModel3D.jsx` + `CisternModel3D.jsx` `[CERT]`;
> `client-designs/README.md` (owner's project-split decision) `[CERT-doc]`.
> Method: grep-quantified signature counts across the whole corpus + direct reading of the
> rescued client files' setup code; the module proposal reasons from [Block 1] §1.3, [Block 12],
> [Block 22] §22.5, [Block 23] §23.6, [Block 29] §29.6, [Block 19] §19.2, [Block 8] §8.1 — no new
> web research was needed, this block's job is assembly, not discovery.
> Markers: `[CERT]` local file:line · `[CERT-doc]` project doc · `[INFER]` deduction/proposal.
>
> Layer 8 (design system, run 6). Connects [Block 1] §1.3, [Block 12], [Block 22], [Block 23],
> [Block 29], [Block 19], `client-designs/README.md`.

---

## 33.1 — Evidence of reinvention: quantifying the copy-paste `[CERT]`

The corpus is 27 standalone HTML files (7 realistic + 20 voxel counting the untracked additions
present in this run; [Block 1] §1.3's original sweep covered 23). Grep-counting the four
signatures [Block 1] §1.3 already named as "near-verbatim across ≥18 of 23 files" against the
full current set:

| Signature | Files matching | Files total | Ratio |
|---|---|---|---|
| `ACESFilmicToneMapping` | 26 | 27 | 96% |
| `0x88aaff` (house fill-light hex) | 23 | 27 | 85% |
| `0x00d4aa` (house rim-light hex) | 25 | 27 | 93% |
| `dampingFactor` (OrbitControls) | 27 | 27 | 100% |
| `updateProjectionMatrix` (resize one-liner) | 27 | 27 | 100% |

The one file missing tone-mapping and both rig hexes is `voxel/data_center_voxel_isometrico_3d.html`
— a standalone outlier already flagged in [Block 1] as not following the house template; every
other file, including every prototype added since [Block 1]'s original count, independently
carries the identical scaffolding. This is not a shared `import` — it is **27 independent
copies** of the same ~40 lines of setup code, each one hand-typed or hand-pasted into its own
`<script type="module">` block.

**The reinvention is not confined to this repo.** The rescued client-integration files show the
identical pattern one layer up the stack, in codebases this studio does not own:

- `client-designs/honeywell-mx60/UpDetail.js:1371-1411` — its own renderer/shadow/controls setup:
  `renderer.shadowMap.type = _isMobileViewer ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;`,
  `renderer.toneMapping = THREE.ACESFilmicToneMapping;`, `controls.dampingFactor = 0.08;`
  `[CERT]`.
- `client-designs/honeywell-mx60/CarcamoDetail.js:655-677` — the same three settings again,
  independently typed, with `dampingFactor = 0.06` (a small unexplained drift from the sibling
  file's `0.08` and the house corpus's `0.08`) `[CERT]`.
- `client-designs/honeywell-mx60/SharedEnv.js:36-44` — a *third*, more sophisticated reinvention:
  a dedicated permanent off-screen `WebGLRenderer` + `PMREMGenerator(renderer).fromScene(new
  RoomEnvironment(renderer), 0.04)`, built specifically because IBL environment generation is
  expensive and the file's own scenes are short-lived (mount/unmount per detail-page visit). This
  is the ONE piece of shared infrastructure in the client codebase — a single-file module solving
  exactly one of the many problems [Block 1] §1.3's table lists, built ad hoc rather than as part
  of a design system `[CERT]`.
- `client-designs/tridium-datacenter/three-renderer.js:1196-1210` — a fourth independent instance
  of the same renderer/shadow/tone-mapping/camera boilerplate (`PCFSoftShadowMap`,
  `ACESFilmicToneMapping`, `PerspectiveCamera(50, ...)`), plus its own from-scratch 3-light rig at
  `three-renderer.js:776-797` (`AmbientLight` + `HemisphereLight` + `DirectionalLight` sun/fill +
  `PointLight` bounce) — a *different* rig shape than the house 3-directional-light convention,
  arrived at independently rather than reusing it `[CERT]`.
- `client-designs/bms-casino/CasinoHVAC3D.jsx` — a fifth instance, this time React-hosted
  (`useRef` + `useEffect` building the THREE object graph on mount, tearing it down on unmount —
  `CasinoHVAC3D.jsx:642-663`), on `three@0.183.2` per the module's origin — a *newer* three.js
  version than either the corpus's r160 or r128 legacy file ([Block 10]) `[CERT]`.

**Reading this evidence** `[INFER]`: five independent codebases (this studio's 27 files, plus 4
distinct client-integration modules across 2 client stacks) have each separately solved "set up a
renderer with ACES tone mapping, soft shadows, damped orbit controls, and a resize handler" —
some faithfully reproducing the house convention, some drifting from it (Tridium's rig shape,
Carcamo's damping value), none of them sharing code. The corpus's own `[Block 12]` §12.4 already
named the shared template as the reason the voxel→realistic hand-off is cheap *within* a single
prototype's lifetime; this evidence shows the same value is being left on the table *across*
prototypes and across client projects, because the template exists only as a copy-paste
convention, never as an importable artifact.

## 33.2 — The `lib/` design-system proposal `[INFER] assembled-from-cited-blocks`

A five-module `lib/` directory, ES modules loaded via the corpus's existing importmap pattern —
**no bundler, no build step**, so every existing standalone-HTML prototype keeps working with a
`<script type="importmap">` addition instead of a rewrite:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/",
    "lib/": "./lib/"
  }
}
</script>
```

| Module | Centralizes | Derived from |
|---|---|---|
| `lib/scene-kit.js` | renderer + color management + shadows + resize + render loop | [Block 1] §1.3 (the table itself), with a `mode: 'baked' \| 'live'` shadow option per [Block 5] §5.4's `autoUpdate=false` win and a `mode: 'raf' \| 'on-demand'` loop option per [Block 13] §13.2 |
| `lib/palette.js` | the house material palette, corrected | [Block 22] §22.5's corrected-palette table — this becomes the ONE place `metalness` values live, closing the 13-entry mid-metalness anti-pattern at the source instead of per-file |
| `lib/rig.js` | the 3-light rig + an optional studio variant | [Block 1] §1.3 (hex values, intensities) for the default rig; [Block 23] §23.6's `RectAreaLight` studio recipe as an opt-in `variant: 'studio'` |
| `lib/equipment/*.js` | parametric equipment components (compressor, fan, coil, cabinet) | [Block 8] §8.1's geometry census (54 `CylinderGeometry`, 24 `TorusGeometry`, 6 beveled `ExtrudeGeometry` uses) as the primitive budget per component |
| `lib/viewer.js` | exploded view, X-ray/ghost toggle, hotspot anchors, status-color rule | [Block 29] §29.6's ranked checklist rows 1-5, in ranked order (status color and exploded view first — "zero new subsystems" per that block's own reading) |

### Before/after sketch `[INFER]`

**Before** (representative of every current prototype — the ~40-line block [Block 1] §1.3
documents, repeated verbatim in each of the 27 files):

```js
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(6, 5, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.castShadow = true;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x00d4aa, 0.2);
scene.add(rim);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
```

**After** (~20 lines of usage, all house policy pulled into the modules):

```js
import * as THREE from 'three';
import { createSceneKit } from 'lib/scene-kit.js';
import { addStudioRig } from 'lib/rig.js';
import { palette } from 'lib/palette.js';

const scene = new THREE.Scene();
const { renderer, camera, controls, start } = createSceneKit(scene, {
  shadows: 'baked',       // [Block 5] §5.4 win, opt-in per prototype
  loop: 'raf',            // or 'on-demand' per [Block 13] §13.2
  cameraFov: 38,
});

addStudioRig(scene);       // house 3-light rig, or { variant: 'studio' } for RectAreaLight

const compBody = new THREE.MeshStandardMaterial(palette.compBody); // corrected metalness baked in

// ...build equipment geometry as today...

start(); // renderer.render + controls.update loop, resize wiring included
```

Every line removed on the right is a line that currently drifts silently between files (the
`0.06` vs `0.08` damping split already visible between two SIBLING client files in §33.1) — the
module doesn't just save typing, it removes the drift vector.

## 33.3 — Composite-scene kits: room/datacenter/plant shells `[INFER]`

One layer above single-equipment components, the corpus and the rescued client files both
already build repeatable SPATIAL shells by hand — evidence these deserve their own kit tier
alongside `lib/equipment/`:

- **Room/plan shell** — `cuarto-frio-plano-realistic (6).html`'s `Shape`/`ShapeGeometry`
  per-room-polygon + box-stacked-wall technique ([Block 32] §32.2) is already a de-facto
  `lib/shells/room.js` candidate: a function taking a polygon + wall height + door cuts, used
  once in this corpus today but structurally identical to what any new floor-plan prototype would
  need.
- **Datacenter shell** — `client-designs/tridium-datacenter/three-renderer.js:429-547` builds
  raised floor, walls, cable trays, and rack rows from parametrized `mkRack`/`buildRaisedFloor`/
  `buildCableTrays` functions driven by `racks-large.js`/`locations.js` DATA files, not hardcoded
  geometry — this is the exact shape a `lib/shells/datacenter.js` should take: a shell function
  parametrized by a rack-layout data file, matching this studio's own terrain/building recipes
  ([Block 31] terrain, [Block 32] buildings).
- **Plant/site shell** — [Block 31]'s terrain recipes (heightmap displacement, MapLibre-native
  terrain) and [Block 32]'s building-massing recipes (OSM footprint extrusion, IFC-to-Fragments)
  are the two remaining shell types; both are already block-documented techniques, not new
  research — `lib/shells/terrain.js` and `lib/shells/building.js` would wrap them as reusable
  scene-setup functions the same way `lib/shells/datacenter.js` wraps the Tridium pattern.

**Reading this** `[INFER]`: the studio already has, spread across 3 sources (this corpus, B31/B32
research, and a client integration file), every shell TYPE it needs — the module work is
extraction and parametrization, not invention.

## 33.4 — Export contract to integration projects `[INFER]`

The studio's output needs to reach client projects through TWO channels, both already evidenced
in this corpus's own research and in the rescued files:

1. **`.glb` per equipment component** — [Block 19] §19.2's `GLTFExporter` contract is the
   existing, zero-new-work answer for shipping a finished piece of equipment geometry: `new
   GLTFExporter().parse(equipmentGroup, onDone, onError, { binary: true })` turns any
   `lib/equipment/*.js`-built component into a portable `.glb`. This is the right channel when the
   INTEGRATION side only needs the finished geometry+material — e.g. dropped into a MapLibre
   custom layer ([Block 16]) or a path-traced marketing render ([Block 14]) — and does not need
   the parametric source.
2. **The `lib/` modules as versioned packages** — for integration projects that need to re-render
   or re-parametrize a design at runtime (the Tridium and Honeywell/bms-casino cases — different
   rack counts, different room dimensions per site), shipping only a `.glb` is insufficient; those
   projects need `lib/equipment/compressor.js` itself, versioned (e.g. `@studio/three-lib@1.2.0`)
   so a client codebase can `import` the same parametric builder this studio uses, instead of
   hand-copying it the way `UpDetail.js`/`three-renderer.js`/`CasinoHVAC3D.jsx` currently each
   reimplement scaffolding independently (§33.1).

**The React case is the forcing function for this distinction** `[INFER]`: `CasinoHVAC3D.jsx`
proves the SAME design content (geometry, materials, lighting — the studio's concern per
`client-designs/README.md`'s own framing) must be consumable from both a vanilla
`<script type="module">` host (this corpus's 27 files, Tridium, Honeywell) AND a React
`useEffect`-mount host (bms-casino) without forking the design logic. A `lib/` built as plain ES
modules with no DOM assumptions baked in (scene-building functions take a `THREE.Scene` and
return disposal handles, nothing more) satisfies both hosts identically — the React file's
`useEffect`/`useRef` wrapper becomes exactly the ~20-line "after" sketch in §33.2 plus a cleanup
call, no different in kind from the vanilla usage.

| Channel | Ships | Consumer needs | Precedent |
|---|---|---|---|
| `.glb` export | finished geometry + baked materials | render only, no re-parametrization | [Block 19] §19.2, [Block 16] §16.3 |
| `lib/` module import | parametric source (equipment builders, palette, rig) | re-render with different params, different host (HTML/React) | this block's §33.2 + the bms-casino contrast case |

## 33.5 — Migration path `[INFER]`

Not a rewrite of all 27 files at once — an incremental rule, ranked by leverage:

1. **New designs first.** Any NEW prototype starts from `lib/scene-kit.js` + `lib/rig.js` +
   `lib/palette.js` from day one — zero migration cost, this is the rule going forward.
2. **Port the newest realistic file next** (`cuarto-3d.html`) — it already diverges from the
   house shadow convention in the direction the module should encode as the `'baked'` shadows
   option ([Block 5] §5.4), so porting it validates `scene-kit.js`'s shadow-mode switch against
   real, already-evolved code rather than a hypothetical.
3. **Port the 4 highest-file-count realistic prototypes** (`chiller-aircooled-realistic (7).html`,
   `liebert-split-realistic (3).html`, `split-system-realistic (2).html`,
   `trane-rtu-realistic-v10.html`) — these are the ones most likely to be reused as a base for a
   NEW client quote, so a `lib/palette.js` fix (the §22.5 metalness correction) lands where a
   sales-facing render will actually show it.
4. **Voxel files migrate last, opportunistically** — [Block 12] §12.4 already shows the voxel
   stage intentionally skips several realistic-stage knobs (no environment map, no PBR palette
   nuance); the module's value there is lower, so leave them on the copy-paste convention until
   touched for another reason.
5. **Do not migrate the client-integration files from this repo.** `UpDetail.js`,
   `three-renderer.js`, and `CasinoHVAC3D.jsx` live in codebases this studio does not own
   (`client-designs/README.md`'s project split) — the correct move there is the export contract
   (§33.4), not a cross-repo refactor; those files are read-only evidence for this block, not a
   migration target.

## 33.x — Connections

- **[Block 1]** §1.3 — the exact scaffolding table this block re-counts corpus-wide (§33.1) and
  packages as `lib/scene-kit.js` + `lib/rig.js` (§33.2).
- **[Block 12]** — its "shared template, alive, evolving" framing (§12.4) and its punch list
  (§12.5) are the direct precursor to this block's migration-path ranking (§33.5), which is that
  punch list's next-order consequence: promote the template from convention to artifact.
- **[Block 22]** §22.5 — the corrected-palette proposal becomes `lib/palette.js`'s content
  verbatim; this block adds no new palette values, only a home for the existing ones.
- **[Block 23]** §23.6 — the `RectAreaLight` studio-rig recipe becomes `lib/rig.js`'s opt-in
  `variant: 'studio'`, additive to the default house rig.
- **[Block 29]** §29.6 — the ranked HVAC-viewer feature checklist is `lib/viewer.js`'s scope and
  build order, unchanged from that block's own ranking.
- **[Block 19]** §19.2 — `GLTFExporter` is one of the two export-contract channels (§33.4); this
  block does not re-derive the exporter contract, only its role in the hand-off.
- **[Block 8]** §8.1 — the geometry census (Cylinder/Torus/Extrude counts) is the primitive
  budget `lib/equipment/*.js` components are built from.
- **[Block 31]**, **[Block 32]** — terrain and building shell techniques feed the composite-scene
  kit tier (§33.3) alongside the Tridium datacenter pattern.
- **`client-designs/README.md`** — the owner's studio/integration project split is the premise
  this whole block's export-contract framing (§33.4) is built to serve.
