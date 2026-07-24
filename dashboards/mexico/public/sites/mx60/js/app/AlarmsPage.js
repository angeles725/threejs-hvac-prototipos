/**
 * MX60.AlarmsPage
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Alarms page (#alarms). Equipment-style toolbar+grid+pagination.
 *
 * SDD-A: rebuilt to match equipment style (planta-tabs + state-tabs + grid +
 *        pagination + dedicated source page).
 * SDD-B: extended with bulk select + bulk action bar + CSV export.
 *
 * Page component contract: { mount(container, route), destroy() }
 * Registered as: MX60.DashboardApp.registerPage('alarms', MX60.AlarmsPage).
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var REFRESH_INTERVAL = 20000;
  var PAGE_SIZE = 12;

  // ── State ─────────────────────────────────────────────────────────────────────

  var _data            = null;
  var _loading         = false;
  var _loadAttempted   = false;
  var _loadError       = null;

  var _container       = null;
  var _toolbarEl       = null;
  var _gridEl          = null;
  var _paginationEl    = null;
  var _searchInput     = null;
  var _bulkBarHost     = null;
  var _bulkBar         = null;

  var _plantaFilter    = 'all';
  var _stateFilter     = 'all';
  var _searchTerm      = '';
  var _page            = 0;
  var _selected        = {}; // map source -> true (Set surrogate for ES5)

  var _pollTimer       = null;
  var _onTabClick      = null;
  var _onSearchInput   = null;
  var _onCardClick     = null;
  var _onPagClick      = null;

  // SDD mx60-ackall-full-db-and-badge-no-filter: ack-all-history button state
  var _ackAllBarEl     = null;
  var _onAckAllClick   = null;
  var _ackAllBusy      = false;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _getConfig() {
    return (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
  }

  function _sourcesUrl() {
    var cfg = _getConfig();
    var range = MX60.TimeRangePicker ? MX60.TimeRangePicker.getSelected() : 'today';
    return ((cfg.api && cfg.api.alarmSources) || '/mx60/api/alarms/sources') +
      '?range=' + encodeURIComponent(range);
  }

  function _shortSource(ord) {
    if (!ord) return '—';
    var s = ord;
    var pipeIdx = s.lastIndexOf('|');
    if (pipeIdx >= 0) s = s.substring(pipeIdx + 1);
    var slashIdx = s.lastIndexOf('/');
    if (slashIdx >= 0) s = s.substring(slashIdx + 1);
    if (s.charAt(0) === '[') {
      var closeIdx = s.indexOf(']');
      s = closeIdx > 0 ? s.substring(1, closeIdx) : s.substring(1);
    }
    s = s.replace(/^\s+|\s+$/g, '');
    return s.length > 0 ? s : ord;
  }

  function _plantaLabel(p) {
    // Backend emite planta=0 ó null para alarmas que no son de equipos asignados
    // a una planta (alarmas de prueba, drivers, navOrd-only).
    if (p == null || p === 0) return 'Sin asignar';
    return MX60.util.PlantaLabels.format(p);
  }

  function _isActiveState(state) {
    var s = String(state || '').toLowerCase();
    return (s === 'offnormal' || s === 'fault' || s === 'in_fault');
  }

  function _selectedCount() {
    var n = 0; for (var k in _selected) if (_selected[k]) n++; return n;
  }

  function _selectedRows() {
    if (!_data) return [];
    var out = [];
    for (var i = 0; i < _data.length; i++) {
      if (_selected[_data[i].source]) out.push(_data[i]);
    }
    return out;
  }

  function _selectedAlarmCount() {
    var rows = _selectedRows();
    var n = 0;
    for (var i = 0; i < rows.length; i++) {
      n += (rows[i].ackCount || 0) + (rows[i].unackCount || 0);
    }
    return n;
  }

  // ── Filter logic ──────────────────────────────────────────────────────────────

  function _applyFilters(rows) {
    if (!rows) return [];
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (_plantaFilter !== 'all') {
        var pid = parseInt(_plantaFilter, 10);
        if (r.planta !== pid) continue;
      }
      if (_stateFilter === 'unacked' && !(r.unackCount > 0)) continue;
      if (_stateFilter === 'active'  && !_isActiveState(r.sourceState)) continue;
      if (_stateFilter === 'acked'   && !(r.unackCount === 0 && r.ackCount > 0)) continue;
      if (_stateFilter === 'latch'   && r.sourceType !== 'latch') continue;
      if (_searchTerm) {
        var t = _searchTerm.toLowerCase();
        var hay = ((_shortSource(r.source) + ' ' + r.source) || '').toLowerCase();
        if (hay.indexOf(t) === -1) continue;
      }
      out.push(r);
    }
    out.sort(function(a, b) {
      // Sin asignar (planta null/0) va al FINAL, no al inicio.
      var pa = (a.planta == null || a.planta === 0) ? 999 : a.planta;
      var pb = (b.planta == null || b.planta === 0) ? 999 : b.planta;
      if (pa !== pb) return pa - pb;
      return _shortSource(a.source).localeCompare(_shortSource(b.source));
    });
    return out;
  }

  function _computeStateCounts(rows) {
    var c = { all: 0, unacked: 0, active: 0, acked: 0, latch: 0 };
    if (!rows) return c;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (_plantaFilter !== 'all') {
        var pid = parseInt(_plantaFilter, 10);
        if (r.planta !== pid) continue;
      }
      c.all++;
      if (r.unackCount > 0) c.unacked++;
      if (_isActiveState(r.sourceState)) c.active++;
      if (r.unackCount === 0 && r.ackCount > 0) c.acked++;
      if (r.sourceType === 'latch') c.latch++;
    }
    return c;
  }

  function _totalPages(count) { return Math.max(1, Math.ceil(count / PAGE_SIZE)); }

  function _slicePage(list) {
    var total = _totalPages(list.length);
    if (_page >= total) _page = total - 1;
    if (_page < 0) _page = 0;
    var start = _page * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }

  // ── Card builder ──────────────────────────────────────────────────────────────

  function _typeIcon(sourceType) {
    if (sourceType === 'latch') {
      return '<svg class="mx60-alarm-type-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
        '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
        '</svg>';
    }
    return '<svg class="mx60-alarm-type-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
      '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
      '</svg>';
  }

  function _priorityDot(priority) {
    var low = String(priority || '').toLowerCase();
    var cls = 'mx60-alarm-priority-dot';
    if (low === 'high' || low === 'alto')      cls += ' mx60-alarm-priority-dot--high';
    else if (low === 'med' || low === 'medio') cls += ' mx60-alarm-priority-dot--med';
    else if (low === 'low' || low === 'bajo')  cls += ' mx60-alarm-priority-dot--low';
    return '<span class="' + cls + '" aria-hidden="true"></span>';
  }

  function _stateBadgeForRow(row) {
    if (row.sourceType === 'latch') {
      return '<span class="card-status-badge mx60-alarm-state-badge--latch">Latch</span>';
    }
    if (row.unackCount > 0) {
      // Texto compacto para no romper el layout del badge (max ~12 chars).
      return '<span class="card-status-badge mx60-alarm-state-badge--unacked">' + row.unackCount + ' sin ack</span>';
    }
    if (_isActiveState(row.sourceState)) {
      return '<span class="card-status-badge mx60-alarm-state-badge--active">Activa</span>';
    }
    return '<span class="card-status-badge mx60-alarm-state-badge--acked">Reconocida</span>';
  }

  function _stateClassForRow(row) {
    if (row.unackCount > 0) return 'state-2';
    if (_isActiveState(row.sourceState)) return 'state-1';
    return 'state-0';
  }

  function _typeClass(sourceType) {
    return sourceType === 'latch' ? 'type-latch' : 'type-alarm';
  }

  function _relTime(ts) {
    if (MX60.util && MX60.util.RelativeTime) {
      return '<span title="' + _esc(MX60.util.RelativeTime.absolute(ts)) + '">' +
             _esc(MX60.util.RelativeTime.format(ts)) + '</span>';
    }
    return _esc(ts || '—');
  }

  function _priorityBadgeHtml(priority) {
    var label = priority || '—';
    var low = String(priority || '').toLowerCase();
    var cls = 'mx60-pri-badge';
    if (low === 'high' || low === 'alto')      cls += ' mx60-pri-high';
    else if (low === 'med' || low === 'medio') cls += ' mx60-pri-med';
    else if (low === 'low' || low === 'bajo')  cls += ' mx60-pri-low';
    return '<span class="' + cls + '">' + _esc(label) + '</span>';
  }

  function _buildSourceCard(row) {
    var shortSrc  = _shortSource(row.source);
    var typeCls   = _typeClass(row.sourceType);
    var stateCls  = _stateClassForRow(row);
    var ackNum    = row.ackCount   != null ? row.ackCount   : 0;
    var unackNum  = row.unackCount != null ? row.unackCount : 0;
    var ariaState = (row.sourceType === 'latch') ? 'Latch' :
                    (unackNum > 0 ? 'Sin reconocer' :
                    (_isActiveState(row.sourceState) ? 'Activa' : 'Reconocida'));
    var checked   = _selected[row.source] ? ' checked' : '';

    return (
      '<button type="button" class="equipment-card ' + typeCls + ' ' + stateCls + '"' +
        ' data-source="' + _esc(row.source) + '"' +
        ' data-planta="' + _esc(String(row.planta || '')) + '"' +
        ' aria-label="' + _esc(shortSrc) + ' — ' + _esc(ariaState) + '">' +
        '<input type="checkbox" class="mx60-bulk-checkbox mx60-bulk-checkbox-card"' + checked +
          ' data-source="' + _esc(row.source) + '"' +
          ' aria-label="Seleccionar fuente">' +
        '<div class="equipment-card-header">' +
          '<span class="card-type-icon">' + _typeIcon(row.sourceType) + '</span>' +
          _priorityDot(row.priority) +
          '<span class="card-name mx60-alarm-source-name" title="' + _esc(row.source || '') + '">' +
            _esc(shortSrc) +
          '</span>' +
          _stateBadgeForRow(row) +
        '</div>' +
        '<div class="equipment-card-metrics">' +
          '<div class="card-metric">' +
            '<span class="card-metric-label">Prioridad</span>' +
            '<span class="card-metric-value" data-metric="priority">' + _priorityBadgeHtml(row.priority) + '</span>' +
          '</div>' +
          '<div class="card-metric">' +
            '<span class="card-metric-label">Última act.</span>' +
            '<span class="card-metric-value" data-metric="lastUpdate">' + _relTime(row.lastUpdate) + '</span>' +
          '</div>' +
          '<div class="card-metric">' +
            '<span class="card-metric-label">Conteo</span>' +
            '<span class="card-metric-value" data-metric="count">' +
              _esc(String(ackNum)) + ' Ack / ' + _esc(String(unackNum)) + ' Sin' +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="equipment-card-footer">' +
          '<span class="card-planta-label">' +
            _esc(_plantaLabel(row.planta) || '') +
            (row.alarmClass ? ' — ' + _esc(row.alarmClass) : ' — Sin clase') +
          '</span>' +
        '</div>' +
      '</button>'
    );
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────────

  function _buildPlantaTabsHtml() {
    var TABS = [
      ['all', 'Todos'], [1, 'Planta 1'], [2, 'Planta 2'], [3, 'Planta 3'],
      [4, 'Planta 4'], [5, 'Planta 5'], [6, 'Oficinas']
    ];
    var html = '';
    for (var i = 0; i < TABS.length; i++) {
      var val = TABS[i][0], lbl = TABS[i][1];
      var isActive = (val === _plantaFilter ||
                      (_plantaFilter !== 'all' && parseInt(_plantaFilter, 10) === val));
      html += '<button type="button" class="planta-tab' +
              (isActive ? ' active' : '') +
              '" data-planta="' + _esc(String(val)) + '">' +
              _esc(lbl) + '</button>';
    }
    return html;
  }

  function _buildStateTabsHtml(counts) {
    var TABS = [
      ['all', 'Todas'], ['unacked', 'Sin reconocer'], ['active', 'Activas'],
      ['acked', 'Reconocidas'], ['latch', 'Latches']
    ];
    var html = '';
    for (var i = 0; i < TABS.length; i++) {
      var val = TABS[i][0], lbl = TABS[i][1];
      var n = counts[val] != null ? counts[val] : 0;
      var isActive = (val === _stateFilter);
      var isEmpty  = (n === 0 && val !== 'all');
      html += '<button type="button" class="type-tab' +
              (isActive ? ' active' : '') +
              (isEmpty  ? ' empty'  : '') +
              '" data-state="' + _esc(val) + '">' +
              _esc(lbl) +
              ' <span class="tt-count">' + n + '</span>' +
              '</button>';
    }
    return html;
  }

  function _csvButtonHtml() {
    return '<button type="button" class="mx60-csv-btn" data-action="csv-export" aria-label="Exportar CSV">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
        '<polyline points="7 10 12 15 17 10"/>' +
        '<line x1="12" y1="15" x2="12" y2="3"/>' +
      '</svg>' +
      ' <span>Exportar CSV</span>' +
    '</button>';
  }

  function _renderToolbar() {
    if (!_toolbarEl) return;
    var counts = _computeStateCounts(_data);
    _toolbarEl.innerHTML =
      '<div class="toolbar-row">' +
        '<div class="planta-tabs">' + _buildPlantaTabsHtml() + '</div>' +
        '<div class="equipment-search-wrap">' +
          '<input type="search" class="equipment-search" id="alarmsSearch"' +
          ' placeholder="Buscar fuente o ORD…"' +
          ' value="' + _esc(_searchTerm) + '">' +
        '</div>' +
      '</div>' +
      '<div class="toolbar-row toolbar-types">' +
        '<div class="type-tabs">' + _buildStateTabsHtml(counts) + '</div>' +
        '<div class="toolbar-types-right">' +
          _csvButtonHtml() +
          '<div data-alarms-time-picker></div>' +
        '</div>' +
      '</div>';
    _searchInput = _toolbarEl.querySelector('#alarmsSearch');

    var pickerSlot = _toolbarEl.querySelector('[data-alarms-time-picker]');
    if (pickerSlot && MX60.TimeRangePicker) {
      MX60.TimeRangePicker.render(pickerSlot);
      MX60.TimeRangePicker.onChange(function() {
        _loadAttempted = false;
        _fetch(function() { _renderAll(); });
      });
    }
  }

  // ── Grid ──────────────────────────────────────────────────────────────────────

  function _renderGrid() {
    if (!_gridEl) return;
    if (!_data && !_loadAttempted) {
      _gridEl.innerHTML = '<div class="empty-state-enhanced"><p>Cargando alarmas...</p></div>';
      return;
    }
    if (!_data || _data.length === 0) {
      var msg = _loadError
        ? 'No se pudieron cargar las alarmas (' + _esc(_loadError) + ')'
        : 'No hay fuentes de alarma activas.';
      _gridEl.innerHTML = '<div class="empty-state-enhanced"><p>' + msg + '</p></div>';
      return;
    }
    var filtered = _applyFilters(_data);
    if (filtered.length === 0) {
      _gridEl.innerHTML = '<div class="empty-state">Sin alarmas para mostrar con este filtro.</div>';
      return;
    }
    var pageList = _slicePage(filtered);

    var html = '';
    var lastPlanta = null, gridOpen = false;
    var showHeaders = (_plantaFilter === 'all');

    function closeGrid() { if (gridOpen) { html += '</div>'; gridOpen = false; } }

    for (var i = 0; i < pageList.length; i++) {
      var row = pageList[i];
      if (row.planta !== lastPlanta) {
        closeGrid();
        if (showHeaders) {
          html += '<div class="equipment-section-header planta-header">' +
                  _esc(_plantaLabel(row.planta)) + '</div>';
        }
        html += '<div class="equipment-grid">';
        gridOpen = true;
        lastPlanta = row.planta;
      }
      html += _buildSourceCard(row);
    }
    closeGrid();
    _gridEl.innerHTML = html;
  }

  function _renderPagination() {
    if (!_paginationEl) return;
    var filtered = _applyFilters(_data);
    var total = _totalPages(filtered.length);
    if (total <= 1) { _paginationEl.innerHTML = ''; return; }
    _paginationEl.innerHTML =
      '<button type="button" class="pag-btn" data-page="prev"' +
        (_page === 0 ? ' disabled' : '') + '>&#x2039; Anterior</button>' +
      '<span class="pag-info">Página <strong>' + (_page + 1) + '</strong> de ' + total +
        ' &middot; <span class="pag-count">' + filtered.length + ' fuentes</span></span>' +
      '<button type="button" class="pag-btn" data-page="next"' +
        (_page >= total - 1 ? ' disabled' : '') + '>Siguiente &#x203A;</button>';
  }

  // =========================================================================
  // SDD mx60-ackall-full-db-and-badge-no-filter: standalone ack-all bar
  // =========================================================================

  function _renderAckAllBar() {
    if (!_ackAllBarEl) return;
    var s = (MX60.AlarmsManager && MX60.AlarmsManager.getCount &&
             MX60.AlarmsManager.getCount()) || {};
    var disabled = _ackAllBusy || (s.total || 0) === 0;

    _ackAllBarEl.innerHTML =
      '<button type="button" class="mx60-btn mx60-btn--danger mx60-ackall-history" ' +
              'data-action="ackall-history"' + (disabled ? ' disabled' : '') + '>' +
        'Reconocer todo el historial' +
      '</button>';
  }

  function _handleAckAllFullDb() {
    if (_ackAllBusy) return;

    if (!MX60.Confirm || typeof MX60.Confirm.show !== 'function') {
      console.warn('[AlarmsPage] MX60.Confirm not available — aborting ackAll');
      return;
    }

    MX60.Confirm.show({
      title:        'Reconocer todo el historial',
      message:      'Esto reconocerá TODA la base de datos de alarmas (incluidas las históricas fuera de la vista actual). Esta acción no se puede deshacer. ¿Confirmás?',
      confirmLabel: 'Sí, reconocer todo',
      cancelLabel:  'Cancelar',
      tone:         'danger',
      onConfirm: function() {
        _ackAllBusy = true;
        _renderAckAllBar();

        MX60.AlarmsManager.ackAllFullDb({
          onSuccess: function(r) {
            _ackAllBusy = false;
            _renderAckAllBar();
            var msg = (r.ackedCount || 0) + ' registro(s) reconocido(s)';
            if (r.truncated) msg += ' (más pendientes — repita la acción)';
            if (MX60.Toast && typeof MX60.Toast.show === 'function') {
              MX60.Toast.show({ message: msg, durationMs: 4500 });
            }
          },
          onError: function(errMsg) {
            _ackAllBusy = false;
            _renderAckAllBar();
            if (MX60.Toast && typeof MX60.Toast.show === 'function') {
              MX60.Toast.show({ message: 'Error al reconocer historial: ' + errMsg, durationMs: 6000 });
            }
          }
        });
      }
    });
  }

  function _renderAll() {
    _renderToolbar();
    _renderGrid();
    _renderPagination();
    _updateBulkBar();
    _renderAckAllBar();
  }

  function _refreshGridGranular() {
    if (!_gridEl) return;
    var filtered = _applyFilters(_data);
    var pageList = _slicePage(filtered);
    var rendered = _gridEl.querySelectorAll('.equipment-card[data-source]');
    if (rendered.length !== pageList.length) {
      _renderGrid();
      _renderPagination();
      return;
    }
    for (var j = 0; j < pageList.length; j++) {
      var row = pageList[j];
      var card = _gridEl.querySelector(
        '.equipment-card[data-source="' + (row.source || '').replace(/"/g, '\\"') + '"]'
      );
      if (!card) continue;
      var newState = _stateClassForRow(row);
      var classes = card.className.split(/\s+/);
      var rebuilt = [];
      for (var k = 0; k < classes.length; k++) {
        if (classes[k].indexOf('state-') !== 0) rebuilt.push(classes[k]);
      }
      rebuilt.push(newState);
      card.className = rebuilt.join(' ');
      var badge = card.querySelector('.card-status-badge');
      if (badge) {
        var newBadgeHtml = _stateBadgeForRow(row);
        if (badge.outerHTML !== newBadgeHtml) badge.outerHTML = newBadgeHtml;
      }
      var lu = card.querySelector('[data-metric="lastUpdate"]');
      if (lu) lu.innerHTML = _relTime(row.lastUpdate);
      var cnt = card.querySelector('[data-metric="count"]');
      if (cnt) {
        var ackNum   = row.ackCount   != null ? row.ackCount   : 0;
        var unackNum = row.unackCount != null ? row.unackCount : 0;
        cnt.textContent = ackNum + ' Ack / ' + unackNum + ' Sin';
      }
      // Re-stamp checkbox state from _selected
      var cb = card.querySelector('input.mx60-bulk-checkbox');
      if (cb) cb.checked = !!_selected[row.source];
    }

    var stateTabsEl = _toolbarEl && _toolbarEl.querySelector('.type-tabs');
    if (stateTabsEl) {
      stateTabsEl.innerHTML = _buildStateTabsHtml(_computeStateCounts(_data));
    }

    _updateBulkBar();
  }

  // ── Bulk bar ──────────────────────────────────────────────────────────────────

  function _updateBulkBar() {
    if (!_bulkBar) return;
    _bulkBar.update();
  }

  function _mountBulkBar() {
    if (!_bulkBarHost) return;
    _bulkBar = MX60.BulkActionBar.mount(_bulkBarHost, {
      getCount: function() {
        return { selected: _selectedCount(), alarms: _selectedAlarmCount() };
      },
      getActions: function() {
        var disabled = (_selectedAlarmCount() === 0);
        return [
          { id: 'ackAll',    label: 'Reconocer todas',         disabled: disabled, tone: 'danger'  },
          { id: 'ackRecent', label: 'Reconocer más reciente',  disabled: disabled, tone: 'warning' }
        ];
      },
      onAction: function(actionId) {
        if (actionId === 'ackAll')    _handleBulkAck('all');
        if (actionId === 'ackRecent') _handleBulkAck('recent');
      },
      onClear: function() {
        _selected = {};
        // un-check all checkboxes in DOM
        var cbs = _gridEl.querySelectorAll('input.mx60-bulk-checkbox');
        for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
        _updateBulkBar();
      },
      formatText: function(c) {
        return c.selected + ' fuente(s) seleccionada(s) — ' + c.alarms + ' alarma(s)';
      }
    });
  }

  function _handleBulkAck(mode) {
    var rows = _selectedRows();
    console.info('[AlarmsPage] _handleBulkAck mode=' + mode + ' selectedRows=' + rows.length);
    if (rows.length === 0) {
      console.warn('[AlarmsPage] _handleBulkAck: no selected rows, abortando');
      return;
    }

    var allUuids = [];
    var dispatchPerSource = (mode === 'recent');
    var totalAlarms = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (dispatchPerSource) {
        if (r.uuid) allUuids.push(r.uuid);
        else if (r.uuids && r.uuids.length > 0) allUuids.push(r.uuids[0]);
      } else {
        if (r.uuids && r.uuids.length > 0) {
          for (var u = 0; u < r.uuids.length; u++) allUuids.push(r.uuids[u]);
        } else if (r.uuid) {
          allUuids.push(r.uuid);
        }
      }
      totalAlarms += (r.ackCount || 0) + (r.unackCount || 0);
    }

    console.info('[AlarmsPage] _handleBulkAck collected uuids=' + allUuids.length + ' totalAlarms=' + totalAlarms);
    if (allUuids.length === 0) {
      console.warn('[AlarmsPage] _handleBulkAck: source rows have no uuid/uuids fields — backend issue?');
      if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
        MX60.Toast.warn('No hay UUIDs disponibles para reconocer (revisar backend)');
      }
      return;
    }

    var msg = (mode === 'recent')
      ? '¿Reconocer ' + allUuids.length + ' alarma(s) (la más reciente por fuente) de ' + rows.length + ' fuente(s)?'
      : '¿Reconocer ' + allUuids.length + ' alarma(s) en ' + rows.length + ' fuente(s)?';

    if (MX60.Confirm && typeof MX60.Confirm.show === 'function') {
      console.info('[AlarmsPage] opening Confirm modal for bulk ack');
      MX60.Confirm.show({
        title: 'Reconocer alarmas',
        message: msg,
        confirmLabel: 'Reconocer',
        cancelLabel:  'Cancelar',
        tone: 'danger',
        onConfirm: function() {
          console.info('[AlarmsPage] Confirm onConfirm fired — dispatching ackAlarms uuids=' + allUuids.length);
          if (MX60.AlarmsManager && typeof MX60.AlarmsManager.ackAlarms === 'function') {
            MX60.AlarmsManager.ackAlarms(allUuids, '', {
              // C-5 [Spec S-2d]: widen to 2-arg (r, meta) — surface partial-fail warning toast
              onSuccess: function(r, meta) {
                console.info('[AlarmsPage] ackAlarms onSuccess:', r);
                if (meta && meta.partial && r.failedCount > 0) {
                  var total = r.ackedCount + r.failedCount;
                  var errDetail = (r.errors && r.errors[0]) || 'fallo parcial';
                  if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
                    MX60.Toast.warn(r.ackedCount + ' de ' + total + ' reconocidas — ' + errDetail);
                  }
                }
              },
              onError:   function(s) { console.error('[AlarmsPage] ackAlarms onError status=' + s); }
            });
          } else {
            console.error('[AlarmsPage] MX60.AlarmsManager.ackAlarms not available!');
          }
          _selected = {};
          _updateBulkBar();
          // Re-render to clear checkboxes visually
          var cbs = _gridEl.querySelectorAll('input.mx60-bulk-checkbox');
          for (var c = 0; c < cbs.length; c++) cbs[c].checked = false;
          // Re-fetch shortly after
          setTimeout(function() {
            _loadAttempted = false;
            _fetch(function() { _refreshGridGranular(); });
          }, 600);
        }
      });
    } else {
      console.error('[AlarmsPage] MX60.Confirm not available! Cannot prompt for ack');
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────────

  function _handleCsvExport() {
    if (!MX60.util || !MX60.util.CsvExport) return;
    var filtered = _applyFilters(_data);
    var range = MX60.TimeRangePicker ? MX60.TimeRangePicker.getSelected() : 'today';
    var ts = MX60.util.CsvExport.timestamp();
    var filename = 'alarms-' + range + '-' + ts + '.csv';

    var cols = [
      { header: 'Fuente',         getValue: function(r) { return _shortSource(r.source); } },
      { header: 'ORD',            getValue: function(r) { return r.source || ''; } },
      { header: 'Prioridad',      getValue: function(r) { return r.priority || ''; } },
      { header: 'Estado',         getValue: function(r) { return r.sourceState || ''; } },
      { header: 'Tipo',           getValue: function(r) { return r.sourceType || ''; } },
      { header: 'Planta',         getValue: function(r) { return r.planta != null ? String(r.planta) : ''; } },
      { header: 'Clase',          getValue: function(r) { return r.alarmClass || ''; } },
      { header: 'Reconocidas',    getValue: function(r) { return r.ackCount != null ? String(r.ackCount) : '0'; } },
      { header: 'SinReconocer',   getValue: function(r) { return r.unackCount != null ? String(r.unackCount) : '0'; } },
      { header: 'UltimaAct',      getValue: function(r) { return r.lastUpdate || ''; } },
      { header: 'Mensaje',        getValue: function(r) { return r.message || ''; } }
    ];

    MX60.util.CsvExport.download(filtered, cols, filename);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  function _fetch(callback) {
    if (_loading) return;
    _loading = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', _sourcesUrl(), true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      _loading = false;
      _loadAttempted = true;
      if (xhr.status === 200) {
        try {
          var parsed = JSON.parse(xhr.responseText);
          _data = Array.isArray(parsed) ? parsed : [];
          _loadError = null;
        } catch (e) { _data = []; _loadError = 'JSON inválido'; }
      } else {
        _data = []; _loadError = 'HTTP ' + xhr.status;
      }
      // Drop selected entries that no longer exist in fresh data
      var newSelected = {};
      for (var i = 0; i < (_data || []).length; i++) {
        var src = _data[i].source;
        if (_selected[src]) newSelected[src] = true;
      }
      _selected = newSelected;
      if (callback) callback();
    };
    xhr.onerror = function() {
      _loading = false; _loadAttempted = true; _data = []; _loadError = 'Error de red';
      _selected = {};
      if (callback) callback();
    };
    xhr.send();
  }

  // ── Page component contract ───────────────────────────────────────────────────

  function mount(container) {
    _container       = container;
    _plantaFilter    = 'all';
    _stateFilter     = 'all';
    _searchTerm      = '';
    _page            = 0;
    _selected        = {};
    _loadAttempted   = false;

    container.innerHTML =
      '<div class="mx60-alarms-shell">' +
        '<div class="equipment-page-wrap">' +
          '<div class="equipment-toolbar" id="alarmsToolbar"></div>' +
          '<div class="mx60-ackall-bar" id="alarmsAckAllBar"></div>' +
          '<div class="mx60-bulk-bar-host" id="alarmsBulkBarHost"></div>' +
          '<div class="equipment-content" id="alarmsContent"></div>' +
          '<div class="equipment-pagination" id="alarmsPagination"></div>' +
        '</div>' +
      '</div>';

    _toolbarEl    = container.querySelector('#alarmsToolbar');
    _ackAllBarEl  = container.querySelector('#alarmsAckAllBar');
    _bulkBarHost  = container.querySelector('#alarmsBulkBarHost');
    _gridEl       = container.querySelector('#alarmsContent');
    _paginationEl = container.querySelector('#alarmsPagination');

    if (MX60.BulkActionBar) _mountBulkBar();

    // SDD mx60-ackall-full-db-and-badge-no-filter: wire ack-all bar click
    _renderAckAllBar();
    _onAckAllClick = function(e) {
      var btn = e.target;
      if (!btn || !btn.getAttribute) return;
      if (btn.getAttribute('data-action') === 'ackall-history' && !btn.hasAttribute('disabled')) {
        _handleAckAllFullDb();
      }
    };
    _ackAllBarEl.addEventListener('click', _onAckAllClick, false);

    _renderAll();

    _onTabClick = function(e) {
      // CSV button
      var csvBtn = e.target;
      while (csvBtn && csvBtn !== _toolbarEl &&
             !(csvBtn.getAttribute && csvBtn.getAttribute('data-action') === 'csv-export')) {
        csvBtn = csvBtn.parentNode;
      }
      if (csvBtn && csvBtn !== _toolbarEl &&
          csvBtn.getAttribute && csvBtn.getAttribute('data-action') === 'csv-export') {
        _handleCsvExport();
        return;
      }
      var btn = e.target;
      while (btn && btn !== _toolbarEl &&
             !(btn.classList && (btn.classList.contains('planta-tab') ||
                                 btn.classList.contains('type-tab')))) {
        btn = btn.parentNode;
      }
      if (!btn || !btn.getAttribute) return;
      if (btn.classList.contains('planta-tab')) {
        var pid = btn.getAttribute('data-planta');
        if (pid == null) return;
        _plantaFilter = (pid === 'all') ? 'all' : parseInt(pid, 10);
        _page = 0; _renderAll(); return;
      }
      if (btn.classList.contains('type-tab')) {
        var st = btn.getAttribute('data-state');
        if (st == null) return;
        _stateFilter = st;
        _page = 0; _renderAll();
      }
    };
    _toolbarEl.addEventListener('click', _onTabClick, false);

    _onSearchInput = function(e) {
      var input = e.target;
      if (!input || input.id !== 'alarmsSearch') return;
      _searchTerm = input.value || '';
      _page = 0;
      _renderGrid();
      _renderPagination();
    };
    _toolbarEl.addEventListener('input', _onSearchInput, false);

    _onCardClick = function(e) {
      // Bulk-checkbox click on card
      var cb = e.target;
      if (cb && cb.tagName === 'INPUT' && cb.classList && cb.classList.contains('mx60-bulk-checkbox')) {
        var src = cb.getAttribute('data-source');
        if (src) {
          if (cb.checked) _selected[src] = true;
          else delete _selected[src];
          _updateBulkBar();
        }
        e.stopPropagation();
        return;
      }
      var card = e.target;
      while (card && card !== _gridEl &&
             !(card.classList && card.classList.contains('equipment-card'))) {
        card = card.parentNode;
      }
      if (!card || !card.getAttribute) return;
      var srcAttr = card.getAttribute('data-source');
      if (srcAttr && MX60.Router) {
        MX60.Router.navigate('#alarms/' + encodeURIComponent(srcAttr));
      }
    };
    _gridEl.addEventListener('click', _onCardClick, false);

    _onPagClick = function(e) {
      var btn = e.target;
      while (btn && btn !== _paginationEl && btn.tagName !== 'BUTTON') btn = btn.parentNode;
      if (!btn || !btn.getAttribute) return;
      if (btn.hasAttribute('disabled')) return;
      var dir = btn.getAttribute('data-page');
      if (dir === 'prev') _page = Math.max(0, _page - 1);
      else if (dir === 'next') _page = _page + 1;
      _renderGrid(); _renderPagination();
    };
    _paginationEl.addEventListener('click', _onPagClick, false);

    _fetch(function() { _renderAll(); });

    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(function() {
      _fetch(function() { _refreshGridGranular(); });
    }, REFRESH_INTERVAL);
  }

  function destroy() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_bulkBar && typeof _bulkBar.destroy === 'function') { _bulkBar.destroy(); _bulkBar = null; }
    if (_toolbarEl) {
      if (_onTabClick)    _toolbarEl.removeEventListener('click', _onTabClick, false);
      if (_onSearchInput) _toolbarEl.removeEventListener('input', _onSearchInput, false);
    }
    if (_gridEl && _onCardClick)         _gridEl.removeEventListener('click', _onCardClick, false);
    if (_paginationEl && _onPagClick)    _paginationEl.removeEventListener('click', _onPagClick, false);
    if (MX60.TimeRangePicker && MX60.TimeRangePicker.removeListener) {
      MX60.TimeRangePicker.removeListener(null);
    }
    // SDD mx60-ackall-full-db-and-badge-no-filter: clean up ack-all bar listener
    if (_ackAllBarEl && _onAckAllClick) {
      _ackAllBarEl.removeEventListener('click', _onAckAllClick, false);
    }
    _ackAllBarEl   = null;
    _onAckAllClick = null;

    if (_container) _container.innerHTML = '';
    _container = _toolbarEl = _gridEl = _paginationEl = _searchInput = _bulkBarHost = null;
    _onTabClick = _onSearchInput = _onCardClick = _onPagClick = null;
    _selected = {};
  }

  MX60.AlarmsPage = { mount: mount, destroy: destroy };

  window.MX60 = MX60;

  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('alarms', MX60.AlarmsPage);
  }

})(window);
