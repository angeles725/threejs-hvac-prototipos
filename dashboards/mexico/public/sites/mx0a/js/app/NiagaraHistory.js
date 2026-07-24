/**
 * NiagaraHistory.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Dual-view history explorer:
 *   List View  — card grid with search, click to open chart
 *   Chart View — full chart with range buttons, back to list
 *
 * API endpoints used:
 *   GET /snls/api/history/list              — enumerate station histories
 *   GET /snls/api/history/data?id=X&range=Y — time query returning [ts, value] pairs
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  var _histories = [];
  var _currentHistoryId = '';
  var _currentRange = 'lastHour';
  var _chartInstance = null;
  var _loading = false;
  var _viewMode = 'list';
  var _searchTerm = '';
  var _containerId = '';
  var _histPage = 0;
  var _histPageSize = 32; // 4 columns × 8 rows

  var RANGES = [
    { key: 'lastHour',    label: '1h' },
    { key: 'last8Hours',  label: '8h' },
    { key: 'today',       label: 'Hoy' },
    { key: 'last24Hours', label: '24h' },
    { key: 'yesterday',   label: 'Ayer' },
    { key: 'last7Days',   label: '7d' },
    { key: 'last30Days',  label: '30d' },
    { key: 'monthToDate', label: 'Mes' }
  ];

  // -----------------------------------------------------------------------
  // loadHistoryList — fetch available histories from Niagara
  // -----------------------------------------------------------------------

  function loadHistoryList(callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.historyList) return;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.historyList, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          _histories = resp.histories || [];
          if (callback) callback(_histories);
        } catch (e) {}
      }
    };
    xhr.send();
  }

  // -----------------------------------------------------------------------
  // loadHistoryData — fetch data points for a specific history + range
  // -----------------------------------------------------------------------

  function loadHistoryData(historyId, range, callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.historyData) return;
    if (_loading) return;

    _loading = true;
    var url = cfg.api.historyData + '?id=' + encodeURIComponent(historyId) +
              '&range=' + encodeURIComponent(range);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        _loading = false;
        if (xhr.status === 200) {
          try {
            var resp = JSON.parse(xhr.responseText);
            if (callback) callback(resp);
          } catch (e) {}
        }
      }
    };
    xhr.send();
  }

  // -----------------------------------------------------------------------
  // render — main entry point, called by DashboardApp
  // -----------------------------------------------------------------------

  function render(containerId) {
    _containerId = containerId;

    var hashParams = SNLS.Router && SNLS.Router.getHashParams
                   ? SNLS.Router.getHashParams() : {};

    if (!_histories.length) {
      // First load — show loading state
      var c = document.getElementById(_containerId);
      if (c) {
        c.innerHTML = '<div class="empty-state-enhanced"><p>Cargando historiales...</p></div>';
      }
      loadHistoryList(function() {
        if (hashParams.id) {
          _currentHistoryId = hashParams.id;
          _viewMode = 'chart';
        }
        _renderView();
      });
    } else {
      // Already loaded — check for deep link
      if (hashParams.id && hashParams.id !== _currentHistoryId) {
        _currentHistoryId = hashParams.id;
        _viewMode = 'chart';
      }
      _renderView();
    }
  }

  // -----------------------------------------------------------------------
  // _renderView — dispatch to list or chart
  // -----------------------------------------------------------------------

  function _renderView() {
    if (_viewMode === 'chart' && _currentHistoryId) {
      _renderChartView();
    } else {
      _renderListView();
    }
  }

  // -----------------------------------------------------------------------
  // List View — card grid with search
  // -----------------------------------------------------------------------

  function _renderListView() {
    var container = document.getElementById(_containerId);
    if (!container) return;

    var filtered = _getFilteredHistories();
    var ic = (SNLS.Icons && SNLS.Icons.get) ? SNLS.Icons.get : function() { return ''; };

    var html = '<div class="history-toolbar">' +
      '<div class="history-search-wrap">' +
        ic('search', 16) +
        '<input type="text" class="history-search-input" ' +
          'placeholder="Buscar historial por nombre o unidad..." ' +
          'value="' + _escAttr(_searchTerm) + '" ' +
          'oninput="window.SNLS.NiagaraHistory._onSearch(this.value)" />' +
      '</div>' +
      '<div class="history-count-badge">' + filtered.length + ' de ' + _histories.length + '</div>' +
    '</div>';

    if (filtered.length === 0) {
      html += '<div class="empty-state-enhanced">' +
        '<p>' + (_searchTerm ? 'Sin resultados para "' + _escHtml(_searchTerm) + '"' : 'No hay historiales disponibles') + '</p>' +
      '</div>';
    } else {
      var totalPages = Math.ceil(filtered.length / _histPageSize);
      if (_histPage >= totalPages) _histPage = Math.max(0, totalPages - 1);
      var start = _histPage * _histPageSize;
      var end = Math.min(start + _histPageSize, filtered.length);

      html += '<div class="history-card-grid">';
      for (var i = start; i < end; i++) {
        html += _buildHistoryCard(filtered[i]);
      }
      html += '</div>';

      if (totalPages > 1) {
        html += '<div class="pagination-bar">' +
          '<button class="pagination-btn" onclick="window.SNLS.NiagaraHistory._setPage(' + (_histPage - 1) + ')"' +
            (_histPage === 0 ? ' disabled' : '') + '>&laquo; Anterior</button>' +
          '<span class="pagination-info">Pagina ' + (_histPage + 1) + ' de ' + totalPages + '</span>' +
          '<button class="pagination-btn" onclick="window.SNLS.NiagaraHistory._setPage(' + (_histPage + 1) + ')"' +
            (_histPage >= totalPages - 1 ? ' disabled' : '') + '>Siguiente &raquo;</button>' +
        '</div>';
      }
    }

    container.innerHTML = html;
  }

  function _buildHistoryCard(h) {
    var ic = (SNLS.Icons && SNLS.Icons.get) ? SNLS.Icons.get : function() { return ''; };
    var name = _escHtml(h.name || h.id);
    var units = h.units ? _escHtml(h.units) : '';
    var pointCount = h.pointCount || h.recordCount || '';

    return '<div class="history-card" onclick="window.SNLS.NiagaraHistory.selectHistory(\'' + _escJs(h.id) + '\')">' +
      '<div class="history-card-icon">' + ic('activity', 24) + '</div>' +
      '<div class="history-card-info">' +
        '<div class="history-card-name">' + name + '</div>' +
        (units ? '<div class="history-card-units">' + units + '</div>' : '') +
        (pointCount ? '<div class="history-card-meta">' + pointCount + ' registros</div>' : '') +
      '</div>' +
      '<div class="history-card-arrow">' + ic('chevronRight', 16) + '</div>' +
    '</div>';
  }

  function _getFilteredHistories() {
    if (!_searchTerm) return _histories;
    var term = _searchTerm.toLowerCase();
    var result = [];
    for (var i = 0; i < _histories.length; i++) {
      var h = _histories[i];
      var name = (h.name || h.id || '').toLowerCase();
      var units = (h.units || '').toLowerCase();
      if (name.indexOf(term) >= 0 || units.indexOf(term) >= 0) {
        result.push(h);
      }
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // selectHistory — card click → chart view
  // -----------------------------------------------------------------------

  function selectHistory(id) {
    _currentHistoryId = id;
    _currentRange = 'lastHour';
    _viewMode = 'chart';
    _renderChartView();
  }

  // -----------------------------------------------------------------------
  // backToList — return to grid
  // -----------------------------------------------------------------------

  function backToList() {
    _viewMode = 'list';
    destroyChart();
    _renderListView();
  }

  // -----------------------------------------------------------------------
  // Chart View — full chart with range buttons
  // -----------------------------------------------------------------------

  function _renderChartView() {
    var container = document.getElementById(_containerId);
    if (!container) return;

    var history = _findHistory(_currentHistoryId);
    var title = history ? (history.name || history.id) : _currentHistoryId;
    var units = history ? (history.units || '') : '';

    var html = '<div class="history-chart-header">' +
      '<button class="history-back-btn" onclick="window.SNLS.NiagaraHistory.backToList()">' +
        '&larr; Volver' +
      '</button>' +
      '<div class="history-chart-title">' + _escHtml(title) +
        (units ? ' <span class="history-chart-units">(' + _escHtml(units) + ')</span>' : '') +
      '</div>' +
    '</div>';

    html += '<div class="history-range-bar" id="nh-range-bar"></div>';

    html += '<div class="chart-container" style="height:380px; margin-top:16px;">' +
      '<div class="chart-canvas-wrap" style="height:100%;">' +
        '<canvas id="niagara-history-chart"></canvas>' +
      '</div>' +
    '</div>';

    container.innerHTML = html;

    // Render range buttons
    _renderRangeButtons('nh-range-bar');

    // Load data
    loadHistoryData(_currentHistoryId, _currentRange, function(resp) {
      _renderChart('niagara-history-chart', resp);
    });
  }

  function _findHistory(id) {
    for (var i = 0; i < _histories.length; i++) {
      if (_histories[i].id === id) return _histories[i];
    }
    return null;
  }

  // -----------------------------------------------------------------------
  // renderRangeButtons
  // -----------------------------------------------------------------------

  function _renderRangeButtons(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '';
    for (var i = 0; i < RANGES.length; i++) {
      var r = RANGES[i];
      var active = r.key === _currentRange ? ' active' : '';
      html += '<button class="history-range-btn' + active + '" ' +
              'data-range="' + r.key + '" ' +
              'onclick="window.SNLS.NiagaraHistory.setHistoryRange(\'' + r.key + '\')">' +
              r.label + '</button>';
    }
    container.innerHTML = html;
  }

  // -----------------------------------------------------------------------
  // renderChart — create or update Chart.js time-series chart
  // -----------------------------------------------------------------------

  function _renderChart(canvasId, historyData) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    var data = historyData.data || [];
    var labels = [];
    var values = [];

    for (var i = 0; i < data.length; i++) {
      labels.push(new Date(data[i][0]));
      values.push(data[i][1]);
    }

    var title = historyData.title || '';
    var units = historyData.units || '';

    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    var ctx = canvas.getContext('2d');

    _chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: title + (units ? ' (' + units + ')' : ''),
          data: values,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0, 212, 170, 0.08)',
          borderWidth: 2,
          pointRadius: data.length > 200 ? 0 : 2,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            type: 'time',
            time: {
              tooltipFormat: 'dd/MM HH:mm',
              displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'dd/MM'
              }
            },
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              color: '#94a3b8',
              maxTicksLimit: 10
            }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              color: '#94a3b8'
            },
            title: {
              display: !!units,
              text: units,
              font: { size: 11 },
              color: '#94a3b8'
            }
          }
        },
        plugins: {
          legend: {
            labels: {
              font: { family: "'Inter', sans-serif", size: 12 },
              color: '#e2e8f0',
              boxWidth: 14
            }
          },
          tooltip: {
            backgroundColor: 'rgba(6, 8, 13, 0.9)',
            titleFont: { family: "'Inter', sans-serif" },
            bodyFont: { family: "'JetBrains Mono', monospace" }
          }
        }
      }
    });
  }

  // -----------------------------------------------------------------------
  // setHistoryRange — change current range and reload data
  // -----------------------------------------------------------------------

  function setHistoryRange(range) {
    _currentRange = range;

    // Update active button state
    var btns = document.querySelectorAll('#nh-range-bar .history-range-btn');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-range') === range) {
        btns[i].classList.add('active');
      } else {
        btns[i].classList.remove('active');
      }
    }

    if (_currentHistoryId) {
      loadHistoryData(_currentHistoryId, _currentRange, function(resp) {
        _renderChart('niagara-history-chart', resp);
      });
    }
  }

  // -----------------------------------------------------------------------
  // destroyChart
  // -----------------------------------------------------------------------

  function destroyChart() {
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }
  }

  // -----------------------------------------------------------------------
  // Escape helpers
  // -----------------------------------------------------------------------

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function _escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }
  function _escJs(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // -----------------------------------------------------------------------
  // Expose globals for onclick
  // -----------------------------------------------------------------------

  window.SNLS = window.SNLS || {};
  window.SNLS.setHistoryRange = setHistoryRange;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  SNLS.NiagaraHistory = {
    render: render,
    selectHistory: selectHistory,
    backToList: backToList,
    loadHistoryList: loadHistoryList,
    loadHistoryData: loadHistoryData,
    setHistoryRange: setHistoryRange,
    destroyChart: destroyChart,
    getHistories: function() { return _histories; },
    getCurrentId: function() { return _currentHistoryId; },
    getCurrentRange: function() { return _currentRange; },
    _onSearch: function(val) { _searchTerm = val; _histPage = 0; _renderListView(); },
    _setPage: function(p) { _histPage = Math.max(0, p); _renderListView(); }
  };

  window.SNLS = SNLS;

})(window);
