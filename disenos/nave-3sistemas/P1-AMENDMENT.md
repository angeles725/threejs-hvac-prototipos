# P1 AMENDMENT — two engineering decisions taken by the orchestrator

Date: 2026-08-13 · Author: orchestrator · Status: binding for the DesignSpec
Basis: `P1-RESEARCH.md` §5 arithmetic, re-derived and verified independently below.

---

## A. Verification of the P1 load balance (recomputed, not accepted)

Using P1 §5a constants literally, full production, T_out 35 °C / T_in 26 °C (ΔT = 9 K):

| term | formula | value |
|---|---|---|
| `Q_light` | 22 × 200 W | 4.40 kW |
| `Q_comp` | (75 + 55) × 0.98 | 127.40 kW |
| `Q_envelope` | 1760 m² × 0.30 W/m²K × 9 K | 4.75 kW |
| `Q_people` | 40 × 80 W | 3.20 kW |
| `Q_infil` | 0.5 ACH × 6400 m³ / 3600 × 1200 × 9 | 9.60 kW |
| **total** | | **149.35 kW** |

This reproduces P1's reported ~153 kW (the 3 % delta is its fixture count and ΔT rounding), so the
research is arithmetically sound. **The problem is not the math — it is what the math reveals.**

### The share table is fatal to the design thesis

compressors 85.3 % · infiltration 6.4 % · envelope 3.2 % · people 2.1 % · **lighting 2.9 %**

The GOAL commits to three systems that visibly drive each other. Under this balance, lighting is a
3-pixel sliver in any stacked bar: a user would dim every luminaire to zero and watch the cooling
load fall by 3 %. One of the three headline systems would be decoration, and the dashboard's central
claim — *these are one coupled system* — would be technically true and perceptually false.

---

## B. Decision 1 — the compressor room is a SEPARATE enclosure with dedicated ventilation

**This is a correctness fix first and a design fix second.** Dumping 127 kW of compressor heat into
a conditioned bay and then paying to remove it at COP 3.0 is not a plant to be modelled — it is an
engineering mistake. Standard practice puts rotary screw compressors in their own room with
dedicated exhaust ventilation (or ducted cooler discharge) that rejects package heat straight
outdoors. P1 §4d supports this: ~80 % of the heat leaves via the cooler exhaust — that stream is
exactly what a ducted room exhausts.

**Model:**

```
Q_comp_bay = Σ kW_i × 1000 × (1 − f_exhaust) × (1 − f_recover)
```

- `f_exhaust` — fraction of compressor package heat ducted out of the building. **User control**,
  0.0–0.95, **default 0.85**. Physical meaning: dedicated compressor-room exhaust fans running.
- `f_recover` — heat recovery to process/DHW. Default 0.0; kept in the model as a second-order
  control because it is the real energy-conservation measure and the dashboard should be able to
  show it.

### The new base-case balance (f_exhaust = 0.85, 18 fixtures — see Decision 2)

| term | value | share |
|---|---|---|
| compressors (into bay) | 19.11 kW | 47.5 % |
| infiltration | 9.60 kW | 23.9 % |
| envelope | 4.75 kW | 11.8 % |
| lighting | 3.60 kW | 8.9 % |
| people | 3.20 kW | 8.0 % |
| **total** | **40.26 kW** | 50 W/m² · 11.4 ton |

50 W/m² is a defensible industrial-bay cooling density, and all three headline systems now occupy
readable area in a stacked bar.

### Why this makes the dashboard BETTER, not easier

`f_exhaust` becomes the single most instructive control on the page. Dragging it 0.85 → 0.0 takes
the cooling load from 40 kW to 148 kW and the HVAC draw from 13.4 kW to 49.4 kW — a **3.7×** swing
from one decision about where compressor heat goes. That is the coupling thesis made visceral, and
it is the lesson a real plant engineer would want on the wall.

**Consequence for the 3D:** the compressor room must be BUILT as a walled enclosure inside the bay,
with visible exhaust fans/louvers on its exterior wall. The enclosure is not scenery — it is the
geometric expression of the term `(1 − f_exhaust)`. A user must be able to see the boundary the heat
does or does not cross.

---

## C. Decision 2 — 18 luminaires on a 6 × 3 grid, not "20–24"

P1 gives a range and a spacing rule that do not close on the 40 × 20 m floor. Closing it:

- Mounting height 7.0 m; 200 W UFO highbay, 29,000 lm nominal [P1 §3a].
- Grid **6 columns × 3 rows** = 18 fixtures → spacing **6.67 m × 6.67 m** (exactly uniform on both
  axes, which a 20–24 count does not give on a 2:1 floor).
- S/H = 6.67 / 7.0 = **0.95**, comfortably below the 1.2 limit → good uniformity [P1 §3b].
- Maintained illuminance: 18 × 29,000 lm × CU 0.7 × LLF 0.8 / 800 m² = **365 lux**, over the 300 lux
  target with depreciation headroom [P1 §3c].
- Installed power 3.60 kW → **LPD 4.5 W/m²**, consistent with P1's 5–6 W/m² band for modern LED.

Rejected alternatives: 24 fixtures (487 lux maintained — 62 % over target, wasteful and it makes the
dimming control uninteresting because the base case is already over-lit); 15 fixtures on the literal
8.4 m grid (does not divide 40 × 20 evenly, leaves dark corners).

---

## D. What the DesignSpec must carry from this amendment

1. `f_exhaust` as a first-class `ui_controls` entry, default 0.85, URL-addressable.
2. The compressor room as a named enclosure node in the hierarchy, with exhaust louvers/fans as
   child nodes — geometry, not decoration.
3. `N_fixtures: 18`, grid 6 × 3, spacing 6.67 m, mount height 7.0 m, `confidence: high`.
4. `Q_comp_bay` formula above replacing P1 §5a's `Q_comp`.
5. Base-case totals (40.26 kW, 13.4 kW HVAC draw at COP 3.0) as the invariant the test suite asserts
   on load — a boot-state regression guard, per GATES.md ("assert the invariant ON LOAD").
