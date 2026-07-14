# INTERACTION-UI — apply, asset 01-shell-circulation-facade, attempt 1

**Pass:** interaction-ui (scene-level ladder, after lighting-camera PASS 0.80)
**Tests:** 184 → **206** (`node --test tests/*.test.mjs` → 206 pass / 0 fail)
**Gated passes touched:** none regressed. No topology, device position, route path, material palette
entry, surface placement or lighting rig value was changed. Every addition is *additive geometry in
new pools* plus *state derived from the existing simulation/topology*.

---

## 1. The load-bearing risk, confirmed and closed

The spec's `deterministic_query_states` declared five `state` values, a `selection` key, a `tick` key
and a five-value `links` vocabulary that **did not exist** in `query-state.js`. `parseQueryState` is
atomic: an unknown value on a known key resets the WHOLE state and warns. A capture set driven from
spec-literal URLs would have produced 27 pictures of the default architectural isometric.

Proof this is now closed (RED first, `runs/interaction-attempt1-red.log`):

- **RED test** `every DesignSpec scene state is a driveable query value, not an atomic reset` — asserts
  each of the seven `state` tokens survives the parser, emits **zero** warnings and does **not**
  deep-equal `DEFAULT_QUERY_STATE`.
- **RED test** `selection and tick are parsed, not silently ignored as unknown keys` — `tick` used to be
  an unknown KEY (silently dropped, so `tick=0` and `tick=30` were the same picture). It is now parsed,
  and a bad value (`tick=-1`, `selection=TC300-99`) still fails atomically, so a typo can never
  masquerade as a valid capture.
- **RED test** `the links vocabulary implements every declared value, not only 'all'`.
- Manifest preflight (below): 27/27 shots parse to 27 **distinct** non-default states.

## 2. What changed

### `src/scene/interaction.js` (new, pure — no Three.js)
The whole interaction model. It owns **no** topology of its own: it calls `createSimulationState` /
`injectFault` (`simulation.mjs`), `createTopology` / `traceFrom` / `evaluateReachability`
(`topology.mjs`) and `deriveAlarms` (`alarms.mjs`).

- `INTERACTION_SCENE_STATES` maps each spec state token onto a canonical `FAULT_IDS` entry:
  `fault-tc300 → tc300-communication-loss`, `fault-uc100-b → uc100-failure`,
  `fault-internet → internet-loss`, `hot-sala-3 → auditorium-high-temperature`,
  `hot-kitchen → kitchen-high-temperature`. All five imply the engineering visual mode.
- **Two status planes, deliberately separated** (this is the bug the tests caught):
  - `deliveryStatus` — *can this node move data to Niagara?* (`normal | unreachable | offline`)
  - `deviceStatus` — *what colour is it?* (`normal | unreachable | alarm`)
  A hot room is **red and still reporting**: its drop, trunk, LoRaWAN link and the IP chain all stay
  green/blue, which is exactly `niagara_delivery: active_alarm`. Routes are coloured by delivery,
  devices by status. A first implementation coloured routes from the device status and broke the
  network in the hot states — RED test `the hot states raise an active alarm without breaking a single
  link` caught it.
- **Propagation rule (derived, never hard-coded):** the offline node is the alarm; a *field* device
  goes gray only when its own trace to Niagara crosses an offline **non-backbone** node (this is how
  UC100-B grays exactly TC300-06…09 and nothing else); a *backbone* node
  (`UG67-01 → router-firewall → internet → niagara-supervisor` + clients — the intersection of every
  thermostat's trace) goes gray when the backbone itself is cut. So `fault-internet` reds the internet
  node, grays the gateway/router/supervisor/clients and the whole Ethernet run, and leaves all 14
  thermostats and 4 concentrators measuring — `path: red_then_gray`, `niagara_delivery: stopped_all`.
  RED test `fault-internet stops delivery on the shared backbone and spares the field devices` was
  written first and failed against the naive "anything whose path crosses a break grays out" rule,
  which turned the entire building gray.
- A merely-starved node is still **powered**: `alive()` vs `live()`. The RF from a healthy UC100 keeps
  landing on the gateway during an internet loss, so the LoRaWAN links stay blue while the Ethernet
  goes gray.
- Deterministic animation math: `resolvePacketT(tick, phase)`, `resolveHaloPulse(tick)`,
  `resolveWaveRing(tick, index)`, `samplePolyline(points, t)` (arc-length walk, so a packet keeps a
  constant speed across uneven segments).

### `src/controllers/query-state.js`
`state` (7 values), `selection` (`none` + every real device id), `tick` (non-negative integer) and the
full `links` vocabulary (`none|rs485|lorawan|internet|all`). New canonical keys: `sceneState`,
`selection`, `tick`, `tickExplicit`. `state` and `mode` are reconciled so they can never disagree in a
captured URL (a fault always wins over a stale `mode` token). Serialization keeps
`poster_frame&display_frame` at the tail (the surface pass pinned that) and is a fixed point:
`serialize(parse(serialize(s))) === serialize(s)`.

### `src/controllers/picking.js` (new, pure)
`resolvePickedSelection(intersection)` maps a raycast hit back to the device that owns the instanced
geometry it struck, by reading `userData.entities[instanceId].statusOwner` — the same table the builder
emits. Only the `hvac` layer answers, so a click on a wall (or on a halo pool) cannot rewrite the URL.

### `src/scene/architecture.js` (adapter, ~330 lines added)
- **Status overlay mechanism.** Every device/media instance is indexed with a `statusOwner`. When a
  fault or a selection applies, the affected base instances are **removed from their own mesh**
  (zero-scale matrix) and re-emitted into a status overlay `InstancedMesh` at the same transform. No
  double geometry, no z-fighting, and a restore is exact (`restored deepEqual healthy`, RED test).
  Colours come from the **gated palette**: `MATERIAL_SPECS.alarmRed` and `MATERIAL_SPECS.offlineGray`
  (keyed as `interaction:alarm` / `interaction:offline` so the shell's engineering translucency, which
  `offlineGray` shares with the FOH proxies, cannot ghost the fault evidence).
- **Selection highlight**: the selected path's media is overlaid with an **emissive-boosted variant of
  its own medium** (`rs485-green`, `lorawan-blue`, `ethernet-blue` × 3 gain) — the RS-485 green never
  becomes a fourth media colour the legend cannot explain — plus cyan selection halos on each device of
  the path (the schematic's existing `#22d3ee` model-link cue).
- **Fixed pools** (no per-frame allocation, no runtime material creation):
  32 packets (14 drops + 8 trunk + 4 LoRaWAN + 6 Ethernet), 3 LoRaWAN wave rings, 25 alarm halos,
  16 selection halos, 14 zone halos, 11 status overlays. All are `InstancedMesh`, `count = 0` and
  `visible = false` when unused, so the healthy architecture state adds **zero** draw calls.
- **Alarm halos + zone halos** derive their positions from `plan.structural.devices` and `APP_CONFIG.zones`
  (sala-3, kitchen, sala-1…4 for the UC100-B group) — no new coordinate is authored.
- **Packets stop on blocked routes.** That is the delivery evidence: in `fault-uc100-b`, the 7 packets
  that rode bus B disappear while the other 25 keep flowing.
- `setNetworkMediaWidthScale` was refactored onto a shared `resolveInstanceTransform` /
  `writeInstanceMatrix` pair so the camera-dependent media width and the status overlays cannot drift.
  The per-instance status pass is fingerprinted (`state|selection|camera|dense`), so the tick animation
  only touches the pools.

### `main.js`, `index.html`, `styles.css`
Fault buttons (`data-scene-state`) + Restore, animation-speed slider (0.25–2.0×, `ui_controls`),
click-to-select raycast (drag-guarded so an orbit is never a deselect), selected-path and alarm DOM
overlays, and the deterministic clock: **a URL that pins `tick` freezes the scene on that exact frame**
(`tickExplicit`), so a capture is never a race with a clock; a hand-driven session runs its own clock
and the URL it writes back carries no tick.

## 3. The RED test that proves each change

| Change | RED test (all failed before the code existed) |
|---|---|
| Spec state vocabulary is driveable | `every DesignSpec scene state is a driveable query value, not an atomic reset` |
| Faults are engineering captures | `fault and hot states force the engineering visual mode they are captured in` |
| `selection` / `tick` are real keys | `selection and tick are parsed, not silently ignored as unknown keys` |
| `links` vocabulary | `the links vocabulary implements every declared value, not only 'all'` |
| Capture URL is a fixed point | `the interaction state round-trips through the serialized capture URL` |
| State → canonical fault | `every scene state maps onto the canonical simulation fault, or onto none` |
| Healthy baseline | `a healthy engineering state leaves every endpoint and every route normal` |
| TC300 comm loss scope | `fault-tc300 breaks exactly one thermostat and only its own drop route` |
| UC100 bus propagation | `fault-uc100-b propagates along the RS-485 bus it owns, and no further` |
| Backbone vs field | `fault-internet stops delivery on the shared backbone and spares the field devices` |
| Hot = alarm, network healthy | `the hot states raise an active alarm without breaking a single link` |
| Deterministic restore | `restoring the state is deterministic: the healthy model returns byte for byte` |
| Exact end-to-end path | `selecting a thermostat highlights exactly its canonical end-to-end path` |
| UC100 / UG67 selection | `selection resolves for the concentrator and the gateway too` |
| Raycast target resolution | `a raycast hit resolves to the device that owns the geometry it struck` |
| Two deterministic ticks | `tick 0 and tick 30 are two different, reproducible packet frames` |
| Arc-length packet motion | `a polyline sample walks the route by arc length` |
| Fixed pool, empty when healthy | `the interaction pools are fixed, and empty in the gated healthy states` |
| Gated alarm/offline palette | `a fault recolours the affected instances through the gated alarm/offline palette` |
| Scene-level restore | `restoring from a fault returns the scene to the exact gated healthy state` |
| **No zone disappears** (critical `multiplex-plan-grammar`) | `no zone, band or room mesh disappears in any interaction state` |
| Selection keeps media identity | `selection highlights the path without hiding the medium it rides on` |

Test-vs-render jurisdiction respected: every assertion is a deterministic invariant of the state
machine, the topology or the builder's emitted data. **No test simulates the renderer or predicts a
pixel.**

## 4. Existing tests touched (3 assertions, none removed)

These assert the *shape of the query contract this pass extends*; leaving them untouched was
impossible while implementing the spec's declared keys. Both files still assert the full contract.

1. `tests/shell.test.mjs` — canonical serialization string now includes `state=`, `selection=`, `tick=`.
2. `tests/shell.test.mjs` — the full parsed-state deep-equal now includes `sceneState`, `selection`,
   `tick`, `tickExplicit`.
3. `tests/architecture.test.mjs` — the header pass label now reads `Pase INTERACTION-UI`
   (`index.html` + `qa/browser-smoke.mjs`'s `architectureAsset.pass === 'interaction-ui'` moved with it).

## 5. Deliberate deviations from a literal reading of the spec

- **`fault-internet` does not red the router.** `visual_states.fault_states.internet-loss` lists
  `affected: [router_firewall, internet_cloud, niagara_virtual_server]` with `path: red_then_gray`. The
  offline node in the canonical simulation is `internet`, so `internet` is the red one and the router,
  the gateway, the supervisor and the clients are gray (they cannot deliver). Colouring the router red
  would require a second source of truth for "what failed".
- **`UG67-01` also grays in `fault-internet`** (it is on the cut backbone) although the spec's
  `affected` list does not name it. Its LoRaWAN links stay blue — the gateway still receives RF, it just
  cannot reach the supervisor. This is the honest reading of the topology.
- **Zone halos are red translucent volumes over the affected zone bounds** (from `APP_CONFIG.zones`),
  not a new per-room zone volume: the scene only had three plan-band zone volumes, and adding permanent
  per-room volumes would have touched gated geometry.

## 6. Not applied

- **`ui_controls: "CAMERA: ISOMETRIC / FIRST PERSON"`, `RESET CAMERA`, `FULLSCREEN`, layer/label
  toggles** already existed from earlier passes and were not re-implemented.
- **`seed`** (`deterministic_query_states.seed`, "integer; fixed default") is still not a query key. The
  simulation seed is fixed in `APP_CONFIG.animation.seed` (30067) and every capture is reproducible
  without it; exposing it would add a fourth axis to the URL with no evidence requirement in
  `evidence_contract.interaction-ui`. **Deferred, and reported.**
- **Draw-call budget was not re-measured in a browser** (no WebGL in this environment). By construction
  the healthy architecture state adds 0 draws (all pools `visible=false`), the healthy engineering state
  with `links=all` adds 4 (3 packet pools + 1 wave-ring pool), and the worst fault state adds ≤ 15. The
  probe must confirm this at the gate — and note deferred defect **X3** from the lighting close: the
  probe under-reads at the default camera.

## HUD alarm-consistency fix

### Root cause

`startApplication()` ended with a **second, unconditional writer** to the same DOM node the HUD
derives: after `renderInteractionPanels()` had correctly written the alarm-aware status line, the last
statement of the boot path was `status.textContent = 'Sistema listo · Sin alarmas';` — a hard-coded
healthy literal used as a "the app booted" signal. It clobbered the derived copy on **every** load, in
**every** state. `#alarm-list` was written only by `renderInteractionPanels()` and therefore survived,
so a fault URL booted with an alarm list showing an active event next to a HUD denying it. The two
surfaces are **not** meant to differ — `#app-status` literally asserts "Sin alarmas", so it is an alarm
surface, not a connectivity surface. It is now derived from the same `model.alarms` the list renders.

This affected all five fault/hot states, not only the two reported. At tick 0: `fault-tc300` (1 alarm),
`fault-uc100-b` (4), `fault-internet` (14), `hot-sala-3` (1), `hot-kitchen` (1) — all of them booted
claiming "Sin alarmas". Clicking a fault button afterwards *did* repair the line (that path goes through
`applyInteraction()` → `renderInteractionPanels()`), which is why the defect only ever showed on load —
i.e. exactly on the capture URLs a blind reviewer drives.

### What changed

- **`src/hud.mjs` (new)** — `deriveHudModel(model)`: one pure derivation returning
  `{ severity, alarmCount, stoppedCount, claimsNoAlarms, statusText, alarmItems }`. All HUD copy (es-MX)
  lives here and is a function of `model.alarms` / `model.niagaraDelivery.stopped`. Nothing else.
- **`main.js`** — `renderInteractionPanels()` renders the status line, the severity dot and the alarm
  list from `deriveHudModel()`. The trailing `status.textContent = …` clobber is gone; readiness is
  signalled solely by `data-app-ready`, and the boot path now closes with `renderInteractionPanels()`.
- **`styles.css`** — `.status-dot` now follows the derived state via `html[data-system-status="alarm"]`
  (amber), ordered between the `data-app-ready` (green) and `data-app-error` (red) rules so error still
  wins. `.alarm-list li[data-severity="normal"]` drops the red alarm chrome from the empty
  "Sin alarmas activas." row, which previously wore full alarm styling.
- **Copy precision**: the alarm status used to append `Niagara sin datos de 0 termostato(s)` for the hot
  states, which are alarms that *do not* stop delivery. It now reads `· Niagara sigue recibiendo datos`
  when `stoppedCount === 0`, and keeps `· Niagara sin datos de N termostato(s)` when the topology
  actually stopped devices. Delivery and alarm stay distinct facts, both derived.

Not touched: topology, devices, routes, materials, the surface plan, the lighting rig.

### RED test

`tests/interaction-ui.test.mjs` — the invariant is **derived across the whole query vocabulary**, not
asserted as a literal for one state:

- `the HUD status line never contradicts the alarm list, in any state of the vocabulary` — for every
  `INTERACTION_SCENE_STATES` key × `tick ∈ {0, 30}`: `hud.claimsNoAlarms === (model.alarms.length === 0)`,
  the status copy matches `/[Ss]in alarmas/` **iff** there are no alarms, `hud.severity` follows the
  alarms, `hud.alarmCount` equals the derived alarm count, and the list holds exactly one item per alarm
  naming its device (or exactly one `severity: 'normal'` placeholder).
- `the status line reports the delivery it can prove, and never a phantom Niagara outage` — `hot-kitchen`
  alarms with `stoppedCount === 0` and must not claim "sin datos"; `fault-internet` must report all 14.
- `the boot path owns no second status writer: the HUD has one source of truth` — a source guard on
  `main.js`: no hard-coded `Sistema (listo|en alarma)` / "sin alarmas" literal may reappear, and the HUD
  must render through `deriveHudModel`. This is the test that fails against the original bug.

RED log: `runs/hud-consistency-red.log` (module absent → suite fails).
GREEN log: `runs/hud-consistency-green.log`.

### Test counts

| Run | Result |
| --- | --- |
| Baseline before the fix | **206 pass / 0 fail** |
| RED (`tests/interaction-ui.test.mjs`) | 0 pass / 1 fail (`ERR_MODULE_NOT_FOUND: src/hud.mjs`) |
| GREEN (`node --test tests/*.test.mjs`) | **209 pass / 0 fail** (206 existing + 3 new) |

`node --check main.js` and `node --check src/hud.mjs` both clean. `qa/browser-smoke.mjs:410`
(`initial.status === 'Sistema listo · Sin alarmas'`) still holds: the default load is `architecture`,
which derives 0 alarms and therefore the same copy — now as a consequence rather than a coincidence.

### Reported, not fixed

The alarm **messages** themselves (`deriveAlarms()` in `src/alarms.mjs`) are English strings rendered
into a Spanish UI — e.g. `TC300-05 · High temperature in Cocina y preparación (31.2 °C)`. That is
pre-existing content of `#alarm-list`, unchanged by this fix and outside a HUD-derivation bug. Flagging
it for the interaction-ui gate.

---

## X5 — alarm message localisation

`DEFERRED-CORRECTIONS.md` X5: `src/alarms.mjs` emitted its user-facing `message` in English inside an
es-MX shell. The messages are rendered verbatim into `#alarm-list` (`deriveHudModel` →
`` `${alarm.deviceId} · ${alarm.message}` ``), so they are in frame in 10 of the 27 interaction-ui
evidence states. This is UI COPY only: `kind`, `severity`, alarm `id`, device ids and node ids stay
English.

### Message table (all four kinds the module can emit)

| Kind | Before | After |
| --- | --- | --- |
| `communication` | `${id} is offline; data is not reaching Niagara.` | `${id} sin comunicación; sus datos no llegan a Niagara.` |
| `reachability` | `${id} data path is interrupted at ${causeId}.` | `Ruta de datos de ${id} interrumpida en ${causeId}.` |
| `temperature-high` | `High temperature in ${zone} (${t} °C).` | `Temperatura alta en ${zone} (${t} °C).` |
| `temperature-low` | `Low temperature in ${zone} (${t} °C).` | `Temperatura baja en ${zone} (${t} °C).` |

Rendered, as the blind reviewer now reads them:

- `TC300-05 · Temperatura alta en Cocina y preparación (31.2 °C).`
- `TC300-08 · TC300-08 sin comunicación; sus datos no llegan a Niagara.`
- `TC300-06 · Ruta de datos de TC300-06 interrumpida en UC100-B.`

Register matches the house voice already in `index.html` / `src/hud.mjs`: "Sin alarmas activas.",
"Sistema listo · Sin alarmas", "Sin comunicación" (legend). Neutral, no regionalisms, no imperative.

### What changed

- `src/alarms.mjs` — the four `message` templates, plus a module docblock stating the rule (message =
  es-MX copy; every identifier stays English). No change to alarm shape, ids, kinds, severities,
  thresholds, ordering, or `reachesNiagara` derivation.
- `tests/alarms.test.mjs` — two English literals updated (they pinned the old copy), plus the derived
  guard below.

Nothing else was touched: topology, devices, routes, materials, the surface plan, the lighting rig and
the HUD derivation are untouched.

### The RED test — a property, not a snapshot

The guard is a vocabulary **property over the whole message surface**, so a future English string
cannot slip back in — it is not a snapshot of today's copy:

- `ENGLISH_MARKERS = /\b(high|low|temperature|offline|no data|is not|not reaching|stopped|failure|interrupted|link|down|data path|reaching)\b/i`
- `every alarm kind the module can emit renders its message in Spanish, not English` — reads the
  `kind:` set **from `src/alarms.mjs` source**, injects every `FAULT_IDS` fault, asserts the emitted
  kinds **cover the declared set** (a new kind cannot dodge the guard by never being exercised), then
  asserts no emitted `message` matches `ENGLISH_MARKERS`.
- `no message template in alarms.mjs is written in English` — static scan of every `` message: `…` ``
  template (with `${…}` code holes stripped: identifiers are English by design), asserting one template
  per declared kind and no English marker in the literal copy.
- The two updated literal assertions each carry a `doesNotMatch(…, ENGLISH_MARKERS)` beside them.

RED log: `runs/x5-alarm-localisation-red.log` (2 fail — both guards; the kind-coverage assertion already
passed, so RED was red for the right reason).
GREEN log: `runs/x5-alarm-localisation-green.log`.

Mutation check: re-introducing `High temperature in` into `src/alarms.mjs` turns 3 tests red (both
derived guards + the literal). The guard bites.

### Test counts

| Run | Result |
| --- | --- |
| Baseline before the fix | **209 pass / 0 fail** |
| RED (`tests/alarms.test.mjs`) | 5 pass / **2 fail** (the two new derived guards) |
| GREEN (`node --test tests/*.test.mjs`) | **211 pass / 0 fail** (209 existing + 2 new) |

`node --check src/alarms.mjs` clean. No captures, no commit, no verdict.
