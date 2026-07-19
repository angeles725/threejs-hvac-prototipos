# BRIEF — cinemex viewer: lateral menu round (anti-ai-ui pipeline)

Date: 2026-07-16 · Consumer: `disenos/cinemex-hvac-lorawan/` (index.html viewer + dashboard.html cartelera)
Vibra: **B43 Light SaaS Operations Console** (LOCKED — client mandate, certified 2026-07-16,
tokens: `~/.claude/skills/anti-ai-ui/assets/tokens/light-saas-console.tokens.json`). The client
supplied dark-theme reference screenshots; per the client-reference intake procedure they are a
STRUCTURE donor only. **Palette does not move** — the user stated this twice.

## Decision brief

Replace the top command bar with a **pin/unpin collapsible lateral menu** carrying ten sections,
make the app responsive across four tiers (phone / tablet / laptop / desktop), and keep every
existing control contract alive. The 3D viewer becomes the main page (Dashboard hero).

## Subject world

A cinema multiplex operations console: 14 rooftop RTUs (TC300 zone controllers), a LoRaWAN
telemetry chain (UC100 nodes → UG67 gateway → Niagara), sala/lobby/kitchen zones. The operator
is a maintenance tech or facilities manager in es-MX. The 3D building IS the domain object —
navigation, layers and state all orbit it.

## Anti-references (what this must NOT look like)

- The client's reference screenshots' SKIN: near-black grounds, neon-green accents, glow. That
  skin is the 2026 AI-BMS centroid. We take its information architecture and reject its look.
- The dark casino/MX60 look (project memory: explicitly banned).
- Generic admin-template sidebars: icon-only rails with tooltip-on-hover as the only labels,
  hamburger-reveals-everything on desktop, gradient active states.

## Information shape (per section — from the client reference, adapted)

| Section | Content | Data source |
|---|---|---|
| Dashboard | 3D viewer as hero + summary cards: zone table (temp/target/mode/humidity-proxy), energy now, weather/time card, alerts count | existing simulation.mjs + NEW sim modules |
| HVAC | zone plan focus: camera preset to top/technical, temperature chips foregrounded, per-zone table | existing (chips, presets, telemetry) |
| Fans | RTU fan inventory (14 units, fan state auto/off), toggle-shaped but read-only truthfully labeled | existing telemetry.fan (constant) — honest presentation |
| Plant Room | RTU fleet detail: per-unit compressor/fan runtime hours, setpoints, drop/curb contact facts | derive from topology + NEW deterministic runtime-hours sim |
| Lighting | named scenes (apertura/función/cierre/exteriores) driving the EXISTING lighting states + sala lights toggle | existing lighting.js states, scene names NEW |
| Energy | now/prev-day/month cards + per-RTU meter table (kW, V, PF) | NEW deterministic sim (seeded, es-MX units) |
| Trends | 24h sparkline grid per unit (temp + energy), reuse dashboard series builders | existing series.mjs + render.mjs SVG builders |
| Alerts | category chips (HVAC/Temperatura/Comunicación/Sistema) + device table severity/reset | NEW: deterministic alert derivation from sim deviations (fault machinery was deleted — do NOT resurrect fault states in the 3D scene; alerts live in menu data only) |
| Weather | current conditions card + 5-day strip (Mexico City, seeded deterministic) | NEW sim |
| Schedules | weekly grid: sala schedules (apertura/cierre per day) + RTU setpoint calendar | NEW sim |

Menu bottom (like the reference): none of Support/Users — out of scope this round.

## Primary-task walkthrough (the task the design must make effortless)

An operator lands on Dashboard, sees the building in 3D with temperature chips, spots the
kitchen running warm on the zone table, clicks HVAC → camera moves to the technical view with
chips foregrounded, confirms the zone, opens Trends → sees the 24h curve for that RTU, then
pins the menu closed to work the 3D view full-width. On a phone, the same journey happens with
the menu as a drawer and the 3D viewer remaining usable between steps.

## Hard constraints (from the terrain map — violating any of these breaks gated evidence or tests)

- KEEP: `#camera-select` + all its `<option>`s (tests/shell.test.mjs:467-468), `data-mode`,
  `data-layer`, `#cutaway-toggle`, `#fullscreen-toggle` selectors (main.js:114-171 queries them),
  `#selection-card` family, `<main id="app">`, `#fatal-panel`, `#app-status`, `#pass-label`.
- NEVER reintroduce `information-panel` / `alarm-strip` markup (ux-corrections tests assert absence).
- `SURFACE_EVIDENCE_VIEWPORT` 688×636 (src/scene/surfaces.js:42-46) is gated-evidence geometry:
  responsive is CSS-layout only; the capture path stays pinned.
- MODO/CÁMARA/CAPAS/Pantalla-completa controls FOLD INTO the menu (a "Vista" group) — they must
  not disappear.
- `writeQueryState` is a no-op; inbound deep links (`?camera=&state=` + `embed`) must keep working.
- UI copy: es-MX operator language. Code/comments: English.
- Four responsive tiers: desktop/laptop = pinnable sidebar beside viewer; tablet = starts
  collapsed, pinnable; phone = overlay drawer. Pin state persists (localStorage).
- No new dependencies. Vanilla ES modules like the rest of the app. All simulation NEW modules
  deterministic (seeded), following simulation.mjs conventions.

## Study permit

STUDY PERMIT issued for exactly THREE disposable structural studies under locked B43. Studies
explore MENU STRUCTURE + DASHBOARD COMPOSITION only (DOM/CSS, fake-but-shaped data, no THREE):
- Study axis: how the menu, the 3D hero and the section content share space across the 4 tiers.
- Study code never ships. Reject-all is legal.
