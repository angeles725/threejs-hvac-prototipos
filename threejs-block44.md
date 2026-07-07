# Block 44 — Prototype module scoping gotcha: inner-scope interaction block + `window.__` exposure (hover-bug post-mortem)

> **What**: Post-mortem of a scope bug that silently broke the new floor-hover feature in
> `hotel-realista-ensamblado.html`, and the reusable STRUCTURAL fact it exposed about how the prototype's
> single module is organized. Also records the WSL/browser-cache + headless-WebGL gotchas that dominated the
> debugging time.
> **Finding**: the room/equipment INTERACTION block (roomData, hitboxes, `selectUnit`, the hover code) lives
> in an INNER scope — NOT the module top level. Anything the OUTER scope (the `animate()` loop, the zoom
> pointer handler) must call has to be exposed via `window.__…`. A new per-frame function referenced across
> that boundary under a `typeof` guard failed **silently**: no red error, no call, scene loaded fine.
> **Sources**: `hotel-realista-ensamblado.html` `[CERT]` — one `<script type="module">` (~L547-8180);
> `window.__roomClick` (L7733), `window.__openDetail` (L8189), `window.__hoverState`, `animate()` (~L1649).
> **Markers**: `[CERT]` local primary · `[INFER]` deduction. Block type: **ENGINEERING GOTCHA / CORPUS ARCHITECTURE**.

---

## 44.1 — The module is ONE script but NOT one scope `[CERT]`

`hotel-realista-ensamblado.html` has a single `<script type="module">`. It is tempting to treat every
top-level `const`/`function` as sharing one module scope — but the room/equipment interaction block
(`roomData`, `roomHitboxes`, `selectUnit`, `selectRoom`, click-raycast, and the added hover code) is nested
in an INNER scope (2-space indented; it does not sit at module top level). The tell: everything the outer
scope needs is re-exported onto `window`:

- `window.__roomClick` (L7733) — read by the module-top zoom handler (`if (window.__roomClick && …)`, ~L1633).
- `window.__openDetail` (L8189), `window.__hoverState` — reached from outside the block.

So the boundary is real and already worked-around by convention throughout the file. `[CERT]`

## 44.2 — The bug: a cross-scope reference the `typeof` guard swallowed `[CERT]`

The floor-hover feature added `function _resolveHover()` INSIDE the interaction block and called it from
`animate()` (outer scope) with:

```js
if (typeof _resolveHover === 'function') _resolveHover();   // ← never ran
```

`animate` cannot see the inner-scope `_resolveHover`. Referencing the bare identifier is a would-be
`ReferenceError`, but `typeof <undeclared>` is the ONE expression that returns `'undefined'` WITHOUT throwing.
So the guard evaluated false every frame: no call, no hover, **and no error in the console**. The scene
rendered perfectly, which made it look like a visual/CSS problem for many iterations. `[CERT]`

Anti-pattern: a `typeof fn === 'function'` guard around a call whose target is expected to always exist HIDES
a scope/loading bug instead of surfacing it. `[INFER]`

## 44.3 — Diagnosis method — what actually located it `[CERT]`

- A manual `window.__hoverState()` console probe returned `rayHits:1` and was MISLEADING: it does its own
  raycast, so it proved the raycaster/hitboxes work but NOT that the render loop calls `_resolveHover`.
- A load-time `console.log('[HOVER] init OK …')` fired → the block executed and found its DOM/hitboxes.
- A **throttled heartbeat** `console.log` placed at the top of `_resolveHover` NEVER fired → definitive proof
  the function was not being called per frame, despite existing and being syntactically valid.
- `node --check` passed throughout (duplicate/again: syntax is not the gate for scope/runtime wiring). The
  `window.__roomClick` convention then pointed straight at the scope boundary. `[CERT]`

## 44.4 — Fix + the reusable rule `[CERT]`

Expose the function on `window` exactly like the block's existing exports, and call it through `window`:

```js
// inside the interaction block:
window.__resolveHover = _resolveHover;
// inside animate() (outer scope):
if (window.__resolveHover) window.__resolveHover();
```

**Rule for this corpus**: any function defined in the interaction block that must be invoked from
module-top code (the `animate` loop, resize/zoom handlers) MUST be exposed via `window.__…`. Do not rely on
a bare cross-scope identifier — and never wrap such a call in a `typeof` guard, which converts a scope error
into silent no-op. `[CERT]`

## 44.5 — Environment gotchas that dominated the debug time `[CERT]`

- **Browser cache**: reloading the SAME URL — even a cache-busted one like `?nocache=1` — served the browser's
  cached copy, so edits appeared to have no effect ("nothing works"). Reusing a cache-buster is itself
  cacheable. Fix: a dev server that sends `Cache-Control: no-store, no-cache, must-revalidate` (a tiny
  `http.server` subclass); then a plain F5 always fetches fresh. `[CERT]`
- **Headless WebGL**: in this WSL environment Chrome cannot create a WebGL context
  (`llvmpipe`/ANGLE → `Error creating WebGL context`), so the module aborts at `renderer` creation and NONE of
  the later code runs — there is no automated visual QA here. `node --check` on the extracted module script is
  the only automated gate; visual verification is the user's, on localhost. `[CERT]` (see [Block 1] baseline,
  and the WebGL-headless note in project memory.)

---

## Cross-links

- [Block 43] — the detail-OVERLAY build plan whose hover/selection interaction lives in the same inner block.
- [Block 1] — corpus baseline / how the prototypes use three.js (module structure).
