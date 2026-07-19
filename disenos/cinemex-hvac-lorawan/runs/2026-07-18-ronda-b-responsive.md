# Ronda B — responsive overhaul (2026-07-18)

Scope: `disenos/cinemex-hvac-lorawan/` only · FAST MODE (no new tests) · single writer.
Client brief: real responsive adaptation for desktop / laptop / tablet / mobile — reorganize by
available space, never just shrink. Ronda A's depth system (tokens, glows, card temperaments,
compact chrome) is preserved wholesale; this round only ADAPTS it. `src/scene/*` untouched
(boot optimization protected); all 3D sizing is CSS/container-driven.

## Files touched

- `styles.css` — global guards, fluid tokens, tier restructure, table strategies, drawer
  polish, touch/a11y layer (in-place edits + one appended `RONDA B` section, ~+220 lines net).
- `src/dock/sections.mjs` — `td()` grew `data-th` (card labels) and `cell-sec` (tablet-hidden
  columns); per-row detail reveal (`rowExpandButton`/`rowDetailHtml`) for HVAC, Energía and
  Flota RTU; the Ventiladores/Alertas kebab sheets restate their hidden column. Builders stay
  pure and deterministic — same tick + view → same HTML.
- `main.js` — delegated `data-row-detail` view-state branch; drawer `aria-expanded` + body
  scroll lock; navigating from the drawer restores focus to its trigger.
- `index.html` — the drawer button declares `aria-expanded="false"` + `aria-controls`.
- `tests/client-round4.test.mjs` — 2 conscious edits (below). No other test changed.
- `publish/` rebuilt via `node build-publish.mjs`.

## Breakpoint strategy

Fluid first (auto-fit + `minmax(min(100%, X), 1fr)`, `clamp()` spacing/type), queries only
where the layout truly reorganizes:

| Tier | Range | Shell |
|---|---|---|
| Desktop | ≥1440 | 3-lane workbench (menu 13.5rem · hero · dock 26.5rem), full tables |
| Laptop | 1024–1439 | same skeleton; sidebar 12rem, dock 21rem narrow first |
| Tablet | 768–1023 | menu = icon rail (title+aria tooltips, pinnable expand); the 3rd lane dies — dock drops BELOW the hero full-width; pages own the whole area beside the rail |
| Phone lg | 600–767 | vertical stack, body owns scroll, drawer menu, 3D `clamp(17rem, 58dvh, 34rem)` |
| Phone | 320–599 | tables → labeled card lists, chip rows scroll, forecast carousel, selection bottom sheet |

Global guards (client-sanctioned pattern): `* { min-width: 0 }`, `img/svg/canvas/video
{ max-width: 100% }`, `html, body { overflow-x: clip }`, shell `max-width: 1920px` +
`padding: var(--page-padding)`.

Tokens added: `--page-padding`, `--section-gap`, `--card-padding`, `--grid-gap`,
`--sidebar-width` (drives `--menu-w`), `--header-height`. **Judgment call:** the brief's
absolute clamp values would have inflated Ronda A's approved compact desktop density (e.g.
24px card padding, 2rem titles); the clamps are re-anchored so the Ronda A look is the
CEILING and sizes only breathe downward. KPI value type rides
`clamp(1.7rem, 1.15rem + 1.3vw, 2.45rem)` (heroes) / `clamp(1.35rem, …, 1.6rem)` (cards).

## Table strategy (per width, same builders)

- **≥1280**: full table; headers stick to the page scroller (`.card` moved `overflow: hidden →
  clip` so cards stop being scroll containers — that is what makes sticky possible). The
  alerts card keeps its own x-scroll and opts out.
- **600–1023**: secondary columns hide via `cell-sec` (HVAC: Consigna · Energía: V, FP ·
  Ventiladores: Fuente · Flota: Horas ventilador, Gabinete · Alertas: Categoría). Every
  hidden datum stays reachable: chevron `row-expand` toggles a labeled detail row (HVAC,
  Energía, Flota — delegated `data-row-detail` view state); the Ventiladores/Alertas kebab
  sheet restates its hidden column. First column is sticky inside the x-scroll; edge shadows
  (`background-attachment: local`) signal residual horizontal scroll.
- **≤599**: every table renders as a stack of CARDS from the same builder output — CSS-only
  transform driven by `data-th` labels (`td::before { content: attr(data-th) }`). Identity
  cell leads, badges stay badges, the action affordance floats top-right, kebab/detail rows
  read as sheets attached to their card. No data is removed at any width.

## Per-page adaptations (highlights)

- **Tablero**: tablet = hero over full-width dock beside the rail; phone = static full-width
  3D at `clamp(16rem, 55dvh, 30rem)`, `touch-action: pan-y !important` on the canvas so
  one-finger vertical pan scrolls the page while horizontal drags orbit; selection card
  becomes a bottom sheet (safe-area padded); zones table → cards.
- **HVAC / Energía / Cuarto / Ventiladores**: KPI strips reflow by auto-fit; toolbar search
  goes full-width on phone; filter chips scroll horizontally; tables per the strategy above.
- **Alertas**: chips horizontally scrollable; summaries reflow 3→2→1; derivación falls below;
  alert cards carry dispositivo + severidad + detalle + fecha + estado, kebab sheet = full
  info + acciones.
- **Clima**: current-conditions hero first; 5-day forecast becomes a snap horizontal carousel
  on phone; derived cards stack.
- **Horarios**: 7-day grid → 3-col (tablet) → 2-col day cards (phone); consignas table →
  labeled cards; countdown banner wraps.
- **Tendencias**: grid auto-fills 16.5rem tiles → single column on phone (all 28 tiles kept —
  a unit selector was NOT added; see deviations).

## A11y / touch checklist

- [x] Drawer: `aria-expanded` on trigger, scrim + outside tap close, Escape close, focus trap
  (pre-existing), focus restored to trigger on close AND on navigate, body scroll lock,
  `aria-current` preserved, safe-area padding.
- [x] Icon rail keeps accessible names (`title` on every `.nav-item`).
- [x] 44px touch targets ≤1023 (nav items, toolbar buttons, chips, search input ≥2.75rem;
  pager/kebab/expand ≥2.4–2.5rem), no hover-only affordances (focus-visible everywhere).
- [x] `aria-expanded` on every disclosure (filters, kebabs, row reveal, history toggle).
- [x] No bare `100vh` — the 3D height uses `dvh`; body owns the main scroll on phone;
  `scroll-margin-top` on page/dock children; `prefers-reduced-motion` respected (Ronda A).
- [x] Sparklines: `viewBox` + `preserveAspectRatio="none"` + `vector-effect` — scale to any
  container width, no fixed px.

## Validation matrix

Harness: scratchpad `ronda-b-capture.mjs` + `ronda-b-extra.mjs` (puppeteer-core, headless
Chrome 150, swiftshader). Per capture the script asserts
`scrollingElement.scrollWidth <= clientWidth + 1` and collects console errors.

- 10 viewports × {tablero, hvac, energia, alertas}: 1920x1080, 1440x900, 1366x768, 1024x768,
  820x1180, 768x1024, 430x932, 390x844, 375x667, 320x568 → **40/40 PASS**, zero console
  errors, `data-app-ready` reached everywhere (WebGL boots under swiftshader).
- Extras: 390x844 drawer-open · 390x844 alertas-card-expanded · 820x1180 hvac-row-detail →
  PASS; supplemental sections (ventiladores/cuarto/iluminacion/tendencias/clima/horarios at
  1440, 820, 390) → 14/14 PASS.
- Sticky thead verified scripted + visually at 1366x768 HVAC (`thTop === scrollerTop` after
  scroll): `runs/assets/ronda-b-resp-1366x768-hvac-sticky.png`. (At 1440 the energía page is
  too short to scroll past its header — nothing to stick.)
- Screenshots: `runs/assets/ronda-b-resp-<viewport>-<section>.png` (47 files), all visually
  reviewed: no clipped text, tables usable, sidebar mode correct per tier, 3D height usable,
  cards keep depth/glows, primary data leads, nothing reads as "desktop shrunk".
- `node --check` on `main.js` + `sections.mjs`; full suite **331/331 green**; publish rebuilt.

## Conscious test edits (FAST MODE contract)

1. `tests/client-round4.test.mjs` (energía kW assertions, 2 regexes): the kW cell now carries
   `data-th="kW"` so the phone tier can label it as a card row. The asserts were
   `/<td class="num">([\d.]+)<\/td>/` (first bare numeric td); they now target
   `/<td class="num" data-th="kW">…/` — same meaning, more precise. No behavior changed.

## Judgment calls / deviations

- Clamp values re-anchored to Ronda A densities (identity > literal token values).
- Fullscreen affordance NOT added: `tests/dock-sections.test.mjs` asserts
  `doesNotMatch(main, /fullscreen/i)` and the client mandate that removed `#fullscreen-toggle`
  still stands; there are no other floating 3D controls left to group.
- Mobile filters render as a horizontally scrollable chip panel inline (not a fixed bottom
  sheet): keeps the outside-tap/close semantics trivial and the state delegated; filter state
  survives breakpoint changes because it lives in view-state and no resize handler resets it.
- Tendencias keeps all 28 tiles in one column on phone (deterministic, scannable); the
  optional single-chart unit selector was skipped as new interactive surface in FAST MODE.
- KPI rows use auto-fit, so a 599–500px phone-landscape band may show 2-up compact KPI cards
  instead of a strict single column — intentional (less empty space, all values legible).
- Kebab menus close on re-tap/action, not on outside tap (pre-existing pattern, unchanged).
- Header tablet kebab not needed: the only secondary header item (`#app-status` text) already
  hides ≤1023; dot + Cartelera (primary) remain.
