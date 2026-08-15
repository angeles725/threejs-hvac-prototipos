# External 3D Assets — feasibility, license policy & structure

Status: **FEASIBLE with guardrails.** Authorized by the user 2026-08-15. This document is the
source of truth for (A) making every new design offline-first, (B) sourcing downloadable meshes
from the internet without breaking the project's provenance and offline contracts, and (C) the gate
that grades an external mesh (which is NOT the procedural ΔE00 gate).

Read this together with `catalog.yaml` (the anti-duplication manifest) and `HANDBOOK.md`.

---

## 0. Golden rule — reuse before you source, source before you build

Order of preference when a design needs an equipment mesh:

1. **Reuse from our own catalog first.** `catalog.yaml` already indexes 107 assets plus the
   nave-panccadia 18-asset reference vocabulary and ~50 top-level `disenos/` designs. The manifest
   exists precisely so "parallel sessions read this to claim work and avoid duplication." Never
   rebuild what a peer already built.
2. **Source an external mesh** only when (1) has no match and the geometry is not worth hand-modeling
   (highly detailed props, decorative context, filler equipment not under measurement).
3. **Build procedurally** (the datasheet-driven track) when the equipment is a measured subject that
   must trace to real dimensions and pass the ΔE00 gate — chillers, AHUs, compressors, the things a
   client will scrutinize. An AI-generated or hobbyist mesh cannot substitute for a measured subject.

---

## A. Offline-first is now the default

Every new design ships its own libraries. No design may depend on a CDN at run time.

**Adopt the proven pattern** already living in `disenos/datacenter-hotspot-sinCDN/`:

- Vendor three.js inside the design: `vendor/three/three.module.js` + `vendor/three/addons/…`.
- Local importmap (NOT a CDN URL):
  ```html
  <script type="importmap">
  { "imports": {
      "three": "./vendor/three/three.module.js",
      "three/addons/": "./vendor/three/addons/"
  } }
  </script>
  ```
- Keep `build-offline.mjs` + `verify-offline.mjs` from that folder as the reference. `verify-offline`
  must fail the build if ANY `http(s)://` reference to a CDN survives in the shipped HTML/JS.

Action item: fold this into `shell-template.html` so assets are born offline, and retrofit
`nave-3sistemas` (currently pinned to `unpkg.com/three@0.160.0`).

---

## B. External-mesh track

### B.1 License policy (hard gate)

| License | Redistribute offline? | Attribution | Verdict |
|---|---|---|---|
| **CC0 / Public Domain** | yes | none | ✅ preferred |
| **CC-BY** | yes | **mandatory** — keep author + source + license in the manifest AND surface in the viewer credits | ✅ allowed |
| CC-BY-SA | yes, but viral share-alike | mandatory | ⚠️ avoid (contaminates the repo license) |
| CC-*-NC (NonCommercial) | — | — | ❌ reject (client work is commercial) |
| Sketchfab "Standard" / royalty-free-non-redistributable | **no** | — | ❌ reject |
| Unknown / unstated | — | — | ❌ reject (no license = no use) |

A mesh with no explicit, verifiable license is treated as All Rights Reserved and rejected.

### B.2 Verified CC0-first sources

- **Khronos glTF Sample Assets** — github.com/KhronosGroup/glTF-Sample-Assets (per-model license declared).
- **Poly Haven** — polyhaven.com (CC0 models, HDRIs, PBR textures — also our env/lighting source).
- **Kenney** — kenney.nl (CC0 low-poly kits).
- **Quaternius** — quaternius.com (CC0).
- **ambientCG** — ambientcg.com (CC0 textures/HDRIs for materials).
- **Open Source 3D Assets** — opensource3dassets.com (CC0 GLB library).
- **awesome-cc0** — github.com/madjin/awesome-cc0 (curated CC0 index).
- **Meshy HVAC (CC0)** — meshy.ai (AI-generated; CC0 but fidelity UNVERIFIED — never use for a measured subject).
- **Sketchfab** — ONLY items explicitly marked CC0 or CC-BY and **Downloadable**; record the exact license per item.

### B.3 Folder structure

```
disenos/catalog/_external/<family>/<slug>/
    <slug>.glb            # NORMALIZED, self-contained (textures embedded), 1 unit = 1 m
    source.glb            # original download, byte-for-byte (keep for audit)
    LICENSE.txt           # full license text (CC0 deed or CC-BY deed)
    provenance.yaml       # see schema below
    preview.png           # render-on-demand capture for the catalog index
    viewer.html           # loads <slug>.glb via GLTFLoader from the local vendor/ (offline)
```

`_external/` is a sibling track to the procedural family folders, so it never gets confused with a
gate-scored procedural asset.

### B.4 `provenance.yaml` schema (mandatory, machine-checked)

```yaml
slug: air-handling-unit-generic
family: hvac
source_url: https://…                 # exact page the file came from
author: "Name / handle"                # required for CC-BY, recommended always
license: CC0                           # CC0 | CC-BY (nothing else passes)
downloaded: 2026-08-15
sha256_source: <hash of source.glb>    # proves the file is the one we vetted
original_scale: unknown                # as-downloaded units, if known
transforms_applied:                    # what normalization did
  - recenter-to-origin
  - scale-to-meters: 0.01              # factor applied to reach 1u=1m
  - embed-textures
  - prune-unused
real_world_size_m: { x: 2.1, y: 2.4, z: 1.8 }   # measured after normalization
fidelity: decorative                   # decorative | reference | NOT-measured  (never "certified")
notes: "AI-generated; not traceable to a datasheet. Do not present as a measured subject."
```

### B.5 Normalization pipeline (offline-safe)

Downloaded meshes are never shipped raw. Normalize with `gltf-transform` (npm, runs headless) or a
three.js headless step:

1. **Recenter** to origin, feet on `y=0`.
2. **Scale to meters** (`1 unit = 1 m`) — measure the bbox, derive the factor, record it.
3. **Embed textures** into the GLB (no external URI) so it loads offline.
4. **Prune** unused nodes/materials; optional Draco/meshopt compression for size.
5. **Verify self-contained**: zero external URIs remain.

### B.6 External-asset gate — `tools/verify-external-asset.mjs`

This gate is DIFFERENT from the procedural ΔE00 gate and we state the downgrade openly: an external
mesh is NOT graded against a datasheet. It checks integrity, license, scale sanity and offline-safety:

- `LICENSE.txt` present AND `provenance.license ∈ {CC0, CC-BY}`.
- `provenance.yaml` complete; `sha256_source` matches `source.glb` on disk.
- GLB loads without error and has ≥1 mesh.
- Zero external URIs (fully offline / self-contained).
- Bounding box within a sane real-world range for the family (scale-sanity, e.g. an AHU is 0.5–8 m,
  not 0.02 m and not 200 m).
- Render-on-demand capture is non-black (it actually renders).

A pass here means "legally shippable, offline, correctly scaled, renders" — it does **not** mean
"dimensionally certified." Any asset used near a measured subject is labeled `fidelity: decorative`
in the viewer HUD so a later reader never mistakes it for a `[CERT]` build.

---

## C. Catalog unification (the real gap)

Equipment is indexed in three disconnected places today:

1. `disenos/catalog/catalog.yaml` — 107 procedural assets across families.
2. `disenos/` top level — ~50 standalone designs (ahu, chiller, crac, ups, vav, torre-enfriamiento…).
3. `disenos/nave-panccadia/equipos/` — the proven 18-asset reference vocabulary + `catalogo.html`.

The deliverable is ONE browsable, offline index (`disenos/catalog/index.html`) that lists every
asset — procedural and external — with preview, family, track, license and provenance. This is what
prevents re-creating equipment: one place to look before building anything.

---

## D. Roadmap — design3d & research-sdd integration

Fold this capability into the existing skills instead of running it ad hoc:

- **design3d** gains a third track next to `procedural-direct` and `needs-research`:
  `external-mesh` → source (CC0-first) → normalize → external gate → register in `catalog.yaml`.
- **research-sdd** gains an **asset-sourcing step**: before modeling, search our catalog, then search
  CC0 sources; download SPECS for measured subjects and CANDIDATE MESHES for decorative ones, both
  preserved with provenance (the same discipline `fetch-doc.sh` already applies to datasheets).
- The math/kinematics logic research-sdd already carries stays authoritative for measured subjects;
  external meshes never enter a `[CERT]` claim.

---

## E. Field reconciliation — what to adopt from the "vibe-coding 3D" community, and what NOT to

A community thread on building cinematic three.js sites with AI was reviewed 2026-08-15. Its practical
advice, mapped onto our contracts:

### Adopt

- **Master dev-tuning UI + JSON export** (the strongest idea in the thread). Ship a hideable control
  panel (lil-gui) that exposes camera modes (first-person / iso / top / orbit / dev), light rigs,
  fog, FOV, and material params, plus a button that **exports the current settings as JSON**. You
  tune the shot live; the JSON becomes the committed preset. This is exactly the tool the
  nave-3sistemas lighting-camera pass needs — DC1–DC3 (skid fill, reframe to `(19.5,5.5,2.5)` fov 36,
  `luminaire-plan` preset) stop being guesses and become dials the user turns. Panel is **hidden
  behind a hotkey and ships disabled** (`?dev=1` or a key combo), never on by default.
- **Asset optimization**: convert textures to **WebP**, apply **Draco/meshopt** compression to static
  meshes. Already in §B.5 — do it with local `gltf-transform`, not an online tool, so it is offline
  and repeatable.
- **Prompt with real 3D vocabulary** ("z-fighting", "peter-panning shadows", "ACES clipping") instead
  of "it looks bad." Our gates and judges already speak this way — keep it.
- **Meshy / AI-generated meshes** as a CC0 source — already in §B.2, **decorative only**, never a
  measured subject.

### Do NOT adopt (conflicts with our contracts)

- **"Host your assets online and give the AI the URL."** This is the thread's default and it breaks
  our offline-first rule (§A). We do the **opposite**: vendor the GLB **locally** under
  `_external/<family>/<slug>/` and load it from `./` via a local `GLTFLoader`. Nothing loads from a
  remote URL at run time.
- **Pure vibe-coding ("looks good → ship")** for measured equipment. Fine for decorative/cinematic
  context; forbidden for a subject that must trace to a datasheet and pass the ΔE00 gate. The
  procedural vs external line in §0 is exactly this boundary.

### Cinematic-scene stack (for a scroll/parallax landing, if we build one)

- **3D**: three.js (our standard). Spline only for throwaway prototyping — its exports are heavy and
  less controllable than hand-authored scenes.
- **Scroll / camera timeline**: **GSAP + ScrollTrigger** for scroll-driven camera and object
  animation; **Lenis** for smooth scroll. Framer Motion is DOM-animation (React), not the tool for
  3D-camera choreography.
- All of the above are **vendored locally** (§A) — no CDN at run time.
