/**
 * SubscriptionPool.js — SNLS namespace
 *
 * Manages BajaScript subscriptions for the San Luis BMS dashboard.
 * Reflow-style architecture: subscribes to individual RTU components
 * and reads property values DIRECTLY from BajaScript objects (~80ms latency).
 *
 * Data flow:
 *   1. Subscribe to monitor ORD via baja.Ord.make(ord).get({subscriber})
 *   2. On resolve, iterate children (RTU components)
 *   3. Subscribe to each child for 'changed' events
 *   4. On 'changed', read values directly: child.get('propName').getValue()
 *   5. Push updated equipment data to DashboardApp immediately (no REST roundtrip)
 *
 * REST polling remains as fallback for initial load and error recovery.
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  var _baja        = null;
  var _bajaReady   = false;
  var _bajaFailed  = false;
  var _pendingCallbacks = [];
  var _subscribers = {};
  var _childSubscribers = {};
  var _debounceTimers = {};

  // Property names to read from RTU components
  var NUMERIC_PROPS  = ['tempAmbiente', 'humidity', 'setPointCool', 'fanCommand'];
  var BOOLEAN_PROPS  = ['fanOn', 'online', 'alarm', 'chilledWater', 'networkConnection'];
  var STRING_PROPS   = ['mode', 'equipName', 'tag', 'location', 'ipAddress', 'macAddress'];

  // -------------------------------------------------------------------------
  // _initBaja
  // -------------------------------------------------------------------------

  function _initBaja() {
    if (_bajaReady || _bajaFailed || _baja) return;
    if (typeof require !== 'function') { _bajaFailed = true; return; }

    try {
      require(['baja!'], function(baja) {
        console.log('[SubscriptionPool] BajaScript loaded OK');
        _baja = baja;
        _bajaReady = true;
        for (var i = 0; i < _pendingCallbacks.length; i++) {
          try { _pendingCallbacks[i](_baja); } catch (e) {
            console.warn('[SubscriptionPool] Pending callback error:', e);
          }
        }
        _pendingCallbacks = [];
      }, function(err) {
        console.warn('[SubscriptionPool] BajaScript failed to load:', err);
        _bajaFailed = true;
        _pendingCallbacks = [];
      });
    } catch (e) {
      console.warn('[SubscriptionPool] BajaScript require() threw:', e);
      _bajaFailed = true;
    }
  }

  // -------------------------------------------------------------------------
  // _readEquipment — read all properties from a BajaScript BComponent
  // Returns a plain object matching the REST /api/equipment JSON shape
  // -------------------------------------------------------------------------

  function _readEquipment(comp) {
    var data = {};
    var i, prop, val;

    for (i = 0; i < NUMERIC_PROPS.length; i++) {
      prop = NUMERIC_PROPS[i];
      try {
        val = comp.get(prop);
        data[prop] = (val && typeof val.getValue === 'function') ? val.getValue() : 0;
      } catch (e) { data[prop] = 0; }
    }

    for (i = 0; i < BOOLEAN_PROPS.length; i++) {
      prop = BOOLEAN_PROPS[i];
      try {
        val = comp.get(prop);
        data[prop] = (val && typeof val.getValue === 'function') ? val.getValue() : false;
      } catch (e) { data[prop] = false; }
    }

    for (i = 0; i < STRING_PROPS.length; i++) {
      prop = STRING_PROPS[i];
      try {
        val = comp.get(prop);
        if (!val) { data[prop] = ''; continue; }
        // BStatusString has .getValue(), BString only has .toString()
        if (typeof val.getValue === 'function') {
          data[prop] = String(val.getValue());
        } else {
          data[prop] = val.toString();
        }
      } catch (e) { data[prop] = ''; }
    }

    return data;
  }

  // -------------------------------------------------------------------------
  // subscribe — generic ORD subscription
  // -------------------------------------------------------------------------

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
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // subscribeEquipment — Reflow-style: subscribe to each RTU child directly
  //
  // Resolves the monitor, iterates children, subscribes to each BSnlsRtu.
  // On 'changed', reads values directly from the component and calls
  // onEquipmentUpdate(floorKey, equipData) immediately (no REST).
  // -------------------------------------------------------------------------

  function subscribeEquipment(pageId, floorKey, onEquipmentUpdate, onMonitorUpdate) {
    if (_bajaFailed) return;

    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.monitorOrds) return;
    var ord = cfg.monitorOrds[floorKey];
    if (!ord) return;

    var subKey = pageId + ':equip:' + floorKey;
    if (_subscribers[subKey]) return;

    if (!_bajaReady) {
      _pendingCallbacks.push(function() {
        subscribeEquipment(pageId, floorKey, onEquipmentUpdate, onMonitorUpdate);
      });
      _initBaja();
      return;
    }

    try {
      var monitorSub = new _baja.Subscriber();

      // Subscribe to monitor for aggregate changes
      monitorSub.attach('changed', function() {
        if (onMonitorUpdate) {
          _debounce(floorKey, function() { onMonitorUpdate(floorKey); }, 200);
        }
      });

      _baja.Ord.make(ord).get({ subscriber: monitorSub }).then(function(monitor) {
        // Monitor resolved OK
        // Initial resolve — iterate children and subscribe to each RTU
        _subscribeToChildren(pageId, floorKey, monitor, onEquipmentUpdate);

        // Fire initial monitor update
        if (onMonitorUpdate) onMonitorUpdate(floorKey);
      });

      _subscribers[subKey] = monitorSub;
    } catch (e) {}
  }

  function _subscribeToChildren(pageId, floorKey, monitor, onEquipmentUpdate) {
    try {
      // Iterate monitor properties — same pattern as BSnlsServlet.handleApiMonitor
      var props = monitor.getProperties();
      // Children iteration
      if (!props) return;

      for (var p = 0; p < props.length; p++) {
        (function(prop) {
          try {
            var child = monitor.get(prop);
            if (!child || typeof child.get !== 'function') return;
            // Skip non-component properties (strings, numbers, etc.)
            if (!child.getType || !child.getNavOrd) return;

            var childName = prop.getName ? prop.getName() : String(prop);
            var childKey = pageId + ':child:' + floorKey + ':' + childName;
            if (_childSubscribers[childKey]) return;

            var childSub = new _baja.Subscriber();

            childSub.attach('changed', function() {
              // Read values DIRECTLY from BajaScript component — no REST
              var equipData = _readEquipment(child);
              if (onEquipmentUpdate) onEquipmentUpdate(floorKey, equipData);
            });

            // Subscribe to child via ORD resolve (correct BajaScript pattern)
            var childOrd = child.getNavOrd().toString();
            _baja.Ord.make(childOrd).get({ subscriber: childSub }).then(function(resolved) {
              // Initial read from resolved component
              var equipData = _readEquipment(resolved);
              if (onEquipmentUpdate) onEquipmentUpdate(floorKey, equipData);
            });

            _childSubscribers[childKey] = childSub;
          } catch (e) {}
        })(props[p]);
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // subscribeMonitors — legacy convenience (still used for Home/Building LEDs)
  // -------------------------------------------------------------------------

  function subscribeMonitors(pageId, floorKeys, onChange) {
    if (_bajaFailed) return;
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.monitorOrds) return;
    var debounceMs = cfg.bajaDebounceMs || 300;

    for (var i = 0; i < floorKeys.length; i++) {
      (function(fk) {
        var ord = cfg.monitorOrds[fk];
        if (!ord) return;
        subscribe(pageId, ord, function(prop, comp) {
          if (comp) { if (onChange) onChange(fk); return; }
          _debounce(fk, function() { if (onChange) onChange(fk); }, debounceMs);
        });
      })(floorKeys[i]);
    }
  }

  // -------------------------------------------------------------------------
  // _debounce helper
  // -------------------------------------------------------------------------

  function _debounce(key, fn, ms) {
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(function() {
      delete _debounceTimers[key];
      fn();
    }, ms);
  }

  // -------------------------------------------------------------------------
  // cleanup / cleanupAll
  // -------------------------------------------------------------------------

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
  }

  // Cleanup on page navigation away (not tab switch)
  if (window.addEventListener) {
    window.addEventListener('pagehide', function(e) {
      // Only cleanup if page is actually being discarded (not bfcache)
      if (e.persisted) return;
      cleanupAll();
    });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  SNLS.SubscriptionPool = {
    init:               _initBaja,
    subscribe:          subscribe,
    subscribeMonitors:  subscribeMonitors,
    subscribeEquipment: subscribeEquipment,
    readEquipment:      _readEquipment,
    cleanup:            cleanup,
    cleanupAll:         cleanupAll,
    isReady:            function() { return _bajaReady; },
    isFailed:           function() { return _bajaFailed; }
  };

  window.SNLS = SNLS;

})(window);
