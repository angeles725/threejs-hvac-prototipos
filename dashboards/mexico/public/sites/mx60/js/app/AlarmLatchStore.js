/**
 * MX60.AlarmLatchStore
 *
 * Client-side store for alarm latch state. State is seeded from the Niagara
 * station on each equipment fetch (via seedFromEquipment) and written through
 * to the server on latch/unlatch operations (POST /api/alarms/latch|unlatch).
 *
 * State per (equipId, alarmKey):
 *   - latched: boolean (true once tripped, stays true until reset)
 *   - latchedAt: number (Date.now() at latch time)
 *   - latchedBy: string (username from server, or 'auto' / 'manual' locally)
 *   - note: string (editable while latched, persists with the latch entry)
 *
 * Latching is sticky — a violated threshold that returns to normal does NOT
 * un-latch. Only an explicit reset clears it.
 *
 * Race policy: last-write-wins v1. Concurrent writes from multiple operators
 * result in the latest HTTP POST winning on the server. The store reflects
 * the most recent local state; next seedFromEquipment call resolves any drift.
 *
 * C-001/C-002/C-003/C-004: chihuahua-charts-alarms-schedules-batch
 */
(function () {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  var _store = {};      // _store[equipId][alarmKey] = { latched, latchedAt, latchedBy, note }
  var _listeners = [];
  // Map of equipId → ord string, populated by seedFromEquipment.
  var _ordMap = {};

  function _has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function _emit(evt) {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](evt); } catch (e) {}
    }
  }

  function get(equipId, alarmKey) {
    if (!equipId || !alarmKey) return null;
    if (!_has(_store, equipId)) return null;
    var rec = _store[equipId];
    return _has(rec, alarmKey) ? rec[alarmKey] : null;
  }

  function getAll(equipId) {
    if (!equipId || !_has(_store, equipId)) return null;
    var src = _store[equipId];
    var out = {};
    for (var k in src) { if (_has(src, k)) out[k] = src[k]; }
    return out;
  }

  function isLatched(equipId, alarmKey) {
    var e = get(equipId, alarmKey);
    return !!(e && e.latched);
  }

  function hasAnyLatched(equipId) {
    var all = getAll(equipId);
    if (!all) return false;
    for (var k in all) { if (_has(all, k) && all[k].latched) return true; }
    return false;
  }

  function latchedKeys(equipId) {
    var all = getAll(equipId);
    var out = [];
    if (!all) return out;
    for (var k in all) { if (_has(all, k) && all[k].latched) out.push(k); }
    return out;
  }

  // =========================================================================
  // C-002: seedFromEquipment — populate store from equipment REST response.
  // Called by EquipmentData after each successful /api/equipment fetch.
  // Last-write-wins: resets entire _store and repopulates from server data.
  // =========================================================================

  function seedFromEquipment(equipArr) {
    if (!Array.isArray(equipArr)) return;
    // Reset store and ordMap before seeding.
    _store  = {};
    _ordMap = {};

    for (var i = 0; i < equipArr.length; i++) {
      var eq = equipArr[i];
      if (!eq || typeof eq.id !== 'string') continue;
      var equipId = eq.id;

      // Store ord for write-through calls.
      if (typeof eq.ord === 'string' && eq.ord) {
        _ordMap[equipId] = eq.ord;
      }

      // Parse alarmLatches — already a JS object in the REST response.
      var latches = eq.alarmLatches;
      if (!latches || typeof latches !== 'object') continue;

      for (var key in latches) {
        if (!_has(latches, key)) continue;
        var entry = latches[key];
        if (!entry || !entry.latched) continue;
        if (!_store[equipId]) _store[equipId] = {};
        _store[equipId][key] = {
          latched:   true,
          latchedAt: typeof entry.latchedAt === 'number' ? entry.latchedAt : 0,
          latchedBy: typeof entry.latchedBy === 'string' ? entry.latchedBy : 'unknown',
          note:      typeof entry.note      === 'string' ? entry.note      : ''
        };
      }
    }
    _emit({ type: 'seed' });
  }

  // =========================================================================
  // C-003: latch — optimistic write + POST /api/alarms/latch + rollback.
  // Opts:
  //   reason: 'manual' | 'auto' (default 'auto')
  //   note:   string
  //   silent: suppress emit
  // =========================================================================

  function latch(equipId, alarmKey, opts) {
    if (!equipId || !alarmKey) return;
    opts = opts || {};
    var reason = (opts.reason === 'manual') ? 'manual' : 'auto';

    // Preserve snapshot for rollback.
    var prevEntry = get(equipId, alarmKey);
    var prevSnapshot = prevEntry ? JSON.parse(JSON.stringify(prevEntry)) : null;

    if (!_store[equipId]) _store[equipId] = {};
    // No-op if already latched (preserves original latchedAt/latchedBy/note).
    if (_store[equipId][alarmKey] && _store[equipId][alarmKey].latched) return;

    // Optimistic write — show latch immediately with '(saving...)' indicator.
    _store[equipId][alarmKey] = {
      latched:   true,
      latchedAt: Date.now(),
      latchedBy: '(saving...)',
      note:      typeof opts.note === 'string' ? opts.note : ''
    };

    if (!opts.silent) {
      _emit({ type: 'latch', equipId: equipId, alarmKey: alarmKey, reason: reason });
    }

    // Write-through to server (fire-and-forget with rollback on error).
    var ord = _ordMap[equipId];
    if (!ord) return; // no ord — local-only (boot-time seed path)

    var body = JSON.stringify({
      ord:          ord,
      thresholdKey: alarmKey,
      note:         typeof opts.note === 'string' ? opts.note : ''
    });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/mx60/api/alarms/latch', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        // Confirm — update latchedBy from '(saving...)' to actual reason.
        if (_store[equipId] && _store[equipId][alarmKey]) {
          _store[equipId][alarmKey].latchedBy = reason;
          _emit({ type: 'latch-confirmed', equipId: equipId, alarmKey: alarmKey });
        }
      } else {
        // Rollback on error.
        if (prevSnapshot) {
          _store[equipId][alarmKey] = prevSnapshot;
        } else {
          delete _store[equipId][alarmKey];
          var empty = true;
          for (var k in _store[equipId]) {
            if (_has(_store[equipId], k)) { empty = false; break; }
          }
          if (empty) delete _store[equipId];
        }
        _emit({ type: 'rollback', equipId: equipId, alarmKey: alarmKey,
                status: xhr.status });
      }
    };
    xhr.send(body);
  }

  function setNote(equipId, alarmKey, note) {
    var e = get(equipId, alarmKey);
    if (!e || !e.latched) return; // notes only valid while latched
    e.note = (note == null) ? '' : String(note);
    _emit({ type: 'note', equipId: equipId, alarmKey: alarmKey });
  }

  // =========================================================================
  // C-004: reset (unlatch) — optimistic delete + POST /api/alarms/unlatch + rollback.
  // =========================================================================

  function reset(equipId, alarmKey) {
    if (!equipId || !_has(_store, equipId)) return;
    var rec = _store[equipId];
    if (!_has(rec, alarmKey)) return;

    // Snapshot for rollback.
    var snapshot = JSON.parse(JSON.stringify(rec[alarmKey]));

    // Optimistic delete.
    delete rec[alarmKey];
    var empty = true;
    for (var k in rec) { if (_has(rec, k)) { empty = false; break; } }
    if (empty) delete _store[equipId];
    _emit({ type: 'reset', equipId: equipId, alarmKey: alarmKey });

    // Write-through to server.
    var ord = _ordMap[equipId];
    if (!ord) return; // local-only (no ord in map)

    var body = JSON.stringify({ ord: ord, thresholdKey: alarmKey });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/mx60/api/alarms/unlatch', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 200) {
        // Rollback: restore the entry.
        if (!_store[equipId]) _store[equipId] = {};
        _store[equipId][alarmKey] = snapshot;
        _emit({ type: 'rollback', equipId: equipId, alarmKey: alarmKey,
                status: xhr.status });
      }
    };
    xhr.send(body);
  }

  // =========================================================================
  // C-005 (ADR-5): resetAll — baja-native action invocation.
  //
  // Replaces the client-only stub (C-004 pattern) with a baja-native call that
  // reaches the server via Niagara's standard action dispatcher. This provides
  // transactional semantics, operator identity capture (via ContextThread), and
  // durable alarmLatches reset in the .bog file — none of which the stub achieved.
  //
  // Order (R-FE-3 optimistic-update guard): server call FIRST, then local state
  // cleared AFTER the promise resolves. Do NOT clear _store before server confirms.
  //
  // Error path: emits a 'resetAllError' event and shows a toast. Local state is
  // NOT modified so the UI stays consistent with server state.
  //
  // Spec refs: S-3, R-FE-1, R-FE-2, R-FE-3.
  // Design refs: ADR-5 (baja-native), S-3 manual verify.
  // =========================================================================

  // Helper — the real MX60.Toast API is `Toast.show({message, ...})`.
  // No `.success`/`.error`/`.info`/`.warn` methods exist; calling them throws
  // TypeError and breaks the .then() chain mid-flight (observed in production
  // 2026-05-10: post-reset cleanup never completes, button gets stuck).
  function _toast(message) {
    if (!message) return;
    if (window.MX60 && window.MX60.Toast
        && typeof window.MX60.Toast.show === 'function') {
      try { window.MX60.Toast.show({ message: message }); }
      catch (e) { /* never let toast errors break the caller */ }
    }
  }

  function resetAll(equipId) {
    if (!equipId) return Promise.resolve();

    var ord = _ordMap[equipId];
    if (!ord) {
      _toast('Error al resetear: equipo sin ord registrado');
      return Promise.reject('no-ord');
    }

    if (!window.baja) {
      _toast('Error al resetear: BajaScript no disponible');
      return Promise.reject('BajaScript no disponible');
    }

    return window.baja.Ord.make(ord).get().then(function (up) {
      return up.resetAlarmas();
    }).then(function () {
      // R-FE-3: update local state AFTER server confirms reset.
      // Server has written alarmLatches = "{}" — clear our local projection.
      delete _store[equipId];
      _emit({ type: 'resetAll', equipId: equipId });
      // Force a refresh of caches that drive equipment-level renderers.
      // Without this, UpDetail/HomeMap/EquipmentCard read stale alarmLatches +
      // protXActive from EquipmentData until the next 5s poll cycle, so the
      // user must press F5 to see the cleared state. AlarmsManager._cache also
      // keeps the old alarm records visible until the next poll.
      if (window.MX60 && window.MX60.EquipmentData
          && typeof window.MX60.EquipmentData.refresh === 'function') {
        window.MX60.EquipmentData.refresh();
      }
      if (window.MX60 && window.MX60.AlarmsManager
          && typeof window.MX60.AlarmsManager.loadAll === 'function') {
        window.MX60.AlarmsManager.loadAll();
      }
      _toast('Alarmas reseteadas');
    }, function (err) {
      var msg = (err && err.message) || (err && typeof err.toString === 'function' && err.toString()) || 'unknown';
      _emit({ type: 'resetAllError', equipId: equipId, error: msg });
      _toast('Error al resetear: ' + msg);
      throw err;
    });
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    _listeners.push(fn);
    return function () {
      var i = _listeners.indexOf(fn);
      if (i >= 0) _listeners.splice(i, 1);
    };
  }

  window.MX60.AlarmLatchStore = {
    get:               get,
    getAll:            getAll,
    isLatched:         isLatched,
    hasAnyLatched:     hasAnyLatched,
    latchedKeys:       latchedKeys,
    seedFromEquipment: seedFromEquipment,
    latch:             latch,
    setNote:           setNote,
    reset:             reset,
    resetAll:          resetAll,
    subscribe:         subscribe
  };
})();
