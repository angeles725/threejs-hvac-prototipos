# Block 8 — The geometry toolkit of the realistic stage

> Research of **procedural geometry** in the realistic family: the parametric class census, the
> constructor contracts, and the house's advanced moves (curved Shapes, procedural Lathe
> profiles, direct vertex editing). Does NOT cover instancing ([Block 2]) or textures (G9).
>
> Sources: context7 `/mrdoob/three.js` (docs/pages/ExtrudeGeometry, CylinderGeometry,
> TorusGeometry, LatheGeometry, docs/scenes/geometry-browser — queried 2026-07-04) · local
> prototypes (census grep over the 6 non-bundled realistic files, 2026-07-04).
> Method: context7 doc queries + driver grep census and line verification. Markers:
> `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date) ·
> `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 3 (realistic stage). Connects [Block 1] §1.4, [Block 3] §3.3.

---

## 8.1 — Geometry census of the realistic family `[CERT]`

`new THREE.<class>` counts across the 6 non-bundled realistic files (grep 2026-07-04):

| Class | Count | Typical role (from cited uses) |
|---|---|---|
| CylinderGeometry | **54** | pipes, motors, compressors, pulleys — the realistic workhorse |
| BoxGeometry | 39 | frames, panels, plinths |
| TorusGeometry | 24 | flanges, bolt rings, fan guards, U-bends |
| SphereGeometry | 21 | domes, caps, indicator lights |
| PlaneGeometry | 10 | ground, labels |
| ExtrudeGeometry | 6 | base plates, fan blades (beveled) |
| RingGeometry / ShapeGeometry | 3 / 3 | gaskets, flat cutouts |
| TubeGeometry | 2 | routed hoses |
| LatheGeometry / ConeGeometry | 1 / 1 | venturi cowl / tank cap |

The voxel family, by contrast, is BoxGeometry + InstancedMesh ([Block 2] §2.3) — the census IS
the geometric signature of the realistic second pass `[INFER]` (direct reading of the split).

## 8.2 — Constructor contracts that matter `[CERT-web]`

From official docs (2026-07-04):

| Class | Key parameters (defaults) |
|---|---|
| `CylinderGeometry` | `radiusTop/Bottom (1), height (1), radialSegments (32), heightSegments (1), openEnded (false), thetaStart/Length` — partial theta makes sectioned/cutaway cylinders |
| `TorusGeometry` | `radius (1), tube (0.4, must be < radius), radialSegments (12), tubularSegments (48), arc (2π)` |
| `LatheGeometry` | `points: Vector2[] with x > 0` (the revolution profile), `segments (12), phiStart, phiLength` |
| `ExtrudeGeometry` | `shapes + options: curveSegments (12), steps (1), depth (1), bevelEnabled (true!), bevelThickness (0.2), bevelSize (bevelThickness−0.1), bevelSegments (3), extrudePath (no bevels on path extrusion)` |

Note the footgun: `bevelEnabled` defaults **true** — flat plates must opt out, which the corpus
does (`chiller-aircooled-realistic (7).html:374`: `{ depth:0.6, bevelEnabled:false }`) `[CERT]`.

## 8.3 — The house's advanced moves `[CERT]`

Three techniques in the chiller push past primitive assembly:

1. **Curved Shape → beveled Extrude** — the fan blade is an airfoil drawn with
   `shape.quadraticCurveTo(...)` twice + `closePath()`, extruded with
   `{ depth: 0.2, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.04, bevelThickness: 0.04 }`
   (`chiller-aircooled-realistic (7).html:393-399`).
2. **Procedural Lathe profile** — the venturi cowl generates its own profile,
   `prof.push(new THREE.Vector2(6.2 + Math.pow(t,1.6)*1.6, t*2.0))` over 9 samples, then
   `new THREE.LatheGeometry(prof, 28)` (`chiller-aircooled-realistic (7).html:419-421`).
3. **Direct vertex post-editing** — right after extruding, the blade is deformed by iterating
   `geo.attributes.position` per-vertex (`chiller-aircooled-realistic (7).html:401-402`) — the
   BufferGeometry escape hatch: any parametric output is an editable attribute buffer `[CERT]`,
   which is exactly how bespoke shapes (blade twist) are achieved without a DCC tool `[INFER]`.

Tessellation is cost-aware, not default: Lathe at 28 segments (> default 12), tank-cap Cone at
48 (`carcamo-agua-3d (1).html:613`), while defaults suffice elsewhere `[CERT]` — segment counts
scale with the part's visual prominence `[INFER]`.

## 8.4 — Cost model `[CERT-web]` / `[INFER]`

Segment parameters multiply triangle counts (radial × height × caps for a cylinder; the
geometry-browser exposes every knob live `[CERT-web]`). In the realistic family each part is its
own Mesh/draw call — 54 cylinders in one file means draw-call pressure comes from part count,
not triangle count `[INFER]` (census + [Block 2] §2.1 economics). Consolidation paths:
mergeGeometries for static assemblies ([Block 2] §2.1) or BatchedMesh (G15).

## 8.5 — Connections

- **[Block 2]** §2.1 — the draw-call economics §8.4 leans on; voxel counterpart technique.
- **[Block 3]** §3.3 — the materials these geometries wear (DoubleSide cutaway trick).
- **G9 textures** — CanvasTexture fin/nameplate patterns applied onto these surfaces.
- **G15 BatchedMesh** — the multi-geometry batching candidate for §8.1's part zoo.
- **G14 synthesis** — census = the "realistic pass" geometric vocabulary.
