/**
 * Client-facing protection layer — SHIPPED BUILD ONLY (injected by build-publish.mjs).
 *
 * Everything here is FRICTION, not security (see the git history for the full rationale):
 *   - Keyboard/right-click blocks are bypassed by opening DevTools from the browser menu, or
 *     before the page loads, or by fetching the URL with curl, or by disabling JavaScript.
 *   - Neutering `console` stops nobody: the console still EXECUTES code.
 * The real protections live elsewhere: Cloudflare Access (who may load this at all) and the
 * obfuscated bundle (how expensive the code is to read).
 *
 * WATERMARK REMOVED (owner's explicit request, 2026-07-21): the on-screen "CONFIDENCIAL"
 * stamp and its docked-DevTools detection heuristic were deleted outright — no watermark is
 * ever mounted, under any condition. What remains is cosmetic friction + the console silencer.
 */
(() => {
  'use strict';

  // ── Friction (cosmetic — see the header) ─────────────────────────────────────
  const swallow = (event) => { event.preventDefault(); event.stopPropagation(); return false; };
  for (const type of ['contextmenu', 'selectstart', 'copy', 'cut', 'dragstart']) {
    document.addEventListener(type, swallow, true);
  }

  window.addEventListener('keydown', (event) => {
    const key = String(event.key || '').toLowerCase();
    const devtools = event.key === 'F12'
      || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c', 'k'].includes(key))
      || (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) // macOS
      || (event.ctrlKey && ['u', 's'].includes(key));                     // view-source / save
    if (devtools) swallow(event);
  }, true);

  // ── Console silencer (cosmetic) ──────────────────────────────────────────────
  const noop = () => undefined;
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'table', 'trace', 'dir', 'dirxml',
    'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count', 'assert', 'profile']) {
    try {
      Object.defineProperty(console, method, { value: noop, writable: false, configurable: false });
    } catch { /* a locked-down console is already fine */ }
  }
})();
