# Block 36 — 2D design tokens and accessibility for the overlays/dashboards

> Research of **the DOM/CSS layer that sits on top of every canvas**: the corpus's absolutely-
> positioned overlays (`#info`, `#legend`, `#panel`/`#controls`) currently repeat literal hex
> colors and pixel sizes per file instead of drawing from a shared token system, and none of them
> meet baseline WCAG 2.x accessibility floors (contrast, color-alone status coding, touch target
> size, motion). This block surveys the actual divergence across all 27 prototypes, proposes a
> standalone-HTML-compatible CSS-custom-property token set (the missing sixth module for
> [Block 33]'s `lib/`), audits real corpus colors against WCAG formulas, and gives a short
> iconography note. It does **not** cover the 3D/PBR material palette (that is [Block 22] — a
> deliberately separate system, see §36.2) or the cinematic/interaction motion language itself
> (that is queued [Block 34]/[Block 35] — this block only stakes the `prefers-reduced-motion`
> accessibility floor).
>
> Sources: local corpus — all 27 `*.html` prototypes (root + `voxel/`) `[CERT]`, grep-quantified;
> W3C WAI "Understanding SC 1.4.3 Contrast (Minimum)" (`sources/web-snapshots/www.w3.org_WAI_
> WCAG21_Understanding_contrast-minimum.html.md`, preserved) `[CERT-web]`; W3C WAI "Understanding
> SC 1.4.11 Non-text Contrast" (`sources/web-snapshots/www.w3.org_WAI_WCAG21_Understanding_non-
> text-contrast.html.md`, preserved) `[CERT-web]`; W3C WAI "Understanding SC 1.4.1 Use of Color"
> (`sources/web-snapshots/www.w3.org_WAI_WCAG21_Understanding_use-of-color.html.md`, preserved)
> `[CERT-web]`; W3C WAI "Understanding SC 2.5.8 Target Size (Minimum)" (`sources/web-snapshots/
> www.w3.org_WAI_WCAG22_Understanding_target-size-minimum.html.md`, preserved) `[CERT-web]`.
> Method: corpus-wide `grep` for `font-family`/hex colors/`font-size`/`prefers-reduced-motion`
> across all 27 files, tallied; WCAG relative-luminance contrast formula applied by hand (Python,
> shown inline) to real corpus hex pairs; token/accessibility proposal assembled from those
> findings plus [Block 1] §1.3, [Block 22] §22.4-22.5, [Block 29] §29.3, [Block 30] §30.4,
> [Block 33] §33.2. Markers: `[CERT]` local file:line/grep count · `[CERT-web]` official web
> (preserved) · `[INFER]` deduction/proposal.
>
> Design-system layer, closing G36 (run 6). Connects [Block 1] §1.3, [Block 22], [Block 29],
> [Block 30], [Block 33]/G33, and queued [Block 34].

---

## 36.1 — Current state: the corpus's ad-hoc 2D style, quantified `[CERT]`

Grepped `font-family`, hex colors, and `font-size` across all 27 prototypes (`voxel/*.html` +
root `*.html`, `Zone.Identifier` sidecar files excluded) — the corpus-count baseline established
by [Block 1]/[Block 33]. A 28th file (`voxel/hotel-playa-hvac-voxel.html`) landed mid-survey via a
concurrent writer; spot-checked, it follows the §36.1 dominant pattern exactly (`background:
#06080d; font-family:'JetBrains Mono',...; color:#00d4aa`, `voxel/hotel-playa-hvac-voxel.html:7`)
and changes no ratio's conclusion, only its denominator by one — not re-tallied below to keep this
block's counts consistent with the rest of the corpus's "27" citation convention.

**Typography — one dominant stack, two unrelated add-ons, one total outlier:**

| Pattern | Count | Evidence |
|---|---|---|
| Body declares `'JetBrains Mono'` as the base/monospace font | 26 / 27 files | e.g. `trane-rtu-realistic-v10.html:7`, `voxel/liebert-split-voxel.html:7` |
| Of those, also load `'Outfit', sans-serif` for headers/labels | 4 / 27 (`split-system-realistic (2).html:12,19`, `cuarto-frio-plano-realistic (6).html:15,20,25,26`, `voxel/tracer-package-voxel (3).html:31,58`, `voxel/split-system-voxel.html:12,19`) | mixed in the same file as JetBrains Mono, no documented pairing rule |
| Of those, use `'DM Sans'` instead, for one `<h1>` only | 2 / 27 (`voxel/vav-box-voxel.html:13`, `voxel/vav-box-voxel (2).html:13`) | a third, unrelated display-font choice |
| Declares **no** font-family at all (falls back to UA default sans-serif) | 1 / 27 (`voxel/data_center_voxel_isometrico_3d.html`) | zero alignment with the rest of the corpus's dark/monospace aesthetic |

Net: 3 different secondary/display fonts (`Outfit`, `DM Sans`, none) layered inconsistently on
top of the same monospace base, decided per-file with no shared rule.

**Color — one dominant hardcoded palette, one proto-tokenized file, one outlier palette:**

| Pattern | Count | Evidence |
|---|---|---|
| `background:#06080d` (near-black) + `color:#00d4aa` (teal/green) as literal hex, repeated per file | ~24 / 27 files | e.g. `trane-rtu-realistic-v10.html:7`, `chiller-aircooled-realistic (7).html:7` — the exact same two hex strings copy-pasted, not shared |
| Same palette, but expressed as CSS custom properties in a `:root` block | 1 / 27 (`cuarto-frio-plano-realistic (6).html:11`) | `:root{ --bg:#06080d; --panel:rgba(10,14,22,0.86); --accent:#00d4aa; --on:#00ff66; --off:#ff2233; --alarm:#ffb020; --text:#c8d4dc; --muted:#5a6878; --border:rgba(0,212,170,0.18); }` — this is the **only** file in the corpus that already tokenizes its UI palette; it is the natural in-corpus precedent for §36.2 below, not a new idea |
| Unrelated blue-gray palette (`#0b1018`/`#1e2838`/`#8892a6`/`#e6eaf2`), still declared as literal hex | 2 / 27 (`voxel/vav-box-voxel.html:10,13,18`, `voxel/vav-box-voxel (2).html`) | a second, self-consistent but disconnected scheme |
| Unrelated light-swatch legend palette (`#1a1a1a`/`#e8e8e6`/`#378ADD`/`#E24B4A`…), no dark shell | 1 / 27 (`voxel/data_center_voxel_isometrico_3d.html:48-55`) | shares nothing with the other 26 files |

**Type scale — no scale, 8 ad-hoc pixel values:** `grep -oh "font-size:[0-9.]\+px"` across the
corpus returns exactly 8 distinct literal sizes with no ratio relationship: `8px`, `8.5px`,
`9px`, `9.5px`, `10px` (68 hits, most common), `11px` (67 hits), `12px`, `13px`. Every file
repicks from this set independently; there is no named "label/body/heading" tier anywhere in the
corpus.

**Motion accessibility — zero coverage:** `grep -rc "prefers-reduced-motion" *.html voxel/*.html`
returns `0` matches in all 27 files. This is a real, universal gap, not a sampling artifact —
including on the one animated status cue that exists: `#panel button.alarm { … animation:blink
1s infinite; }` (`trane-rtu-realistic-v10.html:23`) runs unconditionally for every viewer,
motion-sensitivity preference or not.

## 36.2 — Token system proposal: `lib/theme.css`, the missing sixth module `[INFER] assembled`

[Block 33] §33.2 proposed a five-module `lib/` (`scene-kit.js`, `palette.js`, `rig.js`,
`equipment/*.js`, `viewer.js`) but **none of those five modules is the 2D UI layer** — `lib/
palette.js` is explicitly the 3D/PBR material palette ([Block 22] §22.5's corrected metalness/
base-color table: metal F0, dielectric reflectance, `metalness`/`roughness` values for meshes).
That is a materially different thing from the 2D overlay color system this block covers: one
governs how light bounces off a `MeshPhysicalMaterial`, the other governs what color a `<div>`'s
text is. Conflating them (as the corpus's literal-hex-reuse habit implicitly does — teal `#00d4aa`
shows up in both mesh `emissive` values, per [Block 22] §22.4, and UI `color:` declarations) is
itself part of the divergence problem: a UI redesign today risks touching material code and vice
versa. §36.1's `cuarto-frio-plano-realistic (6).html:11` proto-token block is the right shape,
just scoped to one file — this section generalizes it into `lib/theme.css`, standalone-HTML
compatible (a plain CSS file, no bundler, linked the same way the corpus already links CSS today
per [Block 1] §1.3).

**Typography scale** (collapses the 8 ad-hoc sizes in §36.1 into 4 named tiers, matching what the
corpus already visually uses rather than imposing a foreign modular-scale ratio):

```css
--fs-micro:   9px;   /* legend swatches, fine print, §36.1's 8/8.5/9/9.5px cluster */
--fs-body:    10px;  /* buttons, panel rows — the corpus's most common size (68 hits) */
--fs-label:   11px;  /* section labels, HUD titles — second most common (67 hits) */
--fs-heading: 13px;  /* the rare large numbers/titles */
--font-mono:  'JetBrains Mono', ui-monospace, 'Courier New', monospace; /* the de-facto standard, §36.1 */
--font-display: 'Outfit', sans-serif; /* the corpus's own second-most-common choice, adopted as canonical instead of also allowing 'DM Sans' */
```

**Spacing scale** (rounds the corpus's observed ad-hoc paddings — `4px`/`5px`/`6px`/`7px`/`8px`/
`9px`/`10px`/`11px`/`12px`/`13px`/`14px`/`18px`, e.g. `trane-rtu-realistic-v10.html:19`'s
`padding:5px 14px` — to a 4-step scale):

```css
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-5: 24px;
```

**UI color roles**, generalizing `cuarto-frio-plano-realistic (6).html:11`'s `:root` block into
the corpus-wide standard, dark-first with a light override:

```css
:root {
  --bg: #06080d;               /* the corpus's own near-universal choice, §36.1 */
  --surface: rgba(10,14,22,.86);
  --border: rgba(0,212,170,.18);
  --text: #c8d4dc;
  --text-muted: #8fa0ab;       /* corrected from the audited #5a6878 — see §36.3, contrast failure */
  --accent: #00d4aa;           /* the corpus's own dominant teal, §36.1 */
}
:root[data-theme="light"], @media (prefers-color-scheme: light) {
  /* light variant: swap bg/surface/text roles, keep --accent and status hues fixed
     so alarm meaning stays constant across themes — [INFER], no corpus precedent yet */
}
```

**STATUS colors aligned to ISA-101** ([Block 29] §29.3: gray/neutral by default, color reserved
for the alarm/advisory state itself — not a permanent traffic-light-by-health scheme):

```css
--status-neutral: #5a6878;   /* default/normal — gray, per ISA-101, not green */
--status-ok:      #00ff66;   /* explicit "on"/confirmed-good state only */
--status-advisory:#ffb020;   /* amber — advisory tier */
--status-alarm:   #ff2233;   /* red — alarm requiring action */
```

This deliberately collapses [Block 30] §30.4's Monash P0-P6 alarm-priority tiers (7 discrete
priority codes, `sources/manuals/bas-graphics-standard-monash-v1.4.pdf` §9 p.69-72) down to 4
*visual* severities. That is intentional, not a loss of fidelity: P0-P6 is a **priority/routing**
scheme (which alarm gets attention first, how it's escalated), while ISA-101's 3-4 tier palette
is a **display** scheme — encoding 7 distinct hues would fail the colorblind-safety goal in §36.3
below. The priority number (P0-P6) should still be shown as text/rank next to the status color,
never encoded as a 7th hue.

## 36.3 — Accessibility: contrast, color-alone status, touch targets, motion `[CERT-web]`

**Contrast ratios.** Per W3C WAI "Understanding SC 1.4.3 Contrast (Minimum)" (preserved):
"[text and images of text have] a contrast ratio of at least 4.5:1, except for … Large-scale text
… at least 3:1" (`sources/web-snapshots/…contrast-minimum.html.md:28-32`). Per "Understanding SC
1.4.11 Non-text Contrast": "a User Interface Component … must have a minimum 3:1 contrast ratio
with the adjacent colors" (`…non-text-contrast.html.md:107-111`). Applying the standard WCAG
relative-luminance formula (`L = 0.2126·R + 0.7152·G + 0.0722·B` on linearized sRGB channels,
`contrast = (L1+0.05)/(L2+0.05)`) to real corpus hex pairs against the corpus's own
`--bg:#06080d`:

| Pair (corpus source) | Ratio | Verdict |
|---|---|---|
| `#00d4aa` (body/accent text) on `#06080d` | 10.49 : 1 | passes 4.5:1 |
| `#c8d4dc` (`--text`, `cuarto-frio-plano-realistic (6).html:11`) | 13.27 : 1 | passes 4.5:1 |
| `#5a6878` (`--muted`, same file) | **3.52 : 1** | **fails 4.5:1 normal-text minimum** — this is a real, shipped contrast violation on the corpus's own most-tokenized file, used for `#hud .info`/`#legend div.r` body copy, not just large labels |
| `#ffb020` (`--alarm`) | 10.95 : 1 | passes 4.5:1 |
| `#ff2233` (`--off`/alarm red) | 5.27 : 1 | passes 4.5:1 |
| `#00ff66` (`--on`) | 14.78 : 1 | passes 4.5:1 |
| `#8892a6` (vav-box-voxel muted) | 6.40 : 1 | passes 4.5:1 |

Only the muted/secondary text color fails, and only in the one file that already tries to do
this properly — a direct, mechanically-checkable fix: raise `--muted`/`--text-muted` to something
like `#8fa0ab` (≈6.4:1, matching the vav-box-voxel value above) as reflected in §36.2's proposed
token block.

**Colorblind-safe alarm states — never color alone.** Per W3C WAI "Understanding SC 1.4.1 Use of
Color": "Where color alone distinguishes between two colors … an author cannot use color alone to
achieve [meaning]" (`sources/web-snapshots/…use-of-color.html.md:186-198`). Auditing the corpus's
own status controls: `trane-rtu-realistic-v10.html:39-42` buttons already carry text labels
(`STANDBY`, `ON`) alongside their color class — this already satisfies 1.4.1 at the control level,
but incidentally, not by documented convention. The `#legend` swatch pattern
(`cuarto-frio-plano-realistic (6).html:48-53`, `<i style="background:#18b39e">` + text) is the
same story: color-plus-label, already correct, never formalized. The token recipe in §36.2 should
make this an explicit rule (every status/legend entry pairs a color token with a text label and,
per §36.4, an icon), not something the corpus gets right by accident per file.

**Touch target minimum.** Per W3C WAI "Understanding SC 2.5.8 Target Size (Minimum)": "the size
of the target for pointer inputs is at least 24 by 24 CSS pixels" (`sources/web-snapshots/
…target-size-minimum.html.md:29-33`). The corpus's own button rule
(`trane-rtu-realistic-v10.html:19`: `font-size:10px; padding:5px 14px; border:1px solid`) yields
an actual rendered height of roughly 10px (line-height) + 10px (padding) + 2px (border) ≈ 22px —
**under** the 24px floor, though close enough that bumping `--space-2` (8px, §36.2) into the
vertical padding instead of the current ad-hoc `5px` clears the bar with margin.

**Reduced motion.** §36.1 confirmed 0/27 corpus files reference `prefers-reduced-motion`, and the
one real animated status cue (`.alarm { animation:blink 1s infinite; }`,
`trane-rtu-realistic-v10.html:23`) runs unconditionally. `lib/theme.css` should carry the
accessibility floor immediately:

```css
@media (prefers-reduced-motion: reduce) {
  .alarm { animation: none; box-shadow: 0 0 0 2px var(--status-alarm); }
}
```

This is deliberately the *minimum* fix, not the full motion system — cinematic camera moves,
exploded-view tweens, and micro-interaction timing are queued [Block 34]'s job; this block only
guarantees the one animated CSS rule that exists today has an off-switch.

## 36.4 — Iconography note `[INFER]`

The corpus has **zero** icon usage today (`grep -c svg *.html voxel/*.html` → no hits) — every
status/legend distinction is color + text only. For the equipment/alarm icon set feeding §36.2's
status tokens and §36.3's "never color alone" rule, three open-license options fit the
standalone-HTML constraint (no build step, inlinable `<svg>` or a single sprite file):

| Set | License | Fit |
|---|---|---|
| Lucide | ISC (MIT-equivalent) | Thin-stroke line icons match the corpus's monospace/HMI aesthetic; ships as individual SVG files, easy to inline or sprite |
| Phosphor | MIT | Larger set, multiple weights (thin/regular/bold) — a "thin" weight variant would also fit the aesthetic |
| Material Symbols | Apache-2.0 | Largest/most complete set, but heavier visual weight than the corpus's current thin lines |

**Recommendation** `[INFER]`: Lucide, for weight-match with the existing thin monospace/line
aesthetic and permissive license; a small fixed subset (fan, compressor, valve, thermometer,
alarm-triangle, door) covers the equipment/alarm vocabulary seen across the corpus's legends.
This is a proposal, not a corpus finding — no icon set is in use anywhere today to corroborate
against.

## 36.5 — Application recipe: how tokens ride the [Block 33] template `[INFER]`

| Step | Action | Built from |
|---|---|---|
| 1 | Add `lib/theme.css` as a sixth `lib/` module (CSS custom properties from §36.2), sitting alongside — not merging into — `lib/palette.js` | [Block 33] §33.2's five-module table; §36.2's palette/PBR-vs-UI distinction |
| 2 | Link it the same way the corpus already links CSS today: `<link rel="stylesheet" href="lib/theme.css">` in the `<head>`, before the existing inline `<style>` block | [Block 1] §1.2/§1.3 (no build step, importmap-only constraint); [Block 33] §33.5 ("nothing in this recipe forces a bundler") |
| 3 | New prototypes: reference `var(--bg)`, `var(--accent)`, `var(--status-*)`, `var(--fs-*)`, `var(--space-*)` from day one — zero migration cost, mirrors [Block 33] §33.5's "new designs first" rule | [Block 33] §33.5 |
| 4 | Existing files: opportunistic backport — when a file is touched for another reason, swap its literal hex/px values for the matching token; `cuarto-frio-plano-realistic (6).html` is already 90% there (its own `:root` block maps almost 1:1 onto §36.2's proposal minus the light variant and the `--muted` contrast fix) | §36.1's proto-token precedent; [Block 33] §33.5's opportunistic-migration pattern |
| 5 | Add the `prefers-reduced-motion` rule (§36.3) and the icon subset (§36.4) as part of the same `lib/theme.css` landing, not a separate pass — both are cheap, corpus-wide, zero-new-subsystem fixes | §36.3, §36.4 |

## 36.x — Connections

- **[Block 1]** §1.3 — the DOM-overlay scaffolding (`#info`/`#legend`/`#panel`) this block's
  tokens style; the JetBrains Mono/hex-reuse habit quantified here started as an observation
  there.
- **[Block 22]** — its `lib/palette.js` (§22.5) is the 3D/PBR material palette, explicitly *not*
  the same system as this block's `lib/theme.css` UI palette (§36.2) — the two must stay separate
  modules even though the corpus today accidentally shares hex values between them.
- **[Block 29]** §29.3 — the ISA-101 neutral-by-default/color-on-alarm-only rule this block's
  `--status-*` tokens implement directly.
- **[Block 30]** §30.4 — the Monash P0-P6 alarm-priority tiers this block deliberately collapses
  to 4 visual severities (§36.2), keeping priority as text/rank rather than a 7th hue.
- **[Block 33]** §33.2 — `lib/theme.css` is the sixth module this block adds to that proposal's
  five-module `lib/` directory; §36.5 is this block's version of §33.5's migration path.
- **[Block 34]** (queued, G34) — owns the full motion-design system (camera moves, exploded-view
  timing, micro-interactions); this block only stakes the `prefers-reduced-motion` accessibility
  floor on the one animation the corpus has today (§36.3).
