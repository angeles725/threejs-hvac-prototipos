# Block 43 — Casino BMS dashboard (React reference) + consolidated hotel detail-OVERLAY build plan

> **What**: Analyzes the ORIGINAL reference design behind MX60/chihuahua — the `niagara-casino` React/Vite
> BMS dashboard (`modules/BMS/casino/niagara-casino`) — focusing on the per-unit DETAIL VIEW (focused 3D +
> KPI cockpit + charts + insights), and consolidates all three references ([Block 42] + this) into a concrete
> plan to build a full-screen detail OVERLAY inside the Three.js hotel scene (user-approved approach).
> **Finding**: the detail view is an OVERLAY over a persistent master scene, and the focused single-unit 3D is
> a DEDICATED mini-scene component (`RtuModel3D.jsx`) — NOT a camera move on the big scene. The 3D/charts are
> raw Three.js r183 + Chart.js 4.5, no @react-three/fiber, so they lift out to vanilla with only the React
> lifecycle glue rewritten. **Sources**: `niagara-casino/src/` — `App.jsx`, `EquipmentPanel.jsx`,
> `layouts/PkgUnitLayout.jsx`, `layouts/RtuModel3D.jsx`, `layouts/CisternModel3D.jsx`, `PkgTempEnergyChart.jsx`,
> `PkgInsightsPanel.jsx`, `utils/insights.js`, `theme.js`, `index.css`; data via Supabase polling `[CERT]`.
> **Markers**: `[CERT]` reference source · `[INFER]` port deduction. Block type: **REFERENCE ANALYSIS + BUILD PLAN**.

---

## 43.1 — Casino patterns that decide the hotel design `[CERT]`

- **Overlay, not route**: the master 3D scene (`CasinoHVAC3D`) is always mounted; detail views render on top as
  `position:fixed; inset:0; z-index:300; background:#070A15` overlays with an opacity fade-in (`App.jsx:209-383`,
  `EquipmentPanel.jsx:457-462`). State-preserving, instant.
- **Type dispatch**: `EquipmentPanel` → `pkg→PkgUnitLayout`, `cistern→CisternLayout`, `extractor→ExtractorLayout`
  (`:611-635`); 3D-bearing layouts lazy-loaded.
- **Cockpit grid** (`.rtu-cockpit`, `index.css:41-54`): `grid-template-columns:200px minmax(0,1fr) 320px`,
  areas `metrics / (left | center-3D | right-controls)`. KPI strip (11 tiles) on top; left = brand+status+setpoint+
  legend; center = the focused 3D + drag hint; right = MANUAL/AUTO + FAN/COMP1/COMP2 toggles (RBAC-gated).
- **Focused 3D (`RtuModel3D.jsx`, raw Three.js in one `useEffect`)**: 100% procedural RTU; `PerspectiveCamera(40°)`
  `target(29,12,14)`, OrbitControls damping + `autoRotate 0.4`; PMREM `RoomEnvironment` IBL; ACES + PCFSoft.
  Props `{fanOn,sys1On,sys2On,alarm}` → `state{fan,c1,c2}∈on|standby|alarm`; `applyState()` maps state→emissive
  (`ON 0x00ff66 / OFF 0xff2233`) on LEDs/compressors/blower/condenser-fans + PointLights; `animate()` spins blower
  only when fan on, vibrates compressors, sin-pulses alarm, and streams 120 airflow particles (return orange /
  supply blue) gated on run state. Perf: IntersectionObserver + visibilitychange RAF gating, ResizeObserver,
  dt-clamp, mobile downgrades, **full dispose** (traverse→dispose geo/mat, pmrem+renderer dispose, remove canvas).
- **Charts (Chart.js 4.5)**: `TempTrendChart` (abasto/retorno, casino+exterior) with a **comfortBandPlugin**
  (filled y-band) + dashed **"(ayer)" baseline** (time-shifted ≥86400s) + forward-fill + downsample(150) +
  instance-reuse `update('none')`. `PkgTempEnergyChart` = dual-axis kWh vs exterior temp with $-cost tooltip.
  `PkgHourlyChart` = bars + avg-line + operating-band plugins.
- **Insights engine** (`utils/insights.js`, pure functions): plain-Spanish operator advice — consumption vs
  7-day baseline + weather attribution, supply-temp baseline, avg kW while running, load-vs-weather, cycling,
  **amps-trend → days-to-threshold prediction**, after-hours savings $, z-score anomaly, temp↔energy correlation.
  Availability-gated (≥7 baseline days) → cold start shows "Recopilando datos…". This is the real predictive layer.
- **Discipline**: "zero fake data" (null → render "—", control state only from explicit booleans), procedural
  canvas textures, CPU vertex-wave water (`CisternModel3D`), raycast pick via `mesh.userData.id`.
- **Tokens**: bg `#070A15`, cockpit `#05070c`, glass cards `rgba(12,16,33,0.65)`; accent CYAN `#00F0FF`, gold
  `#d4a26a`; series abasto `#3b82f6`/retorno `#ef4444`/casino `#f59e0b`/exterior `#38bdf8`; Plus Jakarta Sans +
  DM Sans + DM/JetBrains Mono. Single dark theme.

## 43.2 — Consolidated build plan: hotel detail OVERLAY (approved approach) `[INFER]`

The hotel already has the master scene + procedural builders + per-unit simulated data. Build the overlay in
iterations, each syntax-checked + committed + deployed:

- **It.A — Overlay shell + focused 3D + KPI cockpit** (first): a `#detailOverlay` (`position:fixed; inset:0;
  z-index:300`, fade-in) opened from the existing selection ("Ver detalle" button on `#roomPanel`). Layout =
  the casino cockpit grid (KPI strip / left status / center 3D / right — for the hotel, drop write-controls,
  keep read-only status + setpoint). **Focused 3D** = a dedicated mini-scene that instantiates the selected
  unit's EXISTING builder (`buildChiller('hi')`, `buildPump`, … or a single room module) with its own Scene/
  camera/OrbitControls/renderer + shared PMREM env; `{update(state), dispose()}` API; state→emissive + spin +
  alarm-pulse from `equipData/roomData` state. Strict dispose on close (no WebGL leak). SVG arc gauges for temps.
- **It.B — Charts**: Chart.js (local bundle, no `@` URL) trend cards with a simulated 24h history + comfortBand
  + dashed "ayer" baseline; O(1) live append tied to the existing 1 Hz jitter.
- **It.C — Insights**: port the availability-gated insight generators (adapt to hotel metrics: room temp vs
  setpoint trend, amperage days-to-threshold, after-hours savings) as plain Spanish operator advice.

React-specific glue to reimplement in vanilla: useState/useEffect → module init + a state object + `dispose()`;
data hooks → the existing `roomData/equipData` + `setInterval`; JSX components (KpiCard, ArcGauge, SystemToggle)
→ DOM/template functions. The Three.js model bodies and Chart.js plugin configs port nearly verbatim.
