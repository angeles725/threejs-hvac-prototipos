# COB-IM2 Level-4 HVAC — Duct Clash + Clearance Report

**Data source:** `L4-full.json` (certified)  
**Tool:** `disenos/COB-IM2/tools/duct-clash.py`  
**§13 discipline:** runs with `h=None` are never assigned a top — reported as UNRESOLVED, neither clash nor clash-free.  

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

## Clash analysis results

Pairs with overlapping 2D footprints (non-adjacent): **179**

| Category | Pairs | % of 179 pairs |
|---|---|---|
| **REAL CLASHES** (both h known, Z-intervals overlap > 1 cm) | 36 | 20.1% |
| **UNRESOLVED** (h=None on at least one run) | 143 | 79.9% |
| **Clash-free confirmed** (both h known, no Z overlap) | 0 | 0.0% |

**36 real clash(es) detected** in the resolvable (both-h-known) subset:

### Real clash detail

| # | Run A | Run B | cls A | cls B | BOD A (m) | h A (m) | BOD B (m) | h B (m) | Z-overlap (m) | Plan-area overlap (m²) | Centroid (x, y) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | L4_0007 | L4_0017 | branch | branch | 3.76 | 0.254 | 3.79 | 0.2032 | 0.2032 | 0.06194 | (48.965, 27.903) |
| 2 | L4_0028 | L4_0051 | branch | small | 3.79 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.04645 | (51.885, 19.035) |
| 3 | L4_0030 | L4_0079 | branch | small | 3.76 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.04645 | (71.064, 18.872) |
| 4 | L4_0036 | L4_0069 | branch | small | 3.66 | 0.2032 | 3.69 | 0.1524 | 0.1524 | 0.04645 | (71.262, 40.008) |
| 5 | L4_0039 | L4_0138 | branch | small | 3.89 | 0.2032 | 3.89 | 0.1524 | 0.1524 | 0.01994 | (89.957, 44.314) |
| 6 | L4_0039 | L4_0185 | branch | small | 3.89 | 0.2032 | 3.86 | 0.1524 | 0.1224 | 0.03871 | (87.614, 44.314) |
| 7 | L4_0042 | L4_0083 | branch | small | 3.72 | 0.2032 | 3.76 | 0.1524 | 0.1524 | 0.01595 | (90.181, 18.896) |
| 8 | L4_0054 | L4_0147 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03871 | (47.325, 19.023) |
| 9 | L4_0058 | L4_0129 | small | branch | 3.79 | 0.1524 | 3.73 | 0.2032 | 0.1432 | 0.03097 | (55.953, 19.035) |
| 10 | L4_0067 | L4_0121 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03097 | (44.444, 19.023) |
| 11 | L4_0073 | L4_0136 | small | branch | 3.79 | 0.1524 | 3.76 | 0.2032 | 0.1524 | 0.03871 | (66.375, 18.872) |
| 12 | L4_0086 | L4_0531 | main | small | 3.78 | 0.381 | 3.71 | 0.1524 | 0.0824 | 0.0012 | (49.209, 44.64) |
| 13 | L4_0088 | L4_0173 | small | branch | 3.84 | 0.1524 | 3.76 | 0.2032 | 0.1232 | 0.03097 | (82.753, 32.891) |
| 14 | L4_0592 | L4_0809 | trunk | trunk | 3.66 | 0.508 | 3.66 | 0.508 | 0.508 | 0.00286 | (88.363, 41.467) |
| 15 | L4_0770 | L4_0821 | branch | small | 3.79 | 0.2032 | 3.75 | 0.1524 | 0.1124 | 0.04645 | (104.451, 19.098) |
| 16 | L4_0770 | L4_0815 | branch | small | 3.79 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.04645 | (109.429, 19.098) |
| 17 | L4_0770 | L4_1069 | branch | branch | 3.79 | 0.2032 | 3.75 | 0.2032 | 0.1632 | 0.01595 | (103.998, 18.954) |
| 18 | L4_0773 | L4_0857 | branch | trunk | 3.55 | 0.2032 | 3.55 | 0.4572 | 0.2032 | 0.23226 | (102.781, 35.135) |
| 19 | L4_0800 | L4_0831 | branch | small | 3.72 | 0.2032 | 3.75 | 0.1524 | 0.1524 | 0.03871 | (124.828, 39.936) |
| 20 | L4_0826 | L4_0852 | small | branch | 3.79 | 0.1524 | 3.79 | 0.254 | 0.1524 | 0.04645 | (97.398, 39.541) |
| 21 | L4_0828 | L4_0892 | small | branch | 3.76 | 0.1524 | 3.76 | 0.2032 | 0.1524 | 0.03097 | (105.747, 39.768) |
| 22 | L4_0854 | L4_0877 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03871 | (138.261, 11.707) |
| 23 | L4_1125 | L4_1393 | small | small | 3.79 | 0.1524 | 3.79 | 0.1524 | 0.1524 | 8e-05 ⚠ micro-overlap | (124.697, 47.86) |
| 24 | L4_1135 | L4_1374 | small | small | 3.78 | 0.1524 | 3.78 | 0.1524 | 0.1524 | 9e-05 ⚠ micro-overlap | (128.781, 47.858) |
| 25 | L4_1138 | L4_1383 | small | small | 3.79 | 0.1524 | 3.79 | 0.1524 | 0.1524 | 9e-05 ⚠ micro-overlap | (138.062, 47.858) |
| 26 | L4_1177 | L4_1404 | small | small | 3.78 | 0.1524 | 3.78 | 0.1524 | 0.1524 | 8e-05 ⚠ micro-overlap | (131.205, 47.86) |
| 27 | L4_1180 | L4_1379 | small | small | 3.84 | 0.1524 | 3.84 | 0.1524 | 0.1524 | 9e-05 ⚠ micro-overlap | (136.027, 47.86) |
| 28 | L4_1473 | L4_1498 | branch | small | 3.74 | 0.2032 | 3.74 | 0.1524 | 0.1524 | 0.03871 | (188.283, 27.232) |
| 29 | L4_1485 | L4_1520 | branch | small | 3.79 | 0.2032 | 3.79 | 0.1524 | 0.1524 | 0.03097 | (161.691, 18.903) |
| 30 | L4_1488 | L4_1535 | branch | small | 3.72 | 0.2032 | 3.74 | 0.1524 | 0.1524 | 0.04645 | (148.593, 39.968) |
| 31 | L4_1497 | L4_1569 | main | small | 3.71 | 0.3048 | 3.79 | 0.1524 | 0.1524 | 0.05419 | (152.3, 46.982) |
| 32 | L4_1500 | L4_1531 | branch | small | 3.76 | 0.2032 | 3.83 | 0.1524 | 0.1332 | 0.03097 | (190.431, 39.943) |
| 33 | L4_1534 | L4_1571 | small | branch | 3.79 | 0.1524 | 3.76 | 0.2032 | 0.1524 | 0.03097 | (178.15, 39.943) |
| 34 | L4_1541 | L4_1611 | small | branch | 3.73 | 0.1524 | 3.73 | 0.2032 | 0.1524 | 0.03871 | (186.716, 18.532) |
| 35 | L4_1570 | L4_1597 | small | branch | 3.65 | 0.1524 | 3.65 | 0.254 | 0.1524 | 0.04645 | (147.51, 11.694) |
| 36 | L4_1578 | L4_1596 | small | branch | 3.79 | 0.1524 | 3.79 | 0.2032 | 0.1524 | 0.03097 | (158.871, 46.98) |

**Most significant clash:** L4_0773 (branch) vs L4_0857 (trunk) — plan overlap 0.23226 m², Z overlap 0.2032 m, at (102.781, 35.135)

**Note:** 5 clash(es) marked `⚠ micro-overlap` have plan intersection area < 1 mm² (0.001 m²). These meet the geometric criteria but may be digitization artifacts (parallel runs whose extruded widths barely cross). Treat as advisory pending field verification.

### Unresolved pairs (sample — first 30)

Total unresolved pairs: **143** (denominator: 179 overlapping non-adjacent pairs found by spatial index)

| Run A | Run B | cls A | cls B | BOD A | BOD B | Reason |
|---|---|---|---|---|---|---|
| L4_0005 | L4_0257 | trunk | small | 3.89 | 3.89 | L4_0257 h=None |
| L4_0015 | L4_0492 | branch | small | 3.76 | 3.79 | L4_0492 h=None |
| L4_0049 | L4_0484 | small | small | 3.71 | 3.79 | L4_0049 h=None |
| L4_0049 | L4_0506 | small | small | 3.71 | 3.79 | L4_0049 h=None |
| L4_0053 | L4_0426 | small | small | 3.76 | 3.76 | L4_0053 h=None |
| L4_0053 | L4_0425 | small | small | 3.76 | 3.74 | L4_0053 h=None |
| L4_0057 | L4_0329 | small | small | 3.73 | 3.73 | L4_0057 h=None |
| L4_0057 | L4_0330 | small | small | 3.73 | 3.65 | L4_0057 h=None |
| L4_0065 | L4_0131 | small | branch | 3.79 | 3.74 | L4_0065 h=None |
| L4_0070 | L4_0516 | main | small | 3.79 | 3.71 | L4_0516 h=None |
| L4_0081 | L4_0502 | main | small | 3.74 | 3.66 | L4_0502 h=None |
| L4_0085 | L4_0356 | trunk | small | 3.68 | 3.75 | L4_0356 h=None |
| L4_0085 | L4_0374 | trunk | small | 3.68 | 3.75 | L4_0374 h=None |
| L4_0086 | L4_0501 | main | small | 3.78 | 3.71 | L4_0501 h=None |
| L4_0087 | L4_0145 | small | branch | 3.72 | 3.72 | L4_0087 h=None |
| L4_0087 | L4_0539 | small | small | 3.72 | 3.75 | L4_0087 h=None; L4_0539 h=None |
| L4_0094 | L4_0514 | main | small | 3.68 | 3.68 | L4_0514 h=None |
| L4_0099 | L4_0490 | small | small | 3.67 | 3.76 | L4_0099 h=None |
| L4_0101 | L4_0265 | small | branch | 3.67 | 3.64 | L4_0101 h=None; L4_0265 h=None |
| L4_0152 | L4_0499 | main | small | 3.71 | 3.71 | L4_0499 h=None |
| L4_0156 | L4_0505 | main | small | 3.71 | 3.79 | L4_0505 h=None |
| L4_0164 | L4_0358 | small | branch | 3.78 | 3.78 | L4_0164 h=None; L4_0358 h=None |
| L4_0192 | L4_0517 | branch | small | 3.43 | 3.43 | L4_0517 h=None |
| L4_0193 | L4_0498 | branch | small | 3.32 | 3.68 | L4_0193 h=None; L4_0498 h=None |
| L4_0212 | L4_0462 | small | small | 3.72 | 3.76 | L4_0212 h=None |
| L4_0212 | L4_0463 | small | small | 3.72 | 3.76 | L4_0212 h=None; L4_0463 h=None |
| L4_0213 | L4_0416 | small | small | 3.76 | 3.76 | L4_0213 h=None |
| L4_0216 | L4_0431 | small | small | 3.76 | 3.76 | L4_0216 h=None |
| L4_0217 | L4_0430 | small | small | 3.76 | 3.76 | L4_0217 h=None |
| L4_0220 | L4_0472 | small | small | 3.71 | 3.71 | L4_0220 h=None |
| … | … | … | … | … | … | _113 more — run tool for full list_ |

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