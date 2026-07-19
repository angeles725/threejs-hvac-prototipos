/**
 * DHL mirror round 2/2 — responsive + bfcache + prune characterization (2026-07-19).
 *
 * RED-first contracts for the round-2 mirror of the cinemex sibling's approved
 * Ronda-B (responsive) + bfcache-restore generation, re-authored for DHL's MONOLITH
 * architecture (the workbench JS lives inline in index.html, not a separate main.js).
 *
 * These tests assert the contract SHAPES the round mirrors:
 *  - global overflow / min-width guards + fluid layout tokens (styles.css)
 *  - the phone drawer's a11y disclosure contract (index.html)
 *  - the responsive table-transform hooks (data-th / cell-sec / per-row detail reveal)
 *  - the persisted-aware bfcache lifecycle pair + resyncClock (index.html inline JS)
 *  - the prune of the now-dead round-3 helper builders (sections.mjs)
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { renderSectionHtml } from '../src/dock/sections.mjs';

const readText = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// 1. Responsive: global guards + fluid tokens (Ronda B, adapted)
// ---------------------------------------------------------------------------

test('styles.css ships the global overflow / min-width / media guards', async () => {
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

test('the phone 3D height rides dvh (never a bare vh trap)', async () => {
  const css = await readText('../styles.css');
  // The phone viewer height clamps against dvh, not vh (mobile URL-bar safe).
  assert.match(css, /\.viewer\s*\{[^}]*clamp\([^)]*dvh/, 'phone viewer height uses dvh');
});

test('the room canvas declares touch-action pan-y so page scroll never traps', async () => {
  const css = await readText('../styles.css');
  assert.match(css, /\.viewer\s+canvas\s*\{[^}]*touch-action:\s*pan-y/, 'canvas allows vertical page pan');
});

// ---------------------------------------------------------------------------
// 2. Drawer a11y disclosure contract (index.html)
// ---------------------------------------------------------------------------

test('index.html declares the drawer button with the a11y disclosure contract', async () => {
  const html = await readText('../index.html');
  const button = html.match(/<button[^>]*class="menu-drawer"[^>]*>/);
  assert.ok(button, 'the drawer toggle button exists');
  assert.match(button[0], /aria-expanded="false"/, 'drawer starts collapsed');
  assert.match(button[0], /aria-controls="section-menu"/, 'drawer button points at the menu it opens');
});

test('the drawer open/close toggles aria-expanded and locks the body scroll', async () => {
  const html = await readText('../index.html');
  // openDrawer sets aria-expanded true + a scroll-lock flag; closeDrawer clears both.
  assert.match(html, /drawerButton\.setAttribute\('aria-expanded',\s*'true'\)/, 'open sets aria-expanded true');
  assert.match(html, /drawerButton\.setAttribute\('aria-expanded',\s*'false'\)/, 'close clears aria-expanded');
  assert.match(html, /dataset\.drawerLock|body\.classList[^\n]*drawer-lock|dataset\.scrollLock/,
    'the drawer sets a body scroll-lock hook');
});

// ---------------------------------------------------------------------------
// 3. Responsive table-transform hooks (Ronda B) — hvac + energia
// ---------------------------------------------------------------------------

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

test('every visible hvac data cell is labeled for the phone card transform', () => {
  const html = renderSectionHtml('hvac', { tick: 0 });
  for (const label of ['Unidad', 'Tipo', 'Temp', 'Estado']) {
    assert.match(html, new RegExp(`data-th="${label}"`), `hvac cell labeled ${label}`);
  }
});

// ---------------------------------------------------------------------------
// 4. bfcache lifecycle (index.html inline monolith JS)
// ---------------------------------------------------------------------------

test('index.html pagehide handler is persisted-aware (dispose only on a real unload)', async () => {
  const html = await readText('../index.html');
  const handler = html.match(/addEventListener\('pagehide',\s*\(event\)\s*=>\s*\{[\s\S]*?\}\);/);
  assert.ok(handler, 'a pagehide listener exists');
  assert.match(handler[0], /setRenderLoop\(false\)/, 'pagehide always pauses the render loop');
  assert.match(handler[0], /if\s*\(!event\.persisted\)\s*disposeScene\(\)/,
    'teardown runs ONLY on a genuine unload, never on a bfcache stash');
});

test('index.html pageshow handler resumes a bfcache-restored scene', async () => {
  const html = await readText('../index.html');
  const handler = html.match(/addEventListener\('pageshow',\s*\(event\)\s*=>\s*\{[\s\S]*?\}\);/);
  assert.ok(handler, 'a pageshow listener exists');
  assert.match(handler[0], /if\s*\(!event\.persisted\)\s*return/, 'only a persisted restore is handled');
  assert.match(handler[0], /resizeViewer\(\)/, 'the viewport is re-fitted on restore');
  assert.match(handler[0], /resyncClock\(\)/, 'clock-driven readings re-render on restore');
  assert.match(handler[0], /setRenderLoop\(/, 'the render loop resumes where it was running');
});

test('resyncClock is the bfcache re-render entry point (refreshes the alerts badge)', async () => {
  const html = await readText('../index.html');
  assert.match(html, /function resyncClock\(\)\s*\{[\s\S]*?updateAlertsBadge\(\)/,
    'resyncClock refreshes the alerts badge and re-renders the active section');
});

// ---------------------------------------------------------------------------
// 5. Prune — the round-3 helper builders are gone (sections.mjs)
// ---------------------------------------------------------------------------

test('the dead round-3 helper builders were pruned from sections.mjs', async () => {
  const src = await readText('../src/dock/sections.mjs');
  for (const dead of ['valBox', 'detailRow', 'detailVal', 'groupHead', 'roomViewCard']) {
    assert.doesNotMatch(src, new RegExp(`const\\s+${dead}\\s*=`), `${dead} definition is gone`);
    assert.doesNotMatch(src, new RegExp(`\\b${dead}\\(`), `${dead} has no call sites left`);
  }
});
