/**
 * MX60.OutputOverrideStore
 *
 * In-memory override layer for device commands (FAN, COMPRESOR 1, COMPRESOR 2)
 * per UP — only meaningful while the unit's modoOperacion is MANUAL. Stored
 * value per equipId is a partial map { fan?, comp1?, comp2? } of booleans.
 *
 * Why it exists: provides optimistic UI state while MX60.writePoint propagates
 * to Niagara, so a user toggle is not overwritten by the next equipment.json poll.
 * This mirrors ModoOverrideStore. When decommissioned, this
 * file is the single point to delete: render reads s.fanOn et al. directly,
 * writes go via subscriberMixIn to fanCmd / comp1Cmd / comp2Cmd boolean
 * writables. Cleared by callers when leaving MANUAL — control returns to
 * the backend.
 */
(function () {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  var VALID_KEYS = ['fan', 'comp1', 'comp2'];
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

  function get(equipId, deviceKey) {
    if (!equipId || VALID_KEYS.indexOf(deviceKey) < 0) return null;
    if (!_has(_store, equipId)) return null;
    var rec = _store[equipId];
    return _has(rec, deviceKey) ? rec[deviceKey] : null;
  }

  function set(equipId, deviceKey, value) {
    if (!equipId || VALID_KEYS.indexOf(deviceKey) < 0) return;
    if (!_store[equipId]) _store[equipId] = {};
    _store[equipId][deviceKey] = !!value;
    _emit({ type: 'set', equipId: equipId, deviceKey: deviceKey, value: !!value });
  }

  function removeOne(equipId, deviceKey) {
    if (!equipId || VALID_KEYS.indexOf(deviceKey) < 0) return;
    if (!_has(_store, equipId)) return;
    var rec = _store[equipId];
    if (!_has(rec, deviceKey)) return;
    delete rec[deviceKey];
    var empty = true;
    for (var k in rec) { if (_has(rec, k)) { empty = false; break; } }
    if (empty) delete _store[equipId];
    _emit({ type: 'remove', equipId: equipId, deviceKey: deviceKey });
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

  window.MX60.OutputOverrideStore = {
    get: get,
    getAll: getAll,
    set: set,
    remove: removeOne,
    clear: clear,
    subscribe: subscribe
  };
})();
