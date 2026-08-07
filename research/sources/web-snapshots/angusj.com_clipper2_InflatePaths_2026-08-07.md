<!-- PRESERVED WEB SNAPSHOT
URL: http://www.angusj.com/clipper2/Docs/Units/Clipper/Functions/InflatePaths.htm
       + https://deepwiki.com/AngusJohnson/Clipper2/5-offsetting-operations (enum values corroboration)
Accessed: 2026-08-07 (UTC)
Method: WebFetch + WebSearch extraction of load-bearing fragments
Cited by: threejs-block45
-->

# Clipper2 — InflatePaths / Offsetting — preserved fragments

Verbatim, extracted 2026-08-07:

C++ signature (from InflatePaths.htm):
```
Paths64 InflatePaths(const Paths64& paths, double delta,
 JoinType join_type, EndType end_type,
 double miter_limit = 2.0, double arc_tolerance = 0.0);
```
- `delta` = "The amount paths are to be offset" (positive inflates, negative shrinks — Clipper convention).
- `miter_limit` default = `2.0` (shown in the signature).
- `arc_tolerance` default = `0.0`.
- The page warns: "it's important to understand the notes pertaining to offsetting too" (links to ClipperOffset notes).

JoinType / EndType enum values (from the Clipper2 offsetting docs / clipper.export.h header,
via DeepWiki "Offsetting Operations" and the Clipper2 source):
- JoinType: `Square=0, Bevel=1, Round=2, Miter=3`.
- EndType options: Polygon, Joined, Butt, Square, Round.

Miter acute-angle fallback (from Clipper2 offsetting source, DeepWiki):
> "The miter_limit parameter (default 2.0) controls how far miter joins extend before becoming
> beveled. If cos(angle) <= temp_lim_ - 1, the miter is too acute and DoSquare() is used instead
> of DoMiter()."
