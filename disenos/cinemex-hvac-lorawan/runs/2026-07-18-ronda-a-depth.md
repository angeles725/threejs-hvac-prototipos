# Ronda A — visual depth restyle (2026-07-18)

Scope: `disenos/cinemex-hvac-lorawan/` only · FAST MODE (no new tests) · single writer.
Client brief: the interface felt "too flat, white and basic" — deeper, more dynamic, more
technical, more compact, stronger hierarchy, colors with illumination/depth instead of flat
fills. Every new tone is DERIVED from the current B43 palette (accent `#3b6ff5`, ink
`#1b2430`, ground `#f2f4f8`) via `color-mix` / transparency / lighter-darker steps — the
reference mockups' palette was NOT copied.

## Files touched

- `styles.css` — the entire round (+1051 / −109 lines). **Only file changed.**
- `src/scene/*`, `main.js`, `index.html`, `sections.mjs`: untouched (boot optimization
  protected; all depth work landed through shared CSS on existing class hooks).
- `publish/` rebuilt via `node build-publish.mjs`.

## Tokens added (`:root`)

Extended, never renamed — every legacy var (`--ground`, `--line`, `--card-shadow`,
`--card-radius`, `--text`, `--focus`) is mapped onto the new set.

| Token | Value | Derivation |
|---|---|---|
| `--background` | `#eef1f7` | ground, one step deeper so white cards float |
| `--surface` / `--surface-elevated` | `#fbfcfe` / `#ffffff` | cool near-white pair feeding the card gradient |
| `--surface-hover` | `color-mix(accent 5%, white)` | row/hover wash |
| `--border` | `#dbe1ed` | one step deeper than the old `#e1e6ef` |
| `--text-primary` / `--text-secondary` | ink / muted | aliases |
| `--success/--warning/--danger/--info` | ok/warn/alarm/accent | semantic aliases |
| `--shadow-sm/md/lg` | layered ink-hue pairs | sm = hairline; md = card default (`0 1px 2px` + `0 10px 30px`); lg = hover |
| `--radius-sm/md/lg` | 8 / 12 / 16 px | `--card-radius` now rides `--radius-lg` |
| `--glow-accent/success/warning/danger` | `color-mix(semantic 78–85%, white)` | ambient blob colors |
| `--glow-info` (= `--glow-violet`) | `color-mix(accent 55%, alarm)` | derived violet for Energía's donut card |
| `--t-fast` | `0.18s` | one shared 150–250 ms micro-interaction duration |

### Contrast table (computed, WCAG 2.1)

| Pairing | Ratio | Verdict |
|---|---|---|
| ink `#1b2430` on surface `#fbfcfe` | 15.2:1 | AAA |
| muted `#5c6b84` on surface `#fbfcfe` | 5.2:1 | AA (floor kept) |
| muted on white | 5.3:1 | AA |
| muted on `--surface-hover` `#f5f8fe` | 5.0:1 | AA |
| accent-ink `#2a55c9` on accent-soft `#dce7ff` | 5.2:1 | AA |
| white on accent-strong `#2e5fe0` | 5.5:1 | AA |
| ok-ink `#166a4a` on ok tint ≈`#e9f8f2` | 6.1:1 | AA |
| warn-ink `#8a5a00` on warn tint ≈`#fdf1e0` | 5.4:1 | AA |
| alarm-ink `#b3261e` on alarm tint ≈`#fce9ea` | 5.6:1 | AA |

No text color was lightened; only backgrounds moved (and stayed near-white).

## Card system

- Base `.card`: 1px `color-mix(border 80%, transparent)` hairline, `--radius-lg`,
  `linear-gradient(145deg, near-white → surface)`, layered `--shadow-md`,
  `position:relative; overflow:hidden`.
- `.card::after`: ambient corner glow — 65%×70% blob at right/bottom, `blur(45px)`,
  opacity ≤ .18, driven by `--card-glow` (transparent by default → glow is opt-in).
- Temperament map (all via EXISTING classes, `:has()` keys off the icon-tile state):
  - KPI/promo/hero cards → accent glow, hover lift (−2px + accent border + `--shadow-lg`).
  - `.kpi-card:has(.tile-ok/.tile-warn/.tile-alarm)` → green / amber / red tenue glow —
    this makes the Alertas summary trio glow by severity for free, glow moved to the
    ICON corner (top-left) on that row. Never a filled row.
  - Content/table cards → neutral, no glow. Informative asides → `--shadow-sm`, muted.
  - Energía donut card → derived-violet glow at 0.14 opacity.
  - `.nota-card` (Horarios) → amber flat fill REPLACED by amber hairline + amber ambience.
- Interactive: `.scene-select` (the one truly clickable card family) lifts with cursor
  pointer; KPI cards lift without claiming clickability.

## Layout / header / sidebar

- Shell density: paddings/gaps 0.8 → 0.65 rem; page grid gap 0.7 rem; card padding
  0.7/0.85 rem; menu lane 14.5 → 13.5 rem.
- Header slimmed: 4.6 → 3.4 rem min-height, smaller title clamp; right side keeps
  "Sistema listo · Telemetría en vivo" + Cartelera (now gradient-lit primary button).
- Breadcrumb: active section renders as an accent CHIP inside "Inicio / …" + the existing
  short description line stays.
- Sidebar: items 2.25 → 2 rem, tighter groups; active item = ELEVATED surface (white bg,
  soft shadow, inset 3px left accent bar, accent-ink text); brand block separated by a
  hairline; bottom connectivity line restyled as a compact green-dot status chip
  (same truthful "UG67 en línea · 14 nodos UC100" text).

## Tables (all sections)

Header band: small-caps on an accent-4% tint with a stronger bottom rule; rows tightened
(0.3 rem padding), hover wash `--surface-hover`, separators at `color-mix(border 60%,
transparent)`; numeric columns stay right-aligned tabular; kebab/sort/search/export/
pagination untouched (restyle only).

## State badges (9b)

One vocabulary, zero markup changes: `.pill` (dot + ink + low-opacity tint + subtle
`currentColor` border, 999px), `.sev` upgraded from text+dot to the same badge anatomy
(crítica/advertencia/resuelta), `.tag-chip`, `.count-badge`, `.nav-badge` aligned. Covered
states as they exist in the data: Correcto/Automático/Resuelta (ok), En espera (ok),
Enfriando/Activa (accent), Advertencia (warn), Crítica (critical), N/D stays honest text.
No states invented.

## Micro-interaction

150–250 ms transitions on buttons, nav, rows, cards; `:focus-visible` = 2px accent ring
(offset 2px) on buttons/inputs/selects/links; `prefers-reduced-motion` keeps depth but
disables hover transforms. No decorative animation added.

## Per-page deltas (CSS-only)

- **Tablero**: dock KPI trio glows + hovers (`.kpi-row > .card`); floating selection card
  and viewer badge now frosted (translucent + `backdrop-filter: blur`) for legibility over
  the 3D; 3D stays protagonist.
- **HVAC / Ventiladores / Cuarto / Energía**: KPI strips glow (state-aware), tables denser
  with tinted header band + hover; toolbars/search get inset depth + focus ring.
- **Alertas**: summary cards = tenue severity illumination behind the icon corner;
  severity is a badge in the table; no full-row fills.
- **Iluminación**: scene cards lift on hover; active scene = gradient accent tint;
  timeline active row gets a left accent bar; progress bar inset + gradient fill.
- **Clima**: hero illustration on a radial-lit disc; rain bars/ring on gradient inks.
- **Horarios**: week slots = gradient accent tint + hairline (no flat fill); NOTA card
  amber ambience; next-change banner gradient tint.
- **Tendencias**: instrument tiles stay muted/hairline (informative temperament).

## Verification

- `node --test tests/*.test.mjs` → **331 pass / 0 fail** — zero test edits needed
  (additive CSS only; the two styles.css content asserts — `.selection-card`,
  `body.embed … display: none` — kept intact).
- No JS touched → no `node --check` targets.
- `node build-publish.mjs` → rebuilt OK.
- Eye-check (headless Chrome 150, swiftshader, 1600×1000): all 10 sections + Tablero KPI
  hover (CDP mouse move) + focus-visible captured, **zero console errors**:
  `runs/assets/ronda-a-depth-{tablero,tablero-kpi-hover,focus-visible,hvac,ventiladores,cuarto,iluminacion,energia,tendencias,alertas,clima,horarios}.png`
- Self-review vs. brief: cards differentiated by temperament (no identical white
  rectangles) ✓ · glows visible but subtle ✓ · hierarchy KPI vs content obvious ✓ ·
  tables denser ✓ · sidebar compact + elevated active + connectivity chip ✓ ·
  contrast AA everywhere (table above) ✓.

## Deviations / judgment calls

1. **No new badge builder in `sections.mjs`** (9b): the existing `modePill` builder +
   pill/sev classes already form a single closed vocabulary; unifying them visually in
   CSS achieved the brief with zero markup/test risk (FAST MODE). Revisit only if new
   states appear.
2. **Tablero dock KPI cards** carry no `.kpi-card` class in markup; covered with a
   `.kpi-row > .card` CSS rule instead of touching the builder.
3. **`--glow-info` = derived violet** (`color-mix(accent 55%, alarm)`) — the only "new"
   hue, used exclusively as a sub-20%-opacity ambience on the Energía donut card, per the
   blue/violet-for-energy reference principle.
4. Banners (`.ok-banner`, `.info-banner`, week slots, timeline active) kept a tint but as
   directional gradients + hairlines — reads as light, not as a flat fill.
5. Full responsive overhaul deferred (per brief): existing 1279/767 folds preserved
   verbatim; only lane widths/paddings tightened.
