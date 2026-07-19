# BRIEF — DHL datacenter console (anti-ai-ui product-mode family member)

Date: 2026-07-16 · New design dir: `disenos/datacenter-dhl/` · Client: DHL
Family: **B43 Light SaaS Operations Console** — same certified tokens and workbench chrome as the
cinemex console. **Structure is INHERITED by explicit user mandate** ("la misma barra lateral que
vas a poner en CINEMEX también ponla en el proyecto de datacenter DHL"): the three-lane workbench
(grouped pin/unpin menu | 3D hero | content dock, Vista deck welded under the viewer) passed the
divergence gate and delivery verification in the cinemex round (direction receipt
sha256:bed454bc…49b4; delivery PASS 2026-07-16). Per product-mode: shared tokens/chrome, distinct
page signature. DHL's distinct signature: the datacenter room as hero, per-equipment value chips,
and the DHL floating banner (brand yellow #FFCC00 ground, red mark — supplied by the user).

## Scope (from the user + terrain map)

1. **Fork the V1 room skeleton** (`disenos/escenas/datacenter-sala-realista-v1.html`, 841-line
   monolith) into `disenos/datacenter-dhl/index.html`. Graft-in-place — NO modular refactor.
   The c3ntro sibling is NOT the base (SPA-bound routing).
2. **Labels → chips**: replace `makePill` (v1:761-774) with the cinemex chip factory
   (`temperature-chips.js` pattern, THREE-injected). Chip value per equipment type (derived from
   what each detail view actually gauges): Rack `°C + kW` · CRAC `sup→ret °C + fan%` · In-row
   `sup/ret °C + fan%` · PDU `kW + load%` · UPS `load% + BAT%` · Dry-cooler `water-out °C + fan%`.
   InstancedMesh silhouette racks get NO chips (not registered). `#bPills` becomes the chips toggle.
3. **Single-source deterministic sim** (`src/sim/`, cinemex seed.mjs conventions): one module per
   equipment kind feeding BOTH the room chips and the six detail-view data objects — today the
   hardcoded pills contradict the detail numbers (PDU 142 vs 118 kW), and that ends here.
4. **Detail click-through**: ALREADY WIRED in the skeleton (EQUIP registry → openDetail overlay
   iframe). This round re-skins the overlay chrome to B43 and feeds the detail data objects from
   the sim.
5. **Workbench shell**: port the cinemex index.html/styles.css workbench, re-authored for
   datacenter topology. Same ten sections, datacenter data: Tablero (room hero + digest cards),
   HVAC (thermal read: CRAC/in-row supply-return), Ventiladores (CRAC/dry-cooler/in-row fans),
   Cuarto de máquinas (UPS/PDU/dry-cooler plant detail), Iluminación (room lighting scenes),
   Energía (PDU/UPS meters), Tendencias (24h sparklines), Alertas (derived), Clima (exterior,
   feeds dry-cooler ambient), Horarios (maintenance windows). es-MX copy.
6. **DHL banner**: floating sprite over the room (chips/sims-floating-banner pattern), DHL yellow
   #FFCC00 + red mark. The banner is BRAND CHROME on the 3D scene — B43 governs the UI; the banner
   carries the client's colors by explicit user instruction (reference image supplied).
7. **Responsive four tiers** — LESSON FROM CINEMEX REVISE: deck/lane component breakpoints use
   `@container` on the hero lane, NEVER viewport `@media`; beware `container-type` +
   `position:fixed` (phone tier dissolves the container via `display:contents`).

## Hard constraints

- Keep the skeleton's conventions: three@0.160 importmap (with the fromCharCode(64) guard),
  rAF loop, `__HEADLESS__` guard, baked shadow map (`autoUpdate=false` — REBAKE after adding
  chips/banner: `shadowMap.needsUpdate = true`).
- Keep `EQUIP`/`register`/`userData.route`/`openDetail` wiring intact.
- The room is already light (#dfe4ec): B43 alignment = tokens on scene UI chrome (#info/#legend/
  #hud/#ctl/#panel + detail overlay bar), not a world rebuild.
- English code/comments; es-MX UI copy; no new deps; deterministic sims only.
- Tests: `node --test tests/*.test.mjs` in the new dir, cinemex conventions (sims TDD-first;
  HEADLESS scene-count tests where the skeleton supports them).
- Ship target (later round): `publish/p/dhl/` via a parameterized/forked build-publish + portal
  PROYECTOS card + Access policy. NOT this round's scope; keep the tree build-script-friendly.
