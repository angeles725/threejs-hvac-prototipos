# DASHBOARD-UX — nave-3sistemas
**Information Architecture · HVAC / LIGHTING / COMPRESSED AIR Digital Twin**

Document type: UX design specification, not code. All coordinates assume 1920 × 1080.
Palette tokens from ARCHITECTURE.md are used by name throughout. No new tokens introduced.

---

## 1. The one-screen layout

### ASCII wireframe

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  1920 × 1080  ·  overflow: hidden  ·  no scroll                                     ║
╠══ KPI BAND  1896 × 64px ════════════════════════════════════════════════════════════╣
║ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ ║
║ │PLANT kW  │ │COOL LOAD │ │ HVAC kW  │ │PRESSURE  │ │ AVG DIM  │ │PLANT STATUS  │ ║
║ │ 187.4    │ │  312.1   │ │   82.3   │ │  117.3   │ │   78 %   │ │● NORMAL 0W   │ ║
║ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘ ║
╠══ MAIN  1896 × 758px ═══════════════════════════════════════════════════════════════╣
║ ┌────────────────── 1522px ──────────────────────────┐ ┌── 360px ────────────────┐ ║
║ │                                                     │ │ HVAC              ● OK  │ ║
║ │  [ALL] [HVAC] [LIGHTING] [AIR]        [⟳]  [⧉]   │ │ HVAC kW       84.3 kW  │ ║
║ │                                                     │ │ Total load   312.1 kW  │ ║
║ │                                                     │ │ Supply temp    14.2 °C │ ║
║ │                                                     │ │ COP              3.81  │ ║
║ │           3D CANVAS                                 │ │ Active AHUs     3 / 4  │ ║
║ │           Three r160 · OrbitControls                │ │ ≈≈≈≈≈ sparkline ≈≈≈≈≈ │ ║
║ │           pick → sidebar drill-down                 │ ├─────────────────────────┤ ║
║ │           hover system → 3D highlight               │ │ LIGHTING          ● OK  │ ║
║ │                                                     │ │ Lighting kW    84.3 kW │ ║
║ │                                                     │ │ Heat to bay    84.3 kW │ ║
║ │                                                     │ │ Avg dim           78 % │ ║
║ │                                                     │ │ Fixtures ON    48 / 60 │ ║
║ │                                                     │ │ ≈≈≈≈≈ sparkline ≈≈≈≈≈ │ ║
║ │                                                     │ ├─────────────────────────┤ ║
║ │                                                     │ │ COMP AIR          ● OK  │ ║
║ │                                                     │ │ Pressure        117.3   │ ║
║ │                                                     │ │ Compressor kW    62.4   │ ║
║ │                                                     │ │ CFM delivered      420  │ ║
║ │                                                     │ │ Heat to bay      62.4   │ ║
║ └─────────────────────────────────────────────────────┘ │ ≈≈≈≈≈ sparkline ≈≈≈≈≈ │ ║
║                                                          └─────────────────────────┘ ║
╠══ BOTTOM  1896 × 206px ═════════════════════════════════════════════════════════════╣
║ ┌─────── ~622px ──────────┐ ┌─────── ~622px ────────┐ ┌─────── ~622px ──────────┐ ║
║ │ COUPLING FLOW STRIP     │ │ HVAC kW TREND 30 min  │ │ WHAT-IF CONTROLS        │ ║
║ │                         │ │                       │ │ Dim level   ──●── 78 %  │ ║
║ │ [LIGHT][COMP][ENV][PPL] │ │  ╭─────╮             │ │ Occupancy   ──●── 40    │ ║
║ │  amber  blue  grn  dim  │ │ ╭╯     ╰───╮         │ │ Outdoor °C  ──●── 32    │ ║
║ │  84kW   62kW  142kW 24kW│ │╭╯          ╰──       │ │ Comp mode   [AUTO    ▼] │ ║
║ │  ──────── 312.1 kW ───  │ │                       │ ├─────────────────────────┤ ║
║ │  ÷ COP 3.81             │ │ ── cyan area chart── │ │ EVENT LOG               │ ║
║ │  ──→ [HVAC  82.3 kW]    │ │                       │ │ 14:32 ● comp-2 ON LOAD  │ ║
║ └─────────────────────────┘ └───────────────────────┘ └─────────────────────────┘ ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

### Grid definition (CSS)

```css
/* Root — overflow:hidden enforces single-screen contract */
#root {
  display: grid;
  /* rows: pad | kpi-band | gap | main | gap | bottom | pad */
  grid-template-rows: 12px 64px 14px 758px 14px 206px 12px;
  grid-template-columns: 12px 1fr 12px;
  height: 100vh;
  overflow: hidden;
  background: var(--canvas);
}
.kpi-band {
  grid-row: 2; grid-column: 2;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}
.main {
  grid-row: 4; grid-column: 2;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 14px;
}
.sidebar {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 14px;
}
.bottom {
  grid-row: 6; grid-column: 2;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}
```

**Derived pixel values at 1920 × 1080:**

| Region | Width | Height | Notes |
|--------|-------|--------|-------|
| KPI band | 1896px | 64px | 6 condensed tiles, no sparkline |
| 3D canvas | 1522px | 758px | `WebGLRenderer` output, `#c3d` |
| Sidebar | 360px | 758px | 3 panels, each `(758-28)/3 = 243px` |
| Bottom cells | ~622px each | 206px | `(1896-28)/3 = 622.7px` |

### Split-ratio justification

The 3D canvas is **1522 × 758 px = 56% of the viewport area**. This is correct for two independent reasons:

1. **Equipment legibility at scale.** A 30 m industrial bay viewed in orthographic projection at 1522 px width projects individual AHU cabinets (≈1.2 m wide) to ≈61 px. At that size, silhouette + system-accent emissive is enough to identify equipment type and state. Below 900 px canvas width, compressors in a 6 m room become indistinguishable from each other at the same viewing angle.

2. **Bottom strip minimum legibility.** The 206 px bottom row gives each panel an inner chart height of 150 px after 28 px of padding and 28 px of title + axis labels. A 150 px chart area renders 4 Y-axis gridlines at readable spacing. Below 170 px the axis text must be dropped, making the chart decorative. The row cannot shrink without losing information.

The 44% of viewport area occupied by dashboard chrome (KPI band + sidebar + bottom) is not waste — it is the evidence that the 3D is an "evidence surface" and not a "decoration". A 70/30 split in favor of 3D would crowd the trend charts into illegibility. The 56/44 split is the governing constraint, not an aesthetic preference.

---

## 2. The KPI hierarchy — three tiers

**Source annotation key:** [INPUT] = user control, read from URL params. [DERIVED] = output of `plant.step(state, dt)` or `deriveDashboardModel(state)`. [AGGREGATE] = sum or mean of multiple sim values. Every value originates from exactly one expression in `src/sim/`.

### Tier 1 — KPI band (6 tiles, always visible, 64px height)

**Tile structure (condensed — no sparkline):**
- Label: IBM Plex Sans 9px, uppercase, `letter-spacing: 0.055em`, `color: var(--dim)`
- Value: IBM Plex Mono 28px, `font-variant-numeric: tabular-nums`, `color: var(--ink)`
- Unit: IBM Plex Mono 11px, `color: var(--dim)`, `margin-left: 3px`
- State signal: `border-left: 3px solid var(--green|--amber|--red)` — layout never shifts, only the border color changes
- Delta badge (see §3): appears below the value, fades over 2.5 s

| # | Label | Unit | Decimals | Source | Expression |
|---|-------|------|----------|--------|------------|
| 1 | PLANT kW | kW | 1 | [AGGREGATE] | `state.P_lighting + state.P_hvac + state.P_compressors` |
| 2 | COOLING LOAD | kW | 1 | [DERIVED] | `state.Q_light + state.Q_comp + state.Q_envelope + state.Q_people` |
| 3 | HVAC kW | kW | 1 | [DERIVED] | `state.P_hvac = Q_total / state.COP` |
| 4 | PRESSURE | psi | 1 | [DERIVED] | `state.receiver_psi` (from `compressed-air.mjs`) |
| 5 | AVG DIM | % | 0 | [AGGREGATE] | `mean(state.luminaires[*].dim_pct)` |
| 6 | PLANT STATUS | — | 0 | [AGGREGATE] | worst-state chip: `count(alarms)` / `count(warnings)` |

Tile 6 is not numeric. It shows: `● NORMAL`, `▲ 2 WARN`, or `⬤ 1 ALARM`. The shape (●/▲/⬤) carries the state so color is never the sole signal.

### Tier 2 — per-system panels (sidebar, 243 px × 360 px each)

**Panel layout:**
- Header row 40 px: system name (left) + status pill (right) with system-accent left border stripe (4 px)
- 4 KPI rows × 34 px: label (`--dim`, 10px) on the left, value+unit (`--ink`, IBM Plex Mono 16px) on the right
- Sparkline 48 px: SVG area chart, last 10 min of primary metric, system-accent stroke color
- No scrollbar. Content is designed to fit in 243 px exactly.

#### HVAC panel — accent `--cyan` (#4AA8E0)

| Label | Unit | Dec | Source | Expression |
|-------|------|-----|--------|------------|
| HVAC kW | kW | 1 | [DERIVED] | `P_hvac = Q_total / COP` |
| Total load | kW | 1 | [DERIVED] | `Q_light + Q_comp + Q_envelope + Q_people` |
| Supply temp | °C | 1 | [DERIVED] | `T_supply` from `thermal.mjs` |
| COP | — | 2 | [DERIVED] | `Q_total / P_hvac` (round-trip check) |
| Active AHUs | / total | 0 | [AGGREGATE] | `count(AHUs where state === 'running')` |

Sparkline: `P_hvac` last 10 min, cyan stroke, `--accent-soft` fill.

#### LIGHTING panel — accent `--amber` (#E8A33D)

| Label | Unit | Dec | Source | Expression |
|-------|------|-----|--------|------------|
| Lighting kW | kW | 1 | [DERIVED] | `Σ P_fixture × (1 − dim_pct)` |
| Heat to bay | kW | 1 | [DERIVED] | identical to Lighting kW — display note "= Q_light" |
| Avg dim | % | 0 | [AGGREGATE] | `mean(luminaires[*].dim_pct)` |
| Fixtures ON | / total | 0 | [AGGREGATE] | `count(luminaires where dim_pct > 0)` |

"Heat to bay" is always equal to "Lighting kW" and this is intentional. Both rows are shown because the second row makes the coupling law explicit (`Q_light = P_lighting`). The label difference, not the number, carries the meaning.

Sparkline: `P_lighting` last 10 min, amber stroke.

#### COMPRESSED AIR panel — accent `--accent` (#2E90F0)

| Label | Unit | Dec | Source | Expression |
|-------|------|-----|--------|------------|
| Pressure | psi | 1 | [DERIVED] | `state.receiver_psi` |
| Compressor kW | kW | 1 | [AGGREGATE] | `Σ P_shaft` for running units |
| CFM delivered | CFM | 0 | [AGGREGATE] | `Σ output_cfm` for running units |
| Heat to bay | kW | 1 | [DERIVED] | `P_shaft_total × (1 − heat_recovered_pct)` |
| Lead state | pill | — | [DERIVED] | `carga` / `modulando` / `descarga` for lead unit |

Sparkline: `receiver_psi` last 10 min, blue stroke, with two hairline reference rules at 115 psi and 120 psi drawn as `stroke-dasharray="3 3"` horizontal lines in the SVG.

### Tier 3 — drill-down (click on 3D object → sidebar transitions to unit detail)

**Transition mechanic:** sidebar's `.sys-panels` div slides out right (`transform: translateX(360px)`, 200 ms ease-out). `.detail-panel` slides in from right. A `← BACK` button at top-left reverses the transition and resets `highlightSystem = null`.

**For an AHU unit:**

| Label | Unit | Dec | Source |
|-------|------|-----|--------|
| Outlet temp | °C | 1 | [DERIVED] this unit's `T_supply` |
| Air flow | CFM | 0 | [DERIVED] this unit's `Q_airflow` |
| Electrical draw | kW | 1 | [DERIVED] this unit's `P_elec` |
| Cooling coil load | kW | 1 | [DERIVED] this unit's `Q_cool` |
| COP point | — | 2 | [DERIVED] `Q_cool / P_elec` |
| State | pill | — | [DERIVED] running / standby / fault |

Coupling footnote (static layout, live values): `LOAD SOURCE: lighting {Q_light} kW · compressors {Q_comp} kW · envelope {Q_env} kW · people {Q_ppl} kW`. All four numbers update each tick from `deriveDashboardModel`. This is the only place in the UI where all four load sources are named simultaneously with their AHU context.

Sparkline: this unit's `P_elec` over last **30 min** (drill-down gets 3× the history of system panels).

**For a luminaire zone:**

| Label | Unit | Dec | Source |
|-------|------|-----|--------|
| Fixtures in zone | count | 0 | [AGGREGATE] zone fixture count (static per zone) |
| Dim level | % | 0 | [INPUT] `dim_pct` for this zone (reflects `?dim=` param) |
| Zone power | kW | 1 | [DERIVED] `Σ P_fixture × (1 − dim_pct)` for zone |
| Heat emission | kW | 1 | [DERIVED] identical to Zone power |
| Schedule | text | — | [DERIVED] `occupied` / `unoccupied` / `manual` |

**For a compressor:**

| Label | Unit | Dec | Source |
|-------|------|-----|--------|
| State | pill | — | [DERIVED] `carga` / `modulando` / `descarga` / `stop` / `falla` |
| Pressure | psi | 1 | [DERIVED] shared `receiver_psi` |
| Output | CFM | 0 | [DERIVED] this compressor's `output_cfm` |
| Shaft kW | kW | 1 | [DERIVED] this compressor's `P_shaft` |
| Heat to bay | kW | 1 | [DERIVED] `P_shaft × (1 − heat_recovered_pct)` |

---

## 3. Making the coupling VISIBLE

The coupling thesis requires that dimming the lights visibly moves the HVAC kW tile within the same interaction. Five mechanisms evaluated below. The recommended shortlist is at the end of this section.

### Mechanism A — Stacked cooling-load composition bar (horizontal)

**What it teaches:** Which source currently dominates thermal load. When the user dims lights, the amber segment (LIGHTING) narrows in real time and the TOTAL readout drops. One tick later, HVAC kW follows. The transfer `Q_light → Q_total → P_hvac` is spatially encoded in segment widths.

**Location:** Bottom-left panel (COUPLING FLOW STRIP), upper 90 px.

**Spec:** One horizontal bar, full panel width minus padding. Total width fixed. Four segments:

| Segment | Color token | `data-system` | Hover behavior |
|---------|-------------|---------------|----------------|
| LIGHTING | `--amber` | `"lighting"` | dispatch `system-hover` event |
| COMP AIR | `--accent` | `"air"` | dispatch `system-hover` event |
| ENVELOPE | `--green` | `null` | no 3D link |
| PEOPLE | `--dim` | `null` | no 3D link |

Each segment width: `(Qi / Qtotal) × barWidth`. Label overlaid in IBM Plex Mono 9px: `LIGHT · 84.3 kW`. Segments have `style="width: ${w}px; transition: width 0.35s ease"` for smooth animation. Each segment gets `role="button"` and a title attribute for screen-reader access.

**SVG sketch (~40 lines):**
```js
const barW = panelInnerW - 32; // full minus label gutter
const segs = [
  { q: Q_light,    color: 'var(--amber)',  sys: 'lighting', lbl: 'LIGHT' },
  { q: Q_comp,     color: 'var(--accent)', sys: 'air',      lbl: 'COMP'  },
  { q: Q_envelope, color: 'var(--green)',  sys: null,       lbl: 'ENV'   },
  { q: Q_people,   color: 'var(--dim)',    sys: null,       lbl: 'PPL'   },
];
let x = 0;
segs.forEach(s => {
  const w = (s.q / Q_total) * barW;
  // <rect x={x} y={0} width={w} height={28} fill={s.color} opacity="0.85" rx="3"
  //       data-system={s.sys} role="button" tabindex="0"/>
  // <text x={x + w/2} y={42} class="ax" text-anchor="middle">
  //   {s.lbl} · {s.q.toFixed(1)} kW
  // </text>
  x += w;
});
```

**Implementation cost:** ~40 lines. Four `<rect>`, four `<text>`, one wrapper `<svg>`. Values recomputed each tick. No library.

**Verdict: ADOPT. Priority 1.** This is the baseline coupling visual. Without it, the dashboard shows three independent systems with no spatial relationship.

---

### Mechanism B — Simplified flow strip (physics narrative)

**What it teaches:** The equation `Q_total ÷ COP = P_hvac` as a readable left-to-right process. Contextualizes why HVAC kW is its current value.

**Location:** Bottom-left panel, below the stacked bar (remaining ~90 px of the 206 px panel minus padding).

**Spec:** Three boxes connected by SVG arrows. Values live-updated each tick:

```
[ Q_total ]  ─→  [ ÷ COP ]  ─→  [ HVAC kW ]
  312.1 kW           3.81          82.3 kW
  (no border)    (dim border)   (cyan border)
```

The rightmost box always uses the cyan border (`--cyan`, 2px) so its visual language matches the HVAC system panel. The middle box shows the divisor as a dim annotation.

**SVG sketch (~60 lines):**
```js
// viewBox="0 0 580 80"
// Box 1 — load total
// <rect x="10" y="10" width="160" height="60" rx="6" fill="var(--card2)" stroke="var(--rule)"/>
// <text x="90" y="34" class="ax dim">TOTAL LOAD</text>
// <text x="90" y="54" class="mono" style="font-size:18px" text-anchor="middle">312.1<tspan class="dim" style="font-size:11px"> kW</tspan></text>

// Arrow 1
// <path d="M 174 40 L 204 40" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#a)"/>
// <text x="189" y="32" class="ax dim" text-anchor="middle">÷ COP</text>
// <text x="189" y="56" class="mono dim" text-anchor="middle" style="font-size:11px">3.81</text>

// Arrow 2
// <path d="M 248 40 L 278 40" .../>

// Box 2 — HVAC kW (cyan border)
// <rect x="282" y="10" width="140" height="60" rx="6" fill="var(--card2)" stroke="var(--cyan)" stroke-width="1.5"/>
// <text x="352" y="34" class="ax" style="fill:var(--cyan)">HVAC kW</text>
// <text x="352" y="54" class="mono" style="font-size:18px;fill:var(--ink)" text-anchor="middle">82.3</text>
```

A full Sankey (proportional-width flow bands) costs ~200 additional lines and teaches the same two facts. Reject the Sankey.

**Implementation cost:** ~60 lines SVG + CSS. Zero extra JS beyond the data already in `deriveDashboardModel`.

**Verdict: ADOPT. Priority 4** (after delta badges and highlight, which have higher information density per line of code).

---

### Mechanism C — Linked 3D highlighting

**What it teaches:** That the segments in the stacked bar correspond to real physical objects in the bay. The user hovers LIGHTING in the bar — luminaires glow amber. They hover COMP AIR — compressors glow blue. This is not an inference; it is a direct demonstration.

**Mechanism:**
1. Every mesh built by `luminaires.mjs`, `hvac.mjs`, and `compressor-room.mjs` receives `mesh.userData.system = 'lighting' | 'hvac' | 'air'` at construction time.
2. A `CustomEvent('system-hover', { detail: { system: 'lighting' | 'air' | null } })` is dispatched by the stacked bar segments and the sidebar panel headers on `mouseenter` / `mouseleave`.
3. `scene/runtime.mjs` registers one listener. On each event: traverse all meshes; for matches set `material.emissiveIntensity = 0.45`; for non-matches set `material.emissiveIntensity = 0`. The emissive color is already the system accent color from the material build.
4. On `system-hover` with `system: null` (mouse leaves), restore all to 0.

**Implementation cost:** ~25 lines JS. One `userData` stamp per mesh at build time (one line per builder). One event listener in `runtime.mjs`.

**Verdict: ADOPT. Priority 3.** Highest information-per-line-of-code of all five mechanisms. It closes the gap between chart and plant. Without it, the stacked bar is still interpretable; with it, it is undeniable.

---

### Mechanism D — Delta badges on KPI tiles

**What it teaches:** That a change in one system propagated to another. Without badges, the user dims lights and may not notice the HVAC kW tile update (eyes are on the slider). With badges, a `−2.1 kW` badge appears on the HVAC tile immediately.

**Mechanism:** `deriveDashboardModel(state)` stores a `prev` snapshot. After each tick, for each numeric value: if `|current − prev| > threshold`, inject a badge element alongside the value node. Badge text: `+2.3` or `−1.1` in the unit's color. CSS:

```css
.delta-badge {
  font-family: var(--mono); font-size: 9px; font-variant-numeric: tabular-nums;
  padding: 1px 5px; border-radius: 5px; margin-left: 6px;
  animation: badge-fade 2.5s ease forwards;
}
.delta-badge.pos { background: var(--green-bg); color: var(--green); }
.delta-badge.neg { background: var(--red-bg);   color: var(--red);   }
@keyframes badge-fade { 0% { opacity:1 } 70% { opacity:1 } 100% { opacity:0 } }
```

Badge elements get `role="status" aria-live="polite"` so screen readers announce coupling effects.

**Thresholds:** ≥ 0.5 kW for power values, ≥ 0.2 psi for pressure, ≥ 1 % for dim level.

**Implementation cost:** ~20 lines JS (snapshot diffing + badge injection) + 8 lines CSS.

**Verdict: ADOPT. Priority 2.** Required for the causality loop to be perceptible, not just provable. The delta badge on HVAC kW after dimming the lights is the single most legible demonstration of coupling.

---

### Mechanism E — What-if control row (bottom-right)

**What it teaches:** That the simulation responds to inputs and all three systems move together. The sliders are the causes; the KPI tiles and stacked bar are the effects.

**Verdict: ADOPT. Priority 5** — but zero additional design cost because the controls are required for URL-state driving (see §5). The only design decision is to label the panel "WHAT-IF" and frame slider labels as `dim=80%` (current value always visible) rather than hiding them in a settings drawer.

---

### Recommended shortlist and implementation order

| Order | Mechanism | Cost | Teaches |
|-------|-----------|------|---------|
| 1 | Stacked composition bar | 40 lines SVG | which source dominates load |
| 2 | Delta badges | 20 lines JS + 8 CSS | coupling propagation is perceptible |
| 3 | Linked 3D highlight | 25 lines JS | chart segments ARE physical objects |
| 4 | Simplified flow strip | 60 lines SVG | the ÷ COP equation |
| 5 | What-if control row | 0 extra lines | causality is interactive |
| ✗ | Full Sankey | ~200 extra lines | same as 1+4 combined — reject |

---

## 4. Alarm and state model

### State definitions

| State | `--border` token | 3D emissive | Pill copy | Shape signal |
|-------|-----------------|-------------|-----------|--------------|
| `normal` | `--green` (2px solid) | `intensity: 0.0` | none (silence is normal) | ● |
| `warning` | `--amber` (2px solid) | `intensity: 0.25, color: amber` | `AVISO` | ▲ |
| `alarm` | `--red` (2px solid, pulsing 1Hz) | `intensity: 0.45–0.7 pulse, color: red` | `ALARMA` | ⬤ |

Shape is always rendered alongside color. State is never encoded by color alone.

### Trigger thresholds

**HVAC:**
- warning: `P_hvac > 0.85 × rated_hvac_kw`
- alarm: `P_hvac > rated_hvac_kw` OR `T_supply > setpoint_T + 3`

**LIGHTING:**
- warning: any zone `continuous_on_hours > 20`
- alarm: `P_lighting_total > rated_lighting_kw`

**COMPRESSED AIR:**
- warning: `receiver_psi < 116` (approaching low edge of 115–120 band)
- alarm: `receiver_psi < 112 OR receiver_psi > 122`

### Dual-surface anti-contradiction rule

Both surfaces read exclusively from `deriveDashboardModel(state).alarmModel`. No DOM node computes its own alarm state. No `scene/` module has its own threshold logic. The derivation chain is:

```
plant.step(state, dt)
  → deriveDashboardModel(state)
      → alarmModel.hvac   ← dashboard DOM reads this
      → alarmModel.light  ← scene/runtime.mjs reads this
      → alarmModel.air    ← both read the same object
```

Consequence: a KPI tile CANNOT show `ALARM` while the corresponding 3D mesh shows normal emissive. The same `alarmModel.system` flag drives both. This enforces GOAL.md §1 ("two DOM surfaces describing the same state cannot contradict").

### Surfacing in both layers

**Dashboard layer:**
- KPI tile `border-left` color changes (tile layout unchanged).
- Tier 1 PLANT STATUS chip shows count and worst state.
- System panel header pill changes text + background.
- Event log receives a timestamped entry (ISO time, dot color, short description).

**3D layer:**
- Affected equipment mesh: `material.emissive` set to the state color. For `alarm`, `emissiveIntensity` oscillates between 0.45 and 0.7 at 1 Hz inside `animate()`.
- Normal state: `emissiveIntensity = 0.0`.

The oscillation uses `Math.sin(performance.now() / 1000) * 0.5 + 0.5` — the same clock as the sim tick, so 3D pulse and dashboard badge updates are in phase.

---

## 5. The control set (ui_controls + URL query-state contract)

### Architecture

```
URL params
  → query-state.mjs parseControls()
      → state.inputs
          → plant.step(state.inputs, dt)
              → deriveDashboardModel(state)
                  → DOM update
                  → scene binding update
```

Every slider and input calls `history.replaceState` on change. The URL always reflects the current input values. The capture harness drives states by URL only; no harness code ever clicks a slider.

### Control table

| URL param | Label | Control type | Range | Default | Derived values moved |
|-----------|-------|-------------|-------|---------|---------------------|
| `dim` | Dim level | `<input type="range">` | 0–100 (%) | 80 | `Q_light`, `P_lighting`, `P_hvac` |
| `occ` | Occupancy | `<input type="range">` | 0–100 (people) | 40 | `Q_people`, `P_hvac` |
| `t_out` | Outdoor temp | `<input type="number">` | 15–45 (°C) | 32 | `Q_envelope`, `P_hvac` |
| `comp` | Compressor mode | `<select>` | `auto`, `0`–`5` | `auto` | `Q_comp`, `P_compressors`, `receiver_psi`, `P_hvac` |
| `recovery` | Heat recovery | `<input type="range">` | 0–100 (%) | 0 | `Q_comp` fraction bypassed, `P_hvac` |
| `bay_open` | Bay door | `<input type="checkbox">` | `0` or `1` | 0 | `Q_envelope` step increase, `P_hvac` |

**`comp` semantics:**
- `comp=auto` — lead/lag sequencing active; `compressed-air.mjs` manages which units run based on the 115–120 psi band
- `comp=N` (0–5) — override; N units forced ON. `comp=0` is a deliberate shutdown that will drive `receiver_psi` below the alarm threshold

**URL example:**
```
?dim=60&occ=25&t_out=35&comp=auto&recovery=0&bay_open=0
```

**Accessibility:** Each control has `<label for="ctrl-{param}">`. Range inputs have a sibling `<output>` element showing the live value. All six controls are in the bottom-right panel, grouped under a visible "WHAT-IF" heading.

---

## 6. Chart inventory

### Chart 1 — Stacked cooling-load composition bar

- **Type:** Horizontal stacked proportion bar (single bar, four colored segments)
- **Plots:** `Q_light`, `Q_comp`, `Q_envelope`, `Q_people` as % of `Q_total`, current tick only
- **Time window:** Instantaneous (no time axis)
- **Why this type:** Shows part-to-whole composition in 1D. Segments resize proportionally when any input changes. A pie chart requires radial math and fails at showing small changes. A grouped bar loses the "whole" concept and takes 4× the vertical space.
- **SVG sketch:** See §3 Mechanism A above (the stacked bar IS Mechanism A).

### Chart 2 — HVAC kW rolling trend (bottom-center panel)

- **Type:** Area line chart
- **Plots:** `P_hvac` over last 30 min
- **Time window:** 30-minute rolling buffer, stored in `dashboardModel.trends.hvacKw[]`. At 1 Hz sim tick: 1800 samples. Downsample to 300 display points at the SVG rendering step (`every = Math.ceil(series.length / 300)`).
- **Why this type:** Continuous variable over time; area fill communicates magnitude alongside trend. This is the gobernador's pressure chart pattern, applied to HVAC load. A bar chart would imply discrete buckets. A gauge would lose the time dimension.
- **SVG sketch:**
  ```js
  // W=570, H=148, L=34, R=6, T=6, B=22; inner: iw=530, ih=120
  const [mn, mx] = [Math.min(...series) - 2, Math.max(...series) + 2];
  const X = i => L + iw * i / (series.length - 1);
  const Y = v => T + ih * (1 - (v - mn) / (mx - mn));
  const path = series.map((v,i) => `${i?'L':'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const area = path + ` L${X(series.length-1)} ${T+ih} L${L} ${T+ih} Z`;
  // <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
  //   <stop offset="0%"   stop-color="var(--cyan)"  stop-opacity="0.35"/>
  //   <stop offset="100%" stop-color="var(--cyan)"  stop-opacity="0"/>
  // </linearGradient></defs>
  // <path d={area} fill="url(#hg)"/>
  // <path d={path} fill="none" stroke="var(--cyan)" stroke-width="1.5"/>
  // Y-axis: 4 gridlines, IBM Plex Mono 8.5px fill="var(--dim)"
  // X-axis: labels at -30min, -20min, -10min, now
  ```

### Chart 3 — Pressure trend with band annotation (inside COMP AIR sparkline slot)

- **Type:** Area line chart with reference band shading
- **Plots:** `receiver_psi` over last 30 min
- **Time window:** 30 min
- **Why this type:** The 115–120 psi operating band is the primary reference. A band shaded behind the line immediately shows containment vs. exceedance. A gauge (radial) shows current value but loses the time dimension — dangerous for a cycling pressure system where trend matters as much as value.
- **SVG sketch:**
  ```js
  // Draw reference band first (behind the pressure line):
  // <rect x={L} y={Y(120)} width={iw} height={Y(115) - Y(120)}
  //       fill="var(--accent)" opacity="0.08"/>
  // <line ... y1={Y(120)} y2={Y(120)} stroke="var(--accent)" opacity="0.25" stroke-dasharray="3 3"/>
  // <line ... y1={Y(115)} y2={Y(115)} stroke="var(--accent)" opacity="0.25" stroke-dasharray="3 3"/>
  // Then pressure line on top (blue stroke, blue fill gradient).
  ```
  At sparkline scale (48 px height), only the band hairlines are drawn; no axis labels. At Tier 3 drill-down scale (150 px), full axis is shown.

### Chart 4 — Per-system sparklines (sidebar panel footers)

- **Type:** Miniature area sparkline (no axes, no labels, shape only)
- **Plots:** HVAC → `P_hvac` kW; LIGHTING → `P_lighting` kW; COMP AIR → `receiver_psi`
- **Time window:** 10 min (600 samples at 1 Hz)
- **Why this type:** At 48 px height, axes are illegible. The sparkline communicates direction (rising / flat / falling) in a glanceable format — same technique as gobernador's KPI tile sparklines. The shape is the signal; the value is in the KPI row above it.
- **SVG sketch:**
  ```js
  // H=48, L=0, R=0, T=4, B=4; no axis text; stroke-width=1.2
  // Same path computation as Chart 2 but omit gridlines and labels.
  // viewBox auto-ranges to data: no fixed Y scale.
  // Fill: linearGradient, system accent color → transparent.
  ```

### Chart 5 — Coupling flow strip (physics narrative panel)

- **Type:** Process flow diagram (not a time-series chart)
- **Plots:** Q_total components → Q_total value → ÷ COP → P_hvac, all live values
- **Time window:** Instantaneous
- **Why this type:** No standard chart type answers the question "why is HVAC kW this specific number?" The flow strip is a purpose-built physics-equation visualizer. It is not decorative — it is the only element in the UI that names the ÷COP step explicitly.
- **SVG sketch:** Three boxes with arrow connectors in a 580 × 80 viewBox. See §3 Mechanism B above for the full SVG sketch.

---

## Appendix: Component vocabulary continuity with gobernador-dashboard

| gobernador component | nave-3sistemas equivalent | Change |
|---------------------|--------------------------|--------|
| `.kpi` tile (with sparkline) | Tier 1 condensed tile (no sparkline) | sparkline dropped for 64px band constraint |
| `.kpi` tile with spark | Tier 2 panel KPI row + panel sparkline | same anatomy, different layout position |
| `.srow` sequencing row | Tier 3 drill-down KPI rows | identical structure, different context |
| `.pill` status chip | status pill in system panel header | identical |
| `.trend-wrap svg` + hover tooltip | Chart 2 (HVAC trend) | identical implementation pattern |
| `.ev` event log row | event log in bottom-right panel | identical |
| `.pipe.flow` animated dash | no P&ID in this dashboard | scope reduced to 3D scene |
| `.tab.on` floating tabs | floating tabs on 3D canvas top-left | identical |

No new component primitives are introduced. All components are drawn from the gobernador vocabulary. This is intentional — visual continuity reduces design decisions during build.

---

*Document: DASHBOARD-UX.md · nave-3sistemas · 2026-08-13*
*Governing docs: GOAL.md, ARCHITECTURE.md*
*Three r160 · IBM Plex Sans/Mono · dark industrial tokens · no chart libraries*
