/**
 * SubscriptionPool.js — MX60 namespace
 *
 * Manages BajaScript subscriptions for the MX60 Chihuahua BMS dashboard.
 * Reflow-style architecture: subscribes to individual equipment components
 * and reads property values DIRECTLY from BajaScript objects (~80ms latency).
 *
 * Data flow:
 *   1. Subscribe to monitor ORD via baja.Ord.make(ord).get({subscriber})
 *   2. On resolve, iterate children (equipment components)
 *   3. Subscribe to each child for 'changed' events
 *   4. On 'changed', read values directly: child.get('propName').getValue()
 *   5. Push updated equipment data to EquipmentData immediately (no REST roundtrip)
 *
 * REST polling remains as fallback for initial load and error recovery.
 *
 * Ported from SanLuis SubscriptionPool.js — adapted for MX60 namespace and
 * 3 equipment types (up / carcamo / datalogger) with per-type property arrays
 * derived from BChiUp, BChiCarcamo, BChiDatalogger @NiagaraProperty declarations.
 *
 * GOTCHA G6 — slot name correlation:
 *   _readEquipment injects data._slotName = comp.getName() (lowercase) so that
 *   EquipmentData._onSubUpdate can route the update to the correct _byId entry.
 *   Without this, EquipmentData cannot match subscription updates to equipment.
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _baja        = null;
  var _bajaReady   = false;
  var _bajaFailed  = false;
  var _pendingCallbacks = [];
  var _subscribers = {};
  var _childSubscribers = {};
  var _debounceTimers = {};
  var _initStarted = false;

  // Reconnect watchdog state. Tracks the last time ANY subscription delivered
  // an update. If no update arrives for SILENCE_THRESHOLD_MS while baja is
  // marked ready, we assume the Fox session dropped (Wi-Fi blip, idle timeout,
  // station restart) and try to recover by tearing down + re-subscribing.
  var _lastUpdateMs = 0;
  var _watchdogTimer = null;
  var _watchdogResubFn = null;   // set by EquipmentData on first _subscribeAll
  var WATCHDOG_TICK_MS         = 30000;   // check every 30 s
  var WATCHDOG_SILENCE_THRESHOLD_MS = 90000; // 90 s of silence => assume drop

  // ---------------------------------------------------------------------------
  // Property arrays — derived from BChiUp @NiagaraProperty declarations
  // Includes all numeric, boolean, and string slots (excludes position slots
  // positionX/positionY and planta which are infrastructure, not live telemetry).
  // ---------------------------------------------------------------------------

  // UP (Unidad Paquete — BChiUp)
  var UP_NUMERIC_PROPS = [
    'setpoint', 'tempZona', 'tempAbasto', 'tempRetorno', 'tempExterior',
    'humedadZona', 'tempSuccion1', 'tempSuccion2',
    'ampCompresor1', 'ampCompresor2', 'ampAbanicos1', 'ampAbanicos2', 'ampFan',
    'deltaAbastoRetorno',
    'sobrecargaFan', 'sobrecargaCompresor1', 'sobrecargaCompresor2',
    'sobrecargaAbanicos1', 'sobrecargaAbanicos2',
    'antifrezzeSistema1', 'antifrezzeSistema2'
  ];
  var UP_BOOLEAN_PROPS = [
    'fanOn', 'compressor1On', 'compressor2On', 'protectorFase',
    'switchAlta1', 'switchAlta2', 'switchBaja1', 'switchBaja2',
    'fanCmd', 'comp1Cmd', 'comp2Cmd'
  ];
  var UP_STRING_PROPS = ['label', 'modoOperacion'];

  // CARCAMO (BChiCarcamo)
  var CARCAMO_NUMERIC_PROPS = ['nivelCm', 'state', 'umbralAdvertencia', 'umbralCritico'];
  var CARCAMO_BOOLEAN_PROPS = [];
  var CARCAMO_STRING_PROPS  = ['label'];

  // DATALOGGER (BChiDatalogger)
  var DT_NUMERIC_PROPS = ['pressurePsi', 'pressureBar', 'state', 'umbralAdvertencia', 'umbralCritico'];
  var DT_BOOLEAN_PROPS = [];
  var DT_STRING_PROPS  = ['label'];

  function _propsForType(type) {
    if (type === 'carcamo')    return [CARCAMO_NUMERIC_PROPS, CARCAMO_BOOLEAN_PROPS, CARCAMO_STRING_PROPS];
    if (type === 'datalogger') return [DT_NUMERIC_PROPS,      DT_BOOLEAN_PROPS,      DT_STRING_PROPS];
    return [UP_NUMERIC_PROPS, UP_BOOLEAN_PROPS, UP_STRING_PROPS];
  }

  // ---------------------------------------------------------------------------
  // _keyToType — derive equipment type string from monitorOrds key
  //   "ups-1"          -> "up"
  //   "carcamos-2"     -> "carcamo"
  //   "dataloggers-5"  -> "datalogger"
  // ---------------------------------------------------------------------------
  function _keyToType(key) {
    var prefix = key.split('-')[0];
    if (prefix === 'carcamos')    return 'carcamo';
    if (prefix === 'dataloggers') return 'datalogger';
    return 'up';
  }

  // ---------------------------------------------------------------------------
  // _initBaja — load BajaScript via requirejs; 5s timeout
  // ---------------------------------------------------------------------------

  function _initBaja() {
    if (_bajaReady || _bajaFailed || _initStarted) return;
    _initStarted = true;

    if (typeof requirejs !== 'function') {
      console.warn('[SubscriptionPool] requirejs not available — REST fallback only');
      _bajaFailed = true;
      _pendingCallbacks = [];
      return;
    }

    var _timeout = setTimeout(function() {
      if (!_bajaReady) {
        console.warn('[SubscriptionPool] BajaScript load timed out (5s) — REST fallback');
        _bajaFailed = true;
        _pendingCallbacks = [];
      }
    }, 5000);

    try {
      requirejs(['baja!'], function(baja) {
        clearTimeout(_timeout);
        console.log('[SubscriptionPool] BajaScript loaded OK');
        _baja = baja;
        _bajaReady = true;
        var cbs = _pendingCallbacks.slice();
        _pendingCallbacks = [];
        for (var i = 0; i < cbs.length; i++) {
          try { cbs[i](_baja); } catch (e) {
            console.warn('[SubscriptionPool] Pending callback error:', e);
          }
        }
      }, function(err) {
        clearTimeout(_timeout);
        console.warn('[SubscriptionPool] BajaScript failed to load:', err);
        _bajaFailed = true;
        _pendingCallbacks = [];
      });
    } catch (e) {
      clearTimeout(_timeout);
      console.warn('[SubscriptionPool] requirejs threw:', e);
      _bajaFailed = true;
      _pendingCallbacks = [];
    }
  }

  // ---------------------------------------------------------------------------
  // _readEquipment — read all typed properties from a BajaScript BComponent.
  // Returns a plain object matching the REST /api/equipment JSON shape.
  // GOTCHA G6: injects _slotName (lowercase) for EquipmentData routing.
  // ---------------------------------------------------------------------------

  function _readEquipment(comp, type) {
    var data = {};
    var groups = _propsForType(type);
    var numericProps  = groups[0];
    var booleanProps  = groups[1];
    var stringProps   = groups[2];
    var i, prop, val;

    for (i = 0; i < numericProps.length; i++) {
      prop = numericProps[i];
      try {
        val = comp.get(prop);
        data[prop] = (val && typeof val.getValue === 'function') ? val.getValue() : 0;
      } catch (e) { data[prop] = 0; }
    }

    for (i = 0; i < booleanProps.length; i++) {
      prop = booleanProps[i];
      try {
        val = comp.get(prop);
        data[prop] = (val && typeof val.getValue === 'function') ? val.getValue() : false;
      } catch (e) { data[prop] = false; }
    }

    for (i = 0; i < stringProps.length; i++) {
      prop = stringProps[i];
      try {
        val = comp.get(prop);
        if (!val) { data[prop] = ''; continue; }
        if (typeof val.getValue === 'function') {
          data[prop] = String(val.getValue());
        } else {
          data[prop] = val.toString();
        }
      } catch (e) { data[prop] = ''; }
    }

    // GOTCHA G6 — inject slot name so EquipmentData can route this update.
    // comp.getName() returns the Niagara component slot name (e.g. "UP01_P1").
    // CRITICAL: must replicate backend slotNameToId transform —
    // .toLowerCase().replace('_', '-') — so consumers can match against _byId keys.
    try {
      var name = (typeof comp.getName === 'function') ? comp.getName() : null;
      data._slotName = name ? name.toLowerCase().replace(/_/g, '-') : null;
    } catch (e) {
      data._slotName = null;
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // subscribe — generic ORD subscription (used internally and publicly)
  // ---------------------------------------------------------------------------

  function subscribe(pageId, ord, callback) {
    if (_bajaFailed) return;
    if (!_bajaReady) {
      _pendingCallbacks.push(function() { subscribe(pageId, ord, callback); });
      _initBaja();
      return;
    }

    var key = pageId + ':' + ord;
    if (_subscribers[key]) return;

    try {
      var sub = new _baja.Subscriber();
      sub.attach('changed', function(prop) {
        if (callback) callback(prop, null);
      });
      _baja.Ord.make(ord).get({ subscriber: sub }).then(function(comp) {
        if (callback) callback(null, comp);
      });
      _subscribers[key] = sub;
    } catch (e) {
      console.warn('[SubscriptionPool] subscribe error:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // subscribeEquipment — Reflow-style: subscribe to each equipment child directly.
  //
  // Resolves the monitor, iterates children, subscribes to each component.
  // On 'changed', reads values directly from the component and calls
  // onEquipmentUpdate(key, equipData) immediately (no REST roundtrip).
  //
  // key: one of the 18 monitorOrds keys ("ups-1", "carcamos-3", "dataloggers-6")
  // ---------------------------------------------------------------------------

  // CRITICAL fix: window.MX60_CONFIG is never assigned anywhere in the module.
  // Without falling back to MX60.ConfigManager.getConfig() (which IS populated
  // by the /api/config REST call at app boot), this function exits at the
  // null-check below and NO subscriber is ever attached. That single oversight
  // disables the entire live-update path: every call to subscribeEquipment
  // becomes a no-op, _onSubUpdate never fires, and the dashboard freezes after
  // the initial REST load.
  function _readConfig() {
    return window.MX60_CONFIG ||
      (window.MX60 && MX60.ConfigManager && MX60.ConfigManager.getConfig()) ||
      null;
  }

  function subscribeEquipment(pageId, key, onEquipmentUpdate, onMonitorUpdate) {
    if (_bajaFailed) return;

    var cfg = _readConfig();
    if (!cfg || !cfg.monitorOrds) return;
    var ord = cfg.monitorOrds[key];
    if (!ord) return;

    var subKey = pageId + ':equip:' + key;
    if (_subscribers[subKey]) return;

    if (!_bajaReady) {
      _pendingCallbacks.push(function() {
        subscribeEquipment(pageId, key, onEquipmentUpdate, onMonitorUpdate);
      });
      _initBaja();
      return;
    }

    var type = _keyToType(key);
    var cfg2 = _readConfig();
    var debounceMs = (cfg2 && cfg2.bajaDebounceMs) ? cfg2.bajaDebounceMs : 200;

    try {
      var monitorSub = new _baja.Subscriber();

      monitorSub.attach('changed', function() {
        if (onMonitorUpdate) {
          _debounce('monitor:' + key, function() { onMonitorUpdate(key); }, debounceMs);
        }
      });

      _baja.Ord.make(ord).get({ subscriber: monitorSub }).then(function(monitor) {
        // Subscribe to each equipment child
        _subscribeToChildren(pageId, key, monitor, type, onEquipmentUpdate);
        // Fire initial monitor update
        if (onMonitorUpdate) onMonitorUpdate(key);
      });

      _subscribers[subKey] = monitorSub;
    } catch (e) {
      console.warn('[SubscriptionPool] subscribeEquipment error:', e);
    }
  }

  function _subscribeToChildren(pageId, key, monitor, type, onEquipmentUpdate) {
    try {
      // BajaScript API differs across Niagara versions:
      // - iSMA 4.13.2: monitor.getSlots() returns a cursor with $keys (array of
      //   slot name strings) and .each(fn) iterator. monitor.getProperties() is
      //   undefined.
      // - Honeywell 4.14: both exist; getProperties() returns Property[].
      // Strategy: try getSlots() first, then getProperties() fallback.
      var slotNames = _getMonitorSlotNames(monitor);
      if (!slotNames || !slotNames.length) {
        console.warn('[SubscriptionPool] no children found for monitor key=' + key);
        return;
      }

      for (var p = 0; p < slotNames.length; p++) {
        (function(slotName) {
          try {
            var child = monitor.get(slotName);
            if (!child || typeof child.get !== 'function') return;
            if (typeof child.getNavOrd !== 'function') return;

            var childKey = pageId + ':child:' + key + ':' + slotName;
            if (_childSubscribers[childKey]) return;

            var childSub = new _baja.Subscriber();

            childSub.attach('changed', function() {
              _lastUpdateMs = Date.now();
              var equipData = _readEquipment(child, type);
              if (onEquipmentUpdate) onEquipmentUpdate(key, equipData);
            });

            var childOrd = child.getNavOrd().toString();
            _baja.Ord.make(childOrd).get({ subscriber: childSub }).then(function(resolved) {
              _lastUpdateMs = Date.now();
              var equipData = _readEquipment(resolved, type);
              if (onEquipmentUpdate) onEquipmentUpdate(key, equipData);
            });

            _childSubscribers[childKey] = childSub;
          } catch (e) {
            console.warn('[SubscriptionPool] child subscribe error for slot=' + slotName + ':', e);
          }
        })(slotNames[p]);
      }
    } catch (e) {
      console.warn('[SubscriptionPool] _subscribeToChildren error:', e);
    }
  }

  // Universal slot-name extractor — handles BajaScript API variants:
  //   1. iSMA 4.13.2 → monitor.getSlots().$keys = Array<string>
  //   2. iSMA 4.13.2 → monitor.getSlots().each(function(slot, idx)) where
  //                    slot.getName() returns the slotName
  //   3. Honeywell 4.14 → monitor.getProperties() returns Property[] with
  //                       .getName()
  // Returns string[] of slot names, or [] if no API available.
  function _getMonitorSlotNames(monitor) {
    if (!monitor) return [];
    // Strategy 1+2: getSlots()
    if (typeof monitor.getSlots === 'function') {
      try {
        var slots = monitor.getSlots();
        if (slots) {
          // Fast path: $keys is an array of strings
          if (slots.$keys && slots.$keys.length) {
            var out = [];
            for (var i = 0; i < slots.$keys.length; i++) {
              if (typeof slots.$keys[i] === 'string') out.push(slots.$keys[i]);
            }
            if (out.length) return out;
          }
          // Slow path: iterate via .each
          if (typeof slots.each === 'function') {
            var collected = [];
            slots.each(function(slot) {
              var name = null;
              if (slot) {
                if (typeof slot.getName === 'function') name = slot.getName();
                else if (slot.$slotName) name = slot.$slotName;
                else if (slot.name) name = slot.name;
              }
              if (name) collected.push(name);
            });
            if (collected.length) return collected;
          }
        }
      } catch (e) {
        console.warn('[SubscriptionPool] getSlots() iteration failed:', e.message);
      }
    }
    // Strategy 3: legacy getProperties() (Honeywell 4.14)
    if (typeof monitor.getProperties === 'function') {
      try {
        var props = monitor.getProperties();
        if (props && props.length) {
          var pout = [];
          for (var j = 0; j < props.length; j++) {
            var p = props[j];
            var pname = (p && typeof p.getName === 'function') ? p.getName() : String(p);
            if (pname) pout.push(pname);
          }
          return pout;
        }
      } catch (e) {
        console.warn('[SubscriptionPool] getProperties() iteration failed:', e.message);
      }
    }
    return [];
  }

  // ---------------------------------------------------------------------------
  // subscribeMonitors — subscribe to monitor-level ORDs only (for LED states)
  // ---------------------------------------------------------------------------

  function subscribeMonitors(pageId, keys, onChange) {
    if (_bajaFailed) return;
    var cfg = _readConfig();
    if (!cfg || !cfg.monitorOrds) return;
    var debounceMs = (cfg.bajaDebounceMs) ? cfg.bajaDebounceMs : 200;

    for (var i = 0; i < keys.length; i++) {
      (function(k) {
        var ord = cfg.monitorOrds[k];
        if (!ord) return;
        subscribe(pageId, ord, function(prop, comp) {
          if (comp) { if (onChange) onChange(k); return; }
          _debounce('monitor-led:' + k, function() { if (onChange) onChange(k); }, debounceMs);
        });
      })(keys[i]);
    }
  }

  // ---------------------------------------------------------------------------
  // unsubscribeEquipment — clean up subscriptions for a specific key
  // ---------------------------------------------------------------------------

  function unsubscribeEquipment(pageId, key) {
    var subKey = pageId + ':equip:' + key;
    if (_subscribers[subKey]) {
      try { _subscribers[subKey].unsubscribeAll(); } catch (e) {}
      delete _subscribers[subKey];
    }
    // Also clean child subscribers for this key
    var childPrefix = pageId + ':child:' + key + ':';
    var childKeys = Object.keys(_childSubscribers);
    for (var i = 0; i < childKeys.length; i++) {
      if (childKeys[i].indexOf(childPrefix) === 0) {
        try { _childSubscribers[childKeys[i]].unsubscribeAll(); } catch (e) {}
        delete _childSubscribers[childKeys[i]];
      }
    }
  }

  // ---------------------------------------------------------------------------
  // _debounce helper
  // ---------------------------------------------------------------------------

  function _debounce(key, fn, ms) {
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(function() {
      delete _debounceTimers[key];
      fn();
    }, ms);
  }

  // ---------------------------------------------------------------------------
  // cleanup / cleanupAll
  // ---------------------------------------------------------------------------

  function cleanup(pageId) {
    var prefix = pageId + ':';
    var keys = Object.keys(_subscribers);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) === 0) {
        try { _subscribers[keys[i]].unsubscribeAll(); } catch (e) {}
        delete _subscribers[keys[i]];
      }
    }
    var childKeys = Object.keys(_childSubscribers);
    for (var j = 0; j < childKeys.length; j++) {
      if (childKeys[j].indexOf(prefix) === 0) {
        try { _childSubscribers[childKeys[j]].unsubscribeAll(); } catch (e) {}
        delete _childSubscribers[childKeys[j]];
      }
    }
    var timerKeys = Object.keys(_debounceTimers);
    for (var t = 0; t < timerKeys.length; t++) {
      clearTimeout(_debounceTimers[timerKeys[t]]);
      delete _debounceTimers[timerKeys[t]];
    }
  }

  function cleanupAll() {
    var keys = Object.keys(_subscribers);
    for (var i = 0; i < keys.length; i++) {
      try { _subscribers[keys[i]].unsubscribeAll(); } catch (e) {}
    }
    _subscribers = {};
    var childKeys = Object.keys(_childSubscribers);
    for (var j = 0; j < childKeys.length; j++) {
      try { _childSubscribers[childKeys[j]].unsubscribeAll(); } catch (e) {}
    }
    _childSubscribers = {};
    var timerKeys = Object.keys(_debounceTimers);
    for (var t = 0; t < timerKeys.length; t++) {
      clearTimeout(_debounceTimers[timerKeys[t]]);
    }
    _debounceTimers = {};
  }

  // Cleanup on page navigation away (not bfcache tab switch)
  if (window.addEventListener) {
    window.addEventListener('pagehide', function(e) {
      if (e.persisted) return;
      cleanupAll();
      // AP7 fix: clear the watchdog timer on page unload. cleanupAll() does
      // NOT touch _watchdogTimer (intentional — when watchdog detects silence
      // it calls cleanupAll and re-subscribes, the timer must keep ticking).
      // But on real page unload the timer must die or it leaks.
      if (_watchdogTimer) { clearInterval(_watchdogTimer); _watchdogTimer = null; }
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  // Watchdog: detects subscription silence (Fox session drop, Wi-Fi blip,
  // station restart) and triggers re-subscribe via the registered callback.
  // Without this, the dashboard freezes silently after a network blip — no
  // toast, no error, just stale values. Operator has no idea data is dead.
  function _watchdogTick() {
    if (!_bajaReady) return;
    if (!_lastUpdateMs) return; // no baseline yet — wait for first update
    var silentMs = Date.now() - _lastUpdateMs;
    if (silentMs >= WATCHDOG_SILENCE_THRESHOLD_MS && _watchdogResubFn) {
      console.warn('[SubscriptionPool] watchdog: ' + Math.round(silentMs / 1000) +
                   's of silence — attempting reconnect');
      if (MX60.Toast && typeof MX60.Toast.warn === 'function') {
        MX60.Toast.warn('Reconectando con la estación…');
      }
      // Tear down current child subscribers; the resub callback re-creates them.
      cleanupAll();
      _bajaReady = false;
      _bajaFailed = false;
      _initStarted = false;
      _lastUpdateMs = 0;
      // Re-init baja and re-run the resub function (which calls subscribeEquipment
      // for every monitor key the app needs).
      try { _watchdogResubFn(); } catch (e) {
        console.error('[SubscriptionPool] watchdog resub error:', e);
      }
    }
  }

  function _startWatchdog(resubFn) {
    _watchdogResubFn = resubFn;
    if (_watchdogTimer) return;
    _watchdogTimer = setInterval(_watchdogTick, WATCHDOG_TICK_MS);
  }

  MX60.SubscriptionPool = {
    init:                _initBaja,
    subscribe:           subscribe,
    subscribeMonitors:   subscribeMonitors,
    subscribeEquipment:  subscribeEquipment,
    unsubscribeEquipment: unsubscribeEquipment,
    readEquipment:       _readEquipment,
    cleanup:             cleanup,
    cleanupAll:          cleanupAll,
    isReady:             function() { return _bajaReady; },
    isFailed:            function() { return _bajaFailed; },
    startWatchdog:       _startWatchdog,
    lastUpdateMs:        function() { return _lastUpdateMs; }
  };

  window.MX60 = MX60;

})(window);
