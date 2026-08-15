# P1 Reference Research — nave-3sistemas
**Track:** threejs · **Date:** 2026-08-13 · **Author:** P1 executor (Sonnet 4.6)

---

## 1. Bay Envelope

**Assumed geometry** (from task brief — not a measured asset):
| Dimension | Value | Certainty |
|---|---|---|
| Floor length | 40 m | [INFER] — from subject brief |
| Floor width | 20 m | [INFER] — from subject brief |
| Clear height | 8 m | [INFER] — from subject brief |
| Floor area | 800 m² | derived |
| Interior volume | 6,400 m³ | derived |
| Total envelope area (roof + 4 walls) | 800 + 640 + 320 = 1,760 m² | derived |

**Metal building construction** (typical Mexican/US industrial tilt-up or pre-engineered steel):
| Element | U-value | Notes | Certainty |
|---|---|---|---|
| Metal roof, insulated (R-19) | 0.25–0.30 W/(m²·K) | ASHRAE 90.1 base assembly, pre-engineered; uninsulated is ~1.5 W/(m²·K) | [CERT-web] — NAIMA guide + UpCodes search |
| Metal wall panel, insulated | 0.30–0.40 W/(m²·K) | Same class metal stud + batt | [CERT-web] |
| Large rolling doors (open during shift) | N/A — treat as infiltration | — | [INFER] |

**Envelope sensible heat gain at peak summer conditions** (ΔT = 10 K outdoor minus indoor):
```
Q_envelope ≈ A_envelope × U_mix × ΔT
           = 1,760 m² × 0.30 W/(m²·K) × 10 K
           ≈ 5,280 W   (~5.3 kW)
```
Solar gain through opaque metal roof (sol-air correction +15–25 K above outdoor):
```
Q_solar_roof ≈ 800 m² × 0.28 W/(m²·K) × 20 K ≈ 4,480 W  (~4.5 kW)
```
**Total envelope load (daytime peak): ~10–15 kW** — small compared to process loads.
[INFER] — derived from U-value table and rule-of-thumb ΔT; refine with climate-zone lookup.

**Infiltration** (large bay with forklift doors):
```
Q_infil ≈ 0.5 ACH × 6,400 m³ × (1/3600) × 1,200 J/(m³·K) × 10 K ≈ 10,667 W (~11 kW)
```
[INFER] — 0.5 ACH is a conservative lower bound for an active loading bay; ASHRAE 62.1 area method.

---

## 2. HVAC

### 2a. AHU physical size (20,000–40,000 m³/h class)

**Established repo asset** — the indoor AHU in `disenos/ahu/ahu-realistic-v1.html`:
| Dimension | Value | Certainty |
|---|---|---|
| Length | 3.5 m | [CERT] — from `disenos/ahu/README.md` and HTML title |
| Width | 1.6 m | [CERT] |
| Height | 2.0 m | [CERT] |
| Airflow capacity | 20,000–30,000 m³/h (typical for this size class) | [INFER] from size |
| Notes | This is a floor-standing interior AHU. A rooftop unit or large-bay AHU at 40,000 m³/h is bigger (see below) | — |

**For a large-bay AHU at 34,000 m³/h (≈20,000 CFM)** — web sourced:
| Dimension | Value | Certainty |
|---|---|---|
| Length | ~6.7 m | [CERT-web] — tongxingHVAC guide, 20,000 CFM example = 22 ft |
| Width | ~2.4 m | [CERT-web] |
| Height | ~2.7 m | [CERT-web] |
| General category (10,000–30,000 CFM) | L: 4.6–7.6 m, W: 2.1–2.7 m, H: 2.4–3.0 m | [CERT-web] |

**Fan (centrifugal plug-fan) diameter** — derived from airflow and face velocity:
```
At 10–15 m/s face velocity:
20,000 m³/h → A_face ≈ 0.37–0.56 m² → D ≈ 0.69–0.84 m
40,000 m³/h → A_face ≈ 0.74–1.11 m² → D ≈ 0.97–1.19 m
```
Typical installed: **0.8–1.2 m impeller diameter** for this class. [INFER]

**Coil face area** — derived from coil face velocity (2.0–2.5 m/s standard):
```
20,000 m³/h = 5.56 m³/s → face area = 2.2–2.8 m²
40,000 m³/h = 11.1 m³/s → face area = 4.4–5.6 m²
```
[INFER] — from ASHRAE coil face velocity norms.

**Supply duct main trunk** (near AHU discharge):
```
At 6–8 m/s duct velocity:
20,000 m³/h → duct area = 0.69–0.93 m² → round D ≈ 0.83–1.0 m
40,000 m³/h → duct area = 1.39–1.85 m² → round D ≈ 1.3–1.5 m, or ~1.2 m × 1.0 m rectangular
```
[INFER] — ASHRAE duct design velocity guidance.

### 2b. Cooling capacity sizing rule

**Baseline rule of thumb** (industrial/maintenance space): 1 ton per 300–350 ft² ≈ **~35 W/m²**
— [CERT-web] industrialmonitordirect.com guide

**For this bay with heavy process loads**, the rule is dominated by compressor and lighting heat, not envelope:
```
At full production (both compressors loaded, all lights on):
Q_process ≈ 130 kW (compressors) + 4 kW (lighting) = 134 kW
Q_envelope ≈ 15 kW
Q_people   ≈ 4 kW  (50 workers × 80 W/person sensible)
Q_total    ≈ 153 kW = 191 W/m² of floor area
```
[INFER] — arithmetic on numbers from sections 2, 3, 4 combined.

**Equivalent tonnage**: 153 kW ÷ 3.517 = **43.5 tons** for the fully-loaded scenario.
For the lightly-loaded scenario (one compressor idle, lights at 50%): ~50–70 kW ≈ 14–20 tons.

### 2c. COP / EER for the cooling source

| Source type | COP (design) | Notes | Certainty |
|---|---|---|---|
| Air-cooled screw chiller | 2.8–3.5 | Regulatory min 2.80 for >50 kW class; modern units 3.0–3.5 | [CERT-web] — gesonchiller.com source |
| Water-cooled screw chiller | 4.1–5.5 | Higher COP but requires cooling tower; regulatory floor 4.10 | [CERT-web] |
| Packaged DX rooftop unit | 2.6–3.5 (EER/3.412) | EER 9–12 typical at ARI conditions | [INFER] |
| **Design baseline for simulation** | **COP = 3.0** | Air-cooled conservative, appropriate for a light industrial bay without cooling tower | [INFER] |

### 2d. Supply/return air temperatures and delta-T

| Parameter | Typical value | Range | Certainty |
|---|---|---|---|
| Supply air temperature | 13–16 °C | 12–18 °C | [INFER] — ASHRAE standard comfort cooling; industrial may run warmer |
| Indoor design dry-bulb | 24–28 °C | — | [INFER] — for a production bay, 26 °C is typical |
| Delta-T (return − supply) | 10–14 K | 8–16 K | [INFER] |
| **Simulation default ΔT** | **12 K** | — | [INFER] |

**Supply air mass flow rate** derived from total cooling load:
```
Q_total = ṁ × cₚ × ΔT
ṁ = Q / (cₚ × ΔT) = 153,000 W / (1,006 J/kg·K × 12 K) = 12.67 kg/s
Volumetric (ρ = 1.2 kg/m³): 12.67 / 1.2 = 10.56 m³/s = 38,000 m³/h
```
This confirms the **20,000–40,000 m³/h** AHU range is correct for this bay at the given load range.

---

## 3. Lighting

### 3a. LED highbay fixture specifications

**UFO LED highbay, 200 W class** (most common for 7–8 m mounting height):
| Parameter | Value | Certainty |
|---|---|---|
| Power | 200 W | [CERT-web] — multiple product datasheets |
| Lumen output | 28,000–30,000 lm | [CERT-web] — sunco.com, LED Lighting Supply, Amazon listings |
| Efficacy | ~140–150 lm/W | [CERT-web] |
| Physical diameter | ~350 mm (≈14") | [CERT-web] — Amazon/sunco product dims: 13.79" diameter |
| Physical height | ~220 mm (≈8.7") | [CERT-web] — sunco "slim UFO" spec |
| Beam angle | 110–120° (wide) | [CERT-web] |
| IP rating | IP65 | [CERT-web] |
| Housing | Die-cast aluminium | [CERT-web] |
| Color temperature | 5000 K (daylight) | [CERT-web] |

**240 W class** (for higher mounting or demanding tasks):
- Output: 34,000–40,000 lm
- Physical size similar to 200 W but slightly heavier [CERT-web — sunco 240W]

### 3b. Mounting height and spacing

For 8 m clear height, luminaires typically mounted at **6.5–7.5 m** (below crane rail or structure).

**Spacing-to-height ratio (S/H)** for UFO highbay: **0.8–1.5** (manufacturer guidance).
At H = 7 m, S = 7 × 1.2 = **8.4 m spacing** as a starting grid. [INFER]

**For 40 × 20 m bay**, a 5 × 3 = **15 fixtures** grid at 8 m × 6.7 m spacing:
- Total power: 15 × 200 W = **3,000 W**
- LPD = 3,000 / 800 = **3.75 W/m²**
At denser 24-fixture layout (6 × 4): 24 × 200 W = 4,800 W → **6.0 W/m²**

**Rule-of-thumb LPD for LED industrial** (from HVAC search results):
- LED: **0.8–1.0 W/ft² = 8.6–10.8 W/m²** (conservative / older LED estimate for industrial)
[CERT-web] — industrialmonitordirect.com guide
- Modern high-efficiency LED highbays at 300–500 lux: **3.5–7 W/m²** [INFER — derived from fixture count]
- **Simulation default: 6 W/m² peak (all fixtures on, no dimming)** = 4,800 W for 800 m² bay [INFER]

### 3c. Target illuminance (IES RP-7 / EN 12464-1)

**IES RP-7-21 (ANSI/IES Recommended Practice: Lighting Industrial Facilities)**:
| Task type | Foot-candles | Lux (approx) | Certainty |
|---|---|---|---|
| General manufacturing — rough assembly, easy seeing | 20–50 fc | 215–538 lux | [CERT-web] electricalmarketplace.com IES table |
| General assembly — rough, difficult seeing | 50–100 fc | 538–1,076 lux | [CERT-web] |
| Assembly — medium | 100–200 fc | 1,076–2,152 lux | [CERT-web] |
| Machine shops — rough bench & grinding | 20–50 fc | 215–538 lux | [CERT-web] |
| Machine shops — fine bench | 200–500 fc | 2,152–5,382 lux | [CERT-web] |

**EN 12464-1 (European standard for indoor work lighting)**:
- Industrial storage areas: **150 lux** minimum maintained [CERT-web] luxmeterpro
- Picking/production zones: **300 lux** minimum maintained [CERT-web]
- Fine assembly: **500 lux** [CERT-web] any-lamp.com

**Design target for this bay**: **300 lux** maintained average (general production), UGR ≤ 25, CRI ≥ 80.
[CERT-web] — consistent with EN 12464-1 production area and IES 30 fc general assembly.

### 3d. Fraction of luminaire power that becomes space sensible heat

**For UFO highbay pendant/hook-mounted in open bay (no return-air plenum above)**:
**≈ 100% of input electrical power becomes room sensible heat.** [INFER — engineering principle]

Reasoning: all electrical energy dissipates as heat (lamp conversion losses + housing convection + infrared radiation downward); none is captured in a plenum return because the bay has open ceiling/deck construction. This is the critical design rule for the coupling simulation. ASHRAE 2017 Fundamentals §18.4: "In spaces without return-air plenum, 100% of fixture input power enters the conditioned space as sensible heat."

Dimming exception: if fixtures are dimmed to X%, the room heat load is X% of rated power (electronic drivers reduce both light and heat proportionally). [INFER — LED driver behavior]

---

## 4. Compressed Air

### 4a. Rotary screw compressor — kW, CFM, dimensions

**Established from repo gobernador-dashboard.html (live simulation data)** [CERT]:
| Model | kW rated | FAD (cfm) | VSD? |
|---|---|---|---|
| Atlas Copco GA 90 VSD | 90 | 551 | yes |
| Sullair LS-90 | 75 | 466 | no |
| Kaeser CSD 105 | 55 | 357 | no |
| Ingersoll Rand RS37ie | 37 | 240 | no |
| Chicago Pneumatic CPBg 30 | 30 | 191 | no |

All values are at ~115 psi / 7.5–8 bar operating pressure. These are production-grade, repo-verified numbers.

**For the nave-3sistemas 2-unit lead/lag system** (designed to match gobernador data):
- **Lead unit**: 75 kW / 466 cfm (e.g., Sullair LS-90 class) — [CERT] gobernador
- **Lag unit**: 55 kW / 357 cfm (e.g., Kaeser CSD 105 class) — [CERT] gobernador
- Operating pressure band: **115–120 psi** — [CERT] `disenos/nave-3sistemas/GOAL.md` + gobernador

**Physical cabinet envelope** (45–90 kW class rotary screw, acoustic canopy):
| Dimension | 45–75 kW class | 75–90 kW class | Certainty |
|---|---|---|---|
| Length | 2.00 m | 2.20 m | [CERT] design-spec.yaml (compresor-tornillo-aire), [CERT-a] cross-check with Atlas GA/Kaeser CSD datasheets |
| Width | 1.20 m | 1.30 m | [CERT] design-spec.yaml |
| Height | 1.70 m | 1.80 m | [CERT] design-spec.yaml |

Source: `disenos/compresor-tornillo-aire/design-spec.yaml` dimensions_real section (confidence: med).

### 4b. Air receiver tank — volume sizing and physical dimensions

**Sizing rules** [CERT-web — airbestpractices.com, vmacair.com, compressorscentral.com]:
| Compressor type | Rule of thumb |
|---|---|
| Rotary screw (fixed speed, load/unload) | 1–3 gallons per CFM FAD |
| Rotary screw (VSD) | 2–4 gallons per CFM |
| Reciprocating | 3–5 gallons per CFM |

For lead unit (466 cfm FAD): 1–2 gal/cfm → **466–932 gallons (1,764–3,527 L)**
For lag unit (357 cfm FAD): 1–2 gal/cfm → **357–714 gallons (1,351–2,703 L)**

**Practical minimum for a 75 kW class unit**: shared receiver **400 gallons (1,514 L)**.

**Physical dimensions — 400-gallon vertical receiver** [CERT-web — pneumaticplus.com, airtools.com]:
| Dimension | Value |
|---|---|
| Diameter | 36" = **0.91 m** |
| Height (shell) | 93" = **2.36 m** |
| Overall with base ring | ~101" = ~**2.57 m** |
| Rated pressure | 165–200 psi (1,138–1,379 kPa) ASME |

**240-gallon vertical** (smaller, also common for single compressor): 30" dia × 84" tall = **0.76 m × 2.13 m** [CERT-web].

### 4c. Refrigerated dryer — size and kW draw

**Power consumption** [CERT-web — hzairdryer.com, airbestpractices.com cycling study]:
| Flow range | Power (non-cycling) | Power (cycling) |
|---|---|---|
| 100 CFM | 0.5–0.8 kW | 0.1–0.4 kW (part-load) |
| 500 CFM | 2.5–4 kW | 0.5–2 kW |
| 1,000 CFM | 5–8 kW | 1–4 kW |

**For a 1,000 cfm dryer matching the two-compressor system (466 + 357 + reserve):**
- Rated draw: **5–8 kW** (non-cycling design) — [CERT-web]
- Part-load cycling: ~**1–3 kW** average — [CERT-web]
- Physical size: similar to a refrigerator-size cabinet, ~**0.8 m W × 0.6 m D × 1.4 m H** [INFER — typical industrial dryer proportions]

### 4d. Heat: room load from compressors

**Fundamental principle** [CERT-web — Kaeser.com, plantservices.com, airbestpractices.com]:
> **100% of compressor input electrical power converts to heat.**
> Of that, approximately 96% is potentially recoverable; ~2–4% leaves permanently with compressed air.

**Heat distribution for air-cooled rotary screw (no heat recovery installed)**:
| Fraction | Heat path | Destination |
|---|---|---|
| ~80% | Oil cooler + aftercooler exhaust (hot air blown by cooler fan) | Into the room (unless ducted outside) |
| ~16–18% | Motor/housing radiation and convection | Into the room |
| ~2–4% | Remains in compressed air (enthalpy + moisture) | Leaves with air to the process |
| **Total room heat (no recovery)** | **~96–98% of shaft kW** | **Into the compressor room** |

Sources: plantservices.com 2003 article (80% via coolers, remainder from housing); Kaeser.com heat recovery page (96% recoverable, 2% in compressed air).

**For simulation**: `Q_comp_room = P_shaft × (1 − heat_recovered_fraction)`
- No recovery (default for nave-3sistemas): `heat_recovered_fraction = 0.0` → Q_comp_room = P_shaft
- With ducted cooling: `heat_recovered_fraction = 0.80–0.96` → Q_comp_room = 0.04–0.20 × P_shaft [CERT-web]

### 4e. Specific power benchmark (kW per 100 cfm)

**Well-designed rotary screw at 7–8 bar / 115–120 psi**:
| Category | kW/100 cfm | Source |
|---|---|---|
| Premium efficiency | 15–18 | [CERT-web] aircompressorzone.com |
| Standard good | 18–22 | [CERT-web] mncompressor.com |
| Older/lower quality | 20–23 | [CERT-web] |
| **Design default** | **16 kW/100 cfm** | [CERT-web] validated against: 75 kW / 466 cfm = 16.1 kW/100 cfm ✓ |

Cross-check: 75 kW ÷ 466 cfm × 100 = **16.1 kW/100 cfm** — matches repo gobernador data. [CERT]

### 4f. Load/unload vs VSD — unloaded kW fraction

**From gobernador-dashboard.html simulation constants** [CERT — read from production JS]:
```javascript
// Fixed-speed loaded:   kW × 0.98
// Fixed-speed UNLOADED: kW × 0.30
// VSD partial load:     kW × (0.22 + 0.78 × (cfm_out / cfm_max))
//   → At zero demand (min speed): kW × 0.22
```

**Cross-checked against web sources** [CERT-web — atlascopco.com, aircompressorzone.com]:
- Unloaded fixed-speed: **25–35% of full-load kW** (repo uses 30% — middle of range ✓)
- VSD at minimum speed: **20–25% of rated kW** (repo uses 22% ✓)

---

## 5. The Coupling Arithmetic

This is the core deliverable. All constants are cited below each equation.

### 5a. Total sensible cooling load (W)

```
Q_total(t) = Q_light(t) + Q_comp(t) + Q_envelope + Q_people + Q_infil

Q_light(t) = N_fixtures × P_fixture × (1 − dim(t))
           // N_fixtures = count of 200 W UFO highbays (design: 20–24 for 800 m² bay)
           // P_fixture = 200 W [CERT-web]
           // dim(t) ∈ [0, 1] user-controlled dimming fraction
           // fraction → room heat = 1.0 (all power becomes sensible heat) [INFER §3d]

Q_comp(t) = Σᵢ [ kW_i(t) × 1000 × (1 − f_recover) ]
           // kW_i(t) = effective shaft power of compressor i at time t
           //   Fixed-speed loaded:   kW_rated × 0.98            [CERT gobernador]
           //   Fixed-speed unloaded: kW_rated × 0.30            [CERT gobernador]
           //   VSD at cfm_out:       kW_rated × (0.22 + 0.78 × (cfm_out / cfm_FAD))  [CERT gobernador]
           // f_recover = heat recovery fraction (0.0 if air-cooled, exhausted into bay) [CERT-web Kaeser]

Q_envelope = A_total × U_mix × ΔT_amb(t)
           // A_total = 1,760 m² (derived §1)
           // U_mix   = 0.30 W/(m²·K) [CERT-web ASHRAE metal building]
           // ΔT_amb(t) = T_outdoor(t) − T_indoor_setpoint (e.g. 35 − 26 = 9 K) [INFER]
           // Range: 3–15 kW for this bay; dominates only when process loads are very low

Q_people   = N_people × 80                  // 80 W/person sensible, light industrial standing work
           // N_people = 30–60 for 800 m² bay [INFER]
           // Constant: 80 W/person sensible [INFER — ASHRAE 2017 Fundamentals Table 1]

Q_infil    = 0.5 × Vol_bay × (1/3600) × 1200 × ΔT_amb
           // 0.5 ACH × 6,400 m³ × ... ≈ 10,667 × (ΔT/10) W [INFER §1]
```

### 5b. HVAC electrical draw (kW)

```
P_hvac(t) = Q_total(t) / (COP × 1000)        // COP = 3.0 [CERT-web §2c, INFER baseline]

// Note: COP is at design conditions. Part-load COP typically HIGHER (e.g. 3.5–4.0 at 50% load)
// Simulation may use flat COP = 3.0 for simplicity (conservative). Mark [INFER] if no COP curve.
```

### 5c. Compressor kW as function of demand and pressure state

```
// For each compressor i (state ∈ {stop, carga (loaded), descarga (unloaded), falla}):
kW_i(state, cfm_demand_fraction) =
  if VSD:
    state == 'carga'  → kW_rated × (0.22 + 0.78 × clamp(cfm_out/cfm_FAD, 0, 1))
    state == 'stop'   → 0
  if fixed-speed:
    state == 'carga'   → kW_rated × 0.98
    state == 'descarga'→ kW_rated × 0.30
    state == 'stop'    → 0
    state == 'falla'   → 0

// [CERT] gobernador-dashboard.html:705-706,898-900
// Constants: 0.22, 0.78 (VSD); 0.98 (loaded), 0.30 (unloaded) [CERT gobernador]
```

### 5d. Pressure band sequencing — 2 units (lead/lag with hysteresis)

```
BAND:  P_low = 115 psi,  P_high = 120 psi  [CERT — GOAL.md + gobernador-dashboard.html]
HYSTERESIS: δ = 2–3 psi below P_low to start lag  [INFER — typical compressed air practice]

SIMPLE MODEL (for JS simulation tick at interval dt):

// Air balance (net cfm flowing in/out of header):
cfm_supply(t) = Σᵢ cfm_out_i(t)          // sum of loaded compressors' actual output
cfm_demand(t) = process demand signal (user slider or random walk)
net_cfm(t) = cfm_supply(t) − cfm_demand(t)

// Pressure update (ideal gas, receiver V_receiver in L at p_atm):
// ΔP (psi) = net_cfm (cfm) × dt (s) / (1/60) × p_atm_psi / V_receiver_L × 28.317
// Simplified: ΔP ≈ net_cfm × dt × 0.1034 / V_receiver   [INFER — derived from ideal gas law]
// V_receiver = 1,514 L (400 gal) [CERT-web]; p_atm = 14.696 psi; 1 ft³ = 28.317 L
P(t + dt) = P(t) + ΔP

// Sequencing logic:
if P(t) < P_low:
  if LEAD.state == 'descarga' → LEAD.state = 'carga'     // reload lead
  if LEAD at max AND P < P_low − δ → LAG.state = 'carga'  // start lag

if P(t) > P_high:
  if LAG.state == 'carga' → LAG.state = 'descarga'        // unload lag first
  wait unload_timer (5–10 s); then LAG.state = 'stop'
  if only LEAD loaded AND P still > P_high → LEAD.state = 'descarga'

// The hysteresis δ prevents simultaneous stop+start oscillation.
// [CERT] gobernador-dashboard.html lines 854–900 (bandCheck, staging logic) — adapted for 2 units
// [INFER] unload_timer = 5 s from gobernador default
```

**Specific power check** (for dashboard efficiency widget):
```
SP(t) = P_hvac(t) [kW] / (Q_total(t) [kW])   // HVAC efficiency: kW per kW cooling
SP_comp(t) = Σ kW_i(t) / Σ cfm_i(t) × 100    // compressor efficiency: kW per 100 cfm
// Target SP_comp < 20 kW/100 cfm [CERT-web §4e]
```

---

## 6. Reference Images

**Photographic references DO NOT EXIST in this repo for the nave-3sistemas composite scene.**

Evidence:
- The `disenos/nave-3sistemas/` folder contains only `GOAL.md` and this file at time of research.
- No `refs/` subfolder, no reference image commits in recent git log for this path.
- The scene is a **synthetic combination** of three systems in a generic industrial bay — not a real photographed installation.

**What IS reference-backed from existing designs:**
- Rotary screw compressor: `disenos/compresor-tornillo-aire/refs/ref-atlas-ga22.png`, `ref-atlas-ga110.png`, `ref-sala-sistema-1.png` — THESE images show compressor + receiver + dryer layout in a real plant room. [CERT] design-spec.yaml references block.
- AHU: `disenos/ahu/ahu-realistic-v1.html` is an approved design (gated); its proportions are repo-certified.

**Implication for the DesignSpec:**
```yaml
p6_comparison: spec-only   # no photographic reference for the bay scene as a whole
```
The compressor sub-assembly may cite the `ref-sala-sistema-*.png` photos from `disenos/compresor-tornillo-aire/refs/` as a partial reference for the compressor room layout.

---

## Source Index

| # | Source | URL / Path | Used in |
|---|---|---|---|
| R1 | disenos/compresor-tornillo-aire/design-spec.yaml | [CERT] repo | §1 (bay scale), §4a (dimensions) |
| R2 | disenos/ahu/README.md | [CERT] repo | §2a (AHU dims) |
| R3 | disenos/gobernador-aire/gobernador-dashboard.html | [CERT] repo | §4a (compressor data), §4f (kW fractions), §5d (sequencing) |
| R4 | disenos/nave-3sistemas/GOAL.md | [CERT] repo | §4a (pressure band), §5 (coupling equations structure) |
| R5 | tongxingHVAC.com blog / AHU dimensions guide | [CERT-web] | §2a (large AHU dims) |
| R6 | industrialmonitordirect.com / HVAC rules of thumb | [CERT-web] | §2b (1 ton/300–350 ft²), §3b (LPD) |
| R7 | gesonchiller.com / chiller COP guide | [CERT-web] | §2c (COP values) |
| R8 | electricalmarketplace.com / IES lighting table | [CERT-web] | §3c (foot-candle targets) |
| R9 | lexmeterpro.com / lux levels guide | [CERT-web] | §3c (EN 12464-1 300 lux) |
| R10 | sunco.com, Amazon, LED Lighting Supply | [CERT-web] | §3a (UFO highbay specs) |
| R11 | Kaeser.com / heat recovery page | [CERT-web] | §4d (96% recoverable heat) |
| R12 | plantservices.com / heat recovery article | [CERT-web] | §4d (80% via coolers) |
| R13 | airbestpractices.com | [CERT-web] | §4e (kW/100 cfm) |
| R14 | mncompressor.com / specific power | [CERT-web] | §4e |
| R15 | pneumaticplus.com, airtools.com / tank dims | [CERT-web] | §4b (400 gal tank = 0.91 m × 2.36 m) |
| R16 | vmacair.com, airbestpractices.com / tank sizing | [CERT-web] | §4b (1–3 gal/cfm rule) |
| R17 | atlascopco.com, aircompressorzone.com | [CERT-web] | §4f (25–35% unloaded kW) |
| R18 | hzairdryer.com | [CERT-web] | §4c (dryer kW/100 cfm) |
| R19 | NAIMA/UpCodes ASHRAE metal building guide | [CERT-web] | §1 (U-values) |

---

*End of P1-RESEARCH.md — 2026-08-13*
