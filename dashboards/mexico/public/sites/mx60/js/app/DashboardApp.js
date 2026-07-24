/**
 * DashboardApp.js — MX60 namespace
 *
 * Skeleton orchestrator (sub-paso 1). Responsibilities:
 *   - Boot: load config via ConfigManager, init Router with onNavigate callback.
 *   - Page lifecycle: on every nav event, destroy() the prev page module and
 *     mount() the new one. Show/hide DOM sections accordingly.
 *
 * Each "page" is a small module exposing { mount(container, route), destroy() }.
 * In sub-paso 1 every page is a stub that just paints a placeholder. Real
 * implementations land in sub-pasos 2–5.
 *
 * Rule #2 (lifecycle): destroy() is always called on page-change before mount().
 * Rule #4 (polling cleanup): page modules cancel their own intervals in destroy().
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _container  = null;
  var _currentPage = null;     // { id, module, container }
  var _pageRegistry = {};      // id -> { mount, destroy }

  function init(rootElement) {
    if (!rootElement) throw new Error('DashboardApp.init: rootElement required');
    _container = rootElement;

    _fillStubGaps();

    // E1: Fire CSRF probe before loading config (REQ-302).
    // Result stored in MX60._csrfProbeResult for use by WritePoint or CSRF token flow.
    _bootCsrfProbe();

    // SDD mx60-theme-light-dark-per-user: init theme store immediately after csrf probe.
    // ThemeStore.init() reads the FOUC-applied data-theme, fires GET /api/user/theme to
    // reconcile with server value, and attaches the storage event listener for multi-tab sync.
    // Must run BEFORE ConfigManager.load so theme is resolved before any page mounts.
    if (MX60.ThemeStore && typeof MX60.ThemeStore.init === 'function') {
      MX60.ThemeStore.init();
    }
    // Bind header toggle button click → ThemeStore.toggle() (ES5, no arrow).
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn && MX60.ThemeStore) {
      themeBtn.addEventListener('click', function () {
        MX60.ThemeStore.toggle();
      }, false);
    }

    MX60.ConfigManager.load(function(config) {
      _applyConfig(config);
      MX60.Router.init(_onRouteChange);
      // H1 fix: boot AlarmsManager polling + wire nav badge so the operator
      // sees alarm count updates without navigating to the Alarms page.
      _bootAlarmBadge();
      // SDD mx60-header-alarm-indicator-and-sticky-nav: mount pulsing alarm indicator.
      // Mirrors _bootAlarmBadge — long-lived, not route-bound.
      _bootAlarmIndicator();
      // SDD mx60-header-alarm-indicator-and-sticky-nav: JS-driven sticky nav
      // (position:sticky was unreliable due to containing-block scope).
      _bootStickyNav();
      // P4 fix: re-fetch /api/config + /api/equipment when the tab regains
      // focus after >5min of being hidden. Without this, an admin who adds
      // a new UP/Carcamo/Datalogger to the station via Workbench requires
      // the operator to hard-reload to see it. visibilitychange is the
      // cheapest signal — does NOT poll while tab is foreground.
      _bootConfigRefresh();
      // SDD mx60-version-notification: register the update-available
      // listener (idempotent), then begin polling /mx60/version.json every
      // 60s. The first check fires immediately so the banner can appear
      // within a few seconds of load if a new bundle was deployed while
      // the page was loading.
      if (MX60.UpdateBanner && typeof MX60.UpdateBanner.init === 'function') {
        MX60.UpdateBanner.init();
      }
      if (MX60.VersionCheck && typeof MX60.VersionCheck.start === 'function') {
        MX60.VersionCheck.start();
      }
    });
  }

  /**
   * E1: Fire GET /api/csrf-probe on app init (REQ-301, REQ-302).
   * Stores result in MX60._csrfProbeResult. If supportsCSRF=false, the app
   * continues using X-Requested-With as sole CSRF mitigation (current behavior).
   * If supportsCSRF=true, future iterations can enable full token flow.
   */
  function _bootCsrfProbe() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/mx60/api/csrf-probe', true);
    xhr.timeout = 5000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var result = JSON.parse(xhr.responseText);
          MX60._csrfProbeResult = result;
          console.info('[DashboardApp] csrf-probe:', result);
          if (result && result.supportsCSRF) {
            console.info('[DashboardApp] CSRF token flow available — deferred to phase 2');
          } else {
            console.info('[DashboardApp] CSRF: X-Requested-With only (probe=false)');
          }
        } catch (e) {
          console.warn('[DashboardApp] csrf-probe parse error:', e);
          MX60._csrfProbeResult = { hasSession: false, supportsCSRF: false };
        }
      } else {
        console.warn('[DashboardApp] csrf-probe HTTP ' + xhr.status + ' — assuming no CSRF support');
        MX60._csrfProbeResult = { hasSession: false, supportsCSRF: false };
      }
    };
    xhr.onerror = function() {
      console.warn('[DashboardApp] csrf-probe network error — assuming no CSRF support');
      MX60._csrfProbeResult = { hasSession: false, supportsCSRF: false };
    };
    xhr.ontimeout = function() {
      console.warn('[DashboardApp] csrf-probe timeout');
      MX60._csrfProbeResult = { hasSession: false, supportsCSRF: false };
    };
    xhr.send();
  }

  var _configLastRefreshMs = Date.now();
  function _bootConfigRefresh() {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) return;
      var hiddenMs = Date.now() - _configLastRefreshMs;
      if (hiddenMs < 5 * 60 * 1000) return; // <5min — assume config still valid
      if (MX60.ConfigManager && typeof MX60.ConfigManager.reload === 'function') {
        MX60.ConfigManager.reload(function(config) {
          _configLastRefreshMs = Date.now();
          _applyConfig(config);
          if (MX60.EquipmentData && typeof MX60.EquipmentData.refresh === 'function') {
            MX60.EquipmentData.refresh();
          }
        });
      }
    }, false);
  }

  /**
   * H1 fix: start AlarmsManager polling (still needed for alarms page) and
   * bind the nav badge to /api/alarms/sources unacked-source count (ADR-1).
   * Polls every 30s independently of AlarmsManager 5s cadence.
   * Idempotent — safe to call once at boot.
   */
  var _badgePollTimer = null;
  var _badgeLastCount = 0;

  function _badgeSummaryUrl() {
    var cfg = (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
    return (cfg.api && cfg.api.alarmSummary) || '/mx60/api/alarms/summary';
  }

  function _updateBadge(badge, count) {
    _badgeLastCount = count;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = count > 0 ? '' : 'none';
  }

  function _pollBadge(badge) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', _badgeSummaryUrl(), true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var summary = JSON.parse(xhr.responseText);
          var count = (summary && typeof summary.unackedSources === 'number') ? summary.unackedSources : 0;
          _updateBadge(badge, count);
        } catch (e) {
          // retain last valid value on parse error
        }
      }
      // retain last valid value on HTTP error (non-2xx)
    };
    xhr.onerror = function() {
      // retain last valid value on network error
    };
    xhr.send();
  }

  function _bootAlarmBadge() {
    if (MX60.AlarmsManager && typeof MX60.AlarmsManager.init === 'function') {
      MX60.AlarmsManager.init();
    }
    var badge = document.getElementById('nav-alarm-badge');
    if (!badge) return;

    // Initial poll + recurring 30s
    _pollBadge(badge);
    if (_badgePollTimer) clearInterval(_badgePollTimer);
    _badgePollTimer = setInterval(function() {
      _pollBadge(badge);
    }, 30000);
  }

  /**
   * SDD mx60-header-alarm-indicator-and-sticky-nav.
   * Mount the pulsing alarm indicator into #mx60-alarm-indicator-mount.
   * Called once at boot after _bootAlarmBadge().
   * Idempotent — AlarmIndicatorView.init() guards against double-init.
   */
  function _bootAlarmIndicator() {
    if (!MX60.AlarmIndicatorView || typeof MX60.AlarmIndicatorView.init !== 'function') {
      console.warn('[DashboardApp] AlarmIndicatorView not available');
      return;
    }
    var mountEl = document.getElementById('mx60-alarm-indicator-mount');
    if (!mountEl) {
      console.warn('[DashboardApp] #mx60-alarm-indicator-mount not found');
      return;
    }
    MX60.AlarmIndicatorView.init(mountEl);
  }

  /**
   * SDD mx60-header-alarm-indicator-and-sticky-nav.
   * Pin .nav-bar-wrap to top: 0 via position:fixed when scrollY crosses the
   * nav's original top offset. position:sticky was unreliable in this header
   * structure (containing-block = #app-header which itself scrolls out of view),
   * so JS toggles position:fixed + a compensating body padding to prevent jump.
   * Long-lived: scroll listener is attached once at boot, no per-route cleanup.
   * RAF-throttled to avoid layout thrash.
   */
  function _bootStickyNav() {
    var nav = document.querySelector('.nav-bar-wrap');
    if (!nav) {
      console.warn('[DashboardApp] .nav-bar-wrap not found for sticky boot');
      return;
    }
    var ticking = false;
    var pinned = false;
    var threshold = 0;

    function measure() {
      // Temporarily unpin to read the natural document position
      var wasPinned = nav.classList.contains('is-pinned');
      if (wasPinned) {
        nav.classList.remove('is-pinned');
        document.body.classList.remove('has-pinned-nav');
      }
      var rect = nav.getBoundingClientRect();
      threshold = rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
      if (wasPinned) {
        nav.classList.add('is-pinned');
        document.body.classList.add('has-pinned-nav');
      }
    }

    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var shouldPin = y >= threshold;
      if (shouldPin !== pinned) {
        pinned = shouldPin;
        if (pinned) {
          nav.classList.add('is-pinned');
          document.body.classList.add('has-pinned-nav');
        } else {
          nav.classList.remove('is-pinned');
          document.body.classList.remove('has-pinned-nav');
        }
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        if (typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(update);
        } else {
          setTimeout(update, 16);
        }
      }
    }

    measure();
    window.addEventListener('scroll', onScroll, false);
    window.addEventListener('resize', measure, false);
    update();
    console.info('[DashboardApp] sticky-nav booted, threshold=' + threshold + 'px');
  }

  function _applyConfig(config) {
    var brandEl = document.getElementById('siteName');
    if (brandEl && config && config.siteName) brandEl.textContent = config.siteName;
    // Nav labels are static in index.html for sub-paso 1; future sub-pasos can
    // generate them from config.navigation via NavGenerator.js.
  }

  /**
   * Fill any unregistered page slots with a stub. Real modules that called
   * registerPage() before init() are kept as-is — stubs only fill the gaps.
   */
  function _fillStubGaps() {
    var ids = ['home', 'alarms', 'schedules', 'equipment', 'detail', 'configuracion'];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      if (!_pageRegistry[id]) {
        _pageRegistry[id] = MX60.PageStub(id);
      }
    }
  }

  /**
   * Public hook for sub-pasos 2–5: replace a stub with a real module.
   * Real module shape: { mount(container, route), destroy() }.
   */
  function registerPage(id, module) {
    if (!id || !module) return;
    _pageRegistry[id] = module;
  }

  function _onRouteChange(route, prev) {
    var pageId = route.page || 'home';

    // Tag <body> so CSS can scope per-page layout (e.g. HOME edge-to-edge).
    if (document.body) document.body.setAttribute('data-page', pageId);

    // Update nav active state + close mobile drawer + sync trigger label.
    var navItems = document.querySelectorAll('.nav-bar .nav-item[data-page]');
    var activeLabel = '';
    for (var ni = 0; ni < navItems.length; ni++) {
      var item = navItems[ni];
      if (item.getAttribute('data-page') === pageId) {
        item.classList.add('active');
        // Strip any trailing badge text by reading firstChild only.
        var rawText = item.firstChild ? (item.firstChild.textContent || '').trim() : '';
        activeLabel = rawText || item.textContent.trim().split(/\s+/)[0];
      } else {
        item.classList.remove('active');
      }
    }
    var triggerLabel = document.querySelector('[data-prop="active-page-label"]');
    if (triggerLabel) triggerLabel.textContent = activeLabel || pageId;
    var navWrap = document.querySelector('.nav-bar-wrap');
    if (navWrap) navWrap.classList.remove('is-open');
    var trigger = document.querySelector('[data-action="nav-toggle"]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');

    // Show the right section, hide others.
    var sectionId = 'page-' + pageId;
    var sections = _container.querySelectorAll('.page');
    var targetSection = null;
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      if (sec.id === sectionId) {
        sec.classList.add('active');
        targetSection = sec;
      } else {
        sec.classList.remove('active');
      }
    }

    // Tear down the previous page module (Rule #2).
    if (_currentPage && _currentPage.module && typeof _currentPage.module.destroy === 'function') {
      try { _currentPage.module.destroy(); } catch (e) { console.error('[DashboardApp] destroy error:', e); }
    }

    // Mount the new page module.
    var module = _pageRegistry[pageId];
    if (!module || typeof module.mount !== 'function') {
      console.warn('[DashboardApp] Unknown page: ' + pageId);
      _currentPage = null;
      return;
    }
    if (!targetSection) {
      console.warn('[DashboardApp] Section not found: #' + sectionId);
      _currentPage = null;
      return;
    }
    try {
      module.mount(targetSection, route);
      _currentPage = { id: pageId, module: module, container: targetSection };
    } catch (e) {
      console.error('[DashboardApp] mount error:', e);
      _currentPage = null;
    }
  }

  /**
   * Stub page factory — used until each real page module replaces it.
   * Renders a placeholder so navigation is visibly working in sub-paso 1.
   */
  function PageStub(id) {
    return {
      mount: function(container) {
        var labelMap = {
          home:       'HOME — vista superior de la nave (sub-paso 2)',
          alarms:     'ALARMS — lista paginada (sub-paso 4)',
          schedules:  'SCHEDULES — cargando...',
          equipment:  'EQUIPMENT — grid de UPs (sub-paso 2)',
          detail:     'DETAIL — modelo 3D + lecturas (sub-paso 3)',
          configuracion: 'CONFIGURACIÓN — modo de operación por UP (sub-paso 4)'
        };
        var html =
          '<div class="page-stub">' +
            '<div class="page-stub-id">' + id.toUpperCase() + '</div>' +
            '<div class="page-stub-text">' + (labelMap[id] || id) + '</div>' +
          '</div>';
        container.innerHTML = html;
      },
      destroy: function() {
        // No state, nothing to clean. Real modules will clear listeners,
        // intervals, subscriptions, etc.
      }
    };
  }

  MX60.PageStub      = PageStub;
  MX60.DashboardApp  = {
    init:         init,
    registerPage: registerPage
  };

  window.MX60 = MX60;

})(window);
