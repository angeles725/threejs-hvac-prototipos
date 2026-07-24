/**
 * ConfigManager.js — MX60 namespace
 *
 * Adapted from Angeles ConfigManager. Adds dedupe of concurrent loads,
 * timeout, fallback config, and explicit reload(). Fallback config is
 * MX60-specific (siteName, navigation order from spec).
 *
 * Public API:
 *   load(callback)   — fetch /api/config (cached after first call)
 *   getConfig()      — current cached config (null until loaded)
 *   isLoaded()       — bool
 *   reload(callback) — clear cache and reload
 *
 * In dev, set the fixture path on window.MX60_BOOTSTRAP.configUrl.
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _config           = null;
  var _loading          = false;
  var _loaded           = false;
  var _pendingCallbacks = [];

  function load(callback) {
    if (_loaded && _config) {
      if (typeof callback === 'function') callback(_config);
      return;
    }

    if (typeof callback === 'function') _pendingCallbacks.push(callback);
    if (_loading) return;
    _loading = true;

    var url = (window.MX60_BOOTSTRAP && window.MX60_BOOTSTRAP.configUrl)
      || '/mx60/api/config';

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.timeout = 10000;

    xhr.onload = function() {
      _loading = false;
      if (xhr.status === 200) {
        try {
          _config = JSON.parse(xhr.responseText);
          _loaded = true;
        } catch (e) {
          console.error('[ConfigManager] Bad JSON:', e);
          _config = buildFallbackConfig();
          _loaded = true;
        }
      } else {
        console.warn('[ConfigManager] Status ' + xhr.status + ' — using fallback');
        _config = buildFallbackConfig();
        _loaded = true;
      }
      flushCallbacks();
    };

    xhr.onerror = function() {
      _loading = false;
      console.warn('[ConfigManager] Network error — using fallback');
      _config = buildFallbackConfig();
      _loaded = true;
      flushCallbacks();
    };

    xhr.ontimeout = function() {
      _loading = false;
      console.warn('[ConfigManager] Timeout — using fallback');
      _config = buildFallbackConfig();
      _loaded = true;
      flushCallbacks();
    };

    xhr.send();
  }

  function flushCallbacks() {
    var cbs = _pendingCallbacks.slice();
    _pendingCallbacks = [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](_config); } catch (e) { console.error('[ConfigManager] cb error:', e); }
    }
  }

  function buildFallbackConfig() {
    return {
      siteName: 'MX60 Chihuahua',
      // Order: HOME | ALARMS | SCHEDULES | EQUIPMENT | RESUMEN | CONFIGURACIÓN
      navigation: [
        { id: 'home',           label: 'HOME' },
        { id: 'alarms',         label: 'ALARMS' },
        { id: 'schedules',      label: 'SCHEDULES' },
        { id: 'equipment',      label: 'EQUIPMENT' },
        { id: 'resumen',        label: 'RESUMEN' },
        { id: 'configuracion',  label: 'CONFIGURACIÓN' }
      ],
      api: {
        config:        '/mx60/api/config',
        equipment:     '/mx60/api/equipment',
        alarms:        '/mx60/api/alarms',
        alarmSummary:  '/mx60/api/alarms/summary',
        alarmAck:      '/mx60/api/alarmAck',
        alarmAckAll:   '/mx60/api/alarms/ackAll',    // SDD mx60-ackall-full-db-and-badge-no-filter: repointed to live endpoint
        schedules:     '/mx60/api/schedules',
        historyList:   '/mx60/api/historyList',
        historyData:   '/mx60/api/historyData',
        setpoint:      '/mx60/api/setpoint'
      },
      colors:    { accent: '#00d4aa', accentAlt: '#3aa6ff', warning: '#ffc107', danger: '#ff4757' },
      pollMs:    { home: 8000, alarmCounts: 20000 },
      alarms:    { maxStored: 200, dedupWindowMs: 30000 }
    };
  }

  function getConfig() { return _config; }
  function isLoaded()  { return _loaded; }

  function reload(callback) {
    _config = null;
    _loaded = false;
    _loading = false;
    load(callback);
  }

  MX60.ConfigManager = {
    load:      load,
    getConfig: getConfig,
    isLoaded:  isLoaded,
    reload:    reload
  };

  window.MX60 = MX60;

})(window);
