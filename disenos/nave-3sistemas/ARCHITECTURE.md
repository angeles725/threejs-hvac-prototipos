# ARCHITECTURE — nave-3sistemas

Decisions taken at P0/P1, before any geometry exists. Evidence: repo convention survey
(2026-08-13) + design3d kit TRACK-THREEJS.md.

## 1. File layout — the cinemex pattern, not the single-file pattern

The repo has two shapes for a 3D page:

| shape | example | fits us? |
|---|---|---|
| single standalone HTML, everything inline | `gobernador-dashboard.html`, all catalog assets | NO |
| `index.html` + `main.js` + `src/` modules + `tests/` | `cinemex-hvac-lorawan/` | YES |

**Why the modular one.** The primary deliverable is a dashboard whose every number is DERIVED from
a coupled simulation. That is a testable pure core, and GATES.md makes a red test suite block the
gate. A pure core cannot be unit-tested from inside an inline `<script type="module">`. The
single-file shape is correct for a static equipment asset; it is the wrong shape for a plant model.

```
disenos/nave-3sistemas/
  design-spec.yaml        # the contract (P2), gated at P3
  GOAL.md · ARCHITECTURE.md · P1-RESEARCH.md
  index.html              # 3D visor + dashboard in one viewport
  main.js                 # entry: wires sim -> scene -> dashboard
  styles.css
  src/
    sim/                  # PURE, zero three.js imports, Node-testable
      constants.mjs       #   every constant carries its P1 citation in a comment
      lighting.mjs        #   luminaire electrical + heat model
      compressed-air.mjs  #   lead/lag pressure-band sequencing, load/unload kW
      thermal.mjs         #   sensible load summation -> HVAC kW via COP
      plant.mjs           #   the ONE step(state, dt) -> state reducer
    dashboard/
      model.mjs           #   deriveDashboardModel(state) — single derivation
      render.mjs          #   DOM rendering from that model only
      charts.mjs          #   hand-rolled SVG (no chart library — repo convention)
    scene/
      materials.mjs · runtime.mjs
      bay.mjs · hvac.mjs · luminaires.mjs · compressor-room.mjs
    controllers/
      query-state.mjs     #   URL state contract (capture harness drives states by URL)
      picking.mjs · layers.mjs
  tests/                  # node --test, one file per sim module
  runs/                   # gate evidence: <pass>-attempt<N>.{png,console.json,review.json}
```

## 2. Single derivation (the rule that makes the dashboard honest)

```
inputs (user controls, schedule)
        |
        v
   plant.step(state, dt)  ->  ONE state object
        |
        +--> deriveDashboardModel(state) --> every DOM surface renders from this
        +--> scene bindings              --> every 3D visual renders from this
```

No DOM node computes its own number. No 3D object reads a different value than the tile above it.
This is `hud-single-derivation` from the kit library, applied plant-wide.
(Kit evidence: a hard-coded status literal once clobbered derived HUD copy on every cold load —
five fault states all booted announcing "no alarms", one of them with 14 alarms active.)

## 3. three.js loading — the repo's dynamic importmap, verbatim

Static `<script type="importmap">` is mangled by the Cloudflare minifier on the `@` in
`package@version`, so the repo injects it dynamically. Copy the existing form exactly:

```js
(function(){
  var AT = String.fromCharCode(64);
  var base = 'https://unpkg.com/three' + AT + '0.160.0/';
  var tag = document.createElement('script');
  tag.type = 'importmap';
  tag.textContent = JSON.stringify({ imports: {
    'three': base + 'build/three.module.js',
    'three/addons/': base + 'examples/jsm/'
  }});
  document.head.appendChild(tag);
})();
```

Pinned **three r0.160.0**. Consequences that are LAW on this track, not preferences:
- `scene.environmentIntensity` does not exist in r160 — use `material.envMapIntensity`.
- No `RectAreaLight` (stalls the SwiftShader shader compile; probe returns 0 draws).
- No `MeshPhysicalMaterial.transmission` (same stall). `clearcoat` is safe.

## 4. Visual language — dark industrial, aligned with `gobernador-dashboard`

Tokens lifted from the repo's validated dark dashboard rather than invented:
`--canvas:#070A0F` `--card:#0F151E` `--ink:#EAF0F7` `--dim:#8595A8` `--rule:#1E2733`
`--accent:#2E90F0` `--green:#3DD68C` `--amber:#E8A33D` `--red:#FF5A5F`
Fonts: IBM Plex Sans (labels) + IBM Plex Mono (every numeric readout).

Per-system accent so the three systems are separable at a glance in BOTH surfaces
(chart series colour == 3D highlight colour == KPI tile accent):
HVAC = cyan · LIGHTING = amber · COMPRESSED AIR = blue.

## 5. QA harness

Own port, never the shared default — the 8123/8899 defaults have served ANOTHER worktree under
concurrency and returned green over the wrong tree. Verified 2026-08-13 on port **8137**
(own asset 200, alien path 404). Every probe wrapped in `disenos/catalog/tools/qa-lock.sh` to
serialize Chrome across sessions.

```bash
PORT=8137 disenos/catalog/tools/qa-lock.sh node research/tools/probe.mjs   "disenos/nave-3sistemas/index.html"
PORT=8137 disenos/catalog/tools/qa-lock.sh node research/tools/capture.mjs --dpr 3 "disenos/nave-3sistemas/runs/<run>" "disenos/nave-3sistemas/index.html"
```

The `interaction-ui` pass and P6 capture with `--page` (whole viewport): the dashboard IS the
deliverable and lives in the DOM, so a canvas-only shot would judge the dashboard pass without
seeing the dashboard.

## 6. What must NOT be built

- No luminaire design exists in the repo, so `luminaires.mjs` is new work — it gets its own
  gated pass, not a box with an emissive face.
- The existing AHU and compressor pages expose no reusable builders (internal IIFEs). We re-author
  from their design-specs' DIMENSIONS, and extract real builders into the kit library at P7.
