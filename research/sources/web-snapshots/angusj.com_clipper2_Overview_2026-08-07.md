<!-- PRESERVED WEB SNAPSHOT
URL: https://www.angusj.com/clipper2/Docs/Overview.htm
Accessed: 2026-08-07 (UTC)
Method: WebFetch extraction of load-bearing fragments (verbatim quotes)
Cited by: threejs-block45
-->

# Clipper2 — Overview (angusj.com) — preserved fragments

Verbatim quotes extracted 2026-08-07:

1. What it does:
> "Clipper2 is an open source freeware software library (written in C++, C# and Delphi Pascal) that performs line and polygon clipping, offsetting and triangulating."

2. Clipping algorithm:
> "The Library is based on but significantly extends Bala Vatti's polygon clipping algorithm as described in 'A generic solution to polygon clipping', Communications of the ACM, Vol 35, Issue 7 (July 1992) pp 56-63."

3. Coordinate types / precision handling (THE numerical-robustness mechanism):
> "ClipperD accepts PathD paths, both these classes still perform clipping operations using integer coordinates internally. This is to ensure numerical robustness. Because of this, ClipperD performs double / integer conversions before and after clipping (by scaling and de-scaling coordinates using the specified decimal precision)."

4. Clipper1 comparison / robustness claim:
> "Clipper2 is a major update of my original Clipper library which I'm now calling Clipper1."
> "Clipper2 is ... numerically robust."

5. License: page links to License.htm. Clipper2 is distributed under the Boost Software License 1.0
   (corroborated by the Clipper2 repository LICENSE and the clipper2-rust crate note; see
   npm-clipper2-wasm-and-polygon-clipping snapshot).
