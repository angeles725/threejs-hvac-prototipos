# 2026-07-19 — Characterization pass (freeze the FAST-MODE era)

The client approved the shipped product. This pass freezes the approved-but-untested behavior
that landed across the day's FAST-MODE rounds as characterization tests, so strict TDD can
resume without silently regressing it. Tests-only run — **no product file was touched**. No commit.

## What got frozen

New file: `tests/characterization-2026-07-18.test.mjs` (13 tests). All assert CURRENT behavior
as-is, structurally (token/rule presence + pure math), never pixel/whitespace-sensitive.

| # | Surface | What is pinned |
|---|---------|----------------|
| 1 | Design tokens (Ronda A) | Full `:root` token set present (background/surface/surface-elevated/surface-hover/border/text-primary/text-secondary/success/warning/danger/info/shadow-sm·md·lg/radius-sm·md·lg + the 5 glow tokens); radius ladder = 8/12/16px; `--shadow-md` is the layered hairline+drop pair. |
| 1 | WCAG floors (computed) | Parses the actual `--ink`/`--muted`/`--surface` hex from styles.css and computes WCAG 2.1 contrast in-test (pure math, no DOM): ink/surface = **15.25:1 ≥ 7** (AAA), muted/surface = **5.26:1 ≥ 4.5** (AA). |
| 2 | Card system (Ronda A) | `.card` base = 145deg gradient + `var(--shadow-md)` + `var(--radius-lg)`; `.card::after` glow blob = `blur(45px)`, opt-in (`transparent` default), opacity default ≤ 0.2 fill cap; KPI hover lift (`translateY(-2px)`) exists AND is re-set to `none` inside the `prefers-reduced-motion` block. |
| 3 | Responsive guards (Ronda B) | Global `* { min-width: 0 }`, `html,body { overflow-x: clip }`, `img/svg/canvas/video { max-width: 100% }`; fluid tokens `--page-padding/--section-gap/--card-padding/--grid-gap` are `clamp()`, `--sidebar-width`/`--header-height` present. |
| 3 | Drawer a11y (index.html) | `button.menu-drawer` declares `aria-expanded="false"` + `aria-controls`. |
| 3 | Table transform hooks | `renderSectionHtml('hvac'/'energia')` output carries `data-th` labels, `cell-sec` secondary-column marks, `class="row-expand"`, and `data-row-detail="<section>:…" aria-expanded="false"`. |
| 4 | bfcache (main.js source) | `pagehide` always `setRenderLoop(false)` and disposes ONLY `if (!event.persisted)`; `pageshow` early-returns unless persisted, then `runtime.resize()` + `workbench?.resyncClock()` + resumes the loop; `resyncClock()` refreshes the alerts badge + re-renders the active section. |
| 5 | Branding favicons | BOTH `index.html` and `dashboard.html` link `rel="icon"` PNG (`favicon-32.png`) + `apple-touch-icon.png`; the retired inline SVG data-URI favicon must not resurrect. |

## What was already covered (deliberately NOT duplicated)

- **Section anatomy / round-4 & round-5 contracts** — `tests/client-round4.test.mjs`,
  `client-round5.test.mjs`, `dock-sections.test.mjs` already pin the KPI strips, toolbars,
  sortable/filterable/paged tables, CSV export, donut, sim-clock formatting, and the sidebar
  brand block (`brand-logo` / removed `brand-mark`+"Water Core"). Not re-asserted.
- **Interior prune guards** — `tests/lighting-camera.test.mjs` already owns the
  `PRUNED_BUILD_SURFACES` pin set and the pruned-instance/light `=== 0` asserts; `p6-l2`/`p6-l4`
  own their pruned-channel/staff asserts. Not re-asserted.
- The one responsive hook round-B already touched (`data-th="kW"` on the energía kW cell) stays
  owned by `client-round4.test.mjs`; this pass pins the *general presence* of the hooks instead.

## What I chose NOT to characterize (and why)

- **Single-boot-evidence-call batching** (task item 6) — SKIPPED. It is a runtime/ordering
  property of the boot sequence, not cheaply or non-brittly assertable from static source; a
  source-grep contract here would be flaky and could break on any benign boot-code reshuffle.
  Characterization must not create flaky contracts, so it was left out per the run's own rule.
- **Per-viewport / pixel layout** (tier reflow, sticky thead, 44px touch targets) — these are
  eye-checked in the Ronda-B run under headless Chrome; asserting them here would require a DOM
  and be viewport/whitespace-brittle. Pinned only the deterministic markup/token hooks that drive
  them.

## Follow-up findings

None. No bug surfaced while characterizing — every approved surface behaves as its run note
describes, and all parsed values (hex tokens, glow opacity, radius ladder, shadow layering,
bfcache handler shape) matched the documented contracts exactly.

## Verification

- `node --check tests/characterization-2026-07-18.test.mjs` — clean.
- New file alone: **13 pass / 0 fail**.
- Full suite `node --test tests/*.test.mjs` — **305 pass / 0 fail** (was 292; +13 new).
- Tests-only run: zero product files touched, no publish rebuild needed.
