# Block 42 — Per-unit DETAIL VIEW pattern (MX60-web + chihuahua/Niagara) → hotel port plan

> **What**: Analyzes the dedicated per-equipment/room DETAIL VIEW used by the Honeywell MX60 dashboard
> (`ALSER/Proyectos/Pagina/Honeywell-MX60`) and its upstream Niagara-N4 source-of-truth
> (`modulos_niagara_n4/Cliente/Honeywell/MX60/chihuahua`), and extracts the portable pattern to bring a
> dedicated detail view (values + charts + **3D focused on only that unit**) into the Three.js hotel scene.
> **Finding**: the two share the SAME hash-routed SPA frontend; chihuahua is the more advanced build.
> Everything visual — the focused single-unit Three.js scene, SVG arc gauges, and Chart.js trends — is
> standard WebGL/Chart.js and **lifts out cleanly**. Only the DATA SOURCE is Niagara-bound (a `BWebServlet`
> at `/mx60`, `/api/historyData` over `BHistoryDatabase.timeQuery`, baja ord subscriptions, ES5-no-transpiler).
> **Sources**:
> - `Honeywell-MX60/web/js/app/` — `EquipmentDetail.js` (dispatcher), `UpDetail.js`/`ChillerDetail.js`/
>   `CarcamoDetail.js`/`DataloggerDetail.js`, `ChartTheme.js`, `Router.js`, `DashboardApp.js`, `SharedEnv.js` `[CERT]`.
> - `chihuahua/` — `FRONTEND_ARCHITECTURE.md`, `chihuahua-ux/.../BChiServlet.java`, `ChiHistoryHelper.java`,
>   same `rc/` SPA (UpDetail/CarcamoDetail with the focused 3D + Chart.js trends) `[CERT]`.
> **Markers**: `[CERT]` reference-project source · `[INFER]` port deduction. Block type: **REFERENCE ANALYSIS + PORT PLAN**.

---

## 42.1 — The detail-view anatomy (identical in both; chihuahua is the newer build) `[CERT]`

**Routing.** Hash router: clicking a unit → `Router.navigate('#detail/<id>')`; `parseHash` yields
`{page:'detail', params:[id]}`; the detail highlights the parent nav (sub-view of the list). One static
empty `<section id="page-detail">`; `DashboardApp._onRouteChange` toggles `.active`, calls the previous
page's `destroy()`, then `module.mount(section, route)`.

**Type dispatch.** `EquipmentDetail` is a thin orchestrator: `registerRenderer(type, fn)` + `render()` looks
up `_renderers[equip.type]`; unknown → placeholder that is **upgraded in place** when a late ES-module
renderer registers (fixes QR cold deep-links). Each renderer returns `{ destroy }`.

**Cockpit layout** (`up-detail-shell`): `.detail-header` (back + type/planta tags + title + status pill) →
KPI tiles row → 3-col grid `[ left: protections/identity | center: #viewer 3D | right: controls ]` →
`.up-trends-grid` charts → maintenance log. Collapses to 1-col < 900px.

## 42.2 — Focused single-unit 3D (the core; fully portable Three.js) `[CERT]`

Each detail page mounts a **bespoke Three.js mini-scene of JUST that one unit** (UP, Chiller, Cárcamo have
3D; Datalogger uses a state-picked hero JPG — not every type needs 3D). Key traits:
- **Procedural geometry** (no glTF): `box/panel/tube/cyl` helpers + a PBR material palette assemble a
  realistic cut-away unit (~350 meshes for the UP: skid, cabinet, finned coil, squirrel-cage blower,
  2 compressors, condenser fans, refrigerant lines, LED spheres).
- **Scene API** `{ setState, onResize, toggleRotate, destroy }`. `deriveState(equip) → {fan,c1,c2}∈
  standby|on|alarm` from live slots + alarm latches; `applyState()` writes emissive color/intensity into
  fans/LEDs/compressors (`STANDBY 0x3aa6ff / ON 0x00ff66 / ALARM 0xff2233`) + toggles PointLights;
  `animate()` spins the blower only when fan==='on', bobs compressors, sin-pulses emissive on alarm, and
  drives ~120 airflow particles (return red / supply blue) gated on run state. Cárcamo binds a continuous
  reading directly to geometry (water column `scale.y`/`position.y` from `nivelCm` 0–100%).
- **Camera**: fixed `controls.target` + per-viewport captured `camera.position` (mobile vs laptop),
  gentle `autoRotate`, a "↻ Rotar ON/OFF" toggle.
- **Perf discipline (chihuahua's newer refinements)**: ONE shared PMREM env (`SharedEnv.getEnvTexture`,
  RoomEnvironment) reused across mounts; device-aware renderer (antialias/pixelRatio/shadows off on mobile);
  `IntersectionObserver` pauses `animate()` off-screen; `clientWidth/Height` getter cache to avoid
  OrbitControls reflow; staged async mount (RAF yields, "Cargando vista 3D…" spinner, lazy particles);
  strict `destroy()` (traverse→dispose geo/mat, `renderer.dispose()`, remove canvas, unsubscribe).

## 42.3 — Charts + gauges (portable) `[CERT]`

- **Chart.js (UMD) + date-fns time adapter**, loaded before RequireJS. Per-type trend grid (UP has 7:
  abasto/retorno, zona, succión, ΔT, amp comp/fans/fan with a right `y1` amp axis). Features: range tabs
  (1h/8h/24h/7d…), dashed **"ayer" baseline** overlay (same time-of-day −24h), comfort bands as y-regions,
  cross-chart synchronized cursor (`CursorParity` plugin), centralized dark/light `ChartTheme.chrome()`,
  `animation:false` + `update('none')`, and **O(1) live append** (`_appendLiveSample`) instead of rebuild.
- **SVG arc gauges** (`_arcGaugeSvg`, 270° stroke-dasharray, CSS-animated) for temperature tiles —
  dependency-free.
- History source is the only Niagara piece (`/api/historyData` → `BHistoryDatabase.timeQuery`; falls back
  to an in-memory `LiveHistoryBuffer`). Data shape is plain `{t, <slot>}` — provider-agnostic.

## 42.4 — Design tokens `[CERT]`

bg `#06080d`, surface `rgba(17,24,39,0.6)`, border `rgba(255,255,255,0.06)`, accent teal `#00d4aa`
(Chiller overrides to violet `#a78bfa`); status `ok #10b981/#00e676`, warn `#f59e0b/#fbbf24`,
critical `#ef4444/#ff4455`, offline `#475569`. Fonts: Inter (body) + **JetBrains Mono** (all numbers, chart
ticks). The 3D `scene.background`/`fog` match `--bg` so the viewer blends into the page. Full light theme.

## 42.5 — Port plan for the hotel (drop the Niagara coupling) `[INFER]`

The hotel already has the hard part: **procedural builders per equipment** (`buildChiller/buildPump/buildTower/
buildCaldera/...` and the room kit in `buildEdificio`) and per-unit simulated data (`roomData`/`equipData`).
So a focused single-unit detail view is a natural extension, NOT a rebuild:

1. **Detail view host**: a full-screen overlay (or dashboard route) opened from the current selection —
   the existing `selectUnit(id)` already knows the unit; add a "Ver detalle" affordance → open the detail.
2. **Focused 3D**: instantiate the unit's EXISTING builder (`buildX('hi')`) into a **dedicated mini-scene**
   (own Scene/camera/OrbitControls/renderer), framed on that one unit, with the same `{setState, toggleRotate,
   destroy}` API — reuse the spinner/particle-ON-by-state idea. Reuse the shared PMREM env pattern.
3. **KPI cockpit**: the readings we already simulate (temp/setpoint/humidity/amperage + per-type metric) as
   tiles + SVG arc gauges; the predictive DIAGNÓSTICO block we already built.
4. **Charts**: Chart.js (local bundle, no `@` in the CDN URL) trend cards with a simulated 24h history +
   the dashed "ayer" baseline; wire O(1) append for the live jitter.
5. **Strict teardown** on close (dispose the mini-scene) — a hard requirement to avoid WebGL context leaks
   when opening many rooms.

Not every type needs 3D (Datalogger uses a hero image) — hotel rooms + hero equipment get 3D; minor units
can show gauges+charts only. Decision pending with the user: full-screen overlay in the scene vs. a
dedicated route in the dashboard.
