/**
 * MX60.AlarmCards
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Full-screen modal showing alarm details in 3 tabs:
 *   Summary — key fields from the alarm record
 *   Table   — AlarmDetailsTable drilled to the source
 *   Notes   — inline notes panel (GET + POST)
 *
 * Footer actions: Acknowledge + Hyperlink + Close.
 *
 * Public API:
 *   open(alarm, rows, opts)   → void
 *     alarm: full alarm record
 *     rows:  array of detail records for the "Table" tab
 *     opts:  { onAck, onClose }
 *   close()                   → void
 *
 * REQ-G5-detail row-click scenario
 *
 * C6 — chihuahua-reflow-sanluis-replica
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var _root = null;
  var _activeTab = 'summary';

  // ── Escape ───────────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _fmtDate(ts) {
    if (!ts) return '—';
    try {
      var d = new Date(ts);
      if (isNaN(d.getTime())) return String(ts);
      return d.toLocaleString();
    } catch (e) { return String(ts); }
  }

  // ── Summary tab HTML ──────────────────────────────────────────────────────────

  function _summaryHtml(alarm) {
    var rows = [
      ['Fuente',      alarm.source        || '—'],
      ['Prioridad',   alarm.priority      || '—'],
      ['Estado',      alarm.alarmState    || '—'],
      ['Transición',  alarm.alarmTransition || '—'],
      ['Mensaje',     alarm.message       || '—'],
      ['Hora',        _fmtDate(alarm.timestamp)],
      ['Última act.', _fmtDate(alarm.lastUpdate)],
      ['Clase',       alarm.alarmClass    || '—'],
      ['Tipo fuente', alarm.sourceType    || '—'],
      ['UUID',        alarm.uuid          || '—']
    ];
    var html = '<table class="mx60-alarmcard-summary-table">';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr>' +
        '<th class="mx60-acs-key">'   + _esc(rows[i][0]) + '</th>' +
        '<td class="mx60-acs-value">' + _esc(rows[i][1]) + '</td>' +
      '</tr>';
    }
    html += '</table>';
    return html;
  }

  // ── Notes tab HTML ────────────────────────────────────────────────────────────

  function _notesTabHtml() {
    return '<div class="mx60-alarmcard-notes-tab">' +
      '<div class="mx60-alarmcard-notes-history" data-alarmcard-notes-history>' +
        '<div class="mx60-notes-loading">Cargando notas...</div>' +
      '</div>' +
      '<div class="mx60-alarmcard-notes-compose">' +
        '<textarea class="mx60-notes-textarea" data-alarmcard-notes-input ' +
          'placeholder="Escriba una nota..." rows="3"></textarea>' +
        '<div class="mx60-notes-actions">' +
          '<span class="mx60-notes-error" data-alarmcard-notes-error></span>' +
          '<button type="button" class="mx60-btn mx60-btn--primary" ' +
            'data-alarmcard-action="save-note">Guardar nota</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Modal shell HTML ───────────────────────────────────────────────────────────

  function _modalHtml(alarm) {
    var hasHyperlink = alarm.hyperlinkOrd && alarm.hyperlinkOrd.length > 0;
    return '<div class="mx60-alarmcard-overlay">' +
      '<div class="mx60-alarmcard-modal" data-stop-prop="1">' +

        '<div class="mx60-alarmcard-header">' +
          '<div class="mx60-alarmcard-title">' + _esc(alarm.source || 'Alarma') + '</div>' +
          '<button type="button" class="mx60-alarmcard-close" data-alarmcard-action="close" ' +
            'aria-label="Cerrar">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<line x1="18" y1="6" x2="6" y2="18"/>' +
              '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +

        '<div class="mx60-alarmcard-tabs">' +
          '<button type="button" class="mx60-alarmcard-tab mx60-alarmcard-tab--active" ' +
            'data-alarmcard-tab="summary">Resumen</button>' +
          '<button type="button" class="mx60-alarmcard-tab" ' +
            'data-alarmcard-tab="table">Tabla</button>' +
          '<button type="button" class="mx60-alarmcard-tab" ' +
            'data-alarmcard-tab="notes">Notas</button>' +
        '</div>' +

        '<div class="mx60-alarmcard-body">' +
          '<div class="mx60-alarmcard-panel mx60-alarmcard-panel--active" data-alarmcard-panel="summary">' +
            _summaryHtml(alarm) +
          '</div>' +
          '<div class="mx60-alarmcard-panel" data-alarmcard-panel="table">' +
            '<div data-alarmcard-table-container></div>' +
          '</div>' +
          '<div class="mx60-alarmcard-panel" data-alarmcard-panel="notes">' +
            _notesTabHtml() +
          '</div>' +
        '</div>' +

        '<div class="mx60-alarmcard-footer">' +
          '<button type="button" class="mx60-btn mx60-btn--danger" ' +
            'data-alarmcard-action="ack"' + (function() { var hasAckable = !!(alarm.uuid || (alarm.uuids && alarm.uuids.length > 0)); return hasAckable ? '' : ' disabled title="ACK no disponible (firmware)"'; }()) + '>' +
            'Reconocer' +
          '</button>' +
          '<button type="button" class="mx60-btn mx60-btn--secondary" ' +
            'data-alarmcard-action="hyperlink"' + (!hasHyperlink ? ' disabled' : '') +
            (hasHyperlink ? ' data-ord="' + _esc(alarm.hyperlinkOrd) + '"' : '') + '>' +
            'Hipervínculo' +
          '</button>' +
          '<button type="button" class="mx60-btn" data-alarmcard-action="close">Cerrar</button>' +
        '</div>' +

      '</div>' +
    '</div>';
  }

  // ── Notes loader ────────────────────────────────────────────────────────────

  function _loadNotes(root, uuid) {
    var historyEl = root.querySelector('[data-alarmcard-notes-history]');
    if (!historyEl || !uuid) return;
    var cfg = (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
    var url = ((cfg.api && cfg.api.alarmNotes) || '/mx60/api/alarms/notes') + '/' + encodeURIComponent(uuid);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4 || !_root) return;
      var notes = [];
      if (xhr.status === 200) {
        try { notes = JSON.parse(xhr.responseText); } catch (e) {}
      }
      if (!Array.isArray(notes)) notes = [];
      if (notes.length === 0) {
        historyEl.innerHTML = '<p class="mx60-notes-empty">Sin notas anteriores.</p>';
      } else {
        var h = '<ul class="mx60-notes-list">';
        for (var i = notes.length - 1; i >= 0; i--) {
          var n = notes[i];
          h += '<li class="mx60-notes-item">' +
            '<div class="mx60-notes-meta">' +
              '<span class="mx60-notes-author">' + _esc(n.author || 'Sistema') + '</span>' +
              '<span class="mx60-notes-date">'   + _esc(n.date   || '')        + '</span>' +
            '</div>' +
            '<div class="mx60-notes-message">' + _esc(n.message || '') + '</div>' +
          '</li>';
        }
        h += '</ul>';
        historyEl.innerHTML = h;
      }
    };
    xhr.send();
  }

  // ── Open / close ──────────────────────────────────────────────────────────────

  function open(alarm, rows, opts) {
    close();
    alarm = alarm || {};
    rows  = rows  || [];
    opts  = opts  || {};
    // SDD-B REQ-B9: respect opts.initialTab if valid; default to 'summary'.
    var requestedTab = opts.initialTab;
    _activeTab = (requestedTab === 'summary' || requestedTab === 'tabla' || requestedTab === 'notas')
      ? requestedTab : 'summary';

    var root = document.createElement('div');
    root.id = 'mx60-alarmcard-root';
    root.innerHTML = _modalHtml(alarm);
    document.body.appendChild(root);
    _root = root;

    // Apply initial tab if not 'summary' (HTML defaults to summary active).
    if (_activeTab !== 'summary') _switchTab(root, _activeTab);

    document.body.style.overflow = 'hidden';

    // Wire up AlarmDetailsTable in table panel
    var tableContainer = root.querySelector('[data-alarmcard-table-container]');
    if (tableContainer && MX60.AlarmDetailsTable) {
      MX60.AlarmDetailsTable.render(tableContainer, rows);
    }

    // Load notes for notes tab
    _loadNotes(root, alarm.uuid);

    // Delegated events
    root.addEventListener('click', function(e) {
      // Tab switching
      var tabBtn = e.target;
      while (tabBtn && tabBtn !== root && !tabBtn.hasAttribute('data-alarmcard-tab')) {
        tabBtn = tabBtn.parentNode;
      }
      if (tabBtn && tabBtn !== root) {
        var tab = tabBtn.getAttribute('data-alarmcard-tab');
        _switchTab(root, tab);
        return;
      }

      // Action buttons
      var actionBtn = e.target;
      while (actionBtn && actionBtn !== root && !actionBtn.hasAttribute('data-alarmcard-action')) {
        actionBtn = actionBtn.parentNode;
      }
      if (actionBtn && actionBtn !== root) {
        var action = actionBtn.getAttribute('data-alarmcard-action');
        if (action === 'close') { close(); return; }
        if (action === 'ack') {
          _doAck(alarm, opts);
          return;
        }
        if (action === 'hyperlink') {
          var ord = actionBtn.getAttribute('data-ord');
          _doHyperlink(ord);
          return;
        }
        if (action === 'save-note') {
          _doSaveNote(root, alarm.uuid);
          return;
        }
      }

      // Click on overlay (not modal body) → close
      if (e.target === root.firstChild) close();
    }, false);
  }

  function _switchTab(root, tab) {
    _activeTab = tab;
    var tabs   = root.querySelectorAll('[data-alarmcard-tab]');
    var panels = root.querySelectorAll('[data-alarmcard-panel]');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('data-alarmcard-tab') === tab) {
        tabs[i].classList.add('mx60-alarmcard-tab--active');
      } else {
        tabs[i].classList.remove('mx60-alarmcard-tab--active');
      }
    }
    for (var j = 0; j < panels.length; j++) {
      if (panels[j].getAttribute('data-alarmcard-panel') === tab) {
        panels[j].classList.add('mx60-alarmcard-panel--active');
      } else {
        panels[j].classList.remove('mx60-alarmcard-panel--active');
      }
    }
  }

  // C-4 [Spec S-2c, S-3b]: _doAck — body-inspecting ack for AlarmCards.
  // Replaces unconditional success toast with ackedCount-gated logic.
  //   ackedCount > 0  → Toast("Reconocida", "ok")                   (S-2c)
  //   ackedCount === 0, probe-failed prefix → error + "reiniciar estación" hint (S-3b)
  //   ackedCount === 0, other error         → generic error toast
  //   HTTP 502        → error toast with probe-failed hint (same as ackedCount===0/F1)
  //   HTTP 204        → treat as success (no body, keep existing behaviour)
  function _doAck(alarm, opts) {
    var uuids = alarm.uuids || (alarm.uuid ? [alarm.uuid] : []);
    if (!uuids.length) return;
    var cfg = (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
    var url = (cfg.api && cfg.api.alarmAck) || '/mx60/api/alarms/ack';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;

      if (xhr.status === 204) {
        // Defensive: 204 means success with no body — keep old behaviour
        if (MX60.Toast) MX60.Toast.show('Reconocida', 'ok');
        if (typeof opts.onAck === 'function') opts.onAck(uuids);
        return;
      }

      if (xhr.status === 502) {
        // F1 probe-failed: permanent error — show hint
        var r502;
        try { r502 = JSON.parse(xhr.responseText); } catch (e) { r502 = {}; }
        var msg502 = (r502.errors && r502.errors[0]) || 'probe-failed';
        if (MX60.Toast) MX60.Toast.error('Error al reconocer: probe-failed — reiniciar estación');
        return;
      }

      if (xhr.status === 200) {
        var result;
        try { result = JSON.parse(xhr.responseText); } catch (e) { result = {}; }
        var ackedCount = (typeof result.ackedCount === 'number') ? result.ackedCount : 0;
        var errors     = result.errors || [];

        if (ackedCount > 0) {
          // S-2c: success (single card always sends 1 uuid)
          if (MX60.Toast) MX60.Toast.show('Reconocida', 'ok');
          if (typeof opts.onAck === 'function') opts.onAck(uuids);
        } else {
          // S-3b: ackedCount === 0 — distinguish probe-failed from other errors
          var firstErr = errors[0] || 'No se pudo reconocer';
          var errText = (firstErr.indexOf('probe-failed') === 0)
              ? 'Error al reconocer: probe-failed — reiniciar estación'
              : 'Error al reconocer: ' + firstErr;
          if (MX60.Toast) MX60.Toast.error(errText);
        }
        return;
      }

      // Other error (500, network, etc.)
      if (MX60.Toast) MX60.Toast.error('Error al reconocer. Status: ' + xhr.status);
    };
    xhr.send(JSON.stringify({ uuids: uuids }));
  }

  function _doHyperlink(ord) {
    if (!ord) return;
    var cfg = (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
    var url = ((cfg.api && cfg.api.alarmHyperlink) || '/mx60/api/alarms/hyperlink') +
      '?ord=' + encodeURIComponent(ord);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var r = JSON.parse(xhr.responseText);
          if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
        } catch (e) {}
      }
    };
    xhr.send();
  }

  function _doSaveNote(root, uuid) {
    if (!uuid) return;
    var textarea  = root.querySelector('[data-alarmcard-notes-input]');
    var errorEl   = root.querySelector('[data-alarmcard-notes-error]');
    var text = textarea ? (textarea.value || '').trim() : '';
    if (!text) {
      if (errorEl) errorEl.textContent = 'La nota no puede estar vacía.';
      return;
    }
    if (errorEl) errorEl.textContent = '';
    var author = 'Operador';
    if (window.MX60 && MX60.SharedEnv && typeof MX60.SharedEnv.getUser === 'function') {
      author = MX60.SharedEnv.getUser() || 'Operador';
    }
    var cfg = (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
    var url = (cfg.api && cfg.api.alarmNotes) || '/mx60/api/alarms/notes';
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4 || !_root) return;
      if (xhr.status === 200 || xhr.status === 204) {
        if (textarea) textarea.value = '';
        _loadNotes(root, uuid);
      } else {
        if (errorEl) errorEl.textContent = 'Error al guardar: HTTP ' + xhr.status;
      }
    };
    xhr.send(JSON.stringify({ uuids: [uuid], note: text, author: author }));
  }

  function close() {
    if (_root) {
      if (_root.parentNode) _root.parentNode.removeChild(_root);
      _root = null;
    }
    document.body.style.overflow = '';
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  MX60.AlarmCards = {
    open:  open,
    close: close
  };

  window.MX60 = MX60;

})(window);
