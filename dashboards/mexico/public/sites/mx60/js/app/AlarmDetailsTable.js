/**
 * MX60.AlarmDetailsTable
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Alarm details drill-down table.
 * 8 columns: Hora / Prioridad / Estado fuente / Transición / Reconocimiento /
 *            Última act. / Mensaje / acciones (3-dot popover)
 * Plus optional leading checkbox column when opts.withCheckbox is true.
 *
 * Public API:
 *   render(container, rows, opts)      → HTMLElement
 *   update(el, rows)                   → void
 *   getSelected(el)                    → Set<rowIndex>  (when withCheckbox)
 *   onRowClick(fn)                     → void  (receives alarm record on tr click)
 *   onRowAction(fn)                    → void  (receives { kind, row } from popover)
 *   onSelectionChange(fn)              → void  (receives Set<rowIndex>)
 *   removeRowClickListener(fn)         → void
 *   removeRowActionListener(fn)        → void
 *   removeSelectionListener(fn)        → void
 *
 * SDD-A: extended with action popover + ack-state cell + transition cell.
 * SDD-B: extended with optional checkbox column for bulk select.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  var COL_HEADERS = [
    'Hora', 'Prioridad', 'Estado fuente', 'Transición',
    'Reconocimiento', 'Última act.', 'Mensaje', ''
  ];

  var _rowClickListeners   = [];
  var _rowActionListeners  = [];
  var _selectionListeners  = [];

  // ── Helpers ───────────────────────────────────────────────────────────────────

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
      var yy = d.getFullYear();
      var mm = _pad(d.getMonth() + 1);
      var dd = _pad(d.getDate());
      var hh = _pad(d.getHours());
      var mi = _pad(d.getMinutes());
      var ss = _pad(d.getSeconds());
      return yy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi + ':' + ss;
    } catch (e) { return String(ts); }
  }

  function _pad(n) { return n < 10 ? '0' + n : String(n); }

  function _relTime(ts) {
    if (MX60.util && MX60.util.RelativeTime) {
      return '<span title="' + _esc(MX60.util.RelativeTime.absolute(ts)) + '">' +
             _esc(MX60.util.RelativeTime.format(ts)) + '</span>';
    }
    return _esc(_fmtDate(ts));
  }

  function _priorityBadge(p) {
    var label = p || '—';
    var cls = 'mx60-pri-badge';
    var low = String(p || '').toLowerCase();
    if (low === 'high' || low === 'alto')      cls += ' mx60-pri-high';
    else if (low === 'med' || low === 'medio') cls += ' mx60-pri-med';
    else if (low === 'low' || low === 'bajo')  cls += ' mx60-pri-low';
    return '<span class="' + cls + '">' + _esc(label) + '</span>';
  }

  function _transitionCell(t) {
    var raw = String(t || '').replace(/^\s+|\s+$/g, '');
    if (!raw) return '<span class="mx60-adt-transition">—</span>';
    var parts = raw.split(/\s*(?:->|=>|→|\bto\b)\s*/i);
    var low = raw.toLowerCase();
    var cls = 'mx60-adt-transition';
    if (low.indexOf('fault') >= 0 || low.indexOf('offnormal') >= 0) {
      cls += ' mx60-adt-trans--fault';
    } else if (low.indexOf('normal') >= 0) {
      cls += ' mx60-adt-trans--normal';
    }
    if (parts.length === 2) {
      return '<span class="' + cls + '">' +
             _esc(parts[0]) +
             ' <span class="mx60-adt-arrow" aria-hidden="true">&#8594;</span> ' +
             _esc(parts[1]) +
             '</span>';
    }
    return '<span class="' + cls + '">' + _esc(raw) + '</span>';
  }

  function _ackStateCell(ackState) {
    var s = String(ackState || '').toLowerCase();
    var acked = (s === 'acked' || s === 'reconocida' || s === 'reconocido');
    if (acked) {
      return '<span class="mx60-adt-ack mx60-adt-ack--acked">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
          'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="20 6 9 17 4 12"/>' +
        '</svg> Reconocida</span>';
    }
    return '<span class="mx60-adt-ack mx60-adt-ack--unacked">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
        '<line x1="12" y1="9" x2="12" y2="13"/>' +
        '<line x1="12" y1="17" x2="12.01" y2="17"/>' +
      '</svg> Sin reconocer</span>';
  }

  function _actionPopoverContent(row) {
    var div = document.createElement('div');
    div.className = 'mx60-action-popover';

    function _btn(label, disabled, kind) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'mx60-action-popover-btn';
      if (disabled) {
        b.disabled = true;
        b.setAttribute('title', 'No disponible');
      }
      b.textContent = label;
      if (!disabled) {
        b.addEventListener('click', function() {
          _notifyRowAction({ kind: kind, row: row });
        }, false);
      }
      return b;
    }

    var ackedAlready = String(row.ackState || '').toLowerCase() === 'acked';
    div.appendChild(_btn('Reconocer', ackedAlready || !row.uuid, 'ack'));
    div.appendChild(_btn('Notas', false, 'notes'));
    div.appendChild(_btn('Detalles', false, 'details'));
    return div;
  }

  // ── Row HTML ──────────────────────────────────────────────────────────────────

  function _rowHtml(row, index, withCheckbox, selectedSet) {
    var checkboxCell = '';
    if (withCheckbox) {
      var checked = (selectedSet && selectedSet[index]) ? ' checked' : '';
      checkboxCell = '<td class="mx60-adt-check">' +
        '<input type="checkbox" class="mx60-bulk-checkbox" data-row-index="' + index + '"' + checked + '>' +
      '</td>';
    }
    return '<tr class="mx60-adt-row" data-row-index="' + index + '">' +
      checkboxCell +
      '<td>' + _relTime(row.timestamp) + '</td>' +
      '<td>' + _priorityBadge(row.priority) + '</td>' +
      '<td>' + _esc(row.sourceState  || '—') + '</td>' +
      '<td>' + _transitionCell(row.alarmTransition) + '</td>' +
      '<td>' + _ackStateCell(row.ackState) + '</td>' +
      '<td>' + _relTime(row.lastUpdate) + '</td>' +
      '<td class="mx60-adt-msg">' + _esc(row.message || '—') + '</td>' +
      '<td class="mx60-adt-action"><button type="button" class="mx60-action-dot" data-action-row="' + index + '" aria-label="Acciones">&#8942;</button></td>' +
    '</tr>';
  }

  function _renderInto(el, rows) {
    rows = rows || [];
    var withCheckbox = !!el._adtWithCheckbox;
    var selectedSet  = el._adtSelected || {};
    var html = '';

    if (rows.length === 0) {
      html = '<div class="mx60-adt-empty">No hay registros de alarma para esta fuente.</div>';
    } else {
      html += '<div class="mx60-adt-wrap"><table class="mx60-adt-table">' +
        '<thead><tr>';
      if (withCheckbox) {
        html += '<th class="mx60-adt-check"><input type="checkbox" class="mx60-bulk-checkbox" data-row-index="__all__" aria-label="Seleccionar todos"></th>';
      }
      for (var h = 0; h < COL_HEADERS.length; h++) {
        html += '<th>' + _esc(COL_HEADERS[h]) + '</th>';
      }
      html += '</tr></thead><tbody>';
      for (var i = 0; i < rows.length; i++) {
        html += _rowHtml(rows[i], i, withCheckbox, selectedSet);
      }
      html += '</tbody></table></div>';
    }

    el.innerHTML = html;
    el._adtRows = rows;

    // Refresh master checkbox state
    if (withCheckbox) {
      _syncMasterCheckbox(el);
    }
  }

  function _syncMasterCheckbox(el) {
    var master = el.querySelector('thead input.mx60-bulk-checkbox[data-row-index="__all__"]');
    if (!master) return;
    var rowsLen = (el._adtRows || []).length;
    var sel = el._adtSelected || {};
    var count = 0;
    for (var k in sel) { if (sel[k]) count++; }
    master.checked = (count > 0 && count === rowsLen);
    master.indeterminate = (count > 0 && count < rowsLen);
  }

  // ── Render API ────────────────────────────────────────────────────────────────

  function render(container, rows, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'mx60-adt';
    el._adtWithCheckbox = !!opts.withCheckbox;
    el._adtSelected     = {};
    _renderInto(el, rows);

    el.addEventListener('click', function(e) {
      // Bulk checkbox click — toggle selection (and stop propagation so row-click doesn't fire)
      var cb = e.target;
      if (cb && cb.tagName === 'INPUT' && cb.classList && cb.classList.contains('mx60-bulk-checkbox')) {
        var idxAttr = cb.getAttribute('data-row-index');
        if (idxAttr === '__all__') {
          // Master toggles all
          var allLen = (el._adtRows || []).length;
          var newSel = {};
          if (cb.checked) {
            for (var x = 0; x < allLen; x++) newSel[x] = true;
          }
          el._adtSelected = newSel;
          // Re-render rows' checked states
          var allRowCbs = el.querySelectorAll('tbody input.mx60-bulk-checkbox');
          for (var r = 0; r < allRowCbs.length; r++) {
            var ridx = parseInt(allRowCbs[r].getAttribute('data-row-index'), 10);
            allRowCbs[r].checked = !!el._adtSelected[ridx];
          }
          _syncMasterCheckbox(el);
          _notifySelection(el);
          e.stopPropagation();
          return;
        }
        var idx = parseInt(idxAttr, 10);
        if (!isNaN(idx)) {
          if (cb.checked) el._adtSelected[idx] = true;
          else delete el._adtSelected[idx];
          _syncMasterCheckbox(el);
          _notifySelection(el);
        }
        e.stopPropagation();
        return;
      }

      // Action dot → popover
      var dotBtn = e.target;
      while (dotBtn && dotBtn !== el && dotBtn.nodeName !== 'BUTTON') {
        dotBtn = dotBtn.parentNode;
      }
      if (dotBtn && dotBtn !== el && dotBtn.hasAttribute && dotBtn.hasAttribute('data-action-row')) {
        var rowIdx = parseInt(dotBtn.getAttribute('data-action-row'), 10);
        if (!isNaN(rowIdx) && el._adtRows && el._adtRows[rowIdx]) {
          var rowData = el._adtRows[rowIdx];
          if (MX60.util && MX60.util.Popover) {
            var pop = MX60.util.Popover.attach(dotBtn, function() {
              return _actionPopoverContent(rowData);
            }, { placement: 'auto', offset: 4 });
            pop.open();
          }
        }
        e.stopPropagation();
        return;
      }

      // Row click → navigate notifier
      var tr = e.target;
      while (tr && tr !== el && tr.nodeName !== 'TR') tr = tr.parentNode;
      if (tr && tr.nodeName === 'TR' && tr.hasAttribute('data-row-index')) {
        var td = e.target;
        while (td && td !== tr && td.nodeName !== 'TD') td = td.parentNode;
        if (td && td.className && td.className.indexOf('mx60-adt-action') >= 0) return;
        if (td && td.className && td.className.indexOf('mx60-adt-check') >= 0) return;
        var ridx = parseInt(tr.getAttribute('data-row-index'), 10);
        if (!isNaN(ridx) && el._adtRows && el._adtRows[ridx]) {
          _notifyRowClick(el._adtRows[ridx]);
        }
      }
    }, false);

    if (container) container.appendChild(el);
    return el;
  }

  function update(el, rows) {
    if (!el) return;
    // Drop selection indices that no longer exist in new rows
    if (el._adtWithCheckbox && el._adtSelected) {
      var newLen = (rows || []).length;
      var pruned = {};
      for (var k in el._adtSelected) {
        var idx = parseInt(k, 10);
        if (!isNaN(idx) && idx < newLen) pruned[idx] = el._adtSelected[k];
      }
      el._adtSelected = pruned;
    }
    _renderInto(el, rows);
  }

  function getSelected(el) {
    if (!el) return [];
    var out = [];
    var sel = el._adtSelected || {};
    var rows = el._adtRows || [];
    for (var k in sel) {
      var idx = parseInt(k, 10);
      if (!isNaN(idx) && rows[idx]) out.push(rows[idx]);
    }
    return out;
  }

  // ── Listeners ─────────────────────────────────────────────────────────────────

  function onRowClick(fn) {
    if (typeof fn === 'function' && _rowClickListeners.indexOf(fn) < 0) _rowClickListeners.push(fn);
  }
  function removeRowClickListener(fn) {
    var idx = _rowClickListeners.indexOf(fn);
    if (idx >= 0) _rowClickListeners.splice(idx, 1);
  }
  function _notifyRowClick(row) {
    for (var i = 0; i < _rowClickListeners.length; i++) {
      try { _rowClickListeners[i](row); } catch (e) { /* isolate */ }
    }
  }

  function onRowAction(fn) {
    if (typeof fn === 'function' && _rowActionListeners.indexOf(fn) < 0) _rowActionListeners.push(fn);
  }
  function removeRowActionListener(fn) {
    var idx = _rowActionListeners.indexOf(fn);
    if (idx >= 0) _rowActionListeners.splice(idx, 1);
  }
  function _notifyRowAction(payload) {
    for (var i = 0; i < _rowActionListeners.length; i++) {
      try { _rowActionListeners[i](payload); } catch (e) { /* isolate */ }
    }
  }

  function onSelectionChange(fn) {
    if (typeof fn === 'function' && _selectionListeners.indexOf(fn) < 0) _selectionListeners.push(fn);
  }
  function removeSelectionListener(fn) {
    var idx = _selectionListeners.indexOf(fn);
    if (idx >= 0) _selectionListeners.splice(idx, 1);
  }
  function _notifySelection(el) {
    var selectedRows = getSelected(el);
    for (var i = 0; i < _selectionListeners.length; i++) {
      try { _selectionListeners[i](selectedRows); } catch (e) { /* isolate */ }
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────────

  MX60.AlarmDetailsTable = {
    render:                  render,
    update:                  update,
    getSelected:             getSelected,
    onRowClick:              onRowClick,
    onRowAction:             onRowAction,
    onSelectionChange:       onSelectionChange,
    removeRowClickListener:  removeRowClickListener,
    removeRowActionListener: removeRowActionListener,
    removeSelectionListener: removeSelectionListener,
    COL_HEADERS:             COL_HEADERS
  };

  window.MX60 = MX60;

})(window);
