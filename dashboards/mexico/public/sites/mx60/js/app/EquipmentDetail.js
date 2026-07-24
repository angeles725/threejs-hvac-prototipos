/**
 * EquipmentDetail.js — MX60 namespace
 *
 * Dispatch-by-type orchestrator. Reads route.params[0] = equipment id, looks
 * up the equipment in EquipmentData, finds its type, and routes to the
 * matching detail renderer.
 *
 * Sub-paso 2: every type renders a placeholder. Sub-paso 3 will register real
 * renderers via MX60.EquipmentDetail.registerRenderer(type, fn).
 *
 * Public API:
 *   render(container, equip)
 *   registerRenderer(type, fn)  — fn(container, equip) returns void
 *   destroy()
 *
 * ES5 STRICT.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  var _renderers = {};
  var _container = null;
  var _onBackClick = null;
  var _currentInstance = null;

  function _placeholder(container, equip) {
    var typeLabel = equip.type
      ? equip.type.charAt(0).toUpperCase() + equip.type.substring(1)
      : 'Equipment';
    container.innerHTML =
      '<div class="detail-shell">' +
        '<div class="detail-header">' +
          '<button type="button" class="detail-back" data-action="back">&larr; Volver</button>' +
          '<div class="detail-title-wrap">' +
            '<span class="detail-type-tag detail-type-' + escAttr(equip.type) + '">' + escHtml(typeLabel) + '</span>' +
            '<h2 class="detail-title">' + escHtml(equip.label || equip.id) + '</h2>' +
            (function(){
              // AP5 fix: respect StatusResolver so latched alarms show through
              // even on the fallback placeholder header.
              var st = (window.MX60 && MX60.StatusResolver &&
                        typeof MX60.StatusResolver.effectiveStatus === 'function')
                ? (MX60.StatusResolver.effectiveStatus(equip) || equip.status || 'online')
                : (equip.status || 'online');
              return '<span class="detail-status status-' + escAttr(st) + '">' +
                       escHtml(st) +
                     '</span>';
            })() +
          '</div>' +
        '</div>' +
        '<div class="detail-body">' +
          '<div class="placeholder-card">' +
            '<div class="placeholder-icon">⏳</div>' +
            '<div class="placeholder-title">' + escHtml(typeLabel) + 'Detail.js — sub-paso 3</div>' +
            '<div class="placeholder-body">' +
              'Vista detallada de <code>' + escHtml(equip.id) + '</code> ' +
              '(<code>' + escHtml(equip.type) + '</code>) se implementa en sub-paso 3.' +
            '</div>' +
            '<dl class="placeholder-data">' +
              '<dt>ord</dt><dd><code>' + escHtml(equip.ord || '—') + '</code></dd>' +
              _summaryDl(equip) +
            '</dl>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function _summaryDl(equip) {
    var s = equip.summary;
    if (!s || typeof s !== 'object') return '';
    var html = '';
    for (var k in s) {
      if (s.hasOwnProperty(k)) {
        var v = s[k];
        if (v === null || v === undefined) v = '—';
        html += '<dt>' + escHtml(k) + '</dt><dd>' + escHtml(String(v)) + '</dd>';
      }
    }
    return html;
  }

  function render(container, equip) {
    if (!container) return;
    _container = container;
    if (!equip) {
      container.innerHTML =
        '<div class="detail-shell">' +
          '<div class="detail-not-found">' +
            '<div class="placeholder-title">Equipo no encontrado</div>' +
            '<button type="button" class="detail-back" data-action="back">&larr; Volver</button>' +
          '</div>' +
        '</div>';
      _wireBack(container);
      return;
    }

    // If a previous instance is still alive (defensive), tear it down first.
    if (_currentInstance) {
      try { _currentInstance.destroy(); } catch (e) {}
      _currentInstance = null;
    }

    var fn = _renderers[equip.type];
    if (typeof fn === 'function') {
      var inst = fn(container, equip);
      if (inst && typeof inst.destroy === 'function') _currentInstance = inst;
    } else {
      _placeholder(container, equip);
    }
    _wireBack(container);
  }

  function _wireBack(container) {
    _onBackClick = function(e) {
      // Use closest() to bubble through SVG/polyline children of the button.
      // Without this, clicks on the chevron icon would pass `e.target` as the
      // <svg> or <polyline>, which lack data-action and silently no-op.
      var t = e.target;
      if (!t || !t.closest) return;
      var hit = t.closest('[data-action="back"]');
      if (hit && container.contains(hit)) {
        if (MX60.Router) MX60.Router.navigate('#equipment');
      }
    };
    container.addEventListener('click', _onBackClick, false);
  }

  function registerRenderer(type, fn) {
    if (!type || typeof fn !== 'function') return;
    _renderers[type] = fn;
  }

  function destroy() {
    if (_currentInstance) {
      try { _currentInstance.destroy(); } catch (e) {}
      _currentInstance = null;
    }
    if (_container && _onBackClick) {
      _container.removeEventListener('click', _onBackClick, false);
    }
    _container = null;
    _onBackClick = null;
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s == null ? '' : String(s)));
    return d.innerHTML;
  }
  function escAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  MX60.EquipmentDetail = {
    render:           render,
    registerRenderer: registerRenderer,
    destroy:          destroy
  };

  // -------------------------------------------------------------------------
  // DetailPage — DashboardApp page lifecycle wrapper
  // -------------------------------------------------------------------------

  var DetailPage = {
    mount: function(container, route) {
      var id = route && route.params && route.params[0] ? route.params[0] : null;
      if (!id) {
        render(container, null);
        return;
      }
      MX60.EquipmentData.load(function(state) {
        var equip = state.byId[id] || null;
        render(container, equip);
      });
    },
    destroy: function() {
      destroy();
    }
  };

  MX60.DetailPage = DetailPage;
  if (MX60.DashboardApp && typeof MX60.DashboardApp.registerPage === 'function') {
    MX60.DashboardApp.registerPage('detail', DetailPage);
  }

  window.MX60 = MX60;

})(window);
