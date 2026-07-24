/**
 * MX60.ModoOverrideStore
 *
 * In-memory override layer for `modoOperacion` per UP. Provides optimistic
 * UI state while the real write (via MX60.writePoint) propagates to Niagara.
 * The override layer wins over the summary value at
 * read time, until the page is reloaded (prototype scope).
 *
 * Resumen page subscribes to mutation events to refresh its matrix view
 * without polling. UP detail subscribes too so two open tabs stay in sync.
 *
 * When the real Niagara station is wired up, this file is the single
 * point to delete: render reads `summary.modoOperacion` directly and the
 * write goes via subscriberMixIn.
 */
(function() {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  var _store = {};
  var _listeners = [];

  function get(equipId) {
    if (!equipId) return null;
    return Object.prototype.hasOwnProperty.call(_store, equipId) ? _store[equipId] : null;
  }
  function set(equipId, modo) {
    if (!equipId) return;
    _store[equipId] = modo;
    _emit({ type: 'set', equipId: equipId, modo: modo });
  }
  function clear(equipId) {
    if (!equipId) return;
    delete _store[equipId];
    _emit({ type: 'clear', equipId: equipId });
  }
  function getAll() {
    var out = {};
    for (var k in _store) {
      if (Object.prototype.hasOwnProperty.call(_store, k)) out[k] = _store[k];
    }
    return out;
  }
  function subscribe(fn) {
    if (typeof fn !== 'function') return function() {};
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

  window.MX60.ModoOverrideStore = {
    get: get,
    set: set,
    clear: clear,
    getAll: getAll,
    subscribe: subscribe
  };
})();
