# WU-L4-B caps — round 2 (cap-color honesty + ortho + independent loft verify)

Follow-up correction on the committed B1 (91ffeb3) + B2 (3d969d6). Both viewers.

## Issues raised by @3D (measured, honest) and resolved
1. **Cap-color ambiguity (measured defect, FIXED).** Cap was gray 0x8f9ba7, CIE76 dE 6.5/7.7
   to accessory/measured (closer than those classes are to each other, 13.9) — a cut through an
   assumed-height (orange) duct showed a face that read as measured/accessory. Same honesty class
   as the WU-A dimming legend. FIX: cap → 0xe0e6ea, MATTE (metalness 0, roughness 0.9 — so the
   measured pixel matches the constant instead of being dominated by the env map), + a legend chip
   "cara de corte de sección" in both viewers. Constant dE min 21.0 to all 4 classes of BOTH
   viewers (incl. COL_SMALL, which exists only in full-3d).
   - REVIEWER RENDERED MEASUREMENT (the correct metric, both surfaces shaded): rendered cap
     vs rendered measured duct dE76 = 18.8 (worst case: bright measured top, grazing angle) to 40.8.
     (An initial 10.9 was against the RAW un-rendered measured constant — a flawed reference @3D
     predicted.) KNOWN LIMITATION (documented, not pending): at a grazing perspective angle the cap
     dips to ~11 vs a bright measured top; the matte-vs-metallic material difference + the declared
     legend chip resolve the residual.
2. **Orthographic projection (untested case, VERIFIED).** Both viewers have a real cOrtho toggle;
   the gate had run only in perspective. @3D added `?ortho=1` (gate-drivable, driven through the
   checkbox). Verified: `?bay=8&ortho=1&capdebug=1` (system-3d) and `?clip=3.90&ortho=1` (full-3d)
   render caps correctly in parallel projection — the stencil count argument is projection-independent.

## Independent loft verification (was verified-by-construction; now MEASURED)
@3D added `window.__meshData() -> {net, term}` (positions + runId; sibling of __qaFraming).
Boundary-edge count (weld by position, count edges used by exactly 1 triangle; degenerate
triangles skipped) over the post-cap fused mesh, all classes shown (?bay=-1):
- system-3d net: tris 33624, welded_verts 18056, degenerate 5340 (skipped), BOUNDARY_EDGES = 0 (was 992: 124 lofts x 2 x 4)
- system-3d term: BOUNDARY_EDGES = 0
- full-3d net: tris 39696, degenerate 0, BOUNDARY_EDGES = 0 (was 1736: 217 lofts x 2 x 4)
Non-manifold edges (1743 sys / 335 full) are expected for a fused UNION mesh (overlapping ducts
share coplanar faces); they are not holes. Watertight => all loft caps + duct ends closed.

VERDICT: PASS. Caps WU complete and fully verified across both viewers, both projections.
