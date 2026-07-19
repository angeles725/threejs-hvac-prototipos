# Client round 4 — three approved mockups (HVAC / Energía / Alertas)

Date: 2026-07-18 · Pipeline: single writer, strict TDD (RED-first) · Scope: `disenos/cinemex-hvac-lorawan/` only.

## Direction

The client approved three mockups (HVAC, Energía, Alertas) that replace/evolve the round-3
section bodies. Fidelity upgrade mid-round (user override): 1:1 anatomy against the mockups,
sidebar brand block included (multi-hue logo mark = the ONE sanctioned exception to the
token-only palette, scoped to the logo), mockup number/date formats — but every VALUE stays
derived from the deterministic sims. No camera-view labels anywhere. Every visible control works.

## What shipped

### HVAC (replaces the zone-card grid + detail aside)
- Top strip (4 cards): "Ver en la sala" promo (copy about the live 3D model, button truly
  navigates to Tablero via `data-go-section`), plus three derived KPI cards with icon tiles and
  accessible derivation tooltips (`title` + `aria-label`): Temp. promedio (mean of the 14 live
  temps), Zonas fuera de banda (±1.5 °C count as "N / 14", warn-inked tile when N>0), Equipos
  enfriando ("N / 14" + "NN% del total").
- "Unidades por zona" table: live search (case/diacritic-insensitive over unit tag and zone),
  Filtros popover with truthful Modo chips (Todos / En espera / Enfriando — no invented
  "Atención" state), functional "Exportar CSV" (data: URI download of the CURRENT
  filtered/sorted rows as `cinemex-unidades.csv`), sortable Unidad/Temp headers (arrow glyphs +
  `aria-sort`), signed Desvío inks (+warm / −cool / 0 muted), truthful mode dot-pills, per-row
  chevron reusing the existing unit-page mechanism (`dashboard.html?unit=RTU-xx`).
- Footer: live legend ("N En espera · N Enfriando", derived from the visible rows),
  "Mostrando 1 a N de N unidades", pager present with both ends disabled (14 rows = one page).

### Energía (evolves kpi-hero + table)
- Four top cards: Ahora (bolt tile, live kW, "vs. día anterior ±N.N%" colored delta, fleet
  sparkline = pointwise sum of the 14 unit series, hover contract on), Día anterior and Mes
  (calendar tiles, kWh, seeded "vs. mismo día ant." / "vs. mes anterior" comparisons, sparklines
  on their own seeded streams — no hover data because their axes are not the last-24h grid),
  Distribución actual (4-segment SVG donut + legend with one-decimal shares, foot
  "Actualizado: <sim date> · hora simulada").
- New sim surface (`src/sim/energy.mjs`): `createEnergyDistribution` (documented seeded split:
  per-unit fan share 17–23% of RTU demand → Ventilación, rest → Climatización; fixed always-on
  lighting and "otros" baselines; one-decimal shares largest-remainder corrected to sum exactly
  100.0), `vsSameDayPct`/`vsPreviousMonthPct` (seeded ±6%/±5% factors, auditable against their
  own kWh pairs), `createFleetEnergySeries`, `createPreviousDaySeries`, `createMonthDailySeries`.
- "Medición por unidad" table: tag chip + truthful delivery dot, per-row 24 h kW sparkline, kW
  sortable (desc default), V, FP, chevron to the unit page. Footer: honest count, functional
  "Filas por página" select (10/25, default 25 shows all 14), ‹ › pager.

### Alertas (evolves round 3)
- Category chips with counts over the whole day universe (active + resolved) so every number
  reconciles with the table; zero-count chips (Comunicación/Sistema) look disabled but stay
  functional and land on the honest empty state.
- Three summary cards: Críticas (red bell tile), Advertencia (amber triangle), Resueltas (hoy)
  (green check) — each with a functional chevron that filters the table by that severity.
- Resolved count is TRUTHFUL history: `deriveResolvedEpisodes` walks the sim day (00:00 → live
  tick) on the product's own 30-min series grid (360 ticks @ 5 s) and counts deviations that
  left the alarm band and came back. Only the smooth series (zone temperature, meter demand)
  are walked; the LoRaWAN link metric has no tick-to-tick persistence, so comms stays
  instantaneous-only (documented in code + the aside copy).
- Table: Dispositivo / Categoría / Severidad (dot: crítica/advertencia/resuelta on existing
  inks) / Detalle ("zona: X °C, ±Y °C vs consigna") / Fecha-hora (sim clock, "1 Ene 2026 12:00"
  format, sortable desc default) / Estado (pill Activa/Resuelta) / kebab with REAL actions only
  ("Ver unidad" link for TC300/RTU rows, "Copiar detalle" → clipboard). Footer: "Mostrando 1 a
  N de M alertas", "Filas por página" (10/25), numbered pager with window (1 2 … last) + ‹ ›.
- Right aside "Derivación" (~1/3 width, stacks on narrow tiers): info tile, honest derivation
  copy, decorative handcrafted antenna/gateway illustration (accent-soft fills, aria-hidden).

### Shell
- Sidebar brand block above "Menú fijado": handcrafted multi-hue circular mark + "Cinemex" +
  "Water Core" subtitle. Collapsed lane keeps the mark only; the phone drawer shows the pair.
- `main.js`: all round-4 controls ride the SAME delegated view-state pattern
  (`refreshPageView` through the pure builder). New: `data-go-section`, `data-hvac-sort/mode/
  filters/search/page`, `data-export-csv`, `data-energy-sort/page/page-size`,
  `data-alert-sev/sort/menu/page-size`, `data-copy-detail`, delegated `input` (search keeps
  focus+caret across re-renders) and `change` (selects) listeners. The retired
  `data-zone-detail` branch is gone.

## Contracts changed (old → new)

| Contract | Old | New |
| --- | --- | --- |
| `hvac` section body | zone-card grid + `data-zone-detail` aside (`view.zone`) | 4-card strip + sortable table (`view.hvacSort/hvacDir/hvacQuery/hvacMode/hvacFilters`) |
| "Ver en la sala" copy | banned (promised camera jumps) | required again as REAL section navigation (no camera view named) |
| `ALERTS_PAGE_SIZE` | 8 | 10 (+ functional 10/25 select, `view.alertPageSize`) |
| Alertas table universe | active alerts only, "1-8 de 10" footer | active + resolved sim-day episodes, "Mostrando 1 a N de M alertas", numbered pager |
| `createAlertsModel` | `{tick, alerts, countsByCategory, total}` | + `timestamp`, `resolved`, `resolvedToday` |
| `createEnergyModel` | `{…, vsPreviousDayPct}` | + `dayBeforeKwh`, `vsSameDayPct`, `previousMonthKwh`, `vsPreviousMonthPct` |
| `energia` section body | 3 kpi-heroes + flat table + note card | 4 cards (incl. donut) + sparkline table + pager/select (`view.energyDir/energyPage/energyPageSize`) |
| Sidebar | pin button first | brand block above the pin (logo-scoped palette exception) |

## Honesty deviations / resolutions

- "Mismo día anterior" and "mes anterior" comparisons: the sim owns only ONE modeled day/month,
  so the earlier periods are seeded plausibilities anchored to the modeled ones (documented in
  `ENERGY_POLICY`); the rendered percentages always audit against their own kWh pairs.
- Día anterior / Mes sparklines carry no hover data: the delegated tooltip's "hace N h" math
  assumes the last-24h half-hour grid, and those series ride other axes — showing the strip
  without a lying tooltip was the honest cut.
- Comunicación resolved episodes are NOT derived: the link-metric sim re-rolls per tick with no
  persistence, so an "episode" count over it would be a sampling artifact. Temperatura + HVAC
  demand episodes only. Sistema stays an honest zero everywhere.
- The mockup's "Atención" mode filter chip is omitted: the sim's truthful modes are exactly
  En espera / Enfriando.
- The resolved-day walk includes pre-epoch ticks (the sim day starts before tick 0 at noon) —
  the same presentation-history convention the shipped 24 h series already use.

## Verification

- Strict TDD: `tests/client-round4.test.mjs` (18 tests) written first and RED, then
  `tests/dock-sections.test.mjs` contracts updated; sim/section/main implementations followed.
- Full suite: **314 tests, 314 pass, 0 fail** (was 296 before the round).
- `node --check` clean on every touched JS/MJS file; publish bundle regenerated
  (`node build-publish.mjs` → `publish/p/cinemex`).
- Headless-Chrome eye check (`--use-angle=swiftshader`), driving real `.nav-item` clicks and one
  interaction per section (typed search, temp sort + Filtros popover, page-size + next-page,
  severity-card filter + kebab menu). **Zero console errors**, banned view-label sweep clean.

## Captures

- `runs/assets/client-round4-mockups-hvac.png` (+ `-search`, `-sorted`)
- `runs/assets/client-round4-mockups-energia.png` (+ `-paged`)
- `runs/assets/client-round4-mockups-alertas.png` (+ `-filtered`)
