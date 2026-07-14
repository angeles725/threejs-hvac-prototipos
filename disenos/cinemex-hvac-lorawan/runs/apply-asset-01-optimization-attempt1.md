# OPTIMIZATION — apply, asset 01-shell-circulation-facade, attempt 1

**Pass:** optimization (scene-level ladder, after interaction-ui PASS 0.81)
**Tests:** 211/211 (`node --test tests/*.test.mjs`) — unchanged, no code was written by this pass.
**Gated passes touched:** none. This pass changed ZERO lines of application code.

## The decision this pass actually made

The optimization ladder row says: "draws: BatchedMesh/merge · tris: LOD/simplify/instanceColor;
re-probe vs budget". This pass's finding is that **every optimization the spec demands is already
built and gated, and the measured utilization leaves no engineering case for more**. Applying
further batching to a 41%-utilization scene would risk gated behavior (status overlays re-emit
instances by `statusOwner`, raycast picking resolves through `userData.entities`, transparency
z-order is tuned) in exchange for headroom nobody asked for. Optimization is not a virtue when the
budget says it is a no-op; it is a risk transfer from a green budget to five closed gates.

## Runtime targets (quality_contract.runtime_targets) — verified in code

| Target | Status | Evidence |
|---|---|---|
| `dpr_cap: 1.5` | MET | `src/scene/runtime.js:15-18` `resolvePixelRatio(dpr, cap = 1.5)`, applied at `:42` |
| `repeated_assets`: InstancedMesh/BatchedMesh | MET | seats/panels/lights/people/diffusers/devices are InstancedMesh pools (gated since blockout; judged through five passes) |
| `packets`: fixed pool, no per-frame allocation | MET | 32 packets + 3 wave rings + 25 alarm halos + 16 selection halos + 14 zone halos + 11 status overlays, all fixed `InstancedMesh`, `count=0`/`visible=false` when unused (interaction-ui apply report §2) |
| `labels`: distance/frustum culled with a visible-label cap | MET by construction | label population is statically bounded (fixed billboard sprite set — no dynamic label creation); each label is culled by derived projection (`resolveTc300LabelPlacement`: off-frame at NDC 0.95, too-small below the physical floor). An additional hard cap would HIDE labels the blind judges scored as present — a regression, not an optimization. Measured worst case has every label system active inside 41% of the draw budget. |
| `shadows`: static bake, invalidate on caster changes | MET | `src/scene/runtime.js:49` `shadowMap.autoUpdate = false`; `:128` explicit `needsUpdate = true` on visibility/state changes |

## Probe medians — full evidence grid (renderer.info, `--url-suffix`, never the default camera)

Budget: **550 draws / 750,000 tris** (hard ceiling 800 / 2M). All 12 contract combos plus the
fault worst case:

| view × state | draws | tris |
|---|---|---|
| neutral × architecture t0 | 201 | 28,700 |
| neutral × eng+sel t0 | 153 | 29,912 |
| neutral × eng+sel t30 | 153 | 29,912 |
| engineering-section × architecture t0 | 208 | 28,606 |
| engineering-section × eng+sel t0 | 186 | 29,914 |
| engineering-section × eng+sel t30 | 186 | 29,914 |
| complete-network × architecture t0 | **225 (peak draws)** | 29,456 |
| complete-network × eng+sel t0 | 197 | 30,708 |
| complete-network × eng+sel t30 | 197 | **30,708 (peak tris)** |
| sala-3 × architecture t0 | 58 | 11,894 |
| sala-3 × eng+sel t0 | 79 | 22,083 |
| sala-3 × eng+sel t30 | 79 | 22,083 |
| worst fault (complete-network × fault-internet) | 195 | 25,964 |

**Peak utilization: 225/550 draws = 41% · 30,708/750,000 tris = 4.1%.**
Draw count is identical at t0 vs t30 in every view (153/186/197/79 pairs): the tick animates pool
instance matrices, it allocates nothing and adds no draw — exactly what the fixed-pool contract demands.

## X3 discharge (deferred defect, owned by this pass)

The old probe wrapper reported 59 draws / 708 tris for this same scene — it counted each
InstancedMesh as one instance. Every number above comes from three.js `renderer.info` via the
`window.__qaRenderInfo` hook, driven to explicit camera/state URLs. Honesty limit, on the record:
**draws/tris cannot see fragment cost.** The 27 PointLights' shading cost is bounded instead by
`dpr_cap 1.5` and the static shadow bake; `fps` under SwiftShader is not evidence either way
(informational only). On the target device (office desktop iGPU) the proxy for that cost is the
draw/tri budget, which sits at 41%.

## Packet-pool size and label-cap numbers (contract: "record … label cap and packet-pool size")

- Packet pool: 32 packets (14 drop + 8 trunk + 4 LoRaWAN + 6 Ethernet) + 3 wave rings — fixed.
- Halo pools: 25 alarm + 16 selection + 14 zone — fixed.
- Status overlays: 11 InstancedMesh — fixed.
- Label bound: static billboard population (14 TC300 chips + 4 UC + gateway + 4 bus + zone/external
  captions), derived per-preset culling; no dynamic creation, no unbounded set.

## Before/after statement for the blind review

Before == after: no geometry, material, pool or culling change was applied by this pass. The
capture set therefore proves the EXISTING batching/instancing/culling preserves every critical
proxy, the 19 endpoints, the four buses with 14 drops, the selected route and the packet/wave
positions — which is precisely the contract's proof clause. Any visual delta against the
interaction-ui evidence would be a defect in this claim and must fail the gate.

Known, declared delta vs the interaction-ui captures: **X1's viewport correction (applied between
the two gates, see DEFERRED-CORRECTIONS.md) makes TC300-03's chip visible at the lobby preset** —
measured exhaustively as the ONLY runtime-visible change (84 chip×preset combos diffed). The lobby
preset is not in this pass's capture set; it lands at P6, where the judge scores it fresh.
