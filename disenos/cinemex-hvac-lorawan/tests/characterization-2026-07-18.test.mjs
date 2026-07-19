/**
 * Characterization pass (2026-07-18) — freezes APPROVED-but-untested behavior that landed
 * in FAST MODE across the day's rounds so strict TDD can resume without silent regressions.
 *
 * These tests assert what IS (never what should be). They are deliberately structural
 * (token/rule presence + pure math) rather than pixel/whitespace-sensitive. Sources frozen:
 *  - Ronda A visual depth system  — runs/2026-07-18-ronda-a-depth.md      (styles.css only)
 *  - Ronda B responsive overhaul  — runs/2026-07-18-ronda-b-responsive.md
 *  - bfcache restore fix          — runs/2026-07-18-bfcache-and-prune.md   (main.js)
 *  - Real-branding pass           — runs/2026-07-18-client-round5.md       (favicons)
 *
 * Section anatomy (round-4/round-5 contracts) is already covered by client-round4/5 and
 * dock-sections; this file only pins the surfaces those suites do NOT touch.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { renderSectionHtml } from '../src/dock/sections.mjs';

const readText = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1. Design tokens (Ronda A) — string presence + computed WCAG floors
// ---------------------------------------------------------------------------

test('styles.css :root defines the full Ronda-A design-token set', async () => {
  const css = await readText('../styles.css');
  const tokens = [
    '--background', '--surface', '--surface-elevated', '--surface-hover', '--border',
    '--text-primary', '--text-secondary',
    '--success', '--warning', '--danger', '--info',
    '--shadow-sm', '--shadow-md', '--shadow-lg',
    '--radius-sm', '--radius-md', '--radius-lg',
    '--glow-accent', '--glow-success', '--glow-warning', '--glow-danger', '--glow-info',
  ];
  for (const token of tokens) {
    assert.match(css, new RegExp(`${token}\\s*:`), `token ${token} is defined`);
  }
  // The radius scale is the documented 8 / 12 / 16 px ladder.
  assert.match(css, /--radius-sm:\s*8px/);
  assert.match(css, /--radius-md:\s*12px/);
  assert.match(css, /--radius-lg:\s*16px/);
  // The card default shadow is the layered (hairline + drop) pair, not a single flat shadow.
  assert.match(css, /--shadow-md:\s*0 1px 2px[^;]+,\s*0 10px 30px[^;]+;/);
});

test('ink and muted clear their documented WCAG contrast floors over surface', async () => {
  const css = await readText('../styles.css');
  // Parse the ACTUAL hex values the product ships (not hard-coded here).
  const hexOf = (name) => {
    const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `${name} is a literal 6-digit hex`);
    return match[1];
  };
  const ink = hexOf('--ink');
  const muted = hexOf('--muted');
  const surface = hexOf('--surface');

  // Pure WCAG 2.1 relative-luminance / contrast math — no DOM, no color-mix resolution.
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * channel((n >> 16) & 255)
      + 0.7152 * channel((n >> 8) & 255)
      + 0.0722 * channel(n & 255);
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const inkRatio = contrast(ink, surface);
  const mutedRatio = contrast(muted, surface);
  assert.ok(inkRatio >= 7, `ink on surface = ${inkRatio.toFixed(2)}:1 clears the AAA floor (≥7)`);
  assert.ok(mutedRatio >= 4.5, `muted on surface = ${mutedRatio.toFixed(2)}:1 clears the AA floor (≥4.5)`);
});

// ---------------------------------------------------------------------------
// 2. Card system (Ronda A)
// ---------------------------------------------------------------------------

test('.card base rule ships the 145deg gradient + layered shadow + token radius', async () => {
  const css = await readText('../styles.css');
  const card = css.match(/\.card\s*\{[\s\S]*?\}/);
  assert.ok(card, '.card base rule exists');
  const rule = card[0];
  assert.match(rule, /linear-gradient\(145deg,/, 'diagonal depth gradient');
  assert.match(rule, /box-shadow:\s*var\(--shadow-md\)/, 'layered card shadow token');
  assert.match(rule, /border-radius:\s*var\(--radius-lg\)/, 'radius rides the token scale');
});

test('.card::after glow blob is a blurred, opacity-capped ambient blob', async () => {
  const css = await readText('../styles.css');
  const after = css.match(/\.card::after\s*\{[\s\S]*?\}/);
  assert.ok(after, '.card::after glow blob exists');
  const rule = after[0];
  assert.match(rule, /filter:\s*blur\(45px\)/, 'the glow is heavily blurred');
  assert.match(rule, /background:\s*var\(--card-glow,\s*transparent\)/, 'glow is opt-in (transparent default)');
  // The documented cap: the ambient blob never reads as a fill (opacity ≤ 0.2).
  const opacity = rule.match(/opacity:\s*var\(--card-glow-opacity,\s*([\d.]+)\)/);
  assert.ok(opacity, 'the blob opacity has a documented default');
  assert.ok(Number(opacity[1]) <= 0.2, `default glow opacity ${opacity[1]} stays under the 0.2 fill cap`);
});

test('KPI hover lift exists and is neutralized under prefers-reduced-motion', async () => {
  const css = await readText('../styles.css');
  // The lift itself: KPI/promo cards translate up on hover.
  assert.match(css, /\.kpi-card:hover[\s\S]*?transform:\s*translateY\(-2px\)/,
    'KPI cards lift on hover');
  // The reduced-motion block re-declares the hover transform back to none.
  const reduced = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/);
  assert.ok(reduced, 'a prefers-reduced-motion block exists');
  assert.match(reduced[0], /:hover[^{]*\{\s*transform:\s*none/,
    'hover transforms are cancelled under reduced motion');
});

// ---------------------------------------------------------------------------
// 3. Responsive contracts (Ronda B) — only what round-B tests did not pin
// ---------------------------------------------------------------------------

test('styles.css ships the global overflow/min-width guards', async () => {
  const css = await readText('../styles.css');
  assert.match(css, /\*\s*\{[^}]*min-width:\s*0/, 'universal min-width:0 guard');
  assert.match(css, /html,\s*body\s*\{[^}]*overflow-x:\s*clip/, 'body clips horizontal overflow');
  assert.match(css, /img,\s*svg,\s*canvas,\s*video\s*\{[^}]*max-width:\s*100%/, 'media never overflows');
});

test('styles.css defines the fluid layout tokens with clamp()', async () => {
  const css = await readText('../styles.css');
  for (const token of ['--page-padding', '--section-gap', '--card-padding', '--grid-gap']) {
    assert.match(css, new RegExp(`${token}:\\s*clamp\\(`), `${token} is a fluid clamp()`);
  }
  assert.match(css, /--sidebar-width:\s*[\d.]+rem/, 'sidebar width token exists');
  assert.match(css, /--header-height:\s*[\d.]+rem/, 'header height token exists');
});

test('index.html declares the drawer button with the a11y disclosure contract', async () => {
  const html = await readText('../index.html');
  const button = html.match(/<button[^>]*class="menu-drawer"[^>]*>/);
  assert.ok(button, 'the drawer toggle button exists');
  assert.match(button[0], /aria-expanded="false"/, 'drawer starts collapsed');
  assert.match(button[0], /aria-controls="[^"]+"/, 'drawer button points at the menu it opens');
});

test('hvac and energia section HTML carry the responsive table-transform hooks', () => {
  for (const section of ['hvac', 'energia']) {
    const html = renderSectionHtml(section, { tick: 0 });
    assert.ok((html.match(/data-th="[^"]+"/g) ?? []).length > 0,
      `${section} cells carry data-th labels for the phone card transform`);
    assert.ok((html.match(/cell-sec/g) ?? []).length > 0,
      `${section} marks secondary columns for the tablet tier`);
    assert.match(html, /class="row-expand"/, `${section} has the per-row detail toggle`);
    assert.match(html, new RegExp(`data-row-detail="${section}:[^"]+"\\s+aria-expanded="false"`),
      `${section} row-detail toggles start collapsed`);
  }
});

// ---------------------------------------------------------------------------
// 4. bfcache contract (main.js source asserts)
// ---------------------------------------------------------------------------

test('main.js pagehide handler is persisted-aware (dispose only on a real unload)', async () => {
  const main = await readText('../main.js');
  const handler = main.match(/addEventListener\('pagehide',\s*\(event\)\s*=>\s*\{[\s\S]*?\}\);/);
  assert.ok(handler, 'a pagehide listener exists');
  assert.match(handler[0], /setRenderLoop\(false\)/, 'pagehide always pauses the render loop');
  assert.match(handler[0], /if\s*\(!event\.persisted\)\s*dispose\(\)/,
    'teardown runs ONLY on a genuine unload, never on a bfcache stash');
});

test('main.js pageshow handler resumes a bfcache-restored scene', async () => {
  const main = await readText('../main.js');
  const handler = main.match(/addEventListener\('pageshow',\s*\(event\)\s*=>\s*\{[\s\S]*?\}\);/);
  assert.ok(handler, 'a pageshow listener exists');
  assert.match(handler[0], /if\s*\(!event\.persisted\)\s*return/, 'only a persisted restore is handled');
  assert.match(handler[0], /runtime\.resize\(\)/, 'the viewport is re-fitted on restore');
  assert.match(handler[0], /workbench\?\.resyncClock\(\)/, 'clock-driven readings re-render on restore');
  assert.match(handler[0], /setRenderLoop\(/, 'the render loop resumes where it was running');
});

test('workbench exposes resyncClock as the bfcache re-render entry point', async () => {
  const main = await readText('../main.js');
  assert.match(main, /resyncClock\(\)\s*\{[\s\S]*?updateAlertsBadge\(\)/,
    'resyncClock refreshes the alerts badge and re-renders the active section');
});

// ---------------------------------------------------------------------------
// 5. Branding — favicon links on BOTH shipped HTML pages
// ---------------------------------------------------------------------------

test('index.html and dashboard.html both link the real favicon + apple-touch-icon', async () => {
  for (const page of ['../index.html', '../dashboard.html']) {
    const html = await readText(page);
    assert.match(html, /<link[^>]*rel="icon"[^>]*type="image\/png"[^>]*href="\.\/assets\/favicon-32\.png"/,
      `${page} links the PNG favicon`);
    assert.match(html, /<link[^>]*rel="apple-touch-icon"[^>]*href="\.\/assets\/apple-touch-icon\.png"/,
      `${page} links the apple-touch-icon`);
    // The retired inline red-square SVG data-URI favicon must not resurrect.
    assert.doesNotMatch(html, /rel="icon"[^>]*data:image\/svg/, `${page} carries no inline SVG favicon`);
  }
});
