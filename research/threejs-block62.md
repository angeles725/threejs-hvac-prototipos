# Block 62 — ROBOTICS dimensional + joint-hierarchy reference (catalog family `robotica`)

**Run 10 · gap G74 · EVIDENCE + DESIGN block · target: `three.js`**
Written for the `catalog-robotica` worktree. Sibling of [Block 57] (doors) and [Block 58] (racking):
same purpose — replace guessed geometry with manufacturer-published dimensions before modelling.

Provenance markers: `[CERT-doc]` preserved manufacturer document in `sources/` · `[CERT-web]` official
web page · `[CERT-a]` secondary/expert source · `[INFER]` deduction stated as such.

Block numbering note: parallel catalog worktrees were writing corpus blocks at the same time, so
the number was picked defensively. On integration B57-B61 were already taken (doors, storage,
sectional/roll-up doors, access control, shelving) and **B62 was free** — this block keeps it, with
no renumbering needed. Its evidence folder is namespaced by family (`sources/datasheets/*`, rows
registered in `sources/SOURCES.md`) so a future clash cannot silently merge two corpora. The gap id
moved G71 -> **G74** on integration: G71 was already the security-door gap.

---

## 62.1 Why this block exists

The `robotica` family is `track: needs-research` for two reasons, and only one of them is dimensional:

1. **Dimensions.** A 6-axis arm has no "obvious" proportion. Get the shoulder height or the
   forearm/upper-arm ratio wrong and the silhouette reads as a toy, even with perfect materials.
2. **Articulation.** Every asset in the family has a *pose*, not just a shape. A pose is only
   correct if each joint pivot sits on the real axis of rotation. A pivot at a part's centroid
   produces geometry that separates or interpenetrates as the joint moves — the same failure the
   cold-room door avoided by pivoting the leaf on the hinge line ([Block 57]).

§62.2-62.6 supply (1). §62.7 supplies (2).

---

## 62.2 6-axis industrial arm — ABB IRB 6700-235/2.65

Source: `sources/datasheets/abb-irb6700-product-spec` (ABB *Product specification IRB 6700*,
3HAC080365-001 Rev. D) `[CERT-doc]`.

### Envelope and base

| Quantity | Value | Marker | Where |
|---|---|---|---|
| Handling capacity | 235 kg | `[CERT-doc]` | §1.1.2 variants table |
| Reach (horizontal, axis 1 centre → wrist centre) | 2 650 mm | `[CERT-doc]` | §1.8.1 working-range diagram |
| Max reachable height | 3 114 mm | `[CERT-doc]` | idem |
| Reach below base level | 320 mm | `[CERT-doc]` | idem |
| Axis-2 (shoulder) height above base plane | 780 mm | `[CERT-doc]` | §1.1.3 main-dimensions drawing |
| Base plate footprint | 1 009 × 745 mm | `[CERT-doc]` | idem (`1009` × `745` callouts) |
| Radius axis 1, front | 532 mm | `[CERT-doc]` | Pos. B legend, this variant |
| Radius axis 1, back | 633 mm | `[CERT-doc]` | Pos. C legend, this variant |
| Wrist length (axis 5 → tool flange) | 200 mm | `[CERT-doc]` | Pos. A legend, standard variants |
| Cote D / E for this variant | 2 300 / 1 135 mm | `[CERT-doc]` | variant dimension table |

### Link lengths — what is certified and what is derived

The drawing does not label the upper arm and forearm separately, so the split is **derived**, but
the *sum* is certified twice over by two independent cotes:

```
axis-2 pivot sits at (x=320, y=780) relative to the axis-1 centre on the floor   [CERT-doc]
horizontal reach 2650 from axis 1  ⇒  L_upper + L_fore + L_wrist = 2650 - 320 = 2330 mm
vertical reach   3114 from floor   ⇒  780 + 2330 = 3110 ≈ 3114 (Δ4 mm = elbow offset)   ✔ closes
```

- `L_upper + L_fore + 200 = 2330 mm` — `[CERT-doc]` (two-cote closure, Δ 4 mm).
- `L_upper = 1 135 mm` — `[INFER]` from cote E, confidence **med**.
- `L_fore = 2330 - 1135 - 200 = 995 mm` — `[INFER]`, confidence **low**; it is the *residual*, so
  it carries every error in the split. **Do not** re-derive further shapes from it
  (the derived-shape trap: a value past its evidence invents geometry no check can see).

### Axis working ranges `[CERT-doc]` (§1.8.1 "Type of motion")

| Axis | Motion | Range |
|---|---|---|
| 1 | Rotation | ±170° (±220° option) |
| 2 | Arm | −65° / +85° |
| 3 | Arm | −180° / +70° |
| 4 | Wrist | ±300° |
| 5 | Bend | ±130° |
| 6 | Turn | ±360° |

A pose must be inside these limits or the asset is lying about the machine.

---

## 62.3 Collaborative arm — Universal Robots UR10e

Source: `sources/datasheets/ur10e-e-series-datasheet` (UR *UR10e Technical Specification*,
updated December 2024) `[CERT-doc]`.

| Quantity | Value | Marker |
|---|---|---|
| Payload | 12.5 kg | `[CERT-doc]` |
| Reach | 1 300 mm | `[CERT-doc]` |
| Degrees of freedom | 6 rotating joints | `[CERT-doc]` |
| Footprint | Ø 190 mm | `[CERT-doc]` |
| Weight | 33.5 kg incl. cable | `[CERT-doc]` |
| Working range, every joint | ±360° | `[CERT-doc]` |
| Max speed, base/shoulder | ±120 °/s; elbow & wrists ±180 °/s | `[CERT-doc]` |
| Pose repeatability | ±0.05 mm | `[CERT-doc]` |
| IP / noise | IP54 / < 65 dB(A) | `[CERT-doc]` |

**The kinematic chain is printed on the drawing** — this is the rare case where a datasheet gives
the link lengths directly. Cotes on the side view: `180.7`, `612.7`, `571.55`, `174.15`, `119.85`,
`691.4` `[CERT-doc]`. They map onto the published UR10e DH parameters:

| Symbol | Value (mm) | Meaning |
|---|---|---|
| d1 | 180.7 | base → shoulder height |
| a2 | 612.7 | upper arm (shoulder → elbow) |
| a3 | 571.55 | forearm (elbow → wrist 1) |
| d4 | 174.15 | wrist-1 lateral offset |
| d5 | 119.85 | wrist-2 offset |
| d6 | ≈ 116.55 | wrist-3 → tool flange — **not printed**, `[INFER]` |

Check: `612.7 + 571.55 + 119.85 = 1 304.1 ≈ 1 300 mm` published reach ✔ (the reach is quoted
rounded). The chain is therefore certified, not guessed.

Tube diameter is **not published**; the UR10e arm reads ~128 mm at the shoulder tube tapering to
~90 mm at wrist 3 — `[INFER]`, confidence **low**, silhouette-only.

---

## 62.4 Gripper — Robotiq 2F-85 adaptive 2-finger

Source: `sources/web-snapshots/assets.robotiq.com_website-assets_support_documents_document_online_2F-85_2F-140.md`
(Robotiq *2F-85 & 2F-140 Instruction Manual §6 Specifications*) `[CERT-web]`.

| Quantity | Value | Marker |
|---|---|---|
| Gripper opening (stroke) | 85 mm | `[CERT-web]` |
| Maximum height | 162.8 mm | `[CERT-web]` |
| Maximum width | 148.6 mm | `[CERT-web]` |
| Weight | 925 g | `[CERT-web]` |
| Grasp force | 20 – 235 N | `[CERT-web]` |
| Finger speed | 20 – 150 mm/s | `[CERT-web]` |
| Payload (friction grasp) | 5 kg | `[CERT-web]` |
| Position repeatability | 0.05 mm | `[CERT-web]` |
| Coupling | 50 mm pitch-circle diameter, M6 | `[CERT-web]` |

Identity note: the 2F-85 is *adaptive* — the finger is a **two-phalanx linkage**, so it performs a
parallel grasp on a flat object and an **encompassing** grasp when the proximal phalanx stalls on a
round one `[CERT-web]`. Modelling it as two rigid parallel jaws throws away the thing that makes it
recognisable. The linkage, not the span, is the subject.

---

## 62.5 AMR / AGV — MiR250

Source: `sources/datasheets/mir250-specifications` (MiR *MiR250 Specifications* 2.99) `[CERT-doc]`.

| Quantity | Value | Marker |
|---|---|---|
| Length × width × height | 800 × 580 × 300 mm | `[CERT-doc]` |
| Payload | 250 kg | `[CERT-doc]` |
| Weight without load | 83 kg | `[CERT-doc]` |
| Max speed | 2.0 m/s | `[CERT-doc]` |
| Navigation | 2× safety laser scanner, 360° coverage | `[CERT-doc]` |

The 300 mm deck height is the identity: an AMR is a **low flat platform**, not a boxy cart. The
two scanners sit at diagonally opposite corners — that is what produces the 360° field with two
270° units `[INFER]` from the published 360° claim.

---

## 62.6 Palletizer — ABB IRB 660-250/3.15

Source: `sources/datasheets/abb-irb660-palletizer` (ABB *IRB 660 Industrial Robot*,
PR10284EN_D) `[CERT-doc]`.

| Quantity | Value | Marker |
|---|---|---|
| Number of axes | **4** | `[CERT-doc]` |
| Reach | 3.15 m | `[CERT-doc]` |
| Handling capacity | 180 kg / 250 kg variants | `[CERT-doc]` |
| Protection / mounting | IP 67 / floor | `[CERT-doc]` |
| Position repeatability | 0.1 mm | `[CERT-doc]` |
| Axis 1 rotation | +180°/−180° (option ±220°) | `[CERT-doc]` |
| Axis 2 arm | +85° / −42° | `[CERT-doc]` |
| Axis 3 arm | +120° / −20° | `[CERT-doc]` |
| Axis 6 turn | +300° / −300° | `[CERT-doc]` |
| Working-range cotes | 1 211 mechanical stop · 1 131 max working range · 1 350 · 260 · 2 000 · R400 | `[CERT-doc]` |
| Throughput | ≈ 2 190 cycles/h at 60 kg | `[CERT-doc]` |

**The 4-axis fact is the whole design.** A palletizer is *not* a 6-axis arm with a big gripper: it
has no axes 4/5, and instead carries a **parallelogram linkage** plus a **vertical-keeping tie rod**
so the tool flange stays horizontal at every arm pose — that is why the box never tips. Axis 6
(the only wrist axis) just rotates the tool about the vertical. Modelling it with a free wrist is
the single most common way to get this machine wrong.

---

## 62.7 Robot cell guarding — ISO 13857 / EN ISO 14120 / ISO 10218-2

Source: `sources/web-snapshots/robot-safety.net_en_dimensions-and-fastening-of-robot-safety-fences_.md`
`[CERT-a]` (safety-engineering practitioner site, quoting ISO 13857).

- Minimum fence height against climbing over: **1 400 mm** `[CERT-a]` (ISO 13857) — and only when
  the fence sits at the maximum permissible distance from the hazard.
- Robot cell fences in practice: **2 000 mm or higher**; from **2 700 mm** the over-reach term
  drops out entirely `[CERT-a]`.
- Gap between floor and lower edge of the fence panel: **≤ 180 mm** `[CERT-a]`, and smaller if a
  hazard point is reachable through it.
- Fasteners must be loss-protected — panels whose screws can be removed by hand are not a guard
  `[CERT-a]`.

**Light curtain** (material entry/exit opening) — source
`sources/datasheets/sick-c4000-basic-c40s-1301aa030` (SICK *C4000 Basic C40S-1301AA030*) `[CERT-doc]`:

| Quantity | Value | Marker |
|---|---|---|
| Resolution | 14 mm | `[CERT-doc]` |
| Protective field height S | 1 350 mm | `[CERT-doc]` |
| Housing cross-section | 48 × 40 mm | `[CERT-doc]` |
| Housing length L1 for S = 1 350 | 1 426 mm | `[CERT-doc]` |
| L1 vs S across the whole range | S + 72 … 78 mm | `[CERT-doc]` (dimension table, S = 300…1 800) |

So a light-curtain stick is a **48 × 40 mm extrusion ~76 mm longer than its protected field** —
a proportion worth honouring, because a curtain drawn as a thin rod reads as a lamp.

---

## 62.8 Joint hierarchy in three.js — the modelling contract

This is the DESIGN half of the block. It is `[CERT]` against the project corpus (the animated fan
groups in `voxel/campus-hvac-voxel.html` and the hinge-pivoted leaf in
`disenos/catalog/puertas/puerta-cuarto-frio/`) plus the three.js `Object3D` transform semantics.

**Rule 1 — one `Group` per joint, origin ON the axis.**
`Object3D.rotation` always rotates about the object's own origin. Therefore a joint is a `Group`
positioned at the axis of rotation, and the link geometry is a child *offset* from that origin:

```js
const j2 = new THREE.Group();          // shoulder
j2.position.set(0.320, 0.780, 0);      // the CERTIFIED axis-2 location
j1.add(j2);
const upperArm = buildUpperArm();      // built from its own base at y=0 upward
j2.add(upperArm);                      // child geometry, NOT the pivot
```
Never bake the offset into the geometry and then rotate the mesh: the pivot lands at the centroid
and the elbow visibly detaches at 40°.

**Rule 2 — the chain is nested, not flat.** `base → j1 → j2 → j3 → j4 → j5 → j6 → tool`. Each
child inherits its parent's transform, which is what makes forward kinematics free: set six angles,
the whole arm follows. A flat list of meshes with hand-computed world positions is the anti-pattern
— it re-derives what the scene graph already does, and it drifts.

**Rule 3 — clamp to the published range.** Every joint angle is clamped to §62.2/§62.6. A pose
outside the range is a modelling bug that no visual check will catch, because a wrong-but-smooth
pose still looks like a robot.

**Rule 4 — the palletizer's parallelogram is a *constraint*, not a pose.** For the IRB 660, the
tool flange must stay vertical: `j3.rotation.z = -j2.rotation.z` (plus the tie-rod geometry drawn
to match). This is the cheap analytic stand-in for the real 4-bar linkage and it is exact for a
true parallelogram `[INFER]`.

**Rule 5 — animation and the render gate.** Render-on-demand (block 56) gates `renderer.render()`
behind `needsRender`. Any joint animation must therefore set `needsRender = true` on **every frame
it mutates a transform**, and stop setting it when the motion settles — otherwise either the arm
freezes mid-swing or the page renders forever. The door's swing is the reference implementation.

**Rule 6 — no IK.** Every asset in this family is posed, not solved. Analytic IK would add a
solver, a convergence question and a failure mode for zero visual gain at catalog scale. Poses are
authored as joint-angle presets. If a future asset genuinely needs a target-following arm, that is
a new gap, not a silent addition here.

---

## 62.9 What this block does NOT certify

- Arm **tube diameters and casting profiles** for any robot here — no manufacturer publishes them
  in these documents. All silhouette work below the link lengths is `[INFER]`.
- The IRB 6700 **upper-arm / forearm split** (§62.2) — only the sum is certified.
- The IRB 660 **link lengths** — only the reach, the axis ranges and the working-range cotes are
  certified; the parallelogram proportions are `[INFER]`.
- **Colour.** No RAL is published for any of these machines in the preserved documents. ABB orange
  and UR blue-grey are `[CERT-a]` brand observation at best; each design-spec must measure its own
  `colorTarget` from its own QA render, per the house rule.

---

## 62.10 Sources preserved this block

| File | Origin |
|---|---|
| `sources/datasheets/abb-irb6700-product-spec` | ABB 3HAC080365-001 Rev. D, *Product specification IRB 6700* |
| `sources/datasheets/abb-irb660-palletizer` | ABB PR10284EN_D, *IRB 660 Industrial Robot* |
| `sources/datasheets/ur10e-e-series-datasheet` | Universal Robots, *UR10e Technical Specification* (Dec 2024) |
| `sources/datasheets/mir250-specifications` | Mobile Industrial Robots, *MiR250 Specifications* 2.99 |
| `sources/datasheets/sick-c4000-basic-c40s-1301aa030` | SICK, *C4000 Basic C40S-1301AA030* data sheet |
| `sources/web-snapshots/robot-safety.net_en_dimensions-and-fastening-of-robot-safety-fences_.md` | robot-safety.net, fence dimensions (ISO 13857) |
| `sources/web-snapshots/assets.robotiq.com_…_2F-85_2F-140.md` | Robotiq 2F-85/2F-140 instruction manual §6 Specifications |

All rows registered with sha256 in `sources/SOURCES.md` before being cited here.
