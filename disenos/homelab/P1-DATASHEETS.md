# homelab — P1 Datasheet Research

**Status:** P1 (reference research). Datasheet dimensions for the device inventory in [`P1-INTAKE.md`](./P1-INTAKE.md). No geometry until each asset's DesignSpec is approved (design3d Hard Rule 2).
**Method:** parallel web research (panduit.com, rockwellautomation.com, axis.com, official spec PDFs, reputable distributors). One section per device type.

**Provenance legend:**
- `[CERT-web]` — official manufacturer web page/spec
- `[CERT-doc]` — official PDF datasheet/manual (URL cited; several PDFs are binary/compressed and were not text-extractable — flagged inline)
- `[CERT-a]` — reputable distributor / secondary (CDW, DigiKey, Graybar, Anixter, OUI lookup)
- `[INFER]` — deduction, reasoning stated
- **"sin datasheet — usar aproximación de foto"** — not found; modeler must approximate from the site photos (P6)

---

## 0. Modeler quick-reference (dimensions in mm)

| # | Device | Form factor | Overall W × H × D (mm) | Confidence |
|---|---|---|---|---|
| 1 | Panduit rack PDU **EL2P** | Vertical 0U strip | **58 × 1780 × 75** (L=1780 vertical) | [CERT-a] |
| 2 | Panduit UPS **SmartZone** (×3) | Rack 2U or 3U | 2U: **440 × 86.5 × 460–640** · 3U: **440 × 131 × 666** | [CERT-doc] |
| 3 | Rockwell **Stratix 5700** switch | DIN-rail | 10-port: **91 × 129.5 × 136** (varies by variant) | [CERT-web] |
| 4 | **Axis** network camera | Indoor mini-dome | Ø79 × 56 (base cutout Ø101) | representative only |
| 5 | Panduit **FMPS** (Fault Managed Power System) | Rack 1U | **445 × 43 × 559** | [CERT-a] |

> Notes: EL2P height is the vertical strip *length*. Camera model is NOT identified — dome dims are a representative placeholder. See per-device sections for the exact provenance of each number.

---

## 1. Panduit rack PDU — familia EL2P

### Form factor
**Vertical 0U strip** mounted at the rear rack posts. `[CERT-a]` Confirmed by CDW, DigiKey, Compsource as "0U — Vertical — Rack-mountable." Two PDUs in contrasting colors (red / blue / black body) serve redundant **A and B feeds**; Panduit markets the color range explicitly for A/B identification. `[CERT-web]`

### Physical dimensions — representative unit (E42G20L, standard-width 42-outlet)
| Dimension | Imperial | Metric |
|---|---|---|
| Length (vertical height) | 70 in | **1780 mm** |
| Width | 2 in | **58 mm** |
| Depth / thickness | 3 in | **75 mm** |

Source: CDWG listing for E42G20L (EL2P MSPO PDU, 60 A, 3-ph, 42 outlets). `[CERT-a]`
> A "wide" body variant (~85 mm) is referenced in SmartZone docs but **sin datasheet confirmado para variante wide-body**.

### Outlet count and receptacle types
| Model tier | Total outlets | Configuration |
|---|---|---|
| 42-outlet (E42G20L, E42G03L) | 42 | (21) C13/C15 + (21) 4-in-1 C13/C15/C19/C21 |
| 48-outlet (E48G01L) | 48 | (24) C13/C15 + (24) 4-in-1 C13/C15/C19/C21 |

The 4-in-1 combo outlets accept C13/C15/C19/C21 in the same receptacle. `[CERT-a]`

### Monitored / intelligent head-end
All features reside in a **hot-swappable controller module** at the head of the strip (top for top-fed, bottom for bottom-fed). An internal accelerometer auto-rotates the display. `[CERT-web]`

| Feature | Detail | Confidence |
|---|---|---|
| Display | Color LCD touchscreen; exact diagonal **sin datasheet — usar aproximación de foto** | type `[CERT-web]`, size not found |
| Auto-orientation | Accelerometer rotates UI (top/bottom-fed) | `[CERT-web]` |
| Ethernet | Dual 1 GbE RJ-45 (daisy-chain up to 64 units, 1 IP) | `[CERT-web]` |
| Wireless | Wi-Fi + Bluetooth | `[CERT-web]` |
| USB port | Present (FAT32 firmware update); connector type **sin datasheet** | `[INFER]` from manual procedure |
| QR code | **sin datasheet — usar aproximación de foto** | not found |
| Hot-swap | Controller + display serviceable under live load | `[CERT-web]` |

### Input — plug / phase / rating
| Example PN | Plug | Phase | Rating | Apparent power |
|---|---|---|---|---|
| E42G03L | IEC 60309 2P+E 32A IP44 | 1-ph | 32/30 A, 230 V | — |
| E42G20L | IEC 60309 3P+E 9h | 3-ph | 60 A/phase | 17.3 kVA |
| E48G01L | IEC 60309 3P+N+E 6h | 3-ph | 63/60 A | 34.6 / 43.5 kVA |
| E48D23L | NEMA L22-30P | 3-ph | 30 A | ~11 kVA |

Family range **5–43.5 kVA**, single- and three-phase; input cord swivels 360°. `[CERT-a]`

### Sources
- https://www.panduit.com/en/products/featured-products/el2p-intelligent-power-distribution-unit.html `[CERT-web]`
- https://www.cdwg.com/product/panduit-el2p-mspo-pdu-60-amp-3-ph-42-outlets/8555341 `[CERT-a]` (dimensions)
- https://www.digikey.com/en/products/detail/panduit-corp/E48G01L/28535069 `[CERT-a]`
- https://www.graybar.com/el2p-mspo-pdu-32-30-amp-1-phase-42-outlets/p/27010069 `[CERT-a]`
- https://dcnnmagazine.com/infrastructure/power-cooling/panduit-launches-el2p-intelligent-pdu/ `[CERT-a]`
- https://www.compsource.com/buy/E48G01L/Panduit-4739 `[CERT-a]` (0U vertical)
- https://www.panduit.com/content/dam/panduit/en/website/support/download-center/documents/EL2P-PDU-User-Manual-v1-8.pdf `[CERT-doc]` (binary)
- https://networkscentre.com/blogs/news/elevate-to-power-panduit-s-new-el2p-pdu `[CERT-a]`

---

## 2. Panduit UPS (×3) — SmartZone

### Line confirmation
Panduit sells the **SmartZone™ UPS** under its own brand. Four sub-families: `[CERT-web]`

| Family | Form factor | Topology |
|---|---|---|
| 1–3 kVA VRLA single-phase | Rack/Tower 2U | Online double conversion |
| 1–3 kVA Lithium-Ion single-phase | Rack/Tower 2U | Line-interactive / online |
| 5–10 kVA VRLA single-phase | Rack/Tower 3U | Online double conversion |
| 10–20 kVA VRLA 3-phase | Rack 3U | Online double conversion |

Confirmed model numbers: **U01N11V / U02N11V / U03N11V** (1/2/3 kVA, 120 V VRLA), **U05N11V / U06N11V / U10N11V**. `[CERT-doc]` `[CERT-a]`

### Dimensions (W × D × H mm) — SmartZone UPS Installation Manual V2.3 `[CERT-doc]`
**2U (1–3 kVA):**
| Model | W × D × H (mm) | Rack |
|---|---|---|
| U01N11V / U01S11V | 440 × 460 × 86.5 | 2U |
| U02N11V / U02S11V | 440 × 460 × 86.5 | 2U |
| U03N11V / U03S11V | **440 × 600 × 86.5** | 2U |
| U03N11L (Li-Ion) | 440 × 640 × 86.5 | 2U |

**3U (5–10 kVA):**
| Model | W × D × H (mm) | Rack |
|---|---|---|
| U05N11V … U10N11V | 440 × 666.5 × 131 | 3U |

> Height 86.5 mm ≈ 2U (88.9 mm slot); 131 mm ≈ 3U. Depth grows with battery capacity.

### Rating range
- 1–3 kVA/kW single-phase 2U · 5–10 kVA/kW single-phase 3U · 10–20 kVA/kW 3-phase 3U. `[CERT-doc]` / `[CERT-web]`
- Unity power factor (kVA = kW) on online models.

### Front face
- **1–3 kVA:** 2.8-inch segmented color LCD (physically rotatable rack↔tower), 4 status LEDs + 4 buttons (Up/Down/Off-Cancel/On-Enter). `[CERT-doc]`
- **5–10 kVA:** 3.5-inch color touch screen (rotatable), Power ON/OFF button + LED indicators. `[CERT-doc]`
- **Bezel color:** not stated in fetched text — `[INFER]` dark-gray/black (panduit.com renders show dark faceplates).

### Sources
- https://www.panduit.com/en/products/featured-products/uninterruptible-power-supply.html `[CERT-web]`
- https://mkt.panduit.com/SmartZoneUPS.html `[CERT-web]`
- https://www.panduit.com/content/dam/panduit/en/products/media/7/47/947/7947/110577947.pdf `[CERT-doc]` (Install Manual V2.3 — dimension table)
- https://www.panduit.com/content/dam/panduit/en/products/media/4/74/874/6874/110376874.pdf `[CERT-doc]` (1–3 kVA Li-Ion)
- https://www.panduit.com/content/dam/panduit/en/solutions/NI-DC-SZUPS_1-3kVA_UserManual.pdf `[CERT-doc]` (display)
- https://www.digikey.com/en/products/detail/panduit-corp/U03N11V/21373935 `[CERT-a]`
- https://www.gordonelectricsupply.com/p/Panduit-U03N11V-Smartzone-Ups-3Kva-2U-120V-Vrla-Sin/7113040 `[CERT-a]`

---

## 3. Rockwell / Allen-Bradley Stratix 5700 switch

### Dimensions (bare enclosure incl. DIN clip) `[CERT-web]`
All variants share **height**; width grows with port count; depth varies by body family.
| Variant (catalog) | H (mm) | W (mm) | D (mm) | Weight |
|---|---|---|---|---|
| 6-port — 1783-BMS06SGA | 129.5 | 74.8 | 116.7 | 1.11 kg |
| **10-port — 1783-BMS10CGP** (representative) | 129.5 | 91.4 | 135.8 | 1.38 kg |
| 20-port — 1783-BMS20CGL | 129.5 | 127.0 | 135.8 | 2.04 kg |

### Mounting
**DIN rail** (35 mm top-hat, EN 50022), spring-loaded rear latch. IP30 open-style housing. No rack/panel option in the standard 1783-BMS body (ArmorStratix 5700 is the NEMA/panel variant). `[CERT-web]`

### Port layout
| Variant | RJ45 10/100 | Combo (RJ45+SFP) GbE | SFP-only | Total |
|---|---|---|---|---|
| 1783-BMS06SGA | 4 | — | 2 | 6 |
| **1783-BMS10CGP** | **8** | **2** | — | **10** |
| 1783-BMS20CGL | 16 | 2 | 2 | 20 |

10-port face: 8 RJ45 ports on the left, 2 combo uplink ports on the right; each combo has two per-port LEDs. `[CERT-web]` `[CERT-a]`

### Front-face graphics
- **System LEDs** stacked at left: EIP Mod, EIP Net, Setup, DC_A, DC_B, Alarm Out (green/red states). `[CERT-a]` (user manual p.119–120)
- **Per-port LEDs**: link/activity/fault (green/amber). `[CERT-a]`
- **Express Setup button**: recessed push-button, front face. `[CERT-a]` (1783-IN016)
- **SD card slot**: front face (IOS backup / device replacement); exact position **sin datasheet — usar aproximación de foto**.
- **Power/relay terminal block**: dual DC inputs **Pwr A / Pwr B** + 6-pin alarm relay, on **top** of enclosure. `[CERT-a]`
- **Allen-Bradley red logo** on front face (right/top-right); exact XY **sin datasheet — usar aproximación de foto**.

### Body color
Dark gray / charcoal DIN enclosure. `[CERT-a]` / `[INFER]` (no RAL/Pantone found).

### Sources
- https://www.rockwellautomation.com/en-us/products/details.1783-BMS10CGP.html `[CERT-web]`
- https://www.rockwellautomation.com/en-us/products/details.1783-BMS06SGA.html `[CERT-web]`
- https://www.rockwellautomation.com/en-us/products/details.1783-BMS20CGL.html `[CERT-web]`
- https://literature.rockwellautomation.com/idc/groups/literature/documents/td/1783-td001_-en-p.pdf `[CERT-doc]` (binary)
- https://literature.rockwellautomation.com/idc/groups/literature/documents/in/1783-in016_-en-p.pdf `[CERT-doc]` (binary)
- https://www.manualsdir.com/manuals/579905/rockwell-automation-1783-bmxxx-stratix-5700-ethernet-managed-switches-user-manual.html?page=119 `[CERT-a]`
- https://www.crawfordelectricsupply.com/product/detail/1236592/rockwell-automation-1783-bms10cgp `[CERT-a]`

---

## 4. Axis network camera

### OUI confirmation
**AC:CC:8E** is registered (MA-L) to **Axis Communications AB**, Lund, Sweden. `[CERT-a]` (maclookup.app, corroborated by cleancss.com, hwaddress.com)

### Model pinning is NOT possible from a MAC prefix
A single OUI spans every Axis product line (domes, PTZ, bullet, fisheye, radar, intercoms). **AC:CC:8E alone cannot identify the model or even the category.** `[INFER]`

> **sin datasheet del modelo exacto — usar aproximación de foto (dome genérico)**

### Recommended body form
For an indoor corporate corridor / experience-center aisle, the dominant form is the **fixed-lens mini-dome** (ceiling-mounted, compact). Bullet/box cameras are atypical indoors. Representative family: **Axis M30 mini-dome** (M3085-V, M3086-V, M3106-L). `[CERT-web]` / `[INFER]`

### Representative dimensions — AXIS M3085-V (placeholder, not a confirmed match)
| Dimension | Value |
|---|---|
| Dome body diameter | **79 mm** |
| Mounting base / cutout diameter | **101 mm** |
| Height (ceiling to apex) | **56 mm** |
| Weight | ~150 g |

`[CERT-doc]` datasheet PDF · `[CERT-web]` product page.

### Sources
- https://maclookup.app/macaddress/ACCC8E/mac-address-details `[CERT-a]`
- https://www.axis.com/products/axis-m30-series `[CERT-web]`
- https://www.axis.com/products/axis-m3085-v `[CERT-web]`
- https://www.axis.com/dam/public/15/bf/16/datasheet-axis-m3085-v-dome-camera-en-US-378406.pdf `[CERT-doc]`

---

## 5. Panduit FMPS — Fault Managed Power System

### Acronym & function
**FMPS = Fault Managed Power System** `[CERT-web]` (panduit.com/en/products/featured-products/panduit-fault-managed-power-system.html).
Class 4 power distribution (IEC TS 63049 / UL TR 63053): converts AC to pulsed high-voltage DC delivered over multi-conductor copper to receivers up to 2 km away. 4.8–6 kW per chassis, SIL3. Applications: small cells, IP cameras, DAS, remote access control. **Not** an environmental sensor or SmartZone gateway.

### Main modelable variant — PXTC1ARA (Class 4 Transmitter Chassis)
| Field | Value | Provenance |
|---|---|---|
| Form factor | 1RU rack-mount, 19" (2- or 4-post) | `[CERT-web]` |
| Width | 17.5 in → **445 mm** | `[CERT-a]` |
| Height | 1.7 in → **43 mm** (1U) | `[CERT-a]` |
| Depth | 22 in → **559 mm** | `[CERT-a]` |
| Weight (base) | ~5.78 kg | `[CERT-a]` |

> Dimensions from distributor (nassaunationalcable.com); Panduit install PDF was binary/non-extractable → `[CERT-a]`.

### Front face
| Element | Detail | Provenance |
|---|---|---|
| Module slots | 9 Transmitter Module slots | `[CERT-web]` |
| PSU slots | up to 3 Power Supply Units | `[CERT-web]` |
| NMC port | 1× RJ45 10/100Base-T (Network Management Card) | `[CERT-web]` |
| Dry contact | 1× remote-alarm connector | `[CERT-web]` |
| Status LEDs | per PSU: blue=standby / green=enabled; per-slot module LED | `[CERT-web]` |
| Display | none (managed via NMC web/SNMP) | `[INFER]` |

### Modeling fallback
> **sin datasheet legible — usar aproximación de foto**: model as standard 1U rack chassis **440 × 44 × 560 mm**, nine module slots on the front, three PSU bays; NMC ≈ 1/9 of the front width with an RJ45 + two LEDs.

### Sources
- https://www.panduit.com/en/products/featured-products/panduit-fault-managed-power-system.html `[CERT-web]`
- https://www.panduit.com/en/products/power-distribution-environmental-connectivity-hardware/fault-managed-power-systems/fault-managed-power-systems/pxtc1ara.html `[CERT-web]`
- https://nassaunationalcable.com/products/transmitter-chassis-rack-mount-bracket-pxtc1ara?variant=52030821237105 `[CERT-a]` (dimensions)
- https://www.panduit.com/content/dam/panduit/en/website/support/download-center/documents/panduit-fmps-hardware-installation-guidev3.pdf `[CERT-doc]` (binary)
- https://www.panduit.com/content/dam/panduit/en/website/support/download-center/documents/panduit-fmps-user-manualv1.pdf `[CERT-doc]`

---

## 6. P1 research gaps (carry into DesignSpec / P6)

| Device | Gap | Action |
|---|---|---|
| EL2P PDU | Display diagonal size; QR code presence/placement; USB connector type; wide-body dims | approximate from site photos at P6 |
| UPS | Bezel color unconfirmed (inferred dark) | photo-match at P6 |
| Stratix 5700 | SD-slot & AB-logo exact XY position | photo/manual-image match |
| Axis camera | **Exact model unknown** — only OUI = Axis | model as generic indoor mini-dome (M30 dims) |
| FMPS | Panduit PDFs binary → dims are distributor-sourced `[CERT-a]`, not `[CERT-doc]` | acceptable for 1U chassis; refine if PDF becomes readable |
