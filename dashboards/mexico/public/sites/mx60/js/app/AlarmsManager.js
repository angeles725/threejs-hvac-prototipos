/**
 * MX60.AlarmsManager
 *
 * In-memory store + fetch layer for alarm data. Manages a single cache of
 * up to MAX_ALARMS entries (Fix B15). Exposes a subscriber/listener pattern
 * identical to ModoOverrideStore so pages can react to data changes.
 *
 * IMPORTANT — alarm comparison logic (lectura vs setpoint, < or >, single
 * vs two-level escalation) lives entirely in the BACKEND (Niagara
 * BAlarmService + per-equipment slots). The frontend only consumes
 * pre-fired alarm objects with { triggerSlot, value, threshold, priority }
 * and never evaluates thresholds. If the operator wants to change a
 * setpoint, that flows through Configuración → backend slot write → backend
 * re-evaluates → fires/clears alarms. Do NOT add comparison code here.
 *
 * Sub-paso (a): READ MACHINE only — fetch, cache, filter, count.
 * Sub-paso (b) will add: ack mutations, Toast undo, polling badge.
 *
 * Public API:
 *   init()                       — one-time setup (idempotent)
 *   destroy()                    — clears listeners, cancels in-flight fetch
 *   loadAll(cb)                  — fetch alarms.json, populate cache, notify listeners
 *   getFiltered({ priority, type }) → array — client-side AND filter
 *   getCount()                   → { high, med, low, total, byType: { up, carcamo, datalogger } }
 *   addListener(fn)              — subscribe to cache changes
 *   removeListener(fn)           — unsubscribe
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var MAX_ALARMS = 200;   // Fix B15: cap to prevent unbounded growth

  var _cache     = [];    // array of alarm objects, sorted newest first
  var _listeners = [];    // array of subscriber functions
  var _loading   = false; // Fix B6 (loading guard): true while XHR in flight
  var _pendingCbs = [];   // queued callbacks if loadAll called while loading
  var _destroyed = false; // set on destroy() to abandon in-flight XHR callback
  var _pollTimer = null;  // H1 fix: alarm polling interval so badge stays live

  // ─── helpers ──────────────────────────────────────────────────────────────

  function _getAlarmsUrl() {
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    return (cfg && cfg.api && cfg.api.alarms) || '/mx60/api/alarms';
  }

  /**
   * Sort descending by timestamp, then cap to MAX_ALARMS dropping oldest.
   * Fix B15: if data source sends >200 entries we only keep the freshest.
   */
  function _capAndSort(arr) {
    arr.sort(function(a, b) {
      var ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      var tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    if (arr.length > MAX_ALARMS) arr = arr.slice(0, MAX_ALARMS);
    return arr;
  }

  function _emit() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_cache); } catch (e) {}
    }
  }

  // ─── public API ───────────────────────────────────────────────────────────

  function init() {
    _destroyed = false;
    // H1 fix: start alarm polling so the nav badge updates live without
    // requiring a navigation cycle. Cadence read from config (alarmCounts
    // pollMs). Default lowered from 20s → 5s — at 20s an operator can miss
    // an active alarm for almost half a minute, which is above the
    // operator perception threshold for "live".
    if (_pollTimer) return;
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    var ms = (cfg && cfg.pollMs && cfg.pollMs.alarmCounts) || 5000;
    // Initial fetch so badge populates without waiting for the first interval.
    loadAll();
    _pollTimer = setInterval(function() {
      if (_destroyed) return;
      loadAll();
    }, ms);
  }

  function destroy() {
    _destroyed = true;
    _loading   = false;
    _pendingCbs = [];
    _listeners  = [];
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    // _cache intentionally kept — a fresh mount may call loadAll again
    // but the data is still valid. Reset on next loadAll.
  }

  /**
   * loadAll(cb) — fetches alarms fixture and populates the in-memory cache.
   *
   * Fix B6 (loading guard): if already in flight, enqueues cb and returns.
   * The in-flight XHR will flush all pending callbacks when it completes.
   *
   * @param {Function} [cb] — optional callback(alarmArray) called on completion
   */
  function loadAll(cb) {
    if (typeof cb === 'function') _pendingCbs.push(cb);

    if (_loading) return; // guard: enqueued above, will fire when current XHR resolves
    _loading = true;

    var url = _getAlarmsUrl();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.timeout = 10000;

    xhr.onload = function() {
      if (_destroyed) return; // destroy() called while in flight — abandon
      _loading = false;
      var data = [];
      if (xhr.status === 200) {
        try { data = JSON.parse(xhr.responseText); } catch (e) {
          console.error('[AlarmsManager] JSON parse error:', e);
        }
      } else {
        console.warn('[AlarmsManager] HTTP ' + xhr.status + ' fetching alarms');
      }
      if (!Array.isArray(data)) data = [];
      // E.6 (chihuahua-alarms-actions-and-data-batch): No field stripping performed here.
      // New group-record fields from ADR-1 (uuid, uuids, alarmClass, alarmState,
      // lastUpdate, hyperlinkOrd, sourceType) pass through to cached objects as-is.
      _cache = _capAndSort(data);
      // Reconcile AlarmLatchStore against backend truth by piggybacking a periodic equipment refresh.
      // /api/alarms is the alarm-console feed (ackState-driven) and is NOT the source of truth for latches;
      // BChiUp.alarmLatches (delivered via /api/equipment) is. Manual latches written via /api/alarms/latch
      // persist in alarmLatches but may not appear as ackPending in /api/alarms — reconciling via the
      // alarm feed would falsely wipe them. EquipmentData.refresh() triggers seedFromEquipment which is
      // last-write-wins over alarmLatches and preserves both auto and manual entries correctly.
      // Side effect: equipment REST is refetched every 5s here (in baja-OK mode the normal _restFetch
      // poll is gated as fallback only — see EquipmentData.restFallbackMs comment).
      if (MX60.EquipmentData && typeof MX60.EquipmentData.refresh === 'function') {
        MX60.EquipmentData.refresh();
      }
      // === Re-latch active alarms from /api/alarms (existing behavior, UNCHANGED) ===
      // Seed AlarmLatchStore from active (un-acked) alarms so status pills,
      // visualClass, and bucket counts everywhere (HomeMap, EquipmentCard,
      // Configuracion via StatusResolver) reflect the backend alarm state
      // from FIRST RENDER. Without this seed, the operator opens the
      // dashboard, sees the nav badge "3 alarms" but every status pill
      // shows "En espera" because AlarmLatchStore._store is empty.
      if (MX60.AlarmLatchStore && typeof MX60.AlarmLatchStore.latch === 'function') {
        for (var ai = 0; ai < _cache.length; ai++) {
          var al = _cache[ai];
          if (!al || !al.sourceId || !al.triggerSlot) continue;
          // Only seed un-acked active alarms — acked alarms shouldn't latch UI.
          // F9 fix: affirmative match avoids latching alarms with missing/null
          // ackState (which can include stale or already-cleared entries that
          // the previous negative-guard incorrectly let through).
          if (al.ackState !== 'ackPending') continue;
          MX60.AlarmLatchStore.latch(al.sourceId, al.triggerSlot, {
            note: al.message || ''
          });
        }
      }
      _emit();
      _flushPending();
    };

    xhr.onerror = function() {
      if (_destroyed) return;
      _loading = false;
      console.warn('[AlarmsManager] Network error — cache unchanged');
      _flushPending();
    };

    xhr.ontimeout = function() {
      if (_destroyed) return;
      _loading = false;
      console.warn('[AlarmsManager] Timeout — cache unchanged');
      _flushPending();
    };

    xhr.send();
  }

  function _flushPending() {
    var cbs = _pendingCbs.slice();
    _pendingCbs = [];
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](_cache); } catch (e) {}
    }
  }

  /**
   * getFiltered({ priority, type }) — AND filter over the in-memory cache.
   *
   * @param {Object} [opts]
   * @param {string|null} [opts.priority] — 'high'|'med'|'low' or null/'' for all
   * @param {string|null} [opts.type]     — 'up'|'carcamo'|'datalogger' or null/'' for all
   * @returns {Array}
   */
  function getFiltered(opts) {
    opts = opts || {};
    var priority = opts.priority || null;
    var type     = opts.type     || null;

    if (!priority && !type) return _cache.slice();

    var out = [];
    for (var i = 0; i < _cache.length; i++) {
      var a = _cache[i];
      if (priority && a.priority !== priority) continue;
      if (type     && a.sourceType !== type)  continue;
      out.push(a);
    }
    return out;
  }

  /**
   * getCount() — totals computed from cache (NOT from alarmCounts.json).
   * alarmCounts.json is only a seed/fallback — source of truth is the live cache.
   *
   * @returns {{ high: number, med: number, low: number, total: number,
   *             byType: { up: number, carcamo: number, datalogger: number } }}
   */
  function getCount() {
    var counts = { high: 0, med: 0, low: 0, total: 0, byType: { up: 0, carcamo: 0, datalogger: 0 } };
    for (var i = 0; i < _cache.length; i++) {
      var a = _cache[i];
      counts.total++;
      if (a.priority === 'high') counts.high++;
      else if (a.priority === 'med')  counts.med++;
      else if (a.priority === 'low')  counts.low++;
      if (a.sourceType === 'up')          counts.byType.up++;
      else if (a.sourceType === 'carcamo')    counts.byType.carcamo++;
      else if (a.sourceType === 'datalogger') counts.byType.datalogger++;
    }
    return counts;
  }

  /**
   * addListener(fn) — fn is called with the alarm array whenever the cache
   * changes (after loadAll completes or future mutations in sub-paso (b)).
   */
  function addListener(fn) {
    if (typeof fn !== 'function') return;
    _listeners.push(fn);
  }

  /**
   * removeListener(fn) — removes a previously registered listener.
   */
  function removeListener(fn) {
    var idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  }

  // =========================================================================
  // ackAlarms — acknowledge alarm(s) via canonical Niagara BAlarmService action.
  //
  // Pattern: baja.Ord.make("alarm:").get() → svc.ackAlarms({ ids }) — same as
  // nmodsreflow (app-readable.js:14520-14545) which is verified working in
  // production. Replaces previous custom servlet path (POST /mx60/api/alarms/ack)
  // whose snapshot+singular-ack flow ran successfully but did NOT persist
  // record state to the live alarm DB (root cause: BQL cursor returns detached
  // record snapshots, ackAlarm(rec) reflection invoke does not propagate).
  //
  // The custom servlet code (BChiServlet.handleAlarmAck + ChiAlarmHelper.ackAlarms +
  // ChiServletDispatch.resolveAckStatus + AckResult) is left in place but
  // becomes unused. Cleanup deferred to a follow-up SDD.
  //
  // @param {string[]} uuids   Array of alarm UUID strings to acknowledge.
  // @param {string}   note    Ignored (preserved for caller-contract stability;
  //                            note attachment is a separate baja action that
  //                            never traveled the servlet path either).
  // @param {Object}   opts    Optional: { onSuccess(result, meta), onError(msg) }
  //                            onSuccess receives a synthesized result object
  //                            { ackedCount, failedCount: 0, errors: [] } so
  //                            existing callers (AlarmsPage, AlarmDetailPage,
  //                            AlarmCards) keep working without changes.
  // =========================================================================

  function ackAlarms(uuids, note, opts) {
    if (!Array.isArray(uuids) || uuids.length === 0) return;
    opts = opts || {};

    if (!window.baja) {
      var bajaErr = 'BajaScript no disponible';
      if (MX60.Toast && typeof MX60.Toast.show === 'function') {
        MX60.Toast.show({ message: 'Error al reconocer: ' + bajaErr, durationMs: 5000 });
      }
      if (typeof opts.onError === 'function') opts.onError(bajaErr);
      return;
    }

    window.baja.Ord.make('alarm:').get().then(function(svc) {
      return svc.ackAlarms({ ids: uuids });
    }).then(function() {
      // baja resolves with no value on success — synthesize the legacy result
      // shape so existing callbacks keep their (result, meta) contract.
      var result = { ackedCount: uuids.length, failedCount: 0, errors: [] };
      if (typeof opts.onSuccess === 'function') {
        opts.onSuccess(result, { partial: false });
      }
      // Refresh cache so UI reflects the new ack state on next render.
      loadAll(null);
    }, function(err) {
      var errMsg = (err && err.message) ||
          (err && typeof err.toString === 'function' ? err.toString() : '') ||
          'unknown';
      if (MX60.Toast && typeof MX60.Toast.show === 'function') {
        MX60.Toast.show({ message: 'Error al reconocer: ' + errMsg, durationMs: 5000 });
      }
      if (typeof opts.onError === 'function') opts.onError(errMsg);
    });
  }

  // =========================================================================
  // SDD mx60-ackall-full-db-and-badge-no-filter (fix: bajascript ack path)
  // ackAllFullDb — split responsibility:
  //   1. XHR POST → server collects UUID list (COLLECT-ONLY, no server-side ack).
  //   2. BajaScript svc.ackAlarms({ids}) → the ONLY proven ack path.
  // opts: { onSuccess({ackedCount, ackedSourceCount, truncated}), onError(msg) }
  // =========================================================================
  function ackAllFullDb(opts) {
    opts = opts || {};
    var cfg = (MX60.ConfigManager && MX60.ConfigManager.getConfig &&
               MX60.ConfigManager.getConfig()) || {};
    var url = (cfg.api && cfg.api.alarmAckAll) || '/mx60/api/alarms/ackAll';

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;

      // Step 1: handle HTTP errors
      if (xhr.status < 200 || xhr.status >= 300) {
        var msg = 'HTTP ' + xhr.status;
        try {
          var errBody = JSON.parse(xhr.responseText || '{}');
          if (errBody && errBody.error) msg = errBody.error;
        } catch (e) {}
        if (typeof opts.onError === 'function') opts.onError(msg);
        return;
      }

      // Step 2: parse UUID list from server
      var parsed;
      try { parsed = JSON.parse(xhr.responseText || '{}'); }
      catch (e) {
        if (typeof opts.onError === 'function') opts.onError('Respuesta inválida del servidor');
        return;
      }
      var uuids       = (parsed && parsed.uuids) || [];
      var sourceCount = (parsed && parsed.sourceCount) || 0;
      var truncated   = parsed && parsed.truncated === true;

      // Step 3: short-circuit if nothing to ack
      if (!uuids.length) {
        if (typeof opts.onSuccess === 'function') {
          opts.onSuccess({ ackedCount: 0, ackedSourceCount: 0, truncated: false });
        }
        loadAll(null);
        return;
      }

      // Step 4: ack via BajaScript (the only proven path — see ackAlarms() above)
      if (!window.baja) {
        if (typeof opts.onError === 'function') opts.onError('BajaScript no disponible');
        return;
      }
      window.baja.Ord.make('alarm:').get().then(function(svc) {
        return svc.ackAlarms({ ids: uuids });
      }).then(function() {
        if (typeof opts.onSuccess === 'function') {
          opts.onSuccess({
            ackedCount:       uuids.length,
            ackedSourceCount: sourceCount,
            truncated:        truncated
          });
        }
        loadAll(null);
      }, function(err) {
        var errMsg = (err && err.message) ||
            (err && typeof err.toString === 'function' ? err.toString() : '') ||
            'BajaScript ack failed';
        if (typeof opts.onError === 'function') opts.onError(errMsg);
      });
    };
    xhr.send('{}');
  }

  // ─── namespace export ─────────────────────────────────────────────────────

  MX60.AlarmsManager = {
    init:           init,
    destroy:        destroy,
    loadAll:        loadAll,
    getFiltered:    getFiltered,
    getCount:       getCount,
    addListener:    addListener,
    removeListener: removeListener,
    ackAlarms:      ackAlarms,
    ackAllFullDb:   ackAllFullDb
  };

  window.MX60 = MX60;

})(window);
