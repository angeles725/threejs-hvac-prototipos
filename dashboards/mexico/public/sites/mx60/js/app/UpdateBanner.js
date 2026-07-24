/**
 * UpdateBanner — global banner shown when a newer build is available.
 *
 * Public API: window.MX60.UpdateBanner = {
 *   init()       // idempotent — registers the mx60-update-available listener
 * }
 *
 * Visual:
 *   - Fixed top-center, glass + cyan accent (matches the MX60 design system)
 *   - z-index 9999 → floats above Toast, AlarmNotesModal, Confirm, 3D canvas
 *   - role="status" + aria-live="polite" for screen readers
 *   - data-build-id / data-latest-id attrs expose IDs to DevTools (NOT
 *     visible to the operator — banner UI stays clean per design decision)
 *
 * Click "Actualizar":
 *   - location.href = pathname + '?_t=' + Date.now()
 *   - Forces a fresh HTML fetch (the query distinct from current bypasses
 *     any Niagara servlet cache that might serve a stale index.html).
 *
 * ES5 strict.
 */
(function (global) {
  'use strict';

  var MX60 = global.MX60 = global.MX60 || {};
  if (MX60.UpdateBanner) return;  // idempotent

  // POST-SMOKE FIX (D10): clean up the `?_t=<unix>` cache-bust query left
  // behind by a previous "Actualizar" click. The page has already loaded
  // fresh (the bypass did its job), so the timestamped URL has no purpose
  // — it's just visual noise in the address bar. `history.replaceState`
  // rewrites the URL in place WITHOUT reloading the page; the operator
  // sees a canonical `https://.../mx60/#hash` after the boot completes.
  //
  // Runs at script load (IIFE body) — no race conditions since we're not
  // changing history depth, just the URL display.
  try {
    if (global.location
        && typeof global.location.search === 'string'
        && global.location.search.indexOf('_t=') !== -1
        && global.history
        && typeof global.history.replaceState === 'function') {
      var cleanUrl = global.location.pathname + (global.location.hash || '');
      global.history.replaceState(null, '', cleanUrl);
    }
  } catch (e) { /* silent — defensive, never block boot */ }

  var bannerEl = null;

  function _onUpdateAvailable(evt) {
    if (bannerEl) return;  // already shown — don't duplicate
    var detail   = (evt && evt.detail) || {};
    var current  = detail.currentId || '';
    var latest   = detail.latestId  || '';

    bannerEl = _buildBanner(current, latest);
    document.body.appendChild(bannerEl);
  }

  function _buildBanner(currentId, latestId) {
    var div = document.createElement('div');
    div.className = 'mx60-update-banner';
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('data-build-id', currentId);
    div.setAttribute('data-latest-id', latestId);

    // Pulse dot
    var dot = document.createElement('span');
    dot.className = 'mx60-update-banner__dot';
    dot.setAttribute('aria-hidden', 'true');
    div.appendChild(dot);

    // Text block
    var textBlock = document.createElement('div');
    textBlock.className = 'mx60-update-banner__text';
    var title = document.createElement('span');
    title.className = 'mx60-update-banner__title';
    title.textContent = 'Nueva versión disponible';
    var subtitle = document.createElement('span');
    subtitle.className = 'mx60-update-banner__subtitle';
    subtitle.textContent = 'Actualizá para ver los últimos cambios';
    textBlock.appendChild(title);
    textBlock.appendChild(subtitle);
    div.appendChild(textBlock);

    // Reload button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mx60-update-banner__button';
    btn.setAttribute('aria-label', 'Actualizar la página');
    btn.textContent = 'Actualizar';
    btn.addEventListener('click', _onReloadClick, false);
    div.appendChild(btn);

    return div;
  }

  function _onReloadClick() {
    // R1 mitigation: bypass any Niagara servlet cache of index.html by
    // navigating to a fresh URL (timestamp query). The browser MUST re-fetch
    // the HTML (different URL), which references the new cache-buster'd
    // asset URLs from the new build. Simple `location.reload()` would work
    // too in most browsers, but the query-param approach is bulletproof.
    //
    // POST-SMOKE FIX (D8/D9): use `location.replace()` (not `href = ...`)
    // so the timestamped URL does NOT create a new history entry —
    // clicking the browser's Back button returns to wherever the operator
    // was before, not to a stale ?_t=<old> URL. Same SPA hygiene as a
    // real router navigation. Hash (e.g., `#home`) is preserved.
    var path = (global.location && global.location.pathname) || '/';
    var hash = (global.location && global.location.hash) || '';
    var target = path + '?_t=' + Date.now() + hash;
    if (global.location && typeof global.location.replace === 'function') {
      global.location.replace(target);
    } else {
      // Defensive fallback for very old browsers without replace()
      global.location.href = target;
    }
  }

  function init() {
    // Idempotent: re-calling init() does not duplicate the listener (we
    // remove first, then add). Safe to call from DashboardApp boot path
    // even if some race condition triggers double-init.
    try {
      global.removeEventListener('mx60-update-available', _onUpdateAvailable, false);
    } catch (e) { /* ignore — listener may not be registered yet */ }
    global.addEventListener('mx60-update-available', _onUpdateAvailable, false);
  }

  MX60.UpdateBanner = {
    init: init
  };
})(window);
