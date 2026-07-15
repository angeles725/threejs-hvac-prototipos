# Apply report — Cartelera dashboard, attempt 1 (production build of the bound skeleton)

Writer role; perceptual verification belongs to the anti-ai-ui browser matrix afterward. The 3D
viewer remains gated-frozen except the two declared integration points. No commits, no captures.

**Suite: 261 pass / 0 fail** (250 existing + 11 new in `tests/dashboard.test.mjs`). `node --check`
clean on every touched file. RED-by-construction: the test file's import graph
(`src/dashboard/*`, the `ALARM_LIMITS` export) does not exist in the pre-round tree, and the
behavioral assertions (verdict kinds per real scenario state, delivery-driven pills, chain-tail
death, tick-driven timestamps) were written against the sim's real outputs, not tuned after.

## What shipped

- **`dashboard.html`** — production page: marquee band (the ONLY brand-red surface) with the
  breadcrumb `← Cinemex 3D`, fleet rollup strip, persistent reverse-video alarm banner, the
  cartelera board (fleet view), and the unit view ("la función"). B15 tokens exactly
  (`#0E1116 / #F4F1EA / #2A2D33 / #F5A623 / #009E73` + brand `#c8102e` + gated alarm `#ff334d`);
  IBM Plex Mono everything, Plex Sans Condensed sections, ONE Plex Serif italic line (the
  verdict) — the same Google Fonts pattern the studies used; no other external request; no chart
  libraries, no frameworks, no icons/emoji; `tabular-nums` on body.
- **`src/dashboard/model.mjs`** — the derived view model over `createInteractionModel` (the SAME
  simulation/topology/alarm derivation the viewer HUD reads — one source of truth, zero data
  duplication): unit identity (RTU-XX ↔ TC300-XX, validated), deep-link parse/serialize
  (fixed-point, malformed input degrades to the fleet), breadcrumb/viewer URL builders (unit
  context → `index.html?state=…&camera=top&selection=TC300-XX`), per-unit chain hops from the
  sim's own `routeStatus`/`deviceStatus`/`niagaraDelivery`, and the verdict derivation.
  Documented presentation constants: `COMFORT_TOLERANCE_C = 1.5` (band graphics only — alarm
  truth stays the sim's `ALARM_LIMITS`, now exported from `src/alarms.mjs`) and
  `EQUIPMENT_EXCEEDANCE_C = 2` (equipment-vs-comfort threshold).
- **`src/dashboard/series.mjs`** — seeded deterministic 24 h series (hotel policy): mulberry32,
  **seed = `APP_CONFIG.animation.seed` (30067) + unitIndex × 37**, 48 points/30 min,
  mean-reverting around the setpoint (flat line = healthy), 5-hour failure ramp in alarm, last
  point IS the live reading. Documented in the page footer too.
- **`src/dashboard/render.mjs`** — pure string builders: cartelera slots, banner, rollup, chain
  instrument line, unit view, hand-rolled SVG sparkline + 24 h chart (shared fixed 17–33 °C
  scale).
- **Integration point 1** (`main.js` + `index.html`/`styles.css`, minimal): clicking a visible
  temperature chip navigates to `dashboard.html?unit=RTU-XX` preserving the scenario state; a
  quiet `Cartelera →` link joins the viewer header.
- **Integration point 2**: the dashboard marquee's `← Cinemex 3D` breadcrumb; from a unit view it
  returns to the viewer on the thermal roof plan with that unit's thermostat selected.
- **Controls relocation: NOT touched** (deferred per the brief — the gated viewer panel baseline
  stays valid).

## The mandated grafts (blind verdict)

- (a) **Per-row 24 h sparkline** (study-c): 120×26, dim stroke, no axes/dot — subordinate to the
  value+state pair by construction; inside a reverse-video alarm row it switches to canvas ink
  (the dim stroke fails contrast on alarm red: 1.22).
- (b) **Persistent alarm banner** (study-b): reverse video, no glow/pulse, present on EVERY view
  including another unit's page, with the direct **“Ver unidad”** jump (+`n evento(s) más` when
  multiple).
- (c) **Operator verdict foot** (study-c): serif-italic phrase closing the unit view —
  `sin-accion` (“Sin acción requerida.”), `confort`, `equipo` (study-c's equipment phrase), and
  `datos` (data-trust) — derived from alarm × delivery × exceedance. Against the real states:
  hot-kitchen (31.2 °C, +3.7 over limit) → **equipo**; hot-sala-3 (29.4 °C, +1.9) → **confort**;
  fault-tc300 → **datos**; healthy → **sin-accion**.
- (d) **Fixes**: the back button's border/focus outline uses the GO green `#009E73` from the
  gated status map (NOT amber — amber remains the global focus color everywhere else); every
  “Ver función” label is gone — the action is “Ver unidad” (test-asserted).

## Non-negotiables — evidence

- **WCAG contrast (computed)**: ink/canvas **16.77**, dim/canvas **6.41**, canvas-on-GO pill
  **5.53**, canvas-on-amber **9.33**, canvas-on-alarm (reverse video) **5.25**, ink-on-brand
  (marquee) **5.22**, alarm-text-on-canvas **5.25**, ink-on-panel **15.62** — all AA for normal
  text. The one failing pair, dim-on-alarm (**1.22**), is banned by rule: inside reverse-video
  surfaces every stroke/text is canvas-dark (enforced in slots and asserted for the sparkline).
- **es-MX operator language** throughout (readings `toFixed(1) + ' °C'` matching the HUD; STATUS
  pills **EN VIVO / DETENIDO** from `niagaraDelivery`; alarm pill in reverse-video slots).
- **Keyboard**: slots are real buttons (tab order + Enter); Escape returns to the fleet; opening
  a unit focuses the back button; returning focuses the unit's slot. **Reduced motion** honored
  (media query; the page has no animation to begin with). **Truthful static fallback**: noscript
  states there is no data without the simulation — nothing invented.
- **Determinism**: the page renders one `createDashboardModel({state, tick})` evaluation; the
  marquee clock is the sim's own telemetry timestamp (t0 ≠ t30, reproducible; no `Date.now`).
  Deep-link `?unit=RTU-08&state=hot-sala-3&tick=30` reproduces the unit view cold
  (pushState/popstate round-trip like study-c).

## Tests (11)

Identity mapping · deep-link fixed point · malformed-query degradation · breadcrumb URLs ·
model determinism + sim-identity per unit + rollup · fault-tc300 delivery/chain-tail ·
board ordering (salas first) · verdict matrix (pure + 4 real states) · series determinism
(seed policy, anchoring, flat-healthy, monotone ramp, guards) · graft surface (banner/slot/
unit-view/sparkline-inverse, “Ver unidad” asserted, “Ver función” banned) · sim-clock times.

## The ONE riskiest change

**Integration point 1 changes the gated viewer's click behavior at exterior cameras.** The
pointerup handler now tests the temperature-chip group BEFORE device picking; where a chip
overlaps a device on screen (only possible when chips are visible, i.e. exterior views), a click
that previously selected the device now navigates to the dashboard. Capture evidence is
unaffected (gate captures drive selection via URL, never clicks), but the interactive flow at
complete-network changes. Pre-look: click empty sky, a device, and a chip at complete-network —
only the chip should navigate.
