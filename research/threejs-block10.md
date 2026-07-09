# Block 10 — Migration and versioning: r128 → r160 → current

> Research of **the version axis**: the migration ledger relevant to this corpus, the concrete
> upgrade path for the r128 legacy file, CDN/loading strategies, and what an r160→current bump
> would touch. Consolidates version notes scattered in [Block 3] §3.5, [Block 4] §4.3,
> [Block 6] §6.2. Does NOT re-derive those — it cites them.
>
> Sources: context7 `/mrdoob/three.js` (Migration-Guide wiki entries 147→148, 149→150, 160→161,
> plus prior-block citations 146→147, 150→151, 151→152, 154→155, 162→163 — queried 2026-07-04)
> · local prototypes.
> Method: context7 migration-guide queries + prior-block consolidation + local verification.
> Markers: `[CERT]` local primary source (`file:line`) · `[CERT-web]` official web (URL + date)
> · `[CERT-a]` secondary source/forum (URL) · `[INFER]` deduction.
>
> Layer 4 (cross-cutting). Connects [Block 1] §1.2/§1.5, [Block 2] §2.4, [Block 6] §6.5.

---

## 10.1 — Where the corpus sits `[CERT]` / `[CERT-web]`

Corpus standard: **r0.160.0** via importmap ([Block 1] §1.2); official docs currently exemplify
**0.185.0** — ~25 releases ahead ([Block 1] §1.2). One straggler at **r128** UMD
(`voxel/data_center_voxel_isometrico_3d.html:59-60`). Notably, r160 is the **last release that
still shipped the deprecated UMD builds** (§10.2) — the corpus pin sits exactly at the end of
the script-tag era `[CERT-web]` + `[INFER]` (timeline juxtaposition; whether deliberate is
unknown).

## 10.2 — The migration ledger relevant to this corpus `[CERT-web]`

All from the official Migration-Guide wiki (queried 2026-07-04, this block and prior blocks):

| Release | Change | Corpus impact |
|---|---|---|
| r147 | `PointLight/SpotLight.decay` default → physically-correct `2` | LED accents' falloff ([Block 4] §4.3) |
| **r148** | "The `examples/js` directory was removed... Addons like GLTFLoader and OrbitControls are now exclusively available as ES6 modules in `examples/jsm`" | kills the legacy file's OrbitControls URL (§10.3) |
| r150 | "build files `build/three.js` and `build/three.min.js` are deprecated and will be removed in r160" (actual removal: r161) | script-tag era ends |
| r151 / r155 | physically-correct lighting default; `useLegacyLights` deprecated+false | light intensities ([Block 4] §4.3) |
| r152 | color management on by default; `outputEncoding`→`outputColorSpace` rename map | pipeline + old-snippet translation ([Block 6] §6.1-6.2) |
| **r161** | "build files `build/three.js` and `build/three.min.js` have been removed" | UMD gone for good |
| r163 | `Scene.environmentIntensity` added; `envMapIntensity` now material-envMap-only | IBL attenuation semantics change on upgrade ([Block 3] §3.5) |

## 10.3 — Upgrade recipe for the r128 legacy file `[CERT]` / `[INFER]`

`voxel/data_center_voxel_isometrico_3d.html` lags on four independent axes (each already
evidenced):

| Axis | Today (r128 file) | House target (r160 pattern) |
|---|---|---|
| Loading | UMD `<script>` cdnjs r128 + `examples/js` OrbitControls (`:59-60`) | importmap → `three.module.js` + `three/addons/` ([Block 1] §1.2); `examples/js` no longer exists past r148 (§10.2) |
| Voxel geometry | per-cube `Mesh` in nested loops (`:141-149`) | shared `BoxGeometry` + per-color `InstancedMesh` ([Block 2] §2.3) |
| Materials | `MeshLambertMaterial` (`:98`) | `MeshStandardMaterial` palette ([Block 3]) |
| Color/light | no tone mapping, no color settings ([Block 6] §6.5), pre-physical lights | ACES + sRGB output + physical lighting rig ([Block 4], [Block 6]) |

The migration is a rewrite onto the house template rather than an in-place patch — every
subsystem it touches changed contract between r128 and r160 `[INFER]` (sum of the ledger rows).

## 10.4 — Loading/CDN strategies observed and documented `[CERT]` / `[CERT-web]`

| Strategy | Where | Trade-off |
|---|---|---|
| Static importmap → unpkg | ~18 files ([Block 1] §1.2) | official pattern (docs use jsdelivr — interchangeable) `[CERT-web]`; network-dependent at load |
| JS-injected importmap | 2 files — explicit Cloudflare email-protection workaround (`split-system-realistic (2).html:53-57`) | immune to HTML-rewriting middleware `[CERT]` |
| esbuild pre-bundle (library inlined) | 2 giants ([Block 1] §1.2) | zero network dependency; ~1.3-1.4 MB files; no CDN version drift `[CERT]` |
| UMD script tags | legacy r128 file only | dead end — builds removed in r161 (§10.2) |

## 10.5 — What an r160 → current bump would touch `[CERT-web]` / `[INFER]`

From the ledger, the corpus-relevant re-checks are: (1) IBL attenuation — `envMapIntensity`
becomes material-only, `Scene.environmentIntensity` appears (r163); (2) tone-mapping menu grows
(`NeutralToneMapping` — [Block 6] §6.3); (3) `BatchedMesh` maturity for the realistic part zoo
(G15). Nothing in the corpus depends on removed-in-r161 UMD builds except the legacy file
(§10.3), so the r160→current jump for the 22 modern files is contract-stable on the axes this
corpus exercises `[INFER]` (ledger scan — not an exhaustive release audit; a real upgrade should
still walk the full Migration-Guide 160→target).

## 10.6 — Connections

- **[Block 1]** §1.2/§1.5 — version/loading census this block explains historically.
- **[Block 2]** §2.4, **[Block 3]** §3.5, **[Block 4]** §4.3, **[Block 6]** §6.2/§6.5 — the
  scattered version notes consolidated here.
- **G15 BatchedMesh** — availability check belongs to the upgrade re-check list (§10.5).
- **G14 synthesis** — the house template IS a versioned artifact; §10.3 shows its gravity.
