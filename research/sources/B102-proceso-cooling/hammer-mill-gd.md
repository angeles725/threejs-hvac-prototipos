# Large-chamber hammer mill (GD) — preserved source extracts

Fetched: 2026-08-09
Block: B102 (assigned by session-A to cover BOTH subjects of this session, tunel-enfriamiento and
molino; the folder keeps the name it was created with — the block number is the identity, the
folder name is not).
Marker: [CERT-doc] quoted from a manufacturer datasheet held on disk · [CERT-a] secondary ·
[INFER] derived here.

Serves: `disenos/catalog/proceso/molino/`

---

## 1. The datasheet

Source: Tietjen Verfahrenstechnik GmbH, "LARGE CHAMBER HAMMER MILL GD", Version 09/2023.
Retrieved as a PDF attached to a UK Environment Agency permit consultation (Hartlepool MRF,
EPR/GP3399LG v006) and read locally with `pdftotext -layout`. [CERT-doc]

> "the large chamber hammer mill GD ... design as a large chamber mill with a diameter of the
> grinding chamber of 1200 mm and with a width of up to 1250 mm"

| Type | GD 12 | GD 20 | GD 25 |
|---|---|---|---|
| Grinding chamber diameter (mm) | 1200 | 1200 | 1200 |
| Screen width (mm) | 640 | 1000 | 1250 |
| Grinding chamber area (m²) | 1,84 | 2,88 | 3,60 |
| Length × width × height (approx. mm) | 2610 × 1600 × 16000 | 3050 × 1600 × 16000 | 3300 × 1600 × 16000 |
| Weight without motor (approx. kg) | 1900 | 2400 | 2800 |
| Motor size (kW) | 160–250 | 250–355 | 355–450 |
| Speed 50/60 Hz (rpm) | 1500/1800 | 1500/1800 | 1500/1800 |

**The height figure is transcribed as printed and is an obvious typo in the source.** "16000 mm"
would be a 16 m tall machine wrapped around a 1.2 m chamber. The modelled value is 1600 mm, which
is the only reading consistent with the chamber diameter and with the width printed beside it in the
same cell. This is recorded rather than silently corrected: the number used is a JUDGEMENT about a
defective source, not a datasheet value, and it carries `med` confidence for that reason.

## 2. Named construction details — all quoted

> "4-part screen segments without frame, easy and quick to change segment by segment"

> "Wide-opening doors allow easy and quick access to the machine interior"

> "Quick and easy beater change due to beater frame system, beaters can be changed outside the mill"
> · "1 set of beaters, ready mounted on beater frames"

> "Optimised impact zone with hardened impact plates on both sides of the inlet"

> "Manually operated inlet flap with position switch for changing the direction of rotation"

> "Sealing flange for the grist outlet"

> "Flexible cam coupling (N-EUPEX) with coupling guard"

> "Vibration dampers, height adjustable"

> "Durable, optimised rotor design, dynamically balanced, operation in both directions of rotation"

> "foreign body catch trap for impurities inside the grinding chamber"

> "Pressure shock resistant and flameproof design (0.4 bar)" · "Automatic door locking with
> standstill monitoring"

**What this pins down (shape facts):** the beaters are NOT free-swinging hammers on a bare pin —
they arrive mounted on FRAMES that lift out of the mill as a unit. The screen is in FOUR segments
and carries no frame of its own. The doors are a maintenance feature large enough to reach the
whole interior. The motor drives the rotor through a cam coupling inside a guard, so motor and rotor
are COAXIAL on one base — a mill drawn with a motor slung under or beside the chamber, belt-driven,
is a different machine.

## 3. The screen wrap — DERIVED, and the derivation is the finding

The datasheet gives a "grinding chamber area" per model. Dividing it by that model's screen width:

    GD 12:  1.84 m² / 0.640 m = 2.875 m
    GD 20:  2.88 m² / 1.000 m = 2.880 m
    GD 25:  3.60 m² / 1.250 m = 2.880 m

The same arc length, 2.88 m, in all three — which is what it should be, since all three share the
1200 mm chamber. Against the full circumference (π × 1.2 = 3.770 m) that is **76.4%, i.e. about
275° of wrap**. [INFER] from [CERT-doc] figures.

So the screen is NOT a grate under the rotor covering the bottom half; it very nearly surrounds it,
leaving roughly 85° open at the top — exactly where the inlet with "hardened impact plates on both
sides" has to be. Two independent statements agreeing is what makes this usable: the arithmetic says
there is one gap of ~85°, and the prose says the inlet sits between impact plates.

Confidence `med`, not `high`: it depends on reading "grinding chamber area" as the screen area. It
is used to place the screen segments and the inlet gap, and nothing else is built on top of it.

## 4. Architecture — secondary corroboration

Source: Stedman Machine Company, hammer mill grinders page, read 2026-08-09. [CERT-a]

> reduction happens by "Shattering by revolving hammers", "Impaction against housing liners",
> "Grinding on the adjustable grinding plate" and "Shearing by the grate bars or screen"

> models use "perforated screens or grate bars for reducing soft to medium hard materials"

Published speeds 900–3600 rpm and 30–250 HP for its own (smaller) range. It does NOT publish rotor
diameters, and is therefore used only to corroborate the reduction path, never for dimensions.

## 5. Not found — declared, not invented

No source in reach gives the beater count, the beater-frame geometry, the hammer-circle diameter,
the screen perforation or thickness, the door hinge layout, or the inlet chute size. All [INFER],
sized against the 1200 mm chamber and the 2610 × 1600 × 1600 envelope, declared `low`.
