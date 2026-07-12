# P1 Reference Research — Motorized VAV Damper (rectangular, opposed-blade, electric actuator)

Date: 2026-07-12. Scope: evidence for a spec-writer. Canonical target: **600 × 400 mm duct damper,
opposed airfoil blades, Belimo LM-class non-spring-return actuator**.

---

## 1. Real dimensions (with sources)

Canonical pick: 600 mm (W) × 400 mm (H) face — inside the size range of every product below
(TROX JZ 200–2000 × 180–1995 mm; Greenheck VCD-33 up to 48 × 48 in sections; Ruskin CD60 similar).

| Element | Value | Source |
|---|---|---|
| Duct/face size (canonical) | 600 × 400 mm (W×H) | chosen; within all ranges below |
| Frame type / depth | Channel ("hat") frame **5 in × 1 in = 127 × 25 mm**, 16 ga (1.5 mm) galvanized steel | Greenheck VCD-33 submittal PDF, https://content.greenheck.com/public/DAMProd/Original/10003/vcd-33_submittal.pdf ("Frame Type 5 in. x 1 in. (127mm x 25mm)", "Frame Thickness 16 ga. (1.5mm)") |
| Frame alt (EU) | Welded casing 1.25 mm galvanized sheet, flanges both sides for duct connection | TROX JZ product page, https://www.troxuk.co.uk/multileaf-dampers/jz-ffcab35c805db5a4 |
| Frame material heavy-duty alt | 13 ga interlocking galvanized frame | Ruskin CD60, https://www.ruskin.com/model/cd60 |
| Blade width | **6 in (152 mm) typical** (max 8-5/8 in); airfoil, one-piece, 14 ga equivalent | Ruskin CD60, https://www.ruskin.com/model/cd60 |
| Blade construction | Airfoil, double-skin, 2 skins of 20 ga (1 mm each) galvanized steel | Greenheck VCD-33 submittal PDF (above); TROX JZ blade sheet 1 mm |
| Blade count @ 400 mm H | **3 opposed blades**, pitch ≈ 133 mm (400/3) with ~152 mm chord incl. overlap/seal | derived from Ruskin 152 mm typical width |
| Blade axle / shaft Ø | **1/2 in (13 mm) plated steel hex** (Ruskin); **Ø12 mm round with position-indicator notch** (TROX) | Ruskin CD60 (above); TROX JZ (above) |
| Drive spindle protrusion for actuator | min **37 mm** free spindle length | Belimo LM24A datasheet drawing, https://www.belimo.com/mam/general-documents/datasheets/en-gb/belimo_LM24A_datasheet_en-gb.pdf (mirror: https://www.novreczky.eu/belimo/pdf/lm24a.pdf) |
| Actuator (canonical model) | **Belimo LM24A**, 5 Nm, for dampers up to ~1 m² (600×400 = 0.24 m² → fits), AC/DC 24 V, ≤95° rotation, ~500 g, IP54 | Belimo LM24A datasheet (above) |
| Actuator body size | From datasheet dimension drawing (mm values): **116 (body length) + 47 (clamp end) ≈ 163 total L × 66 × 61 mm**; secondary dims 94 / 41 / 22 mm; clamp Ø6…20 mm | Belimo LM24A datasheet p.2 "Dimensions [mm]" (values extracted from PDF text: 47, 61, 66, 116, 22, 94, 41, "6 ... 20", "min. 37") |
| Bigger-torque sibling | Belimo NM24A (10 Nm) for ~2 m²; same family form factor, slightly larger | Belimo actuators overview, https://www.belimo.com/us/en_US/products/actuators |

Rule of thumb for model: frame depth 127 mm; blades span the 600 mm width, rotate about horizontal
axes; one blade axle extends past the frame side ≥37 mm for the actuator clamp.

---

## 2. Part census (and what MOVES)

| # | Part | Geometry notes | Moves? |
|---|---|---|---|
| 1 | Frame | 4-sided channel/hat profile 127×25 mm, galvanized, reinforced corners; optional duct flanges both faces (TROX style) | static |
| 2 | Mounting flanges | perimeter angle/flange with bolt holes on both faces | static |
| 3 | Blades ×3 | airfoil double-skin, 152 mm chord, span ~590 mm | **rotate ±90° about own axle; OPPOSED: adjacent blades rotate in opposite directions** |
| 4 | Blade axles ×3 | Ø12–13 mm (hex or round), protrude into frame side channel | rotate with blade |
| 5 | Linkage (out-of-airstream, in side channel): drive arms/cranks per blade + coupling/tie rod + transverse link (the part that creates opposed action) | visible in ref-2.jpg close-up | **translates/rotates as blades move** |
| 6 | Jackshaft / drive shaft | on multi-section banks, a continuous rod driving several sections (visible in ref-3.jpg) | rotates |
| 7 | Side/jamb seals | flexible metal or silicone strips in the jambs | static |
| 8 | Blade edge seals | black extruded rubber/EPDM on blade edges, pressure-activated (Greenheck) | move with blades |
| 9 | Axle bearings | plastic/brass/stainless flanged bushings at frame (TROX options) | static (axle spins inside) |
| 10 | Actuator body | Belimo LM-class box ~163×66×61 mm, mounted astride the protruding spindle | static housing |
| 11 | Actuator U-clamp / universal spindle clamp | toothed clamp + 2 bolts on shaft end (Ø6…20 mm range) | **rotates with shaft** |
| 12 | Anti-rotation strap/bracket | small bent-metal strap from actuator foot to duct/frame, prevents housing spin | static |
| 13 | Manual override pushbutton | self-resetting button on housing (disengages gear latch) | static (detail) |
| 14 | Position indicator | mechanical, pluggable pointer on the clamp + printed 0–90° arc (see ref-1.jpg) | **pointer rotates with shaft** |
| 15 | Cable / conduit | 1 m, 3×0.75 mm² pre-wired cable exiting housing (LM24A); often flex conduit on site | static |

Animation hierarchy this implies:
```
DamperRoot
├── Frame (+flanges, jamb seals, bearings)        [static]
├── Blade_1 (axle pivot)  → rot +θ
├── Blade_2 (axle pivot)  → rot −θ   ← opposed
├── Blade_3 (axle pivot)  → rot +θ
├── Linkage (tie rod: position driven by crank of Blade_2)
└── ActuatorGroup (static housing + anti-rotation strap)
    └── ShaftClamp+IndicatorPointer → rot with Blade_2 axle (drive blade), max 95°
```
Drive blade convention: actuator mounts on one blade axle ("second blade from the top" per TROX JZ);
the tie rod distributes motion; transverse link reverses direction for opposed blades.

---

## 3. PBR evidence per surface family

Golden rule (repo HANDBOOK §3.1, backed by Filament + glTF 2.0 spec): metalness is near-binary —
0 for dielectrics (paint, plastic, rubber), ~1 for real bare metals. Intermediate metalness on solid
untextured surfaces is an authoring artifact.

| Surface family | baseColor | metalness | roughness | Source / confidence |
|---|---|---|---|---|
| Galvanized steel frame + blades | light grey `#b8bcbe`, slight blue-grey; spangle optional via texture | **0.9–1.0** | 0.35–0.55 (matte galv sheet; new sheet lower, weathered higher) | metalness: HANDBOOK §3.1 (`skid` "acero galvanizado" 0.9–1.0). Roughness: no hard datasheet value — authoring guidance from PBR DBs (https://physicallybased.info/, galvanized texture refs cgbookcase.com/textures/galvanized-steel-01). Confidence: metalness HIGH, roughness MEDIUM |
| Plated/zinc axle, hex shaft, bolts | near-white steel `#c8c8cc` | 1.0 | 0.25–0.4 (brighter than frame) | Ruskin "1/2 in plated steel" + HANDBOOK binary-metal rule |
| Actuator housing — LM/NM non-spring | **black / very dark grey glass-fibre-reinforced plastic**, `#1e1e20` | 0.0 | 0.5–0.7 (matte molded plastic) | Belimo LM24A product photos (https://www.belimo.com/us/en_US/products/actuators). Datasheet does not state material explicitly — confidence MEDIUM; verify against product photo in P2 |
| Actuator housing — spring-return safety variant (BF/BLF/AFB) | **Belimo signature orange** `#e8631a` approx | 0.0 | 0.45–0.6 | direct photo evidence ref-1.jpg, ref-3.jpg (orange housings on real installs) |
| Labels on actuator | white/light grey printed panel, black text | 0.0 | 0.3–0.5 | ref-1.jpg |
| Position indicator pointer + clamp | bright zinc-plated stamped steel pointer over black printed 0–90 arc (ref-1); some models molded yellow pointer | pointer 1.0 (plated) or 0.0 (if yellow plastic) | 0.3–0.45 | ref-1.jpg (metal pointer variant). Yellow-plastic variant confidence LOW — pick metal variant, it is photo-backed |
| Blade edge / jamb seals | black rubber/EPDM `#161616` | 0.0 | 0.85–0.95 | Greenheck VCD-33 "blade seals — pressure activated"; rubber = dielectric per HANDBOOK rule |
| Cable | black PVC jacket | 0.0 | 0.6–0.8 | LM24A datasheet (cable 1 m, 3×0.75 mm²) + ref-1.jpg |

---

## 4. Reference images (saved in this dir — INTERNAL REFERENCE ONLY, do not redistribute)

| File | Source URL | License | Verdict | Rationale (isolation / silhouette / occlusion) |
|---|---|---|---|---|
| `ref-1.jpg` | https://commons.wikimedia.org/wiki/File:Fire_damper_KPU_(01).jpg (upload.wikimedia.org/wikipedia/commons/b/bc/Fire_damper_KPU_%2801%29.jpg) | CC0 | **pass** | Close-up of Belimo (orange, BLF-class) actuator clamped on damper spindle on galvanized casing: U-clamp, position-indicator arc + metal pointer, anti-rotation bolts, twin cables, labels all legible. Object fills frame, minimal occlusion. Fire-damper casing, not multileaf — use for ACTUATOR detail only |
| `ref-2.jpg` | https://commons.wikimedia.org/wiki/File:Fire_and_smoke_dampers_1_of_3.jpg | CC BY 3.0 | **pass** | Crated multileaf damper bank, front 3/4: blades, axles, external crank arms + tie-rod linkage and jackshaft stubs clearly visible; galvanized finish reads well. Best source for blade/linkage geometry. Minor occlusion by crate timber at edges |
| `ref-3.jpg` | https://commons.wikimedia.org/wiki/File:Installing_dampers_in_a_vent_facility_in_Queens._08-01-2019_(48441517047).jpg | CC BY 2.0 | **conditional** | Large installed damper wall with three orange Belimo actuators on a continuous jackshaft — great for actuator-on-frame placement and multi-section composition; but ladder occludes right side and blades are backlit (silhouette reads, surface detail does not) |
| (rejected, not kept) | MTA "Installation of Damper Actuator... Plaza Vent Facility" commons photo | CC BY 2.0 | reject | Wide construction scene; damper/actuator not isolated, unreadable silhouette, heavy occlusion |

License caveat: CC0/CC-BY photos used as internal modeling reference only; if ever published, CC-BY
requires attribution (MTA Capital Construction / respective uploaders).

---

## 5. Proposed critical features (what makes it read as a motorized damper)

1. **Opposed blades visibly counter-rotating** — 3 airfoil blades; adjacent blades rotate in
   opposite directions, ±90° range (actuator limit 95°). Threshold: at 45° open, blade 1/3 tilt one
   way, blade 2 the other; NEVER parallel motion in the hero animation.
2. **Actuator clamped on a protruding shaft, off the frame face** — box (~163×66×61 mm, correct
   ~0.27:1 ratio vs 600 mm frame width) sits proud of the frame side on a ≥37 mm spindle stub, with
   visible U-clamp bolts and an anti-rotation strap to the frame. Threshold: actuator must NOT be
   flush-glued to the frame; air gap of one clamp width between housing and frame face.
3. **Position indicator that actually rotates** — pointer + printed 0–90° arc on the clamp end;
   pointer angle == drive-blade angle at all times. Threshold: readable at hero-camera distance;
   rotation synced 1:1 with the drive blade.
4. **Flanged galvanized channel frame** — 127 mm deep channel with perimeter flanges/bolt pattern,
   metalness ≈1.0 light-grey galvanized; visibly a frame with depth, not a flat plate. Threshold:
   frame depth ≥ 0.2× face height; corner reinforcement or flange line visible.
5. **Exposed side linkage** — crank arms on each axle + tie rod (and transverse link) in the side
   channel, moving as blades move (as in ref-2.jpg). Threshold: at least crank+tie-rod bar per
   blade on ONE side, animated coherently with blade angles (linkage may be simplified but must
   translate when blades rotate).

---

## Source index

- Belimo LM24A datasheet (PDF): https://www.belimo.com/mam/general-documents/datasheets/en-gb/belimo_LM24A_datasheet_en-gb.pdf (mirror used for extraction: https://www.novreczky.eu/belimo/pdf/lm24a.pdf)
- Belimo actuators overview: https://www.belimo.com/us/en_US/products/actuators
- Greenheck VCD-33 submittal: https://content.greenheck.com/public/DAMProd/Original/10003/vcd-33_submittal.pdf
- Ruskin CD60 model page: https://www.ruskin.com/model/cd60
- TROX JZ multileaf damper: https://www.troxuk.co.uk/multileaf-dampers/jz-ffcab35c805db5a4
- Repo PBR palette: /home/cristian/prototipos/three.js/research/HANDBOOK.md §3.1
- PBR value guidance: https://physicallybased.info/ ; https://www.cgbookcase.com/textures/galvanized-steel-01
