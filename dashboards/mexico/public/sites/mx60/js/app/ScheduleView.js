/**
 * ScheduleView.js — MX60 namespace
 * IIFE · MX60 namespace
 *
 * Schedules page (#page-schedules). Auto-discovers all BWeeklySchedule
 * components via BQL and renders them as cards. Clicking a card opens
 * the native Niagara schedule editor in an iframe modal.
 *
 * API endpoint:
 *   GET /mx60/api/schedules → JSON array of schedule objects
 *   (URL read from MX60.ConfigManager.getConfig().api.schedules)
 *
 * Page component contract: { mount(container, route), destroy() }
 * Registered as: MX60.DashboardApp.registerPage('schedules', MX60.ScheduleView)
 *
 * Ported verbatim from SanLuis ScheduleView.js.
 * Namespace: SNLS → MX60 · Config global: SNLS_CONFIG → MX60.ConfigManager
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _data = null;
  var _loading = false;
  var _loadAttempted = false;   // MED-1: distinguishes "not yet tried" from "tried and failed"
  var _loadError = null;        // MED-1: last fetch error message for UI feedback
  var _schedPage = 0;
  var _schedPageSize = 12; // 3 columns × 4 rows
  var _currentPlanta = 'all'; // 'all' | 1..6 — planta tab selection state
  var _delegatedClick = null;   // CRIT-3: container click handler ref so we can detach in destroy
  var _pollTimer = null;        // 30s refresh timer while page is mounted
  var _escapeHandler = null;    // CRIT-1 verify C4: keydown handler for ESC modal close
  var _modalIsOpen = false;     // gate flag: pause _render() while iframe modal is open

  // ---------------------------------------------------------------------------
  // _fetchSchedules — load all schedules from the station
  // ---------------------------------------------------------------------------

  function _fetchSchedules(callback) {
    var cfg = MX60.ConfigManager ? MX60.ConfigManager.getConfig() : null;
    if (!cfg || !cfg.api || !cfg.api.schedules) {
      // Fallback: use the hard-coded URL (matches fallback config)
      cfg = { api: { schedules: '/mx60/api/schedules' } };
    }
    if (_loading) return;

    _loading = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', cfg.api.schedules, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        _loading = false;
        // MED-1 fix: ALWAYS set _loadAttempted so _render does NOT retry on
        // every paint when the fetch fails (was infinite XHR loop on 404).
        _loadAttempted = true;
        if (xhr.status === 200) {
          try {
            var parsed = JSON.parse(xhr.responseText);
            if (Array.isArray(parsed)) {
              _data = parsed;
              _loadError = null;
            } else {
              _data = [];
              _loadError = 'Respuesta inválida del servidor';
            }
          } catch (e) {
            _data = [];
            _loadError = 'JSON inválido';
          }
        } else {
          _data = [];
          _loadError = 'HTTP ' + xhr.status;
          console.warn('[ScheduleView] fetch failed:', xhr.status);
        }
        if (callback) callback(_data);
      }
    };
    xhr.onerror = function() {
      _loading = false;
      _loadAttempted = true;
      _data = [];
      _loadError = 'Error de red';
      if (callback) callback(_data);
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
  // _formatEquipName — map raw equip code (UP01, CARRIER 3, LABORATORIO) to a
  // friendly display string (Unidad Paquete 1, Carrier 3, Laboratorio).
  // ---------------------------------------------------------------------------

  function _formatEquipName(raw) {
    return MX60.util.EquipmentLabels.format(raw);
  }

  // ---------------------------------------------------------------------------
  // _formatParent — "Planta N — Tipo N" combining backend planta + equipLabel
  // ---------------------------------------------------------------------------

  function _formatParent(item) {
    var ename = _formatEquipName(item.equipLabel || item.displayName || '');
    var pnum = (item.planta != null && item.planta > 0) ? item.planta : 0;
    return MX60.util.PlantaLabels.formatEquipParent(pnum || null, ename);
  }

  // ---------------------------------------------------------------------------
  // _buildScheduleCard — single schedule card
  // ---------------------------------------------------------------------------

  function _buildScheduleCard(item, index) {
    var rawLabel = item.equipLabel || item.displayName || item.name || 'Schedule';
    var name = _formatEquipName(rawLabel);
    var parentName = _formatParent(item);
    var outValue = item.outValue || item.out || '—';
    var outStatus = item.outStatus || '';
    var isOk = outStatus.indexOf('ok') >= 0 || outStatus === '';
    var statusClass = isOk ? 'schedule-card-active' : '';
    var pillClass = isOk ? 'badge-ok' : 'badge-offline';
    var pillText = isOk ? 'OK' : outStatus.toUpperCase();

    var html =
      '<div class="schedule-card ' + statusClass + '" ' +
        'data-action="open" data-index="' + index + '" ' +
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
  // _buildPlantaTabsHtml — returns inner HTML for the planta-tabs row
  // PARITY: labels mirror ChiEquipmentReader.PLANTA_LABELS. If Java renames
  // a label, update the TABS array here to match.
  // ---------------------------------------------------------------------------

  function _buildPlantaTabsHtml() {
    var TABS = [['all', 'Todos']];
    for (var _i = 1; _i <= 6; _i++) {
      TABS.push([_i, MX60.util.PlantaLabels.format(_i)]);
    }
    var html = '';
    for (var i = 0; i < TABS.length; i++) {
      var val = TABS[i][0];
      var lbl = TABS[i][1];
      var isActive = (val === _currentPlanta) ? ' active' : '';
      html += '<button type="button" class="planta-tab' + isActive + '" data-planta="' + val + '">' + lbl + '</button>';
    }
    return html;
  }

  // ---------------------------------------------------------------------------
  // _render — full build of the schedules container inside the given root
  // ---------------------------------------------------------------------------

  function _render(rootElement) {
    // ADR-2: tabs MUST be a sibling of #schedules-container, NOT inside it.
    // The 30s poll cycle calls container.innerHTML which wipes any DOM inside
    // #schedules-container. Tabs outside the container survive the wipe.
    // The idempotent guard ensures tabs are built only once per mount.
    if (!rootElement.querySelector('#schedule-planta-tabs')) {
      rootElement.innerHTML =
        '<div id="schedule-planta-tabs" class="planta-tabs schedule-planta-tabs">' +
          _buildPlantaTabsHtml() +
        '</div>' +
        '<div id="schedules-container"></div>';
    }
    var container = rootElement.querySelector('#schedules-container');
    if (!container) return;

    // MED-1: only show "Cargando" + retry on the very first attempt; subsequent
    // visits with a previously failed fetch render an error state without
    // hammering the server again.
    if (!_data && !_loadAttempted) {
      container.innerHTML =
        '<div class="empty-state-enhanced"><p>Cargando horarios...</p></div>';
      _fetchSchedules(function() { _render(rootElement); });
      return;
    }
    if (!_data) {
      container.innerHTML =
        '<div class="empty-state-enhanced" style="padding:40px 20px;">' +
          '<p>No se pudieron cargar los horarios' +
          (_loadError ? ' (' + _escHtml(_loadError) + ')' : '') + '.</p>' +
          '<button class="pag-btn" data-action="retry" style="margin-top:12px;">Reintentar</button>' +
        '</div>';
      return;
    }

    var html = '';

    // ADR-2: filter _data by _currentPlanta BEFORE pagination math so that
    // page counts reflect the filtered set and _schedPage resets correctly.
    var displayData = (_currentPlanta === 'all')
      ? _data
      : _data.filter(function(d) { return d.planta === _currentPlanta; });

    if (displayData.length === 0) {
      html += '<div class="empty-state-enhanced" style="padding:40px 20px;">' +
        '<p>No se encontraron schedules en la estacion</p>' +
      '</div>';
    } else {
      var totalPages = Math.ceil(displayData.length / _schedPageSize);
      if (_schedPage >= totalPages) _schedPage = Math.max(0, totalPages - 1);
      var start = _schedPage * _schedPageSize;
      var end = Math.min(start + _schedPageSize, displayData.length);

      html += '<div class="schedule-grid">';
      for (var i = start; i < end; i++) {
        html += _buildScheduleCard(displayData[i], i);
      }
      html += '</div>';

      if (totalPages > 1) {
        html += '<div class="equipment-pagination">' +
          '<button class="pag-btn" data-action="page" data-page="' + (_schedPage - 1) + '"' +
            (_schedPage === 0 ? ' disabled' : '') + '>&#x2039; Anterior</button>' +
          '<span class="pag-info">P&aacute;gina <strong>' + (_schedPage + 1) + '</strong> de ' + totalPages +
            ' &middot; <span class="pag-count">' + displayData.length + ' horarios</span></span>' +
          '<button class="pag-btn" data-action="page" data-page="' + (_schedPage + 1) + '"' +
            (_schedPage >= totalPages - 1 ? ' disabled' : '') + '>Siguiente &#x203A;</button>' +
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
    if (!item || !item.navOrd) return;
    var view = _getScheduleView(item.type);
    var ename = _formatEquipName(item.equipLabel || item.displayName || item.name || 'Schedule');
    var pnum = (item.planta != null && item.planta > 0) ? item.planta : 0;
    var title = MX60.util.PlantaLabels.formatEquipParent(pnum || null, ename);
    openEditorByOrd(item.navOrd, view, title);
  }

  // openEditorByOrd — exposed for callers that already know the ord (e.g. UpDetail)
  function openEditorByOrd(navOrd, viewType, title) {
    if (!navOrd) return;
    var view = viewType || 'view:schedule:WebScheduler';
    var iframeUrl = '/ord/' + encodeURI(navOrd + '|' + view) + '?fullScreen=true';
    title = title || 'Schedule';

    var html =
      '<div class="schedule-modal-overlay" data-action="close-modal">' +
        '<div class="schedule-modal" data-stop-prop="1">' +
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
            '<button class="schedule-modal-close" data-action="close-modal" title="Cerrar">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
                'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"/>' +
                '<line x1="6" y1="6" x2="18" y2="18"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
          // SAN LUIS pattern: no sandbox attribute — WebScheduler requires full
          // browser context (cookies, fetch, top.location for save) to function.
          // Sandbox blocks the Niagara HX framework's bootstrap.
          '<iframe class="schedule-modal-iframe" src="' + _escAttr(iframeUrl) + '" ' +
            'frameborder="0" allowfullscreen></iframe>' +
        '</div>' +
      '</div>';

    var modal = document.createElement('div');
    modal.id = 'schedule-modal-root';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    // CRIT-3: delegated click handler on the modal so close-modal/stop-prop
    // attributes work without inline onclick.
    modal.addEventListener('click', function(e) {
      var stop = e.target.closest && e.target.closest('[data-stop-prop]');
      var trg  = e.target.closest && e.target.closest('[data-action="close-modal"]');
      if (trg) { e.stopPropagation(); closeEditor(); return; }
      if (stop) { return; /* click inside modal body — ignore overlay close */ }
    }, false);

    // SAN LUIS pattern: trust iframe load. Only onerror triggers fallback to new tab.
    // No timeout — WebScheduler can take >5s to render full HX layout (theme.css,
    // schedule.css, app.js) and a premature timeout was opening the editor in a
    // new tab instead of in the modal.
    var iframeEl = modal.querySelector('iframe.schedule-modal-iframe');
    if (iframeEl) {
      iframeEl.onerror = function() {
        closeEditor();
        window.open(iframeUrl, '_blank');
      };
    }

    document.body.style.overflow = 'hidden';
    _modalIsOpen = true;

    _escapeHandler = function(ev) {
      if (ev.key === 'Escape' || ev.keyCode === 27) {
        closeEditor();
      }
    };
    document.addEventListener('keydown', _escapeHandler, false);
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
    _modalIsOpen = false;
    if (_escapeHandler) {
      document.removeEventListener('keydown', _escapeHandler, false);
      _escapeHandler = null;
    }
  }

  // ---------------------------------------------------------------------------
  // setPage — paginate the schedule grid
  // ---------------------------------------------------------------------------

  function setPage(p) {
    _schedPage = Math.max(0, p);
    // Re-render inside whatever container is currently active
    var container = document.getElementById('page-schedules');
    if (container) _render(container);
  }

  // ---------------------------------------------------------------------------
  // Page component contract — mount / destroy
  // ---------------------------------------------------------------------------

  /**
   * mount(container, route) — called by DashboardApp on navigation to 'schedules'.
   * Builds or refreshes the schedule grid inside the given section element.
   *
   * @param {HTMLElement} container  The #page-schedules section element.
   */
  function mount(container) {
    // Reset pagination and planta filter on every mount.
    _schedPage = 0;
    _currentPlanta = 'all';
    // Re-fetch schedule data from the station on every navigation. Without
    // this, _loadAttempted persists at module level — second visit re-uses
    // stale outValue/outStatus from the first fetch and never refreshes,
    // making the schedules page effectively static for the session.
    _loadAttempted = false;
    // Keep _data intact for instant first-paint; _render will trigger the
    // fetch in the background and re-render when it completes.
    // CRIT-3: install delegated click handler instead of inline onclick.
    if (_delegatedClick) {
      container.removeEventListener('click', _delegatedClick, false);
    }
    _delegatedClick = function(e) {
      // ADR-2: handle planta-tab clicks BEFORE [data-action] dispatch.
      // Tabs live outside #schedules-container so they survive the 30s innerHTML wipe.
      var tab = e.target.closest && e.target.closest('.planta-tab');
      if (tab) {
        var plantaVal = tab.getAttribute('data-planta');
        _currentPlanta = (plantaVal === 'all') ? 'all' : parseInt(plantaVal, 10);
        _schedPage = 0; // reset to page 1 on planta change
        // Toggle active class on all tabs (cheap DOM op — no full rebuild)
        var allTabs = container.querySelectorAll('.planta-tab');
        for (var ti = 0; ti < allTabs.length; ti++) {
          if (allTabs[ti].getAttribute('data-planta') === plantaVal) {
            allTabs[ti].classList.add('active');
          } else {
            allTabs[ti].classList.remove('active');
          }
        }
        _render(container);
        return;
      }
      var t = e.target.closest && e.target.closest('[data-action]');
      if (!t) return;
      var action = t.getAttribute('data-action');
      if (action === 'open') {
        var idx = parseInt(t.getAttribute('data-index'), 10);
        if (!isNaN(idx)) openEditor(idx);
      } else if (action === 'page') {
        var p = parseInt(t.getAttribute('data-page'), 10);
        if (!isNaN(p)) setPage(p);
      } else if (action === 'retry') {
        // MED-1: explicit user retry — clear flag so fetch runs again.
        _data = null;
        _loadAttempted = false;
        _loadError = null;
        _render(container);
      }
    };
    container.addEventListener('click', _delegatedClick, false);
    _render(container);

    // Live update: re-fetch schedules every 30s while the page is mounted.
    // Skip when the iframe modal is open — prevents the grid re-render from
    // racing with the iframe's HX bootstrap (CSS reflow can interfere with
    // iframe layout while it's still resolving its internal stylesheets).
    if (_pollTimer) { clearInterval(_pollTimer); }
    _pollTimer = setInterval(function() {
      if (_modalIsOpen) return;
      _loadAttempted = false;
      _fetchSchedules(function() { if (!_modalIsOpen) _render(container); });
    }, 30000);
  }

  /**
   * destroy() — called by DashboardApp before navigating away from 'schedules'.
   * Closes any open editor modal and restores body scroll.
   */
  function destroy() {
    closeEditor();
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_delegatedClick) {
      var container = document.getElementById('page-schedules');
      if (container) container.removeEventListener('click', _delegatedClick, false);
      _delegatedClick = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  MX60.ScheduleView = {
    // Page component contract
    mount:       mount,
    destroy:     destroy,
    // Exposed for inline onclick handlers
    openEditor:        openEditor,
    openEditorByOrd:   openEditorByOrd,
    closeEditor:       closeEditor,
    setPage:           setPage
  };

  window.MX60 = MX60;

  // Register as a real page module so DashboardApp replaces the stub.
  // DashboardApp.registerPage is always available by the time this IIFE runs
  // because DashboardApp.js loads before this file in index.html.
  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('schedules', MX60.ScheduleView);
  }

})(window);
