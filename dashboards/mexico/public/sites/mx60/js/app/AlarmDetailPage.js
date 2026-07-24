/**
 * MX60.AlarmDetailPage
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Dedicated alarm-source page (#alarms/<encodedOrd>).
 *
 * SDD-A: created with breadcrumb + paginated AlarmDetailsTable + per-row popover.
 * SDD-B: extended with row checkboxes (withCheckbox), bulk action bar,
 *        CSV export, and Confirm-wrapped row Acknowledge.
 *
 * Page component contract: { mount(container, route), destroy() }
 * Registered as: MX60.DashboardApp.registerPage('alarm-detail', MX60.AlarmDetailPage).
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var REFRESH_INTERVAL = 20000;
  var PAGE_SIZE = 15;

  var _container      = null;
  var _sourceOrd      = null;
  var _data           = null;
  var _loading        = false;
  var _loadAttempted  = false;
  var _loadError      = null;

  var _breadcrumbEl   = null;
  var _pickerSlot     = null;
  var _csvBtnSlot     = null;
  var _tableEl        = null;
  var _tableContainer = null;
  var _paginationEl   = null;
  var _bulkBarHost    = null;
  var _bulkBar        = null;

  var _selectedRows   = []; // current selection (subset of _data, kept fresh on selection change)
  var _page           = 0;
  var _pollTimer      = null;
  var _onPagClick     = null;
  var _onCsvClick     = null;
  var _onBreadcrumbClick = null;
  var _pickerCb       = null;
  var _onRowAction    = null;
  var _onSelectionChange = null;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  function _getConfig() {
    return (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
  }

  function _detailUrl() {
    var cfg = _getConfig();
    var range = MX60.TimeRangePicker ? MX60.TimeRangePicker.getSelected() : 'today';
    var base  = (cfg.api && cfg.api.alarmSource) || '/mx60/api/alarms/source';
    return base +
      '?ord='   + encodeURIComponent(_sourceOrd || '') +
      '&range=' + encodeURIComponent(range);
  }

  function _totalPages(count) { return Math.max(1, Math.ceil(count / PAGE_SIZE)); }

  function _slicePage(list) {
    var total = _totalPages(list.length);
    if (_page >= total) _page = total - 1;
    if (_page < 0) _page = 0;
    var start = _page * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function _renderBreadcrumb() {
    if (!_breadcrumbEl) return;
    var shortSrc = _shortSource(_sourceOrd);
    _breadcrumbEl.innerHTML =
      '<a href="#alarms" class="breadcrumb-link" data-action="back">Consola de Alarmas</a>' +
      '<span class="breadcrumb-separator" aria-hidden="true">/</span>' +
      '<span class="breadcrumb-current" title="' + _esc(_sourceOrd || '') + '">' +
        _esc(shortSrc) +
      '</span>';
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

  function _renderTable() {
    if (!_tableContainer) return;
    if (!_data && !_loadAttempted) {
      _tableContainer.innerHTML = '<div class="empty-state-enhanced"><p>Cargando registros...</p></div>';
      return;
    }
    if (_loadError) {
      _tableContainer.innerHTML =
        '<div class="empty-state-enhanced"><p>No se pudieron cargar los registros (' +
        _esc(_loadError) + ').</p></div>';
      return;
    }
    var rows = _data || [];
    var pageRows = _slicePage(rows);

    if (!_tableEl) {
      _tableContainer.innerHTML = '';
      _tableEl = MX60.AlarmDetailsTable.render(_tableContainer, pageRows, { withCheckbox: true });
      if (typeof MX60.AlarmDetailsTable.onRowAction === 'function') {
        _onRowAction = function(payload) { _handleRowAction(payload); };
        MX60.AlarmDetailsTable.onRowAction(_onRowAction);
      }
      if (typeof MX60.AlarmDetailsTable.onSelectionChange === 'function') {
        _onSelectionChange = function(rowsSelected) {
          _selectedRows = rowsSelected || [];
          _updateBulkBar();
        };
        MX60.AlarmDetailsTable.onSelectionChange(_onSelectionChange);
      }
    } else {
      MX60.AlarmDetailsTable.update(_tableEl, pageRows);
      // Keep selection consistent — table.update prunes invalid indices.
      _selectedRows = MX60.AlarmDetailsTable.getSelected
        ? MX60.AlarmDetailsTable.getSelected(_tableEl) : [];
      _updateBulkBar();
    }
  }

  function _renderPagination() {
    if (!_paginationEl) return;
    var rows = _data || [];
    var total = _totalPages(rows.length);
    if (total <= 1) { _paginationEl.innerHTML = ''; return; }
    _paginationEl.innerHTML =
      '<button type="button" class="pag-btn" data-page="prev"' +
        (_page === 0 ? ' disabled' : '') + '>&#x2039; Anterior</button>' +
      '<span class="pag-info">Página <strong>' + (_page + 1) + '</strong> de ' + total +
        ' &middot; <span class="pag-count">' + rows.length + ' alarmas</span></span>' +
      '<button type="button" class="pag-btn" data-page="next"' +
        (_page >= total - 1 ? ' disabled' : '') + '>Siguiente &#x203A;</button>';
  }

  function _renderAll() {
    _renderBreadcrumb();
    _renderTable();
    _renderPagination();
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
        return { selected: _selectedRows.length, alarms: _selectedRows.length };
      },
      getActions: function() {
        var disabled = (_selectedRows.length === 0);
        return [
          { id: 'ackSelected', label: 'Reconocer seleccionadas', disabled: disabled, tone: 'danger' }
        ];
      },
      onAction: function(actionId) {
        if (actionId === 'ackSelected') _handleBulkAck();
      },
      onClear: function() {
        _selectedRows = [];
        // Re-render to clear all checkboxes
        _renderTable();
      },
      formatText: function(c) { return c.selected + ' alarma(s) seleccionada(s)'; }
    });
  }

  function _handleBulkAck() {
    console.info('[AlarmDetailPage] _handleBulkAck rows=' + _selectedRows.length);
    if (_selectedRows.length === 0) return;
    var uuids = [];
    for (var i = 0; i < _selectedRows.length; i++) {
      if (_selectedRows[i].uuid) uuids.push(_selectedRows[i].uuid);
    }
    console.info('[AlarmDetailPage] _handleBulkAck collected uuids=' + uuids.length);
    if (uuids.length === 0) {
      console.warn('[AlarmDetailPage] selected rows have no uuid');
      return;
    }

    if (MX60.Confirm && typeof MX60.Confirm.show === 'function') {
      console.info('[AlarmDetailPage] opening Confirm modal for bulk ack');
      MX60.Confirm.show({
        title: 'Reconocer alarmas',
        message: '¿Reconocer ' + uuids.length + ' alarma(s)?',
        confirmLabel: 'Reconocer',
        cancelLabel:  'Cancelar',
        tone: 'danger',
        onConfirm: function() {
          console.info('[AlarmDetailPage] Confirm onConfirm fired — dispatching ackAlarms uuids=' + uuids.length);
          if (MX60.AlarmsManager && typeof MX60.AlarmsManager.ackAlarms === 'function') {
            MX60.AlarmsManager.ackAlarms(uuids, '', {
              // C-6 [Spec S-2d]: widen to 2-arg (r, meta) — surface partial-fail warning toast
              onSuccess: function(r, meta) {
                console.info('[AlarmDetailPage] ackAlarms onSuccess:', r);
                if (meta && meta.partial && r.failedCount > 0) {
                  var total = r.ackedCount + r.failedCount;
                  var errDetail = (r.errors && r.errors[0]) || 'fallo parcial';
                  if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
                    MX60.Toast.warn(r.ackedCount + ' de ' + total + ' reconocidas — ' + errDetail);
                  }
                }
              },
              onError:   function(s) { console.error('[AlarmDetailPage] ackAlarms onError status=' + s); }
            });
          } else {
            console.error('[AlarmDetailPage] MX60.AlarmsManager.ackAlarms not available!');
          }
          _selectedRows = [];
          setTimeout(function() {
            _loadAttempted = false;
            _fetch(function() { _renderAll(); });
          }, 600);
        }
      });
    } else {
      console.error('[AlarmDetailPage] MX60.Confirm not available!');
    }
  }

  // ── Row actions ───────────────────────────────────────────────────────────────

  function _handleRowAction(payload) {
    if (!payload || !payload.row) return;
    var row = payload.row;
    if (payload.kind === 'ack') {
      // Wrap single-row ack in Confirm modal (REQ-B6).
      console.info('[AlarmDetailPage] row ack requested uuid=' + (row.uuid || '(empty)'));
      if (!row.uuid) {
        console.warn('[AlarmDetailPage] row has no uuid — abortando ack');
        if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
          MX60.Toast.warn('Esta alarma no tiene UUID — no se puede reconocer');
        }
        return;
      }
      if (MX60.Confirm && typeof MX60.Confirm.show === 'function') {
        console.info('[AlarmDetailPage] opening Confirm modal for single ack');
        MX60.Confirm.show({
          title: 'Reconocer alarma',
          message: '¿Reconocer esta alarma?',
          confirmLabel: 'Reconocer',
          cancelLabel:  'Cancelar',
          tone: 'danger',
          onConfirm: function() {
            console.info('[AlarmDetailPage] Confirm onConfirm fired — dispatching ackAlarms uuid=' + row.uuid);
            if (MX60.AlarmsManager && typeof MX60.AlarmsManager.ackAlarms === 'function') {
              MX60.AlarmsManager.ackAlarms([row.uuid], '', {
                // C-7 [Spec S-2d]: widen to 2-arg (r, meta) — surface partial-fail warning toast
                onSuccess: function(r, meta) {
                  console.info('[AlarmDetailPage] ackAlarms onSuccess:', r);
                  if (meta && meta.partial && r.failedCount > 0) {
                    var total = r.ackedCount + r.failedCount;
                    var errDetail = (r.errors && r.errors[0]) || 'fallo parcial';
                    if (window.MX60 && MX60.Toast && typeof MX60.Toast.warn === 'function') {
                      MX60.Toast.warn(r.ackedCount + ' de ' + total + ' reconocidas — ' + errDetail);
                    }
                  }
                },
                onError:   function(s) { console.error('[AlarmDetailPage] ackAlarms onError status=' + s); }
              });
            } else {
              console.error('[AlarmDetailPage] MX60.AlarmsManager.ackAlarms not available!');
            }
            setTimeout(function() {
              _loadAttempted = false;
              _fetch(function() { _renderTable(); _renderPagination(); });
            }, 600);
          }
        });
      } else {
        console.error('[AlarmDetailPage] MX60.Confirm not available!');
      }
      return;
    }
    if (payload.kind === 'notes') {
      if (MX60.AlarmCards && typeof MX60.AlarmCards.open === 'function') {
        MX60.AlarmCards.open(row, [row], { initialTab: 'notas' });
      }
      return;
    }
    if (payload.kind === 'details') {
      if (MX60.AlarmCards && typeof MX60.AlarmCards.open === 'function') {
        MX60.AlarmCards.open(row, [row], { initialTab: 'tabla' });
      }
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────────

  function _handleCsvExport() {
    if (!MX60.util || !MX60.util.CsvExport) return;
    var rows = _data || [];
    var range = MX60.TimeRangePicker ? MX60.TimeRangePicker.getSelected() : 'today';
    var ts = MX60.util.CsvExport.timestamp();
    var srcShort = _shortSource(_sourceOrd).replace(/[^A-Za-z0-9_-]/g, '_');
    var filename = 'alarms-' + srcShort + '-' + range + '-' + ts + '.csv';

    var cols = [
      { header: 'Hora',           getValue: function(r) { return r.timestamp || ''; } },
      { header: 'Prioridad',      getValue: function(r) { return r.priority || ''; } },
      { header: 'EstadoFuente',   getValue: function(r) { return r.sourceState || ''; } },
      { header: 'Transicion',     getValue: function(r) { return r.alarmTransition || ''; } },
      { header: 'Reconocimiento', getValue: function(r) { return r.ackState || ''; } },
      { header: 'UltimaAct',      getValue: function(r) { return r.lastUpdate || ''; } },
      { header: 'Mensaje',        getValue: function(r) { return r.message || ''; } },
      { header: 'UUID',           getValue: function(r) { return r.uuid || ''; } }
    ];
    MX60.util.CsvExport.download(rows, cols, filename);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  function _fetch(callback) {
    if (_loading || !_sourceOrd) return;
    _loading = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', _detailUrl(), true);
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
      if (callback) callback();
    };
    xhr.onerror = function() {
      _loading = false; _loadAttempted = true;
      _data = []; _loadError = 'Error de red';
      if (callback) callback();
    };
    xhr.send();
  }

  // ── Page component contract ───────────────────────────────────────────────────

  function mount(container, route) {
    _container = container;
    _sourceOrd = (route && route.params && route.params[0]) || '';
    _data           = null;
    _loadAttempted  = false;
    _loadError      = null;
    _page           = 0;
    _tableEl        = null;
    _selectedRows   = [];

    container.innerHTML =
      '<div class="mx60-alarm-detail-page-wrap">' +
        '<div class="mx60-alarm-detail-header">' +
          '<div class="breadcrumb" id="alarmDetailBreadcrumb"></div>' +
          '<div class="mx60-alarm-detail-header-right">' +
            '<span data-csv-slot></span>' +
            '<div data-alarm-detail-time-picker></div>' +
          '</div>' +
        '</div>' +
        '<div class="mx60-bulk-bar-host" id="alarmDetailBulkBarHost"></div>' +
        '<div class="mx60-alarm-detail-body" id="alarmDetailTable"></div>' +
        '<div class="equipment-pagination" id="alarmDetailPagination"></div>' +
      '</div>';

    _breadcrumbEl   = container.querySelector('#alarmDetailBreadcrumb');
    _pickerSlot     = container.querySelector('[data-alarm-detail-time-picker]');
    _csvBtnSlot     = container.querySelector('[data-csv-slot]');
    _tableContainer = container.querySelector('#alarmDetailTable');
    _paginationEl   = container.querySelector('#alarmDetailPagination');
    _bulkBarHost    = container.querySelector('#alarmDetailBulkBarHost');

    if (_csvBtnSlot) _csvBtnSlot.innerHTML = _csvButtonHtml();

    if (_pickerSlot && MX60.TimeRangePicker) {
      MX60.TimeRangePicker.render(_pickerSlot);
      _pickerCb = function() {
        _loadAttempted = false; _page = 0;
        _fetch(function() { _renderAll(); });
      };
      MX60.TimeRangePicker.onChange(_pickerCb);
    }

    if (MX60.BulkActionBar) _mountBulkBar();

    _onPagClick = function(e) {
      var btn = e.target;
      while (btn && btn !== _paginationEl && btn.tagName !== 'BUTTON') btn = btn.parentNode;
      if (!btn || !btn.getAttribute) return;
      if (btn.hasAttribute('disabled')) return;
      var dir = btn.getAttribute('data-page');
      if (dir === 'prev') _page = Math.max(0, _page - 1);
      else if (dir === 'next') _page = _page + 1;
      _renderTable(); _renderPagination();
    };
    _paginationEl.addEventListener('click', _onPagClick, false);

    _onCsvClick = function(e) {
      var btn = e.target;
      while (btn && btn !== container &&
             !(btn.getAttribute && btn.getAttribute('data-action') === 'csv-export')) {
        btn = btn.parentNode;
      }
      if (btn && btn !== container &&
          btn.getAttribute && btn.getAttribute('data-action') === 'csv-export') {
        _handleCsvExport();
      }
    };
    if (_csvBtnSlot) _csvBtnSlot.addEventListener('click', _onCsvClick, false);

    _renderAll();
    _fetch(function() { _renderAll(); });

    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(function() {
      _fetch(function() { _renderTable(); _renderPagination(); });
    }, REFRESH_INTERVAL);
  }

  function destroy() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_paginationEl && _onPagClick) {
      _paginationEl.removeEventListener('click', _onPagClick, false);
    }
    if (_csvBtnSlot && _onCsvClick) {
      _csvBtnSlot.removeEventListener('click', _onCsvClick, false);
    }
    if (_bulkBar && typeof _bulkBar.destroy === 'function') { _bulkBar.destroy(); _bulkBar = null; }
    if (MX60.AlarmDetailsTable) {
      if (typeof MX60.AlarmDetailsTable.removeRowActionListener === 'function' && _onRowAction) {
        MX60.AlarmDetailsTable.removeRowActionListener(_onRowAction);
      }
      if (typeof MX60.AlarmDetailsTable.removeSelectionListener === 'function' && _onSelectionChange) {
        MX60.AlarmDetailsTable.removeSelectionListener(_onSelectionChange);
      }
    }
    if (MX60.TimeRangePicker && MX60.TimeRangePicker.removeListener) {
      MX60.TimeRangePicker.removeListener(_pickerCb);
    }
    if (MX60.AlarmCards && typeof MX60.AlarmCards.close === 'function') {
      MX60.AlarmCards.close();
    }
    if (_container) _container.innerHTML = '';
    _container = _breadcrumbEl = _pickerSlot = _csvBtnSlot = _tableEl =
      _tableContainer = _paginationEl = _bulkBarHost = null;
    _onPagClick = _onCsvClick = _onRowAction = _onSelectionChange = _pickerCb = null;
    _sourceOrd = null;
    _data = null;
    _selectedRows = [];
  }

  MX60.AlarmDetailPage = { mount: mount, destroy: destroy };

  window.MX60 = MX60;

  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('alarm-detail', MX60.AlarmDetailPage);
  }

})(window);
