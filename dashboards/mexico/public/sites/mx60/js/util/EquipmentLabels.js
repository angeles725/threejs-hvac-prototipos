/**
 * MX60.util.EquipmentLabels
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Fuente unica de verdad para transformar codigos crudos de equipo
 * a labels humanos. Maneja:
 *   - UD\d+  -> "Unidad Dividida NN" (zero-padded a 2 digitos)
 *   - UP\d+  -> "Unidad Paquete NN"  (zero-padded a 2 digitos)
 *   - CARRIER N -> "Carrier N"
 *   - LABORATORIO -> "Laboratorio"
 *   - cualquier otro -> pass-through (HIREF, LIEBERT, HiRef-01, etc.)
 *
 * SDD mx60-frontend-equipment-and-planta-label-mapping.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};
  MX60.util = MX60.util || {};

  var RE_UD = /^UD(\d+)$/;
  var RE_UP = /^UP(\d+)$/;
  var RE_CARRIER = /^CARRIER\s+(\d+)$/;

  function _pad2(n) {
    var s = String(parseInt(n, 10));
    return s.length < 2 ? ('0' + s) : s;
  }

  function format(raw) {
    if (raw == null || raw === '') return '';
    var s = String(raw);
    var u = s.toUpperCase();
    var m;
    if (u === 'LABORATORIO') return 'Laboratorio';
    m = u.match(RE_UD);
    if (m) return 'Unidad Dividida ' + _pad2(m[1]);
    m = u.match(RE_UP);
    if (m) return 'Unidad Paquete ' + _pad2(m[1]);
    m = u.match(RE_CARRIER);
    if (m) return 'Carrier ' + m[1];
    return s; // pass-through preserva casing original (HiRef-01, Liebert-A, etc.)
  }

  MX60.util.EquipmentLabels = {
    format: format
  };

  window.MX60 = MX60;

})(window);
