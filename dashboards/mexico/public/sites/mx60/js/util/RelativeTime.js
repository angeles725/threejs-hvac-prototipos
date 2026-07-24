/**
 * MX60.util.RelativeTime
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Spanish relative-time formatter. No external dependencies.
 *
 * Public API:
 *   MX60.util.RelativeTime.format(ts)   → string  (relative, e.g. "hace 5 min")
 *   MX60.util.RelativeTime.absolute(ts) → string  (full locale date)
 *
 * Buckets:
 *   < 60s           → "hace pocos segundos"
 *   60s – 60min     → "hace N min"
 *   60min – 24h     → "hace N h"
 *   1d – 7d         → "ayer HH:MM" (if exactly 1 day) | "hace N días"
 *   > 7d            → "2 may 09:15"
 *
 * REQ-4, ADR-3 — chihuahua-alarms-reflow-visual-and-ack-fix
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};
  MX60.util = MX60.util || {};

  var MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  function _pad(n) { return n < 10 ? '0' + n : String(n); }

  function _hhmm(d) {
    return _pad(d.getHours()) + ':' + _pad(d.getMinutes());
  }

  function format(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);

    var now  = Date.now();
    var diff = now - d.getTime();
    if (diff < 0) diff = 0;

    var sec = Math.floor(diff / 1000);
    var min = Math.floor(diff / 60000);
    var hr  = Math.floor(diff / 3600000);
    var day = Math.floor(diff / 86400000);

    if (sec < 60) return 'hace pocos segundos';
    if (min < 60) return 'hace ' + min + ' min';
    if (hr  < 24) return 'hace ' + hr  + ' h';
    if (day === 1) return 'ayer ' + _hhmm(d);
    if (day <= 7)  return 'hace ' + day + ' días';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + _hhmm(d);
  }

  function absolute(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    try {
      return d.toLocaleString('es-MX');
    } catch (e) {
      return d.toLocaleString();
    }
  }

  MX60.util.RelativeTime = {
    format:   format,
    absolute: absolute
  };
  window.MX60 = MX60;

})(window);
