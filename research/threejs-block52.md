# Block 52 — Procedural placement for Three.js scenes: Poisson-disk / blue-noise (Bridson 2007), Wave Function Collapse (constraint solving, not quantum), and L-systems — and how each feeds `InstancedMesh`

> Closes G66, the LAST read-only-investigable gap of RUN 9 (axis: procedural/algorithmic methods
> for better Three.js **design tools**). It answers "how do you scatter vegetation/props/instances and
> generate tile/building/maze layouts so they look NATURAL, not hand-placed and not clustered?" with the
> three canonical algorithm families and their maintained JS libraries: (1) **Poisson-disk / blue-noise
> sampling** — the minimum-distance property, Bridson's O(N) 2007 algorithm, and why blue noise beats both
> uniform-random (clusters) and a rigid grid (too regular); (2) **Wave Function Collapse** (Gumin 2016) —
> honestly framed as constraint propagation over a grid (Shannon-entropy cell selection + AC-style
> propagation), NOT quantum mechanics, with its contradiction/restart cost; (3) **L-systems** (Lindenmayer)
> — the rewriting grammar `G=(V,ω,P)` + turtle interpretation for trees/plants. It grounds all three in the
> corpus's OWN placement code: the living-environment hotel scatters its bushes/grass by **uniform random in
> a rectangle** (the exact clustering failure Bridson names) and hand-places its palms in a literal array —
> both `[CERT]` file:line. It ties the output to [Block 2]'s `InstancedMesh` (the sampler decides the
> per-instance matrix) and is HONEST that Three.js core ships **none** of these algorithms — it ships only
> `MeshSurfaceSampler` (area-uniform surface scatter, verified in source), while Poisson/WFC/L-systems are
> external libraries or your own code that FEED `InstancedMesh`.
>
> Subject version: three.js `dev` branch — `examples/jsm/math/MeshSurfaceSampler.js` (retrieved 2026-08-07) ·
> R. Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions", ACM SIGGRAPH 2007 sketches ·
> M. Gumin, WaveFunctionCollapse (github mxgmn, 2016) · A. Lindenmayer, *The Algorithmic Beauty of Plants*
> (Prusinkiewicz & Lindenmayer 1990) via the Wikipedia L-system article · npm libs
> `poisson-disk-sampling` / `fast-2d-poisson-disk-sampling` / `wavefunctioncollapse` / `lindenmayer`
> (all MIT) · local prototype `hotel-realista-ensamblado.html` @ commit 55240ca (the living-environment scatter).
>
> Sources (full basenames, preserved in `sources/web-snapshots/` with sha256 in SOURCES.md):
> `bridson_siggraph07_poissondisk_2026-08-07.pdf` ·
> `github_kchapelier_poisson-disk-sampling_README_2026-08-07.md` ·
> `github_kchapelier_fast-2d-poisson-disk-sampling_README_2026-08-07.md` ·
> `github_mxgmn_WaveFunctionCollapse_README_2026-08-07.md` ·
> `github_kchapelier_wavefunctioncollapse_README_2026-08-07.md` ·
> `github_mrdoob_threejs_MeshSurfaceSampler_2026-08-07.js` ·
> `github_nylki_lindenmayer_README_2026-08-07.md` ·
> `en.wikipedia.org_L-system_2026-08-07.md` ·
> `hotel-realista-ensamblado.html` (local, `file:line`).
> Method: WebFetch/curl over the authoritative sources (Bridson's own SIGGRAPH sketch PDF, Gumin's
> reference README, the Wikipedia L-system article, the three.js source, the npm READMEs), preserved to
> `sources/` (sha256-registered) BEFORE citing; `pdftotext` extraction of the Bridson sketch; local reading
> of the build/scene prototype. Markers (METHODOLOGY §3): `[CERT]` local `file:line` · `[CERT-doc]` official
> document (Bridson PDF, cited by §) · `[CERT-web]` authoritative web (URL+date, snapshot, cited by line) ·
> `[CERT-a]` secondary · `[INFER]` deduction. Block type: **DESIGN/APPLIED synthesis** (a theory survey +
> library evaluation + build/scene-tool rule) — a high `[INFER]/[CERT]` ratio is EXPECTED here and is NOT an
> exhaustion signal.

---

## 52.1 — The problem in the corpus: current placement is either hand-typed or uniform-random-in-a-rectangle (which clusters) `[CERT]`

The living-environment scene ([Block 41]) places all its vegetation with two techniques, both of which the
rest of this block improves on:

**(a) Hand-placed — a literal coordinate array.** The 14 palms are a typed `PALM_POS` list:

```
const PALM_POS = [
  [-8, 5], [-14, 20], [-20, -5], [2, 45], [-4, 30], [-18, 42],
  [70, 10], [80, -2], [90, 25], [68, 40], [100, 15], [76, 50],
  [30, 44], [48, 42]
];
```
`[CERT]` `hotel-realista-ensamblado.html:871-875`. Hand placement is fine for 14 hero objects but does not
scale to hundreds of props and is not reproducible/parametrisable.

**(b) Uniform random inside a rectangle — the clustering failure by name.** The 36 bushes (and 40 grass
tufts identically) are placed by drawing `x,z` uniformly inside a zone rectangle with a deterministic LCG:

```
let _seed = 20240706;
const _rnd = () => { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };  // :822-824
…
for (let i = 0; i < BUSH_N; i++) {                       // BUSH_N = 36
  const zn = BUSH_ZONES[i % 3];
  const x = zn.x0 + _rnd() * (zn.x1 - zn.x0);            // uniform in x
  const z = zn.z0 + _rnd() * (zn.z1 - zn.z0);            // uniform in z
  _setInst(bushIM, i, x, z, _rnd() * Math.PI * 2, 0.7 + _rnd() * 0.7);
}
```
`[CERT]` `hotel-realista-ensamblado.html:822-824,901-905`. The constants `1103515245`/`12345` are the
ANSI-C/glibc `rand()` LCG — a **uniform (white-noise) generator** `[INFER]` (recognised constants). There
is **no minimum-distance test**: two bushes can land 5 cm apart or leave a bare patch, purely by draw. That
is exactly the artefact the next section's algorithm removes — Bridson's sketch opens by naming "uniform
random distributions (despite undesirable clustering)" as the thing practitioners fall back to `[CERT-doc]`
`bridson_siggraph07_poissondisk_2026-08-07.pdf §1`.

## 52.2 — Poisson-disk / blue noise: the minimum-distance property and Bridson's O(N) algorithm `[CERT-doc]`

**The property.** A Poisson-disk (blue-noise) set is a random point set in which **every pair of samples is
at least a user distance `r` apart**: Bridson defines it as "Poisson disk distributions, where all samples
are at least distance `r` apart for some user-supplied density parameter `r`" `[CERT-doc]`
`bridson_siggraph07_poissondisk_2026-08-07.pdf §1`. "Blue noise" is the spectral name for the same thing —
the point set's periodogram has little low-frequency energy, so there are no clusters and no large holes; it
looks *evenly scattered but not gridded*. `[INFER]` (spectral reading of the "blue noise" term the paper
uses in its title/abstract `[CERT-doc]` §Abstract).

**Why it beats the two easy alternatives.** Bridson states both failure modes directly: practitioners "use
either uniform random distributions (despite undesirable clustering), jittered/stratified sampling (which
reduces but doesn't eliminate clustering), or more structured distributions which induce anisotropy"
`[CERT-doc]` §1. So uniform random clusters (§52.1's bushes), a jittered grid still clusters at cell seams,
and a pure grid looks artificial (anisotropic, aliased). Blue noise is the middle path: organic yet
never-overlapping.

**Bridson's algorithm (the O(N) dart-throwing fix), verbatim structure `[CERT-doc]` §2:**

| Step | What it does |
|---|---|
| Input | domain extent in ℝⁿ, minimum distance `r`, and a constant `k` = candidates per active sample, "typically k = 30" |
| **Step 0** | a background **grid** with cell size **bounded by `r/√n`** — chosen so "each grid cell will contain at most one sample", so the grid is a plain integer array (−1 = empty, else the sample index) |
| **Step 1** | pick `x₀` uniformly in the domain, insert it, seed the **active list** with it |
| **Step 2** | while the active list is non-empty: pick a random active sample `xᵢ`; generate up to `k` candidates uniformly in the **spherical annulus between `r` and `2r`** around `xᵢ`; for each, use the grid to test only nearby cells; emit the first candidate that is ≥ `r` from all existing samples and push it active; if none of the `k` works, remove `xᵢ` from the active list |

`[CERT-doc]` `bridson_siggraph07_poissondisk_2026-08-07.pdf §2`. The **grid cell test** is the whole speed
trick: because a cell of side `r/√n` holds at most one point, a candidate only needs to be checked against
the O(1) cells within radius `r` (a fixed neighbourhood in `n` dimensions), never against all N samples.
`[INFER]` (grounded in the §2 "using the background grid to only test nearby samples" `[CERT-doc]`).

**Complexity.** "Step 2 is executed exactly `2N−1` times to produce `N` samples… Each iteration of step 2
takes O(k) time, and since k is held constant… the algorithm is linear" — **O(N)** `[CERT-doc]`
`bridson_siggraph07_poissondisk_2026-08-07.pdf §3`. Each of the `2N−1` visits either emits a sample (adds to
active) or retires one (removes from active), so the active list is touched a linear number of times.

**Cell-size equation and the neighbour test, restated for implementation `[INFER]` (from §2):**
- cell size `c = r / √n` (2D: `c = r/√2 ≈ 0.707 r`); grid index of point `p` is `floor(p / c)`.
- candidate `q` is accepted iff `‖q − s‖ ≥ r` for every existing sample `s` in the (±2 in each axis)
  neighbourhood of `q`'s cell; the annulus `r ≤ ‖q − xᵢ‖ < 2r` guarantees `q` is neither too close to `xᵢ`
  nor so far it leaves a gap.

**Maintained JS libraries `[CERT-web]`:**

| Library | Scope | Key facts | Licence |
|---|---|---|---|
| **poisson-disk-sampling** (kchapelier) | "arbitrary dimensions" (1D/2D/3D+) | options `minDistance` (required), `maxDistance` (default `2×minDistance`), **`tries` default 30** (= Bridson's `k`); supports a custom **density function** to drive variable-density distributions `[CERT-web]` `github_kchapelier_poisson-disk-sampling_README_2026-08-07.md:29-32,85-88` | MIT `:342-344` |
| **fast-2d-poisson-disk-sampling** (kchapelier) | 2D only, faster | "Fast 2D Poisson Disk Sampling **based on a modified Bridson algorithm**"; `radius`/`minDistance`, `tries` default 30; API-compatible with the sibling above `[CERT-web]` `github_kchapelier_fast-2d-poisson-disk-sampling_README_2026-08-07.md:5,55-63` | MIT |

The `tries: 30` default in both libraries is literally Bridson's `k = 30` `[CERT-doc]` §2 ↔ `[CERT-web]`
`:88` / `:60`. HONEST maintenance note: both repos still show **Travis-CI** badges (Travis dropped free OSS
CI ~2021), so they are **stable/complete rather than actively developed** — but they are on npm under MIT
and the main one is used in production tools such as redblobgames' `mapgen4` `[CERT-web]`
`github_kchapelier_poisson-disk-sampling_README_2026-08-07.md:218`. For this corpus that is fine: the
algorithm is fixed since 2007 and the code is small.

## 52.3 — Wave Function Collapse: constraint solving over a grid, NOT quantum physics `[CERT-web]`

WFC (Maxim Gumin, 2016) generates a large output (tilemap, bitmap, voxel volume) that is **locally similar**
to a small input example, by constraint propagation. The name is a physics metaphor and Gumin says so
outright — **it is not quantum mechanics**:

> "The coefficients in these superpositions are real numbers, not complex numbers, so **it doesn't do the
> actual quantum mechanics, but it was inspired by QM.**" `[CERT-web]`
> `github_mxgmn_WaveFunctionCollapse_README_2026-08-07.md:14`.

**The mechanism — an observation/propagation loop `[CERT-web]`:**

1. Initialise every output cell in a **fully unobserved (superposed)** state: all patterns/tiles are still
   possible (all boolean coefficients true) `:14,71`.
2. **Observation:** choose the unobserved cell "which has the **lowest Shannon entropy**" and collapse it to
   a single definite pattern, weighted by the pattern frequencies in the input `:16,74`.
3. **Propagation:** propagate the consequences of that collapse to neighbours, eliminating now-impossible
   patterns; repeat until nothing changes `:17,76`.
4. Loop observe→propagate until every cell is observed (done) — "in the end we have a completely observed
   state, the wave function has collapsed" `:19`.

**Two models `[CERT-web]`:**
- **Overlapping model** — learns which `N×N` pixel/tile patterns co-occur in the input and enforces that
  patterns overlap consistently; "By varying N, we can make the output look more like the input or less"
  `:142`. It "relates to the simple tiled model the same way higher order Markov chains relate to order one
  Markov chains" `:132`.
- **Simple tiled model** — you supply tiles + an **adjacency table**; "The propagation phase in this model
  is just **adjacency constraint propagation**" `:80`, shortened by a tile **symmetry system** (`X`/`T`/`L`/
  `I`/`\` D4 classes) so you enumerate adjacent pairs only up to symmetry `:87,91`.

**It is a constraint solver (AC-family), and honest about cost `[CERT-web]`.** Gumin credits Merrell's Model
Synthesis (which used **AC-3**) and states WFC itself "translates a texture synthesis problem into a
constraint satisfaction problem. Currently it uses the **AC-4 algorithm** by Roger Mohr and Thomas C.
Henderson, 1986" `:143` — so the propagation is arc-consistency (AC-4 here, AC-3 in the Merrell ancestor),
not bespoke magic. (The task brief said "AC-3"; the reference implementation says **AC-4** — corrected here
against the primary.) The failure mode is explicit: "It may happen that during propagation all the
coefficients for a certain pixel become **zero**. That means that the algorithm has run into a
**contradiction** and can not continue… The problem… is **NP-hard**, so it's impossible to create a fast
solution that always finishes. In practice, however, the algorithm runs into contradictions surprisingly
rarely" `:21`. So a real WFC pipeline must **detect a contradiction and restart/backtrack** — there is no
guarantee of success in one pass.

**Maintained JS library `[CERT-web]`:** **wavefunctioncollapse** (kchapelier's port of Gumin's reference) —
`new OverlappingModel(data, w, h, N, outW, outH, periodicInput, periodicOutput, symmetry[, ground])` and
`new SimpleTiledModel(data, subsetName, w, h, periodicOutput)`; **`model.iterate(iterations[, rng])`**
"Stop[s] when the generation is successful or reaches a contradiction. **Returns whether the iterations ran
without reaching a contradiction**" `[CERT-web]` `github_kchapelier_wavefunctioncollapse_README_2026-08-07.md:21,63,111-119`;
**MIT** `:147-149`. The boolean return is exactly the contradiction handling §above requires — you loop
`while(!model.iterate(n)) model.clear()`. `[INFER]` (from the documented return contract).

## 52.4 — L-systems: a rewriting grammar + turtle interpretation for plants/trees `[CERT-web]`

An L-system (Lindenmayer) is a **parallel string-rewriting grammar**, formally a tuple:

> **G = (V, ω, P)**, where **V** is the alphabet (variables that can be replaced + constants/terminals that
> cannot), **ω** is the **axiom** (start string), and **P** is the set of **production rules** (predecessor →
> successor). Any symbol with no rule is an implicit identity production `A → A`. `[CERT-web]`
> `en.wikipedia.org_L-system_2026-08-07.md:73-90`.

The defining feature versus an ordinary formal grammar is **parallelism**: "As many rules as possible are
applied **simultaneously**, per iteration" `:92-94` — every symbol is rewritten at once each step, which is
what models the simultaneous division of all cells of a growing organism (Lindenmayer's biological origin
`:32`). The **rewriting equation** for one derivation step is thus: `sₙ₊₁ = h(sₙ)`, where the homomorphism
`h` replaces every symbol of `sₙ` by its successor from `P` in parallel; the string grows (often
exponentially) with `n`. `[INFER]` (formalising the "as many rules as possible… simultaneously" text
`[CERT-web]` `:92-94`).

**Interpretation via turtle graphics `[CERT-web]`.** The generated string is drawn by assigning each symbol
a turtle command; the canonical branching alphabet (Wikipedia's worked example + ABOP) is:
- `F` (and `0`/`1`) — move forward drawing a line segment `:226-228`;
- `+` / `−` — turn left / right by a fixed **angle** δ (the example uses 45°) `:229-230`;
- `[` — **push** the current position+heading onto a LIFO stack (and, in the example, turn) `:229,232-237`;
- `]` — **pop** the most recently saved position+heading `:230,232-237`.
The `[`/`]` bracket pair is what makes **branching** structures (trees, plants) possible: descend into a
branch, then return to the fork `[CERT-web]` `:229-237`.

**Three variants `[CERT-web]` `:115-126`:** **deterministic** (exactly one production per symbol),
**stochastic** (a production chosen at random from several during each iteration → natural variation between
plants), **context-sensitive** (a rule fires only in a given left/right neighbour context, written `A<B>C`)
vs **context-free**; and **parametric** L-systems, where symbols carry numeric parameters `:70,115-126`.

**Maintained JS library `[CERT-web]`:** **lindenmayer** (nylki) — MIT; `new LSystem({axiom, productions})`,
`.iterate(n)`, `.setProduction('B', …)`; supports **stochastic** productions, **context-sensitive** classic
syntax `A<B>C`, **parametric**, and even **anonymous-function productions** (JS functions as successors, more
flexible than classic string rules); it "can also parse to some extent classic L-System syntax as defined in
Aristid Lindenmayer's original work *Algorithmic Beauty of Plants* from 1990" `[CERT-web]`
`github_nylki_lindenmayer_README_2026-08-07.md:3-5,63-102`. It produces the STRING; you still write the
turtle interpreter that turns symbols into `THREE.Vector3` segments / cylinders. `[INFER]` (the lib is
string-only; rendering is the caller's — no renderer in its API surface).

## 52.5 — How placement materialises in Three.js: the sampler decides, `InstancedMesh` draws — and what three.js does/doesn't ship `[CERT]`

None of the three algorithm families is a renderer. Each produces **transforms** (2D/3D points, a tilemap of
cell→tile ids, or a branch skeleton); Three.js turns those into geometry, and for many small repeated objects
the right sink is **`InstancedMesh`** ([Block 2]): one draw call, a per-instance `Matrix4` set with
`setMatrixAt(i, m)`. The sampler's job is to fill those matrices — position from the point set, plus
random yaw/scale for variety (exactly the `_setInst(im, i, x, z, ry, s)` pattern the corpus already uses,
`[CERT]` `hotel-realista-ensamblado.html:828-834`). `[INFER]` + `[CERT]`.

**What three.js core actually ships for placement — `MeshSurfaceSampler` (and its honest limit).** The one
scattering utility in the tree is `examples/jsm/math/MeshSurfaceSampler.js`: "Utility class for sampling
**weighted random points on the surface of a mesh**" `[CERT-web]`
`github_mrdoob_threejs_MeshSurfaceSampler_2026-08-07.js:12`. Build is `O(n)`, each sample `O(log n)` (a
binary search over a cumulative-area table), memory `O(n)` `:14-15`. Crucially it is **area-uniform, not
blue-noise**: "If no weight attribute is selected, sampling is **randomly distributed by area**" `:74`, and
`setWeightAttribute('color')` biases toward higher-weighted faces `:70-77` — but there is **no
minimum-distance guarantee**, so it exhibits the same clustering §52.1/§52.2 describe. Its own doc example
feeds an `InstancedMesh` directly: `const mesh = new THREE.InstancedMesh(sampleGeometry, sampleMaterial,
100); … sampler.sample(position); …` `:22-35`. So MeshSurfaceSampler answers "scatter ON a surface (a
terrain, a wall)"; it does NOT answer "scatter WITHOUT clustering" — for that you post-filter with a
min-distance test or use Poisson-disk. `[CERT-web]` + `[INFER]`.

**The honest boundary:** three.js ships `MeshSurfaceSampler` (area-uniform surface scatter) and nothing else
for procedural placement — **no Poisson-disk, no WFC, no L-system** in core or examples. Those are external
MIT libraries (§52.2–52.4) or your own code whose output you push into `InstancedMesh`. `[INFER]` (absence
scoped to core + `examples/jsm`; the placement addon present is MeshSurfaceSampler `[CERT-web]`).

## 52.6 — Decision rule: which algorithm for which design-tool job `[INFER]`

A single actionable rule, grounded in the properties above:

| You are placing / generating | Use | Because |
|---|---|---|
| **Scattered vegetation, props, rocks, crowd instances** on a ground plane or region — must look natural, no overlaps | **Poisson-disk** (`poisson-disk-sampling` / `fast-2d-…`) → fill `InstancedMesh` matrices | minimum-distance `r` gives blue-noise: organic but never clustered (§52.2); replaces the corpus's uniform-random bushes/grass §52.1 |
| **Scatter on an irregular surface** (terrain relief, a mesh wall) | **`MeshSurfaceSampler`** (three.js), optionally + a min-distance reject pass | it samples the actual triangulated surface by area (§52.5); add Poisson-style rejection if clustering shows |
| **Tile/room/building/maze layouts from adjacency rules or an example** (floor plans, modular kits, dungeon/street grids) | **WFC** (`wavefunctioncollapse`) — simple-tiled for hand-authored adjacencies, overlapping for learn-from-example | it is adjacency constraint solving over a grid (§52.3); budget for occasional contradiction→restart |
| **Trees, plants, branching pipes/ducts, recursive/organic structure** | **L-system** (`lindenmayer`) + a turtle interpreter → cylinders/`TubeGeometry` | a rewriting grammar with `[`/`]` branching is the natural model for self-similar growth (§52.4); stochastic productions give per-plant variation |
| **≤ ~15 hero objects, art-directed exact positions** | **hand-placed array** (what the corpus does for palms) | procedural generation is not worth it below a threshold; keep authorial control (§52.1) |

**One-line heuristic:** *dispersed natural scatter → Poisson-disk into `InstancedMesh`; on-surface scatter →
`MeshSurfaceSampler`; rule/example-driven tile & building layouts → WFC; branching plants/pipes → L-systems;
a handful of hero props → just type the array.* `[INFER]`

## 52.7 — Connections

- **[Block 2]** (InstancedMesh) — the universal SINK for all three families: the sampler/grammar decides the
  per-instance `Matrix4`, `InstancedMesh.setMatrixAt` draws thousands in one call. §52.5 is the placement
  half of B2's rendering half.
- **[Block 41] / [Block 31]** (living-environment + terrain) — §52.1's hand-placed palms and
  uniform-random bushes/grass are the CONCRETE code this block improves: Poisson-disk removes the clustering,
  `MeshSurfaceSampler` would let the scatter follow B31's displaced terrain instead of a flat rectangle.
- **[Block 21]** (case studies III) — already spotted `MeshSurfaceSampler` scattering in the wild; §52.5
  documents that addon from source and states its area-uniform (non-blue-noise) limit.
- **[Block 51] / [Block 8]** (curves & geometry toolkit) — the L-system turtle (§52.4) emits segments that
  become `CatmullRomCurve3`/`TubeGeometry` (B51) or `CylinderGeometry` (B8) for branch/pipe rendering.
- **[Block 48]** (robust predicates) — WFC on an irregular grid and any Poisson/CDT post-processing inherit
  the same float-degeneracy caveats; a placement grid snapped to integers (B48 §48.3) avoids ambiguous cell
  membership.
- **RUN 9 status** — G66 is the LAST read-only-investigable gap; with it closed, RUN 9's read-only set is
  **exhausted (STOP)**. Remaining work is the requires-execution build phase (§19): apply B45's robust 2D
  union + B48's snapping to the nave `build-viewer.py`, and build G41's equipment-LOD with the meshoptimizer
  recipe of [Block 49]. This block does NOT open new gaps.
