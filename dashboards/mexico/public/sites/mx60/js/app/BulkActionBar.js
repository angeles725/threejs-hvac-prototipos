/**
 * MX60.BulkActionBar
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Reusable sticky-top bulk action bar for selectable lists.
 *
 * Usage:
 *   var bar = MX60.BulkActionBar.mount(container, {
 *     getCount:   function() { return { selected: 3, alarms: 8 }; },
 *     getActions: function() { return [
 *       { id: 'ackAll',     label: 'Reconocer todas',         disabled: false },
 *       { id: 'ackRecent',  label: 'Reconocer más reciente',  disabled: false }
 *     ]; },
 *     onAction:   function(actionId) { ... },
 *     onClear:    function() { ... },
 *     formatText: function(c) { return c.selected + ' seleccionado(s) — ' + c.alarms + ' alarma(s)'; }
 *   });
 *   bar.update();   // re-render after selection state changes
 *   bar.destroy();  // remove from DOM, drop listeners
 *
 * Renders nothing while count.selected === 0.
 *
 * SDD-B chihuahua-alarms-bulk-and-export · REQ-B2, REQ-B5.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function mount(container, opts) {
    if (!container) return null;
    opts = opts || {};

    var bar = document.createElement('div');
    bar.className = 'mx60-bulk-bar';
    bar.style.display = 'none';
    container.insertBefore(bar, container.firstChild);

    var clickHandler = function(e) {
      var btn = e.target;
      while (btn && btn !== bar && btn.tagName !== 'BUTTON') btn = btn.parentNode;
      if (!btn || btn === bar || !btn.getAttribute) return;
      if (btn.hasAttribute('disabled')) return;
      var actionId = btn.getAttribute('data-action');
      if (actionId === '__clear__') {
        if (typeof opts.onClear === 'function') opts.onClear();
        return;
      }
      if (typeof opts.onAction === 'function') opts.onAction(actionId);
    };
    bar.addEventListener('click', clickHandler, false);

    function _render() {
      var count = (typeof opts.getCount === 'function') ? opts.getCount() : { selected: 0, alarms: 0 };
      if (!count || count.selected === 0) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
      }
      var actions = (typeof opts.getActions === 'function') ? opts.getActions() : [];
      var text = (typeof opts.formatText === 'function')
        ? opts.formatText(count)
        : (count.selected + ' seleccionado(s)' +
           (count.alarms != null ? (' — ' + count.alarms + ' alarma(s)') : ''));

      var html = '';
      html += '<div class="mx60-bulk-bar-text">' + _esc(text) + '</div>';
      html += '<div class="mx60-bulk-bar-actions">';
      for (var i = 0; i < actions.length; i++) {
        var a = actions[i];
        var cls = 'mx60-bulk-bar-btn' + (a.tone ? ' mx60-bulk-bar-btn--' + a.tone : '');
        html += '<button type="button" class="' + cls + '"' +
                ' data-action="' + _esc(a.id) + '"' +
                (a.disabled ? ' disabled' : '') + '>' +
                _esc(a.label) + '</button>';
      }
      html += '<button type="button" class="mx60-bulk-bar-btn mx60-bulk-bar-btn--ghost"' +
              ' data-action="__clear__">Limpiar selección</button>';
      html += '</div>';
      bar.innerHTML = html;
      bar.style.display = 'flex';
    }

    _render();

    return {
      update:  _render,
      destroy: function() {
        if (bar.parentNode) {
          bar.removeEventListener('click', clickHandler, false);
          bar.parentNode.removeChild(bar);
        }
      },
      element: bar
    };
  }

  MX60.BulkActionBar = {
    mount: mount
  };

  window.MX60 = MX60;

})(window);
