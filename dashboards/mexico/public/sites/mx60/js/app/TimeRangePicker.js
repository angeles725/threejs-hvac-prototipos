/**
 * MX60.TimeRangePicker
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Dropdown component with exactly 15 preset time ranges.
 * Selection persists to localStorage under key 'mx60.alarms.timeRange'.
 * Default: "today".
 *
 * Rendering engine: MX60.util.Dropdown (custom dropdown — NOT native <select>).
 * This fixes the white-option styling issue on iSMA 4.13.2 embedded browser.
 *
 * Public API:
 *   render(container)         → HTMLElement (the dropdown wrapper div)
 *   getSelected()             → string (e.g. "last1h")
 *   setSelected(val)          → void
 *   onChange(fn)              → void (register listener)
 *   removeListener(fn)        → void
 *
 * REQ-3, ADR-1 — chihuahua-alarms-reflow-visual-and-ack-fix
 * C7 — chihuahua-reflow-sanluis-replica (preserved public API)
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var LS_KEY = 'mx60.alarms.timeRange';
  var DEFAULT_RANGE = 'today';

  // Exactly 15 options — order matters for the dropdown display
  var RANGE_OPTIONS = [
    { value: 'last15Minutes', label: 'Últimos 15 minutos' },
    { value: 'last30Minutes', label: 'Últimos 30 minutos' },
    { value: 'last1h',        label: 'Última hora'        },
    { value: 'last3h',        label: 'Últimas 3 horas'    },
    { value: 'last6h',        label: 'Últimas 6 horas'    },
    { value: 'last12h',       label: 'Últimas 12 horas'   },
    { value: 'last24h',       label: 'Últimas 24 horas'   },
    { value: 'today',         label: 'Hoy'                },
    { value: 'yesterday',     label: 'Ayer'               },
    { value: 'last7d',        label: 'Últimos 7 días'     },
    { value: 'last14d',       label: 'Últimos 14 días'    },
    { value: 'last30d',       label: 'Últimos 30 días'    },
    { value: 'thisMonth',     label: 'Este mes'           },
    { value: 'last3Months',   label: 'Últimos 3 meses'    },
    { value: 'last12Months',  label: 'Últimos 12 meses'   }
  ];

  var _listeners = [];
  var _ddInstance = null; // MX60.util.Dropdown instance

  // ── Persistence ─────────────────────────────────────────────────────────────

  function _loadStored() {
    try {
      var v = localStorage.getItem(LS_KEY);
      if (v && _isValidValue(v)) return v;
    } catch (e) { /* localStorage may be blocked */ }
    return DEFAULT_RANGE;
  }

  function _persist(val) {
    try { localStorage.setItem(LS_KEY, val); } catch (e) { /* ignore */ }
  }

  function _isValidValue(v) {
    for (var i = 0; i < RANGE_OPTIONS.length; i++) {
      if (RANGE_OPTIONS[i].value === v) return true;
    }
    return false;
  }

  // Single-shot migration: upgrade stale narrow values to DEFAULT_RANGE.
  // Badge BQL no longer time-filters; a narrow listing range hides records the
  // badge counts. Migrate users away from last15Minutes/last30Minutes once —
  // future explicit selections persist normally. (engram #1786)
  function _migrateStaleStored() {
    try {
      if (localStorage.getItem('mx60.alarms.timeRange.migrated.v1') === 'true') return;
      var stored = localStorage.getItem(LS_KEY);
      if (stored === 'last15Minutes' || stored === 'last30Minutes') {
        localStorage.setItem(LS_KEY, DEFAULT_RANGE);
      }
      localStorage.setItem('mx60.alarms.timeRange.migrated.v1', 'true');
    } catch (e) { /* localStorage blocked — silent */ }
  }

  // ── State ────────────────────────────────────────────────────────────────────

  _migrateStaleStored();
  var _current = _loadStored();

  // ── Listeners ───────────────────────────────────────────────────────────────

  function _notify() {
    var val = _current;
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](val); } catch (e) { /* isolate */ }
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Render the dropdown into the given container.
   * Uses MX60.util.Dropdown for full custom theming.
   * Returns the wrapper element (also appended to container).
   */
  function render(container) {
    var wrap = document.createElement('div');
    wrap.className = 'mx60-time-picker';

    var label = document.createElement('span');
    label.className = 'mx60-time-picker-label';
    label.textContent = 'Rango:';
    wrap.appendChild(label);

    var ddWrap = document.createElement('div');
    ddWrap.className = 'mx60-time-picker-dd';
    wrap.appendChild(ddWrap);

    _ddInstance = MX60.util.Dropdown.create({
      items:        RANGE_OPTIONS,
      initialValue: _current,
      ariaLabel:    'Rango de tiempo'
    });
    _ddInstance.mount(ddWrap);
    _ddInstance.onChange(function(val) {
      if (!_isValidValue(val)) return;
      _current = val;
      _persist(val);
      _notify();
    });

    if (container) container.appendChild(wrap);
    return wrap;
  }

  function getSelected() {
    return _current;
  }

  function setSelected(val) {
    if (!_isValidValue(val)) return;
    _current = val;
    _persist(val);
    if (_ddInstance) _ddInstance.setValue(val);
    _notify();
  }

  function onChange(fn) {
    if (typeof fn === 'function' && _listeners.indexOf(fn) < 0) {
      _listeners.push(fn);
    }
  }

  function removeListener(fn) {
    var idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  MX60.TimeRangePicker = {
    render:         render,
    getSelected:    getSelected,
    setSelected:    setSelected,
    onChange:       onChange,
    removeListener: removeListener,
    // Exposed for tests / external inspection
    RANGE_OPTIONS:  RANGE_OPTIONS,
    DEFAULT_RANGE:  DEFAULT_RANGE
  };

  window.MX60 = MX60;

})(window);
