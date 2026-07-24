/**
 * LiveHistoryBuffer.js — MX60 namespace
 *
 * In-memory ring buffer that accumulates live equipment snapshots from
 * EquipmentData subscriptions/polling. Used by UpDetail.js when a slot has
 * no BHistoryExt configured (no historyId in /api/equipment-histories).
 *
 * Ported from SanLuis HistoryChart.js ring-buffer pattern, generalised:
 *   - Keyed per equipId (not per RTU name)
 *   - Stores all numeric slot values (not only tempAmbiente/humidity/setPointCool)
 *   - No chart rendering — data layer only; rendering stays in UpDetail.js
 *
 * Capacity: MAX_POINTS = 120 per equipId.
 * Memory estimate: 120 × 86 equipos × ~80 bytes/entry ≈ 825 KB max. Acceptable.
 *
 * ES5 STRICT IIFE.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var MAX_POINTS = 120;

  // Metadata keys that must not be stored as slot values
  var SKIP = {
    _slotName: 1, ord: 1, id: 1, type: 1, label: 1,
    planta: 1, position: 1, status: 1, equipName: 1, tag: 1,
    summary: 1, alarms: 1
  };

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  var _byEquip = {}; // { equipId: [{t: epochMs, values: {...}}, ...] }

  // ---------------------------------------------------------------------------
  // addDataPoint(equipId, equipData)
  //
  // Called from EquipmentData._notify() for every equipment on every update.
  // Copies all non-metadata numeric (and boolean/string) slot values into a
  // timestamped entry and appends to the ring buffer, evicting oldest when full.
  // ---------------------------------------------------------------------------

  function addDataPoint(equipId, equipData) {
    if (!equipId || !equipData) return;
    if (!_byEquip[equipId]) _byEquip[equipId] = [];

    var entry = { t: Date.now(), values: {} };
    for (var k in equipData) {
      if (Object.prototype.hasOwnProperty.call(equipData, k) && !SKIP[k]) {
        entry.values[k] = equipData[k];
      }
    }

    // Also flatten summary sub-object if present (some serializers nest temps there)
    if (equipData.summary && typeof equipData.summary === 'object') {
      var sm = equipData.summary;
      for (var sk in sm) {
        if (Object.prototype.hasOwnProperty.call(sm, sk) && !SKIP[sk]) {
          entry.values[sk] = sm[sk];
        }
      }
    }

    _byEquip[equipId].push(entry);
    if (_byEquip[equipId].length > MAX_POINTS) {
      _byEquip[equipId].shift();
    }
  }

  // ---------------------------------------------------------------------------
  // getSeries(equipId, slotName) → [{t, value}, ...]
  //
  // Returns a time-ascending array of {t: epochMs, value: number} pairs for a
  // single slot of one equipment. Only numeric values are returned (booleans
  // and strings are stored by addDataPoint but filtered here so Chart.js
  // gets clean numeric series). Returns [] if no data.
  // ---------------------------------------------------------------------------

  function getSeries(equipId, slotName) {
    var arr = _byEquip[equipId] || [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var entry = arr[i];
      if (!entry.values) continue;
      if (!Object.prototype.hasOwnProperty.call(entry.values, slotName)) continue;
      var v = entry.values[slotName];
      if (typeof v === 'number' && isFinite(v)) {
        out.push({ t: entry.t, value: v });
      }
    }
    return out; // already ascending (pushed in time order)
  }

  // ---------------------------------------------------------------------------
  // getSlots(equipId) → string[]
  //
  // Returns an array of slot names that have at least one data point for the
  // given equipment. Useful for auto-discovery (UpDetail can ask which slots
  // have buffer data when backend histMap is empty).
  // ---------------------------------------------------------------------------

  function getSlots(equipId) {
    var arr = _byEquip[equipId] || [];
    var seen = {};
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i].values) continue;
      for (var k in arr[i].values) {
        if (Object.prototype.hasOwnProperty.call(arr[i].values, k)) {
          seen[k] = true;
        }
      }
    }
    return Object.keys(seen);
  }

  // ---------------------------------------------------------------------------
  // filterByRange(series, rangeMs) → [{t, value}, ...]
  //
  // Returns the subset of series where t >= (Date.now() - rangeMs).
  // Used by UpDetail._loadRealHistory when source is 'buffer' and the user
  // selects a range tab (1h/8h/24h/7d). rangeMs=0 or falsy → return all.
  // ---------------------------------------------------------------------------

  function filterByRange(series, rangeMs) {
    if (!series || !series.length) return [];
    if (!rangeMs) return series;
    var cutoff = Date.now() - rangeMs;
    var out = [];
    for (var i = 0; i < series.length; i++) {
      if (series[i].t >= cutoff) out.push(series[i]);
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // getCount(equipId) → number
  //
  // Returns how many samples are currently buffered for an equipId.
  // Useful from the console: MX60.LiveHistoryBuffer.getCount('up01-p1')
  // ---------------------------------------------------------------------------

  function getCount(equipId) {
    return (_byEquip[equipId] || []).length;
  }

  // ---------------------------------------------------------------------------
  // clear(equipId?)
  //
  // Wipes buffer for a specific equipId, or all buffers when called with no arg.
  // ---------------------------------------------------------------------------

  function clear(equipId) {
    if (equipId) {
      delete _byEquip[equipId];
    } else {
      _byEquip = {};
    }
  }

  // ---------------------------------------------------------------------------
  // T2.7: consume EquipmentSnapshotStore flush event (batch de ids pending).
  //
  // Antes (legacy): EquipmentData._notify() llamaba addDataPoint(id, equip) por
  // cada uno de los 68 equipos en cada notify (~16/seg) = 1,088 calls/seg.
  // Top consumer del CPU post-Sprint-2.5a (7.6%).
  //
  // Ahora: LiveHistoryBuffer es subscriber del store. El store flush se dispara
  // cada ~500ms throttled = ~136 calls/seg (8× menos). Mismo dato, mismo ring
  // buffer, sin perdida — solo se entrega menos frecuente.
  // ---------------------------------------------------------------------------

  function _consumeFlush(payload) {
    if (!payload || !payload.ids || !payload.latestById) return;
    for (var i = 0; i < payload.ids.length; i++) {
      var id = payload.ids[i];
      var equip = payload.latestById[id];
      if (equip) addDataPoint(id, equip);
    }
  }

  function init() {
    if (MX60.EquipmentSnapshotStore && typeof MX60.EquipmentSnapshotStore.subscribeAll === 'function') {
      MX60.EquipmentSnapshotStore.subscribeAll(_consumeFlush);
    } else {
      console.warn('[LiveHistoryBuffer] EquipmentSnapshotStore.subscribeAll no disponible — buffer requiere addDataPoint manual (modo legacy)');
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  MX60.LiveHistoryBuffer = {
    init:          init,
    addDataPoint:  addDataPoint,
    getSeries:     getSeries,
    getSlots:      getSlots,
    filterByRange: filterByRange,
    getCount:      getCount,
    clear:         clear
  };

  window.MX60 = MX60;

})(window);
