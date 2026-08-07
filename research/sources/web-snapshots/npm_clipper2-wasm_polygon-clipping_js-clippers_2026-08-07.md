<!-- PRESERVED WEB SNAPSHOT (survey of the JS 2D-clipping/offset ecosystem)
URLs:
  https://github.com/xaviergonz/js-angusj-clipper (+ /blob/master/README.md, /docs/faq/index.md)
  https://www.npmjs.com/package/clipper2-wasm  (https://github.com/ErikSom/Clipper2-WASM)
  https://npmx.dev/package/clipper2-ts          (Jeremy Tribby TS port)
  https://github.com/mfogel/polygon-clipping    (npm: polygon-clipping)
  https://www.npmjs.com/package/polygon-offset
  https://lib.rs/crates/clipper2-rust            (license corroboration)
Accessed: 2026-08-07 (UTC)
Method: WebSearch + WebFetch extraction of load-bearing fragments
Cited by: threejs-block45
-->

# JS 2D polygon clipping / offsetting ecosystem — preserved fragments

Extracted 2026-08-07:

## js-angusj-clipper (xaviergonz)
> "A library to make polygon clipping (boolean operations) and offsetting **fast** on Javascript
> thanks to WebAssembly with a fallback to Asm.js, based on the excellent Polygon Clipping (also
> known as Clipper) library by Angus Johnson."
- Port of Clipper **1** (Angus Johnson's original Clipper).
- "Note that they MUST be integer coordinates" when creating polygons.
- FAQ: "Clipper accepts integer coordinates as large as ±9007199254740991 (Number.MAX_SAFE_INTEGER)
  ... Because the Clipper Library only operates on integer coordinates, you may need to scale your
  coordinates (eg by a factor of 10) to improve precision."
- Formats: WebAssembly (~0.2s) with an Asm.js fallback (~0.5s).
- License: repository LICENSE is MIT (not restated in the fetched README excerpt).

## clipper2-wasm (ErikSom)
- "WASM port of Clipper 2 for Polygon Clipping and Offsetting."
- npm `clipper2-wasm`, latest v0.4.0, last published ~2 months before 2026-08-07 (recent/maintained).
- Site: https://eriksom.github.io/Clipper2-WASM/

## clipper2-ts (Jeremy Tribby)
- "a TypeScript port of Angus Johnson's Clipper2 library for polygon clipping, offsetting, and
  triangulation." Pure TS (no WASM).

## polygon-clipping (mfogel) — pure JS Martinez-Rueda-Feito
- "Apply boolean polygon clipping operations (union, intersection, difference, xor) to your Polygons
  & MultiPolygons." Handles holes/multipolygons.
- Complexity O((n+k)·log n), n = total edges, k = intersections.
- Floating-point robustness caveat: env vars `POLYGON_CLIPPING_MAX_QUEUE_SIZE` and
  `POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS` (default 1,000,000) "aim to prevent infinite loops
  usually caused by floating-point math round-off errors." (i.e. it uses floating point and can loop
  on round-off; the caps are a guard, not a fix.)
- PolyBoolJS: "uses formulas that take floating point irregularities into account via a configurable
  epsilon value."

## polygon-offset (npm)
- "A polygon offsetting algorithm, aimed for use with leaflet. ... depends on Martinez polygon
  clipping algorithm, and combined with it weighs ~14kb."

## License corroboration
- Clipper2 (and its Rust binding) is under the **Boost Software License 1.0**.
