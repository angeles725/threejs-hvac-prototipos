/**
 * ScheduleView.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Schedules page (#page-schedules). Auto-discovers all BWeeklySchedule
 * components via BQL and renders them as cards. Clicking a card opens
 * the native Niagara schedule editor in an iframe modal.
 *
 * API endpoint:
 *   GET /snls/api/schedules → JSON array of schedule objects
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  var _data = null;
  var _loading = false;
  var _schedPage = 0;
  var _schedPageSize = 32; // 4 columns × 8 rows

  // ---------------------------------------------------------------------------
  // _fetchSchedules — load all schedules from the station
  // ---------------------------------------------------------------------------

  function _fetchSchedules(callback) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.schedules) return;
    if (_loading) return;

    _loading = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.schedules, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        _loading = false;
        if (xhr.status === 200) {
          try {
            var parsed = JSON.parse(xhr.responseText);
            if (Array.isArray(parsed)) {
              _data = parsed;
            }
          } catch (e) {}
        }
        if (callback) callback(_data);
      }
    };
    xhr.send();
  }

  // ---------------------------------------------------------------------------
  // Escape helpers
  // ---------------------------------------------------------------------------

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _escAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // _getScheduleView — determine the correct Niagara view for the type
  // ---------------------------------------------------------------------------

  function _getScheduleView(type) {
    if (!type) return 'view:schedule:WebScheduler';
    if (type.indexOf('CalendarSchedule') >= 0) return 'view:schedule:WebCalendarScheduler';
    if (type.indexOf('TriggerSchedule') >= 0) return 'view:schedule:WebTriggerScheduler';
    return 'view:schedule:WebScheduler';
  }

  // ---------------------------------------------------------------------------
  // _buildScheduleCard — single schedule card
  // ---------------------------------------------------------------------------

  function _buildScheduleCard(item, index) {
    var name = item.displayName || item.name || 'Schedule';
    var parentName = (item.parent && item.parent.displayName) ? item.parent.displayName : '';
    var outValue = item.outValue || item.out || '—';
    var outStatus = item.outStatus || '';
    var isOk = outStatus.indexOf('ok') >= 0 || outStatus === '';
    var statusClass = isOk ? 'schedule-card-active' : '';
    var pillClass = isOk ? 'badge-ok' : 'badge-offline';
    var pillText = isOk ? 'OK' : outStatus.toUpperCase();

    var html =
      '<div class="schedule-card ' + statusClass + '" ' +
        'onclick="window.SNLS.ScheduleView.openEditor(' + index + ')" ' +
        'title="Click para editar">' +
        '<div class="schedule-card-head">' +
          '<div class="schedule-card-title">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
              'style="vertical-align:middle;margin-right:6px;">' +
              '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
              '<line x1="16" y1="2" x2="16" y2="6"/>' +
              '<line x1="8" y1="2" x2="8" y2="6"/>' +
              '<line x1="3" y1="10" x2="21" y2="10"/>' +
            '</svg>' +
            _escHtml(name) +
          '</div>' +
          '<span class="badge ' + pillClass + ' schedule-status-pill">' + pillText + '</span>' +
        '</div>' +
        (parentName ? '<div class="schedule-card-parent">' + _escHtml(parentName) + '</div>' : '') +
        '<div class="schedule-card-body">' +
          '<div class="schedule-card-row">' +
            '<span class="schedule-row-label">Valor</span>' +
            '<span class="schedule-row-value">' + _escHtml(outValue) + '</span>' +
          '</div>' +
          '<div class="schedule-card-row">' +
            '<span class="schedule-row-label">Tipo</span>' +
            '<span class="schedule-row-value schedule-type-tag">' + _escHtml(_shortType(item.type)) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="schedule-card-footer">' +
          '<span class="schedule-edit-hint">Editar horario</span>' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="9 18 15 12 9 6"/>' +
          '</svg>' +
        '</div>' +
      '</div>';

    return html;
  }

  function _shortType(type) {
    if (!type) return '—';
    if (type.indexOf('Numeric') >= 0) return 'Numeric';
    if (type.indexOf('Boolean') >= 0) return 'Boolean';
    if (type.indexOf('Enum') >= 0) return 'Enum';
    if (type.indexOf('String') >= 0) return 'String';
    if (type.indexOf('Calendar') >= 0) return 'Calendar';
    if (type.indexOf('Trigger') >= 0) return 'Trigger';
    if (type.indexOf('Weekly') >= 0) return 'Weekly';
    return 'Schedule';
  }

  // ---------------------------------------------------------------------------
  // render — full build of #schedules-container
  // ---------------------------------------------------------------------------

  function render() {
    var container = document.getElementById('schedules-container');
    if (!container) return;

    if (!_data) {
      container.innerHTML =
        '<div class="empty-state-enhanced"><p>Cargando horarios...</p></div>';
      _fetchSchedules(function() { render(); });
      return;
    }

    var html = '';

    if (_data.length === 0) {
      html += '<div class="empty-state-enhanced" style="padding:40px 20px;">' +
        '<p>No se encontraron schedules en la estacion</p>' +
      '</div>';
    } else {
      var totalPages = Math.ceil(_data.length / _schedPageSize);
      if (_schedPage >= totalPages) _schedPage = Math.max(0, totalPages - 1);
      var start = _schedPage * _schedPageSize;
      var end = Math.min(start + _schedPageSize, _data.length);

      html += '<div class="schedule-grid">';
      for (var i = start; i < end; i++) {
        html += _buildScheduleCard(_data[i], i);
      }
      html += '</div>';

      if (totalPages > 1) {
        html += '<div class="pagination-bar">' +
          '<button class="pagination-btn" onclick="window.SNLS.ScheduleView.setPage(' + (_schedPage - 1) + ')"' +
            (_schedPage === 0 ? ' disabled' : '') + '>&laquo; Anterior</button>' +
          '<span class="pagination-info">Pagina ' + (_schedPage + 1) + ' de ' + totalPages + '</span>' +
          '<button class="pagination-btn" onclick="window.SNLS.ScheduleView.setPage(' + (_schedPage + 1) + ')"' +
            (_schedPage >= totalPages - 1 ? ' disabled' : '') + '>Siguiente &raquo;</button>' +
        '</div>';
      }
    }

    container.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // openEditor — open native Niagara editor in iframe modal
  // ---------------------------------------------------------------------------

  function openEditor(index) {
    if (!_data || index < 0 || index >= _data.length) return;

    var item = _data[index];
    var navOrd = item.navOrd;
    if (!navOrd) return;

    var view = _getScheduleView(item.type);
    var iframeUrl = '/ord/' + encodeURI(navOrd + '|' + view) + '?fullScreen=true';
    var title = item.displayName || item.name || 'Schedule';

    // Build modal HTML
    var html =
      '<div class="schedule-modal-overlay" onclick="window.SNLS.ScheduleView.closeEditor()">' +
        '<div class="schedule-modal" onclick="event.stopPropagation()">' +
          '<div class="schedule-modal-header">' +
            '<div class="schedule-modal-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
                '<line x1="16" y1="2" x2="16" y2="6"/>' +
                '<line x1="8" y1="2" x2="8" y2="6"/>' +
                '<line x1="3" y1="10" x2="21" y2="10"/>' +
              '</svg>' +
              ' ' + _escHtml(title) +
            '</div>' +
            '<button class="schedule-modal-close" onclick="window.SNLS.ScheduleView.closeEditor()" title="Cerrar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"/>' +
                '<line x1="6" y1="6" x2="18" y2="18"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          '<iframe class="schedule-modal-iframe" src="' + _escAttr(iframeUrl) + '" ' +
            'frameborder="0" allowfullscreen></iframe>' +
        '</div>' +
      '</div>';

    // Append modal to body
    var modal = document.createElement('div');
    modal.id = 'schedule-modal-root';
    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  // ---------------------------------------------------------------------------
  // closeEditor — close the iframe modal
  // ---------------------------------------------------------------------------

  function closeEditor() {
    var modal = document.getElementById('schedule-modal-root');
    if (modal) {
      modal.parentNode.removeChild(modal);
    }
    document.body.style.overflow = '';
  }

  // ---------------------------------------------------------------------------
  // refresh — re-fetch and re-render
  // ---------------------------------------------------------------------------

  function refresh() {
    _data = null;
    _fetchSchedules(function() { render(); });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  function setPage(p) {
    _schedPage = Math.max(0, p);
    render();
  }

  SNLS.ScheduleView = {
    render: render,
    refresh: refresh,
    openEditor: openEditor,
    closeEditor: closeEditor,
    setPage: setPage
  };

  window.SNLS = SNLS;

})(window);
