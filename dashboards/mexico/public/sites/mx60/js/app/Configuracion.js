/**
 * MX60.ConfiguracionPage
 *
 * Dense matrix view of all UPs with their current operating mode. Each row
 * shows id, planta, status chip, and 3 inline mini-chips (MANUAL/SETPOINT/
 * SCHEDULE). Click on a chip changes the mode for that UP with a 5s undo
 * toast — same persist path as the drag-drop in UP detail (so changes from
 * either screen are consistent).
 *
 * Contract:
 *   - Read-time: prefers ModoOverrideStore.get(id) over summary.modoOperacion.
 *   - Write-time: ModoOverrideStore.set(id, modo) + MX60.writePoint(ord, modo).
 *   - Auto-syncs across pages via ModoOverrideStore.subscribe (no polling).
 *   - Refreshes on EquipmentData polling so status changes upstream show up.
 *
 * Filters: planta (id), modo, status. Empty value = "all".
 */
(function(global) {
  'use strict';
  var MX60 = global.MX60 = global.MX60 || {};

  var VALID_MODOS = ['MANUAL', 'SETPOINT', 'SCHEDULE'];
  var STATUSES = ['cooling', 'standby', 'alarm', 'offline'];
  var STATUS_LABELS = {
    cooling: 'Prendido',
    standby: 'En espera',
    alarm:   'Alarma',
    offline: 'Offline'
  };

  var _container = null;
  var _state = { ups: [], plantas: [] };
  var _filters = { planta: '', modo: '', status: '' };
  var _onDataChange = null;
  var _unsubStore = null;
  var _unsubAlarmLatch = null;
  var _onTbodyClick = null;
  var _onFiltersInput = null;
  var _mql = null;
  var _onMqlChange = null;
  var _isMobile = false;

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function escHtml(s) {
    s = (s == null) ? '' : String(s);
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escAttr(s) { return escHtml(s); }

  function readModo(equip) {
    if (MX60.ModoOverrideStore) {
      var ov = MX60.ModoOverrideStore.get(equip.id);
      if (ov && VALID_MODOS.indexOf(ov) >= 0) return ov;
    }
    var m = (equip.summary && equip.summary.modoOperacion) || '';
    return VALID_MODOS.indexOf(m) >= 0 ? m : 'SCHEDULE';
  }

  function applyFilters(ups) {
    var out = [];
    for (var i = 0; i < ups.length; i++) {
      var u = ups[i];
      if (_filters.planta && String(u.planta || '') !== _filters.planta) continue;
      if (_filters.modo   && readModo(u) !== _filters.modo) continue;
      if (_filters.status && (u.status || '') !== _filters.status) continue;
      out.push(u);
    }
    return out;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  function buildFilterSelect(name, allLabel, options) {
    var html = '<select class="cfg-filter" data-filter="' + escAttr(name) + '">';
    html += '<option value="">' + escHtml(allLabel) + '</option>';
    for (var i = 0; i < options.length; i++) {
      var o = options[i];
      var sel = (_filters[name] === o.v) ? ' selected' : '';
      html += '<option value="' + escAttr(o.v) + '"' + sel + '>' + escHtml(o.label) + '</option>';
    }
    html += '</select>';
    return html;
  }

  function rowHtml(u) {
    var modo = readModo(u);
    // Use StatusResolver so AlarmLatchStore-induced 'alarm' status propagates
    // here exactly as it does on HomeMap and EquipmentCard. Reading u.status
    // directly would skip the latch-aware override.
    var status = (MX60.StatusResolver && typeof MX60.StatusResolver.effectiveStatus === 'function')
      ? (MX60.StatusResolver.effectiveStatus(u) || 'standby')
      : (u.status || 'standby');
    var label = MX60.util.EquipmentLabels.format(u.label || u.id);
    var plantaLabel = (u.planta != null) ? MX60.util.PlantaLabels.format(u.planta) : '—';

    var chips = '';
    for (var i = 0; i < VALID_MODOS.length; i++) {
      var m = VALID_MODOS[i];
      var active = (m === modo) ? ' is-active' : '';
      chips +=
        '<button type="button" class="cfg-chip' + active + '" ' +
                'data-cfg-equip="' + escAttr(u.id) + '" ' +
                'data-cfg-modo="' + escAttr(m) + '">' +
          escHtml(m) +
        '</button>';
    }

    return '' +
      '<tr class="cfg-row" data-cfg-row="' + escAttr(u.id) + '">' +
        '<td class="cfg-cell-id">' + escHtml(MX60.util.PlantaLabels.displayId(u.id)) + '</td>' +
        '<td class="cfg-cell-label">' + escHtml(label) + '</td>' +
        '<td class="cfg-cell-planta">' + escHtml(plantaLabel) + '</td>' +
        '<td class="cfg-cell-status">' +
          '<span class="cfg-status-chip status-' + escAttr(status) + '">' +
            escHtml(STATUS_LABELS[status] || status) +
          '</span>' +
        '</td>' +
        '<td class="cfg-cell-modo">' +
          '<div class="cfg-chips">' + chips + '</div>' +
        '</td>' +
      '</tr>';
  }

  function cardHtml(u) {
    var modo = readModo(u);
    var status = (MX60.StatusResolver && typeof MX60.StatusResolver.effectiveStatus === 'function')
      ? (MX60.StatusResolver.effectiveStatus(u) || 'standby')
      : (u.status || 'standby');
    var label = MX60.util.EquipmentLabels.format(u.label || u.id);
    var plantaLabel = (u.planta != null) ? MX60.util.PlantaLabels.format(u.planta) : '—';

    var chips = '';
    for (var i = 0; i < VALID_MODOS.length; i++) {
      var m = VALID_MODOS[i];
      var active = (m === modo) ? ' is-active' : '';
      chips +=
        '<button type="button" class="cfg-chip' + active + '" ' +
                'data-cfg-equip="' + escAttr(u.id) + '" ' +
                'data-cfg-modo="' + escAttr(m) + '">' +
          escHtml(m) +
        '</button>';
    }

    return '' +
      '<div class="cfg-card" data-cfg-row="' + escAttr(u.id) + '">' +
        '<div class="cfg-card-top">' +
          '<span class="cfg-card-id">' + escHtml(MX60.util.PlantaLabels.displayId(u.id)) + '</span>' +
          '<span class="cfg-card-label">' + escHtml(label) + '</span>' +
          '<span class="cfg-card-planta">' + escHtml(plantaLabel) + '</span>' +
          '<span class="cfg-status-chip status-' + escAttr(status) + '">' +
            escHtml(STATUS_LABELS[status] || status) +
          '</span>' +
        '</div>' +
        '<div class="cfg-card-chips">' + chips + '</div>' +
      '</div>';
  }

  // Granular per-row update — when the filtered ID set is unchanged (live
  // status/modo updates only), patch the existing row's status chip + chip
  // states in place. NEVER touch the <tbody> innerHTML in that case so input
  // focus, scroll position, and keyboard navigation all survive ~200ms
  // subscription updates.
  function _updateRowsInPlace(filtered, rootEl) {
    for (var i = 0; i < filtered.length; i++) {
      var u = filtered[i];
      var modo = readModo(u);
      var status = (MX60.StatusResolver && typeof MX60.StatusResolver.effectiveStatus === 'function')
        ? (MX60.StatusResolver.effectiveStatus(u) || 'standby')
        : (u.status || 'standby');
      var rowEl = rootEl.querySelector('[data-cfg-row="' + u.id.replace(/"/g, '\\"') + '"]');
      if (!rowEl) return false; // ID missing — caller falls back to full rebuild
      // Update status chip text + class
      var chipEl = rowEl.querySelector('.cfg-status-chip');
      if (chipEl) {
        var newCls = 'cfg-status-chip status-' + status;
        if (chipEl.className !== newCls) chipEl.className = newCls;
        var newTxt = STATUS_LABELS[status] || status;
        if (chipEl.textContent !== newTxt) chipEl.textContent = newTxt;
      }
      // Update active modo chip
      var modoChips = rowEl.querySelectorAll('.cfg-chip[data-cfg-modo]');
      for (var k = 0; k < modoChips.length; k++) {
        var chip = modoChips[k];
        var isActive = (chip.getAttribute('data-cfg-modo') === modo);
        if (isActive && !chip.classList.contains('is-active')) chip.classList.add('is-active');
        else if (!isActive && chip.classList.contains('is-active')) chip.classList.remove('is-active');
      }
    }
    return true;
  }

  function _filteredIdsKey(filtered) {
    var ids = [];
    for (var i = 0; i < filtered.length; i++) ids.push(filtered[i].id);
    return ids.join('|');
  }

  // Cached set of currently-rendered row ids — granular path is only safe
  // when the filtered ID set is unchanged.
  var _renderedIdsKey = '';

  function renderRows() {
    if (!_container) return;
    var counter = _container.querySelector('[data-cfg-counter]');
    var filtered = applyFilters(_state.ups);
    var idsKey = _filteredIdsKey(filtered);

    if (_isMobile) {
      var cardListEl = _container.querySelector('[data-cfg-cardlist]');
      if (!cardListEl) return;
      // Granular path: same id set → update chips in place
      if (idsKey === _renderedIdsKey && filtered.length > 0 &&
          _updateRowsInPlace(filtered, cardListEl)) {
        if (counter) counter.textContent = filtered.length + ' / ' + _state.ups.length + ' unidades';
        return;
      }
      var cardHtml2 = '';
      for (var i = 0; i < filtered.length; i++) cardHtml2 += cardHtml(filtered[i]);
      if (filtered.length === 0) {
        cardHtml2 = '<div class="cfg-empty">Ninguna unidad coincide con los filtros.</div>';
      }
      cardListEl.innerHTML = cardHtml2;
      wireCardList(cardListEl);
    } else {
      var tbody = _container.querySelector('[data-cfg-tbody]');
      if (!tbody) return;
      // Granular path: same id set → update chips in place
      if (idsKey === _renderedIdsKey && filtered.length > 0 &&
          _updateRowsInPlace(filtered, tbody)) {
        if (counter) counter.textContent = filtered.length + ' / ' + _state.ups.length + ' unidades';
        return;
      }
      var html = '';
      for (var j = 0; j < filtered.length; j++) html += rowHtml(filtered[j]);
      if (filtered.length === 0) {
        html = '<tr><td colspan="5" class="cfg-empty">Ninguna unidad coincide con los filtros.</td></tr>';
      }
      tbody.innerHTML = html;
      wireTbody();
    }
    _renderedIdsKey = idsKey;

    if (counter) {
      counter.textContent = filtered.length + ' / ' + _state.ups.length + ' unidades';
    }
  }

  function renderShell() {
    if (!_container) return;
    var plantasOptions = _state.plantas.map(function(p) {
      var id = (p && p.id != null) ? p.id : p;
      return { v: String(id), label: MX60.util.PlantaLabels.format(id) };
    });
    // MANUAL hidden from filter — see SDD mx60-frontend-modo-manual-hide (engram #1556)
    var modoOptions = VALID_MODOS
      .filter(function (m) { return m !== 'MANUAL'; })
      .map(function (m) { return { v: m, label: m }; });
    var statusOptions = STATUSES.map(function(s) { return { v: s, label: STATUS_LABELS[s] || s }; });

    var contentArea = _isMobile
      ? '<div class="cfg-card-list" data-cfg-cardlist></div>'
      : ('<div class="cfg-table-wrap">' +
          '<table class="cfg-table">' +
            '<thead>' +
              '<tr>' +
                '<th class="cfg-cell-id">ID</th>' +
                '<th class="cfg-cell-label">Etiqueta</th>' +
                '<th class="cfg-cell-planta">Planta</th>' +
                '<th class="cfg-cell-status">Estado</th>' +
                '<th class="cfg-cell-modo">Modo de Operación</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody data-cfg-tbody></tbody>' +
          '</table>' +
        '</div>');

    _container.innerHTML =
      '<div class="cfg-shell">' +
        '<div class="cfg-header">' +
          '<div class="cfg-title">Configuración — Modo de Operación</div>' +
          '<div class="cfg-subtitle">' +
            'Click en un modo para cambiarlo. 5 segundos para deshacer.' +
          '</div>' +
        '</div>' +
        '<div class="cfg-filters" data-cfg-filters>' +
          buildFilterSelect('planta', 'Todas las plantas',  plantasOptions) +
          buildFilterSelect('modo',   'Todos los modos',    modoOptions) +
          buildFilterSelect('status', 'Todos los estados',  statusOptions) +
          '<div class="cfg-counter" data-cfg-counter></div>' +
        '</div>' +
        contentArea +
      '</div>';

    wireFilters();
    renderRows();
  }

  // --------------------------------------------------------------------------
  // Wiring
  // --------------------------------------------------------------------------
  function wireFilters() {
    var filtersEl = _container.querySelector('[data-cfg-filters]');
    if (!filtersEl) return;
    _onFiltersInput = function(e) {
      var target = e.target;
      if (!target || !target.matches || !target.matches('[data-filter]')) return;
      var name = target.getAttribute('data-filter');
      _filters[name] = target.value || '';
      renderRows();
    };
    filtersEl.addEventListener('change', _onFiltersInput, false);
  }

  function _makeClickHandler(rootEl) {
    return function(e) {
      var btn = e.target;
      while (btn && btn !== rootEl && (!btn.getAttribute || !btn.getAttribute('data-cfg-modo'))) {
        btn = btn.parentNode;
      }
      if (!btn || btn === rootEl) return;
      var equipId = btn.getAttribute('data-cfg-equip');
      var newModo = btn.getAttribute('data-cfg-modo');
      if (!equipId || !newModo) return;
      changeModo(equipId, newModo);
    };
  }

  function wireTbody() {
    var tbody = _container.querySelector('[data-cfg-tbody]');
    if (!tbody) return;
    if (_onTbodyClick) tbody.removeEventListener('click', _onTbodyClick, false);
    _onTbodyClick = _makeClickHandler(tbody);
    tbody.addEventListener('click', _onTbodyClick, false);
  }

  function wireCardList(cardListEl) {
    if (!cardListEl) return;
    if (_onTbodyClick) cardListEl.removeEventListener('click', _onTbodyClick, false);
    _onTbodyClick = _makeClickHandler(cardListEl);
    cardListEl.addEventListener('click', _onTbodyClick, false);
  }

  function findUp(equipId) {
    for (var i = 0; i < _state.ups.length; i++) {
      if (_state.ups[i].id === equipId) return _state.ups[i];
    }
    return null;
  }

  function changeModo(equipId, newModo) {
    var equip = findUp(equipId);
    if (!equip) return;
    var prevModo = readModo(equip);
    if (prevModo === newModo) return;

    // Optimistic UI: update the row immediately. ModoOverrideStore is the
    // source of truth at read-time, so we set it on commit (not now) — but
    // we paint optimistically against the new value via updateRowChips.
    updateRowChips(equipId, newModo);

    if (MX60.Toast) {
      MX60.Toast.show({
        message: equipId + ' → ' + newModo,
        undoLabel: 'Deshacer',
        durationMs: 5000,
        onUndo: function() {
          updateRowChips(equipId, prevModo);
        },
        onCommit: function() {
          if (MX60.ModoOverrideStore) MX60.ModoOverrideStore.set(equipId, newModo);
          if (equip.ord) {
            MX60.writePoint(equip.ord + '/modoOperacion', newModo)
              .catch(function() { /* toast already shown by helper */ });
          }
        }
      });
    } else {
      // No toast available — commit immediately.
      if (MX60.ModoOverrideStore) MX60.ModoOverrideStore.set(equipId, newModo);
    }
  }

  function updateRowChips(equipId, modo) {
    if (!_container) return;
    var row = _container.querySelector('[data-cfg-row="' + cssEsc(equipId) + '"]');
    if (!row) return;
    var btns = row.querySelectorAll('[data-cfg-modo]');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-cfg-modo') === modo) btns[i].classList.add('is-active');
      else btns[i].classList.remove('is-active');
    }
  }

  // CSS.escape polyfill — equip ids are well-formed but be defensive.
  function cssEsc(s) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  // --------------------------------------------------------------------------
  // External event hooks
  // --------------------------------------------------------------------------
  function onDataPoll(stateFromEquipmentData) {
    var equipment = (stateFromEquipmentData && stateFromEquipmentData.equipment) || [];
    _state.ups = equipment.filter(function(e) { return e.type === 'up'; });
    var raw = (stateFromEquipmentData && stateFromEquipmentData.raw) || {};
    _state.plantas = (raw._meta && raw._meta.plantas) || _state.plantas || [];
    if (!(raw._meta && raw._meta.plantas)) console.warn('[Configuracion] _meta.plantas missing from response');
    // Focus guard: subscriptions fire every ~200ms during live updates. If
    // the operator is editing a filter <select> or <input> inside the
    // Configuracion shell, a full innerHTML rebuild via renderRows() would
    // steal focus and clobber the typing. Defer the rebuild to the next
    // notify when the operator finishes interacting.
    if (_container && document.activeElement &&
        _container.contains(document.activeElement) &&
        /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      return;
    }
    renderRows();
  }

  function onStoreChange(evt) {
    if (!evt || !evt.equipId) return;
    // Repaint the affected row only — cheap.
    updateRowChips(evt.equipId, evt.modo || readModo(findUp(evt.equipId) || {}));
  }

  // --------------------------------------------------------------------------
  // Page lifecycle
  // --------------------------------------------------------------------------
  var ConfiguracionPage = {
    mount: function(container, route) {
      _container = container;
      _filters = { planta: '', modo: '', status: '' };

      // matchMedia for mobile card/table toggle (REQ-7, Path B)
      _mql = window.matchMedia('(max-width: 768px)');
      _isMobile = _mql.matches;
      _onMqlChange = function(e) {
        _isMobile = e.matches;
        renderShell();
      };
      if (_mql.addEventListener) {
        _mql.addEventListener('change', _onMqlChange, false);
      } else if (_mql.addListener) {
        _mql.addListener(_onMqlChange);
      }

      if (MX60.EquipmentData && MX60.EquipmentData.load) {
        MX60.EquipmentData.load(function(state) {
          var equipment = (state && state.equipment) || [];
          _state.ups = equipment.filter(function(e) { return e.type === 'up'; });
          var raw = (state && state.raw) || {};
          _state.plantas = (raw._meta && raw._meta.plantas) || [];
          if (!(raw._meta && raw._meta.plantas)) console.warn('[Configuracion] _meta.plantas missing from response');
          renderShell();
        });
        _onDataChange = onDataPoll;
        if (MX60.EquipmentData.addListener) MX60.EquipmentData.addListener(_onDataChange);
      } else {
        _container.innerHTML = '<div class="cfg-error">EquipmentData no disponible.</div>';
      }

      if (MX60.ModoOverrideStore && MX60.ModoOverrideStore.subscribe) {
        _unsubStore = MX60.ModoOverrideStore.subscribe(onStoreChange);
      }
      // Status chip ('En espera' / 'Prendido' / 'Alarma') is derived from
      // eq.status which AlarmLatchStore can override via StatusResolver.
      // Without this subscribe, a UP that latches an alarm shows 'En espera'
      // here while HomeMap and EquipmentCard correctly show 'Alarma'.
      if (MX60.AlarmLatchStore && typeof MX60.AlarmLatchStore.subscribe === 'function') {
        _unsubAlarmLatch = MX60.AlarmLatchStore.subscribe(function() {
          if (_container && document.activeElement &&
              _container.contains(document.activeElement) &&
              /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
            return;
          }
          renderRows();
        });
      }
    },
    destroy: function() {
      // Remove matchMedia change listener (REQ-7, Path B cleanup)
      if (_mql && _onMqlChange) {
        if (_mql.removeEventListener) {
          _mql.removeEventListener('change', _onMqlChange, false);
        } else if (_mql.removeListener) {
          _mql.removeListener(_onMqlChange);
        }
      }
      _mql = null;
      _onMqlChange = null;

      if (_onDataChange && MX60.EquipmentData && MX60.EquipmentData.removeListener) {
        MX60.EquipmentData.removeListener(_onDataChange);
        _onDataChange = null;
      }
      if (_unsubStore) { _unsubStore(); _unsubStore = null; }
      if (_unsubAlarmLatch) { _unsubAlarmLatch(); _unsubAlarmLatch = null; }
      if (_container) {
        var filtersEl = _container.querySelector('[data-cfg-filters]');
        if (filtersEl && _onFiltersInput) {
          filtersEl.removeEventListener('change', _onFiltersInput, false);
        }
        var tbody = _container.querySelector('[data-cfg-tbody]');
        if (tbody && _onTbodyClick) {
          tbody.removeEventListener('click', _onTbodyClick, false);
        }
        var cardListEl = _container.querySelector('[data-cfg-cardlist]');
        if (cardListEl && _onTbodyClick) {
          cardListEl.removeEventListener('click', _onTbodyClick, false);
        }
        _container.innerHTML = '';
      }
      _onTbodyClick = null;
      _onFiltersInput = null;
      _container = null;
      _isMobile = false;
    }
  };

  MX60.ConfiguracionPage = ConfiguracionPage;

  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('configuracion', ConfiguracionPage);
  }

  global.MX60 = MX60;

})(window);
