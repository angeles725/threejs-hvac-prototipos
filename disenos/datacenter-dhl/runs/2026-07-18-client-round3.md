# 2026-07-18 · Client round 3 — deck retirement + section re-layouts (DHL half)

Mirror of the round that landed in `disenos/cinemex-hvac-lorawan/` the same day, RE-AUTHORED
for DHL's data and architecture (75 KB monolith `index.html` + `src/dock/sections.mjs` +
`src/sim/*`). Reference: the client's "Kamay Botany Bay Visitor Centre" BMS screenshots —
CONTENT/STRUCTURE guide only; the B43 light palette is untouched. Strict TDD: every contract
below went RED first, then GREEN. No commit (task-close proposal pending), no new libraries.

## Task A — Vista deck retired

- The deck row under the hero is gone from markup, wiring and CSS (including both
  `@container` fold tiers and the phone-tier restatement; `container-type` dropped from
  `.heropane` since the deck was its only query consumer).
- `#camera-select` SURVIVES: same id, same 4 options (general / pasillo / planta / equipos),
  now a compact `.viewer-camera > .camera-select` control floating top-left on the canvas.
  Tablero-only by construction — it sits inside the hero pane, which the existing
  `data-view="page"` rule hides; never removed from the DOM.
- `#chips-toggle` / `#rotate-toggle` / `#shadows-toggle` / `#fullscreen-toggle` are GONE with
  their handlers. Their behaviors became defaults: chips ON, rotation OFF, shadows ON.
  `setChipsVisible` survives (no aria writes) — the HVAC "Ver en la sala" jump and
  `window.__DHL_UI__` still drive it.
- Contract kept: no section registry entry uses `camera: 'planta'` — Planta is reachable only
  through the selector (pinned by both the sections test and the new scene test).

## Task B — section re-layouts (truthful to the DHL sim)

- **HVAC**: three flat tables → one unit CARD GRID (3 CRAC + 2 in-row + 3 racks; big key
  temp: impulsión for CRAC/in-row, entrada for racks; labeled val-boxes; derived status
  chip) + a read-only detail aside. `view.unit` re-renders through the same builder
  (`data-hvac-unit`); unknown ids and the no-JS static state fall back to the first unit.
- **Cuarto**: KPI row + flat table → Plant-Room EQUIPMENT CARDS (UPS / PDU / dry cooler:
  icon block, name+tag, four real sim points each, status chip) + the chilled-water loop
  summary card (the reference's PID card, honest version: ambient + approach + in/out,
  read-only, zero fake controls). "Ver en la sala" jump kept.
- **Energía**: the three truthful aggregates (PDU salida, UPS salida, Carga TI rollup)
  restyle as `kpi-hero` cards; both rollup tables kept at reference density. No per-phase
  metering invented — the sim does not have it.
- **Alertas**: category chip row (`Térmica` / `Ventilación` / `Energía` + Todas, with
  counts) + Categoría/Equipo/Estado/Severidad/Detalle table + honest pagination footer
  (`ALERTS_PAGE_SIZE = 8`; today's single derived alert reads "1-1 de 1", both pager ends
  disabled). Static no-JS fallback = first page, all categories. The category is DERIVED in
  `src/sim/site.mjs` from the gauge family the alert fires on (new `ALERT_CATEGORIES`
  export + `category` field), never asserted by hand.
- **Clima**: current conditions became a `clima-hero` (big temp + condition +
  humidity/wind boxes); the forecast strip extends to 7 seeded day chips
  (`FORECAST_DAYS` grew two deterministic day offsets — same single ambient source:
  `current.temperatureC` IS `SIM_POLICY.ambientC`).
- **Tendencias**: the 11 per-equipment cards regroup under `trend-group` category headers —
  Térmicas (crac + inrow + rack + dry, 9 cards) then Energía (pdu + ups, 2 cards). Same 22
  sparklines, same delegated hover contract (data-points/data-unit).
- **Tablero / Ventiladores / Iluminación / Horarios**: untouched beyond the deck removal.
- Shell: `renderSectionHtml` gained the optional `view` param; the workbench keeps
  `sectionView` per page, resets it on section entry, and the ONE delegated click handler
  grew `data-hvac-unit`, `data-alert-cat`, `data-alert-page` routes.

## Evidence

- Tests: `node --test tests/*.test.mjs` → **45/45 green** (baseline 38; RED-first commits of
  the new contracts failed 3 test files before implementation). Breakdown: scene 9,
  sections 15, sim 12, site 9.
- `node --check` clean on: `src/dock/sections.mjs`, `src/sim/site.mjs`, the extracted
  `index.html` inline module, and the three touched test files.
- Publish build regenerated per the existing workflow: `node build-publish.mjs` →
  `../cinemex-hvac-lorawan/publish/p/dhl/` (main.js 63.3 kB inline → 193.0 kB
  bundled+obfuscated; six detail-view kits re-emitted).

## Files touched (line delta vs. pre-round)

| File | Before | After | Δ |
| --- | ---: | ---: | ---: |
| `index.html` | 1319 | 1325 | +6 (−45 deck, +51 camera control + view state) |
| `styles.css` | 560 | 571 | +11 (−64 deck CSS, +75 new vocabulary) |
| `src/dock/sections.mjs` | 459 | 661 | +202 |
| `src/sim/site.mjs` | 213 | 232 | +19 |
| `tests/sections.test.mjs` | 158 | 280 | +122 |
| `tests/site.test.mjs` | 134 | 153 | +19 |
| `tests/scene.test.mjs` | 362 | 382 | +20 |

## Not truthfully possible with the DHL sim (and therefore not built)

- No sala/room setpoint or PID loop exists in the sim → the Cuarto summary card documents
  the dry-cooler loop (a real derivation) instead of a controller face.
- No per-phase voltage/current/frequency on PDU/UPS → the Energía tables stay at kW/%/FP.
- Only ONE derived alert exists by sim construction (exactly one warn unit) → the pager and
  the category counts render honestly around it rather than faking volume.

## Fidelity pass (same day) — visual richness over the round-3 structure

Client feedback on the round-3 structure vs. their BMS reference screenshots: sections read
FLAT. Scope confirmed with the user: enrich cards/panels ONLY — no floor-plan map, no dark
theme, B43 `:root` tokens byte-untouched, flat language (no glows/gradients). RE-AUTHORED
for DHL (own glyph set and groupings), sharing the visual vocabulary with the cinemex half.

**Suite: 45 → 46 pass / 0 fail** (new asserts RED-first; one new Tendencias-subtitle test).
`node --check` clean on `src/dock/sections.mjs`. Publish build regenerated:
`node build-publish.mjs` → `../cinemex-hvac-lorawan/publish/p/dhl/` (main.js 63.3 kB inline
→ 197.6 kB bundled+obfuscated; six detail-view kits re-emitted).

What landed (handcrafted inline SVG, one 24px grid / 2px stroke / `currentColor` — no icon
fonts, no libraries; every figure still comes from the same deterministic sim):

- **hvac** — unit cards lead with the BIG key temperature (2.3rem/650: impulsión for
  CRAC/in-row, entrada for racks). No setpoint/occupancy groups: those points do not exist
  in the DHL sim. The detail aside regrouped into Operación / Térmica / Ventilación / Carga
  with readouts in bordered value boxes (`detail-group-head`/`detail-val`).
- **cuarto** — plant cards: 2.9rem accent-soft icon tile with per-TYPE 24-grid glyphs (UPS
  battery, PDU outlet, dry-cooler coil+fan), one-line "id **Nombre**" tagline over the kind
  line, compound value-box labels where compound ("Agua · Salida" / "Agua · Entrada"),
  status chip pinned top-right. Grid min raised to 16.5rem + ellipsis guards after the first
  capture showed the dry-cooler card touching its edge; re-captured clean.
- **energia** — the three KPI heroes grow to 2.7rem/650 with the inline muted unit.
- **alertas** — filter chips became true pills; the row carries its category glyph
  (thermo/fan/bolt per the derived ALERT_CATEGORIES), bold equipment name, severity as a
  colored dot + text on the EXISTING warn/alarm inks; pager right-aligned, both ends
  visibly disabled around the single honest alert ("1-1 de 1").
- **clima** — hero gains the current-condition glyph (40px); day chips carry their own
  glyph (sun/cloud-sun/cloud/rain — 'Lluvia vespertina' maps to rain) and the hi-in-ink /
  lo-muted pair.
- **tendencias** — every tile is an instrument tile: hairline border, bold title, muted
  "Últimas 24 h · 1 punto / hora" subtitle over the labeled sparkline pairs.

### Eye-check evidence (headless Chrome + SwiftShader, zero console/page/network errors)

`runs/assets/client-round3-fidelity-{hvac,cuarto,energia,alertas,clima,tendencias}.png` —
reviewed against the reference anatomy: icon tiles, big key temperatures, value boxes,
pill filters, dot severities, glyph day chips and the disabled pager ends are all visible.

### Not done truthfully

- HVAC cards carry no setpoint/occupancy groups (no such points in the DHL sim).
- Clima hero keeps 2 labeled sub-readouts (Humedad, Viento): the sim exposes no other
  current-conditions point, and none was invented.

## Single fixed view (client correction, 2026-07-18)

Client request (mirror of the cinemex direction): the 3D room gets exactly ONE fixed view —
the `general` whole-room framing — and every other camera view leaves the product surface.
No UI label may name any view: a single view needs no label.

### What changed

- **Camera select removed entirely** — the `.viewer-camera` / `#camera-select` control (4
  options: general/pasillo/planta/equipos) left `index.html`, and its CSS block left
  `styles.css`. Nothing replaces it.
- **Boot pins the one framing** — the scene already booted on the whole-room camera
  (`camera.position.set(16, 12, 21)` / `controls.target.set(3.2, 1.1, 6)`); that framing is
  now the ONLY one. `CAMERA_PRESETS`, `applyCameraPreset` and the select wiring were removed
  outright (low-risk: the preset math had no other consumer). OrbitControls still lets the
  operator orbit by hand — orbiting is not view selection.
- **Section switches never touch the camera** — `activateSection` lost its `driveScene`
  camera branch and parameter; `SECTIONS[*]` lost the `camera` field entirely.
- **forceChips removed as dead code** — chips stay governed by their global default (ON
  everywhere). The only consumer of `forceChips`/`data-room-chips` was the HVAC jump; with
  the camera fixed it forced nothing, so the field and the plumbing went. `setChipsVisible`
  survives only as the `__DHL_UI__` verification-hook convenience (not user-facing).
- **"Ver en la sala" reduced to plain navigation** — the HVAC/Cuarto jump cards no longer
  promise or perform a camera change: `data-room-view="<preset>"`/`data-room-chips` became a
  bare `data-room-jump` that just activates Tablero. Copy rewritten to name no view.

### Contracts consciously changed (RED-first)

- `tests/sections.test.mjs` — "presets per the work order + never planta" became ONE new
  contract: **no section names a camera at all** (`!('camera' in SECTIONS[id])` and
  `!('forceChips' in SECTIONS[id])` for every id).
- `tests/sections.test.mjs` — the "honest jump (preset + chips)" test became: HVAC/Cuarto
  carry a plain `data-room-jump`, zero `data-room-view`/`data-room-chips`, and their page
  HTML contains no "cámara"/"órbita"/"vista".
- `tests/scene.test.mjs` — "the camera select floats inside the viewer" became: **no camera
  selector, no view labels** (`viewer-camera`, `camera-select`, `applyCameraPreset`,
  `CAMERA_PRESETS`, the four option labels and `aria-label="Cámara"` all banned), boot
  framing pinned to the whole-room position/target, defaults still chips ON / rotation OFF /
  shadows ON.

Suite: 46/46 green (RED confirmed on exactly the 3 rewritten contracts before implementing).

### Label sweep (removed vs kept)

Removed (named a camera view or view switching):
- `index.html`: "Vista general", "Pasillo frío", "Planta (superior)", "Equipos (órbita
  baja)" (select options), `aria-label="Cámara"`.
- `src/dock/sections.mjs`: HVAC jump copy "…la cámara en el pasillo frío contenido…" and
  Cuarto jump copy "…la cámara en la órbita baja de equipos…" (both rewritten naming no
  view; physical facts kept — UPS/PDU at the front, dry cooler in the yard).

Kept (physical things, not views):
- "Pasillo frío" as the contained cold aisle only survives in code comments
  (`COLD_AISLE_Z`), not in UI copy.
- "Planta eléctrica y de rechazo" (Cuarto card title): plant room, not the top view.
- "Cuarto de máquinas", "Equipos de la sala" (menu/section labels): rooms and equipment.
- Detail views (`../<kind>/<kind>-detail-v1.html`): "Vista Detalle" titles name the
  equipment detail page, not a scene camera view — kept (also outside this writer's scope).

### Eye-check evidence (headless Chrome + SwiftShader)

`runs/assets/client-round3-singleview-{tablero,hvac,cuarto}.png` — reviewed: Tablero renders
the whole-room framing with chips ON and NO selector or view label anywhere; HVAC and Cuarto
show the plain "Ver en la sala" card naming no view; the jump lands back on Tablero without
a camera move. DOM audit in-page: no `#camera-select`, no `.viewer-camera`, no
`[data-room-view]`, zero view-name strings in body text. Zero console/page/request errors.

Publish rebuilt (`node build-publish.mjs` → `../cinemex-hvac-lorawan/publish/p/dhl/`);
grep of the emitted `index.html`/`main.js`/`styles.css` finds zero view-name occurrences.
