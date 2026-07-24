/**
 * EquipmentData.js — MX60 namespace
 *
 * Single source of truth for the equipment list.
 * Hybrid origin: BajaScript subscriptions primary, REST 5s polling fallback.
 *
 * Boot sequence:
 *   1. load(callback) called by app init.
 *   2. _tryBaja waits up to 3s for MX60.SubscriptionPool.isReady()/isFailed().
 *   3a. If ready:   _subscribeAll() + one initial REST fetch for fast first-paint.
 *       Happy path: REST polling NEVER runs. Live updates arrive via subscriptions.
 *   3b. If failed:  REST fetch + _startRestPolling() every 5s.
 *       Fallback:   Toast warn shown ONCE ("Modo limitado: actualización cada 5s").
 *
 * Public API (unchanged from v3 REST-only version — UI consumers are unaffected):
 *   load(callback)      — init once, call back with state
 *   refresh(callback)   — force REST re-fetch (for manual refresh actions)
 *   addListener(fn)     — subscribe to update events; fn(state)
 *   removeListener(fn)
 *   getById(id)         — synchronous lookup (null until first load)
 *   getByType(type)     — array copy for given type
 *   getAll()            — array copy of all equipment
 *   isLoaded()          — bool
 *
 * State shape (unchanged — UI components do NOT know the data origin):
 *   { equipment: [], byId: {}, byType: { up:[], carcamo:[], datalogger:[] }, raw: {} }
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  // Origin-agnostic state
  var _equipment        = [];
  var _byId             = {};
  var _byType           = { up: [], carcamo: [], datalogger: [] };
  var _raw              = null;
  var _loading          = false;
  var _loaded           = false;
  var _pendingCallbacks = [];
  var _listeners        = [];

  // Hybrid-specific state
  var _bajaTried   = false;
  var _bajaUsable  = false;
  var _restTimer   = null;
  var _warnedRestFallback = false;

  // CRIT-2 fix: subscription updates that arrive before the initial REST fetch
  // populates _byId would be silently dropped (`if (!_byId[id]) return`).
  // Buffer them here and replay after _index() runs in _restFetch.onload.
  var _pendingSubUpdates = [];   // [{ id, equipData }, ...]
  var _restFetchSettled  = false;

  // ---------------------------------------------------------------------------
  // Indexing
  // ---------------------------------------------------------------------------

  function _index(list) {
    _byId = {};
    _byType = { up: [], carcamo: [], datalogger: [] };
    for (var i = 0; i < list.length; i++) {
      var eq = list[i];
      if (!eq || !eq.id) continue;
      _byId[eq.id] = eq;
      var t = eq.type || 'up';
      if (!_byType[t]) _byType[t] = [];
      _byType[t].push(eq);
    }
  }

  function _state() {
    return { equipment: _equipment, byId: _byId, byType: _byType, raw: _raw };
  }

  // ---------------------------------------------------------------------------
  // Listener / callback management
  // ---------------------------------------------------------------------------

  function _flushCallbacks() {
    var cbs = _pendingCallbacks.slice();
    _pendingCallbacks = [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](_state()); } catch (e) { console.error('[EquipmentData] cb error:', e); }
    }
  }

  function _notify() {
    var snapshot = _state();
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](snapshot); } catch (e) { console.error('[EquipmentData] listener error:', e); }
    }
    // T2.7: feed manual a LiveHistoryBuffer eliminado del hot path. Antes este
    // for-loop ejecutaba 68 calls × ~16 notifies/seg = 1,088 calls/seg (7.6% CPU
    // del baseline post-Sprint-2.5a). Ahora LiveHistoryBuffer se suscribe al
    // EquipmentSnapshotStore via subscribeAll() y recibe batch throttled cada
    // ~500ms = ~136 calls/seg (8× menos). Ver LiveHistoryBuffer._consumeFlush.
  }

  // ---------------------------------------------------------------------------
  // C4: Threshold store hydration — called after every REST fetch success.
  // Calls seedFromEquipment on all 3 threshold stores if they expose the method.
  // ---------------------------------------------------------------------------

  function _seedThresholdStores(list) {
    if (MX60.UpThresholdStore && typeof MX60.UpThresholdStore.seedFromEquipment === 'function') {
      MX60.UpThresholdStore.seedFromEquipment(list);
    }
    if (MX60.CarcamoThresholdStore && typeof MX60.CarcamoThresholdStore.seedFromEquipment === 'function') {
      MX60.CarcamoThresholdStore.seedFromEquipment(list);
    }
    if (MX60.DataloggerThresholdStore && typeof MX60.DataloggerThresholdStore.seedFromEquipment === 'function') {
      MX60.DataloggerThresholdStore.seedFromEquipment(list);
    }
  }

  // ---------------------------------------------------------------------------
  // REST fetch — used for initial load (both paths) and fallback polling
  // ---------------------------------------------------------------------------

  function _resolveEquipUrl() {
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    if (cfg && cfg.api && cfg.api.equipment) return cfg.api.equipment;
    return '/mx60/api/equipment';
  }

  function _restFetch(callback) {
    if (_loading) {
      if (typeof callback === 'function') _pendingCallbacks.push(callback);
      return;
    }
    _loading = true;
    if (typeof callback === 'function') _pendingCallbacks.push(callback);

    var url = _resolveEquipUrl();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.timeout = 10000;

    xhr.onload = function() {
      _loading = false;
      if (xhr.status === 200) {
        try {
          var parsed = JSON.parse(xhr.responseText);
          var list = parsed && parsed.equipment
            ? parsed.equipment
            : (Array.isArray(parsed) ? parsed : []);
          _equipment = list;
          _raw = (parsed && !Array.isArray(parsed)) ? parsed : null;
          _index(list);
          _loaded = true;
          // C4: Hydrate threshold stores from server DTO on first REST fetch.
          // This ensures stores are never empty when page loads (REQ-005, REQ-006, REQ-007).
          // Runs every REST fetch so stores stay in sync with backend after a reload.
          _seedThresholdStores(list);
          // C-005: Seed AlarmLatchStore from server DTO — runs every REST fetch
          // so alarm latch state stays in sync with the station alarmLatches slot.
          if (MX60.AlarmLatchStore && typeof MX60.AlarmLatchStore.seedFromEquipment === 'function') {
            MX60.AlarmLatchStore.seedFromEquipment(list);
          }
          // CRIT-2 fix: replay any subscription updates that arrived before
          // _byId was populated. Each one merges into the now-indexed equip.
          _restFetchSettled = true;
          if (_pendingSubUpdates.length) {
            for (var pi = 0; pi < _pendingSubUpdates.length; pi++) {
              var pe = _pendingSubUpdates[pi];
              var pTarget = _byId[pe.id];
              if (!pTarget) continue;
              _applySubData(pTarget, pe.equipData);
            }
            _pendingSubUpdates = [];
          }
        } catch (e) {
          console.error('[EquipmentData] Bad JSON:', e);
        }
      } else {
        console.warn('[EquipmentData] REST status ' + xhr.status);
        if (xhr.status === 401 || xhr.status === 403) {
          if (MX60.Toast) MX60.Toast.error('Sesión expirada. Recargá la página.');
          _stopRestPolling();
        }
      }
      _flushCallbacks();
      _notify();
    };

    xhr.onerror = function() {
      _loading = false;
      console.warn('[EquipmentData] REST network error');
      _flushCallbacks();
    };

    xhr.ontimeout = function() {
      _loading = false;
      console.warn('[EquipmentData] REST timeout');
      _flushCallbacks();
    };

    xhr.send();
  }

  // ---------------------------------------------------------------------------
  // REST fallback polling — runs only when BajaScript is unavailable
  // ---------------------------------------------------------------------------

  function _startRestPolling() {
    if (_restTimer) return;
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    var ms = (cfg && cfg.pollMs && cfg.pollMs.restFallbackMs) ? cfg.pollMs.restFallbackMs : 5000;
    _restTimer = setInterval(function() { _restFetch(null); }, ms);
    if (!_warnedRestFallback) {
      _warnedRestFallback = true;
      if (MX60.Toast && typeof MX60.Toast.warn === 'function') {
        MX60.Toast.warn('Modo limitado: actualización cada ' + (ms / 1000) + 's');
      }
    }
  }

  function _stopRestPolling() {
    if (_restTimer) {
      clearInterval(_restTimer);
      _restTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // BajaScript path — subscriptions
  // ---------------------------------------------------------------------------

  function _tryBaja(cb) {
    if (_bajaTried) { cb(_bajaUsable); return; }
    _bajaTried = true;
    if (!MX60.SubscriptionPool) { cb(false); return; }

    // Kick off baja init in case it hasn't started yet
    MX60.SubscriptionPool.init();

    var t0 = Date.now();
    var iv = setInterval(function() {
      if (MX60.SubscriptionPool.isReady()) {
        clearInterval(iv);
        _bajaUsable = true;
        cb(true);
        return;
      }
      if (MX60.SubscriptionPool.isFailed()) {
        clearInterval(iv);
        _bajaUsable = false;
        cb(false);
        return;
      }
      if (Date.now() - t0 > 3000) {
        clearInterval(iv);
        _bajaUsable = false;
        cb(false);
        return;
      }
    }, 100);
  }

  function _subscribeAll() {
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    if (!cfg || !cfg.monitorOrds) return;
    var keys = Object.keys(cfg.monitorOrds);
    for (var i = 0; i < keys.length; i++) {
      MX60.SubscriptionPool.subscribeEquipment('home', keys[i], _onSubUpdate, _onMonitorChanged);
    }
    // Wire the watchdog: if the Fox session drops mid-shift (Wi-Fi blip,
    // idle timeout, station restart), the watchdog detects subscription
    // silence and triggers re-init + re-subscribe via this callback.
    if (MX60.SubscriptionPool && typeof MX60.SubscriptionPool.startWatchdog === 'function') {
      MX60.SubscriptionPool.startWatchdog(function() {
        // Re-init: tryBaja resets _bajaTried, then re-runs subscribe path.
        _bajaTried = false;
        _tryBaja(function(ok) {
          if (ok) _subscribeAll();
        });
      });
    }
  }

  // Bug fix (live-update): backend ChiEquipmentReader serializes telemetry
  // nested under `summary` (e.g. equip.summary.fanOn, equip.summary.tempZona),
  // and ALL UI consumers read from equip.summary.*. SubscriptionPool delivers
  // a flat object (no summary wrapper). A naive flat merge onto the root
  // updates equip.fanOn but not equip.summary.fanOn, leaving every UI stale
  // until the next REST fetch. Mirror writes into both root (legacy) and
  // summary (what UIs actually read), and recompute status client-side for
  // 'up' equipment using the same fanOn||comp1On||comp2On rule the backend uses.
  function _applySubData(target, equipData) {
    if (!target || !equipData) return;
    if (!target.summary || typeof target.summary !== 'object') target.summary = {};
    var hasRunSignal = false;
    for (var k in equipData) {
      if (!Object.prototype.hasOwnProperty.call(equipData, k)) continue;
      if (k === '_slotName') continue;
      target[k] = equipData[k];
      target.summary[k] = equipData[k];
      if (k === 'fanOn' || k === 'compressor1On' || k === 'compressor2On') {
        hasRunSignal = true;
      }
    }
    if (hasRunSignal && target.type === 'up' && target.status !== 'offline') {
      var s = target.summary;
      target.status = (s.fanOn || s.compressor1On || s.compressor2On) ? 'cooling' : 'standby';
    }
  }

  function _onSubUpdate(key, equipData) {
    // _slotName is injected by SubscriptionPool._readEquipment with the
    // backend-matching id transform (post-CRIT-1 fix in SubscriptionPool).
    // Defensive belt-and-suspenders replace here too, in case caller sends raw.
    var id = (equipData && equipData._slotName)
      ? equipData._slotName.toLowerCase().replace(/_/g, '-')
      : null;
    if (!id) return;
    // CRIT-2 fix: if the initial REST fetch hasn't populated _byId yet, queue
    // this update and replay it once _index() runs in _restFetch.onload.
    if (!_restFetchSettled || !_byId[id]) {
      if (!_restFetchSettled) {
        _pendingSubUpdates.push({ id: id, equipData: equipData });
        return;
      }
      // REST settled but id unknown (equip didn't exist at fetch time): drop.
      return;
    }
    _applySubData(_byId[id], equipData);
    _notify();
  }

  function _onMonitorChanged(key) {
    // Coarse monitor-level signal (e.g., child added/removed)
    _notify();
  }

  // ---------------------------------------------------------------------------
  // Public: load
  // ---------------------------------------------------------------------------

  function load(callback) {
    if (_loaded) {
      if (typeof callback === 'function') callback(_state());
      return;
    }
    _tryBaja(function(ok) {
      if (ok) {
        _subscribeAll();
        // Initial REST fetch once for fast first-paint while subscriptions warm up.
        // After this, REST polling does NOT start — subscriptions drive updates.
        _restFetch(callback);
      } else {
        _restFetch(callback);
        _startRestPolling();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Public: refresh — force REST re-fetch (manual action; does not affect origin)
  // ---------------------------------------------------------------------------

  function refresh(callback) {
    _restFetch(callback);
  }

  // ---------------------------------------------------------------------------
  // Public: listener management
  // ---------------------------------------------------------------------------

  function addListener(fn) {
    if (typeof fn !== 'function') return;
    _listeners.push(fn);
  }

  function removeListener(fn) {
    for (var i = _listeners.length - 1; i >= 0; i--) {
      if (_listeners[i] === fn) _listeners.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------------
  // Public: accessors
  // ---------------------------------------------------------------------------

  function getById(id)   { return _byId[id] || null; }
  function getByType(t)  { return (_byType[t] || []).slice(); }
  function getAll()      { return _equipment.slice(); }
  function isLoaded()    { return _loaded; }

  MX60.EquipmentData = {
    load:           load,
    refresh:        refresh,
    addListener:    addListener,
    removeListener: removeListener,
    getById:        getById,
    getByType:      getByType,
    getAll:         getAll,
    isLoaded:       isLoaded
  };

  window.MX60 = MX60;

})(window);
