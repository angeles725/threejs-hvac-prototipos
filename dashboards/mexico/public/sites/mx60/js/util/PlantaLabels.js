/**
 * MX60.util.PlantaLabels
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Fuente unica de verdad para mapear numero de planta -> label humano
 * en el frontend MX60. Mapa hardcodeado (1..6); planta 6 = "Oficinas".
 *
 * NO lee _meta.plantas — el backend serializa "Planta1" (sin espacio)
 * en ChiEquipmentReader.PLANTA_LABELS, lo que produce inconsistencias
 * visibles. Este helper normaliza a "Planta N" (con espacio).
 *
 * SDD mx60-frontend-equipment-and-planta-label-mapping.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};
  MX60.util = MX60.util || {};

  var PLANTA_NAMES = {
    1: 'Planta 1',
    2: 'Planta 2',
    3: 'Planta 3',
    4: 'Planta 4',
    5: 'Planta 5',
    6: 'Oficinas'
  };

  function format(n) {
    if (n == null || n === '') return '';
    var num = Number(n);
    if (isNaN(num)) return '';
    return PLANTA_NAMES[num] || ('Planta ' + num);
  }

  // displayId: transforma SOLO la presentacion del ID canonico backend
  // (e.g. "ud14-p6") sustituyendo el sufijo -p6 por -of para legibilidad.
  // El ID real (data-cfg-equip, data-cfg-row, store keys, network calls)
  // DEBE seguir siendo "ud14-p6" — esta funcion es estrictamente cosmetica
  // y no debe usarse en atributos DOM ni en llamadas al backend.
  function displayId(rawId) {
    if (rawId == null) return '';
    return String(rawId).replace(/-p6$/, '-of');
  }

  function formatEquipParent(n, equipLabel) {
    var planta = format(n);
    var eq = (equipLabel == null) ? '' :
             (MX60.util.EquipmentLabels ? MX60.util.EquipmentLabels.format(equipLabel) : String(equipLabel));
    if (planta && eq) return planta + ' — ' + eq;
    return planta || eq || '';
  }

  MX60.util.PlantaLabels = {
    format: format,
    displayId: displayId,
    formatEquipParent: formatEquipParent
  };

  window.MX60 = MX60;

})(window);
