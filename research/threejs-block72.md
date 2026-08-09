# Block 72 — Material-handling vehicles and the overhead crane: VDI 2198 hands you the whole envelope, the crane catalogues hand you almost nothing

> Research of **G72 — MATERIAL-HANDLING VEHICLE + overhead-crane dimensional reference** for the
> `disenos/catalog/transporte` build (RUN 11, sibling of [Block 71]). Scope: `montacargas`
> (counterbalance forklift), `transpaleta` (hand pallet truck), `apilador` (walkie stacker), and
> `grua-puente` (EOT bridge crane).
>
> Sources (all preserved BEFORE citing, `fetch-doc.sh` → `sources/datasheets/` + `sources/web-snapshots/`;
> text-layer extracted with `extract-pdf.sh` — no OCR):
> `220991868-erp16-20vf-a955-spec-sheet-rev-00-en-low-res.pdf` (Yale ERP16-20VF, 4-wheel electric
> counterbalance 1,600–2,000 kg, 8 p., sha256 `622dccb3…`) ·
> `24114_Original document_toyota mh.pdf` (Toyota LHM300 L-series hand pallet truck 3.0 t, sha256
> `21477a41…`) · `www.abuscranes.com_…_single-girder-overhead-trav.md` (ABUS official product page,
> fetched 2026-08-08) · `www.craneyt.com_comprehensive-guide-to-double-girder-bridge-crane-design.html.md`
> (supplier engineering guide — SECONDARY, fetched 2026-08-08).
> Markers: `[CERT-doc]` preserved datasheet (`sources/...pdf :p.N`) · `[CERT-web]` official web ·
> `[CERT-a]` secondary/supplier guide · `[INFER]` deduction.
>
> Block type: **EVIDENCE**. Connects [Block 58] (the EUR pallet all of these carry), [Block 71] (the
> conveyor siblings), [Block 57] (the datasheet discipline and its honest-negative pattern).

---

## 72.1 — Why the forklift is the easiest catalog subject so far, and the crane the hardest `[INFER]`

Every prior dimensional block fought the same problem: manufacturers publish a maximum, or a photo, and
no nominal geometry ([Block 57] §57.6, [Block 58]'s rejected brochure). The industrial truck is the
exception, and the reason is a standard whose entire purpose is dimensional disclosure: **VDI 2198**
prescribes a type sheet where every dimension is a numbered row with a coded symbol (`l2`, `b1`, `h1`,
`y`, `Wa`…). Every manufacturer publishes it, so the full modelling envelope of a forklift is available
as tabulated numbers.

The crane has no equivalent. Span and capacity are published; girder depth, end-carriage wheelbase and
hook approach vary per configuration and live in per-project drawings. §72.4 says so explicitly rather
than inventing them.

## 72.2 — Counterbalance forklift: the VDI 2198 envelope `[CERT-doc]`

All values from `sources/datasheets/220991868-erp16-20vf-a955-spec-sheet-rev-00-en-low-res.pdf :p.4`
(Yale ERP16-20VF, 1,600–2,000 kg electric 4-wheel, columns = model variants):

| VDI row | Property | Symbol | Value (mm unless noted) |
|---|---|---|---|
| 1.6 | Load centre distance | `c` | **500** |
| 1.9 | Wheelbase | `y` | **1431 / 1539** |
| 2.1 | Service weight | — | **3036 / 3209 / 3288 kg** |
| 3.6 | Tread, front | `b10` | **889 / 908** |
| 4.1 | Tilt of mast/fork carriage fwd/back | `α/β` | **5° / 5°** |
| 4.2 | Height, mast lowered | `h1` | **2230 / 2180** |
| 4.3 | Free lift | `h2` | **100** |
| 4.5 | Height, mast extended | `h4` | **3868 / 4006** |
| 4.7 | Height of overhead guard | `h6` | **2070** |
| 4.8 | Seat height | `h7` | **1017** |
| 4.19 | Overall length | `l11` | **2980 / 3088 / 2975** |
| 4.20 | Length to face of forks | `l2` | **1980 / 2088 / 1975** |
| 4.21 | Overall width | `b1/b2` | **1050** (1116 with the wider tyres required for masts ≥ 5000) |
| 4.22 | Fork dimensions ISO 2331 | `s/e/l` | **40 / 80 / 1000** |
| 4.31 | Ground clearance below mast, laden | `m1` | **70** |
| 4.32 | Ground clearance at wheelbase centre | `m2` | **100** |
| 4.33 | Load dimension crossways | `b12 × l6` | **1000 × 1200** |
| 4.35 | Turning radius | `Wa` | **1654 / 1762** |

Four things a modeller gets wrong without this table:

1. **The truck is longer behind the forks than the forks are long.** `l11 − l2 ≈ 1000 mm` is the fork
   length; the remaining ~2000 mm is body plus counterweight. The mass sits BEHIND the front axle —
   that is the entire physical principle of a counterbalance truck, and it must read in the silhouette.
   `[INFER]`
2. **The forks are 1000 mm, not 1200.** ISO 2331 `s/e/l = 40/80/1000` `[CERT-doc]` — so a 1200 mm-deep
   EUR pallet ([Block 58]) OVERHANGS the fork tips by 200 mm when entered from the 1200 side. Modelling
   forks that fully underrun the pallet is wrong for this class.
3. **Mast travel is 2230 → 3868 mm**, with only **100 mm of free lift** — the inner mast starts rising
   almost immediately. A model that animates lift must move the mast stages, not just the carriage.
4. **Tilt is ±5°**, not the ±6/12° often quoted for IC trucks; the mast is close to vertical at rest.

The load centre `c = 500 mm` is the convention every capacity rating is stated at `[CERT-doc]` — worth
a HUD line, since it is what makes "2,000 kg" meaningful.

## 72.3 — Hand pallet truck: an unusually complete envelope, and the 520/685 non-conflict `[CERT-doc]`

All values from `sources/datasheets/24114_Original document_toyota mh.pdf :p.2` (Toyota LHM300 L-series,
3.0 t):

| VDI row | Property | Symbol | Value |
|---|---|---|---|
| 1.8 | Load distance, drive-axle centre to fork | `x` | **970 mm** (forks raised) |
| 1.9 | Wheelbase | `y` | **1185 mm** |
| 3.2 | Wheel size, front (steer) | — | **175 × 60 mm** |
| 3.3 | Wheel size, rear (load rollers) | — | **85 × 75 mm** |
| 3.5 | Wheels, number front/rear | — | **2 / 4** |
| 3.6 / 3.7 | Track width front / rear | `b10`/`b11` | **132 / 340 mm** |
| 4.4 | Lift | `h3` | **115 mm** |
| — | Lift height | `h23` | **200 mm** |
| 4.9 | Tiller height, drive position | `h14` | **1220 mm** |
| 4.15 | Height, lowered | `h13` | **85 mm** |
| 4.19 | Overall length | `l1` | **1510 mm** |
| 4.20 | Length to face of forks | `l2` | **365 mm** |
| 4.21 | Overall width | `b1/b2` | **520 / 685 mm** |
| 4.22 | Fork dimensions | `s/e/l` | **45 / 175 / 1150 mm** (1220 also available) |
| 4.25 | Width over forks | `b5` | **520 / 685 mm** |
| 4.32 | Ground clearance at wheelbase centre | `m2` | **40 mm** |
| 4.33 / 4.34 | Aisle width, 1000×1200 crossways / 800×1200 lengthways | `Ast` | **1540 / 1740 mm** |

**The 85 → 200 mm lift is the whole machine**: 115 mm of stroke (`h3`) is all that separates a pallet
resting on the floor from a pallet clear of it. Modelled with a visible lift travel of anything like a
forklift's, the asset stops being a pallet truck. `[CERT-doc]`/`[INFER]`

**Correction of a discovery-sweep claim** `[CERT-doc]`: the sweep reported a conflict — "520–540 mm (EU)
vs 686 mm (US), US machines are consistently wider". The preserved datasheet shows both numbers on the
SAME European model, in the SAME row: `b1/b2 = 520/685`, `b5 = 520/685`. They are two fork-spread
options of one product (narrow for entering an 800 mm EUR pallet from its long side, wide for
1000/1200 mm pallets), not a regional standards conflict. `l = 1150 mm` and `h13 = 85` / `h23 = 200`
are confirmed by primary source, so the widely-cited aggregator figures were right — for the wrong
reason.

## 72.4 — Overhead bridge crane: what is actually published, and what is not `[CERT-web]`/`[CERT-a]`

From the manufacturer's own page
(`sources/web-snapshots/www.abuscranes.com_cranes_overhead-travelling-cranes_single-girder-overhead-trav.md`,
"At a glance") `[CERT-web]`:

- **SWL up to 16 t** (single girder).
- **Spans up to 38.5 m** (SWL dependent).
- Headroom is optimised via main-girder connection variants; *"normally safety clearances below ceilings
  are not required for single girder cranes within this load range"*.

That is the whole published dimensional content — a ceiling on capacity and span, nothing about the
crane's own sections. For girder proportion the only source found is a supplier engineering guide,
recorded at its true tier `[CERT-a]`
(`sources/web-snapshots/www.craneyt.com_comprehensive-guide-to-double-girder-bridge-crane-design.html.md`):

- Main girder **height-to-span ratio between 1/14 and 1/18**;
- web thickness **≥ 6 mm**, with large stiffeners spaced **no more than the beam height** apart;
- mid-span deflection under rated load **≤ 1/700 to 1/1000 of span**;
- modern designs often use an **off-track** layout (rails not on the girder centreline) for lateral
  stability and trolley placement.

Applied to a modelled 16 m span, 1/14–1/18 gives a girder **0.89–1.14 m deep** — a proportion, not a
certified dimension, and the design-spec must carry it as `[CERT-a]`/`[INFER]` with `confidence: med`.
The stiffener spacing rule is the useful part for geometry: internal stiffeners at roughly one
girder-depth pitch is what makes a box girder read as a box girder. `[INFER]`

**Honest negatives for the crane** — NOT fixed by any preserved source: end-carriage wheelbase, runway
rail height and section, hook approach (both sides), trolley envelope, wheel diameters, and the standard
span series. The EN 15011 and CMAA 70 texts that would settle them are paywalled; the free ANSI/BSI
preview shows structure only. A `grua-puente` design-spec may claim `confidence: high` for nothing but
the capacity/span ceiling above.

## 72.5 — Walkie stacker: deliberately not asserted `[INFER]`

No stacker datasheet was preserved in this iteration. Every number the discovery sweep offered came from
distributor hosts, a VNA truck of a different class (mast retracted > 6 m — not a walkie stacker), or a
commodity reseller. Rather than pad the block, `apilador` stays open: it is either modelled from a
datasheet fetched in its own iteration, or its spec declares the whole envelope `[INFER]`/low. Recorded
as a NEW gap (G74).

## 72.6 — What this block does NOT resolve

- Crane geometry beyond §72.4's proportional rule (see the honest-negative list there).
- The stacker envelope entirely (§72.5).
- Forklift mast STAGE geometry: the table gives lowered/extended heights, not the number of stages or
  the section overlap. A two- or three-stage mast is a `[INFER]` choice.
- Counterweight shape. `l11 − l2` bounds its LENGTH; nothing bounds its profile.

## 72.7 — Self-verify note: the ratio is the finding `[INFER]`

`verify-block.sh` scores this block at **[INFER]/[CERT*] = 8/11 = 0.73** — high for an EVIDENCE block,
where §11 reads that as *"this gap's investigable evidence is nearly exhausted"*. That reading is correct
and is itself the result: the two truck subjects are fully certified from VDI 2198 type sheets, while the
crane and the stacker have no reachable primary dimensional source (EN 15011 / CMAA 70 paywalled, no
stacker datasheet preserved). The remaining `transporte` evidence is not free-web-investigable — it is
behind standards paywalls. Do not re-run this gap expecting more; G74 (stacker datasheet) is the only
part with a plausible free source.

All `[CERT]` here are `[CERT-doc]`/`[CERT-web]` page-and-URL citations, so the file:line gate resolves
nothing by construction — the load-bearing numbers were token-checked against the preserved extracts
(`sources/extracted/…`, VDI rows 1.6–4.35 for the forklift, 1.8–4.34 for the pallet truck).

## Connections

- **[Block 58]** — the EUR pallet. §72.2's 1000 mm forks under a 1200 mm pallet is the same
  overhang-geometry lesson as B58's rack-shorter-than-pallet finding, on a different machine.
- **[Block 71]** — the conveyor siblings of this family; together they cover 6 of the 7 `transporte`
  assets, `apilador` being the gap.
- **[Block 70]** — motion. A mast lifting and a fork rising CHANGE the silhouette, so §70.4 puts them in
  the class that must re-fire `shadowMap.needsUpdate` when animated — unlike the belt.
- **[Block 57]** — the honest-negative pattern: publish what the datasheet fixes, and name what it does
  not, rather than filling the gap with a plausible number.
