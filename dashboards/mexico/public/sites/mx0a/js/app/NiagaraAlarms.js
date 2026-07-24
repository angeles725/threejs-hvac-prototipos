/**
 * NiagaraAlarms.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Queries the Niagara BAlarmDatabase through the servlet REST API.
 * Provides alarm listing with pagination, filtering, and count polling.
 *
 * API endpoints used:
 *   GET /snls/api/alarms?range=X&ackState=Y&page=N — paginated alarm list
 *   GET /snls/api/alarms/counts                     — active/unacked counts
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  var _alarms = [];
  var _total = 0;
  var _currentPage = 0;
  var _pageSize = 15;
  var _currentRange = 'today';
  var _currentAckState = '';
  var _counts = { active: 0, unacked: 0 };
  var _countTimer = null;

  // -----------------------------------------------------------------------
  // fetchAlarms — load alarm page from Niagara
  // -----------------------------------------------------------------------

  function fetchAlarms(callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.alarms) return;

    var url = cfg.api.alarms + '?range=' + encodeURIComponent(_currentRange) +
              '&page=' + _currentPage;
    if (_currentAckState) {
      url += '&ackState=' + encodeURIComponent(_currentAckState);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          _alarms = resp.records || [];
          _total = resp.total || 0;
          _pageSize = resp.pageSize || 15;
          if (callback) callback();
        } catch (e) {}
      }
    };
    xhr.send();
  }

  // -----------------------------------------------------------------------
  // fetchCounts — quick count poll (every 30s)
  // -----------------------------------------------------------------------

  function fetchCounts(callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.alarmCounts) return;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.alarmCounts, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          _counts = JSON.parse(xhr.responseText);
          if (callback) callback(_counts);
        } catch (e) {}
      }
    };
    xhr.send();
  }

  // -----------------------------------------------------------------------
  // startCountPolling / stopCountPolling
  // -----------------------------------------------------------------------

  function startCountPolling(callback) {
    stopCountPolling();
    fetchCounts(callback);
    _countTimer = setInterval(function() {
      fetchCounts(callback);
    }, 20000);
  }

  function stopCountPolling() {
    if (_countTimer) {
      clearInterval(_countTimer);
      _countTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // renderAlarmTable — draw the Niagara alarm table into a container
  // -----------------------------------------------------------------------

  function renderAlarmTable(tbodyId) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    var ic = (SNLS.Icons && SNLS.Icons.get)
      ? SNLS.Icons.get
      : function() { return ''; };

    if (_alarms.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6">' +
          '<div class="empty-state-enhanced">' +
            ic('shieldCheck', 48) +
            '<p>Sin alarmas del sistema en este rango</p>' +
          '</div>' +
        '</td></tr>';
      return;
    }

    var html = '';
    for (var i = 0; i < _alarms.length; i++) {
      var a = _alarms[i];
      var ts = new Date(a.timestamp);
      var timeStr = ts.toLocaleString('es-MX', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      var prioClass = a.priority <= 1 ? 'critical' : 'warning';
      var prioLabel = a.priority <= 1 ? 'Critica' : (a.priority <= 3 ? 'Alta' : 'Normal');

      var source = a.source || '';
      // Extract last path segment (after last / or |)
      var lastSep = Math.max(source.lastIndexOf('/'), source.lastIndexOf('|'));
      var shortSource = lastSep >= 0 ? source.substring(lastSep + 1) : source;
      // Decode Niagara slot path encoding ($XX → %XX → decodeURIComponent)
      shortSource = shortSource.replace(/\$([0-9a-fA-F]{2})/g, '%$1');
      try { shortSource = decodeURIComponent(shortSource); } catch (e) {}

      var stateLabel = a.sourceState === 'normal' ? 'Normal' :
                       a.sourceState === 'offnormal' ? 'Off-Normal' : a.sourceState;
      var ackLabel = a.ackState === 'acked' ? 'ACK' :
                     a.ackState === 'ackPending' ? 'Pendiente' : a.ackState;

      var rowClass = a.ackState === 'acked' ? ' class="alarm-row-ack"' : '';

      var ackCell = '';
      if (a.ackState === 'acked') {
        ackCell = '<span class="badge badge-info">ACK</span>';
      } else {
        ackCell = '<button class="alarm-ack-btn" onclick="window.SNLS.ackNiagaraAlarm(\'' +
          _escJs(a.uuid) + '\')">' + 'Reconocer</button>';
      }

      html +=
        '<tr' + rowClass + '>' +
          '<td><span class="alarm-severity ' + prioClass + '"></span>' + prioLabel + '</td>' +
          '<td><strong>' + _esc(shortSource) + '</strong></td>' +
          '<td>' + _esc(stateLabel) + '</td>' +
          '<td>' + _esc(a.msgText || '') + '</td>' +
          '<td class="mono text-sm">' + timeStr + '</td>' +
          '<td>' + ackCell + '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
  }

  // -----------------------------------------------------------------------
  // renderPagination — draw page controls
  // -----------------------------------------------------------------------

  function renderPagination(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var totalPages = Math.ceil(_total / _pageSize);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    var html = '<div class="niagara-pagination">';
    html += '<button class="pagination-btn" ' +
            (_currentPage <= 0 ? 'disabled' : '') +
            ' onclick="window.SNLS.niagaraAlarmPage(' + (_currentPage - 1) + ')">' +
            '&laquo; Anterior</button>';
    html += '<span class="pagination-info">P\u00e1gina ' + (_currentPage + 1) + ' de ' + totalPages +
            ' (' + _total + ' registros)</span>';
    html += '<button class="pagination-btn" ' +
            (_currentPage >= totalPages - 1 ? 'disabled' : '') +
            ' onclick="window.SNLS.niagaraAlarmPage(' + (_currentPage + 1) + ')">' +
            'Siguiente &raquo;</button>';
    html += '</div>';
    container.innerHTML = html;
  }

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  function setPage(page) {
    _currentPage = Math.max(0, page);
    fetchAlarms(function() {
      renderAlarmTable('niagara-alarms-tbody');
      renderPagination('niagara-alarms-pagination');
    });
  }

  function setRange(range) {
    _currentRange = range;
    _currentPage = 0;
    fetchAlarms(function() {
      renderAlarmTable('niagara-alarms-tbody');
      renderPagination('niagara-alarms-pagination');
    });
  }

  function setAckFilter(state) {
    _currentAckState = state;
    _currentPage = 0;
    fetchAlarms(function() {
      renderAlarmTable('niagara-alarms-tbody');
      renderPagination('niagara-alarms-pagination');
    });
  }

  // -----------------------------------------------------------------------
  // ackAlarm — acknowledge a single alarm via BajaScript AlarmSpace
  // Uses the native Niagara API: alarm:.ackAlarms({ids: [uuid]})
  // -----------------------------------------------------------------------

  function ackAlarm(uuid) {
    if (typeof require !== 'function') return;

    require(['baja!'], function(baja) {
      baja.Ord.make('alarm:').get().then(function(alarmDb) {
        return alarmDb.ackAlarms({ ids: [uuid] });
      }).then(function() {
        _refreshTable();
      });
    });
  }

  // -----------------------------------------------------------------------
  // ackAllAlarms — acknowledge all unacked alarms via BajaScript
  // -----------------------------------------------------------------------

  function ackAllAlarms() {
    if (typeof require !== 'function') return;

    // Collect all unacked UUIDs from current table
    var ids = [];
    for (var i = 0; i < _alarms.length; i++) {
      if (_alarms[i].ackState !== 'acked' && _alarms[i].uuid) {
        ids.push(_alarms[i].uuid);
      }
    }

    if (ids.length === 0) return;

    require(['baja!'], function(baja) {
      baja.Ord.make('alarm:').get().then(function(alarmDb) {
        return alarmDb.ackAlarms({ ids: ids });
      }).then(function() {
        _refreshTable();
      });
    });
  }

  function _refreshTable() {
    fetchAlarms(function() {
      renderAlarmTable('niagara-alarms-tbody');
      renderPagination('niagara-alarms-pagination');
    });
  }

  // -----------------------------------------------------------------------
  // _esc — simple HTML escape
  // -----------------------------------------------------------------------

  function _esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _escJs(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  // -----------------------------------------------------------------------
  // Expose globals for onclick
  // -----------------------------------------------------------------------

  window.SNLS = window.SNLS || {};
  window.SNLS.niagaraAlarmPage = setPage;
  window.SNLS.setNiagaraAlarmRange = setRange;
  window.SNLS.ackNiagaraAlarm = ackAlarm;
  window.SNLS.ackAllNiagaraAlarms = ackAllAlarms;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  SNLS.NiagaraAlarms = {
    fetchAlarms: fetchAlarms,
    fetchCounts: fetchCounts,
    startCountPolling: startCountPolling,
    stopCountPolling: stopCountPolling,
    renderAlarmTable: renderAlarmTable,
    renderPagination: renderPagination,
    setPage: setPage,
    setRange: setRange,
    setAckFilter: setAckFilter,
    ackAlarm: ackAlarm,
    ackAllAlarms: ackAllAlarms,
    getCounts: function() { return _counts; }
  };

  window.SNLS = SNLS;

})(window);
