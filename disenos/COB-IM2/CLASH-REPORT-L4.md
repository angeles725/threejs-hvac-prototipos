# COB-IM2 Level-4 HVAC — Duct Clash + Clearance Report

**Data source:** `L4-full.json` (certified)  
**Tool:** `disenos/COB-IM2/tools/duct-clash.py`  
**§13 discipline:** runs with `h=None` are never assigned a top — reported as UNRESOLVED, neither clash nor clash-free.  

## Headline conclusion

**0 CONFIRMED coordination clashes.**

The tool found plan-crossing candidates, but all of them are ADVISORY and none can be confirmed
as a real coordination clash with the data available.  Two extractor weaknesses dominate the
candidate list, and the Z-test is structurally inactive on this dataset.  The tool's primary
value here was **surfacing those two extractor defects**, not flagging coordination work items.

| Weakness | What it does | Status |
|---|---|---|
| **Missed-tee connections** | Runs that connect at a fitting but share no node appear as plan-crossing non-adjacent pairs | Fixed in this tool (TEE_MARGIN=0.20 m geometric screen); 8 false positives removed |
| **Double-bound BOD labels** | Nearest-label binder assigns the same label to two runs → identical `bod`, making otherwise-unrelated runs falsely co-planar | Mechanism confirmed on spot-check L4_0773↔L4_0857; definitive screen needs extractor label-instance handle (team A) |
| **Inactive Z-test** | ~83% of BODs sit in a 0.1 m band; every plan-crossing also Z-overlaps | No clash-free confirmed pairs in the resolvable subset |

## Dataset summary

| Metric | Count | % of 2033 runs |
|---|---|---|
| Total runs | 2033 | 100% |
| Degenerate runs (p0==p1, zero length — excluded from spatial analysis) | 496 | 24.4% |
| Runs with measured height (`h`) | 862 | 42.4% |
| Runs with `h=None` (unknown top) | 1171 | 57.6% |
| Runs with BOD known | 2015 | 99.1% |
| Runs with BOD missing | 18 | 0.9% |

### Height coverage by class (count denominator)

| Class | h known | h=None | Total | h-known % |
|---|---|---|---|---|
| branch | 272 | 168 | 440 | 61.8% |
| main | 93 | 104 | 197 | 47.2% |
| small | 435 | 570 | 1005 | 43.3% |
| trunk | 62 | 329 | 391 | 15.9% |

## Clash screen results

Pairs with overlapping 2D footprints (non-adjacent, post-TEE_MARGIN filter): **94**

| Category | Pairs | % of 94 pairs |
|---|---|---|
| **ADVISORY candidates** (both h known, Z-intervals overlap > 1 cm) | 28 | 29.8% |
| — of which double-bind BOD proxy (same `bod` value, both `bod_src=label`) | 13 | 46.4% of candidates |
| **UNRESOLVED** (h=None on at least one run — §13) | 66 | 70.2% |
| **Clash-free confirmed** (both h known, no Z overlap) | 0 | 0.0% |

> **Why these are ADVISORY, not confirmed clashes — three compounding reasons:**
>
> 1. **Z-test inactive.** ~83% of BODs cluster in a ~0.1 m band (median 3.76 m, 25th–75th pct
>    3.71–3.79 m) with duct heights of 0.15–0.30 m. Every plan-crossing pair also Z-overlaps —
>    zero clash-free confirmed. A "candidate" means two ducts cross in plan at plenum height,
>    not a proven vertical conflict. The step-over is designed in the field or via a coordination
>    drawing that was not digitised.
> 2. **Double-bound BOD labels.** The extractor's nearest-label binder assigns the same BOD label
>    to multiple runs with no exclusivity — runs at different plan locations share an identical `bod`
>    without truly being co-planar. Mechanism confirmed by spot-check on L4_0773↔L4_0857 (the
>    highest-ranked candidate before the TEE_MARGIN fix). Proxy signature (same `bod`, both
>    `bod_src=label`) matches **13 of 28 candidates**.
>    Definitive screen requires the extractor's per-run label-instance handle — not in this JSON;
>    team A owns it.
> 3. **Missed-tee residue.** 8 false positives removed by the TEE_MARGIN=0.20 m geometric screen.
>    Residual missed-tees beyond 0.20 m remain possible.

### ADVISORY candidate detail

All entries are ADVISORY — none are confirmed coordination clashes.  
Column `DBP` = double-bind BOD proxy flag (both `bod_src=label`, same `bod` value — candidate for the double-bind artifact; definitive check requires extractor label-instance handle).

| # | Run A | Run B | cls A | cls B | BOD A | h A (m) | BOD B | h B (m) | Z-overlap (m) | Plan-area (m²) | DBP | Centroid (x, y) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | L4_0007 | L4_0017 | branch | branch | 3.76 | 0.254 | 3.79 | 0.2032 | 0.2032 | 0.06194 | no | (48.965, 27.903) |
| 2 | L4_0028 | L4_0051 | branch | small | 3.79 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.04645 | **yes** | (51.885, 19.035) |
| 3 | L4_0030 | L4_0079 | branch | small | 3.76 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.04645 | no | (71.064, 18.872) |
| 4 | L4_0036 | L4_0069 | branch | small | 3.66 | 0.2032 | 3.69 | 0.1524 | 0.1524 | 0.04645 | no | (71.262, 40.008) |
| 5 | L4_0039 | L4_0185 | branch | small | 3.89 | 0.2032 | 3.86 | 0.1524 | 0.1224 | 0.03871 | no | (87.614, 44.314) |
| 6 | L4_0054 | L4_0147 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03871 | **yes** | (47.325, 19.023) |
| 7 | L4_0058 | L4_0129 | small | branch | 3.79 | 0.1524 | 3.73 | 0.2032 | 0.1432 | 0.03097 | no | (55.953, 19.035) |
| 8 | L4_0067 | L4_0121 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03097 | **yes** | (44.444, 19.023) |
| 9 | L4_0073 | L4_0136 | small | branch | 3.79 | 0.1524 | 3.76 | 0.2032 | 0.1524 | 0.03871 | no | (66.375, 18.872) |
| 10 | L4_0086 | L4_0531 | main | small | 3.78 | 0.381 | 3.71 | 0.1524 | 0.0824 | 0.0012 | no | (49.209, 44.64) |
| 11 | L4_0088 | L4_0173 | small | branch | 3.84 | 0.1524 | 3.76 | 0.2032 | 0.1232 | 0.03097 | no | (82.753, 32.891) |
| 12 | L4_0770 | L4_0821 | branch | small | 3.79 | 0.2032 | 3.75 | 0.1524 | 0.1124 | 0.04645 | no | (104.451, 19.098) |
| 13 | L4_0770 | L4_0815 | branch | small | 3.79 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.04645 | **yes** | (109.429, 19.098) |
| 14 | L4_0770 | L4_1069 | branch | branch | 3.79 | 0.2032 | 3.75 | 0.2032 | 0.1632 | 0.01595 | no | (103.998, 18.954) |
| 15 | L4_0773 | L4_0857 | branch | trunk | 3.55 | 0.2032 | 3.55 | 0.4572 | 0.2032 | 0.23226 | **yes** | (102.781, 35.135) |
| 16 | L4_0800 | L4_0831 | branch | small | 3.72 | 0.2032 | 3.75 | 0.1524 | 0.1524 | 0.03871 | no | (124.828, 39.936) |
| 17 | L4_0826 | L4_0852 | small | branch | 3.79 | 0.1524 | 3.79 | 0.254 | 0.1524 | 0.04645 | **yes** | (97.398, 39.541) |
| 18 | L4_0828 | L4_0892 | small | branch | 3.76 | 0.1524 | 3.76 | 0.2032 | 0.1524 | 0.03097 | **yes** | (105.747, 39.768) |
| 19 | L4_0854 | L4_0877 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03871 | **yes** | (138.261, 11.707) |
| 20 | L4_1473 | L4_1498 | branch | small | 3.74 | 0.2032 | 3.74 | 0.1524 | 0.1524 | 0.03871 | **yes** | (188.283, 27.232) |
| 21 | L4_1485 | L4_1520 | branch | small | 3.79 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.03097 | **yes** | (161.691, 18.903) |
| 22 | L4_1488 | L4_1535 | branch | small | 3.72 | 0.2032 | 3.74 | 0.1524 | 0.1524 | 0.04645 | no | (148.593, 39.968) |
| 23 | L4_1497 | L4_1569 | main | small | 3.71 | 0.3048 | 3.79 | 0.1524 | 0.1524 | 0.05419 | no | (152.3, 46.982) |
| 24 | L4_1500 | L4_1531 | branch | small | 3.76 | 0.2032 | 3.83 | 0.1524 | 0.1332 | 0.03097 | no | (190.431, 39.943) |
| 25 | L4_1534 | L4_1571 | small | branch | 3.79 | 0.1524 | 3.76 | 0.2032 | 0.1524 | 0.03097 | no | (178.15, 39.943) |
| 26 | L4_1541 | L4_1611 | small | branch | 3.73 | 0.1524 | 3.73 | 0.2032 | 0.1524 | 0.03871 | **yes** | (186.716, 18.532) |
| 27 | L4_1570 | L4_1597 | small | branch | 3.65 | 0.1524 | 3.65 | 0.254 | 0.1524 | 0.04645 | **yes** | (147.51, 11.694) |
| 28 | L4_1578 | L4_1596 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03097 | **yes** | (158.871, 46.98) |

### Unresolved pairs (sample — first 30)

Total unresolved pairs: **66** (denominator: 94 overlapping non-adjacent pairs found by spatial index)

| Run A | Run B | cls A | cls B | BOD A | BOD B | Reason |
|---|---|---|---|---|---|---|
| L4_0015 | L4_0492 | branch | small | 3.76 | 3.79 | L4_0492 h=None |
| L4_0070 | L4_0516 | main | small | 3.79 | 3.71 | L4_0516 h=None |
| L4_0081 | L4_0502 | main | small | 3.74 | 3.66 | L4_0502 h=None |
| L4_0085 | L4_0356 | trunk | small | 3.68 | 3.75 | L4_0356 h=None |
| L4_0085 | L4_0374 | trunk | small | 3.68 | 3.75 | L4_0374 h=None |
| L4_0086 | L4_0501 | main | small | 3.78 | 3.71 | L4_0501 h=None |
| L4_0087 | L4_0145 | small | branch | 3.72 | 3.72 | L4_0087 h=None |
| L4_0094 | L4_0514 | main | small | 3.68 | 3.68 | L4_0514 h=None |
| L4_0152 | L4_0499 | main | small | 3.71 | 3.71 | L4_0499 h=None |
| L4_0156 | L4_0505 | main | small | 3.71 | 3.79 | L4_0505 h=None |
| L4_0192 | L4_0517 | branch | small | 3.43 | 3.43 | L4_0517 h=None |
| L4_0193 | L4_0498 | branch | small | 3.32 | 3.68 | L4_0193 h=None; L4_0498 h=None |
| L4_0230 | L4_0439 | trunk | small | 3.86 | 3.89 | L4_0230 h=None; L4_0439 h=None |
| L4_0230 | L4_0527 | trunk | small | 3.86 | 3.79 | L4_0230 h=None |
| L4_0271 | L4_0515 | main | small | 3.66 | 3.66 | L4_0515 h=None |
| L4_0282 | L4_0333 | trunk | small | 3.79 | 3.86 | L4_0282 h=None |
| L4_0285 | L4_0525 | main | small | 3.64 | 3.64 | L4_0525 h=None |
| L4_0286 | L4_0529 | main | small | 3.69 | 3.69 | L4_0529 h=None |
| L4_0293 | L4_0341 | trunk | small | 3.89 | 3.89 | L4_0293 h=None |
| L4_0293 | L4_0443 | trunk | small | 3.89 | 3.89 | L4_0293 h=None; L4_0443 h=None |
| L4_0293 | L4_0457 | trunk | main | 3.89 | 3.89 | L4_0293 h=None; L4_0457 h=None |
| L4_0293 | L4_0343 | trunk | small | 3.89 | 3.89 | L4_0293 h=None |
| L4_0293 | L4_0408 | trunk | branch | 3.89 | 3.89 | L4_0293 h=None; L4_0408 h=None |
| L4_0391 | L4_0422 | trunk | small | 3.81 | 3.81 | L4_0391 h=None; L4_0422 h=None |
| L4_0409 | L4_0482 | trunk | small | 3.74 | 3.79 | L4_0409 h=None; L4_0482 h=None |
| L4_0409 | L4_0479 | trunk | small | 3.74 | 3.79 | L4_0409 h=None; L4_0479 h=None |
| L4_0409 | L4_0480 | trunk | small | 3.74 | 3.79 | L4_0409 h=None |
| L4_0409 | L4_0481 | trunk | small | 3.74 | 3.79 | L4_0409 h=None; L4_0481 h=None |
| L4_0768 | L4_1307 | branch | trunk | 3.73 | 3.74 | L4_1307 h=None |
| L4_0771 | L4_1208 | main | small | 3.74 | 3.74 | L4_1208 h=None |
| … | … | … | … | … | … | _36 more — run tool for full list_ |

## BOD (bottom-of-duct) distribution

Denominator: **2015 runs** with BOD present (out of 2033 total).

| Statistic | Value (m) |
|---|---|
| Min | 2.860 |
| 5th percentile | 3.460 |
| 25th percentile | 3.710 |
| Median | 3.760 |
| 75th percentile | 3.790 |
| 95th percentile | 3.890 |
| Max | 4.820 |
| Mean | 3.734 |

### 20 lowest-BOD runs (headroom-critical)

_These are the runs closest to the floor — apply your MECO threshold here._

| Rank | ID | cls | BOD (m) | h (m) | w (m) |
|---|---|---|---|---|---|
| 1 | L4_1584 | small | 2.860 | **None** | 0.1270 |
| 2 | L4_1585 | small | 2.860 | **None** | 0.1270 |
| 3 | L4_1681 | small | 2.860 | **None** | 0.1524 |
| 4 | L4_1708 | trunk | 2.860 | **None** | 0.5080 |
| 5 | L4_1772 | trunk | 2.860 | **None** | 1.0668 |
| 6 | L4_1912 | small | 2.860 | **None** | 0.1270 |
| 7 | L4_1919 | trunk | 2.860 | **None** | 0.6096 |
| 8 | L4_1984 | branch | 2.860 | **None** | 0.3048 |
| 9 | L4_1992 | branch | 2.860 | **None** | 0.3048 |
| 10 | L4_0958 | small | 3.020 | **None** | 0.1524 |
| 11 | L4_0967 | small | 3.020 | **None** | 0.1524 |
| 12 | L4_0974 | trunk | 3.020 | **None** | 0.5588 |
| 13 | L4_1126 | small | 3.020 | **None** | 0.1778 |
| 14 | L4_1239 | trunk | 3.020 | 1.1176 | 1.1176 |
| 15 | L4_1340 | branch | 3.020 | **None** | 0.3048 |
| 16 | L4_1400 | branch | 3.020 | **None** | 0.3048 |
| 17 | L4_0133 | main | 3.030 | **None** | 0.3556 |
| 18 | L4_0248 | small | 3.030 | **None** | 0.1016 |
| 19 | L4_0805 | trunk | 3.030 | **None** | 0.5588 |
| 20 | L4_0968 | small | 3.030 | **None** | 0.1524 |

## MECO / clearance

No MECO datum supplied (confirmed absent from DXF source; must be supplied externally).  
Re-run with `--meco <metres>` to flag headroom violations once a threshold is available.

---
_Report generated by `duct-clash.py`. Re-run at any time against `L4-full.json`._