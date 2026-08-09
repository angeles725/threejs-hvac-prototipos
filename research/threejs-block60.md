# Block 60 — Access control: the turnstile is fully published, the barrier only half is

> Research of **G72 — vehicle and pedestrian ACCESS-CONTROL dimensional reference** for the
> `disenos/catalog/` build (RUN 10, fourth of the dimensional axis after [Block 57], [Block 58],
> [Block 59]). Scope: the **tripod turnstile** and the **vehicle boom barrier**. The two subjects
> ended at DIFFERENT evidence levels and this block says so rather than levelling them: the
> turnstile datasheet publishes a full dimensional table; the barrier vendors publish boom lengths
> and timings but not a cabinet envelope.
>
> Subject version: Shancharm XC-AT103 vertical tripod datasheet (v1, 2026-04) · FAAC 620 barrier
> gate operator manual · FAAC B680 product page (fetched 2026-08-08). `sha256` in `SOURCES.md`.
>
> Sources (preserved BEFORE citing → `sources/B60-access-dims/`, extracted →
> `sources/extracted/`): `shancharm-tripod-at103.pdf` (sha256 `730140ef…`) ·
> `faac-620-barrier.pdf` (sha256 `09656864…`) · `https://www.faac.co.uk/barriers/b680-automatic-barrier`
> (`[CERT-web]`, 2026-08-08). Method: datasheet transcription + one negative finding (§60.3).
> Markers: `[CERT-doc]` preserved datasheet/manual · `[CERT-web]` official web (URL + date) ·
> `[INFER]` deduction.
>
> Domain-reference layer. Connects [Block 57] and [Block 59].

---

## 60.1 — Tripod turnstile: a complete envelope `[CERT-doc]`

From `sources/B60-access-dims/shancharm-tripod-at103.pdf` — the specification table is unusually
complete for this class, so almost nothing needs inferring:

| Property | Value | Citation |
|---|---|---|
| Product dimensions | **450 × 420 × 980 mm** (standard, customizable) | `:p.1` |
| Channel (passage) width | **500 mm – 550 mm** | `:p.1` |
| Arm length | **510 mm** (standard) | `:p.1` |
| Net weight | **25 kg** | `:p.1` |
| Material | **304 stainless steel** (316 optional) | `:p.1` |
| Surface | brushed / polished / electroplated finish | `:p.1` |
| Solenoid | DC 24 V | `:p.1` |
| Work direction | two-way standard, one-way optional | `:p.1` |
| Emergency behaviour | "Automatically lowers the swing arm after a power outage" | `:p.1` |

Three of these carry straight into geometry `[INFER]`:

- The housing is **980 mm high** — waist height. It is a *pedestal*, not a full-height cage; a
  modeller who builds it person-height has built a different product.
- The **arm is 510 mm** and the passage is **500-550 mm**, so arm length ≈ channel width: the three
  arms sweep the full gap. They sit at 120° and the assembly drops when power fails `[CERT-doc]`.
- Material is **304 stainless, brushed** — the same bare-metal read as [Block 57]'s door, and the
  same vertical-plane lighting caveat applies to its housing sides `[INFER]`.

## 60.2 — Vehicle barrier: what IS published `[CERT-web]`/`[CERT-doc]`

| Property | Value | Citation |
|---|---|---|
| Boom length range | **2.50 – 8.30 m** | `[CERT-web]` faac.co.uk/barriers/b680-automatic-barrier, 2026-08-08 |
| Opening time | **1.5 s (2 m beam) to 6 s (8 m beam)**, adjustable | `[CERT-web]` idem |
| Duty cycle | continuous | `[CERT-web]` idem |
| Supply / power | 24 V, 240 W | `[CERT-web]` idem |
| Installation clearance | the beam must not move within **2 feet (610 mm)** of a rigid object | `[CERT-doc]` `faac-620-barrier.pdf :p.363` |

The 610 mm rule is the one worth modelling: it is a *keep-clear envelope* around the swept beam, so
a barrier placed hard against a wall or a kerb is wrong even if the barrier itself is right
`[CERT-doc]`/`[INFER]`.

## 60.3 — What is NOT published, and why the spec must say so `[INFER]`

Neither the FAAC operator manual nor the B680 product page gives a **cabinet envelope** — no
housing height, width or depth. The manual is an installation/programming document (its "mm"
tokens are clearances and wiring notes, not a dimension table) and the product page defers to
downloadable drawings that are not part of the fetched content `[CERT-web]`.

So the barrier's spec splits by confidence, and the split is the finding:

- boom length, timing, supply, and the 610 mm clearance → **high**, cited above;
- cabinet height/width/depth → **low**, `[INFER]`, sized against the boom pivot height a driver
  expects (~1.0 m) and never claimed as certified.

`tried:` FAAC B680 product page (specs table without a dimension row) · FAAC 620 operator manual
(installation + programming, no envelope table) · CAME range summary via search (opening widths and
times only). What the sources DO settle is the *kinematic* envelope, which is what the animation
needs; only the housing box stayed unmeasured `[INFER]`.

This is the same pattern as [Block 59] §59.6 with the security door, at a milder grade: there the
subject had no usable source at all and was re-scoped; here two thirds of the subject is certified
and only the enclosure is soft. Recording WHICH third is soft is what keeps a later reader from
trusting the whole spec equally.

## 60.4 — Translation to design-specs `[INFER]`

`puertas/torniquete`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `housing_m` | 0.450 × 0.420 × 0.980 | high | `[CERT-doc]` |
| `channel_w_m` | 0.520 | high | `[CERT-doc]` 500-550 range |
| `arm_len_m` | 0.510 | high | `[CERT-doc]` |
| `arm_count` / `arm_angle` | 3 / 120° | high | tripod by definition + `[CERT-doc]` |
| `material` | 304 stainless, brushed | high | `[CERT-doc]` |

`puertas/barrera-vehicular`:

| Field | Value | Confidence | Evidence |
|---|---|---|---|
| `boom_len_m` | 4.00 | high | `[CERT-web]` inside 2.50-8.30 |
| `open_time_s` | ~3 | high | `[CERT-web]` interpolated in the published band |
| `keepclear_m` | 0.610 | high | `[CERT-doc]` |
| `cabinet_m` | 0.32 × 1.05 × 0.28 | **low** | `[INFER]` — NOT published anywhere reachable |

## 60.5 — Connections

- **[Block 57]** — 304 stainless read and the vertical-plane lighting caveat, reused by the
  turnstile housing.
- **[Block 59]** — the sibling that established the "brochure is not a datasheet" rule; here the
  refinement is that a MANUAL is not a datasheet either — an install/programming manual can be
  primary and still carry no dimension table.
- **G73 (NEW)** — sliding gate (`porton-corredizo`) and personnel airlock (`esclusa-personal`)
  remain unsourced; not investigated in this block.
