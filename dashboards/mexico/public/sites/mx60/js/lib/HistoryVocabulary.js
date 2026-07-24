/**
 * MX60.HistoryVocabulary — single source of truth for history range vocabulary.
 *
 * Loaded as a classic script (no `type="module"`) so both ES-module consumers
 * (UpDetail.js, CarcamoDetail.js) and classic-script consumers
 * (DataloggerDetail.js) can read `window.MX60.HistoryVocabulary` without an
 * import statement. Must load BEFORE any history consumer in index.html.
 *
 * Exposes two artifacts:
 *
 *   MX60.HistoryVocabulary.RANGES
 *     8-entry array of `{ id, label, hours?, dynamic?, points, step }`.
 *     - id: frontend canonical key (`1h | 8h | 24h | 7d | today | yesterday | 30d | mtd`).
 *     - hours: upper-bound window in hours (static ranges only).
 *     - dynamic: true if the cutoff is computed by clock (today/yesterday/mtd).
 *     - points: target sample count for backend stride + Chart.js render.
 *     - step: representative interval in ms (for filterHistoryByRange cutoff
 *       and Chart.js axis hints).
 *
 *   MX60.HistoryVocabulary.RANGE_TO_BACKEND
 *     8-entry map from frontend id → canonical backend key recognized by
 *     `ChiHistoryHelper.computeRange`. Each `RANGES[i].id` MUST have an
 *     entry here; the invariant is enforced at fetch time via
 *     `console.warn('[<consumer>] unknown range id: ' + id)` + safe fallback
 *     to `'lastHour'`.
 *
 * Consumers MUST NOT mutate the returned arrays/maps. They are frozen for
 * safety. To extend the vocabulary, edit this file and bump its cache buster
 * in index.html.
 *
 * Refs:
 *   - openspec/changes/mx60-history-time-range/spec.md REQ-1, REQ-3
 *   - openspec/changes/mx60-history-time-range/design.md Decision 1 (location)
 *     and Decision 5 (RANGES shape with `dynamic` flag).
 */
(function (global) {
  'use strict';

  var MX60 = global.MX60 = global.MX60 || {};

  if (MX60.HistoryVocabulary) return; // already loaded — idempotent

  var RANGES = Object.freeze([
    Object.freeze({ id: '1h',        label: '1h',    hours: 1,      points: 60,  step: 60 * 1000 }),         // 1pt/min
    Object.freeze({ id: '8h',        label: '8h',    hours: 8,      points: 96,  step: 5 * 60 * 1000 }),     // 1pt/5min
    Object.freeze({ id: '24h',       label: '24h',   hours: 24,     points: 96,  step: 15 * 60 * 1000 }),    // 1pt/15min
    Object.freeze({ id: '7d',        label: '7d',    hours: 168,    points: 168, step: 60 * 60 * 1000 }),    // 1pt/hour
    // R1.3 — 4 backend ranges previamente escondidos (design Decision 5).
    // `dynamic: true` → cutoff computado por reloj, no por `hours * 3600000`.
    Object.freeze({ id: 'today',     label: 'Today', dynamic: true, points: 144, step: 10 * 60 * 1000 }),    // cutoff = inicio del día local
    Object.freeze({ id: 'yesterday', label: 'Yest',  dynamic: true, points: 96,  step: 15 * 60 * 1000 }),    // ventana fija del día anterior
    Object.freeze({ id: '30d',       label: '30d',   hours: 720,    points: 360, step: 2 * 60 * 60 * 1000 }), // 30 días estáticos
    Object.freeze({ id: 'mtd',       label: 'MTD',   dynamic: true, points: 360, step: 2 * 60 * 60 * 1000 })  // cutoff = primer día del mes local
  ]);

  var RANGE_TO_BACKEND = Object.freeze({
    '1h':        'lastHour',
    '8h':        'last8Hours',
    '24h':       'last24Hours',
    '7d':        'last7Days',
    'today':     'today',
    'yesterday': 'yesterday',
    '30d':       'last30Days',
    'mtd':       'monthToDate'
  });

  MX60.HistoryVocabulary = Object.freeze({
    RANGES: RANGES,
    RANGE_TO_BACKEND: RANGE_TO_BACKEND
  });
})(window);
