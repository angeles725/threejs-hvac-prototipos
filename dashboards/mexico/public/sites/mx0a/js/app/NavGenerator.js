/**
 * NavGenerator.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Responsibilities:
 *   - Render the tab-bar nav items for each floor (Piso 4-7) plus
 *     the global Alarmas tab.
 *   - Maintain per-floor alarm badge counts received from BajaScript
 *     subscriptions via DashboardApp.
 *   - Expose updateBadge(floor, count) and updateAlarmBadge(count)
 *     as the only mutation surface — all DOM access is contained here.
 *
 * Nav DOM contract (must match index.html):
 *   <div class="nav-bar" id="nav-bar">
 *     <!-- items injected by init() -->
 *   </div>
 *
 * Each injected item has:
 *   id="nav-item-{key}"            e.g. nav-item-piso4
 *   data-page="{key}"
 *   A child <span id="nav-badge-{key}"> for the per-floor count.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  /** Floor definitions in display order. */
  var FLOORS = [
    { key: 'piso4', label: 'Piso 4', icon: '4' },
    { key: 'piso5', label: 'Piso 5', icon: '5' },
    { key: 'piso6', label: 'Piso 6', icon: '6' },
    { key: 'piso7', label: 'Piso 7', icon: '7' }
  ];

  /** Global alarm tab definition. */
  var ALARM_TAB = { key: 'alarmas', label: 'Alarmas', icon: '!' };

  /** Cached badge counts per floor key. */
  var _badgeCounts = {};

  /** Currently active page key. */
  var _activeKey = '';

  /** Callback fired when user clicks a nav item. Signature: fn(pageKey) */
  var _onNavigate = null;

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the SVG icon markup for a floor number character or special char.
   * Keeps icon rendering self-contained — no external Icon dependency needed
   * for the nav bar itself.
   */
  function _floorGlyph(icon) {
    return '<span class="nav-floor-glyph">' + icon + '</span>';
  }

  /** Build the HTML string for a single nav item. */
  function _renderNavItem(key, label, icon, isAlarm) {
    var extraClass = isAlarm ? ' nav-item-alarm' : '';
    return '<div class="nav-item' + extraClass + '" id="nav-item-' + key + '" data-page="' + key + '">' +
      _floorGlyph(icon) +
      '<span class="nav-label">' + label + '</span>' +
      '<span class="nav-badge" id="nav-badge-' + key + '" style="display:none">0</span>' +
    '</div>';
  }

  /** Attach click handlers to all rendered nav items. */
  function _bindClicks() {
    var bar = document.getElementById('nav-bar');
    if (!bar) return;

    var items = bar.getElementsByClassName('nav-item');
    var i;
    for (i = 0; i < items.length; i++) {
      (function(el) {
        el.onclick = function() {
          var pageKey = el.getAttribute('data-page');
          _setActive(pageKey);
          if (_onNavigate) {
            _onNavigate(pageKey);
          }
        };
      })(items[i]);
    }
  }

  /** Visually mark one item as active, clear the rest. */
  function _setActive(key) {
    _activeKey = key;
    var allItems = document.getElementsByClassName('nav-item');
    var i;
    for (i = 0; i < allItems.length; i++) {
      var el = allItems[i];
      if (el.getAttribute('data-page') === key) {
        el.className = el.className.indexOf('nav-item-alarm') !== -1
          ? 'nav-item nav-item-alarm active'
          : 'nav-item active';
      } else {
        el.className = el.className.indexOf('nav-item-alarm') !== -1
          ? 'nav-item nav-item-alarm'
          : 'nav-item';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * init(options)
   *
   * Injects nav items into #nav-bar and binds click handlers.
   *
   * @param {Object} options
   * @param {string}   options.defaultPage  - Page key to activate on load.
   * @param {Function} options.onNavigate   - fn(pageKey) called on user click.
   */
  function init(options) {
    var opts = options || {};
    _onNavigate = opts.onNavigate || null;

    var bar = document.getElementById('nav-bar');
    if (!bar) {
      return;
    }

    var html = '';
    var i;
    for (i = 0; i < FLOORS.length; i++) {
      html += _renderNavItem(FLOORS[i].key, FLOORS[i].label, FLOORS[i].icon, false);
    }
    html += _renderNavItem(ALARM_TAB.key, ALARM_TAB.label, ALARM_TAB.icon, true);

    bar.innerHTML = html;
    _bindClicks();

    var defaultPage = opts.defaultPage || FLOORS[0].key;
    _setActive(defaultPage);
  }

  /**
   * setActive(key)
   *
   * Programmatically activate a nav item without triggering onNavigate.
   * Used by the router when the URL hash changes.
   *
   * @param {string} key
   */
  function setActive(key) {
    _setActive(key);
  }

  /**
   * updateBadge(floor, count)
   *
   * Update the per-floor RTU alarm badge.
   * floor  - one of 'piso4', 'piso5', 'piso6', 'piso7'
   * count  - integer >= 0
   */
  function updateBadge(floor, count) {
    _badgeCounts[floor] = count || 0;

    var badge = document.getElementById('nav-badge-' + floor);
    if (!badge) return;

    if (count > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = count > 99 ? '99+' : String(count);
    } else {
      badge.style.display = 'none';
    }

    // Also roll up total into the Alarmas tab badge.
    _refreshAlarmTotal();
  }

  /**
   * updateAlarmBadge(count)
   *
   * Directly set the Alarmas tab badge.
   * Called from DashboardApp when BajaScript delivers a global alarm count.
   * If called with 0 or no argument, recalculates from per-floor totals.
   *
   * @param {number} count
   */
  function updateAlarmBadge(count) {
    var badge = document.getElementById('nav-alarm-badge');
    if (!badge) {
      // Fall back to the standard badge id used in the Alarmas nav item.
      badge = document.getElementById('nav-badge-alarmas');
    }
    if (!badge) return;

    if (typeof count === 'number' && count > 0) {
      badge.style.display = 'inline-flex';
      badge.textContent = count > 99 ? '99+' : String(count);
    } else {
      badge.style.display = 'none';
    }
  }

  /**
   * getFloors()
   *
   * Returns the floor definitions array (read-only copy).
   * Used by DashboardApp to know which floors exist.
   *
   * @returns {Array}
   */
  function getFloors() {
    var copy = [];
    var i;
    for (i = 0; i < FLOORS.length; i++) {
      copy.push({ key: FLOORS[i].key, label: FLOORS[i].label, icon: FLOORS[i].icon });
    }
    return copy;
  }

  /**
   * getActiveKey()
   *
   * Returns the currently active page key.
   *
   * @returns {string}
   */
  function getActiveKey() {
    return _activeKey;
  }

  // ---------------------------------------------------------------------------
  // Private: alarm total rollup
  // ---------------------------------------------------------------------------

  /**
   * Sums all per-floor badge counts and refreshes the Alarmas tab badge.
   * This keeps the Alarmas counter in sync when floor-level counts change,
   * without requiring DashboardApp to recalculate.
   */
  function _refreshAlarmTotal() {
    var total = 0;
    var key;
    for (key in _badgeCounts) {
      if (_badgeCounts.hasOwnProperty(key)) {
        total += _badgeCounts[key];
      }
    }
    updateAlarmBadge(total);
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  SNLS.NavGenerator = {
    init:               init,
    setActive:          setActive,
    updateBadge:        updateBadge,
    updateAlarmBadge:   updateAlarmBadge,
    getFloors:          getFloors,
    getActiveKey:       getActiveKey
  };

  window.SNLS = SNLS;

})(window);
