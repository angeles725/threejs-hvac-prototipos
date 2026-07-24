/**
 * MX60.AlarmNotesModal
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Full-screen modal for viewing and adding notes to an alarm.
 * GET /api/alarms/notes/{uuid} on open to load history.
 * POST /api/alarms/notes on save with { uuids, note }.
 * Author derived from MX60.SharedEnv.getUser() (falls back to "Operador").
 *
 * Public API:
 *   open(uuid, alarmRecord)  → void
 *   close()                  → void
 *
 * REQ-G5-notes: textarea + history list [{message,author,date}].
 *
 * C5 — chihuahua-reflow-sanluis-replica
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var _modalRoot = null;
  var _currentUuid = null;

  // ── Escape helpers ────────────────────────────────────────────────────────────

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── XHR helpers ───────────────────────────────────────────────────────────────

  function _getConfig() {
    return (MX60.ConfigManager && MX60.ConfigManager.getConfig()) || {};
  }

  function _notesUrl() {
    var cfg = _getConfig();
    return (cfg.api && cfg.api.alarmNotes) || '/mx60/api/alarms/notes';
  }

  function _getNotes(uuid, callback) {
    var url = _notesUrl() + '/' + encodeURIComponent(uuid);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try {
          var notes = JSON.parse(xhr.responseText);
          callback(null, Array.isArray(notes) ? notes : []);
        } catch (e) {
          callback(null, []);
        }
      } else {
        callback('HTTP ' + xhr.status, []);
      }
    };
    xhr.onerror = function() { callback('Error de red', []); };
    xhr.send();
  }

  function _postNote(uuid, noteText, author, callback) {
    var url = _notesUrl();
    var body = JSON.stringify({ uuids: [uuid], note: noteText, author: author });
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200 || xhr.status === 204) {
        callback(null);
      } else {
        callback('HTTP ' + xhr.status);
      }
    };
    xhr.onerror = function() { callback('Error de red'); };
    xhr.send(body);
  }

  // ── Note history list HTML ────────────────────────────────────────────────────

  function _notesListHtml(notes) {
    if (!notes || notes.length === 0) {
      return '<p class="mx60-notes-empty">Sin notas anteriores.</p>';
    }
    var html = '<ul class="mx60-notes-list">';
    for (var i = notes.length - 1; i >= 0; i--) { // newest first
      var n = notes[i];
      html += '<li class="mx60-notes-item">' +
        '<div class="mx60-notes-meta">' +
          '<span class="mx60-notes-author">' + _esc(n.author || 'Sistema') + '</span>' +
          '<span class="mx60-notes-date">'   + _esc(n.date   || '')        + '</span>' +
        '</div>' +
        '<div class="mx60-notes-message">' + _esc(n.message || '') + '</div>' +
      '</li>';
    }
    html += '</ul>';
    return html;
  }

  // ── Modal HTML ────────────────────────────────────────────────────────────────

  function _buildModal(uuid) {
    return '<div class="mx60-notes-overlay" data-notes-action="close">' +
      '<div class="mx60-notes-modal" data-stop-prop="1">' +
        '<div class="mx60-notes-header">' +
          '<span class="mx60-notes-title">Notas de alarma</span>' +
          '<button type="button" class="mx60-notes-close" data-notes-action="close" ' +
            'aria-label="Cerrar">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
              'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<line x1="18" y1="6" x2="6" y2="18"/>' +
              '<line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="mx60-notes-body">' +
          '<div class="mx60-notes-history" data-notes-history>' +
            '<div class="mx60-notes-loading">Cargando notas...</div>' +
          '</div>' +
          '<div class="mx60-notes-compose">' +
            '<textarea class="mx60-notes-textarea" data-notes-input ' +
              'placeholder="Escriba una nota..." rows="3"></textarea>' +
            '<div class="mx60-notes-actions">' +
              '<span class="mx60-notes-error" data-notes-error></span>' +
              '<button type="button" class="mx60-btn mx60-btn--primary" data-notes-action="save">' +
                'Guardar nota' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ── Open / close ───────────────────────────────────────────────────────────────

  function open(uuid, alarmRecord) {
    if (_modalRoot) close();
    if (!uuid) return;
    _currentUuid = uuid;

    var root = document.createElement('div');
    root.id = 'mx60-notes-modal-root';
    root.innerHTML = _buildModal(uuid);
    document.body.appendChild(root);
    _modalRoot = root;

    document.body.style.overflow = 'hidden';

    // Load notes via GET
    var historyEl = root.querySelector('[data-notes-history]');
    _getNotes(uuid, function(err, notes) {
      if (!historyEl || !_modalRoot) return;
      if (err) {
        historyEl.innerHTML = '<p class="mx60-notes-error">Error al cargar notas: ' + _esc(err) + '</p>';
      } else {
        historyEl.innerHTML = _notesListHtml(notes);
      }
    });

    // Delegated click handler
    root.addEventListener('click', function(e) {
      var stop = e.target;
      while (stop && stop !== root && !stop.hasAttribute('data-stop-prop')) stop = stop.parentNode;

      var btn = e.target;
      while (btn && btn !== root && !btn.hasAttribute('data-notes-action')) btn = btn.parentNode;

      if (btn && btn !== root) {
        var action = btn.getAttribute('data-notes-action');
        if (action === 'close') {
          if (!stop || stop === root) { close(); return; }
          // if click on close button (inside modal)
          if (btn.hasAttribute('data-notes-action') && btn.getAttribute('data-notes-action') === 'close') {
            close(); return;
          }
        }
        if (action === 'save') {
          _doSave(root);
          return;
        }
      }

      // Click on overlay (not on modal body) → close
      if (e.target === root.firstChild) { close(); }
    }, false);
  }

  function _doSave(root) {
    var textarea   = root.querySelector('[data-notes-input]');
    var errorEl    = root.querySelector('[data-notes-error]');
    var historyEl  = root.querySelector('[data-notes-history]');
    var saveBtn    = root.querySelector('[data-notes-action="save"]');

    var noteText = textarea ? (textarea.value || '').trim() : '';
    if (!noteText) {
      if (errorEl) errorEl.textContent = 'La nota no puede estar vacía.';
      return;
    }
    if (errorEl) errorEl.textContent = '';

    var author = 'Operador';
    if (window.MX60 && MX60.SharedEnv && typeof MX60.SharedEnv.getUser === 'function') {
      author = MX60.SharedEnv.getUser() || 'Operador';
    }

    if (saveBtn) saveBtn.disabled = true;

    _postNote(_currentUuid, noteText, author, function(err) {
      if (!_modalRoot) return;
      if (saveBtn) saveBtn.disabled = false;
      if (err) {
        if (errorEl) errorEl.textContent = 'Error al guardar: ' + err;
        return;
      }
      // Clear textarea + reload notes
      if (textarea) textarea.value = '';
      // Reload note list
      _getNotes(_currentUuid, function(err2, notes) {
        if (!historyEl || !_modalRoot) return;
        historyEl.innerHTML = err2 ? _notesListHtml([]) : _notesListHtml(notes);
      });
    });
  }

  function close() {
    if (_modalRoot) {
      if (_modalRoot.parentNode) _modalRoot.parentNode.removeChild(_modalRoot);
      _modalRoot = null;
    }
    _currentUuid = null;
    document.body.style.overflow = '';
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  MX60.AlarmNotesModal = {
    open:  open,
    close: close
  };

  window.MX60 = MX60;

})(window);
