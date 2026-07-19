/**
 * Client-facing protection layer — SHIPPED BUILD ONLY (injected by build-publish.mjs).
 *
 * READ THIS BEFORE TRUSTING IT. Everything here is FRICTION, not security:
 *   - Keyboard/right-click blocks are bypassed by opening DevTools from the browser menu, or
 *     before the page loads, or by fetching the URL with curl, or by disabling JavaScript.
 *   - Neutering `console` stops nobody: the console still EXECUTES code.
 *   - Screenshots cannot be blocked by any web API. The OS owns the screen; a phone camera
 *     owns the rest.
 * The real protections live elsewhere: Cloudflare Access (who may load this at all) and the
 * obfuscated bundle (how expensive the code is to read). Shipped at the owner's explicit
 * request, knowing the above.
 *
 * WATERMARK — ON-DEMAND (owner's decision, 2026-07-16): the stamp stays hidden during normal
 * viewing and appears only while DevTools looks open, so the client sees a clean scene.
 * The cost, stated and accepted: a plain screen capture taken WITHOUT DevTools carries NO
 * stamp — which is the most common leak path, so the watermark no longer marks leaked frames.
 * It now only greets someone poking at the page.
 *
 * Detection is a docked-DevTools SIZE HEURISTIC. It cannot see DevTools in a separate window,
 * and it can false-positive (page zoom, some docked toolbars). A false positive costs a
 * watermark, nothing more — which is why the stamp is the response here and blanking the scene
 * is not: blanking would kill a live client demo over a heuristic. Also deliberately absent:
 * `debugger` traps (freeze the page and burn CPU).
 */
(() => {
  'use strict';

  const session = Math.random().toString(36).slice(2, 6).toUpperCase()
    + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const stamp = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  let layer = null;

  /** Build the tiled stamp once, hidden. Mounting it lazily keeps a clean DOM until it is due. */
  function buildWatermark() {
    if (layer) return layer;
    const text = `CONFIDENCIAL · Angeles Group · ${stamp} · ${session}`;
    layer = document.createElement('div');
    layer.id = 'wm-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483646', 'pointer-events:none',
      'overflow:hidden', 'user-select:none', 'mix-blend-mode:multiply', 'display:none',
    ].join(';');

    const tile = document.createElement('div');
    tile.style.cssText = [
      'position:absolute', 'top:-60%', 'left:-60%', 'width:220%', 'height:220%',
      'transform:rotate(-24deg)', 'display:flex', 'flex-direction:column',
      'justify-content:space-around', 'opacity:.16',
    ].join(';');
    for (let row = 0; row < 14; row += 1) {
      const line = document.createElement('div');
      line.textContent = `${text}   ·   `.repeat(6);
      line.style.cssText = [
        'white-space:nowrap', 'font:600 13px/1.9 "IBM Plex Mono",monospace',
        'color:#1B2430', 'letter-spacing:.08em',
      ].join(';');
      tile.appendChild(line);
    }
    layer.appendChild(tile);
    document.body.appendChild(layer);

    // Drift only while visible, on a long interval: no rAF, nothing per frame.
    let shifted = false;
    setInterval(() => {
      if (layer.style.display === 'none') return;
      shifted = !shifted;
      tile.style.transform = `rotate(-24deg) translate(${shifted ? 26 : 0}px, ${shifted ? 18 : 0}px)`;
    }, 7000);
    return layer;
  }

  function setWatermark(visible) {
    const node = buildWatermark();
    node.style.display = visible ? 'block' : 'none';
  }

  // ── Docked-DevTools heuristic ────────────────────────────────────────────────
  // A docked panel shrinks the viewport without shrinking the window. 170px clears normal
  // scrollbars and browser chrome. Undocked DevTools leaves both sizes untouched — invisible here.
  //
  // On touch devices the size heuristic is pure noise: the URL bar, nav bar, and on-screen
  // keyboard all shrink the viewport well past the gap, so a normal phone visitor would be
  // stamped constantly. DevTools cannot dock into a mobile browser anyway, so the heuristic
  // is disabled there outright. Evaluated once at load — a device does not change kind mid-visit.
  const IS_TOUCH = navigator.maxTouchPoints > 0
    || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const GAP = 170;
  function devtoolsLikelyOpen() {
    if (IS_TOUCH) return false;
    return (window.outerWidth - window.innerWidth > GAP)
      || (window.outerHeight - window.innerHeight > GAP);
  }

  // Debounce showing: only stamp after the delta has held for 3 consecutive polls (~2.4s),
  // so transient chrome (find bar, download shelf, zoom animations) never flashes the
  // watermark at a legitimate viewer. Hiding stays immediate — a clean screen costs nothing.
  const SHOW_AFTER_POLLS = 3;
  let shown = false;
  let positivePolls = 0;
  function poll() {
    if (devtoolsLikelyOpen()) {
      positivePolls += 1;
      if (!shown && positivePolls >= SHOW_AFTER_POLLS) {
        shown = true;
        setWatermark(true);
      }
    } else {
      positivePolls = 0;
      if (shown) {
        shown = false;
        setWatermark(false);
      }
    }
  }
  setInterval(poll, 800);

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
    if (devtools) {
      // The shortcut is swallowed, but the stamp goes up anyway: intent to inspect is enough,
      // and the browser menu route would otherwise be a silent way in.
      setWatermark(true);
      shown = true;
      swallow(event);
    }
  }, true);

  const noop = () => undefined;
  for (const method of ['log', 'info', 'warn', 'error', 'debug', 'table', 'trace', 'dir', 'dirxml',
    'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count', 'assert', 'profile']) {
    try {
      Object.defineProperty(console, method, { value: noop, writable: false, configurable: false });
    } catch { /* a locked-down console is already fine */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poll, { once: true });
  } else {
    poll();
  }
})();
