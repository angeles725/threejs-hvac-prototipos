# Adversarial critique — B16 "Revit-grade viewer" roadmap

Requested by session *Revision*: critique without diplomacy. Written after reading
`corpus/cob-block16.md` and **measuring `tools/out/L4-full.json` directly** rather than
trusting the roadmap's own summary statistics.

Everything below marked **[MEASURED]** is a number I computed from the extraction output
in this session. Reproduce with the script at the end.


> **ADDENDUM 2026-08-25, after writing sections 0-5 - read this first.**
> I went looking for *where* the fragmentation is introduced and found that a large part of
> it is **self-inflicted, not inherited from the PDF vectoriser**. See section 6. It partially
> corrects sections 0-2: the diagnosis "the network is confetti" is right about the current
> output and wrong about the source data, and the prescribed fix ("spatial clustering with a
> swept tolerance") is the *second* step, not the first. Both Creador and I measured the
> extractor's output and converged - but we converged on a symptom, and we both counted
> **entities** when we should have counted **metres**.

---

## 0. The finding that reorders the entire roadmap

**[MEASURED] The extracted duct network is not a network. It is 1127 disconnected islands.**

```
runs                     1960          total length      2473.2 m
connected components     1127          <-- the number that matters
largest component        13 runs / 23.2 m  = 0.9% of total length
components with <=3 runs 1044  (93% of all components)
components that are a single isolated run   689
```

The roadmap and the hand-off message both report **"76% conectados"**. That figure is
true and it is misleading. It measures *"this run shares a node with at least one other
run"*. It does not measure whether a system exists. Under that metric two fragments of one
straight line that happen to share an endpoint score as "connected" — and the graph they
form is still confetti.

In a 153 × 42 m floor, a real level-4 HVAC network is a handful of AHU trees — call it
5–30 connected systems. We have **1127**, and the largest one covers **0.9%** of the
network. There is no trunk. There is no system. There is no flow direction to compute,
no CFM to propagate, no ΔP to sum, because there is no connected path longer than 23 m.

Every downstream item in the roadmap — connectors, port mating, system classification,
flow direction, CFM/velocity/ΔP, colour-by-system, IFC `IfcDistributionSystem` export — is
**defined on a graph that does not exist**. Building them now does not produce a Revit-grade
model. It produces Revit-grade plumbing wrapped around confetti.

---

## 1. The auto-fitting plan, which the roadmap calls "THE core fix", would inject ~1900 fake objects

Roadmap adoption plan item 2: *"Fitting injection at every graph node — classify by
degree/angle, generate elbow/tee/transition/cap… THE core fix."*

**[MEASURED] node degree histogram, i.e. exactly where that injector would fire:**

```
degree 1: 1788 nodes   -> injector emits a CAP
degree 2:  418 nodes   -> injector emits an ELBOW
degree 3:  164 nodes   -> injector emits a TEE
degree 4:  143 nodes   -> injector emits a CROSS
degree 5+:  41 nodes   -> undefined behaviour
total     2554 nodes
```

Now the two facts that kill it:

**(a) 1788 dead ends, 125 diffusers.** The extraction found **125** round diffuser necks.
Even granting every diffuser plus some equipment connections a legitimate terminal, that
leaves **~1663 degree-1 nodes with no physical counterpart**. Firing the injector today
stamps ~1663 end-caps onto places where a PDF vectorizer dropped a line, and each one
*looks* authoritative in the viewer. This is worse than the current fragmentation, because
fragmentation is visibly broken while a capped fragment is invisibly wrong.

**(b) 61% of the elbow sites are not elbows.** Of the 418 degree-2 nodes, I measured the
angle between the two incident runs:

```
257 nodes (61%)  ->  angular difference < 2 deg   = a SPURIOUS SPLIT of one straight duct
161 nodes (39%)  ->  a genuine direction change
```

The injector as specified would generate **257 elbows with a ~0 degree bend**.

So the honest count for "inject fittings at every graph node" today is roughly
**1663 phantom caps + 257 null elbows ≈ 1920 fabricated objects**, against ~1960 real runs.
The roadmap's own ordering makes this the *second* thing to build, and puts the
reconstruction fixes in a separate section with no stated dependency. **That ordering is
inverted and it is the single most expensive mistake available in this plan.**

---

## 2. The proposed reconstruction fix does not address the actual defect

Roadmap: *"Gap-bridge collinear merge (Δangle<2°, gap ≤~2× median) → fuses PDF-vectorizer
mid-line breaks."*

**[MEASURED]** Run that as specified over the graph — degree-2 nodes, <2° angular
difference, matching width:

```
collinear merge candidates found:  64 joins
run count: 1960 -> ~1896   (3% reduction)
```

**3%.** The pass is nearly a no-op, and the reason is diagnostic: a graph-based collinear
merge can only fuse fragments that **already share a node**. Our fragments mostly do not
touch at all — that is why there are 1127 components and 1788 loose ends. The defect is
*spatial gaps*, not *shared-node splits*.

The fix therefore has to be spatial, not topological, and it has to run first:

1. **Spatial endpoint clustering** with an explicit tolerance (KD-tree / grid hash over the
   1788 loose ends), *then* rebuild the node graph — not merge on the existing one.
2. **Collinear chain fusion** after re-nodding.
3. **Direction quantisation** to 0/45/90/135° before, not after, clustering — near-collinear
   drift from vectorisation is what defeats the angle test.
4. Only then: longest-path trunk reconstruction, and only then fitting injection.

And the tolerance must be **derived and reported, not guessed**: sweep it, plot component
count against tolerance, and pick the knee. Publish that curve as provenance. Right now the
roadmap states `gap ≤ ~2× median` with no evidence that it recovers anything — and my
measurement says the graph-based version recovers 3%.

**Also: state the failure honestly in the viewer.** The current HUD reports
"Runs conectados 78%". It should report *"1127 sistemas desconectados · el mayor cubre 0.9%
de la red"*. The project's best quality — per-datum provenance, `w_src`/`h_src`/`bod_src`,
the assumed-vs-measured colour legend — is being undercut by one headline metric that
flatters the data.

---

## 3. Question by question

### 3.1 What is reinventing the wheel?

| Roadmap item | Verdict | What to pull instead |
|---|---|---|
| Clipping/section plane **with caps + outline** | **Reinventing.** | [ThatOpen `engine_components`](https://github.com/ThatOpen/engine_components) `Clipper` — **MIT**. Port the algorithm; also the three.js [`webgl_clipping_stencil`](https://threejs.org/examples/webgl_clipping_stencil.html) example. |
| SSAO pass | **Reinventing.** | [N8AO](https://github.com/N8python/n8ao) — **ISC** (verified in `package.json` v2.0.1; several secondary sources wrongly say CC0). Do not write an AO shader. |
| Element select + raycast on merged mesh | **Half.** Your `runId`-attribute trick is already the right pattern. | [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) — **MIT** — for the acceleration only. |
| Measurement / dimensions **with snapping** | **Reinventing.** | ThatOpen dimensions (**MIT**) as the code source. [xeokit `DistanceMeasurementsPlugin`](https://xeokit.github.io/xeokit-sdk/docs/class/src/plugins/DistanceMeasurementsPlugin/DistanceMeasurementsPlugin.js~DistanceMeasurementsPlugin.html) as the UX spec **only** — xeokit is **AGPL-3.0** ([license page](https://github.com/xeokit/xeokit-sdk/wiki/License)), viral over a network, so its code must not enter a client deliverable. |
| IFC export (`IfcDuctSegment`/`IfcDuctFitting`/`IfcDistributionPort`/`IfcRelConnectsPorts`) | **Reinventing if you hand-write IFC.** | [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) — **LGPL-3.0**, used as an external Python/CLI tool so no linking obligation. Its Python API authors these entities and validates the schema. |
| Connector/port objects + mate rule | **NOT reinventing — but you are inventing a private schema.** IfcOpenShell will not *infer* topology for you; that part is genuinely yours. | Map port semantics onto `IfcDistributionPort` **from day one** instead of designing a bespoke JSON and retrofitting IFC later. The roadmap already lists the mapping — promote it from "defer" to "define now, emit later". |
| `THREE.LOD` 200/300/350 switching | **Neither — it is premature optimisation.** ~2000 objects, ~25k triangles, already **one** draw call. There is no frame-rate problem to solve. | Cut it. Revisit above ~20k runs. |
| Routing-preferences registry | **Sound, and correctly scoped** — a strategy table decoupling "which fitting" from "how to build it" is the right pattern and no library gives it to you. | Keep. Build it *after* §2. |
| `polygonOffset` for z-fighting | **Sound.** One line, real fix. | Keep. |
| `EdgesGeometry` outlines | **Sound**, but note `LineBasicMaterial.linewidth` is a no-op on WebGL — you will need `Line2`/`LineMaterial` (three.js addons, **MIT**) for any width. | Keep. |
| Niagara N4 live sensor binding | **Scope creep.** A digital-twin binding on a model with 1127 disconnected components is a demo, not a product. | Defer until §0 is fixed. |

### 3.2 What is outdated?

Less than the framing implies, and I will defend the current design where it deserves it:

- **The renderer is not outdated.** One merged `BufferGeometry`, one draw call, PBR +
  IBL + ACES tone mapping is what Speckle and xeokit converge on too. Do not rewrite it to
  `BatchedMesh` or `InstancedMesh` chasing a benchmark; at 25k triangles neither is the
  bottleneck. ([`BatchedMesh` docs](https://threejs.org/docs/pages/BatchedMesh.html) — it
  buys per-object culling and O(1) visibility, which matter above ~20k objects, not here.)
- **The self-contained single-file constraint is not outdated either**, and I would push
  back on anyone who says so. A 2.4 MB HTML that opens offline from a USB stick with no
  server is a *better* client deliverable than a streaming tileset that needs hosting. It
  is a deliberate trade, correctly made. Keep it.
- **Genuinely behind:** CPU brute-force raycast on every `pointermove` (→ BVH), no ambient
  occlusion (→ N8AO), no capped sections, no snapping measurement, 1 px lines.
- **Actually outdated in the roadmap itself:** `THREE.LOD` as a headline item, and treating
  "fragments/streaming" as a goal. Both are answers to a scale problem you do not have.

### 3.3 Are you solving the wrong problem?

**Partly — and this is a goal question, not a technical one.**

The source is DWG whose content was **vectorised from PDF**: no block semantics, no layer
discipline, no entity identity. Nobody in AEC automatically converts that into a connected,
port-mated, flow-computable MEP system. The three routes the industry actually uses are:
(a) obtain the native model, (b) scan-to-BIM from point cloud, (c) **hand-model in Revit
with the PDF as an underlay**. Automated raster/vector-drawing → connected MEP topology is
an open research problem, not shipped tooling.

So the fork is:

- **If the deliverable is "show what the drawings contain, with honest provenance"** — the
  current viewer already does this better than most commercial tools, because it colours by
  *data certainty* (`w_src`/`h_src`/`bod_src`, measured vs assumed). That is a genuine
  differentiator. Then **B16 is goal inflation**: "reads like Revit" is not the goal, and
  half the roadmap should be cut.
- **If the deliverable is a coordination model** (clash detection, fabrication, quantities)
  — then §0 disqualifies it outright, and no viewer feature repairs that. The honest move is
  to say so to the client and price the reconstruction work, or model it by hand in Revit
  over the plans, which is what the industry does and what would be *cheaper* than
  automating it to the required accuracy.

Choose the fork explicitly and write it down. The roadmap currently reads as if the second
is the goal while the evidence supports only the first.

### 3.4 What a serious MEP viewer has that you lack

Ordered by how badly the absence shows:

1. **Capped section planes + section outlines.** Cuts currently read as hollow shells.
2. **Measurement with vertex/edge snap**, reporting ΔX/ΔY/ΔZ — the real MEP question is
   headroom, i.e. ΔY under a duct.
3. **Systems tree / browser** — blocked by §0. This is the feature whose absence *is* the
   data problem, and no UI work substitutes for it.
4. **Property panel per element** — you have richer per-element data than most viewers
   (`w_src`, `bod_src`, `parts`, `cls`, `sheet`) and surface it only in a hover tooltip.
5. **Saved views / issue exchange (BCF)** — how findings get communicated to a client.
6. **Quantity take-off** — you have length × perimeter per run; sheet-metal m² is a
   three-line computation and it is the number a contractor actually pays for. Cheapest
   high-credibility feature on this list.
7. **Clash detection** — meaningless before §0.
8. **2D↔3D linkage** to the source sheet — you already carry `sheet` per run.

---

## 4. What I would actually do, in order

1. **Fix the headline metric.** Report component count and largest-component share in the
   HUD. Stop shipping "76% conectado".
2. **Spatial re-nodding with a swept, published tolerance** (§2). Target: component count
   from 1127 to double digits. If it cannot get there, that is the finding, and it is more
   valuable than any viewer feature.
3. **Only then** ports, fitting injection, systems, flow.
4. In parallel, because they are independent of the data problem and cheap:
   miter joints · N8AO · capped sections · BVH picking · `polygonOffset` · edges ·
   quantity take-off · ortho view presets.
5. Cut for now: `THREE.LOD`, Niagara binding, fragments/streaming, `BatchedMesh`.
6. Define the IFC port mapping now; emit later.

---

## 5. Where the roadmap is right, and I want to be fair about it

- The **connector/port + mate rule** is the correct abstraction, and "segments are shortened
  to butt against fitting port faces" is exactly why Revit never gaps or overlaps. The
  diagnosis of the user's *"cortado"* and *"sobrepuesto"* complaints is correct.
- **Routing preferences as a strategy table** is a better design than most viewers ship.
- **`polygonOffset` for z-fighting** is the right one-line fix.
- The **IFC mapping table** is accurate.
- **Per-element confidence and the area-consistency gate** (Σ branch ≤ trunk + 15%) are
  exactly the kind of falsifiable check this project needs more of.

The plan is not wrong about *what* a system model needs. It is wrong about *when* — it
schedules the system layer before the data can support one, and it under-scopes the one
pass that everything else depends on.

---

## Appendix — reproduce the measurements

```bash
cd ~/investigacion/COB-IM2/tools/out
python3 - <<'PY'
import json, math, collections, statistics as st
d=json.load(open('L4-full.json')); runs=d['runs']
par={}
def f(x):
    while par.setdefault(x,x)!=x: par[x]=par[par[x]]; x=par[x]
    return x
def u(a,b):
    ra,rb=f(a),f(b)
    if ra!=rb: par[ra]=rb
for r in runs: u(r['n0'],r['n1'])
comp=collections.defaultdict(list)
for r in runs: comp[f(r['n0'])].append(r)
sizes=sorted((len(v) for v in comp.values()), reverse=True)
lens =sorted((sum(x['L'] for x in v) for v in comp.values()), reverse=True)
print("components", len(sizes), "largest", sizes[0], f"{lens[0]:.1f} m",
      f"= {100*lens[0]/sum(lens):.1f}% of network")
deg=collections.Counter()
for r in runs: deg[r['n0']]+=1; deg[r['n1']]+=1
print("degree histogram", sorted(collections.Counter(deg.values()).items()))
byn=collections.defaultdict(list)
for r in runs: byn[r['n0']].append(r); byn[r['n1']].append(r)
ang=lambda r: math.atan2(r['p1'][1]-r['p0'][1], r['p1'][0]-r['p0'][0])
fake=real=0
for n,rs in byn.items():
    if len(rs)!=2: continue
    a=abs(ang(rs[0])-ang(rs[1]))%math.pi; a=min(a,math.pi-a)
    if math.degrees(a)<2.0: fake+=1
    else: real+=1
print("degree-2:", fake, "spurious splits vs", real, "true direction changes")
print("degree-1:", sum(1 for v in deg.values() if v==1), "vs necks", len(d.get('necks',[])))
PY
```

Companion document: `RESEARCH-viewer-upgrades.md` (repo/licence table, rendering techniques,
prioritised viewer adaptations).


---

## 6. ADDENDUM - the extractor destroys continuity the source file got right

I stopped trusting my own section 0 and asked the falsifiable question nobody had asked:
**is the fragmentation in the source, or do we create it?** It is both, and the split matters.

### 6.1 The source is not uniformly confetti - we counted the wrong unit

**[MEASURED]** Layer `HVAC - Ductos`, all three level-4 sheets: 28 831 LWPOLYLINE entities,
15 089 m drawn. Bucketed by entity length, **by count and by length**:

| bucket | entities | % of entities | metres | **% of length** |
|---|---:|---:|---:|---:|
| < 0.25 m | 17 986 | 62.4% | 1 368.6 | **9.1%** |
| 0.25-1 m | 7 925 | 27.5% | 4 017.4 | **26.6%** |
| 1-5 m | 2 520 | 8.7% | 5 445.7 | **36.1%** |
| 5-20 m | 365 | 1.3% | 2 890.6 | **19.2%** |
| >= 20 m | 35 | 0.1% | 1 366.8 | **9.1%** |

By **entity count** the file looks hopeless: 62% of entities are sub-25 cm crumbs. By
**length** those crumbs are 9.1% of the drawing, and **55.3% of all drawn metres live in
entities >= 1 m**. Counting objects instead of metres is what made the source look
irreparable. My section 0 and Creador's independent pass both made that error.

The longest continuous source polylines, with vertex counts:

```
60.0 m (32 vtx, 14B)   60.0 m (32 vtx, 14B)     <- a matched pair
58.7 m ( 7 vtx, 14B)   58.7 m ( 6 vtx, 14B)
58.7 m ( 2 vtx, 14B)   58.7 m ( 2 vtx, 14B)     <- one straight 58.7 m wall, ONE entity
51.1 m (28 vtx, 14A)   51.1 m (27 vtx, 14A)
51.1 m ( 7 vtx, 14A)   51.1 m ( 7 vtx, 14A)
```

They come in **matched pairs of identical length**. That is exactly what a duct drawn as two
parallel walls looks like. The vectoriser preserved whole 51-60 m trunk runs.

**Our longest extracted run is 14.11 m.**

### 6.2 Root cause: `tools/l4/extract-graph.py:120-124`

```python
# Always explode to segments (fitting edges feed the pairing pool)
rng = range(n) if closed else range(n-1)
for i in rng:
    a = pts_g[i]; b = pts_g[(i+1)%n]
    raw_segs.append((a, b))
```

Every polyline is exploded into loose 2-point segments **unconditionally, and the parent
identity is discarded**.

**[MEASURED]** `28 831 source polylines -> 191 484 loose segments.` A 60 m wall drawn as one
32-vertex entity becomes 31 orphans. Everything downstream - pairing, node building,
component analysis - then works on rubble and heuristically re-joins what we ourselves broke
milliseconds earlier. The `parts` field in the output is the extractor reassembling its own
damage.

**[MEASURED]** 3 197 of those segments descend from polylines >= 5 m, carrying **4 257 m =
28.2% of the drawn length**. Every one of them has an exact parent id in the DXF.
**Recovering them needs no tolerance, no KD-tree, no swept parameter, no heuristic** - only
not throwing the id away.

The comment even states the reason (*"fitting edges feed the pairing pool"*), and that reason
is legitimate: the pairing algorithm wants segments. The defect is not exploding - it is
exploding **destructively**. Carry `parent_id` and `index_in_parent` on each segment; pair on
segments as today; re-collapse by parent afterwards, exactly and for free.

### 6.3 What this changes in the plan Revision just adopted

The adopted order was: spatial clustering of the 1788 loose ends -> rebuild graph -> chains ->
longest-path -> fittings. **Insert a step 0, and re-measure before tuning anything.**

0. **Stop discarding polyline identity.** Deterministic, exact, no parameter to defend.
   Recovers the trunks, which is precisely the class section 0 said did not exist.
1. **Re-run the component analysis.** The 1127 components / 0.9% largest-component figures
   were measured on output containing this defect. They will change, and possibly a lot.
   Nobody should tune a clustering tolerance against a self-inflicted baseline - that fits a
   heuristic to our own bug and bakes it in permanently.
2. **Then** spatial clustering, for the genuinely vectoriser-shattered remainder - which is
   the 62% of entities carrying 9.1% of length, a much smaller and better-posed problem.
3. Then chains, longest-path, fittings, as agreed.

Section 0's conclusion stands for the **current output** and it still invalidates running
fitting injection now. What it does *not* license is the inference that the source data
cannot support a connected model. On the evidence in 6.1, a meaningful fraction of it can,
and we have been discarding that fraction ourselves.

### 6.4 Reproduce section 6

Run `python3` with:

```python
import ezdxf, math, collections
buckets=collections.Counter(); cnt=collections.Counter(); grand=0.0; segs=0; ents=0
for sh in ("14A","14B","14C"):
    msp=ezdxf.readfile(f'raw/COB-IM2_{sh}_level_4.dxf').modelspace()
    for e in msp.query('LWPOLYLINE[layer=="HVAC - Ductos"]'):
        p=[tuple(x) for x in e.get_points(format="xy")]; n=len(p)
        if n<2: continue
        closed=bool(e.dxf.flags & 1); k = n if closed else n-1
        L=sum(math.dist(p[i],p[(i+1)%n]) for i in range(k))
        ents+=1; segs+=k; grand+=L
        b=("<0.25" if L<0.25 else "0.25-1" if L<1 else "1-5" if L<5 else "5-20" if L<20 else ">=20")
        buckets[b]+=L; cnt[b]+=1
for b in ("<0.25","0.25-1","1-5","5-20",">=20"):
    print(b, cnt[b], f"{100*cnt[b]/ents:.1f}% ents", f"{buckets[b]:.1f} m", f"{100*buckets[b]/grand:.1f}% length")
print(ents, "source polylines ->", segs, "exploded segments")
```

(from `~/investigacion/COB-IM2`)


---

## 7. ADDENDUM 2 — I told them to sweep the tolerance and pick the knee. I swept it. There is no knee.

Section 6.3 sent the plan into "then spatial clustering, for the genuinely
vectoriser-shattered remainder". That step was my inference and I had not tested it. I have
now. **It does not hold, and this corrects section 6.3.**

### 7.1 The curve

**[MEASURED]** Union-find over the 1960 extracted duct centrelines, snapping run endpoints
within a tolerance, swept:

| tol (m) | components | largest (m) | % of network |
|---:|---:|---:|---:|
| 0.00 | 1640 | 16.3 | 0.7% |
| 0.05 | 1501 | 22.2 | 0.9% |
| 0.10 | 1389 | 22.2 | 0.9% |
| **0.15** | **1322** | **22.2** | **0.9%** |
| 0.20 | 1211 | 22.2 | 0.9% |
| 0.30 | 956 | 31.8 | 1.3% |
| 0.50 | 662 | 53.2 | 2.1% |
| 1.00 | 260 | 174.7 | 7.1% |

And the number that bounds the safe region:

```
duct widths in this dataset:  min 0.10 m   median 0.18 m   max 1.29 m
```

### 7.2 Why this kills the step

A snap tolerance is only safe while it stays below the spacing between *distinct* ducts. The
**median duct is 0.18 m wide** and the narrowest is 0.10 m. So:

- In the safe regime (tol <= 0.15 m) the component count moves **1640 -> 1322: a 19%
  improvement.** That is not "possibly a lot". It is marginal.
- Reaching 260 components needs **tol = 1.00 m — five times the median duct width.** At that
  tolerance you are provably merging ducts that are not connected, and the "network" you get
  is an artefact of the tolerance, not of the building.
- Even at that unsafe 1.00 m, the largest component is 174.7 m = **7.1%** of the network.
  Still not a system.

**The curve is smooth.** No knee, no plateau, no natural scale. A single-scale artefact
(vectoriser dropping sub-millimetre joins) would show a cliff at small tolerance and a
plateau after. This does not. The gaps are structurally large relative to the ducts, which
means they are not noise to be snapped away.

I also ran the same sweep on the **raw source polylines, never exploded** (26 908 whole
entities, 15 089 m): at effectively exact matching they form **23 119 components** — 86%
singletons. The source wall lines do not share endpoints either. Caveat on that second test,
stated because I have over-claimed twice already: it measures *wall* endpoint topology, and a
duct is two parallel walls that legitimately do not share endpoints. It bounds the "is
connectivity free in the source" question and nothing more.

### 7.3 Corrected status of section 6

| Claim | Status |
|---|---|
| The extractor destroys polyline identity (`extract-graph.py:120-124`), 28 831 -> 191 484 | **Holds.** Measured. |
| Fixing it is deterministic, exact, needs no parameter | **Holds.** |
| It recovers run *length* and real trunk geometry (28.2% of drawn length in >= 5 m parents) | **Holds.** |
| Re-measure before calibrating any heuristic | **Holds, and now doubly so.** |
| "Then spatial clustering fixes the remainder" | **REFUTED by 7.1.** No safe tolerance recovers connectivity. |
| "Sweep the tolerance and pick the knee" | **There is no knee.** The absence is the finding. |

So the parent-id fix is still the right first move — it makes the geometry honest and the
trunks real. It just is not a path to a connected system, and neither is endpoint snapping
after it. **Connectivity is not recoverable by tolerance tuning on this data.**

### 7.4 What that leaves

Only two live hypotheses, and they are testable rather than arguable:

1. **The centrelines themselves are incomplete** — the parallel-segment pairing stage is
   dropping duct runs, so the gaps are *missing ducts*, not *missing joins*. Test: pick one
   bay, overlay extracted centrelines on the source drawing, and count by hand how many
   visible duct runs have no centreline. That is an afternoon and it settles it.
2. **The drawing genuinely does not depict a continuous network** at this level — plausible
   for a plan set where runs continue on another sheet or are shown schematically.

Neither is fixed by more viewer work or more heuristics. Until one of them is settled,
**the coordination-model fork of section 3.3 is closed**, and the honest-viewer +
quantity-take-off fork is the only one the evidence supports.


---

## 8. ADDENDUM 3 — the long polylines are duct walls (and the ~37% undercount claim is WITHDRAWN — see §9)

Revision raised a tension: their prototype suggested the 51–60 m polylines were **match-lines**,
not ducts, which would make my 22.7%/28.2% figure meaningless. Tested it. **Match-line
hypothesis refuted**, and the test surfaced a defect that matters more than the one it settled.

### 8.1 They are duct walls

**[MEASURED]** For every HVAC-layer polyline >= 20 m, the perpendicular distance to its nearest
near-parallel neighbour. A match-line has no partner at duct spacing; a duct wall does.

```
14A   51.1 m -> 0.454    51.1 -> 0.454    51.1 -> 0.477
      51.1 m -> 0.632    51.1 -> 0.614    37.3 -> 0.596
14B   60.0 m -> 0.555    60.0 -> 0.440    58.7 -> 0.449
      58.7 m -> 0.344    38.2 -> 0.431    37.3 -> 0.335
```

Every one has a parallel partner at **0.33–0.63 m** — squarely inside this dataset's duct-width
range (0.10–1.29 m), and 0.45–0.60 m is 18"–24", ordinary trunk sizing. These are walls.

Unresolved oddity worth a look: 14A carries **six** polylines of exactly 51.1 m, in two
vertex-count groups `{27, 7, 2}` and `{28, 7, 2}`. Either three ducts side by side, or the same
wall duplicated at three levels of detail. If it is duplication, quantities **over**count there.

### 8.2 Correcting my own figure, again

The 28.2% in §6.1 was computed over the whole layer, which mixes two incomparable things:

| | entities | length |
|---|---:|---:|
| OPEN polylines (wall lines) | 18 556 | 7 861 m |
| CLOSED polylines (fitting/hatch outlines) | 8 352 | 7 228 m (perimeter, not wall) |

Summing closed-rectangle perimeters with wall lines is meaningless. Over **open walls only**:

| bucket | entities | % ents | metres | % of wall length |
|---|---:|---:|---:|---:|
| < 0.25 m | 11 997 | 64.7% | 954.4 | 12.1% |
| 0.25–1 m | 5 114 | 27.6% | 2 686.2 | 34.2% |
| 1–5 m | 1 352 | 7.3% | 2 436.5 | 31.0% |
| 5–20 m | 63 | 0.3% | 533.2 | 6.8% |
| >= 20 m | 30 | 0.2% | 1 250.5 | 15.9% |

**Corrected: entities >= 5 m carry 22.7% of wall length, not 28.2%.** The argument is unchanged
— 64.7% of entities are crumbs worth 12.1% of length, and 53.7% of length lives in entities
>= 1 m — but the cited number was wrong.

### 8.3 The defect that matters for the chosen deliverable

If each duct is two walls, wall length implies centreline length:

```
open wall length                       7 861 m
implied centreline (wall / 2)          3 930 m
extracted centreline (L4-full.json)    2 473 m
-------------------------------------------------
extractor recovers 63% of the implied centreline
```

**A ~37% undercount** — in the quantity take-off that §3.3 and the team have now chosen as *the*
deliverable. A table reading 2 473 m where the drawing depicts ~3 930 m is not a cosmetic error;
it is the difference between a correct and an incorrect bid.

This also gives §7.4's Test 1 a prior: expect to find visible ducts with no centreline, on the
order of a third. If a bay-level overlay finds far fewer, then the excess is non-wall geometry on
the layer and the error is *over*counting in my estimator rather than *under*counting in the
extractor. Either outcome is worth knowing.

**Caveat, stated because I have over-claimed three times today:** the 63% assumes every open
polyline is one duct wall and every duct has exactly two. Leaders, insulation lines, dashed
centre-lines and section marks on this layer inflate the wall total; unpaired walls at sheet
boundaries deflate it. It is a bound, not a measurement. The bay overlay is what turns it into one.

Cheap way to aim that overlay: colour every open polyline on the layer that has **no** parallel
partner within 1.3 m. Those are the "not a duct wall" / "lost its pair" candidates — same
computation as 8.1 applied layer-wide, and it marks where to look instead of hand-counting a
whole bay.


---

## 9. ADDENDUM 4 — §8.3 was wrong. There is no quantity undercount.

Revision measured this properly and refuted §8.3. **I reproduced their result independently
and it holds.** Recording the correction, the reproduction, and two refinements that make
their conclusion *stronger* than the one they reported.

### 9.1 Where §8.3 went wrong

§8.3 divided **all** open wall length by 2 to imply centreline length. That is only valid if
every open polyline is one wall of a duct. It is not: a large share of the open polylines on
the layer never pairs with anything — centre-line marks, diffuser symbols, leaders. Including
them in the numerator inflated the implied centreline and manufactured a 37% gap.
**The right operation is to pair the walls first and halve only what pairs.**

### 9.2 Independent reproduction

**[MEASURED]** 14A open-wall sub-segments: 37 164, total wall length 2 807.6 m. Pairing rule:
a wall pairs when a parallel partner (|cos| >= 0.9995) sits at 0.05–`maxw` perpendicular
distance with >= 30% axial overlap.

| max duct width | paired wall | orphan wall | % paired | implied centreline | vs extracted |
|---:|---:|---:|---:|---:|---:|
| 0.60 m | 1 514.4 | 1 293.1 | 53.9% | 757.2 | 0.77x |
| **0.90 m** | **1 731.3** | 1 076.3 | 61.7% | **865.6** | 0.88x |
| 1.30 m | 1 914.2 | 893.4 | 68.2% | 957.1 | 0.97x |
| 2.00 m | 2 029.3 | 778.2 | 72.3% | 1 014.7 | **1.03x** |
| 3.00 m | 2 123.3 | 684.3 | 75.6% | 1 061.6 | 1.08x |

At `maxw = 0.90 m` the implied centreline is **865.6 m** — Revision's 866 m, reproduced to
four significant figures. Their method is confirmed, not disputed.

### 9.3 Two refinements

**(a) 0.90 m is too tight a cap, and the extractor's own output proves it.** Current widths in
`L4-full.json`: min 0.10, median 0.20, **p95 1.12, max 2.24 m**, with **161 runs (7.9%) wider
than 0.90 m**. Capping the pair search at 0.90 m excludes by construction 7.9% of the runs the
extractor itself found. At an honest cap the agreement is **0.97x (1.30 m)** to **1.03x
(2.00 m)** — implied and extracted match within ±3%, straddling parity.

**(b) The extracted figure needs a version pin.** Revision compared against 875 m. That is
14A in an older generation of the file. `L4-full.json` was regenerated (mtime 2026-08-25
20:09) and now holds **2033 runs / 2540.2 m**, with 14A = **983.4 m** — not the 1960 runs /
2473 m that §§0, 6, 7 and 8 were measured on. Every figure in this document is pinned to the
pre-20:09 generation and should be re-derived before being cited further.

### 9.4 The result is better than reported

At the correct cap, implied centreline and extracted centreline agree within ±3%. That
agreement is itself the evidence for the orphan explanation: **if the ~780–890 m of unpaired
wall were duct, it would show up as a deficit, and it does not.** So the orphans really are
non-duct geometry on the duct layer (centre-line marks, diffuser symbols, leaders), exactly as
Revision said — and now that claim rests on a measurement rather than an assertion.

**Status: §8.3 withdrawn. Quantity take-off is not undercounting.** The pairing stage is
recovering essentially all of the duct the drawing depicts.

§7 (connectivity is not recoverable by tolerance tuning) is untouched by this and still
stands as the real limit. What §9 removes is a *quantity* defect; what §7 established is a
*topology* limit. Quantities were the chosen deliverable, so the deliverable is in better
shape than §8 suggested and no better than §7 allows.


---

## 10. ADDENDUM 5 — §7 re-derived on the pinned generation. It holds.

§9.3(b) flagged that every figure in this document was measured on a superseded generation of
`L4-full.json`. §7 is now the load-bearing finding — the quantity defect was withdrawn in §9,
so the connectivity limit is what actually gates the deliverable. Re-derived it on the pinned
file rather than leaving it caveated.

**Pinned artefact:** `tools/out/L4-full.json` · sha256 `f84e84ef22e41b6c…` ·
mtime `2026-08-25 20:09:32 -0600` · **2033 runs / 2540.2 m** (matches the corpus pin).

**[MEASURED]** Same union-find sweep as §7.1, on that generation:

| tol (m) | components | largest (m) | % of network | §7 (old gen) |
|---:|---:|---:|---:|---:|
| 0.001 | 1687 | 16.3 | 0.6% | 1640 |
| 0.05 | 1556 | 22.2 | 0.9% | 1501 |
| 0.10 | 1444 | 22.2 | 0.9% | 1389 |
| **0.15** | **1377** | 22.2 | 0.9% | 1322 |
| 0.20 | 1266 | 22.2 | 0.9% | 1211 |
| 0.30 | 1010 | 31.3 | 1.2% | 956 |
| 0.50 | 709 | 52.7 | 2.1% | 662 |
| 1.00 | 266 | 269.1 | 10.6% | 260 / 7.1% |

Widths on this generation: median **0.20 m**, max 2.24 m — so the safe snap ceiling is
~0.20 m, as before.

**Conclusion unchanged.** In the safe regime (tol <= 0.20 m) components move 1687 -> 1266, a
25% improvement — same order as the 19% measured on the old generation. Reaching 266
components still requires **tol = 1.00 m, five times the median duct width**, and even there
the largest component is 10.6% of the network. The curve is still smooth: no knee, no plateau,
no natural scale.

The regeneration improved things slightly (largest component at 1.00 m grew from 7.1% to
10.6%) and changed nothing structural. **§7 stands on the pinned data: connectivity is not
recoverable by tolerance tuning.**

---

## Document status

| Section | Status |
|---|---|
| §0–§5 original critique | Measured on the superseded generation; directionally intact, figures superseded by §10 |
| §6 extractor destroys polyline identity | **Stands** |
| §7 no safe tolerance recovers connectivity | **CONCLUSION WITHDRAWN — see §12.** The tolerance sub-finding survives; the "confetti" verdict does not |
| §8.1–8.2 long polylines are duct walls; corrected bucket table | **Stands** |
| §8.3 ~37% quantity undercount | **WITHDRAWN** — see §9 |
| §9 pairing shows ±3% agreement | **Stands** |
| §10 §7 re-derivation | **Current** |
| §11 parent-id fix not yet applied | Stands as fact; largely moot — see §12.4 |
| §12 real adjacency refutes the confetti verdict | **Current** |
| §13 the replacement reason for closing coordination is overstated | **Current** |
| §14 bridges are NOT inert — §12.2 retracted; connectivity is a bounded range | **Current** |


---

## 11. ADDENDUM 6 — the parent-id fix has NOT been applied, so §7 cannot be closed on the premise offered

The closing argument for §7 was: *"the parent_id fix would be the only thing that reopens §7,
and we three measured it — it does not recover pairable trunks; the 51 m ones do, but they are
<1% and were already there."* **Two parts of that are false on the pinned artefact.**

### 11.1 The long trunks are not "already there" — there are none

**[MEASURED]** `L4-full.json` sha256 `f84e84ef22e41b6c…` (the pinned generation, 2033 runs):

```
longest extracted runs (m): 14.1, 10.8, 10.4, 10.0, 9.7, 9.4, 9.2, 8.5, 8.1, 8.1
max run = 14.11 m
runs >= 20 m:  0
runs >= 30 m:  0
runs >= 50 m:  0
```

**Zero extracted runs of 20 m or more.** Meanwhile §8.1 established — by measuring the
perpendicular offset to each one's parallel partner (0.34–0.63 m, squarely duct-wall spacing)
— that the source carries matched wall pairs at **51.1, 58.7 and 60.0 m**. Those are duct
walls, verified, and the extractor turns them into nothing longer than 14.11 m. The max run is
also *unchanged* from the pre-regeneration generation, which is what one would expect if the
relevant code never changed.

### 11.2 The fix is not in the committed extractor

`tools/l4/extract-graph.py:308` does contain the token `parent`:

```python
parent = list(range(n))          # union-find with path compression
```

That is the **union-find** structure for node merging. It is not polyline parent identity. The
destructive explode at lines 120–124 documented in §6.2 is unchanged, and the last commit
touching the file is `69c8f83 B13 — level-4 parallel-pairs network graph`. Whatever prototype
was measured, **it is not what produced the pinned artefact**.

### 11.3 "<1%" is the entity-count error, for the third time

Runs >= 5 m on the pinned generation:

| threshold | by count | **by length** |
|---|---:|---:|
| >= 5 m | 55 runs (2.71%) | 368.8 m (**14.5%**) |
| >= 10 m | 3 runs (0.15%) | 35.3 m (1.4%) |

This thread has now made the same mistake three times — §6.1 (entities vs metres in the source),
§8.3 (halving orphan wall), and here. **Fractions of a duct network by object count are
routinely off by an order of magnitude from the same fractions by length.** Worth a standing
rule in the corpus: quote both, or quote length.

### 11.4 What this does and does not mean

It does **not** reopen §7 — I am not claiming the fix restores connectivity, and §7's own
evidence (smooth curve, no knee, safe-tolerance ceiling at the 0.20 m median duct width) is
independent of run length. Merging fragments that already share nodes changes run count without
changing component count.

It **does** mean the premise for closing §7 is untested. The open question is narrow and
answerable: **do the fragments of a 51 m wall pair currently sit in the same component or in
different ones?** If different, parent-identity merging joins those components deterministically,
with no tolerance parameter — and the §7 component count would drop for free. If the same, §7
is untouched and the matter is settled.

That is one query against the pinned data plus the §6.2 change. Until it is run, §7 stands on
its own evidence, and the parent-id item stays **open**, not closed.


---

## 12. ADDENDUM 7 — §7's verdict is WITHDRAWN. The network is not confetti; I measured the wrong adjacency.

Revision reported that `runs[].n0/n1` — the adjacency every connectivity figure in this
document was built from — **omits 1557 end-to-body branch connections**, where a branch welds
onto the *side* of a trunk rather than meeting it end-to-end. `n0`/`n1` cannot express that.
The regenerated JSON now carries `nodes[].runs`, the real adjacency list.

**Reproduced. They are right, and §7's headline conclusion is wrong.**

### 12.1 The decomposition

**[MEASURED]** `L4-full.json` sha256 `7533dccb…`, mtime 20:31 (a *fourth* generation — no
longer the pinned `f84e84ef`). 2033 runs, 2540.2 m, 2549 nodes, 168 bridges.

| graph | components | largest (runs) | largest (m) | % net | runs in comp >= 5 |
|---|---:|---:|---:|---:|---:|
| `n0`/`n1` only — **what §7 measured** | 946 | 28 | 26.3 | 1.0% | 34.6% |
| `nodes[].runs` — **real adjacency, no bridges** | **483** | **375** | **495.5** | **19.5%** | **66.6%** |
| `nodes[].runs` + 168 bridges | 483 | 375 | 495.5 | 19.5% | 66.6% |

19.5% of the network in a single component and two-thirds of runs in components of five or
more is **not confetti**. It is a moderately connected MEP network with real gaps.

### 12.2 The 168 bridges are inert — drop them  **[WRONG — RETRACTED IN §14]**

The third row is identical to the second. **The bridges change nothing**: not the component
count, not the largest component, not one metre. Every pair they connect was already connected
through the real adjacency.

That matters because they are the one piece of the fix that would have needed defending:
synthesized topology edges with **median gap 1.74 m — 8.5x the 0.20 m median duct width — and
159 of 168 above 1.00 m**. Exactly the tolerance-based merge §7.2 argued is unsafe, at a
larger tolerance. They buy **zero**. Delete them: pure risk, no benefit, and they will mislead
anyone who later measures gaps or traces flow through the graph.

### 12.3 §7's tolerance sub-finding survives, and is now cleaner

Re-running the §7.1 sweep on top of the real adjacency:

| tol (m) | components | largest (m) | % net | (old `n0`/`n1` graph) |
|---:|---:|---:|---:|---:|
| 0.00 | 483 | 495.5 | 19.5% | 1687 |
| 0.05 | 483 | 495.5 | 19.5% | 1556 |
| 0.10 | 483 | 495.5 | 19.5% | 1444 |
| 0.15 | 483 | 495.5 | 19.5% | 1377 |
| 0.20 | 468 | 497.7 | 19.6% | 1266 |
| 0.30 | 385 | 507.6 | 20.0% | 1010 |
| 0.50 | 274 | 524.7 | 20.7% | 709 |
| 1.00 | 117 | 1105.8 | 43.5% | 266 |

The curve is now **flat** from 0.00 to 0.15 m — not merely smooth. Real adjacency already
captures everything near-exact endpoint matching would find, and inside the safe ceiling
(<= 0.20 m) tolerance buys 483 -> 468, **3%**.

So the two halves of §7 separate cleanly:

- **"The network is confetti" — WRONG.** Withdrawn.
- **"Tolerance tuning is not the answer" — RIGHT, and better supported now.** The answer was
  never a heuristic; it was reading the adjacency that actually exists. A *data* fix, not a
  *parameter* fix.

### 12.4 What this does to §11

Largely moot. §11's facts stand — the committed extractor still has no polyline parent
identity, and there are still zero extracted runs >= 20 m. But §11's open question ("do the
fragments of a 51 m wall pair sit in different components?") was posed against the broken
graph. On the real adjacency they are most likely already joined by a branch connection, which
is what Revision suspected. The parent-id fix remains correct for **run-length fidelity and
honest trunk geometry**; it was never the connectivity lever, and neither was tolerance.

### 12.5 The decision this reopens — and I am the one who closed it

§3.3 offered a fork: *honest viewer + quantity take-off* versus *coordination model*. §7 is
what closed the second one, and §7's verdict was wrong.

With 19.5% of the network in one component and 66.6% of runs in components of five or more,
**I no longer have the evidence to keep the coordination fork closed.** I am not arguing it
should reopen — that needs a fresh look at clash-readiness and at the assumed Z/storey
datum, which is a separate and still-unresolved weakness. But the specific reason I gave for
closing it has been withdrawn, and whoever presents the fork to the user needs to know that.

### 12.6 The pattern, fourth occurrence

Three unit errors (entities vs metres in the source; halving unpaired wall; "<1% by count")
and now an adjacency error. All four are the same failure: **measuring the artefact that was
easy to read rather than the one that answers the question.** `n0`/`n1` was right there in
every run object, so it got measured; the true adjacency required asking whether the schema
could even express a branch tee, and nobody asked until Creador did.

Proposed corpus rule, extending Revision's: pin **sha + adjacency source + length-not-count**,
and before trusting any topology metric, state which relation the schema encodes and confirm
it can represent the connection type being counted.


---

## 13. ADDENDUM 8 — the *replacement* reason for closing the coordination fork is overstated too

§12.5 withdrew the confetti verdict, which had been the reason for closing the
coordination-model fork. The reason offered in its place is: *"coordination stays unreachable
because of the assumed Z/storey datum (79% of heights unknown) plus 299 over-connection cycles."*
Both figures are wrong in the same direction. Measured on `7533dccb`.

### 13.1 Cycles: 145, not 299 — and 94% of components are pure trees

**[MEASURED]** using the **bipartite run-node incidence** graph (vertices = runs + nodes, edge
= "run *i* touches node *n*"):

```
runs 2033 · nodes 2549 · V 4582 · incidences 4076 · components 651
cyclomatic number = E - V + C = 4076 - 4582 + 651 = 145
pure-tree components: 610/651 = 94%
```

| component | runs | nodes | incidences | cycles |
|---:|---:|---:|---:|---:|
| 1 | 375 | 399 | 857 | **84** |
| 2 | 165 | 147 | 321 | 10 |
| 3 | 73 | 69 | 142 | 1 |
| 4 | 54 | 63 | 118 | 2 |
| 5 | 47 | 39 | 87 | 2 |

Over-connection is real but **localized**: 84 of 145 cycles sit in the largest component, and
94% of components are cycle-free trees, which is the correct topology for a supply network.

*Independent confirmation, two conventions.* Revision re-derived this separately and reported
`4076 - 4414 + 483 = 145`, against my `4076 - 4582 + 651 = 145`. The gap is 168 in both V and
C — they excluded the 168 node objects that touch no run, and with them the 168 singleton
components those nodes formed. The cyclomatic number is invariant to that choice, and both
conventions land on **145**. Anyone comparing the two documents should read this as agreement,
not as a discrepancy.

**Methodology note, and it is the fifth instance of this thread's pattern — this time caught in
myself before sending.** My first attempt modelled each node as a *clique* among the runs it
joins, so a node of degree *k* contributed C(*k*,2) edges instead of *k* incidences. That gave
**810** cycles. A junction of four ducts is one junction, not six connections. The bipartite
incidence model is the correct one and gives 145.

### 13.2 Height: 38.3% assumed by length, not 79%

`h_src` has **three** values, not two:

```
label        420 runs
label-round  442 runs
unknown     1171 runs
```

The "79%" counts `label-round` as unknown. It is not — a round duct carrying a stated diameter
has a known dimension. Counting both labelled sources:

| | by count | **by length** |
|---|---:|---:|
| real dimension | 862 / 2033 = 42.4% | 1568 / 2540 m = **61.7%** |
| assumed | 57.6% | **38.3%** |

So 38.3% of network length has an assumed height — not 79%. (Count-vs-length again, compounded
by a mis-bucketed category.)

### 13.3 The Z claim conflates two different things

```
bod_src:  label 2015 · unknown 18     ->  99.1% of runs carry a REAL elevation label
```

"Assumed Z datum" bundles two separable facts:

- **Bottom-of-duct elevation, per run, relative to the finished floor: 99.1% from real labels.**
  This is one of the strongest data classes in the whole extraction.
- **The absolute storey datum** — what elevation level 4's finished floor sits at — is assumed.

For clash detection *within* level 4, which is what coordination on this level means, the
relevant quantity is **relative** Z, and it is 99.1% real. The absolute datum only binds
cross-level work.

### 13.4 What the honest constraint actually is

Not "Z is assumed". The real limits, in order:

1. **Duct height is unknown for 38.3% of network length.** A clash test needs the vertical
   extent of a duct, and for over a third of the network that extent is a guess. *This* is the
   binding constraint, and it is a third of the size the "79%" figure implied.
2. **145 cycles, 84 of them in one component**, mean the topology of that component is
   uncertain — a supply tree should not have 84 independent loops.
3. The absolute storey datum blocks cross-level coordination only.

**I am not arguing the fork should reopen.** Item 1 is a genuine obstacle to clash-readiness
and item 2 is a genuine topology concern. But the user is being handed two numbers as the basis
for a decision, and both are roughly double the measured values. If the decision is right — and
on item 1 it plausibly is — it should be right on numbers that survive checking.


---

## 14. ADDENDUM 9 — §12.2 was wrong. The bridges are not inert; I filtered a derived array.

Creador refuted §12.2 by **re-extracting with bridging disabled**, rather than filtering the
shipped JSON. That is the correct experiment and mine was not. Verified on the data.

### 14.1 Why my test measured nothing

**[MEASURED]** Each bridge record carries a `node` field. Checking whether that node object
already fuses the bridge's two runs inside `nodes[].runs`:

```
bridges whose `node` already fuses both runs:  163 / 168
distinct bridge-created node objects:          158
```

The bridging step **materialises its merges into `nodes[].runs`**. The `bridges` array is a
*record* of what was done, not the mechanism. Dropping the array therefore changes nothing —
which is exactly the "483 -> 483, zero metres" I reported and read as evidence of inertness. It
was evidence that I had filtered a derived artefact while the effect stayed baked into the
primary adjacency.

### 14.2 What removing them actually costs

Removing the 158 bridge-created node objects from the adjacency:

| graph | components | largest (runs) | largest (m) | % of network |
|---|---:|---:|---:|---:|
| `nodes[].runs` as shipped (bridges materialised) | 483 | 375 | 495.5 | **19.5%** |
| `nodes[].runs` minus the bridge nodes | 782 | 66 | 85.0 | **3.3%** |

Creador's clean re-extraction gives 651 components / 67 runs. My node-removal gives 782 / 66 —
the largest component agrees (66 vs 67 runs), the component count does not, because deleting a
node object also deletes its *non-bridge* incidences and over-fragments. **His 651 is the
correct figure; my 782 is an upper bound.** The headline is the same either way: without
bridging, the largest component collapses from 19.5% of the network to ~3.3%.

The bridges carry essentially the entire connectivity gain. **§12.2 is retracted: do not delete
them.**

### 14.3 The framing this forces, which is better than any single number

The bridges are an **inference** — 168 synthesized joins with median gap 1.74 m, 8.5x the
0.20 m median duct width. So connectivity is not one number, it is a **bounded range**:

- **3.3%** — largest component from measured adjacency alone, nothing inferred.
- **19.5%** — largest component once collinear same-axis same-width gaps up to 2.5 m are bridged.

Both belong in any statement about this network, with the inference labelled. That is Revision's
formulation and it is the right one.

### 14.4 What this does to the §7 retraction

§12 withdrew the confetti verdict on the strength of the 19.5% figure. The withdrawal **stands
on its own merits and is not being un-retracted**: `n0`/`n1` genuinely could not express 1557
end-to-body branch connections, and exposing them was a real data fix independent of bridging.
My §7 numbers were wrong.

But the replacement headline needs the qualifier. Measured-only connectivity is **3.3%**, not
19.5% — materially better than the 1.0% my broken graph produced, and far short of the figure
that replaced it. **The 19.5% is inference-dependent.** Anyone deciding the coordination fork
on connectivity grounds should be looking at the range, and at its un-inferred end, which is
weak.

### 14.5 Sixth instance, and it is mine

Same failure as the other five: **filtering the artefact that was easy to filter instead of
re-deriving the thing it came from.** The `bridges` array was right there and removable; the
adjacency it had already rewritten was not visibly different. The general rule that catches
this: **to measure the effect of a pipeline stage, re-run the pipeline without it — never
subtract its output record from downstream data it has already mutated.**

Corpus rule extended to: pin **sha + adjacency source + length-not-count + re-extract-not-filter**.
