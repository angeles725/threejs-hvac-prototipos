/**
 * EquipmentSnapshotStore.js — MX60 namespace
 *
 * Aggregator/scheduler entre EquipmentData (poll BajaScript) y los UI
 * subscribers (UpDetail, etc.). Coalesce de N pushes -> 1 flush throttled
 * por requestAnimationFrame + setTimeout cap (default 500ms).
 *
 * Rationale (Sprint 2 / T2.6 — Perplexity anti-pattern #6 fix):
 *   El onDataChange original ejecuta TODO el work (DOM reads/writes, charts,
 *   scene mutations 3D, class toggles) en el MISMO macrotask por cada poll
 *   BajaScript (1-2 Hz). Eso produce layout thrashing severo + bursts de CPU.
 *   Este store separa el data cycle del UI cycle: BajaScript empuja snapshots
 *   acá, el store los acumula, y un scheduler unico despacha un solo flush
 *   por ventana (default 500ms) a los subscribers UI.
 *
 * Topologia:
 *   EquipmentData._notify()
 *        v (un solo listener: este store)
 *   _onEquipmentData(state)
 *        v (push: latest + ring buffer por id, mark pending)
 *   _scheduleFlush()  ->  RAF + 500ms hard cap (tab hidden fallback)
 *        v
 *   _flush()
 *        v (por id pending: subscriber({latest, ringBuffer, deltaMs}))
 *   UI subscribers hacen DOM/3D/chart updates ACA (no en cada poll).
 *
 * Public API:
 *   init()                          — idempotente; engancha a EquipmentData
 *   subscribe(equipId, callback)    — retorna unsubscribe()
 *   flushNow(equipId)               — flush sync (primer paint, sin esperar 500ms)
 *   getLatest(equipId)              — snapshot mas reciente o null
 *   getRingBuffer(equipId)          — array de snapshots (oldest -> newest)
 *   setFlushInterval(ms)            — runtime tunable, default 500
 *   setRingSize(n)                  — runtime tunable, default 120
 *   getStats()                      — diagnostico (pushCount, flushCount, etc.)
 *
 * Payload del flush event:
 *   {
 *     latest:     <equip object, mismo shape que EquipmentData.getById()>,
 *     ringBuffer: <Array de snapshots, oldest -> newest, cap = ringSize>,
 *     deltaMs:    <ms desde el flush previo para este id, o null si es el primero>
 *   }
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  // ---------- State ----------
  var _initialized      = false;
  var _flushIntervalMs  = 500;
  var _ringSize         = 120;
  var _latestById       = {};   // id -> latest equip snapshot
  var _ringById         = {};   // id -> array of snapshots
  var _subscribersById  = {};   // id -> [callback, ...]
  var _globalSubscribers = [];  // T2.7: callbacks que reciben TODO el batch en cada flush (LiveHistoryBuffer pattern)
  var _pendingIds       = {};   // id -> true (set semantics via object)
  var _lastFlushTsById  = {};   // id -> performance.now() del ultimo flush
  var _rafId            = null;
  var _capTimerId       = null;

  // diagnostics
  var _pushCount      = 0;
  var _flushCount     = 0;
  var _coalesceCount  = 0;      // pushes que coincidieron con flush ya programado

  // ---------- Internals ----------

  function _now() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  function _hasPending() {
    for (var k in _pendingIds) {
      if (Object.prototype.hasOwnProperty.call(_pendingIds, k)) return true;
    }
    return false;
  }

  function _ringPush(id, snapshot) {
    var ring = _ringById[id];
    if (!ring) {
      ring = [];
      _ringById[id] = ring;
    }
    ring.push(snapshot);
    if (ring.length > _ringSize) {
      // splice cap (amortizado, mismo pattern que UpDetail.fullHistory)
      ring.splice(0, ring.length - _ringSize);
    }
  }

  function _onEquipmentData(state) {
    if (!state || !state.byId) return;
    var byId = state.byId;
    for (var id in byId) {
      if (!Object.prototype.hasOwnProperty.call(byId, id)) continue;
      var equip = byId[id];
      if (!equip) continue;
      _latestById[id] = equip;
      _ringPush(id, equip);
      _pendingIds[id] = true;
      _pushCount++;
    }
    _scheduleFlush();
  }

  function _scheduleFlush() {
    if (_rafId !== null || _capTimerId !== null) {
      _coalesceCount++;
      return;
    }
    // RAF para alinear con el frame natural del browser.
    _rafId = requestAnimationFrame(_flushIfReady);
    // Cap duro: si el tab esta hidden, RAF no dispara. setTimeout fuerza flush.
    _capTimerId = setTimeout(_flushIfReady, _flushIntervalMs);
  }

  function _flushIfReady() {
    if (_rafId !== null) {
      cancelAnimationFrame(_rafId);
      _rafId = null;
    }
    if (_capTimerId !== null) {
      clearTimeout(_capTimerId);
      _capTimerId = null;
    }
    _flush();
  }

  function _flush() {
    if (!_hasPending()) return;
    _flushCount++;
    var nowTs = _now();
    var ids = [];
    for (var id in _pendingIds) {
      if (Object.prototype.hasOwnProperty.call(_pendingIds, id)) ids.push(id);
    }
    _pendingIds = {};
    for (var i = 0; i < ids.length; i++) {
      var equipId = ids[i];
      var subs = _subscribersById[equipId];
      if (!subs || !subs.length) continue;
      var prevTs = _lastFlushTsById[equipId];
      var deltaMs = (typeof prevTs === 'number') ? (nowTs - prevTs) : null;
      _lastFlushTsById[equipId] = nowTs;
      var payload = {
        latest:     _latestById[equipId] || null,
        ringBuffer: _ringById[equipId] ? _ringById[equipId].slice() : [],
        deltaMs:    deltaMs
      };
      // Copia defensiva: si un subscriber se desuscribe durante el callback,
      // no rompe el iter del array original.
      var subsCopy = subs.slice();
      for (var j = 0; j < subsCopy.length; j++) {
        try {
          subsCopy[j](payload);
        } catch (e) {
          console.error('[EquipmentSnapshotStore] subscriber error for ' + equipId + ':', e);
        }
      }
    }
    // T2.7: invocar globalSubscribers UNA vez por flush con el batch completo.
    // Para consumers que procesan TODOS los equipos (ej LiveHistoryBuffer) en lugar
    // de suscribirse a cada equipId individualmente.
    if (_globalSubscribers.length && ids.length) {
      var batchPayload = {
        ids:        ids,
        latestById: _latestById,
        flushTs:    nowTs
      };
      var globalCopy = _globalSubscribers.slice();
      for (var g = 0; g < globalCopy.length; g++) {
        try {
          globalCopy[g](batchPayload);
        } catch (e) {
          console.error('[EquipmentSnapshotStore] global subscriber error:', e);
        }
      }
    }
  }

  // ---------- Public API ----------

  function init() {
    if (_initialized) return;
    if (!MX60.EquipmentData || typeof MX60.EquipmentData.addListener !== 'function') {
      console.warn('[EquipmentSnapshotStore] EquipmentData not loaded — init aborted');
      return;
    }
    MX60.EquipmentData.addListener(_onEquipmentData);
    // Seed inmediato si EquipmentData ya tiene state (cubre el caso en que UpDetail
    // monta despues del primer fetch — primer paint puede usar getLatest sin esperar).
    if (typeof MX60.EquipmentData.isLoaded === 'function' && MX60.EquipmentData.isLoaded()
        && typeof MX60.EquipmentData.getAll === 'function') {
      var all = MX60.EquipmentData.getAll();
      for (var i = 0; i < all.length; i++) {
        var eq = all[i];
        if (eq && eq.id) {
          _latestById[eq.id] = eq;
          _ringPush(eq.id, eq);
        }
      }
    }
    _initialized = true;
  }

  function subscribe(equipId, callback) {
    if (typeof equipId !== 'string' || typeof callback !== 'function') {
      return function noop() {};
    }
    if (!_initialized) init();
    var subs = _subscribersById[equipId];
    if (!subs) {
      subs = [];
      _subscribersById[equipId] = subs;
    }
    subs.push(callback);
    var alive = true;
    return function unsubscribe() {
      if (!alive) return;
      alive = false;
      var arr = _subscribersById[equipId];
      if (!arr) return;
      for (var i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === callback) arr.splice(i, 1);
      }
      if (arr.length === 0) {
        delete _subscribersById[equipId];
      }
    };
  }

  function flushNow(equipId) {
    if (typeof equipId !== 'string') return;
    var subs = _subscribersById[equipId];
    var latest = _latestById[equipId];
    if (!subs || !subs.length || !latest) return;
    var nowTs = _now();
    var prevTs = _lastFlushTsById[equipId];
    var deltaMs = (typeof prevTs === 'number') ? (nowTs - prevTs) : null;
    _lastFlushTsById[equipId] = nowTs;
    var payload = {
      latest:     latest,
      ringBuffer: _ringById[equipId] ? _ringById[equipId].slice() : [],
      deltaMs:    deltaMs
    };
    if (_pendingIds[equipId]) delete _pendingIds[equipId];
    var subsCopy = subs.slice();
    for (var i = 0; i < subsCopy.length; i++) {
      try {
        subsCopy[i](payload);
      } catch (e) {
        console.error('[EquipmentSnapshotStore] subscriber error for ' + equipId + ':', e);
      }
    }
  }

  function getLatest(equipId) {
    return (typeof equipId === 'string') ? (_latestById[equipId] || null) : null;
  }

  function getRingBuffer(equipId) {
    if (typeof equipId !== 'string') return [];
    var ring = _ringById[equipId];
    return ring ? ring.slice() : [];
  }

  function setFlushInterval(ms) {
    if (typeof ms !== 'number' || ms < 0) return;
    _flushIntervalMs = ms;
  }

  function setRingSize(n) {
    if (typeof n !== 'number' || n < 1) return;
    _ringSize = Math.floor(n);
    for (var id in _ringById) {
      if (Object.prototype.hasOwnProperty.call(_ringById, id)) {
        var r = _ringById[id];
        if (r.length > _ringSize) r.splice(0, r.length - _ringSize);
      }
    }
  }

  function getStats() {
    var subscriberCount = 0;
    for (var id in _subscribersById) {
      if (Object.prototype.hasOwnProperty.call(_subscribersById, id)) {
        subscriberCount += _subscribersById[id].length;
      }
    }
    return {
      initialized:     _initialized,
      flushIntervalMs: _flushIntervalMs,
      ringSize:        _ringSize,
      pushCount:       _pushCount,
      flushCount:      _flushCount,
      coalesceCount:   _coalesceCount,
      subscriberCount: subscriberCount,
      trackedEquipIds: Object.keys(_latestById).length
    };
  }

  // T2.7: subscribeAll — consumers que procesan TODOS los equipos en cada flush.
  // callback recibe { ids: [...], latestById: {...}, flushTs: <ms> }.
  // Retorna unsubscribe. Idempotente (lazy init).
  function subscribeAll(callback) {
    if (typeof callback !== 'function') return function noop() {};
    if (!_initialized) init();
    _globalSubscribers.push(callback);
    var alive = true;
    return function unsubscribe() {
      if (!alive) return;
      alive = false;
      for (var i = _globalSubscribers.length - 1; i >= 0; i--) {
        if (_globalSubscribers[i] === callback) _globalSubscribers.splice(i, 1);
      }
    };
  }

  MX60.EquipmentSnapshotStore = {
    init:             init,
    subscribe:        subscribe,
    subscribeAll:     subscribeAll,
    flushNow:         flushNow,
    getLatest:        getLatest,
    getRingBuffer:    getRingBuffer,
    setFlushInterval: setFlushInterval,
    setRingSize:      setRingSize,
    getStats:         getStats
  };

  window.MX60 = MX60;

})(window);
