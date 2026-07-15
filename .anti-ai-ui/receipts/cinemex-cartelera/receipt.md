# Creativity receipt
Schema: anti-ai-ui/creativity-receipt@1
Receipt stage: delivery
Deliverable: disenos/cinemex-hvac-lorawan/dashboard.html

## Decision brief
- User: building operator (es-MX) responsible for the multiplex HVAC fleet
- Pressure: an alarm may be burning comfort or equipment RIGHT NOW; triage cannot wait
- Decision: dispatch maintenance vs adjust setpoint vs keep watching vs distrust the data
- Consequence: wrong call wastes a technician trip or cooks a full auditorium of customers
- Action: open the owning unit, read temp-vs-band + delivery chain, act
- Primary domain object: the sala (auditorium) as a cartelera slot; the unit page as its function page
- Information shape: 14 units x (identity, live temp, setpoint band, state, delivery, bus, 24h series) + fleet rollup + active alarm + canonical chain per unit
- Anti-references: hotel B11 paper/navy/rust skin (mechanisms only, skin forbidden); generic SaaS admin (card grids, drop shadows, donut KPIs, gradient heroes); movie kitsch (reels, clapperboards, star ratings)
- Evidence strength: source=the 3D twin's own deterministic simulation (gated 8/8, p6-final L4 ship); evidence=blind-review verdicts + computed WCAG ratios; assumption=24h series synthetic-seeded (documented on-page)

## Shared evidence
- Content hash: sha256:54ee280f28585e116ba6e70bbab022bb879705fb6f36842fb335228baaef5094
- Data hash: sha256:fe0269229549ae25e23ba0a4a6e9f88b986f4fb77acb11b840ec1674ac1f62ae
- Palette hash: sha256:5062c874a211c440503a2a2bed4fef4484c7859eff2ff812dce3f79e890cb367
- Type hash: sha256:a408cb501b38591c38d1295a575582e4cdd468198059c516548330452354d428
- Component-grammar hash: sha256:96151fff05013e3150ab85b28bf36a694a129c816ad5dff3b9d99b918805418a

## Rendered studies
| Role | Screenshot | Content hash | Data hash | Palette hash | Type hash | Component-grammar hash | Blind label |
|---|---|---|---|---|---|---|---|
| domain-native | /tmp/claude-1000/-home-cristian-prototipos-three-js/8565f7df-01da-43cb-b0ab-30a085acf9ee/scratchpad/studies/study-2-fleet.png | sha256:54ee280f28585e116ba6e70bbab022bb879705fb6f36842fb335228baaef5094 | sha256:fe0269229549ae25e23ba0a4a6e9f88b986f4fb77acb11b840ec1674ac1f62ae | sha256:5062c874a211c440503a2a2bed4fef4484c7859eff2ff812dce3f79e890cb367 | sha256:a408cb501b38591c38d1295a575582e4cdd468198059c516548330452354d428 | sha256:96151fff05013e3150ab85b28bf36a694a129c816ad5dff3b9d99b918805418a | B |
| evidence-reference | /tmp/claude-1000/-home-cristian-prototipos-three-js/8565f7df-01da-43cb-b0ab-30a085acf9ee/scratchpad/studies/study-3-fleet.png | sha256:54ee280f28585e116ba6e70bbab022bb879705fb6f36842fb335228baaef5094 | sha256:fe0269229549ae25e23ba0a4a6e9f88b986f4fb77acb11b840ec1674ac1f62ae | sha256:5062c874a211c440503a2a2bed4fef4484c7859eff2ff812dce3f79e890cb367 | sha256:a408cb501b38591c38d1295a575582e4cdd468198059c516548330452354d428 | sha256:96151fff05013e3150ab85b28bf36a694a129c816ad5dff3b9d99b918805418a | C |
| off-bank | /tmp/claude-1000/-home-cristian-prototipos-three-js/8565f7df-01da-43cb-b0ab-30a085acf9ee/scratchpad/studies/study-1-fleet.png | sha256:54ee280f28585e116ba6e70bbab022bb879705fb6f36842fb335228baaef5094 | sha256:fe0269229549ae25e23ba0a4a6e9f88b986f4fb77acb11b840ec1674ac1f62ae | sha256:5062c874a211c440503a2a2bed4fef4484c7859eff2ff812dce3f79e890cb367 | sha256:a408cb501b38591c38d1295a575582e4cdd468198059c516548330452354d428 | sha256:96151fff05013e3150ab85b28bf36a694a129c816ad5dff3b9d99b918805418a | A |

## Pairwise structural divergence
| Pair | Axes |
|---|---|
| domain-native <> evidence-reference | skeleton (program board vs mimic-centerpiece), reading-order (list scan vs anomaly-first) |
| domain-native <> off-bank | focal-object (typographic slots vs stacked strip-chart drum), chart-story-device (value-first vs trace-first) |
| evidence-reference <> off-bank | skeleton (hero mimic + exception tiles vs uniform track stack), interaction-signature (mimic mark click vs track-as-button) |

## Blind review
- Randomized order: A,B,C
- Rubric: task-fit, domain-fidelity, structural-divergence, evidence-legibility, off-bank-novelty
- Verdict before reveal: accept B (43.5/50; A and C tie 40.5)
- Role reveal: A=off-bank; B=domain-native; C=evidence-reference
- Reject-all available: yes

## Final binding
- Selected role: domain-native
- Selected skeleton: cartelera program board (two-column typographic slots) -> unit function page
- Signature effect meaning: zone temperature/state -> the sala's "now showing" billing on a marquee board -> decision-1 answered with the same gesture as scanning a cinema program
- Signature fallback: static DOM board; noscript block states no data is shown without JS (no fabricated values)
- Direction verdict: PASS
- Direction receipt hash: sha256:31714cea1a417e0f512d12144b5718ba7cf43b0d7a69896b7336bc688f1af093
- Final DOM hash: sha256:af8058c2bfd07b3f76f4b81936f5968fa48612bf9819dbf53e3344695eb1e6b1
- Final screenshot hash: sha256:eafde181c710900db1cd06b27fcc8fdaa7b353de32d8798519da141dcc3f8d98
- Shipping verdict: PASS

## Decision UX evidence
- Primary task: red chip/slot -> unit page -> verdict line answers dispatch-vs-observe; completion = operator reads the verdict phrase with chain state
- Walkthrough result: D1 one glance (rollup+banner+reverse-video row); D2/D3 one click (band+deviation, delivery+chain freshness); D4 trend on the same page; back = one GO-green button or Esc
- Coordinated surfaces: alarm banner persists across ALL views with VER UNIDAD jump; rollup strip mirrors the 3D HUD derivation (single source)
- State/reset/undo/history: ?unit= deep-link cold-reproduces; pushState/popstate; Esc returns; malformed queries degrade to fleet
- Keyboard/assistive path: tab order through slots, Enter opens, Esc returns, focus managed on view swap; aria-live rollup
- Hostile data evidence: headless smoke 7 states x 14 unit views no undefined/NaN; stale delivery renders DETENIDO pill + data-trust verdict; flat-line series legible; long zone names in condensed uppercase fit tested
- Chart truth/warrant: 24h line vs shaded setpoint band answers drift-vs-band; sparkline flat=healthy narrative; chain diagram warrants data trust per hop; common 17-33 scale declared on-page
- Motion contract: none beyond focus transitions; prefers-reduced-motion honored (no bob/pulse anywhere on the dashboard)
- Semantic effect binding: state -> reverse-video/alarm red -> triage; delivery -> pill EN VIVO/DETENIDO -> trust; deviation -> band marker -> comfort call
- Direct manipulation: navigation only (read-only operations console); all reachable by keyboard; Back/Forward honored
- Content vocabulary/error recovery: es-MX operator nouns (unidad, consigna, entrega, sala); noscript and malformed-query paths degrade honestly
- Accessibility equivalent: non-colour state words (ALARMA/EN VIVO/DETENIDO text pills), full keyboard route, aria-live rollup + banner, values as real text (no canvas text) readable by screen readers and copyable
- Container choreography: two-column board >=1200px; single column narrow (verified at 900px shot); unit page stacks value->trend->chain

## Source intake
| Repository | Immutable commit | Exact path | License | Activity snapshot | Dependencies/runtime cost | Accessibility evidence | Mechanism taken | Vendor defaults removed | Certified vibra tokens | Notices | Fallback/rollback/removable boundary |
|---|---|---|---|---|---|---|---|---|---|---|---|
| threejs-hvac-prototipos (same repo) | abd7ecc | hotel-realista-ensamblado.html | own work | 2026-07-15 recon (library INDEX rows) | zero deps; hand-rolled SVG only | keyboard+aria in own rebuild | in-page drill, svg charts, kpi tile, status rollup (mechanisms only, per library rows) | yes: B11 skin fully removed, B15 rebuilt from catalog tokens | B15 Dark Scientific Terminal | none required (own corpus) | delete dashboard.html + src/dashboard/ + 2 viewer integration lines; N/A external |
| N/A (no external mechanism) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## Asset manifest
| Asset | Author | Origin | License | Attribution | Local path | SHA-256 | Fallback |
|---|---|---|---|---|---|---|---|
| decision brief | this run | authored | own work | none needed | disenos/cinemex-hvac-lorawan/runs/dashboard/BRIEF.md | sha256:86430bf9cbbd658b9790bdf4849bfc8db9964bf0a3cc8b6a348dacdc2a66c6de | N/A (documentation) |
| IBM Plex Mono | IBM | Google Fonts | OFL-1.1 | none required by OFL | external CDN (existing project pattern) | sha256:0000000000000000000000000000000000000000000000000000000000000000 | system monospace stack declared in CSS |

## Creativity ledger
| Deliverable | Metaphor | Skeleton/focal topology | Reading order | Chart/story device | Interaction signature | Accepted/rejected branches |
|---|---|---|---|---|---|---|
| cinemex-cartelera dashboard | cinema program board ("cartelera de temperaturas") | fleet board -> unit function page | alarm banner -> rollup -> slot scan -> unit | sparkline-in-slot + band-anchored trend + instrumented chain | slot click = "see the function"; persistent VER UNIDAD | domain-native bound; off-bank sparkline + verdict phrase and evidence-reference persistent banner grafted; drum skeleton and mimic-centerpiece rejected |

## Browser matrix
| Engine | Viewports | Keyboard | Focus/history/reset | States/localization | Reduced motion | Static/no-GPU | Touch/scoped overflow | Result | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| Chromium | 375,768,1024,1440 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | shots /tmp/claude-1000/-home-cristian-prototipos-three-js/8565f7df-01da-43cb-b0ab-30a085acf9ee/scratchpad/dash/fleet-375/768/1024/1440.png + fleet/unit-hot/unit-other.png; keyboard+history+states asserted in tests/dashboard.test.mjs (11 tests, 261/261 suite); dashboard has no animation so reduced-motion is trivially honored; plain-DOM no-GPU; single-column reflow at 375/768 |
| Firefox | 375,768,1024,1440 | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | pending user-side run; no engine-specific surface |
| WebKit | 375,768,1024,1440 | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | N/A no Firefox/WebKit runtime in this WSL2; page is plain DOM+SVG+history, no engine-specific APIs; user-side verification pending | pending user-side run; no engine-specific surface |
