/**
 * MX60.ThemeStore — per-user light/dark theme store.
 *
 * SDD: mx60-theme-light-dark-per-user
 *
 * IIFE, ES5 strict. No arrow functions, no template literals, no fetch.
 * localStorage key: mx60.user.theme
 * Server endpoints: GET/POST /mx60/api/user/theme (XHR, X-Requested-With header).
 *
 * Boot sequence (called by DashboardApp.init after _bootCsrfProbe):
 *   1. ThemeStore.init() — reads data-theme set by FOUC script, fires GET reconcile,
 *      attaches storage event listener for multi-tab sync.
 *   2. DashboardApp wires toggle button click → ThemeStore.toggle().
 *
 * Subscriber-notification contract (REQ-17):
 *   _apply() sets data-theme on <html> FIRST, then notifies subscribers.
 *   Callbacks receive the new theme string: cb('light'|'dark').
 *   Callbacks MUST be idempotent. Subscribers MUST unsubscribe on destroy().
 */
(function (window) {
  'use strict';

  var MX60 = window.MX60 || (window.MX60 = {});

  // ── closure state ──────────────────────────────────────────────────────────
  /** Current resolved theme string: 'dark' | 'light' */
  var _theme = 'dark';

  /** Registered subscriber callbacks. Each element is a function(theme). */
  var _listeners = [];

  // ── internal helpers ───────────────────────────────────────────────────────

  /**
   * GATE-3b: Apply theme to DOM first, then update state, then notify subscribers.
   * This order guarantees no desync flash between CSS repaint and JS observer state.
   *
   * @param {string} theme - 'dark' | 'light'
   */
  function _apply(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    // (1) Apply to DOM — CSS repaint fires immediately
    document.documentElement.setAttribute('data-theme', theme);
    // (2) Update internal state
    _theme = theme;
    // (3) Notify all subscribers (each wrapped in try/catch — one bad callback
    //     cannot block others or break the theming pipeline)
    for (var i = 0; i < _listeners.length; i++) {
      try {
        _listeners[i](theme);
      } catch (e) {
        console.warn('[ThemeStore] subscriber error:', e);
      }
    }
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * init() — must be called once by DashboardApp.init, after _bootCsrfProbe.
   *
   * Steps:
   *   1. Seed _theme from the data-theme attribute already set by the FOUC inline script.
   *   2. Fire GET /mx60/api/user/theme to reconcile with server value.
   *      Server wins if it differs: _apply(serverTheme) + write localStorage.
   *   3. Attach window storage event listener for multi-tab sync (REQ-7).
   *      Receiving tab calls _apply(newValue) WITHOUT re-POSTing.
   */
  function init() {
    // (1) Seed from DOM (FOUC script already set it before CSS loaded)
    var domTheme = document.documentElement.getAttribute('data-theme');
    if (domTheme === 'light' || domTheme === 'dark') {
      _theme = domTheme;
    } else {
      // Fallback: read localStorage directly if FOUC script missed
      var lsTheme = null;
      try { lsTheme = localStorage.getItem('mx60.user.theme'); } catch (e) {}
      _theme = (lsTheme === 'light' || lsTheme === 'dark') ? lsTheme : 'dark';
      document.documentElement.setAttribute('data-theme', _theme);
    }

    // (2) Server reconcile — GET /mx60/api/user/theme
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/mx60/api/user/theme', true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.timeout = 5000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          var serverTheme = data && data.theme;
          if ((serverTheme === 'light' || serverTheme === 'dark') && serverTheme !== _theme) {
            _apply(serverTheme);
            try { localStorage.setItem('mx60.user.theme', serverTheme); } catch (e) {}
          }
        } catch (e) {
          console.warn('[ThemeStore] reconcile parse error:', e);
        }
      } else {
        console.warn('[ThemeStore] reconcile failed, status=' + xhr.status);
      }
    };
    xhr.send();

    // (3) Multi-tab storage sync — receive-only, no POST
    window.addEventListener('storage', function (e) {
      if (e.key !== 'mx60.user.theme') return;
      var newVal = e.newValue;
      if (newVal === 'light' || newVal === 'dark') {
        _apply(newVal);
        // Do NOT re-POST — the writing tab already did it
      }
    }, false);
  }

  /**
   * getTheme() — synchronous current value.
   *
   * @returns {'dark'|'light'}
   */
  function getTheme() {
    return _theme;
  }

  /**
   * setTheme(theme) — apply theme, persist to localStorage, POST to server.
   *
   * Steps:
   *   1. Validate theme in {light, dark}.
   *   2. _apply(theme) — DOM + state + subscribers (GATE-3b order).
   *   3. Write localStorage.
   *   4. Fire POST /mx60/api/user/theme (async). On failure: console.warn, no rollback.
   *
   * @param {string} theme - 'dark' | 'light'
   */
  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    // (1+2) Apply
    _apply(theme);
    // (3) Persist locally
    try { localStorage.setItem('mx60.user.theme', theme); } catch (e) {}
    // (4) Persist to server (async, best-effort)
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/mx60/api/user/theme', true);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.timeout = 8000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status !== 200) {
          console.warn('[ThemeStore] POST /api/user/theme failed, status=' + xhr.status);
        }
      };
      xhr.send('{"theme":"' + theme + '"}');
    } catch (e) {
      console.warn('[ThemeStore] POST /api/user/theme error:', e);
    }
  }

  /**
   * toggle() — flip between dark and light.
   */
  function toggle() {
    setTheme(_theme === 'dark' ? 'light' : 'dark');
  }

  /**
   * subscribe(cb) — register a callback invoked on every theme change.
   *
   * The callback receives the new theme string as its sole argument: cb('light'|'dark').
   * Returns cb as the unsubscribe token (pass back to unsubscribe()).
   *
   * REQ-17: callbacks are idempotent — calling with the same theme twice is safe.
   * Callers MUST call unsubscribe(token) in their destroy() chain.
   *
   * @param {function} cb
   * @returns {function} token (same as cb — pass to unsubscribe)
   */
  function subscribe(cb) {
    if (typeof cb !== 'function') return cb;
    _listeners.push(cb);
    return cb;
  }

  /**
   * unsubscribe(token) — remove a previously registered callback.
   *
   * @param {function} token - the value returned by subscribe()
   */
  function unsubscribe(token) {
    _listeners = _listeners.filter(function (fn) { return fn !== token; });
  }

  // ── export ─────────────────────────────────────────────────────────────────

  MX60.ThemeStore = {
    init: init,
    getTheme: getTheme,
    setTheme: setTheme,
    toggle: toggle,
    subscribe: subscribe,
    unsubscribe: unsubscribe
  };

  window.MX60 = MX60;

}(window));
