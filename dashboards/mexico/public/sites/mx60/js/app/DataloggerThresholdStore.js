/**
 * MX60.DataloggerThresholdStore
 *
 * Read-through cache + write-through for datalogger pressure thresholds.
 * Station Niagara slots are the single source of truth (REQ-G4-DATALOGGER).
 * Comparison is INVERTED — lectura < umbral triggers degraded color.
 *
 * Keys per equipId: umbralAdvertencia, umbralCritico (numbers in PSI).
 *
 * C3 refactor: init(equipId, ord, onDone) GETs from station.
 *              set(equipId, thresholdKey, value, ord) POSTs to station then re-fetches.
 *              seedFromEquipment() kept as compatibility shim.
 */
(function () {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  var VALID_KEYS = ['umbralAdvertencia', 'umbralCritico'];
  var _store = {};
  var _listeners = [];

  function _has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getAll(equipId) {
    if (!equipId || !_has(_store, equipId)) return null;
    var src = _store[equipId];
    var out = {};
    for (var k in src) {
      if (_has(src, k)) out[k] = src[k];
    }
    return out;
  }

  function get(equipId, thresholdKey) {
    if (!equipId || VALID_KEYS.indexOf(thresholdKey) < 0) return null;
    if (!_has(_store, equipId)) return null;
    var rec = _store[equipId];
    return _has(rec, thresholdKey) ? rec[thresholdKey] : null;
  }

  /**
   * C3: init — fetch thresholds from station via GET /api/datalogger/{ord}/thresholds.
   * REQ-G4-DATALOGGER AC-4: store MUST NOT initialize from localStorage.
   */
  function init(equipId, ord, onDone) {
    if (!equipId || !ord) {
      if (typeof onDone === 'function') onDone('missing equipId or ord');
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/mx60/api/datalogger/' + encodeURIComponent(ord) + '/thresholds', true);
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
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        var num = Number(data[key]);
        if (!isNaN(num)) _store[equipId][key] = num;
      }
    }
    _emit({ type: 'hydrated', equipId: equipId });
  }

  /**
   * C3: set — POST threshold to station, then re-fetch via init().
   * Write-through: station is source of truth (REQ-G4-DATALOGGER AC-3).
   */
  function set(equipId, thresholdKey, value, ord) {
    if (!equipId || VALID_KEYS.indexOf(thresholdKey) < 0) return;
    var num = (value === null || value === undefined || value === '') ? null : Number(value);
    if (num !== null && isNaN(num)) return;

    if (!ord) {
      if (!_store[equipId]) _store[equipId] = {};
      _store[equipId][thresholdKey] = num;
      _emit({ type: 'set', equipId: equipId, thresholdKey: thresholdKey, value: num });
      return;
    }

    var body = '{"name":"' + thresholdKey + '","value":' + (num !== null ? num : 0) + '}';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/mx60/api/datalogger/' + encodeURIComponent(ord) + '/threshold', true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        init(equipId, ord, null);
        _emit({ type: 'set', equipId: equipId, thresholdKey: thresholdKey, value: num });
      } else {
        console.warn('[DataloggerThresholdStore] set failed HTTP ' + xhr.status + ' for ' + thresholdKey);
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
    return function unsubscribe() {
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
   * Resolve color class for a datalogger reading. Falls through to 'verde'
   * whenever a threshold is missing — matches the agreed default state.
   */
  function colorForReading(equipId, lectura) {
    if (lectura === null || lectura === undefined || isNaN(lectura)) return 'verde';
    var rec = _store[equipId];
    var crit = (rec && _has(rec, 'umbralCritico'))      ? rec.umbralCritico      : null;
    var adv  = (rec && _has(rec, 'umbralAdvertencia'))  ? rec.umbralAdvertencia  : null;
    // C5: REQ-701 — 0.0 or null threshold = not configured, never trigger violation.
    if (crit !== null && crit !== 0 && lectura < crit) return 'rojo';
    if (adv  !== null && adv  !== 0 && lectura < adv)  return 'naranja';
    return 'verde';
  }

  /**
   * C3: seedFromEquipment — hydrate from the equipment REST API response.
   *
   * For each equipment item of type 'datalogger', extracts umbralAdvertencia and
   * umbralCritico from item.summary. Null values are skipped (REQ-006, REQ-701).
   */
  function seedFromEquipment(equipArr) {
    if (!Array.isArray(equipArr)) return;
    var count = 0;
    for (var i = 0; i < equipArr.length; i++) {
      var eq = equipArr[i];
      if (!eq || eq.type !== 'datalogger' || !eq.id) continue;
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
    if (count > 0) console.log('[DataloggerThresholdStore] seeded ' + count + ' items from server');
    _emit({ type: 'seeded', count: count });
  }

  window.MX60.DataloggerThresholdStore = {
    get: get,
    getAll: getAll,
    init: init,
    set: set,
    remove: remove,
    clear: clear,
    subscribe: subscribe,
    colorForReading: colorForReading,
    seedFromEquipment: seedFromEquipment
  };
})();
