# WU2 — Does the render make measured-vs-assumed height visible?

Date: 2026-08-26 · Subject: `cob-im2-L4-system-3d.html` (canonical, 2033 runs / 2540.2 m)
Method: static measurement of the colour-assignment path against `L4-full.json`. No capture — the
gate instrument is still absent, so nothing here is a gate verdict.

## Verdict

**No. Three defects, each independently sufficient.** The viewer carries per-run provenance in its
data and its tooltip, and then discards most of it at the point where it would actually be seen.

## The colour path

```js
const c = term ? COL_SMALL : (r.h ? COL_CERT : COL_INFER);   // term = r.cls === 'small'
```
```
COL_CERT  0x9fb0bd   // measured width + labelled height
COL_INFER 0xd8a03c   // height assumed
COL_FIT   0x7c8b99   // fittings
COL_SMALL 0x5f7183   // "< 8\": never size-tagged on this floor"
```

## Defect 1 — 43.1% of the network has its height provenance collapsed

Every `cls === 'small'` run is painted `COL_SMALL` regardless of `h_src`, and is routed into `meshT`,
which is `visible = false` at boot.

| | runs | length | share |
|---|---|---|---|
| `cls != small` → `mesh`, visible, provenance-coloured | 1028 | 1445.6 m | 56.9% |
| `cls == small` → `meshT`, hidden, single colour | 1005 | **1094.6 m** | **43.1%** |

In the default view provenance reads correctly — 981.0 m `COL_CERT` (67.9%) against 464.7 m
`COL_INFER` (32.1%), matching the shipped headline. Toggle terminals on and 1094.6 m arrives in one
undifferentiated colour.

## Defect 2 — the comment justifying that collapse is false

`COL_SMALL`'s comment claims small ducts are *"never size-tagged on this floor."* Measured:

- small-class widths are 4" (244), 5" (208), 6" (505), 7" (48) — **zero ≥ 8"**, so the *width* half is right;
- **435 of 1005 small runs carry a measured height — 587.4 m of 1094.6 m, 53.7% by length.**

So more than half of that length has a real labelled height, and the render throws it away on the
strength of a claim the data contradicts. The remaining 507.1 m is genuinely assumed. The viewer
shows those two as the same object.

## Defect 3 — `COL_CERT` vs `COL_INFER` is a hue-only distinction on a metallic surface

WCAG contrast of the vertex colours, before lighting:

| pair | ratio |
|---|---|
| **COL_CERT vs COL_INFER** | **1.05:1** |
| COL_CERT vs COL_FIT | 1.57:1 |
| COL_CERT vs COL_SMALL | 2.26:1 |
| COL_FIT vs COL_SMALL | 1.44:1 |

The one pair carrying the deliverable's central claim is the *least* separable by luminance in the
palette. It survives on hue alone — and it is applied to
`MeshStandardMaterial({metalness:0.88, roughness:0.34, envMapIntensity:1.15})`, where the base colour
is heavily modulated by reflection. Two colours of near-identical luminance on a near-mirror surface
converge under grazing light, which is exactly why GATES.md requires a `grazing` shot in the look-dev
set. It also means the distinction does not survive greyscale — a printed section drops it entirely.

This is measured luminance, not a judgement about how it looks. **Whether it actually reads at working
zoom needs the blind reviewer, and that needs the instrument.**

## Defect 4 (minor) — fittings launder provenance

1157 fitting bodies are built with `COL_FIT` and `runId -1`, so they are unpickable and carry no
provenance. Their height is `Math.max(...rs.map(r => r.h || H_MED))` — a fitting between one measured
and one assumed neighbour silently takes the larger, with no record of which.

## This does NOT change the 38.3% headline

Stated explicitly, because the 587.4 m invites exactly the wrong reading. Those metres are **not**
recovered coverage — they were never missing. The 38.3% is computed over the whole network, small
class included, and the complement closes with no residue:

```
total network            2540.2 m
h_src == unknown          971.8 m  = 38.3%
   of which cls == small  507.1 m
   of which cls != small  464.7 m
   sum                    971.8 m     <- exact
measured-h total         1568.4 m  = 61.7%
```

The extractor captured that height and wrote it into `L4-full.json`; the tooltip reads it correctly on
hover. Only the *colour channel* discards it. **WU3 item 1 recovers visibility on 1094.6 m and zero
metres of coverage.** Height coverage remains 38.3% assumed / 61.7% measured.

## What this costs

Height coverage by class, by length: **trunk 29.9%**, main 68.5%, branch 84.3%, small 53.7%. The
trunk is both the least-known and the most consequential, and it *is* provenance-coloured — so the
defects above do not hide the worst case. What they hide is the 43.1% small-duct layer, and they hide
it in both directions: 507.1 m of assumed height reads as certain, and 587.4 m of genuinely measured
height is denied its credit.

## Proposed WU3 (needs the instrument to gate)

1. Drop the `term` branch from the colour expression: colour every run by `r.h`, and carry class in
   geometry/opacity where it already is. One-line change; recovers provenance on 1094.6 m.
2. Correct the `COL_SMALL` comment, or delete the constant with its branch.
3. Re-separate `COL_CERT`/`COL_INFER` on **luminance as well as hue**, then prove it with the
   `grazing` capture rather than by assertion.
4. Give fittings a provenance colour derived from their neighbours — or mark mixed junctions as such.
