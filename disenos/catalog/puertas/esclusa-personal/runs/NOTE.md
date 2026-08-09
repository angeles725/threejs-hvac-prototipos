# Run note — esclusa-personal · materials attempt 1

## Evidence binding (read before running capture-gc here)

`materials-attempt1-{grazing,abierta}.*` are EVIDENCE, bound by that documented glob.
`grazing` is the LOOK-DEV requirement; `abierta` is the KINEMATIC requirement (this asset declares
two animation channels) AND the only capture that shows a leaf parked behind its fixed segment.

## Two defects caught before the review was written

1. **A crash, caught by PREFLIGHT** — `ReferenceError: Cannot access 'requestRender' before
   initialization`. The initial `applyDoors()` call sat above the `const requestRender` declaration,
   in its temporal dead zone. Every other asset in this catalog survives the same ordering because
   its handlers only run on a click; this one runs one at LOAD, to boot into `?view=abierta`.
   Step 0 exists for exactly this: the module threw, so `data-app-ready` would never have flipped and
   the gate would have reported a broken asset — after spending the attempt.
2. **A floating head, caught by the PRE-LOOK.** The figure's torso capsule ended at y=1.465 and the
   head sphere began at y=1.590: a 0.125 m gap. Counts and console never see it. Fixed with a longer
   torso plus a neck, and both joints are now asserted in code — the same continuity rule the ONBOARD
   applies to cut-away assemblies, applied to a scale figure.

## The interlock was VERIFIED, not declared

`probe-state.mjs puertas/esclusa-personal btnA,btnB` drives BOTH doors in sequence and returns
`errors: []`. The build carries `console.assert(!(openA && openB))`, so a clean console after that
sequence is positive evidence that no state with both leaves open is reachable. Reading the source
would not have proved it; driving it does.

## Cross-family finding, NOT fixed here (isolation rule)

A sweep of every `design-spec.yaml` in the catalog: **89 valid, 9 unparseable** —
`estructuras/{bodega-shell,nave-almacen-shell,supermercado-layout}` and
`transporte/{apilador,banda-rodillos,grua-puente,montacargas,transpaleta,transportador-cadena}`.
The common cause in the one inspected (`grua-puente`) is the same one this asset hit: `key:{value…}`
with no space after the colon, which YAML reads as a scalar. Those assets are gate-green, because the
catalog gate never reads the spec — so their declared `colorTarget` and every spec-driven check are
silently inert. Reported to session-A; not touched, they belong to other families.

## Deviation

The reviewer is the orchestrator INLINE, not a fresh-context blind agent (this session cannot spawn
subagents). Self-review, not the acceptance authority the contract requires.
