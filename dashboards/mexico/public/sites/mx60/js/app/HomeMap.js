/**
 * HomeMap.js — MX60 namespace
 *
 * Paradigm: clickable plant zones (no individual equipment markers).
 *
 *   - Left sidebar  → plantas list with on/standby/alarm counts.
 *                     Click a planta row to highlight its zone (and vice versa).
 *   - Right area    → MAQUILA photo with SVG <polygon> zones overlay.
 *
 *     · Hover a zone → outline + soft fill highlight.
 *     · Click a zone → popover with planta label + equipment list.
 *                      Each row: type icon · name · live temp/value.
 *                      Click a row → navigates to #detail/<id>.
 *
 * Rules: #1 (no inline), #2 (destroy cleanup), #3 (granular textContent / classList).
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function _esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s == null ? '' : String(s)));
    return d.innerHTML;
  }

  function _typeIcon(type) {
    if (type === 'carcamo')    return '◯';
    if (type === 'datalogger') return '⬡';
    return '▭';
  }

  // For carcamo/datalogger types, recompute the threshold color from the LIVE
  // summary reading + current threshold-store umbral values, instead of
  // trusting `eq.state` (which is computed once at REST serialization time and
  // goes stale forever on subsequent subscription updates of nivelCm/pressurePsi).
  // This is the root of the bug where a carcamo at 53cm shows "Normal" in the
  // home pill but "ADVERTENCIA" in the detail view: the detail recomputes
  // colorForReading() on every render, the home was reading the stale integer.
  function _evalThresholdColor(eq) {
    if (!eq) return null;
    var s = eq.summary || {};
    if (eq.type === 'carcamo' && MX60.CarcamoThresholdStore &&
        typeof MX60.CarcamoThresholdStore.colorForReading === 'function') {
      var nivel = parseFloat(s.nivelCm);
      if (isNaN(nivel)) return null;
      return MX60.CarcamoThresholdStore.colorForReading(eq.id, nivel);
    }
    if (eq.type === 'datalogger' && MX60.DataloggerThresholdStore &&
        typeof MX60.DataloggerThresholdStore.colorForReading === 'function') {
      var psi = parseFloat(s.pressurePsi);
      if (isNaN(psi)) return null;
      return MX60.DataloggerThresholdStore.colorForReading(eq.id, psi);
    }
    return null;
  }

  function _statusLabel(eq) {
    // Effective status — alarm latches override raw status everywhere.
    var s = (MX60.StatusResolver ? MX60.StatusResolver.effectiveStatus(eq) : (eq.status || ''));
    if (eq.type === 'up') {
      if (s === 'alarm')   return 'Alarma';
      if (s === 'cooling') return 'Prendido';
      if (s === 'standby') return 'En espera';
      if (s === 'offline') return 'Offline';
      return 'En línea';
    }
    if (s === 'alarm')   return 'Alarma';
    if (s === 'offline') return 'Offline';
    var color = _evalThresholdColor(eq);
    if (color === 'rojo')    return 'Peligro';
    if (color === 'naranja') return 'Precaución';
    if (color === 'verde')   return 'Normal';
    var st = (MX60.StatusResolver ? MX60.StatusResolver.effectiveState(eq) : eq.state);
    if (st === 2) return 'Peligro';
    if (st === 1) return 'Precaución';
    return 'Normal';
  }

  function _visualClass(eq) {
    var s = (MX60.StatusResolver ? MX60.StatusResolver.effectiveStatus(eq) : (eq.status || ''));
    if (eq.type === 'up') {
      if (s === 'alarm' || s === 'cooling' || s === 'standby' || s === 'offline')
        return 'status-' + s;
      return 'status-standby';
    }
    if (s === 'alarm')   return 'status-alarm';
    if (s === 'offline') return 'status-offline';
    var color = _evalThresholdColor(eq);
    if (color === 'rojo')    return 'state-2';
    if (color === 'naranja') return 'state-1';
    if (color === 'verde')   return 'state-0';
    var st = (MX60.StatusResolver ? MX60.StatusResolver.effectiveState(eq) : eq.state);
    if (st === 2) return 'state-2';
    if (st === 1) return 'state-1';
    return 'state-0';
  }

  function _primaryValue(eq) {
    if ((eq.status || '') === 'offline') return '—';
    var s = eq.summary || {};
    var n;
    if (eq.type === 'carcamo') {
      n = parseFloat(s.nivelCm);
      return isNaN(n) ? '—' : Math.round(n) + ' cm';
    }
    if (eq.type === 'datalogger') {
      n = parseFloat(s.pressurePsi);
      return isNaN(n) ? '—' : n.toFixed(1) + ' psi';
    }
    n = parseFloat(s.tempZona);
    return isNaN(n) ? '—' : n.toFixed(1) + '°C';
  }

  function _bucket(eq) {
    // Effective status — alarm latches count toward "alarm" bucket so the
    // planta side panel matches the per-card badges.
    var s = (MX60.StatusResolver ? MX60.StatusResolver.effectiveStatus(eq) : (eq.status || ''));
    if (eq.type === 'up') {
      if (s === 'alarm')   return 'alarm';
      if (s === 'cooling') return 'on';
      return 'standby';
    }
    if (s === 'alarm')   return 'alarm';
    if (s === 'offline') return 'standby';
    // For carcamo/datalogger, derive bucket from live threshold color so the
    // sidebar LED counter reflects warnings (state=1, color=naranja) — the
    // previous fallthrough mapped warnings to 'standby' and the operator
    // never saw a sidebar count for carcamos in advertencia.
    var color = _evalThresholdColor(eq);
    if (color === 'rojo')    return 'alarm';
    if (color === 'naranja') return 'alarm';
    if (color === 'verde')   return 'on';
    var st = (MX60.StatusResolver ? MX60.StatusResolver.effectiveState(eq) : eq.state);
    if (st === 2) return 'alarm';
    if (st === 1) return 'alarm';
    if (st === 0) return 'on';
    return 'standby';
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  var _container       = null;
  var _innerEl         = null;
  var _zonesSvg        = null;
  var _popoverEl       = null;
  var _sideListEl      = null;
  var _quickStatsEl    = null;
  var _onStatsClick    = null;
  var _onZoneOver      = null;
  var _onZoneOut       = null;
  var _onZoneClick     = null;
  var _onPopoverClick  = null;
  var _onSideClick     = null;
  var _onSideOver      = null;
  var _onSideOut       = null;
  var _onDocClick      = null;
  var _onKeyDown       = null;
  var _byId            = {};
  var _byPlanta        = {};
  var _plantas         = [];
  var _zones           = {};
  var _selectedPlanta  = null;
  var _openPopoverPid  = null;

  // -------------------------------------------------------------------------
  // Sidebar counters
  // -------------------------------------------------------------------------

  function _computeCounts(equipment) {
    var counts = {};
    for (var i = 0; i < equipment.length; i++) {
      var eq = equipment[i];
      if (eq.type !== 'up') continue;
      var pid = eq.planta;
      if (pid == null) continue;
      if (!counts[pid]) counts[pid] = { total: 0, on: 0, standby: 0, alarm: 0 };
      counts[pid].total++;
      counts[pid][_bucket(eq)]++;
    }
    return counts;
  }

  function _buildSideRow(planta, c) {
    var p = planta || {};
    var counts = c || { total: 0, on: 0, standby: 0, alarm: 0 };
    return (
      '<button type="button" class="planta-row" data-planta="' + _esc(String(p.id)) + '">' +
        '<div class="planta-info">' +
          '<div class="planta-name">' + _esc(p.label || 'Planta ' + p.id) + '</div>' +
          '<div class="planta-sub">' +
            '<span class="planta-count" data-count="total">' + counts.total + '</span> equipos' +
          '</div>' +
        '</div>' +
        '<div class="planta-leds">' +
          '<span class="planta-led-item">' +
            '<span class="planta-led led-on"></span>' +
            '<span class="planta-led-num" data-count="on">' + counts.on + '</span>' +
          '</span>' +
          '<span class="planta-led-item">' +
            '<span class="planta-led led-standby"></span>' +
            '<span class="planta-led-num" data-count="standby">' + counts.standby + '</span>' +
          '</span>' +
          '<span class="planta-led-item">' +
            '<span class="planta-led led-alarm"></span>' +
            '<span class="planta-led-num" data-count="alarm">' + counts.alarm + '</span>' +
          '</span>' +
        '</div>' +
      '</button>'
    );
  }

  function _renderSidePanel(plantas, equipment) {
    if (!_sideListEl) return;
    var counts = _computeCounts(equipment);
    var html = '';
    for (var i = 0; i < plantas.length; i++) {
      html += _buildSideRow(plantas[i], counts[plantas[i].id]);
    }
    _sideListEl.innerHTML = html;
  }

  function _refreshSideCounts(equipment) {
    if (!_sideListEl) return;
    var counts = _computeCounts(equipment);
    for (var i = 0; i < _plantas.length; i++) {
      var pid = _plantas[i].id;
      var c = counts[pid] || { total: 0, on: 0, standby: 0, alarm: 0 };
      var row = _sideListEl.querySelector('.planta-row[data-planta="' + pid + '"]');
      if (!row) continue;
      _setCount(row, 'total',   c.total);
      _setCount(row, 'on',      c.on);
      _setCount(row, 'standby', c.standby);
      _setCount(row, 'alarm',   c.alarm);
      if (c.alarm > 0) row.classList.add('has-alarm');
      else             row.classList.remove('has-alarm');
    }
  }

  function _setCount(row, key, value) {
    var node = row.querySelector('[data-count="' + key + '"]');
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  // -------------------------------------------------------------------------
  // Quick stats — cárcamos + dataloggers strip above the photo
  // -------------------------------------------------------------------------

  function _buildPill(eq) {
    var visual = _visualClass(eq);
    var value  = _primaryValue(eq);
    var stateLbl = _statusLabel(eq);
    return (
      '<button type="button" class="qs-pill ' + visual + '"' +
        ' data-eq-id="' + _esc(eq.id) + '"' +
        ' aria-label="' + _esc(eq.label) + ' — ' + _esc(value) + ' — ' + _esc(stateLbl) + '"' +
        ' title="' + _esc(stateLbl) + '">' +
        '<span class="qs-pill-name">' + _esc(eq.label) + '</span>' +
        '<span class="qs-pill-value" data-qs-value>' + _esc(value) + '</span>' +
        '<span class="qs-pill-dot"></span>' +
      '</button>'
    );
  }

  function _renderQuickStats(equipment) {
    if (!_quickStatsEl) return;
    var carcamos = [], dataloggers = [];
    for (var i = 0; i < equipment.length; i++) {
      if (equipment[i].type === 'carcamo')         carcamos.push(equipment[i]);
      else if (equipment[i].type === 'datalogger') dataloggers.push(equipment[i]);
    }
    function byNumericLabel(a, b) {
      function n(s) {
        var m = (s || '').match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      }
      var d = n(a.label) - n(b.label);
      return d !== 0 ? d : (a.label || '').localeCompare(b.label || '');
    }
    carcamos.sort(byNumericLabel);
    dataloggers.sort(byNumericLabel);

    function band(typeKey, title, icon, list) {
      if (!list.length) return '';
      var pills = '';
      for (var k = 0; k < list.length; k++) pills += _buildPill(list[k]);
      return (
        '<div class="qs-band qs-band-' + typeKey + '">' +
          '<span class="qs-band-tag">' +
            '<span class="qs-band-icon">' + icon + '</span>' +
            '<span class="qs-band-title">' + title + '</span>' +
            '<span class="qs-band-count">' + list.length + '</span>' +
          '</span>' +
          '<div class="qs-pills">' + pills + '</div>' +
        '</div>'
      );
    }
    _quickStatsEl.innerHTML =
      band('carcamo',    'Cárcamos',    '◯', carcamos) +
      band('datalogger', 'Dataloggers', '⬡', dataloggers);
  }

  function _refreshQuickStats(equipment) {
    if (!_quickStatsEl) return;
    if (!_quickStatsEl.querySelector('.qs-pill')) {
      _renderQuickStats(equipment);
      return;
    }
    for (var i = 0; i < equipment.length; i++) {
      var eq = equipment[i];
      if (eq.type !== 'carcamo' && eq.type !== 'datalogger') continue;
      var pill = _quickStatsEl.querySelector(
        '.qs-pill[data-eq-id="' + eq.id.replace(/"/g, '\\"') + '"]'
      );
      if (!pill) continue;
      var newVisual = _visualClass(eq);
      var oldVisual = (pill.className.match(/(?:^|\s)(status-\w+|state-\d)/) || [])[1];
      if (oldVisual && oldVisual !== newVisual) {
        pill.classList.remove(oldVisual);
        pill.classList.add(newVisual);
      }
      var v = pill.querySelector('[data-qs-value]');
      var newVal = _primaryValue(eq);
      if (v && v.textContent !== newVal) v.textContent = newVal;
      var newLbl = _statusLabel(eq);
      pill.setAttribute('title', newLbl);
      pill.setAttribute('aria-label', eq.label + ' — ' + newVal + ' — ' + newLbl);
    }
  }

  // -------------------------------------------------------------------------
  // Zones (SVG polygons)
  // -------------------------------------------------------------------------

  function _buildZones(zones) {
    var html = '';
    for (var pid in zones) {
      if (!zones.hasOwnProperty(pid)) continue;
      var z = zones[pid];
      var pts = z.points || [];
      var pointsAttr = '';
      for (var i = 0; i < pts.length; i++) {
        if (i > 0) pointsAttr += ' ';
        pointsAttr += pts[i][0] + ',' + pts[i][1];
      }
      html += '<polygon class="home-zone" data-planta="' + _esc(pid) + '" points="' + pointsAttr + '" />';
    }
    return html;
  }

  function _findZone(node) {
    while (node && node !== _zonesSvg) {
      if (node.classList && node.classList.contains('home-zone')) return node;
      node = node.parentNode;
    }
    return null;
  }

  function _highlightZone(pid, on) {
    if (!_zonesSvg) return;
    var nodes = _zonesSvg.querySelectorAll('.home-zone[data-planta="' + pid + '"]');
    for (var i = 0; i < nodes.length; i++) {
      if (on) nodes[i].classList.add('hover');
      else    nodes[i].classList.remove('hover');
    }
    if (_sideListEl) {
      var row = _sideListEl.querySelector('.planta-row[data-planta="' + pid + '"]');
      if (row) {
        if (on) row.classList.add('zone-hover');
        else    row.classList.remove('zone-hover');
      }
    }
  }

  // -------------------------------------------------------------------------
  // Popover
  // -------------------------------------------------------------------------

  function _findPlanta(pid) {
    var pidNum = parseInt(pid, 10);
    for (var i = 0; i < _plantas.length; i++) {
      if (_plantas[i].id === pidNum) return _plantas[i];
    }
    return { id: pidNum, label: 'Planta ' + pid };
  }

  function _equipmentOfPlanta(pid) {
    var pidNum = parseInt(pid, 10);
    var list = _byPlanta[pidNum] || [];
    var out = list.slice(0);
    out.sort(function(a, b) {
      var ta = a.type, tb = b.type;
      if (ta !== tb) {
        var order = { up: 0, carcamo: 1, datalogger: 2 };
        return (order[ta] != null ? order[ta] : 9) - (order[tb] != null ? order[tb] : 9);
      }
      return (a.label || '').localeCompare(b.label || '');
    });
    return out;
  }

  function _buildPopoverHtml(pid) {
    var planta = _findPlanta(pid);
    var equipos = _equipmentOfPlanta(pid);
    var rowsHtml = '';
    if (equipos.length === 0) {
      rowsHtml = '<div class="zone-popover-empty">Sin equipos asignados</div>';
    } else {
      for (var i = 0; i < equipos.length; i++) {
        var eq = equipos[i];
        var visual = _visualClass(eq);
        rowsHtml +=
          '<button type="button" class="zone-popover-row ' + visual + '"' +
            ' data-eq-id="' + _esc(eq.id) + '"' +
            ' aria-label="' + _esc(eq.label) + ' — ' + _esc(_statusLabel(eq)) + '">' +
            '<span class="zpr-icon">' + _typeIcon(eq.type) + '</span>' +
            '<span class="zpr-name">' + _esc(eq.label) + '</span>' +
            '<span class="zpr-value">' + _esc(_primaryValue(eq)) + '</span>' +
          '</button>';
      }
    }
    return (
      '<div class="zone-popover-header">' +
        '<span class="zone-popover-title">' + _esc(planta.label) + '</span>' +
        '<span class="zone-popover-count">' + equipos.length + ' equipos</span>' +
        '<button type="button" class="zone-popover-close" data-action="close" aria-label="Cerrar">×</button>' +
      '</div>' +
      '<div class="zone-popover-list">' + rowsHtml + '</div>'
    );
  }

  function _showPopover(pid, anchorZone) {
    if (!_popoverEl || !_innerEl) return;
    _popoverEl.innerHTML = _buildPopoverHtml(pid);
    _popoverEl.setAttribute('data-planta', String(pid));
    _popoverEl.style.display = 'block';
    _openPopoverPid = pid;
    _positionPopover(anchorZone);
  }

  function _hidePopover() {
    if (!_popoverEl) return;
    _popoverEl.style.display = 'none';
    _popoverEl.removeAttribute('data-planta');
    _popoverEl.innerHTML = '';
    _openPopoverPid = null;
  }

  function _positionPopover(anchorZone) {
    if (!_popoverEl || !_innerEl || !anchorZone) return;
    var areaRect = _innerEl.getBoundingClientRect();
    var aRect    = anchorZone.getBoundingClientRect();
    var pRect    = _popoverEl.getBoundingClientRect();

    var left = (aRect.right - areaRect.left) + 12;
    if (left + pRect.width + 8 > areaRect.width) {
      left = (aRect.left - areaRect.left) - pRect.width - 12;
    }
    if (left < 8) left = 8;

    var top = (aRect.top - areaRect.top);
    if (top + pRect.height + 8 > areaRect.height) {
      top = areaRect.height - pRect.height - 8;
    }
    if (top < 8) top = 8;

    _popoverEl.style.left = left + 'px';
    _popoverEl.style.top  = top  + 'px';
  }

  // -------------------------------------------------------------------------
  // Selection (sidebar click)
  // -------------------------------------------------------------------------

  function _selectPlanta(pid) {
    _selectedPlanta = pid;
    if (!_sideListEl) return;
    var rows = _sideListEl.querySelectorAll('.planta-row');
    for (var i = 0; i < rows.length; i++) {
      if (pid !== null && parseInt(rows[i].getAttribute('data-planta'), 10) === pid) {
        rows[i].classList.add('selected');
      } else {
        rows[i].classList.remove('selected');
      }
    }
    if (!_zonesSvg) return;
    var zones = _zonesSvg.querySelectorAll('.home-zone');
    for (var j = 0; j < zones.length; j++) {
      var zp = parseInt(zones[j].getAttribute('data-planta'), 10);
      if (pid === null) {
        zones[j].classList.remove('dimmed', 'highlighted');
      } else if (zp === pid) {
        zones[j].classList.add('highlighted');
        zones[j].classList.remove('dimmed');
      } else {
        zones[j].classList.add('dimmed');
        zones[j].classList.remove('highlighted');
      }
    }
  }

  // -------------------------------------------------------------------------
  // Render / refresh / destroy
  // -------------------------------------------------------------------------

  function render(container, equipment, plantas, zones) {
    if (!container) return;
    _container = container;
    _plantas = plantas || [];
    _zones = zones || {};
    _selectedPlanta = null;

    _byId = {};
    _byPlanta = {};
    for (var i = 0; i < equipment.length; i++) {
      var eq = equipment[i];
      _byId[eq.id] = eq;
      var p = eq.planta;
      if (p != null) {
        if (!_byPlanta[p]) _byPlanta[p] = [];
        _byPlanta[p].push(eq);
      }
    }

    var imgSrc = 'img/MAQUILA_COMPLETA.jpeg?v=' + (window.MX60_IMG_V || 5);

    container.innerHTML =
      '<div class="home-map-wrap">' +
        '<aside class="home-side-panel">' +
          '<div class="home-side-legend">' +
            '<span class="legend-pill"><span class="planta-led led-on"></span>Prendidos</span>' +
            '<span class="legend-pill"><span class="planta-led led-standby"></span>En Espera</span>' +
            '<span class="legend-pill"><span class="planta-led led-alarm"></span>Alarma</span>' +
          '</div>' +
          '<div class="home-side-list" id="homeSideList"></div>' +
        '</aside>' +
        '<div class="home-map-area">' +
          '<div class="home-quick-stats" id="homeQuickStats"></div>' +
          '<div class="home-map-inner" id="homeMapInner">' +
            '<img src="' + imgSrc + '" alt="Vista superior MX60" class="home-map-img" draggable="false">' +
            '<svg class="home-zones" id="homeZones" viewBox="0 0 100 100" preserveAspectRatio="none">' +
              _buildZones(_zones) +
            '</svg>' +
          '</div>' +
          '<div class="home-zone-popover" id="homeZonePopover" style="display:none"></div>' +
        '</div>' +
      '</div>';

    _innerEl      = container.querySelector('#homeMapInner');
    _zonesSvg     = container.querySelector('#homeZones');
    _popoverEl    = container.querySelector('#homeZonePopover');
    _sideListEl   = container.querySelector('#homeSideList');
    _quickStatsEl = container.querySelector('#homeQuickStats');

    _renderQuickStats(equipment);

    if (window.location && /[?&]debugZones=1/.test(window.location.search)) {
      _zonesSvg.classList.add('debug');
    }

    _renderSidePanel(_plantas, equipment);

    _onZoneOver = function(e) {
      var z = _findZone(e.target);
      if (!z) return;
      _highlightZone(z.getAttribute('data-planta'), true);
    };
    _onZoneOut = function(e) {
      var z = _findZone(e.target);
      if (!z) return;
      var rel = e.relatedTarget;
      if (rel && _findZone(rel) === z) return;
      _highlightZone(z.getAttribute('data-planta'), false);
    };
    _zonesSvg.addEventListener('mouseover', _onZoneOver, false);
    _zonesSvg.addEventListener('mouseout',  _onZoneOut,  false);

    _onZoneClick = function(e) {
      var z = _findZone(e.target);
      if (!z) return;
      e.stopPropagation();
      var pid = z.getAttribute('data-planta');
      if (_openPopoverPid === pid) _hidePopover();
      else _showPopover(pid, z);
    };
    _zonesSvg.addEventListener('click', _onZoneClick, false);

    _onPopoverClick = function(e) {
      e.stopPropagation();
      var t = e.target;
      while (t && t !== _popoverEl) {
        if (t.getAttribute && t.getAttribute('data-action') === 'close') {
          _hidePopover();
          return;
        }
        if (t.classList && t.classList.contains('zone-popover-row')) {
          var id = t.getAttribute('data-eq-id');
          if (id && MX60.Router) {
            _hidePopover();
            MX60.Router.navigate('#detail/' + encodeURIComponent(id));
          }
          return;
        }
        t = t.parentNode;
      }
    };
    _popoverEl.addEventListener('click', _onPopoverClick, false);

    _onSideClick = function(e) {
      var row = e.target;
      while (row && row !== _sideListEl &&
             !(row.classList && row.classList.contains('planta-row'))) {
        row = row.parentNode;
      }
      if (!row || !row.getAttribute) return;
      e.stopPropagation();
      var pid = parseInt(row.getAttribute('data-planta'), 10);
      _selectPlanta(_selectedPlanta === pid ? null : pid);
    };
    _sideListEl.addEventListener('click', _onSideClick, false);

    // Hover sidebar row → highlight matching zone polygon (bidirectional).
    function _findRow(node) {
      while (node && node !== _sideListEl) {
        if (node.classList && node.classList.contains('planta-row')) return node;
        node = node.parentNode;
      }
      return null;
    }
    _onSideOver = function(e) {
      var row = _findRow(e.target);
      if (!row) return;
      _highlightZone(row.getAttribute('data-planta'), true);
    };
    _onSideOut = function(e) {
      var row = _findRow(e.target);
      if (!row) return;
      var rel = e.relatedTarget;
      if (rel && _findRow(rel) === row) return;  // still inside same row
      _highlightZone(row.getAttribute('data-planta'), false);
    };
    _sideListEl.addEventListener('mouseover', _onSideOver, false);
    _sideListEl.addEventListener('mouseout',  _onSideOut,  false);

    _onDocClick = function() {
      if (_openPopoverPid) _hidePopover();
    };
    document.addEventListener('click', _onDocClick, false);

    _onKeyDown = function(e) {
      var key = e.key || e.keyCode;
      if (key === 'Escape' || key === 27) {
        if (_openPopoverPid) _hidePopover();
        if (_selectedPlanta !== null) _selectPlanta(null);
      }
    };
    document.addEventListener('keydown', _onKeyDown, false);

    // Quick stats click → navigate to detail.
    _onStatsClick = function(e) {
      var btn = e.target;
      while (btn && btn !== _quickStatsEl &&
             !(btn.classList && btn.classList.contains('qs-pill'))) {
        btn = btn.parentNode;
      }
      if (!btn || !btn.getAttribute) return;
      var id = btn.getAttribute('data-eq-id');
      if (id && MX60.Router) MX60.Router.navigate('#detail/' + encodeURIComponent(id));
    };
    if (_quickStatsEl) _quickStatsEl.addEventListener('click', _onStatsClick, false);
  }

  function refresh(equipment) {
    _byId = {};
    _byPlanta = {};
    for (var i = 0; i < equipment.length; i++) {
      var eq = equipment[i];
      _byId[eq.id] = eq;
      var p = eq.planta;
      if (p != null) {
        if (!_byPlanta[p]) _byPlanta[p] = [];
        _byPlanta[p].push(eq);
      }
    }
    // Safety net: if the sidebar lost its rows (e.g. fast remount before initial
    // render finished), repopulate from plantas. _refreshSideCounts otherwise.
    if (_sideListEl && _plantas.length &&
        !_sideListEl.querySelector('.planta-row')) {
      _renderSidePanel(_plantas, equipment);
    } else {
      _refreshSideCounts(equipment);
    }
    _refreshQuickStats(equipment);
    if (_openPopoverPid && _popoverEl) {
      _refreshPopoverRows(_openPopoverPid);
    }
  }

  // Granular update of the open zone popover — when subscriptions push live
  // updates ~5x/second, blasting the popover innerHTML on each tick wipes
  // keyboard focus, kills text selection, breaks scroll position, and creates
  // a noticeable flicker. Patch each row's class + value text in place
  // instead. Falls back to full rebuild if the equipment set has changed
  // (rare — only on planta topology mutation).
  function _refreshPopoverRows(pid) {
    if (!_popoverEl) return;
    var equipos = _equipmentOfPlanta(pid);
    var rowsContainer = _popoverEl.querySelector('.zone-popover-list');
    if (!rowsContainer) {
      _popoverEl.innerHTML = _buildPopoverHtml(pid);
      return;
    }
    var rows = rowsContainer.querySelectorAll('.zone-popover-row');
    if (rows.length !== equipos.length) {
      _popoverEl.innerHTML = _buildPopoverHtml(pid);
      return;
    }
    for (var i = 0; i < equipos.length; i++) {
      var eq = equipos[i];
      var rowEl = rowsContainer.querySelector(
        '.zone-popover-row[data-eq-id="' + eq.id.replace(/"/g, '\\"') + '"]'
      );
      if (!rowEl) {
        _popoverEl.innerHTML = _buildPopoverHtml(pid);
        return;
      }
      var visual = _visualClass(eq);
      var newClass = 'zone-popover-row ' + visual;
      if (rowEl.className !== newClass) rowEl.className = newClass;
      var newAria = eq.label + ' — ' + _statusLabel(eq);
      if (rowEl.getAttribute('aria-label') !== newAria) {
        rowEl.setAttribute('aria-label', newAria);
      }
      var valueEl = rowEl.querySelector('.zpr-value');
      var newValue = _primaryValue(eq);
      if (valueEl && valueEl.textContent !== newValue) valueEl.textContent = newValue;
    }
  }

  function destroy() {
    if (_zonesSvg) {
      if (_onZoneOver)  _zonesSvg.removeEventListener('mouseover', _onZoneOver,  false);
      if (_onZoneOut)   _zonesSvg.removeEventListener('mouseout',  _onZoneOut,   false);
      if (_onZoneClick) _zonesSvg.removeEventListener('click',     _onZoneClick, false);
    }
    if (_popoverEl && _onPopoverClick) {
      _popoverEl.removeEventListener('click', _onPopoverClick, false);
    }
    if (_sideListEl) {
      if (_onSideClick) _sideListEl.removeEventListener('click',     _onSideClick, false);
      if (_onSideOver)  _sideListEl.removeEventListener('mouseover', _onSideOver,  false);
      if (_onSideOut)   _sideListEl.removeEventListener('mouseout',  _onSideOut,   false);
    }
    if (_onDocClick) document.removeEventListener('click',   _onDocClick, false);
    if (_onKeyDown)  document.removeEventListener('keydown', _onKeyDown,  false);
    if (_quickStatsEl && _onStatsClick) {
      _quickStatsEl.removeEventListener('click', _onStatsClick, false);
    }

    if (_container) _container.innerHTML = '';
    _container = _innerEl = _zonesSvg = _popoverEl = _sideListEl = _quickStatsEl = null;
    _onZoneOver = _onZoneOut = _onZoneClick = _onPopoverClick = null;
    _onSideClick = _onSideOver = _onSideOut = _onDocClick = _onKeyDown = null;
    _onStatsClick = null;
    _byId = {};
    _byPlanta = {};
    _plantas = [];
    _zones = {};
    _selectedPlanta = null;
    _openPopoverPid = null;
  }

  MX60.HomeMap = {
    render:  render,
    refresh: refresh,
    destroy: destroy
  };

  // -------------------------------------------------------------------------
  // HomePage — DashboardApp page lifecycle wrapper
  // -------------------------------------------------------------------------

  var _pollTimer = null;
  var _onDataChange = null;
  var _unsubAlarmLatch = null;
  var _unsubCarcamoTh = null;
  var _unsubDataloggerTh = null;
  var _unsubUpTh = null;

  function _readPlantasFromConfig() {
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    if (cfg && cfg.plantas) return cfg.plantas;
    return null;
  }

  function _readZonesFromConfig() {
    var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
    if (cfg && cfg.zones) return cfg.zones;
    return null;
  }

  var HomePage = {
    mount: function(container, route) {
      MX60.EquipmentData.load(function(state) {
        var plantas = _readPlantasFromConfig() ||
                      (state.raw && state.raw._meta && state.raw._meta.plantas) ||
                      (state.raw && state.raw.plantas) ||
                      [];
        var zones   = _readZonesFromConfig()   || (state.raw && state.raw._meta && state.raw._meta.zones) || {};
        MX60.HomeMap.render(container, state.equipment, plantas, zones);
        // Defensive: ensure counts populate immediately on remount even if the
        // initial render fired before a layout pass. Idempotent on first mount.
        MX60.HomeMap.refresh(state.equipment);
      });

      _onDataChange = function(state) { MX60.HomeMap.refresh(state.equipment); };
      MX60.EquipmentData.addListener(_onDataChange);

      function _refreshFromCache() {
        if (MX60.EquipmentData && typeof MX60.EquipmentData.getAll === 'function') {
          var cached = MX60.EquipmentData.getAll();
          if (cached && cached.length) MX60.HomeMap.refresh(cached);
        }
      }

      // Re-paint marker pills + zone counts when any equipment latches an
      // alarm — outside the EquipmentData polling cycle.
      if (MX60.AlarmLatchStore && typeof MX60.AlarmLatchStore.subscribe === 'function') {
        _unsubAlarmLatch = MX60.AlarmLatchStore.subscribe(_refreshFromCache);
      }
      // Re-paint when operator edits umbralAdvertencia/umbralCritico in any
      // detail page. Without these, the home pills stay at the old threshold
      // color until the next EquipmentData _notify (~5s REST poll) — the
      // c5-p2 case where home shows "Normal" while detail shows "ADVERTENCIA"
      // because home's _evalThresholdColor uses outdated umbral values.
      if (MX60.CarcamoThresholdStore && typeof MX60.CarcamoThresholdStore.subscribe === 'function') {
        _unsubCarcamoTh = MX60.CarcamoThresholdStore.subscribe(_refreshFromCache);
      }
      if (MX60.DataloggerThresholdStore && typeof MX60.DataloggerThresholdStore.subscribe === 'function') {
        _unsubDataloggerTh = MX60.DataloggerThresholdStore.subscribe(_refreshFromCache);
      }
      if (MX60.UpThresholdStore && typeof MX60.UpThresholdStore.subscribe === 'function') {
        _unsubUpTh = MX60.UpThresholdStore.subscribe(_refreshFromCache);
      }

      // M3 fix: skip REST polling when BajaScript subscriptions are active —
      // subscribe pushes ~200ms-debounced updates, so the 8s poll is redundant
      // and clobbers fine-grained subscription updates mid-flight.
      var bajaActive = MX60.SubscriptionPool && MX60.SubscriptionPool.isReady && MX60.SubscriptionPool.isReady();
      if (!bajaActive) {
        var cfg = MX60.ConfigManager && MX60.ConfigManager.getConfig();
        var pollMs = (cfg && cfg.pollMs && cfg.pollMs.home) || 8000;
        _pollTimer = setInterval(function() {
          MX60.EquipmentData.refresh();
        }, pollMs);
      }
    },

    destroy: function() {
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
      if (_onDataChange) {
        MX60.EquipmentData.removeListener(_onDataChange);
        _onDataChange = null;
      }
      if (typeof _unsubAlarmLatch === 'function')   { _unsubAlarmLatch();   _unsubAlarmLatch   = null; }
      if (typeof _unsubCarcamoTh === 'function')    { _unsubCarcamoTh();    _unsubCarcamoTh    = null; }
      if (typeof _unsubDataloggerTh === 'function') { _unsubDataloggerTh(); _unsubDataloggerTh = null; }
      if (typeof _unsubUpTh === 'function')         { _unsubUpTh();         _unsubUpTh         = null; }
      MX60.HomeMap.destroy();
    }
  };

  MX60.HomePage = HomePage;

  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('home', HomePage);
  }

  window.MX60 = MX60;

})(window);
