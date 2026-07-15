# Decision brief — cinemex per-RTU operations dashboard ("Cartelera")

**Phase 1 of the anti-ai-ui pipeline** · 2026-07-15 · vibra locked below · studies come next.

## Who decides what, staring at this screen

A **building operator** (es-MX) responsible for the multiplex's HVAC fleet. Their decisions, in
frequency order: (1) "is anything wrong RIGHT NOW?" → which unit, which zone, how bad; (2) "is
this alarm a comfort complaint or an equipment failure?" → temperature vs setpoint vs delivery
status; (3) "is the data trustworthy?" → is Niagara still receiving from that unit; (4) "what has
this unit been doing?" → 24h trend before calling maintenance. NOT a data analyst; NOT marketing.

## Primary-task walkthrough (the loop the UI must serve)

3D viewer → operator sees a red chip (or opens the dashboard directly) → ONE click on the chip
(or its cartelera slot) → the unit's view: identity (zone, RTU id, TC300 id), live temperature
welded to its setpoint band, delivery status, alarm state, 24h trend, the unit's place in the
canonical chain → operator decides (dispatch / acknowledge / keep watching) → ONE obvious step
back to the fleet. Deep-link (?unit=RTU-08) must reproduce the unit view cold.

## Subject world (where the aesthetic is allowed to come from)

A CINEMA at night: dark halls, luminous screens, marquee typography, "now showing" boards,
projection-booth equipment discipline. Plus the building's own operational world: RS-485 green,
LoRaWAN blue, alarm red, offline gray — the gated media palette of the 3D scene. The dashboard is
the projection booth of the building.

## Anti-references (what this must NOT look like)

- The hotel dashboard's B11 paper/navy/rust skin (mechanisms borrowed, skin FORBIDDEN — user
  mandate: cinemex has its own identity).
- Generic admin templates: card grids with drop shadows, donut-chart KPI rows, gradient hero
  headers, emoji decorations, purple-on-white SaaS chrome.
- Movie-kitsch: film-reel icons, clapperboards, star ratings. The cartelera move is typographic
  and structural, never clip-art.

## Information shape (real data, from the existing simulation — one source of truth)

- 14 units × {zone (es-MX name), RTU id, TC300 id, live temp (1 decimal), setpoint band, state
  (normal | alarm | hot), delivery (normal | stopped), UC bus (A-D)}.
- Fleet rollup: counts by state; active alarm list (already derived by deriveHudModel).
- Per-unit 24h series (synthetic, seeded deterministic — same policy as the hotel's).
- The canonical chain per unit: TC300 → RS-485 bus → UC100-x → LoRaWAN → UG67 → Ethernet → Niagara
  with per-hop delivery state (the sim's traceFrom/evaluateReachability already computes this).

## Locked vibra

**B15 Dark Scientific Terminal** (certified, vibra-catalog.md §6). Rationale bound to the subject
world: a cinema IS a dark room with luminous content; continuity with the 3D viewer's #06080d;
maximal distance from the hotel's B11. Cinemex red #c8102e reserved as the BRAND accent (marquee
band, active states) — alarm red stays the gated #ff334d, never confused with brand red.

## Signature moves (from the certified bank + one domain move)

1. **Cartelera de temperaturas** (domain signature): marquee-style header band where salas 1L-8S
   appear as "now showing" slots — zone, live temp, state. Typographic, condensed, uppercase.
2. **Mimic as centerpiece**: the thermal roof plan (top view) as the fleet's navigable hero.
3. **Instrumented one-line diagram**: the unit page's spine is the canonical chain as one
   horizontal instrument line with live values per node.
4. **Big-value + range band** (Hollifield): unit temp oversized mono, welded to setpoint band;
   color ONLY for abnormal.
5. **STATUS-pill heartbeat row**: LIVE/STALE per unit from niagara delivery.
6. **Reverse-video alert block**: the active alarm as inverse video. No glow, no pulse.

## Mechanisms borrowed (library rows, mechanism-never-skin)

in-page-drill-overlays (+ ?unit= deep-link sync — our addition), svg-hand-rolled-charts,
kpi-tile-gauge, zone-status-rollup, per-unit-mini-scene (stretch: mini 3D twin per unit).

## Controls relocation (agreed with the user, applies to the 3D viewer page)

Mode switch stays top · cameras → horizontal bar at canvas bottom edge · layers → collapsible
popover · faults → separate "Escenarios" drawer with danger styling · legend → floating canvas
chip · breadcrumb for 3D ↔ dashboard navigation.

## Non-negotiables

es-MX operator language (no marketing copy) · WCAG contrast computed · keyboard + reduced-motion ·
truthful static fallback · real-data shapes from the sim · deterministic seeds (capturable) ·
tabular-nums for all readings · deep-links reproduce state cold.
