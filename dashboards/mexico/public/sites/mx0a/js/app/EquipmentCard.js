/**
 * EquipmentCard.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Renders BSnlsRtu equipment data into two formats:
 *
 *   renderCard(equip)      → HTML string for the grid card view
 *   renderListRow(equip)   → HTML string for a <tr> in the list view
 *
 * equip object shape (matches /api/equipment/{floor} REST response):
 *   setPointCool  {number}  Cooling set-point °C (writable)
 *   tempAmbiente  {number}  Ambient temperature °C
 *   humidity      {number}  Relative humidity %
 *   fanOn      {boolean} Fan running
 *   online     {boolean} Network reachability
 *   chilledWater  {boolean} Chilled water valve
 *   networkConnection {boolean} Thermostat network
 *   mode       {string}  Operating mode string
 *   equipName  {string}  Human-readable display name
 *   tag        {string}  P&ID tag (e.g. "RTU-401")
 *   location   {string}  Physical location description
 *   ipAddress  {string}  Controller IP
 *   macAddress {string}  Controller MAC
 *
 * Alarm thresholds (aligned with dashboard CSS):
 *   tempAmbiente > 28°C  → alarm  (critical, red)
 *   tempAmbiente > 24°C  → warn   (yellow)  — used in list row colour
 *   tempAmbiente > 26°C  → critical class on card metric
 *
 * Hysteresis band:
 *   Zone = [setPoint-1 … setPoint+1]
 *   Track range = [setPoint-3 … setPoint+5]  (8 °C window)
 *   Needle colour: hot when tempAmbiente > setPoint+1, cold otherwise
 *
 * Card click: calls window.SNLS.openRTUModal(equipJsonEscaped)
 * The modal implementation lives in DashboardApp.js / ViewManager.js.
 *
 * Icons dependency:
 *   SNLS.Icons.get(name, size) is looked up dynamically on each render
 *   so load order between this file and Icons.js does not matter.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Safe icon accessor.
   * SNLS.Icons may or may not be loaded — fall back to empty string.
   */
  function _escJs(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function _ic(name, size) {
    if (SNLS.Icons && typeof SNLS.Icons.get === 'function') {
      return SNLS.Icons.get(name, size);
    }
    return '';
  }

  /**
   * Format a numeric value to one decimal place.
   * Returns '—' for null / undefined / NaN.
   */
  function _fmt(val) {
    if (val === null || val === undefined || val !== val) return '\u2014';
    return parseFloat(val).toFixed(1);
  }

  /**
   * Compute all derived display values for one equip object.
   * Centralises threshold logic so renderCard and renderListRow stay DRY.
   */
  function _derive(equip) {
    var online       = !!equip.online;
    var tempAmbiente = parseFloat(equip.tempAmbiente) || 0;
    var setPointCool = parseFloat(equip.setPointCool) || 22;
    var humidity     = parseFloat(equip.humidity)     || 0;
    var fanOn        = !!equip.fanOn;
    var alarm        = !!equip.alarm;
    var chilledWater = !!equip.chilledWater;

    // Status: alarm > prendida (fanOn) > espera > offline
    var statusKey;
    if (!online) {
      statusKey = 'offline';
    } else if (alarm) {
      statusKey = 'alarm';
    } else if (fanOn) {
      statusKey = 'on';
    } else {
      statusKey = 'off';
    }

    // Hysteresis bar geometry (percentage positions 0-100).
    var barMin    = setPointCool - 3;
    var barMax    = setPointCool + 5;
    var barRange  = barMax - barMin;            // always 8
    var zoneLeft  = ((setPointCool - 1 - barMin) / barRange) * 100;  // ~25%
    var zoneWidth = (2 / barRange) * 100;                        // ~25%
    var needleRaw = (tempAmbiente - barMin) / barRange * 100;
    var needlePos = needleRaw < 0 ? 0 : needleRaw > 100 ? 100 : needleRaw;
    var needleClass = tempAmbiente > (setPointCool + 1) ? 'hot' : 'cold';

    // Display name (priority: equipName → tag → 'RTU').
    var name = (equip.equipName && equip.equipName.length > 0)
      ? equip.equipName
      : (equip.tag && equip.tag.length > 0 ? equip.tag : 'RTU');

    return {
      online:       online,
      tempAmbiente: tempAmbiente,
      setPointCool: setPointCool,
      humidity:     humidity,
      fanOn:        fanOn,
      alarm:        alarm,
      chilledWater: chilledWater,
      statusKey:    statusKey,
      zoneLeft:     zoneLeft,
      zoneWidth:    zoneWidth,
      needlePos:    needlePos,
      needleClass:  needleClass,
      name:        name,
      ip:          equip.ipAddress || '',
      location:    equip.location  || '',
      tag:         equip.tag       || ''
    };
  }

  /**
   * Build the escaped JSON payload used in onclick for the modal.
   * Uses window.escape (deprecated but universally available in ES5 browsers
   * and Niagara's web runtime).  The modal decodes with window.unescape.
   */
  function _modalPayload(equip) {
    return window.escape(JSON.stringify(equip));
  }

  // ---------------------------------------------------------------------------
  // Mode HTML block (used only in card view)
  // ---------------------------------------------------------------------------

  function _modeHtml(d) {
    if (!d.online) {
      return '<span class="mode-badge mode-offline">' +
        _ic('wifi-off', 13) + ' Offline</span>';
    }
    if (d.fanOn) {
      return '<span class="mode-badge mode-cooling">' +
        _ic('snowflake', 13) + ' Enfriando</span>';
    }
    return '<span class="mode-badge mode-standby">' +
      _ic('pause-circle', 13) + ' Standby</span>';
  }

  // ---------------------------------------------------------------------------
  // Indicator pill (Comp 1, Comp 2, Fan)
  // ---------------------------------------------------------------------------

  function _indicator(label, active, iconName, spin) {
    var stateClass = active ? 'on' : 'off';
    var spinClass  = (active && spin) ? ' icon-spin' : '';
    return '<div class="rtu-indicator ' + stateClass + '">' +
      '<span class="rtu-indicator-icon' + spinClass + '">' + _ic(iconName, 13) + '</span>' +
      label +
    '</div>';
  }

  // ---------------------------------------------------------------------------
  // Public: renderCard — Simplified Reflow style
  // ---------------------------------------------------------------------------

  function renderCard(equip, floorKey) {
    var d = _derive(equip);

    // LED color: green=prendida, blue=espera, red=alarma, gray=offline
    var ledColor = '#475569'; // gray offline
    var statusLabel = 'Offline';
    if (!d.online) {
      ledColor = '#475569';
      statusLabel = 'Offline';
    } else if (d.alarm) {
      ledColor = '#ef4444';
      statusLabel = 'Alarma';
    } else if (d.fanOn) {
      ledColor = '#10b981';
      statusLabel = 'Prendida';
    } else {
      ledColor = '#00d4aa';
      statusLabel = 'En Espera';
    }

    var fKey = floorKey || '';

    var html =
      '<div class="rtu-card' + (!d.online ? ' offline' : '') + '"' +
          ' style="border-left:4px solid ' + ledColor + '"' +
          ' onclick="window.SNLS.Router.navigate(\'detail\',{floorKey:\'' + _escJs(fKey) + '\',equipName:\'' + _escJs(d.name) + '\'})">' +
        '<div class="rtu-card-header">' +
          '<div class="rtu-name">' + d.name + '</div>' +
          '<span class="rtu-card-type">FCU</span>' +
        '</div>' +
        '<div class="rtu-card-location">' + d.location + '</div>' +
        '<div class="rtu-card-body">' +
          '<div class="rtu-card-img-wrap">' +
            '<img src="img/fcu/fcu_frame_0.png" alt="FCU" class="rtu-card-fcu-img">' +
          '</div>' +
          '<div class="rtu-card-data">' +
            '<div class="rtu-card-temp">' + _fmt(d.tempAmbiente) + ' \u00b0C</div>' +
            '<div class="rtu-card-temp-label">Temp Ambiente</div>' +
            '<div class="rtu-card-status-row">' +
              '<div class="rtu-card-led" style="background:' + ledColor + ';box-shadow:0 0 8px ' + ledColor + '"></div>' +
              '<span class="rtu-card-status-label" style="color:' + ledColor + '">' + statusLabel + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    return html;
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  SNLS.EquipmentCard = {
    renderCard: renderCard
  };

  window.SNLS = SNLS;

})(window);
