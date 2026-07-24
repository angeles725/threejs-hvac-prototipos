/**
 * MX60.UpThresholdStore
 *
 * Read-through cache + write-through for UP protection thresholds.
 * Station Niagara slots are the single source of truth (REQ-G4-UP).
 *
 * Keys per equipId: sobrecargaFan, sobrecargaCompresor1/2,
 *   sobrecargaAbanicos1/2, antifrezzeSistema1/2.
 *
 * C3 refactor: init(equipId, ord, onDone) GETs from station.
 *              set(equipId, thresholdKey, value, ord) POSTs to station then re-fetches.
 *              seedFromEquipment() kept as compatibility shim.
 */
(function () {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  var VALID_KEYS = [
    'sobrecargaFan',
    'sobrecargaCompresor1',
    'sobrecargaCompresor2',
    'sobrecargaAbanicos1',
    'sobrecargaAbanicos2',
    'antifrezzeSistema1',
    'antifrezzeSistema2'
  ];
  var _store = {};
  var _listeners = [];

  function _has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getAll(equipId) {
    if (!equipId || !_has(_store, equipId)) return null;
    var src = _store[equipId];
    var out = {};
    for (var k in src) { if (_has(src, k)) out[k] = src[k]; }
    return out;
  }

  function get(equipId, thresholdKey) {
    if (!equipId || VALID_KEYS.indexOf(thresholdKey) < 0) return null;
    if (!_has(_store, equipId)) return null;
    var rec = _store[equipId];
    return _has(rec, thresholdKey) ? rec[thresholdKey] : null;
  }

  /**
   * C3: init — fetch thresholds from station via GET /api/up/{ord}/thresholds.
   * Hydrates in-memory store for equipId. Calls onDone(err) when complete.
   * REQ-G4-UP AC-7: store MUST NOT initialize from localStorage.
   */
  function init(equipId, ord, onDone) {
    if (!equipId || !ord) {
      if (typeof onDone === 'function') onDone('missing equipId or ord');
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/mx60/api/up/' + encodeURIComponent(ord) + '/thresholds', true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          _hydrateFromServer(equipId, data);
          if (typeof onDone === 'function') onDone(null);
        } catch (e) {
          if (typeof onDone === 'function') onDone('parse error: ' + e.message);
        }
      } else {
        if (typeof onDone === 'function') onDone('HTTP ' + xhr.status);
      }
    };
    xhr.send();
  }

  function _hydrateFromServer(equipId, data) {
    if (!data || typeof data !== 'object') return;
    if (!_store[equipId]) _store[equipId] = {};
    for (var k = 0; k < VALID_KEYS.length; k++) {
      var key = VALID_KEYS[k];
      if (_has(data, key)) {
        var num = Number(data[key]);
        if (!isNaN(num)) _store[equipId][key] = num;
      }
    }
    _emit({ type: 'hydrated', equipId: equipId });
  }

  /**
   * C3: set — POST threshold to station, then re-fetch via init().
   * Write-through: station is source of truth (REQ-G4-UP AC-5, AC-6).
   */
  function set(equipId, thresholdKey, value, ord) {
    if (!equipId || VALID_KEYS.indexOf(thresholdKey) < 0) return;
    var num = (value === null || value === undefined || value === '') ? null : Number(value);
    if (num !== null && isNaN(num)) return;

    if (!ord) {
      // Legacy path: write to memory only (no station ord available).
      if (!_store[equipId]) _store[equipId] = {};
      _store[equipId][thresholdKey] = num;
      _emit({ type: 'set', equipId: equipId, thresholdKey: thresholdKey, value: num });
      return;
    }

    var body = '{"name":"' + thresholdKey + '","value":' + (num !== null ? num : 0) + '}';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/mx60/api/up/' + encodeURIComponent(ord) + '/threshold', true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        init(equipId, ord, null);
        _emit({ type: 'set', equipId: equipId, thresholdKey: thresholdKey, value: num });
      } else {
        console.warn('[UpThresholdStore] set failed HTTP ' + xhr.status + ' for ' + thresholdKey);
      }
    };
    xhr.send(body);
  }

  function remove(equipId, thresholdKey) {
    if (!equipId || VALID_KEYS.indexOf(thresholdKey) < 0) return;
    if (!_has(_store, equipId)) return;
    var rec = _store[equipId];
    if (!_has(rec, thresholdKey)) return;
    delete rec[thresholdKey];
    var empty = true;
    for (var k in rec) { if (_has(rec, k)) { empty = false; break; } }
    if (empty) delete _store[equipId];
    _emit({ type: 'remove', equipId: equipId, thresholdKey: thresholdKey });
  }

  function clear(equipId) {
    if (!equipId || !_has(_store, equipId)) return;
    delete _store[equipId];
    _emit({ type: 'clear', equipId: equipId });
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    _listeners.push(fn);
    return function () {
      var i = _listeners.indexOf(fn);
      if (i >= 0) _listeners.splice(i, 1);
    };
  }

  function _emit(evt) {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](evt); } catch (e) {}
    }
  }

  /**
   * seedFromEquipment — compatibility shim.
   * Hydrates in-memory store from equipment API response (pre-C3 path).
   * Still used when full ord is not available at seed time.
   */
  function seedFromEquipment(equipArr) {
    if (!Array.isArray(equipArr)) return;
    var count = 0;
    for (var i = 0; i < equipArr.length; i++) {
      var eq = equipArr[i];
      if (!eq || eq.type !== 'up' || !eq.id) continue;
      var s = eq.summary || {};
      for (var k = 0; k < VALID_KEYS.length; k++) {
        var key = VALID_KEYS[k];
        var val = s[key];
        if (val === null || val === undefined) continue;
        if (!_store[eq.id]) _store[eq.id] = {};
        var num = Number(val);
        if (isNaN(num)) continue;
        _store[eq.id][key] = num;
        count++;
      }
    }
    // Suprimir log cuando no hay items — backend que aún no tiene UPs configurados
    // produce 1 log per poll = ~120 logs/h, cost real con DevTools abierto.
    if (count > 0) console.log('[UpThresholdStore] seeded ' + count + ' items from server');
    _emit({ type: 'seeded', count: count });
  }

  window.MX60.UpThresholdStore = {
    get: get,
    getAll: getAll,
    init: init,
    set: set,
    remove: remove,
    clear: clear,
    subscribe: subscribe,
    seedFromEquipment: seedFromEquipment
  };
})();
