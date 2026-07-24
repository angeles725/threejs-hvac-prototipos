/**
 * MX60.util.Dropdown
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Generic custom dropdown. Replaces native <select> for theming in
 * iSMA 4.13.2 embedded browser.
 *
 * Public API (factory):
 *   MX60.util.Dropdown.create(options) → instance
 *     options: { label, items: [{value,label}], initialValue, ariaLabel }
 *   instance: { mount(container), getValue(), setValue(v), onChange(fn), destroy() }
 *
 * Single-active enforcement: opening one dropdown closes any other.
 *
 * REQ-3, ADR-1 — chihuahua-alarms-reflow-visual-and-ack-fix
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};
  MX60.util = MX60.util || {};

  // Module-level pointer to the currently open dropdown instance
  var _activeDropdown = null;

  function create(options) {
    options = options || {};
    var items        = options.items        || [];
    var initialValue = options.initialValue || (items.length > 0 ? items[0].value : '');
    var ariaLabel    = options.ariaLabel    || options.label || 'Seleccionar';

    var _value     = initialValue;
    var _open      = false;
    var _listeners = [];
    var _rootEl    = null;
    var _triggerEl = null;
    var _panelEl   = null;
    var _labelEl   = null;

    // ── Helpers ──────────────────────────────────────────────────────────────

    function _labelFor(v) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].value === v) return items[i].label;
      }
      return v;
    }

    function _notify(v) {
      for (var i = 0; i < _listeners.length; i++) {
        try { _listeners[i](v); } catch (e) { /* isolate */ }
      }
    }

    // ── DOM builders ─────────────────────────────────────────────────────────

    function _buildPanel() {
      var ul = document.createElement('ul');
      ul.className = 'mx60-dd-panel';
      ul.setAttribute('role', 'listbox');
      for (var i = 0; i < items.length; i++) {
        var li = document.createElement('li');
        li.className = 'mx60-dd-item' + (items[i].value === _value ? ' mx60-dd-item--selected' : '');
        li.setAttribute('data-dd-value', items[i].value);
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', items[i].value === _value ? 'true' : 'false');
        li.textContent = items[i].label;
        ul.appendChild(li);
      }
      return ul;
    }

    function _chevronSvg() {
      return '<svg class="mx60-dd-chevron" width="12" height="12" viewBox="0 0 24 24" ' +
        'fill="none" stroke="currentColor" stroke-width="2.5" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="6 9 12 15 18 9"/></svg>';
    }

    // ── Open / close ─────────────────────────────────────────────────────────

    function _closeActive() {
      if (_activeDropdown && _activeDropdown !== _self) {
        _activeDropdown.close();
      }
    }

    function _openPanel() {
      if (_open) return;
      _closeActive();
      _open = true;
      _activeDropdown = _self;
      _rootEl.classList.add('mx60-dd--open');
      if (_panelEl && _panelEl.parentNode) _panelEl.parentNode.removeChild(_panelEl);
      _panelEl = _buildPanel();
      _rootEl.appendChild(_panelEl);
      document.addEventListener('mousedown', _onDocMousedown, false);
      document.addEventListener('keydown',   _onDocKeydown,   false);
    }

    function _closePanel() {
      if (!_open) return;
      _open = false;
      if (_activeDropdown === _self) _activeDropdown = null;
      _rootEl.classList.remove('mx60-dd--open');
      if (_panelEl && _panelEl.parentNode) {
        _panelEl.parentNode.removeChild(_panelEl);
      }
      _panelEl = null;
      document.removeEventListener('mousedown', _onDocMousedown, false);
      document.removeEventListener('keydown',   _onDocKeydown,   false);
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    function _onTriggerClick(e) {
      e.stopPropagation();
      if (_open) { _closePanel(); } else { _openPanel(); }
    }

    function _onPanelClick(e) {
      var li = e.target;
      while (li && li !== _panelEl && li.nodeName !== 'LI') li = li.parentNode;
      if (!li || li === _panelEl) return;
      var v = li.getAttribute('data-dd-value');
      if (v == null) return;
      _value = v;
      _labelEl.textContent = _labelFor(v);
      _closePanel();
      _notify(v);
    }

    function _onDocMousedown(e) {
      if (_rootEl && !_rootEl.contains(e.target)) {
        _closePanel();
      }
    }

    function _onDocKeydown(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        _closePanel();
      }
    }

    // ── Public methods ────────────────────────────────────────────────────────

    function mount(container) {
      _rootEl = document.createElement('div');
      _rootEl.className = 'mx60-dd';

      _triggerEl = document.createElement('button');
      _triggerEl.type = 'button';
      _triggerEl.className = 'mx60-dd-trigger';
      _triggerEl.setAttribute('aria-haspopup', 'listbox');
      _triggerEl.setAttribute('aria-label', ariaLabel);

      _labelEl = document.createElement('span');
      _labelEl.className = 'mx60-dd-trigger-label';
      _labelEl.textContent = _labelFor(_value);

      _triggerEl.appendChild(_labelEl);
      _triggerEl.innerHTML += _chevronSvg();

      _triggerEl.addEventListener('click', _onTriggerClick, false);
      _rootEl.addEventListener('click', function(e) {
        if (_panelEl && _panelEl.contains(e.target)) {
          _onPanelClick(e);
        }
      }, false);

      _rootEl.appendChild(_triggerEl);
      if (container) container.appendChild(_rootEl);
      return _rootEl;
    }

    function getValue() { return _value; }

    function setValue(v) {
      if (!_isValidValue(v)) return;
      _value = v;
      if (_labelEl) _labelEl.textContent = _labelFor(v);
    }

    function _isValidValue(v) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].value === v) return true;
      }
      return false;
    }

    function onChange(fn) {
      if (typeof fn === 'function' && _listeners.indexOf(fn) < 0) {
        _listeners.push(fn);
      }
    }

    function destroy() {
      _closePanel();
      if (_triggerEl) _triggerEl.removeEventListener('click', _onTriggerClick, false);
      if (_rootEl && _rootEl.parentNode) _rootEl.parentNode.removeChild(_rootEl);
      _rootEl = null;
      _triggerEl = null;
      _labelEl = null;
      _listeners = [];
    }

    function close() { _closePanel(); }

    var _self = {
      mount:    mount,
      getValue: getValue,
      setValue: setValue,
      onChange: onChange,
      destroy:  destroy,
      close:    close
    };
    return _self;
  }

  MX60.util.Dropdown = { create: create };
  window.MX60 = MX60;

})(window);
