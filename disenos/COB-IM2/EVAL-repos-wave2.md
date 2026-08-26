# Repo evaluation — wave 2 (on-track bucket)

Triage of the NEW repos from the user's list, **on-track bucket only** (CAD / 3D / graphics /
agent-skills). Judged against ONE question: *does it help L4 CAD extraction or CAD viewing?*
The UI/dashboard + design-skills bucket (react-bits, magicui, tremor, shadcn, motion-primitives,
ui-skills.com, etc.) is owned by Orquestador on the Phase-2 React-product track and is not here.

Every licence was verified at the **upstream `LICENSE` file / GitHub API**, not a README badge —
standing rule after two licences were wrong earlier when trusting weaker sources. `NOASSERTION`
from the API is not "no licence"; it is a prompt to open the file. This wave, opening the file
changed the answer twice (meshflow, kokraf).

---

## Verdict table

| # | Repo | Licence (verified) | 3D/CAD? | Helps L4 extraction/viewing? | Verdict |
|---|---|---|---|---|---|
| 1 | [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad) | **MIT** | Yes (generative CAD) | Marginal — generative, not extraction | **Note, don't vendor.** §1 |
| 2 | [facebookresearch/meshflow](https://github.com/facebookresearch/meshflow) | **FAIR Noncommercial Research v1** | Yes (mesh gen) | No | **HARD STOP — licence + wrong track.** §2 |
| 3 | [sengchor/kokraf](https://github.com/sengchor/kokraf) | **BSL 1.1** (→ Apache-2.0 on 2029-05-11) | Yes (web 3D modeller) | Viewer-UX reference only | **Code blocked till 2029; observe live app only.** §3 |
| 4 | [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | **Apache-2.0** | No (HTML→video) | No for CAD | Off-track. §4 |
| 5 | [mintdotgg/mint-threejs-skills](https://github.com/mintdotgg/mint-threejs-skills) | **MIT** | three.js skills | Track-B authoring guidance, but tied to Mint MCP (paid) | Skill-read, low priority. §5 |
| 6 | [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills) | **MIT** | three.js skills | Track-B polish guidance, clean MIT | **Skill-read for Track B.** §5 |
| 7 | [Sahir619/fable-method](https://github.com/Sahir619/fable-method) | **MIT** | No (meta-workflow) | No — workflow/eval methodology | Off critical path. §6 |
| 8 | [usestrix/strix](https://github.com/usestrix/strix) | **Apache-2.0** | No (AI pentest) | No | **KILL — not 3D/CAD.** §7 |
| 9 | [k1tbyte/Wand-Enhancer](https://github.com/k1tbyte/Wand-Enhancer) | **Apache-2.0** | No (WeMod game-mod ext, C#) | No | **KILL — not 3D/CAD.** §7 |
| 10 | [Robbyant/lingbot-map](https://github.com/Robbyant/lingbot-map) | **Apache-2.0** | Yes (3D reconstruction) | No — [INFER] route, no provenance | **Skip — wrong track.** §8 |
| — | [threejsassets.com](https://threejsassets.com/) | (asset source — per-asset licence) | Asset host | Only if a specific asset is needed + CC0/CC-BY | Defer; check per-asset licence at point of use. §9 |

**Net: zero genuine code pulls in wave 2.** Two are licence-blocked for a client deliverable
(meshflow NC, kokraf BSL). Two are not 3D/CAD at all (strix, Wand-Enhancer). One is 3D but the
wrong [INFER] route (lingbot-map). The three-skills repos are read-for-guidance for Track B, not
vendored. This confirms the corpus conclusion: the value is in the **extractor**, not external
repos.

---

## 1. text-to-cad — MIT, real CAD, but generative not extractive

13.9k stars, Python, actively pushed (2026-08-26). MIT, clean at the upstream `LICENSE`.

It is "a library of agent skills for generating, inspecting, sourcing, slicing, and handing off
CAD and robot-description artifacts" — build123d/OpenCASCADE-style geometry authored from a text
prompt, exporting STEP / STL / 3MF, plus URDF/SDF/SRDF robot descriptions.

**Why it does not touch our critical path:** our input is a measured DWG (28 831 polylines with
real coordinates, widths, BOD elevations). text-to-cad *generates* CAD from a description; it does
not *extract* a network from an existing plan. Pointing a text→geometry generator at our drawings
is the same appearance/description→geometry failure mode ruled Route 2 [INFER] in design3d — it
would invent geometry with no provenance.

**The one thing worth a read (not a vendor):** its `skills/cad/SKILL.md` inspection + STEP export
path, *if* the client ever asks for a STEP hand-off of the reconstructed network. That is a
downstream export concern, not an extraction one. Record and move on.

## 2. meshflow — HARD STOP, and not a judgement call

CVPR 2026 mesh-generation paper (MeshVAE + flow-based diffusion). API said `NOASSERTION`; the
`LICENSE` file is the **FAIR Noncommercial Research License v1** — "Noncommercial Research Uses …
not primarily intended for commercial advantage." **NonCommercial disqualifies it for a client
deliverable**, exactly like ShapeR. Independently, it is artistic *mesh generation* — the [INFER]
route with no provenance. Two independent disqualifiers; do not vendor, adapt, or port.

## 3. kokraf — BSL 1.1, commercial-blocked until 2029

API said `NOASSERTION`; the `LICENSE` file is **Business Source License 1.1** © Jourverse:
"may not be used in a commercial application or service without purchasing a commercial licence
from kokraf.com." Change Date **2029-05-11**, after which it re-licenses to Apache-2.0. Additional
grant: free for non-commercial/educational/personal use only.

It is a collaborative **web 3D modelling application** (three.js, JS). For a client deliverable the
**code is blocked** for ~3 years. What is legal and useful: **observe the live app at kokraf.com**
for viewer-UX ideas (gizmos, scene tree, collaborative selection) that inform Track B — ideas are
not copyrightable, the code is. Do not copy code; do not vendor.

## 4. hyperframes — Apache-2.0, but not CAD

42.6k stars, HeyGen, "Write HTML. Render video. Built for agents." It renders HTML to video for
agent pipelines. Clean Apache-2.0, but it has **nothing to do with CAD extraction or viewing**.
The only conceivable future use is producing a walkthrough *video* of a finished deliverable —
adjacent tooling, not on the extraction/viewer path. Off-track for now.

## 5. The three.js agent-skills repos (mint, scottstts) — read, don't vendor

Both MIT. These are **agent instruction sets**, not libraries, so "vendoring" means reading them
for authoring guidance on Track B (the viewer), which @12 owns.

- **scottstts/Threejs-Awesome-Graphics-Agent-Skills** (749★, MIT clean) — graphics-quality skills
  for three.js scenes. Worth a read for Track B polish (lighting, material, post) — with the
  standing caveat from the CRITIQUE that a **cinematic post stack (bloom/grain/vignette) is wrong
  for a technical viewer**; only AO helps legibility. Read selectively.
- **mintdotgg/mint-threejs-skills** (109★, MIT) — guidance for building polished three.js apps,
  but it assumes the **Mint MCP** (a paid product). The dependency lowers priority; skim for
  patterns, don't adopt the MCP.

Route these to @12 as optional Track-B reading, not blocking input.

## 6. fable-method — MIT, but a workflow, not CAD

The Fable-5 workflow (think / act / prove) distilled into model-agnostic skills with an eval
harness. MIT, well-starred (2.2k). It is a **meta-methodology** — interesting for how we run
agents, irrelevant to CAD extraction or viewing. Off the critical path. If anyone wants to compare
its think/act/prove loop to our research-sdd + gate ladder, that is a process discussion, not a
pull.

## 7. strix and Wand-Enhancer — killed fast, not 3D/CAD

- **strix** (58k★, Apache-2.0) — an AI **penetration-testing** tool. Not 3D, not CAD. Kill.
- **Wand-Enhancer** (20k★, Apache-2.0, C#) — a UX extension for the **WeMod** game-mod app. Not 3D,
  not CAD. Kill.

Both are clean-licensed and irrelevant. Nothing to evaluate.

## 8. lingbot-map — 3D, but the wrong route

16.7k stars, Apache-2.0 (clean at `LICENSE.txt`). "A feed-forward 3D **foundation model** for
reconstructing scenes from streaming data." This *is* 3D — but it reconstructs geometry from
images/streams, the same **[INFER] photogrammetry class as ShapeR and modly**: it invents scale,
semantics and co-registration and carries no provenance. Our value proposition is measured
provenance from a vectorised plan. Wrong track. Skip — same reasoning as §1.3 of the wave-1 eval.

## 9. threejsassets.com — asset host, defer to point of use

A three.js asset source, not a repo. Licence is **per asset**, not one blanket licence. Under the
design3d external-mesh gate (SKILL Rule 8) we may only use CC0/CC-BY assets with provenance
recorded before first use. There is no reason to browse it speculatively — check a specific asset's
licence only when Track B has a concrete need for a mesh we cannot author procedurally.

---

## Licence verification log

| Repo | GitHub API | LICENSE file | Used |
|---|---|---|---|
| earthtojake/text-to-cad | `MIT` | MIT | MIT |
| facebookresearch/meshflow | **`NOASSERTION`** | **FAIR Noncommercial Research v1** | **NC — blocked** |
| sengchor/kokraf | **`NOASSERTION`** | **Business Source License 1.1** | **BSL — commercial-blocked till 2029-05-11** |
| heygen-com/hyperframes | `Apache-2.0` | Apache-2.0 | Apache-2.0 |
| mintdotgg/mint-threejs-skills | `MIT` | MIT | MIT |
| scottstts/Threejs-Awesome-Graphics-Agent-Skills | `MIT` | MIT | MIT |
| Sahir619/fable-method | `MIT` | MIT | MIT |
| usestrix/strix | `Apache-2.0` | Apache-2.0 | Apache-2.0 |
| k1tbyte/Wand-Enhancer | `Apache-2.0` | Apache-2.0 (`LICENSE.md`) | Apache-2.0 |
| Robbyant/lingbot-map | `Apache-2.0` | Apache-2.0 (`LICENSE.txt`) | Apache-2.0 |

The two `NOASSERTION` rows are again the whole argument for the rule: the API's answer was a
prompt to open the file, and the file said something the badge would have hidden — a Meta
NonCommercial licence and a Business Source Licence, both blocking for a commercial deliverable.
