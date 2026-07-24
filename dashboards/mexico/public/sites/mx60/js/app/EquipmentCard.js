/**
 * EquipmentCard.js — MX60 namespace
 *
 * Equipment page layout (estilo SanLuis):
 *   - Toolbar: tabs por planta ("Todos · Planta 1 · Planta 2 · ...") + buscador.
 *   - Grid 3 cols × 4 rows = 12 cards por página.
 *   - Agrupado: primero planta, dentro de planta primero tipo (UP → Cárcamo → Datalogger).
 *   - Paginación abajo cuando excede 12 (Planta 5 con 12 cabe justo, otras requieren 1 page).
 *   - Cuando "Todos" está activo, las cards igual respetan el orden plantaThenType, y los
 *     headers visuales separan cada planta cuando una planta nueva empieza dentro de la página.
 *
 * Rules: #1 (no inline), #2 (destroy cleanup), #3 (granular update).
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var PAGE_SIZE = 12;

  var TYPE_CONFIG = {
    up: { label: 'Unidad Paquete', labelPlural: 'Unidades Paquete', order: 0, icon: '▭' },
    carcamo:    { label: 'Cárcamo',        labelPlural: 'Cárcamos',         order: 1, icon: '◯' },
    datalogger: { label: 'Datalogger',     labelPlural: 'Dataloggers',      order: 2, icon: '⬡' }
  };

  function _typeLabelPlural(t) {
    return TYPE_CONFIG[t] ? TYPE_CONFIG[t].labelPlural : t;
  }

  function _esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s == null ? '' : String(s)));
    return d.innerHTML;
  }

  // Mirror of HomeMap._evalThresholdColor — for carcamo/datalogger types,
  // recompute the threshold color from the LIVE summary reading + current
  // operator-edited umbral values, instead of trusting `eq.state` (which is
  // computed once at REST serialization time and goes stale on subsequent
  // subscription updates of nivelCm/pressurePsi). Without this the equipment
  // grid badge stays "Normal" while HomeMap and Detail correctly show
  // "Precaución"/"Peligro" — same divergence that bit us on the home pills.
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
    // Effective status — alarm latches override the raw equip.status so the
    // badge propagates everywhere a card is rendered.
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

  function _fmtNum(v, unit) {
    if (v === null || v === undefined || v === '') return '—';
    var n = parseFloat(v);
    if (isNaN(n)) return '—';
    return n.toFixed(1) + (unit ? ' ' + unit : '');
  }

  function _cardMetrics(eq) {
    var s = eq.summary || {};
    var rows = [];
    if (eq.type === 'up') {
      var modo = s.modoOperacion || 'SETPOINT';
      var sp = (s.effectiveSetpoint != null && !isNaN(s.effectiveSetpoint))
        ? s.effectiveSetpoint : s.setpoint;
      var spDisplay = (modo === 'MANUAL') ? '—' : _fmtNum(sp, '°C');
      rows.push(['Zona',     _fmtNum(s.tempZona, '°C')]);
      rows.push(['Abasto',   _fmtNum(s.tempAbasto, '°C')]);
      rows.push(['Setpoint', spDisplay]);
    } else if (eq.type === 'carcamo') {
      rows.push(['Nivel',  _fmtNum(s.nivelCm, 'cm')]);
      rows.push(['Estado', _statusLabel(eq)]);
    } else if (eq.type === 'datalogger') {
      rows.push(['Presión', _fmtNum(s.pressurePsi, 'psi')]);
      rows.push(['(bar)',   _fmtNum(s.pressureBar, 'bar')]);
    }
    return rows;
  }

  function _typeOrder(t) {
    return TYPE_CONFIG[t] ? TYPE_CONFIG[t].order : 9;
  }

  function _typeLabel(t) {
    return TYPE_CONFIG[t] ? TYPE_CONFIG[t].label : t;
  }

  // ADR-3: combined footer label — "{PlantaLabel} — {TypeLabel}"
  // Uses _findPlantaLabel (line 364) for correct "Oficinas" for planta 6.
  // Guard: only call _findPlantaLabel when planta is a positive integer.
  function _buildFooterLabel(eq) {
    var pLabel = (eq.planta && eq.planta > 0) ? _findPlantaLabel(eq.planta) : '';
    var tLabel = _typeLabel(eq.type);
    if (pLabel && tLabel) return pLabel + ' — ' + tLabel;
    return pLabel || tLabel || '';
  }

  function _typeIcon(t) {
    return TYPE_CONFIG[t] ? TYPE_CONFIG[t].icon : '·';
  }

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  var _container       = null;
  var _gridEl          = null;
  var _toolbarEl       = null;
  var _paginationEl    = null;
  var _searchInput     = null;
  var _onCardClick     = null;
  var _onTabClick      = null;
  var _onSearchInput   = null;
  var _onPagClick      = null;
  var _equipment       = [];
  var _plantas         = [];
  var _plantaFilter    = 'all';   // 'all' | number
  var _typeFilter      = 'all';   // 'all' | 'up' | 'carcamo' | 'datalogger'
  var _searchTerm      = '';
  var _page            = 0;

  // -------------------------------------------------------------------------
  // Pipeline: filter + sort
  // -------------------------------------------------------------------------

  function _applyFilters() {
    var out = _equipment.slice();

    if (_plantaFilter !== 'all') {
      var pid = parseInt(_plantaFilter, 10);
      out = out.filter(function(e) { return e.planta === pid; });
    }

    if (_typeFilter !== 'all') {
      out = out.filter(function(e) { return e.type === _typeFilter; });
    }

    if (_searchTerm && _searchTerm.trim()) {
      var t = _searchTerm.toLowerCase().trim();
      out = out.filter(function(e) {
        var hay = ((e.label || '') + ' ' + (e.id || '') + ' ' + _typeLabel(e.type)).toLowerCase();
        return hay.indexOf(t) !== -1;
      });
    }

    // Sort: planta asc → type order asc → label asc
    out.sort(function(a, b) {
      var pa = a.planta || 0, pb = b.planta || 0;
      if (pa !== pb) return pa - pb;
      var ta = _typeOrder(a.type), tb = _typeOrder(b.type);
      if (ta !== tb) return ta - tb;
      return (a.label || '').localeCompare(b.label || '');
    });

    return out;
  }

  function _totalPages(count) {
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }

  function _slicePage(list) {
    var total = _totalPages(list.length);
    if (_page >= total) _page = total - 1;
    if (_page < 0) _page = 0;
    var start = _page * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }

  // -------------------------------------------------------------------------
  // Render — toolbar / grid / pagination
  // -------------------------------------------------------------------------

  function _countByType(plantaFilter) {
    var counts = { up: 0, carcamo: 0, datalogger: 0, total: 0 };
    var pid = (plantaFilter === 'all') ? null : parseInt(plantaFilter, 10);
    for (var i = 0; i < _equipment.length; i++) {
      var e = _equipment[i];
      if (pid !== null && e.planta !== pid) continue;
      counts.total++;
      if (counts[e.type] != null) counts[e.type]++;
    }
    return counts;
  }

  function _renderToolbar() {
    if (!_toolbarEl) return;

    // Row 1: planta tabs.
    var plantaTabs = '<button type="button" class="planta-tab' +
                     (_plantaFilter === 'all' ? ' active' : '') +
                     '" data-planta="all">Todos</button>';
    for (var i = 0; i < _plantas.length; i++) {
      var p = _plantas[i];
      var isActive = (_plantaFilter !== 'all' && parseInt(_plantaFilter, 10) === p.id);
      plantaTabs += '<button type="button" class="planta-tab' +
                    (isActive ? ' active' : '') +
                    '" data-planta="' + _esc(String(p.id)) + '">' +
                    _esc(MX60.util.PlantaLabels.format(p.id)) +
                    '</button>';
    }

    // Row 2: type tabs (counts reflect what's available given current planta filter).
    var c = _countByType(_plantaFilter);
    var typeTabs =
      '<button type="button" class="type-tab' +
        (_typeFilter === 'all' ? ' active' : '') +
        '" data-type="all">Todos <span class="tt-count">' + c.total + '</span></button>' +
      '<button type="button" class="type-tab type-up' +
        (_typeFilter === 'up' ? ' active' : '') +
        (c.up === 0 ? ' empty' : '') +
        '" data-type="up"><span class="tt-icon">▭</span> Unidades Paquete <span class="tt-count">' + c.up + '</span></button>' +
      '<button type="button" class="type-tab type-carcamo' +
        (_typeFilter === 'carcamo' ? ' active' : '') +
        (c.carcamo === 0 ? ' empty' : '') +
        '" data-type="carcamo"><span class="tt-icon">◯</span> Cárcamos <span class="tt-count">' + c.carcamo + '</span></button>' +
      '<button type="button" class="type-tab type-datalogger' +
        (_typeFilter === 'datalogger' ? ' active' : '') +
        (c.datalogger === 0 ? ' empty' : '') +
        '" data-type="datalogger"><span class="tt-icon">⬡</span> Dataloggers <span class="tt-count">' + c.datalogger + '</span></button>';

    _toolbarEl.innerHTML =
      '<div class="toolbar-row">' +
        '<div class="planta-tabs">' + plantaTabs + '</div>' +
        '<div class="equipment-search-wrap">' +
          '<input type="search" class="equipment-search" id="equipmentSearch"' +
          ' placeholder="Buscar equipo (nombre o tipo)…"' +
          ' value="' + _esc(_searchTerm) + '">' +
        '</div>' +
      '</div>' +
      '<div class="toolbar-row toolbar-types">' +
        '<div class="type-tabs">' + typeTabs + '</div>' +
        '<div class="toolbar-legend">' +
          '<span class="legend-pill mode-manual"><span class="card-mode-dot"></span>MANUAL</span>' +
          '<span class="legend-pill mode-setpoint"><span class="card-mode-dot"></span>SETPOINT</span>' +
          '<span class="legend-pill mode-schedule"><span class="card-mode-dot"></span>SCHEDULE</span>' +
        '</div>' +
      '</div>';
    _searchInput = _toolbarEl.querySelector('#equipmentSearch');
  }

  // REQ-1, REQ-8, design §4a — mode pill HTML for UP cards only.
  // Defined before _buildCard to avoid IIFE function-declaration ambiguity (R2 risk).
  function _modePillHtml(eq) {
    if (eq.type !== 'up') return '';
    var s = eq.summary || {};
    var modo = s.modoOperacion || 'SETPOINT';
    var cls  = 'mode-' + modo.toLowerCase();
    return '<span class="card-mode-badge ' + cls + '">' +
             '<span class="card-mode-dot"></span>' +
             '<span class="card-mode-text">' + _esc(modo) + '</span>' +
           '</span>';
  }

  function _buildCard(eq) {
    var visual = _visualClass(eq);
    var metrics = _cardMetrics(eq);
    var metricsHtml = '';
    for (var i = 0; i < metrics.length; i++) {
      metricsHtml +=
        '<div class="card-metric">' +
          '<span class="card-metric-label">' + _esc(metrics[i][0]) + '</span>' +
          '<span class="card-metric-value" data-metric="' + i + '">' + _esc(metrics[i][1]) + '</span>' +
        '</div>';
    }
    return (
      '<button type="button" class="equipment-card type-' + _esc(eq.type) + ' ' + visual + '"' +
        ' data-equip="' + _esc(eq.id) + '"' +
        ' data-type="' + _esc(eq.type) + '"' +
        ' data-planta="' + _esc(String(eq.planta || '')) + '"' +
        ' aria-label="' + _esc(eq.label) + ' — ' + _esc(_statusLabel(eq)) + '">' +
        '<div class="equipment-card-header">' +
          '<span class="card-type-icon">' + _typeIcon(eq.type) + '</span>' +
          '<span class="card-name">' + _esc(eq.label) + '</span>' +
          '<span class="card-status-badge">' + _esc(_statusLabel(eq)) + '</span>' +
          _modePillHtml(eq) +
        '</div>' +
        '<div class="equipment-card-metrics">' + metricsHtml + '</div>' +
        '<div class="equipment-card-footer">' +
          '<span class="card-planta-label">' + _esc(_buildFooterLabel(eq)) + '</span>' +
        '</div>' +
      '</button>'
    );
  }

  function _renderGrid() {
    if (!_gridEl) return;
    var filtered = _applyFilters();
    var pageList = _slicePage(filtered);

    if (pageList.length === 0) {
      _gridEl.innerHTML = '<div class="empty-state">Sin equipos para mostrar con este filtro.</div>';
      return;
    }

    var html = '';
    var lastPlanta = null;
    var lastType   = null;
    var gridOpen   = false;
    var showPlantaHeaders = (_plantaFilter === 'all');
    var showTypeHeaders   = (_typeFilter   === 'all');

    function closeGrid() {
      if (gridOpen) { html += '</div>'; gridOpen = false; }
    }

    for (var i = 0; i < pageList.length; i++) {
      var eq = pageList[i];
      var plantaChanged = eq.planta !== lastPlanta;
      var typeChanged   = eq.type   !== lastType;

      if (plantaChanged) {
        closeGrid();
        if (showPlantaHeaders) {
          var pLabel = _findPlantaLabel(eq.planta);
          html += '<div class="equipment-section-header planta-header">' + _esc(pLabel) + '</div>';
        }
        lastPlanta = eq.planta;
        lastType   = null;
      }
      if ((typeChanged || plantaChanged) && showTypeHeaders) {
        closeGrid();
        html += '<div class="equipment-subsection-header">' +
                  '<span class="ess-icon">' + _typeIcon(eq.type) + '</span>' +
                  _esc(_typeLabelPlural(eq.type)) +
                '</div>';
        html += '<div class="equipment-grid">';
        gridOpen = true;
        lastType = eq.type;
      } else if (!gridOpen) {
        html += '<div class="equipment-grid">';
        gridOpen = true;
        lastType = eq.type;
      }
      html += _buildCard(eq);
    }
    closeGrid();

    _gridEl.innerHTML = html;
  }

  function _findPlantaLabel(pid) {
    return MX60.util.PlantaLabels.format(pid);
  }

  function _renderPagination() {
    if (!_paginationEl) return;
    var filtered = _applyFilters();
    var total = _totalPages(filtered.length);

    if (total <= 1) {
      _paginationEl.innerHTML = '';
      return;
    }
    var html = '';
    html += '<button type="button" class="pag-btn" data-page="prev"' +
            (_page === 0 ? ' disabled' : '') + '>‹ Anterior</button>';
    html += '<span class="pag-info">Página <strong>' + (_page + 1) + '</strong> de ' + total +
            ' · <span class="pag-count">' + filtered.length + ' equipos</span></span>';
    html += '<button type="button" class="pag-btn" data-page="next"' +
            (_page >= total - 1 ? ' disabled' : '') + '>Siguiente ›</button>';
    _paginationEl.innerHTML = html;
  }

  function _renderAll() {
    _renderToolbar();
    _renderGrid();
    _renderPagination();
  }

  function _renderListAndPagination() {
    _renderGrid();
    _renderPagination();
  }

  // -------------------------------------------------------------------------
  // Public API: render / refresh / destroy
  // -------------------------------------------------------------------------

  function render(container, equipmentArray, plantasArray) {
    if (!container) return;
    _container  = container;
    _equipment  = equipmentArray || [];
    _plantas    = plantasArray   || [];
    _plantaFilter = 'all';
    _typeFilter   = 'all';
    _searchTerm = '';
    _page       = 0;

    container.innerHTML =
      '<div class="equipment-page-wrap">' +
        '<div class="equipment-toolbar" id="equipmentToolbar"></div>' +
        '<div class="equipment-content" id="equipmentContent"></div>' +
        '<div class="equipment-pagination" id="equipmentPagination"></div>' +
      '</div>';

    _toolbarEl    = container.querySelector('#equipmentToolbar');
    _gridEl       = container.querySelector('#equipmentContent');
    _paginationEl = container.querySelector('#equipmentPagination');

    _renderAll();

    // Toolbar tab clicks (delegated) — handles both planta and type tabs.
    _onTabClick = function(e) {
      var btn = e.target;
      while (btn && btn !== _toolbarEl &&
             !(btn.classList && (
               btn.classList.contains('planta-tab') ||
               btn.classList.contains('type-tab')
             ))) {
        btn = btn.parentNode;
      }
      if (!btn || !btn.getAttribute) return;
      if (btn.classList.contains('planta-tab')) {
        var pid = btn.getAttribute('data-planta');
        if (pid == null) return;
        _plantaFilter = (pid === 'all') ? 'all' : pid;
        _page = 0;
        _renderAll();
        return;
      }
      if (btn.classList.contains('type-tab')) {
        var t = btn.getAttribute('data-type');
        if (t == null) return;
        _typeFilter = t;
        _page = 0;
        _renderAll();
      }
    };
    _toolbarEl.addEventListener('click', _onTabClick, false);

    // Search input — delegated to toolbar, since the input lives inside.
    _onSearchInput = function(e) {
      var input = e.target;
      if (!input || input.id !== 'equipmentSearch') return;
      _searchTerm = input.value || '';
      _page = 0;
      _renderListAndPagination();
    };
    _toolbarEl.addEventListener('input', _onSearchInput, false);

    // Card click → navigate to detail.
    _onCardClick = function(e) {
      var card = e.target;
      while (card && card !== _gridEl &&
             !(card.classList && card.classList.contains('equipment-card'))) {
        card = card.parentNode;
      }
      if (!card || !card.getAttribute) return;
      var id = card.getAttribute('data-equip');
      if (id && MX60.Router) MX60.Router.navigate('#detail/' + encodeURIComponent(id));
    };
    _gridEl.addEventListener('click', _onCardClick, false);

    // Pagination prev/next.
    _onPagClick = function(e) {
      var btn = e.target;
      while (btn && btn !== _paginationEl && !(btn.tagName === 'BUTTON')) {
        btn = btn.parentNode;
      }
      if (!btn || !btn.getAttribute) return;
      if (btn.hasAttribute('disabled')) return;
      var dir = btn.getAttribute('data-page');
      if (dir === 'prev') _page = Math.max(0, _page - 1);
      else if (dir === 'next') _page = _page + 1;
      _renderListAndPagination();
    };
    _paginationEl.addEventListener('click', _onPagClick, false);
  }

  /**
   * Granular refresh — find each card by data-equip and update its
   * metric values + status class. No innerHTML if data shape unchanged.
   */
  function refresh(equipmentArray) {
    _equipment = equipmentArray || [];
    if (!_gridEl) return;
    var filtered = _applyFilters();
    var pageList = _slicePage(filtered);
    var ids = {};
    for (var i = 0; i < pageList.length; i++) ids[pageList[i].id] = true;

    // If page composition changed (different ids than what's currently
    // rendered), do a full re-render. Cheap heuristic: count cards.
    var rendered = _gridEl.querySelectorAll('.equipment-card');
    if (rendered.length !== pageList.length) {
      _renderListAndPagination();
      return;
    }

    // Granular update each card in place.
    for (var j = 0; j < pageList.length; j++) {
      var eq = pageList[j];
      var card = _gridEl.querySelector(
        '.equipment-card[data-equip="' + eq.id.replace(/"/g, '\\"') + '"]'
      );
      if (!card) continue;
      var newVisual = _visualClass(eq);
      var oldVisual = (card.className.match(/(?:^|\s)(status-\w+|state-\d)/) || [])[1];
      if (oldVisual && oldVisual !== newVisual) {
        card.classList.remove(oldVisual);
        card.classList.add(newVisual);
      }
      var badge = card.querySelector('.card-status-badge');
      if (badge) {
        var newLabel = _statusLabel(eq);
        if (badge.textContent !== newLabel) badge.textContent = newLabel;
      }
      // REQ-7 paths 1+2 — update mode pill (UP only; pill absent on carcamo/datalogger)
      var pill = card.querySelector('.card-mode-badge');
      if (pill) {
        var newModo = (eq.summary && eq.summary.modoOperacion) || 'SETPOINT';
        var newModoCls = 'mode-' + newModo.toLowerCase();
        // Path 1: class swap — only when changed (idempotent, no layout thrash)
        if (!pill.classList.contains(newModoCls)) {
          pill.classList.remove('mode-manual', 'mode-setpoint', 'mode-schedule');
          pill.classList.add(newModoCls);
        }
        // Path 2: text — only when changed
        var textEl = pill.querySelector('.card-mode-text');
        if (textEl && textEl.textContent !== newModo) {
          textEl.textContent = newModo;
        }
      }
      var metrics = _cardMetrics(eq);
      for (var k = 0; k < metrics.length; k++) {
        var node = card.querySelector('.card-metric-value[data-metric="' + k + '"]');
        if (node && node.textContent !== metrics[k][1]) node.textContent = metrics[k][1];
      }
    }
  }

  function destroy() {
    if (_toolbarEl) {
      if (_onTabClick)    _toolbarEl.removeEventListener('click', _onTabClick,    false);
      if (_onSearchInput) _toolbarEl.removeEventListener('input', _onSearchInput, false);
    }
    if (_gridEl && _onCardClick)    _gridEl.removeEventListener('click', _onCardClick, false);
    if (_paginationEl && _onPagClick) _paginationEl.removeEventListener('click', _onPagClick, false);

    if (_container) _container.innerHTML = '';
    _container = _toolbarEl = _gridEl = _paginationEl = _searchInput = null;
    _onTabClick = _onSearchInput = _onCardClick = _onPagClick = null;
    _equipment = [];
    _plantas   = [];
    _plantaFilter = 'all';
    _typeFilter   = 'all';
    _searchTerm = '';
    _page = 0;
  }

  MX60.EquipmentCard = {
    render:    render,
    refresh:   refresh,
    destroy:   destroy,
    PAGE_SIZE: PAGE_SIZE
  };

  // -------------------------------------------------------------------------
  // EquipmentPage — DashboardApp lifecycle wrapper
  // -------------------------------------------------------------------------

  var _onDataChange = null;
  var _unsubAlarmLatch = null;
  var _unsubCarcamoTh = null;
  var _unsubDataloggerTh = null;
  var _unsubUpTh = null;

  function _refreshFromCache() {
    if (MX60.EquipmentData && typeof MX60.EquipmentData.getAll === 'function') {
      var cached = MX60.EquipmentData.getAll();
      if (cached && cached.length) MX60.EquipmentCard.refresh(cached);
    }
  }

  var EquipmentPage = {
    mount: function(container, route) {
      MX60.EquipmentData.load(function(state) {
        var plantas = (state.raw && state.raw._meta && state.raw._meta.plantas) || [];
        MX60.EquipmentCard.render(container, state.equipment, plantas);
      });
      _onDataChange = function(state) { MX60.EquipmentCard.refresh(state.equipment); };
      MX60.EquipmentData.addListener(_onDataChange);
      // Re-render badges + visualClasses whenever any UP latches/un-latches
      // an alarm — the AlarmLatchStore lives outside the polling cycle.
      if (MX60.AlarmLatchStore && typeof MX60.AlarmLatchStore.subscribe === 'function') {
        _unsubAlarmLatch = MX60.AlarmLatchStore.subscribe(_refreshFromCache);
      }
      // When operator edits umbralAdvertencia/umbralCritico in any detail page,
      // CarcamoThresholdStore / DataloggerThresholdStore fire a 'changed' event.
      // Re-pinta los cards del grid INMEDIATAMENTE — sino el badge "Precaución"
      // no se actualiza hasta el próximo notify de EquipmentData.
      if (MX60.CarcamoThresholdStore && typeof MX60.CarcamoThresholdStore.subscribe === 'function') {
        _unsubCarcamoTh = MX60.CarcamoThresholdStore.subscribe(_refreshFromCache);
      }
      if (MX60.DataloggerThresholdStore && typeof MX60.DataloggerThresholdStore.subscribe === 'function') {
        _unsubDataloggerTh = MX60.DataloggerThresholdStore.subscribe(_refreshFromCache);
      }
      // UPs use UpThresholdStore for protection thresholds (sobrecarga, antifrezze).
      // Without this subscribe, editing a UP threshold in UpDetail does not
      // immediately update the equipment grid card status.
      if (MX60.UpThresholdStore && typeof MX60.UpThresholdStore.subscribe === 'function') {
        _unsubUpTh = MX60.UpThresholdStore.subscribe(_refreshFromCache);
      }
    },
    destroy: function() {
      if (_onDataChange) {
        MX60.EquipmentData.removeListener(_onDataChange);
        _onDataChange = null;
      }
      if (typeof _unsubAlarmLatch === 'function')    { _unsubAlarmLatch();    _unsubAlarmLatch    = null; }
      if (typeof _unsubCarcamoTh === 'function')     { _unsubCarcamoTh();     _unsubCarcamoTh     = null; }
      if (typeof _unsubDataloggerTh === 'function')  { _unsubDataloggerTh();  _unsubDataloggerTh  = null; }
      if (typeof _unsubUpTh === 'function')          { _unsubUpTh();          _unsubUpTh          = null; }
      MX60.EquipmentCard.destroy();
    }
  };

  MX60.EquipmentPage = EquipmentPage;

  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('equipment', EquipmentPage);
  }

  window.MX60 = MX60;

})(window);
