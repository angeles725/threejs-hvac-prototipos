# Client waiver — navy ground + radial gradient wash on the interactive dashboard

- **Date**: 2026-07-15
- **Requested by**: end client, relayed by the operator, twice ("otro color, como un difuminado"),
  sustained after the certified B15 surface-hierarchy treatment was shown.
- **Decision path** (recorded in session): (1) certified B15 panel layering applied first;
  (2) B41 Command-Canvas evaluated as the only certified gradient grammar — rejected for this
  surface because B41 is a NON-INTERACTIVE presentation-wall vibra (B41-11 bans hover/tooltips,
  B41-9 demands wall-derived ratios) and this page is an interactive operator console;
  (3) client chose the re-skin with waiver over a separate certified wall page.
- **What shipped**: token swap to a deep-navy ground borrowed from the B41 corpus-assigned table
  (`--canvas #0A1E3C`, `--panel #122B54`, `--panel-2 #1A3766`, `--rule #1E4380`, ink `#E6F1FF`
  14.55:1 AAA, muted `#9DB8D9` 8.14:1 AAA — WCAG figures from the corpus assignment) plus ONE
  fixed radial wash on `body` (`#14335F → #0E2749 → #0A1E3C`, top-center). Status hues
  (go/amber/alarma/brand) unchanged — semantics preserved.
- **Certification status**: this ambient treatment is NOT covered by the B15 delivery receipt
  (B15-6 forbids glow/blur; ai-tells flags a gradient canvas as `patterned-canvas` WARN) and is
  NOT B41-certified (interactive 16:9 console). It ships as an explicit, documented client
  preference. Everything else (layout, type, interaction grammar, data truth) remains as gated.
- **Extension (same day)**: gradient strengthened to a clearly visible wash
  (`#2A5CA8 → #1A4179 → #102E5A → #0A1E3C`) and **glassmorphism** added on the two panel
  containers (`.tablero`, `.paneles`): `rgba(18,43,84,.42)` + `backdrop-filter: blur(14px)`,
  1px light borders, 12px radius, with a solid `--panel` fallback under `@supports` for
  browsers without backdrop-filter. Both explicitly requested by the client; both are
  canonical AI-slop tells (frosted glass over gradient) and remain OUTSIDE certification.
- **Extension (same day, 2)**: header (`.marquesina`) iterated per client: solid brand red →
  pastel rose (`#F2BFC6`, then `#E8949E`) → final: a **red sibling of the body wash**
  (radial blend `#C24D5E → #8A2638 → #58131F`), light ink, navy back button
  (`--brand-ink #0A1E3C`). The solid brand-red surface (the one brand-red surface the B15
  build allowed) is gone while this waiver stands; `--brand-pastel` remains as an unused
  token of the middle iteration.
- **Lint status**: `anti-ai-lint` now exits BLOCKED on this file (`CRIT:glassmorphism`,
  3 matches — `backdrop-filter: blur`). This is correct behavior, not a defect: the rule is
  comment-blind by design and has no justification escape for live code. The BLOCK is
  accepted under this waiver; the page no longer claims an anti-ai-ui certified pass.
  Functional gates stay green: suite 280/280, WCAG ink contrast AAA on all panel surfaces.
- **Rollback**: revert the `:root` token block, the `body` radial-gradient rule, and the
  `.tablero,.paneles` glass block in `dashboard.html` to restore the certified B15 skin
  (values in git history).

---

## Superseded (2026-07-15)

- **Date**: 2026-07-15 (same day, later session).
- **What happened**: the client superseded the navy/gradient/glass direction entirely with a
  light SaaS reference (RoutaX-style logistics dashboard): pale cool-gray ground (`#F2F4F8`),
  floating white cards (14px radius, one soft ambient shadow `0 8px 24px rgba(20,30,60,.08)`),
  a single blue accent family (`#3B6FF5` / `#2E5FE0` / `#2A55C9` / `#DCE7FF`), near-black
  blue-gray ink (`#1B2430`), status pills as colored dot + tinted background.
- **What changed in code**: the `body` radial-gradient wash and the `.tablero,.paneles`
  glassmorphism block (`backdrop-filter` + `@supports` fallback) were **REMOVED** from
  `dashboard.html`, not overridden — a regression test now asserts the file contains neither
  `backdrop-filter` nor `radial-gradient`. The full token block was replaced by the light
  palette (WCAG recomputed: ink 15.7:1 AAA on white, dim `#5C6B84` 5.3:1 AA, status inks
  5.2–5.9:1 on their tints). Status semantics preserved (OK green / SIN COMS amber /
  ALARMA red). The 3D viewer chrome and scene background moved to the same light direction.
- **Waiver status**: the waiver above is now historical record only; nothing in the shipped
  skin relies on it. The rollback instructions above no longer apply.
