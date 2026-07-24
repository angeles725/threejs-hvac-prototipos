/**
 * VersionCheck — detect when a new bundle has been deployed.
 *
 * Public API: window.MX60.VersionCheck = {
 *   start(intervalMs)  // begin polling /mx60/version.json
 * }
 *
 * Mechanism:
 *   - `window.MX60.BUILD_ID` is set by Version.js (auto-generated at build
 *     time, loaded first in index.html).
 *   - This module polls /mx60/version.json with `cache: 'no-store'` every
 *     `intervalMs` (default 60s).
 *   - When the live `buildId` differs from `MX60.BUILD_ID`, dispatches a
 *     `mx60-update-available` CustomEvent on window with detail
 *     `{ currentId, latestId }`, then stops polling (no point continuing).
 *   - Errors / 404 / network failures stay silent — the UI must NOT show a
 *     scary banner when the file is simply unreachable (e.g., dev mode
 *     without a build).
 *
 * ES5 strict: var, function, no arrow, no template literals, no const/let.
 * Convention: chihuahua-ux frontend uses ES5 for Niagara compatibility.
 */
(function (global) {
  'use strict';

  var MX60 = global.MX60 = global.MX60 || {};
  if (MX60.VersionCheck) return;  // idempotent

  var DEFAULT_INTERVAL = 60000;  // 60s — same as casino useVersionCheck default

  var stopped = false;
  var intervalHandle = null;

  function _checkOnce() {
    if (stopped) return;
    _fetchOnce(function (latest) {
      if (stopped || !latest) return;
      var current = MX60.BUILD_ID || null;
      if (current && latest !== current) {
        stopped = true;
        if (intervalHandle) {
          clearInterval(intervalHandle);
          intervalHandle = null;
        }
        try {
          global.dispatchEvent(new CustomEvent('mx60-update-available', {
            detail: { currentId: current, latestId: latest }
          }));
        } catch (e) {
          // Older browsers without CustomEvent constructor: fall back to
          // document.createEvent — defensive, all current Niagara browsers
          // support CustomEvent so this almost certainly won't run.
          try {
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent('mx60-update-available', false, false, {
              currentId: current, latestId: latest
            });
            global.dispatchEvent(evt);
          } catch (e2) { /* truly silent */ }
        }
      }
    });
  }

  // Shared fetch helper used by the boot anchor AND the periodic check.
  // Silent on errors/timeouts/non-2xx so transient failures don't surface UI.
  function _fetchOnce(cb) {
    var url = '/mx60/version.json?_t=' + Date.now();  // bypass any intermediate cache
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Cache-Control', 'no-store');
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (xhr.status < 200 || xhr.status >= 300) { cb(null); return; }
      try {
        var json = JSON.parse(xhr.responseText);
        cb(json && json.buildId ? json.buildId : null);
      } catch (e) { cb(null); }
    };
    xhr.onerror   = function () { cb(null); };
    xhr.ontimeout = function () { cb(null); };
    xhr.send();
  }

  function start(intervalMs) {
    if (stopped || intervalHandle) return;  // already started or already detected
    var ms = intervalMs && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL;

    // POST-SMOKE FIX (D6/D7): re-anchor MX60.BUILD_ID from the server BEFORE
    // we begin comparing. The Version.js script that originally set
    // MX60.BUILD_ID at boot is served with a fixed cache buster (?v=1) and
    // may be a stale copy in the browser cache after a reload — which
    // would make us detect a spurious mismatch and re-show the banner
    // even though the page was just reloaded with the fresh bundle. By
    // overwriting MX60.BUILD_ID with whatever the server says NOW (cache:
    // no-store + timestamp query), we sidestep the JS bundle cache
    // entirely: "current" anchors to what was live at page load, not
    // what was compiled into a possibly-stale Version.js.
    //
    // If the initial fetch fails (network down, server unreachable), we
    // keep the embedded MX60.BUILD_ID — same defensive posture as the
    // rest of this module (silent on failure).
    _fetchOnce(function (latest) {
      if (latest) {
        MX60.BUILD_ID = latest;  // anchor to server's current
      }
      // After the anchor (or its failure), start the periodic polling.
      // We do NOT call _checkOnce() here — the comparison would always
      // succeed since we just set MX60.BUILD_ID = latest. First real
      // comparison happens on the next interval tick (~60s).
      intervalHandle = setInterval(_checkOnce, ms);
    });
  }

  MX60.VersionCheck = {
    start: start
  };
})(window);
