# Creativity receipt
Schema: anti-ai-ui/creativity-receipt@1
Receipt stage: direction
Deliverable: disenos/cinemex-hvac-lorawan lateral-menu shell (cinemex-menu round; consumer: index.html viewer + dashboard.html)

## Decision brief
- User: es-MX maintenance tech / facilities manager operating the multiplex HVAC-LoRaWAN console
- Pressure: comfort complaints and energy burn are live; ten operational sections must become reachable without ever abandoning the 3D building the whole workflow orbits
- Decision: which zone/RTU needs attention next, and whether to navigate the model (camera/layers) or read the data (tables/trends) to confirm it
- Consequence: a warm sala cooks a full auditorium or an RTU burns energy unattended; a menu that hides the viewer or its Vista controls breaks gated control contracts (tests/shell.test.mjs selector guarantees)
- Action: open the section, confirm zone state on model + table in one glance, then pin the menu closed and work the 3D view
- Primary domain object: the 3D multiplex building (viewer hero) with its 14 rooftop RTUs and sala/lobby/kitchen zones
- Information shape: spatial hero (3D model) + tabular/operational section content (zone table, RTU meter table, KPI cards) coordinated by one selected-section predicate
- Anti-references: client reference screenshots' SKIN (near-black ground + neon-green accent + glow = the 2026 AI-BMS centroid; structure donor ONLY, palette does not move); the dark casino/MX60 look (banned by project memory); generic admin-template sidebars (icon-only tooltip rails, hamburger-reveals-everything on desktop, gradient active states)
- Evidence strength: source=runs/menu/BRIEF.md hard-constraint table + existing gated tests (shell.test.mjs:467-468 camera options, main.js:114-171 control queries); evidence=fresh-context blind review rendered at 1560/1280/900/390 + shared-slice hashes verified identical across the three studies by script; assumption=fake-but-shaped study data (14 RTU meter rows summing exactly to the 142.6 kW headline) stands in for the deterministic seeded sims BUILD will add

## Shared evidence
- Content hash: sha256:c5d272c4cd3d19f7632e8dd06c3282532a79510fef98ae8ff8423df1a8a97ac2
- Data hash: sha256:29c9d7efc7f373a8c8854d5e5b2a783ba8751598a39c745f84b7bc1e0b7715b8
- Palette hash: sha256:eeb4201c41962a3c5ecac6f9406ef9ff53af9db7d3c8e01d35872830e23c72e7
- Type hash: sha256:11f8cedb3070c64e90e405c0a3f637e5645ab0fa34e3a3ad7a43a88817209ebc
- Component-grammar hash: sha256:9f5b57a36521271ad1c72a2e6a5868031ecd6fc7913b38bf91c458eb64c784cf
- Normalization (one documented command): `python3 hash-shared-slices.py` (archived at runs/menu/studies/hash-shared-slices.py) — content = sorted unique shared es-MX vocabulary (nav labels, table headers, card headings, camera options, layer labels, mode buttons, fullscreen; per-structure chrome labels excluded); data = sorted multiset of all td cells + KPI values/subtexts + badges; palette = :root custom properties minus structural width vars (--rail-w/--panel-w/--sidebar-w/--menu-w/--dock-w) and typography; type = sorted unique font-family declaration values; component-grammar = whitespace-normalized top-level CSS rules byte-identical across all three studies (29 rules). The script exits nonzero on any cross-study mismatch; all five slices verified identical for study-a/b/c before hashing (sha256 over newline-joined slice text). Hashes attest slice identity, not that the inputs are real or good.

## Rendered studies
| Role | Screenshot | Content hash | Data hash | Palette hash | Type hash | Component-grammar hash | Blind label |
|---|---|---|---|---|---|---|---|
| domain-native | /home/cristian/prototipos/three.js/disenos/cinemex-hvac-lorawan/runs/menu/studies/shots/study-a-1560.png | sha256:c5d272c4cd3d19f7632e8dd06c3282532a79510fef98ae8ff8423df1a8a97ac2 | sha256:29c9d7efc7f373a8c8854d5e5b2a783ba8751598a39c745f84b7bc1e0b7715b8 | sha256:eeb4201c41962a3c5ecac6f9406ef9ff53af9db7d3c8e01d35872830e23c72e7 | sha256:11f8cedb3070c64e90e405c0a3f637e5645ab0fa34e3a3ad7a43a88817209ebc | sha256:9f5b57a36521271ad1c72a2e6a5868031ecd6fc7913b38bf91c458eb64c784cf | A |
| evidence-reference | /home/cristian/prototipos/three.js/disenos/cinemex-hvac-lorawan/runs/menu/studies/shots/study-b-1560.png | sha256:c5d272c4cd3d19f7632e8dd06c3282532a79510fef98ae8ff8423df1a8a97ac2 | sha256:29c9d7efc7f373a8c8854d5e5b2a783ba8751598a39c745f84b7bc1e0b7715b8 | sha256:eeb4201c41962a3c5ecac6f9406ef9ff53af9db7d3c8e01d35872830e23c72e7 | sha256:11f8cedb3070c64e90e405c0a3f637e5645ab0fa34e3a3ad7a43a88817209ebc | sha256:9f5b57a36521271ad1c72a2e6a5868031ecd6fc7913b38bf91c458eb64c784cf | B |
| off-bank | /home/cristian/prototipos/three.js/disenos/cinemex-hvac-lorawan/runs/menu/studies/shots/study-c-1560.png | sha256:c5d272c4cd3d19f7632e8dd06c3282532a79510fef98ae8ff8423df1a8a97ac2 | sha256:29c9d7efc7f373a8c8854d5e5b2a783ba8751598a39c745f84b7bc1e0b7715b8 | sha256:eeb4201c41962a3c5ecac6f9406ef9ff53af9db7d3c8e01d35872830e23c72e7 | sha256:11f8cedb3070c64e90e405c0a3f637e5645ab0fa34e3a3ad7a43a88817209ebc | sha256:9f5b57a36521271ad1c72a2e6a5868031ecd6fc7913b38bf91c458eb64c784cf | C |

Role assignment reasoning (blind labels are the literal study filenames):
- study-a = domain-native: its composition is derived from the primary domain object itself — the 3D building IS the page (full-bleed hero that never yields layout space; menu, header and content are floating satellites orbiting it).
- study-b = evidence-reference: its composition is the verified external mechanism — the client's dark-BMS reference information architecture (grouped sidebar taxonomy + scrolling console document) with branding and skin removed and the locked B43 tokens applied.
- study-c = off-bank: a brief-derived three-lane workbench (permanently reserved content dock + Vista control deck welded to the hero's bottom edge) present in no creative-moves bank entry; synthesized directly from the brief's tension between "controls fold into the menu" and "model and data are permanent peers".

## Pairwise structural divergence
| Pair | Axes |
|---|---|
| domain-native <> evidence-reference | hero topology (full-bleed stage vs letterboxed in-flow figure), scroll model (fixed viewport with panel-internal scroll vs single document scroll), content position (floating satellite panel over the hero vs in-flow cards below it) |
| domain-native <> off-bank | vista placement (folded into the rail foot vs deck welded under the hero), content housing (floating overlay occluding the model vs reserved dock lane beside it), hero treatment (never yields any space vs yields horizontally to pin state) |
| evidence-reference <> off-bank | scroll model (whole-document scroll vs fixed workbench with dock-only scroll), hero persistence (scrolls away like a figure vs permanent and sticky), menu information shape (grouped taxonomy with inline Vista controls vs flat list with Vista externalized to the deck) |

## Blind review
- Randomized order: A,B,C
- Rubric: task-fit, domain-fidelity, structural-divergence, evidence-legibility, off-bank-novelty — applied as five 5-point sub-checks (task / hero / vista / tiers / ai-tells; 25 max), fresh-context reviewer, rendered in Chrome at 1560/1280/900/390, author notes not read
- Verdict before reveal: accept C at 22.5/25 (task 4.5 / hero 4.5 / vista 5 / tiers 4.5 / ai-tells 4); A scored 17.5 (3.5/4.5/2.5/3/4) — rejected because the collapsed rail hides the Vista group in the default tablet state and content drowns in a ~430px floating column; B scored 12 (2/2/2.5/2.5/3) — rejected because it demotes the hero to a scrolling document figure that never widens, a structural fail of the walkthrough's final beat
- Role reveal: A=domain-native; B=evidence-reference; C=off-bank
- Reject-all available: yes

## Final binding
- Selected role: off-bank
- Selected skeleton: split workbench ("Banco de trabajo dividido") — spanning top bar over three fixed lanes (menu | hero pane | content dock); Vista controls as a deck welded under the viewer; dock scrolls independently and never yields; phone tier = sticky 40vh hero + stacked dock with the menu as an overlay drawer
- Signature effect meaning: menu pin state -> width traded with the hero pane only (the dock lane stays reserved) -> the operator opens the model to work it full-attention without ever losing the data lane beside it
- Signature fallback: static CSS grid; with JS disabled the menu renders pinned with all sections listed, Tablero content sits in the dock, and the Vista deck is plain DOM controls; the only motion is the phone drawer slide, disabled under prefers-reduced-motion
- Direction verdict: PASS
- Grafts bound into the direction (from rejected studies, owed at BUILD): from domain-native (A) — dock collapse/peel mirroring the menu pin to reach a full-bleed 3D state, plus the labeled "Menú fijado" pin affordance; from evidence-reference (B) — grouped menu taxonomy (OPERACIÓN/ANÁLISIS) and a sticky section bar with an "↑ Modelo 3D" jump-back for long dock sections
- BUILD obligations from the winner's known weaknesses: (1) the dock never yields — closed by the A-graft dock collapse/peel; (2) the Vista deck wraps to 2 rows below 1280px and collides with hero badges at pinned widths — BUILD must give the deck an explicit responsive contract (evidence: the 1560px capture already clips the CAPAS label under the study tag)

## Decision UX evidence
- Primary task: operator lands on Tablero, spots the kitchen running warm on the zone table WHILE the 3D model is visible beside it, confirms, then pins the menu closed to work the model; completion signal = zone confirmed on table + model without a scroll round-trip (study C keeps both in one glance; full journey through HVAC/Trends lands at BUILD)
- Walkthrough result: beat 1 (see model + zone table together) satisfied structurally by the reserved dock; beat 2 (section switch) = one menu click swaps dock content while hero and deck persist; final beat (work the 3D full-width) only half-true in the raw study — bound A-graft dock peel closes it; B failed this beat structurally, which decided the review
- Coordinated surfaces: one predicate = selected section; menu carries aria-current highlight, dock swaps its content and heading, hero + Vista deck stay constant as the shared context
- State/reset/undo/history: studies use a session-only pin toggle; BUILD must persist pin state (localStorage per brief), keep inbound ?camera=&state=/embed deep links working, and keep writeQueryState a no-op; drawer close = visible reset on phone
- Keyboard/assistive path: every control is a native button/select/checkbox; 3px :focus-visible outline on all interactives; aria-current="page" marks the section; aria-pressed on pin and mode buttons; drawer focus trap + Esc-to-close are named BUILD obligations
- Hostile data evidence: long label stress in menu ("Cuarto de máquinas") and zone names in tables; 14-row meter table sums exactly to the 142.6 kW headline (shaped, self-consistent); out-of-scope sections render honestly disabled ("Fuera de alcance del estudio"); zero/null/stale states owed to the deterministic seeded sims at BUILD
- Chart truth/warrant: no charts in the studies (tables + KPI cards only, real DOM text); Trends sparklines at BUILD reuse the shipped series.mjs/render.mjs SVG builders with declared common scales, per the brief's information-shape table
- Motion contract: single motion = phone drawer slide (.18s transform, trigger: menu button, interruptible, purpose: spatial continuity); prefers-reduced-motion removes it; no other animation anywhere in the three studies
- Semantic effect binding: menu pin state -> hero pane width (dock reserved) -> full-attention model work; alerts count -> warn-token badge on the Alertas item -> triage entry point; fallback = static pinned grid, no motion budget beyond the drawer
- Direct manipulation: pin, drawer, and section switches are plain buttons operable by keyboard and AT; cancel = scrim click or reopening pin; persistence and Esc handling bound to BUILD
- Content vocabulary/error recovery: stable es-MX operator nouns (unidad, zona, objetivo, tablero, cuarto de máquinas); disabled sections state their condition and recovery honestly (fuera de alcance del estudio); no fabricated availability
- Container choreography: four tiers demonstrated in one file per study — >=1440 wide dock (27.5rem), 1024-1439 dock narrows before the hero (22rem), 768-1023 menu starts collapsed with dock lane kept (19rem), <768 vertical stack with sticky hero; KPI row spans 3 columns wide and 2 columns on phone
- Accessibility equivalent: state pills carry text words (Enfriando/Auto/Ventilando) not colour alone; all data is real DOM table text (copyable, screen-reader readable); non-pointer route through native controls; non-colour alert signal = numeric badge text

## Creativity ledger
| Deliverable | Metaphor | Skeleton/focal topology | Reading order | Chart/story device | Interaction signature | Accepted/rejected branches |
|---|---|---|---|---|---|---|
| cinemex-menu lateral shell | split workbench (the model on the bench, the paperwork in the dock) | spanning top bar over three fixed lanes; hero focal center flanked by menu and reserved dock; Vista deck welded under the hero | top-bar status -> menu -> hero -> dock scan | zone/meter tables living in a reserved dock beside the live model (tables-as-peer, not below-the-fold) | menu pin trades width with the hero only; Vista deck welded to the thing it controls | off-bank accepted; domain-native rejected (grafts: dock peel to full-bleed + labeled pin affordance); evidence-reference rejected (grafts: OPERACIÓN/ANÁLISIS taxonomy + sticky "↑ Modelo 3D" jump-back) |

## Source intake
| Repository | Immutable commit | Exact path | License | Activity snapshot | Dependencies/runtime cost | Accessibility evidence | Mechanism taken | Vendor defaults removed | Certified vibra tokens | Notices | Fallback/rollback/removable boundary |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Client dark-BMS reference screenshots (structure donor via client-reference intake, same procedure that certified B43 on 2026-07-15) | N/A (client-supplied images, not a repository) | runs/menu/BRIEF.md section "Information shape" (adapted section-by-section table) | client-supplied for structural reference | 2026-07-16 client mandate recorded in BRIEF.md | zero dependencies; information architecture only, no code taken | N/A (images; the rebuild carries its own keyboard/aria evidence) | ten-section menu taxonomy + per-section information shape (mechanisms only) | yes: near-black grounds, neon-green accents and glow all rejected as the named anti-reference skin | B43 Light SaaS Operations Console (locked; palette does not move, stated twice by the user) | palette-lock notice recorded in BRIEF.md vibra header | delete runs/menu/ and the future shell changes; the reference skin never entered the codebase |
| threejs-hvac-prototipos (same repo, prior round) | 81dfc9b | disenos/cinemex-hvac-lorawan/src/dashboard/series.mjs and render.mjs | own work | 2026-07-16 (last commit, cartelera round) | zero new dependencies; vanilla ES modules | keyboard+aria patterns already shipped in dashboard round | SVG series builders reserved for the Trends section at BUILD (mechanism only) | N/A (own code, no vendor skin) | B43 (this round) over mechanisms built under B15 | none required (own corpus) | revert shell diff; studies live in runs/menu/studies/ and never ship |

## Asset manifest
| Asset | Author | Origin | License | Attribution | Local path | SHA-256 | Fallback |
|---|---|---|---|---|---|---|---|
| decision brief | this run | authored | own work | none needed | disenos/cinemex-hvac-lorawan/runs/menu/BRIEF.md | sha256:337b23041b3cfe26e25bb2f90ff6d0d55ac890d0b47dc2cda573bd6a6e393b41 | N/A (documentation) |
| B43 token sheet | anti-ai-ui skill (certified 2026-07-15) | client-reference intake certification | own work | none needed | ~/.claude/skills/anti-ai-ui/assets/tokens/light-saas-console.tokens.json | sha256:39299c54cbf8cf41d4a4ed519571b4713fc7982c30d6df0d2f7e5afb71da2d33 | tokens inlined verbatim in each study :root |
| study screenshots (1560px, headless Chrome 150) | this run | rendered from study-a/b/c.html | own work | none needed | disenos/cinemex-hvac-lorawan/runs/menu/studies/shots/study-{a,b,c}-1560.png | sha256:e3099eec594e2f51c97f2812348c5cacc6de50000b9a9a81e5044f2606b054c8 (a); 4806a157d26f9f99ef3036e0016e18e81fdcad304ea77fa7563e1fc236412e4a (b); e5fed383ebe9ca4177d0e2b189f8761886f1ad9f0c0f3989ecec9bcb783cc4e9 (c) | re-render from the archived study HTML |
| study author notes | this run | authored | own work | none needed | disenos/cinemex-hvac-lorawan/runs/menu/studies/NOTES.md | sha256:343e94a9d476023b4e99bc1a4b5bbdbe5e2c445e02065bcaa68b949dd3cd9e6b | N/A (documentation; withheld from the blind reviewer) |
| IBM Plex Sans / IBM Plex Mono | IBM | Google Fonts (existing project pattern) | OFL-1.1 | none required by OFL | referenced by family name only in the studies | sha256:0000000000000000000000000000000000000000000000000000000000000000 | system-ui / monospace stacks declared in every font-family |
