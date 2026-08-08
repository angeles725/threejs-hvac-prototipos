# Block 55 — Turf.js is geospatial, not planar-CAD: the offset/boolean libraries to use for DXF→mesh reconstruction

> DOCUMENT-mode capture (METHODOLOGY §20) of a finding produced this session, on the SAME "better
> Three.js **design tools / toolchain**" axis as [Block 52]/[Block 53]/[Block 54], and a direct sibling of
> the [Block 45]/[Block 47]/[Block 48] planar-geometry line. It answers "our CAD→3D pipeline (DXF via
> `ezdxf` → polygon extraction → earcut → Three.js, cross-ref [CAD→3D reconstruction memory]) needs planar
> polygon **offset** (inset/outset walls), **boolean** (holes / overlaps / courtyards), sliver/degenerate
> cleanup, and area/centroid — in **planar CAD metres**. Is Turf.js the right library?" **Verdict: no —
> Turf.js is a GEOSPATIAL library; for the two operations that matter (offset + area) it is wrong-by-design
> on Cartesian coordinates. Use it only as a pointer to the right Cartesian libs.**
>
> This block also records TWO corrections to the received framing, both verified from the primary repos
> this session (§4): (a) current Turf `union/difference/intersect` delegate to **`polyclip-ts`**, the
> maintained TypeScript successor of mfogel's `polygon-clipping` — not `polygon-clipping` directly; (b)
> **`jsts` is licensed `(EDL-1.0 OR EPL-1.0)`, NOT MIT** — a material distinction for a redistributed
> browser bundle.
>
> Sources (preserved before citing, all `sources/web-snapshots/`, fetched 2026-08-07): GitHub issue
> `github.com_Turfjs_turf_issues_1750.md` (the planar-distortion report) · Turf module READMEs
> `…turf-buffer_README.md.md`, `…turf-area_README.md.md`, `…turf-union_README.md.md`,
> `…turf-centroid_README.md.md` + the `turf-buffer`/`turf-union` `package.json` (dependency proof) ·
> the alternative-lib READMEs + `package.json` for `xaviergonz/js-angusj-clipper`, `mfogel/polygon-clipping`,
> `w8r/martinez`, `bjornharrtell/jsts`. Cross-refs: [Block 45] (offset = Minkowski + Clipper integer trick;
> already-preserved `angusj.com_clipper2_*` snapshots), [Block 47]/[Block 48] (earcut cap + robust
> predicates + snapping). Method: transcription + primary-repo confirmation of each claim (README text,
> `package.json` `license`/`dependencies`, the issue thread's measured number). Markers: `[CERT-web]`
> official repo/doc (URL+date 2026-08-07) · `[CERT-a]` GitHub issue thread / secondary · `[CERT]` local
> corpus / block cross-ref · `[INFER]` deduction.

---

## 1. Verdict: skip Turf.js as a geometry layer `[INFER]`

Turf.js is a well-built library — for **geospatial** work. Our pipeline is **planar CAD**: coordinates are
metres in a local Cartesian frame (a DXF world, typically georeferenced far from origin — cross-ref
[Block 48] `origin_shift`). For that domain, Turf's two headline geometry operations (buffer/offset and
area) are wrong-by-design (§2), and the operations that *are* planar-safe (§3) are things you can call
directly from the underlying engines without paying Turf's GeoJSON-wrapping tax. **Reference Turf only as a
map to the right Cartesian libraries** (§4).

## 2. The crux — Turf's coordinate system is (longitude, latitude) WGS84 `[CERT-web]`/`[CERT-a]`

Turf operates on **GeoJSON**, whose positions are `[longitude, latitude]` on the WGS84 datum. Two
consequences make offset and area silently wrong on planar metres:

- **`@turf/buffer` is geodesic, not planar.** Its `package.json` `dependencies` list `@turf/jsts`,
  `@turf/projection`, and `d3-geo` `[CERT-web]` (`turf-buffer_package.json.md`) — i.e. it **projects** the
  input, runs the JSTS offset in the projected plane, and **reprojects** back to WGS84 for geodesic
  accuracy. Its `units` option defaults to `"kilometers"` and it is parameterized by a geographic `radius`
  `[CERT-web]` (`turf-buffer_README.md.md`). Feed it CAD metres treated as degrees and the projection
  round-trip distorts the result.
- **`@turf/area` is spherical.** The README is explicit: "Calculates the **geodesic** area in square meters
  of one or more polygons" `[CERT-web]` (`turf-area_README.md.md`) — it integrates on the Earth sphere
  (Haversine-family, Earth radius ~6.37×10⁶ m), not the plane.

The failure is demonstrated in **Turf issue #1750**, whose reporter works in "a planar world with no
curvature (and no projection). All map units are in metres, not degrees" and finds that Turf treats them as
degrees: *"a point at `[0, 0]` and a point at `[100, 0]` are **99.88 degrees** away"* — not 100 m
`[CERT-a]` (`issues_1750.md`). There is **no documented planar/Cartesian mode** for buffer or area. So on
CAD coordinates, **`buffer` and `area` are wrong-by-design.**

## 3. What IS planar-safe inside Turf (and why you still wouldn't) `[CERT-web]`

Not all of Turf is geodesic — the parts backed by a Cartesian clipping engine or by raw-coordinate
arithmetic are numerically fine on planar metres:

- **`@turf/union` / `difference` / `intersect`** delegate to a **Cartesian polygon-clipping engine** — its
  `package.json` depends on **`polyclip-ts`** (^0.16.8) `[CERT-web]` (`turf-union_package.json.md`), the
  maintained TypeScript fork of mfogel's `polygon-clipping`; no reprojection, so these are coordinate-safe.
- **`@turf/simplify`** (Ramer–Douglas–Peucker on raw coords), **`@turf/clean-coords`**, **`@turf/kinks`**
  (self-intersection via segment tests) are coordinate-agnostic `[INFER]` (cross-ref [Block 47]).
- **`@turf/centroid`** "computes the centroid as the **mean of all vertices**" `[CERT-web]`
  (`turf-centroid_README.md.md`) — numerically planar-safe, but note it is a **vertex mean, NOT the
  area-weighted centroid** (dense-vertex regions pull it). For a true area centroid use the shoelace
  moment formula (§4).

These are usable — but you'd wrap every polygon into a GeoJSON `Feature` to call an algorithm you can invoke
directly on rings from the engine itself. **The wrapping tax buys nothing** for a non-geographic pipeline
`[INFER]`.

## 4. The right tools for planar CAD `[CERT-web]`

- **OFFSET (inset/outset walls):** **`js-angusj-clipper`** — "a port of Angus Johnson's Clipper to
  WebAssembly/Asm.js", doing "polygon clipping (boolean operations) and offsetting **fast** … with a
  fallback to Asm.js" `[CERT-web]` (`js-angusj-clipper` README). It exposes `ClipperOffset` with join types
  plus all four booleans on Cartesian coordinates. **Caveat (the classic Clipper trap, cross-ref [Block 45]/
  [Block 48]):** Clipper works in **integer coordinates** for robustness — scale your metres in by a fixed
  factor (e.g. ×10⁴) before, and out after. License: package is **MIT**; the underlying Clipper library is
  **Boost** `[CERT-web]` (`js-angusj-clipper_package.json.md` → `"license":"MIT"`). (The pure-JS
  `clipper-lib` port is the no-WASM alternative.)
- **BOOLEAN (holes / overlaps / courtyards):** **`polygon-clipping`** (mfogel) — `intersection`, `union`,
  `difference`, `xor` on plain coordinate arrays, **MIT** `[CERT-web]` (`polygon-clipping` README +
  `package.json` `"license":"MIT"`); this is what Turf's booleans wrap (now via its `polyclip-ts` fork), so
  call it directly. Or **`martinez-polygon-clipping`** (Martinez–Rueda), markedly faster on pathological
  input — its own README benchmark: `Hole_Hole` **Martinez ≈ 29,530 ops/sec vs JSTS ≈ 2,051 ops/sec**
  `[CERT-web]` (`martinez` README), **MIT** (`package.json`).
- **ONE-LIB option:** **`jsts`** (the engine inside `@turf/buffer`) used directly — "a JavaScript library
  of spatial predicates and functions … a port of the … Java library JTS" `[CERT-web]` (`jsts` README) —
  gives `BufferOp` (offset ±), booleans, and validation on **float** Cartesian coordinates in one package;
  slower than Clipper. **License correction: `jsts` is `(EDL-1.0 OR EPL-1.0)`** `[CERT-web]`
  (`jsts_package.json.md`) — Eclipse licensing, **NOT MIT** — which matters for a redistributed bundle.
- **area / centroid:** keep a hand-rolled **shoelace** area and area-weighted centroid — no library needed,
  exact on planar coords `[INFER]` (cross-ref [Block 48]).

## 5. Licenses (verified this session) `[CERT-web]`

| lib | license | source |
|---|---|---|
| Turf (`@turf/*`) | MIT | Turfjs project `[CERT-a]` |
| `js-angusj-clipper` | MIT (wrapper); Clipper core = Boost | `package.json` `[CERT-web]` |
| `polygon-clipping` (mfogel) / `polyclip-ts` | MIT | `package.json` `[CERT-web]` |
| `martinez-polygon-clipping` | MIT | `package.json` `[CERT-web]` |
| **`jsts`** | **`(EDL-1.0 OR EPL-1.0)`** — NOT MIT | `package.json` `[CERT-web]` |

All are pure-JS or WASM and browser-friendly. Only `jsts`'s Eclipse dual-license needs a compliance note if
bundled `[INFER]`.

## 6. Integration cost + recommendation `[INFER]`

The adapter is thin: a **scale-in/scale-out** wrapper for Clipper's integer coordinates (cross-ref
[Block 45]/[Block 48] snapping — do the integer snap *before* any boolean anyway, for robustness) plus a
GeoJSON↔ring converter only if you keep any Turf calls. Modest work. The payoff is avoiding the geodesic
distortion (§2) that makes Turf `buffer`/`area` silently wrong on CAD metres. **Recommendation for the
DXF→mesh tool:** offset with `js-angusj-clipper` (integer-scaled), boolean with `polygon-clipping` (or
`martinez` when profiling shows clipping is the bottleneck), triangulate the resulting rings with earcut
(the cap step already in the pipeline, [Block 47]), and compute area/centroid by shoelace. Reserve `jsts`
for the one-dependency convenience case, minding its Eclipse license. Do **not** adopt Turf.js as the
geometry layer. **BUT first read §7 — for the pipeline that exists today, adopt NEITHER: the offset/boolean
already runs in Python on GEOS.**

## 7. Applicability check — the pipeline that exists is Python + GEOS, so this §4 JS recommendation does NOT apply to it `[CERT]`

The whole block (and the "which JS clipper lib?" question that seeded it) silently assumed the offset/boolean
runs in **JavaScript**. Scoping the real code (2026-08-07) shows it does not: the DXF→mesh reconstruction is
`investigacion/nave-panccadia/tools/build-viewer.py` — **Python**, and it already depends on and deeply uses
**`shapely`** (the Python binding to **GEOS**, the reference planar-geometry engine, more mature than Clipper
for exactly these ops):

- **boolean union of walls** — `unary_union(rects)` `[CERT]` (`build-viewer.py:702`)
- **boolean difference (subtract openings/cuts)** — `u.difference(unary_union(cuts[low]))` `[CERT]` (`:706`)
- **offset / validity buffer** — `.buffer(...)` `[CERT]` (`:442`, `:495`, `:1035`)
- **polygons WITH holes** — `Polygon(rings[0], rings[1:])` `[CERT]` (`:492`, `:733`)
- **intersection (nesting test)** — `p.intersection(q).area` `[CERT]` (`:1079`); plus `STRtree` + `orient`.

The dependency is deliberate, not incidental: *"shapely is in this .venv and ezdxf … imported at the top
rather than behind a try/except: a build that quietly fell back to per-wall boxes would look almost right and
be wrong at every junction"* `[CERT]` (`build-viewer.py:57-63`). The one hand-rolled offset (`inset_polygon`,
a 20 mm `SLAB_INSET` bisector) is a documented micro-choice for a single simple slab, **not** a missing
capability `[CERT]` (`:96-127`).

**Consequence:** for the current architecture, adopt no clipper library. GEOS already covers offset + boolean
+ holes + intersection, and the Three.js viewers only *consume* the precomputed JSON (no runtime geometry).
The §4 JS libraries (`js-angusj-clipper`, `polygon-clipping`, `martinez`) become relevant ONLY if offset/
boolean ever moves to **browser runtime** (interactive re-cutting in the viewer), which the precompute-to-JSON
architecture avoids by design `[INFER]`. If a Python-side need ever exceeds GEOS (it is hard to), the peer is
`pyclipper` (Clipper for Python), not a JS port. **Net: block stands as a JS-context reference; the live
pipeline needs nothing from it.**
