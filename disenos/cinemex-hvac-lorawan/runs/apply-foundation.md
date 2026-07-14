# SDD Apply — Foundation / Domain (Tasks 1.1–1.3)

**Change:** `cinemex-hvac-lorawan`  
**Mode:** Strict TDD  
**Delivery:** `exception-ok`, accepted `size:exception`; no commit or PR created  
**Scope:** Domain/configuration only. No Three.js runtime or browser shell is included in this batch.

## Completed tasks

- [x] 1.1 Canonical meter-based configuration, exact inventory/placement validation and immutable IDs.
- [x] 1.2 Typed canonical topology, membership selectors, trace validation and fault-aware reachability.
- [x] 1.3 Seeded telemetry, immutable store, bounded setpoints, reversible fault injection and alarm derivation.

## TDD cycle evidence

| Task | Test files | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `tests/config.test.mjs` | Unit | New isolated files. Root `npm test` remained the pre-existing placeholder; only additive `test:cinemex` was introduced. | `node --test disenos/cinemex-hvac-lorawan/tests/config.test.mjs` exited 1 with `ERR_MODULE_NOT_FOUND` for `src/config.mjs`. | `node disenos/cinemex-hvac-lorawan/tests/config.test.mjs` exited 0: 5 tests, 5 pass, 0 fail. | Exact inventory, three capacity ranges, canonical placements, valid and two invalid configurations, immutability. | Centralized count/family constants, validation helpers and recursive `deepFreeze`; 5/5 remained green. |
| 1.2 | `tests/topology.test.mjs` | Unit | Task 1.1: 5/5 passing before topology work. | `node disenos/cinemex-hvac-lorawan/tests/topology.test.mjs` exited 1 with `ERR_MODULE_NOT_FOUND` for `src/topology.mjs`. | Focused command exited 0: 5 tests, 5 pass, 0 fail. | A/D memberships, Sala 3 and kitchen traces, shortcut and wrong-medium rejection, healthy/source/dependency failure paths, all 14 end-to-end traces. | Extracted canonical media order and topology indexing helpers; topology 5/5 and config 5/5 remained green. |
| 1.3 | `tests/simulation.test.mjs`, `tests/alarms.test.mjs` | Unit | Tasks 1.1–1.2: 10/10 passing before simulation work. | Both focused commands exited 1: missing `src/simulation.mjs` and `src/alarms.mjs`, respectively. | Simulation: 5/5; alarms: 5/5; both commands exited 0. | Same/different seeds, tick bounds, occupancy/packets, upper/lower setpoint clamps, replay/restore, store notifications, high/low temperature, TC/UC/Internet failures and isolation. | Extracted deterministic rebuild/overlay helpers and fault-target constants; simulation 5/5 and alarms 5/5 remained green. |

## Work unit evidence

| Evidence | Exact result |
|---|---|
| Focused tests | `node disenos/cinemex-hvac-lorawan/tests/{config,topology,simulation,alarms}.test.mjs` run individually: 20 behavioral tests, 20 pass, 0 fail. |
| Scoped suite | `npm run test:cinemex`: exit 0; Node test runner reported 4 test files, 4 pass, 0 fail. |
| Syntax | `node --check` over 7 `src/*.mjs` and 4 `tests/*.test.mjs`: 11 files checked, PASS. |
| Runtime/domain harness | `node --input-type=module` deterministic UC100-B failure scenario: exit 0; trace `TC300-08 → UC100-B → UG67-01 → router-firewall → internet → niagara-supervisor`; media `rs485 → lorawan → ethernet → ethernet → ethernet`; affected devices exactly `TC300-06..09`. Browser/WebGL harness is N/A for this foundation-only batch because task 2.1 owns the runtime shell. |

Exact deterministic harness output:

```json
{"trace":["TC300-08","UC100-B","UG67-01","router-firewall","internet","niagara-supervisor"],"media":["rs485","lorawan","ethernet","ethernet","ethernet"],"affected":["TC300-06","TC300-07","TC300-08","TC300-09"]}
```

## Rollback boundaries

- **Foundation work unit (safe aggregate rollback):** remove `src/{config,validation,topology,selectors,simulation,store,alarms}.mjs`, `tests/{config,topology,simulation,alarms}.test.mjs`, this report, and only the root `test:cinemex` script. This does not touch any pre-existing design or research file.
- **Task 1.3 independent rollback:** remove `src/{simulation,store,alarms}.mjs` and `tests/{simulation,alarms}.test.mjs`; configuration and topology remain usable.
- **Task 1.2 rollback before dependent 1.3:** remove `src/{topology,selectors}.mjs`, `tests/topology.test.mjs`, and `NETWORK`/`EXTERNAL_NODES` wiring in `src/config.mjs`.
- **Task 1.1 is the dependency root:** reverting it after 1.2/1.3 requires the aggregate rollback because those modules intentionally consume the canonical configuration.

## Deviations and risks

- No design/spec deviation. The UG67-to-Niagara edge remains explicitly labeled as conceptual IP integration rather than a verified native driver.
- Node v22's `node --test <glob>` reports one aggregate subtest per ESM test file in this environment. Individual direct executions expose the 20 behavioral tests; both forms were run and passed.
- Browser, Three.js, labels, packet rendering and visual gates remain intentionally pending from task 2.1 onward.

## Gatekeeper correction — tasks 1.1–1.2 (single rerun)

The first apply gate found that the original validators proved the canonical happy path but did not reject every configuration/topology mutation. The correction preserves the public domain API and task 1.3 semantics while tightening the authority boundary.

### Corrective RED

| Probe | Command and exact result |
|---|---|
| Global inventory, membership and placement mutation tests | `node disenos/cinemex-hvac-lorawan/tests/config.test.mjs`: exit 1 before production edits because `TC300_WALL_FACE_TOLERANCE_M` was not exported. |
| Extra/missing/type/endpoint edge tests | `node disenos/cinemex-hvac-lorawan/tests/topology.test.mjs`: exit 1; 7 tests, 5 pass, 2 fail. UC100→Niagara and duplicate edges incorrectly produced no errors; a missing edge lacked exact-set evidence. |

### Corrective GREEN / REFACTOR

- `validation.mjs` now enforces global IDs, exact TC300/UC100/UG67/Niagara inventories, canonical thermostat zone/owner/position/placement, exact per-UC100 membership, and zone-bound placement.
- `config.mjs` documents and exports `TC300_WALL_FACE_TOLERANCE_M = 0.15`; TC300-02 intentionally occupies that wall-face allowance. Auditorium entity IDs are namespaced (`auditorium-sala-N`) while their stable HVAC zone IDs remain `sala-N`, eliminating cross-collection identity collisions.
- `topology.mjs` compares the complete edge multiset against the immutable canonical edge authority, so any missing, extra, duplicate, endpoint-mutated, medium-mutated or physical/wireless-mutated edge fails validation.
- `simulation.mjs` indexes auditorium capacity by stable `zoneId`, preserving occupancy behavior after entity-ID namespacing.

| Verification | Exact result |
|---|---|
| Config focused | 8 tests, 8 pass, 0 fail. |
| Topology focused | 7 tests, 7 pass, 0 fail. |
| Simulation regression | 5 tests, 5 pass, 0 fail. |
| Alarm regression | 5 tests, 5 pass, 0 fail. |
| Total behavioral | 25 tests, 25 pass, 0 fail. |
| Scoped suite | `npm run test:cinemex`: exit 0; 4 files, 4 pass, 0 fail. |
| Syntax | `node --check` over 11 source/test modules: PASS. |

### Corrective rollback boundary

The correction is isolated to additions in `tests/{config,topology}.test.mjs`, exact-invariant helpers in `src/{validation,topology}.mjs`, the tolerance/entity namespace changes in `src/config.mjs`, and the corresponding `zoneId` lookup in `src/simulation.mjs`. Reverting that exact diff restores the pre-gate behavior without affecting task 1.3 fault/store/alarm logic, but intentionally reopens the gatekeeper defects; the safe feature rollback remains the aggregate foundation boundary documented above.

## Foundation gate maintenance — contractual topology labels

The second foundation validation found that the canonical edge multiset omitted `label` from its identity. That allowed the Internet → Niagara edge to replace `Conceptual IP integration` with an unsupported native-driver claim while still validating.

### TDD cycle evidence

| Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| Unit (`tests/topology.test.mjs`) | Before edits, focused command exited 0: 7 tests, 7 pass, 0 fail. | After adding the native-driver mutation test first, `node disenos/cinemex-hvac-lorawan/tests/topology.test.mjs` exited 1: 8 tests, 7 pass, 1 fail; `validateTopology()` returned `valid: true` instead of `false`. | After including the normalized exact label in the canonical signature, the same command exited 0: 8 tests, 8 pass, 0 fail. | Canonical `APP_CONFIG` remains valid while changing only the Internet → Niagara label to `Native Niagara direct driver` is invalid and produces one missing plus one unexpected edge. | Extracted NFC-only label normalization and switched the signature to an unambiguous JSON tuple; no additional refactor was needed after GREEN. |

### Work unit evidence

| Evidence | Exact result |
|---|---|
| Focused test | `node disenos/cinemex-hvac-lorawan/tests/topology.test.mjs`: exit 0; 8 tests, 8 pass, 0 fail. |
| Scoped suite | `npm run test:cinemex`: exit 0; 4 test files, 4 pass, 0 fail. |
| Syntax | `node --check disenos/cinemex-hvac-lorawan/src/topology.mjs` and `node --check disenos/cinemex-hvac-lorawan/tests/topology.test.mjs`: both exit 0. |
| Runtime/domain harness | `node --input-type=module` validated canonical `APP_CONFIG`, mutated only the Internet → Niagara label, and exited 0 with exactly two errors: missing `Conceptual IP integration` and unexpected `Native Niagara direct driver`. |

Exact domain harness output:

```json
{"valid":false,"errors":["Missing edge internet → niagara-supervisor (ethernet, label=\"Conceptual IP integration\", physical=true).","Unexpected edge internet → niagara-supervisor (ethernet, label=\"Native Niagara direct driver\", physical=true)."]}
```

### Rollback boundary

Revert only the `normalizeEdgeLabel()` helper plus label-bearing JSON tuple/description in `src/topology.mjs`, remove the native-driver mutation test from `tests/topology.test.mjs`, and remove this maintenance section. This restores the prior foundation behavior without affecting configuration, selectors, simulation, store or alarm logic, but intentionally reopens the unsupported Niagara integration claim.
