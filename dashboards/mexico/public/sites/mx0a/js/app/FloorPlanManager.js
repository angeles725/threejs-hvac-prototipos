/**
 * FloorPlanManager.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Responsibilities:
 *   - Render a full-screen floor-plan overlay for floors 4-7.
 *   - Place RTU marker pins at percentage-based (x, y) positions derived
 *     from the prototype layout data (FLOOR_RTU_POSITIONS).
 *   - Support pan (mouse drag) and zoom (wheel + toolbar buttons).
 *   - Show a live data tooltip on marker hover.
 *   - Fire SNLS.ViewManager.openModal() when a marker is clicked.
 *
 * DOM contract (must match index.html):
 *   #floor-plan-overlay      — full-screen backdrop, display:none by default
 *   #floor-plan-container    — inner container; used as positioning root
 *   #floor-plan-title        — heading text element
 *   #floor-plan-viewport     — clipping region, receives mouse events
 *   #floor-plan-canvas       — transforms applied here (img + markers wrapper)
 *   #floor-plan-img          — <img> for the floor raster image
 *   #floor-plan-markers      — <div> for marker pins (children of canvas)
 *   #rtu-tooltip             — floating tooltip <div>
 *   #fp-zoom-in              — zoom-in toolbar button
 *   #fp-zoom-out             — zoom-out toolbar button
 *   #fp-close                — close toolbar button
 *
 * Data contract:
 *   DashboardApp calls FloorPlanManager.setEquipmentData(floorNum, equipList)
 *   after each REST poll so markers always reflect current values.
 *
 * Global hooks (for onclick= attributes inside innerHTML):
 *   window.SNLS.showTooltip(event, rtuNum, floorNum)
 *   window.SNLS.hideTooltip()
 *   window.SNLS.fpMarkerClick(rtuNum, floorNum)
 *   window.SNLS.openFloorPlan(floorNum)
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // ---------------------------------------------------------------------------
  // Viewport / pan / zoom state
  // ---------------------------------------------------------------------------

  var _state = {
    floor:    null,
    zoom:     1,
    panX:     0,
    panY:     0,
    dragging: false,
    startX:   0,
    startY:   0
  };

  // ---------------------------------------------------------------------------
  // RTU position data — percentage-based (x, y) per floor
  // Each entry: { num: '<rtu>.<floor>', x: <% left>, y: <% top> }
  // ---------------------------------------------------------------------------

  var FLOOR_RTU_POSITIONS = {
    4: [
      {num:'1.4', x:12, y:22}, {num:'2.4', x:20, y:22}, {num:'3.4', x:28, y:22},
      {num:'4.4', x:36, y:22}, {num:'5.4', x:44, y:22}, {num:'6.4', x:52, y:22},
      {num:'7.4', x:60, y:22}, {num:'8.4', x:68, y:22}, {num:'9.4', x:76, y:22},
      {num:'10.4',x:84, y:22}, {num:'11.4',x:88, y:35},
      {num:'12.4',x:12, y:50}, {num:'13.4',x:20, y:50}, {num:'14.4',x:28, y:50},
      {num:'15.4',x:36, y:50}, {num:'16.4',x:44, y:50}, {num:'17.4',x:52, y:50},
      {num:'18.4',x:60, y:50}, {num:'19.4',x:68, y:50}, {num:'20.4',x:76, y:50},
      {num:'21.4',x:84, y:50},
      {num:'22.4',x:55, y:75}, {num:'23.4',x:70, y:75}
    ],
    5: [
      {num:'1.5', x:12, y:22}, {num:'2.5', x:21, y:22}, {num:'3.5', x:30, y:22},
      {num:'4.5', x:39, y:22}, {num:'5.5', x:48, y:22}, {num:'6.5', x:57, y:22},
      {num:'7.5', x:66, y:22}, {num:'8.5', x:75, y:22}, {num:'9.5', x:84, y:22},
      {num:'10.5',x:88, y:35},
      {num:'11.5',x:12, y:50}, {num:'12.5',x:21, y:50}, {num:'13.5',x:30, y:50},
      {num:'14.5',x:39, y:50}, {num:'15.5',x:48, y:50}, {num:'16.5',x:57, y:50},
      {num:'17.5',x:66, y:50}, {num:'18.5',x:75, y:50}, {num:'19.5',x:84, y:50},
      {num:'20.5',x:55, y:75}, {num:'21.5',x:70, y:75}
    ],
    6: [
      {num:'1.6', x:12, y:22}, {num:'2.6', x:22, y:22}, {num:'3.6', x:32, y:22},
      {num:'4.6', x:42, y:22}, {num:'5.6', x:52, y:22}, {num:'6.6', x:62, y:22},
      {num:'7.6', x:72, y:22}, {num:'8.6', x:82, y:22}, {num:'9.6', x:88, y:35},
      {num:'10.6',x:12, y:50}, {num:'11.6',x:22, y:50}, {num:'12.6',x:32, y:50},
      {num:'13.6',x:42, y:50}, {num:'14.6',x:52, y:50}, {num:'15.6',x:62, y:50},
      {num:'16.6',x:72, y:50}, {num:'17.6',x:82, y:50},
      {num:'18.6',x:55, y:75}, {num:'19.6',x:70, y:75}
    ],
    7: [
      {num:'1.7', x:12, y:22}, {num:'2.7', x:20, y:22}, {num:'3.7', x:28, y:22},
      {num:'4.7', x:36, y:22}, {num:'5.7', x:44, y:22}, {num:'6.7', x:52, y:22},
      {num:'7.7', x:60, y:22}, {num:'8.7', x:68, y:22}, {num:'9.7', x:76, y:22},
      {num:'10.7',x:84, y:22}, {num:'11.7',x:88, y:35},
      {num:'12.7',x:12, y:50}, {num:'13.7',x:20, y:50}, {num:'14.7',x:28, y:50},
      {num:'15.7',x:36, y:50}, {num:'16.7',x:44, y:50}, {num:'17.7',x:52, y:50},
      {num:'18.7',x:60, y:50}, {num:'19.7',x:68, y:50}, {num:'20.7',x:76, y:50},
      {num:'21.7',x:84, y:50},
      {num:'22.7',x:60, y:75}
    ]
  };

  // ---------------------------------------------------------------------------
  // Equipment data cache — set by DashboardApp after each REST poll
  // Key: floor number (integer). Value: array of equipment objects.
  // ---------------------------------------------------------------------------

  var _equipmentData = {};

  // ---------------------------------------------------------------------------
  // Private: equipment lookup
  // ---------------------------------------------------------------------------

  /**
   * Find an equipment object whose equipName or tag contains the RTU num string.
   * Returns null when no match is found.
   *
   * @param {Array}  equipList
   * @param {string} rtuNum     e.g. '5.4'
   * @returns {Object|null}
   */
  function _findEquip(equipList, rtuNum) {
    var i, eName;
    for (i = 0; i < equipList.length; i++) {
      eName = equipList[i].equipName || equipList[i].tag || '';
      if (eName.indexOf(rtuNum) >= 0) {
        return equipList[i];
      }
    }
    return null;
  }

  /**
   * Derive a CSS class name from equipment state.
   * Priority: offline > alarm > cooling > standby
   *
   * @param {Object|null} equip
   * @returns {string}  one of 'standby' | 'cooling' | 'alarm' | 'offline'
   */
  function _statusClass(equip) {
    if (!equip) { return 'standby'; }
    if (!equip.online) { return 'offline'; }
    if (equip.alarm) { return 'alarm'; }
    if (equip.fanOn) { return 'cooling'; }
    return 'standby';
  }

  // ---------------------------------------------------------------------------
  // Private: transform helpers
  // ---------------------------------------------------------------------------

  function _applyTransform() {
    var canvas = document.getElementById('floor-plan-canvas');
    if (!canvas) { return; }
    canvas.style.transform =
      'translate(' + _state.panX + 'px, ' + _state.panY + 'px) scale(' + _state.zoom + ')';
  }

  function _resetView() {
    var viewport = document.getElementById('floor-plan-viewport');
    var img      = document.getElementById('floor-plan-img');
    if (!viewport || !img) { return; }

    var vw = viewport.clientWidth;
    var vh = viewport.clientHeight;
    var iw = img.naturalWidth  || img.width  || 1;
    var ih = img.naturalHeight || img.height || 1;

    var scale = Math.min(vw / iw, vh / ih, 1);
    _state.zoom = scale;
    _state.panX = (vw - iw * scale) / 2;
    _state.panY = (vh - ih * scale) / 2;
    _applyTransform();
  }

  // ---------------------------------------------------------------------------
  // Private: marker rendering
  // ---------------------------------------------------------------------------

  function _renderMarkers(floorNum) {
    var markersEl = document.getElementById('floor-plan-markers');
    if (!markersEl) { return; }

    var positions = FLOOR_RTU_POSITIONS[floorNum] || [];
    var equipList = _equipmentData[floorNum]      || [];
    var i, pos, equip, shortNum, cls, html;

    html = '';
    for (i = 0; i < positions.length; i++) {
      pos      = positions[i];
      equip    = _findEquip(equipList, pos.num);
      cls      = _statusClass(equip);
      shortNum = pos.num.split('.')[0];

      html +=
        '<div class="fp-marker ' + cls + '"' +
        ' style="left:' + pos.x + '%;top:' + pos.y + '%"' +
        ' data-rtu-num="' + pos.num + '"' +
        ' onmouseenter="window.SNLS.showTooltip(event,\'' + pos.num + '\',' + floorNum + ')"' +
        ' onmouseleave="window.SNLS.hideTooltip()"' +
        ' onclick="window.SNLS.fpMarkerClick(\'' + pos.num + '\',' + floorNum + ')">' +
        shortNum +
        '</div>';
    }

    markersEl.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Public: setEquipmentData — called by DashboardApp on each REST poll
  // ---------------------------------------------------------------------------

  function setEquipmentData(floorNum, equipList) {
    _equipmentData[floorNum] = equipList || [];
  }

  // ---------------------------------------------------------------------------
  // Public: open(floorNum) — show overlay for a given floor
  // ---------------------------------------------------------------------------

  function open(floorNum) {
    _state.floor = floorNum;
    _state.zoom  = 1;
    _state.panX  = 0;
    _state.panY  = 0;

    var overlay = document.getElementById('floor-plan-overlay');
    if (!overlay) { return; }
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Resolve floor name from SNLS_CONFIG
    var cfg     = window.SNLS_CONFIG || {};
    var floors  = cfg.floors || [];
    var floorName = 'Piso ' + floorNum;
    var i;
    for (i = 0; i < floors.length; i++) {
      if (floors[i].number === floorNum) {
        floorName = floors[i].name;
        break;
      }
    }

    // Heading
    var titleEl = document.getElementById('floor-plan-title');
    if (titleEl) {
      var ic = (SNLS.Icons && SNLS.Icons.get) ? SNLS.Icons.get : function() { return ''; };
      titleEl.innerHTML = ic('layers', 20) + ' ' + floorName;
    }

    // Inject toolbar icon SVGs
    var _ic = (SNLS.Icons && SNLS.Icons.get) ? SNLS.Icons.get : function() { return ''; };
    var zinEl  = document.getElementById('fp-zoom-in');
    var zoutEl = document.getElementById('fp-zoom-out');
    var clsEl  = document.getElementById('fp-close');
    if (zinEl)  { zinEl.innerHTML  = _ic('zoomIn',  18); }
    if (zoutEl) { zoutEl.innerHTML = _ic('zoomOut', 18); }
    if (clsEl)  { clsEl.innerHTML  = _ic('x',       18); }

    // Load floor image, then fit and render markers
    var img = document.getElementById('floor-plan-img');
    if (img) {
      img.onload = function() {
        _resetView();
        _renderMarkers(floorNum);
      };
      img.onerror = function() {
        _renderMarkers(floorNum);
      };
      img.src = 'img/floor-' + floorNum + '.png';
    }
  }

  // ---------------------------------------------------------------------------
  // Public: close()
  // ---------------------------------------------------------------------------

  function close() {
    var overlay = document.getElementById('floor-plan-overlay');
    if (overlay) { overlay.style.display = 'none'; }
    _state.floor = null;
    document.body.style.overflow = '';
    // Hide any lingering tooltip
    hideTooltip();
  }

  // ---------------------------------------------------------------------------
  // Public: refreshMarkers() — re-render markers without reopening overlay
  // ---------------------------------------------------------------------------

  function refreshMarkers() {
    if (_state.floor !== null) {
      _renderMarkers(_state.floor);
    }
  }

  // ---------------------------------------------------------------------------
  // Public: isOpen()
  // ---------------------------------------------------------------------------

  function isOpen() {
    return _state.floor !== null;
  }

  // ---------------------------------------------------------------------------
  // Global: showTooltip — called from marker onmouseenter
  // ---------------------------------------------------------------------------

  function showTooltip(event, rtuNum, floorNum) {
    var tooltip = document.getElementById('rtu-tooltip');
    if (!tooltip) { return; }

    var equipList = _equipmentData[floorNum] || [];
    var equip     = _findEquip(equipList, rtuNum);

    // Status label and colour
    var statusText = 'Standby';
    var statusBg   = 'var(--text-muted)';
    if (equip) {
      if (!equip.online) {
        statusText = 'Offline';
        statusBg   = 'var(--offline)';
      } else if (equip.fanOn) {
        statusText = 'Prendida';
        statusBg   = 'var(--ok)';
      }
    }

    // Extract values with safe defaults
    var tR = equip ? (equip.tempAmbiente || 0) : 0;
    var spC = equip ? (equip.setPointCool || 0) : 0;
    var hu = equip ? (equip.humidity    || 0) : 0;
    var fn = equip ? !!equip.fanOn     : false;
    var cw = equip ? !!equip.chilledWater : false;

    var fnColor = fn ? 'var(--ok)' : 'var(--text-muted)';
    var cwColor = cw ? 'var(--ok)' : 'var(--text-muted)';

    tooltip.innerHTML =
      '<div class="rtu-tooltip-header">' +
        '<span class="rtu-tooltip-name">RTU ' + rtuNum + '</span>' +
        '<span class="rtu-tooltip-status" style="background:' + statusBg + ';color:white">' + statusText + '</span>' +
      '</div>' +
      '<div class="rtu-tooltip-grid">' +
        '<div class="rtu-tooltip-item">' +
          '<span class="rtu-tooltip-label">T. Ambiente</span>' +
          '<span class="rtu-tooltip-value">' + tR + ' \u00b0C</span>' +
        '</div>' +
        '<div class="rtu-tooltip-item">' +
          '<span class="rtu-tooltip-label">SP Cool</span>' +
          '<span class="rtu-tooltip-value">' + spC + ' \u00b0C</span>' +
        '</div>' +
        '<div class="rtu-tooltip-item">' +
          '<span class="rtu-tooltip-label">Humedad</span>' +
          '<span class="rtu-tooltip-value">' + hu + ' %</span>' +
        '</div>' +
        '<div class="rtu-tooltip-item">' +
          '<span class="rtu-tooltip-label">Fan</span>' +
          '<span class="rtu-tooltip-value" style="color:' + fnColor + '">' + (fn ? 'ON' : 'OFF') + '</span>' +
        '</div>' +
        '<div class="rtu-tooltip-item">' +
          '<span class="rtu-tooltip-label">Agua Helada</span>' +
          '<span class="rtu-tooltip-value" style="color:' + cwColor + '">' + (cw ? 'ON' : 'OFF') + '</span>' +
        '</div>' +
      '</div>';

    tooltip.style.display = 'block';

    // Position tooltip relative to floor-plan-container
    var container = document.getElementById('floor-plan-container');
    if (!container) { return; }
    var cRect = container.getBoundingClientRect();
    var mRect = event.target.getBoundingClientRect();

    var left = mRect.left - cRect.left + mRect.width + 12;
    var top  = mRect.top  - cRect.top  - 20;

    // Keep within container bounds (tooltip is approximately 240 x 200 px)
    if (left + 240 > cRect.width)   { left = mRect.left - cRect.left - 252; }
    if (top + 220  > cRect.height)  { top  = cRect.height - 230; }
    if (top < 60)                   { top  = 60; }

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  // ---------------------------------------------------------------------------
  // Global: hideTooltip
  // ---------------------------------------------------------------------------

  function hideTooltip() {
    var tooltip = document.getElementById('rtu-tooltip');
    if (tooltip) { tooltip.style.display = 'none'; }
  }

  // ---------------------------------------------------------------------------
  // Global: fpMarkerClick — close overlay, open equipment modal
  // ---------------------------------------------------------------------------

  function fpMarkerClick(rtuNum, floorNum) {
    close();
    var equipList = _equipmentData[floorNum] || [];
    var equip     = _findEquip(equipList, rtuNum);
    if (equip && SNLS.ViewManager && SNLS.ViewManager.openModal) {
      SNLS.ViewManager.openModal(equip);
    }
  }

  // ---------------------------------------------------------------------------
  // Public: init() — bind toolbar buttons and pan/zoom event listeners
  // ---------------------------------------------------------------------------

  function init() {

    // Close button
    var closeBtn = document.getElementById('fp-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', close);
    }

    // Zoom in
    var zoomInBtn = document.getElementById('fp-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', function() {
        _state.zoom = Math.min(3, _state.zoom * 1.3);
        _applyTransform();
      });
    }

    // Zoom out
    var zoomOutBtn = document.getElementById('fp-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', function() {
        _state.zoom = Math.max(0.3, _state.zoom / 1.3);
        _applyTransform();
      });
    }

    // Keyboard: Escape closes the overlay
    document.addEventListener('keydown', function(e) {
      var key = e.key || e.keyCode;
      if ((key === 'Escape' || key === 27) && isOpen()) {
        close();
      }
    });

    // Pan — mouse drag on viewport
    var viewport = document.getElementById('floor-plan-viewport');
    if (viewport) {

      viewport.addEventListener('mousedown', function(e) {
        // Do not start pan when clicking a marker pin
        if (e.target && e.target.classList && e.target.classList.contains('fp-marker')) {
          return;
        }
        _state.dragging = true;
        _state.startX   = e.clientX - _state.panX;
        _state.startY   = e.clientY - _state.panY;
        viewport.style.cursor = 'grabbing';
        e.preventDefault();
      });

      // Mouse move and up are on document so drag continues outside viewport
      document.addEventListener('mousemove', function(e) {
        if (!_state.dragging) { return; }
        _state.panX = e.clientX - _state.startX;
        _state.panY = e.clientY - _state.startY;
        var canvas = document.getElementById('floor-plan-canvas');
        if (canvas) {
          canvas.style.transition = 'none';
          canvas.style.transform =
            'translate(' + _state.panX + 'px, ' + _state.panY + 'px) scale(' + _state.zoom + ')';
        }
      });

      document.addEventListener('mouseup', function() {
        if (!_state.dragging) { return; }
        _state.dragging = false;
        viewport.style.cursor = '';
        var canvas = document.getElementById('floor-plan-canvas');
        if (canvas) {
          canvas.style.transition = 'transform 0.1s ease-out';
        }
      });

      // Pinch / scroll zoom
      viewport.addEventListener('wheel', function(e) {
        e.preventDefault();
        var delta    = e.deltaY > 0 ? 0.9 : 1.1;
        _state.zoom  = Math.max(0.3, Math.min(3, _state.zoom * delta));
        _applyTransform();
      }, { passive: false });
    }
  }

  // ---------------------------------------------------------------------------
  // Expose global hooks (called from inline onmouseenter / onclick attributes)
  // ---------------------------------------------------------------------------

  window.SNLS = window.SNLS || {};
  window.SNLS.showTooltip   = showTooltip;
  window.SNLS.hideTooltip   = hideTooltip;
  window.SNLS.fpMarkerClick = fpMarkerClick;
  window.SNLS.openFloorPlan = open;

  // ---------------------------------------------------------------------------
  // Export to namespace
  // ---------------------------------------------------------------------------

  SNLS.FloorPlanManager = {
    init:             init,
    open:             open,
    close:            close,
    refreshMarkers:   refreshMarkers,
    setEquipmentData: setEquipmentData,
    isOpen:           isOpen
  };

  window.SNLS = SNLS;

})(window);
