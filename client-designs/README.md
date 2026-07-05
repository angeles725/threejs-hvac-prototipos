# Client-project 3D designs (reference copies)

3D design sources rescued from INTEGRATION projects so the design studio (this repo)
has them at hand. Copied 2026-07-04; these are snapshots, not live mirrors.

| Here | Origin | What it is |
|---|---|---|
| tridium-datacenter/three-renderer.js | cliente/Tridium/datacenter-c3ntro/js/utils/ | datacenter 3D scene builder (racks, floor), 139 THREE refs |
| tridium-datacenter/racks-large.js, locations.js | .../js/data/ | scene layout data the renderer consumes |
| honeywell-mx60/UpDetail.js | cliente/Honeywell/MEXICO/.../mx60/js/app/ | largest client 3D design (192 KB, 147 THREE refs) |
| honeywell-mx60/CarcamoDetail.js | same | cárcamo 3D detail view (sibling of corpus carcamo-agua-3d) |
| honeywell-mx60/SharedEnv.js | same | shared scene-environment module — evidence of per-client template reinvention (G33 case) |

Not copied: Alser cuarto-3d.html (byte-identical to the corpus copy), dashboards/charts/routing
(integration-side, out of this project's scope), vendored three.js libs, obfuscated publish builds.

Project split (owner decision, 2026-07-04): THIS repo creates 3D designs; client projects
integrate them into dashboards. These copies inform the design library (G33) — the goal is that
future client projects consume designs exported from here instead of hand-rolling scene modules.
