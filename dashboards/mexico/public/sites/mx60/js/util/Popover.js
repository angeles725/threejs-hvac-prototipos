/**
 * MX60.util.Popover
 * IIFE · MX60 namespace · ES5 STRICT
 *
 * Single shared body-level popover. Only one open at a time.
 * Click-outside, ESC, and scroll all close it.
 *
 * Public API (attach factory):
 *   MX60.util.Popover.attach(triggerEl, contentBuilder, opts) → instance
 *     triggerEl:      HTMLElement that triggers the popover
 *     contentBuilder: function() → HTMLElement|string — called on every open()
 *     opts:           { placement: 'left'|'right'|'auto', offset: 8 }
 *   instance: { open(), close(), destroy() }
 *
 * REQ-4, ADR-2 — chihuahua-alarms-reflow-visual-and-ack-fix
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 = window.MX60 || {};
  MX60.util = MX60.util || {};

  // Single shared node — reused across all popover instances
  var _sharedNode = null;
  var _activeInstance = null;

  function _ensureSharedNode() {
    if (!_sharedNode) {
      _sharedNode = document.createElement('div');
      _sharedNode.className = 'mx60-popover';
      _sharedNode.style.cssText = 'position:fixed;z-index:9100;display:none;';
      document.body.appendChild(_sharedNode);
    }
    return _sharedNode;
  }

  function _hideShared() {
    if (_sharedNode) {
      _sharedNode.style.display = 'none';
      _sharedNode.innerHTML = '';
    }
    _activeInstance = null;
    document.removeEventListener('mousedown', _onDocMousedown, false);
    document.removeEventListener('keydown',   _onDocKeydown,   false);
    window.removeEventListener('scroll',      _onScroll,       true);
  }

  function _onDocMousedown(e) {
    if (!_sharedNode) return;
    if (!_sharedNode.contains(e.target) &&
        _activeInstance && !_activeInstance._triggerEl.contains(e.target)) {
      _hideShared();
    }
  }

  function _onDocKeydown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      _hideShared();
    }
  }

  function _onScroll() {
    _hideShared();
  }

  function attach(triggerEl, contentBuilder, opts) {
    opts = opts || {};
    var placement = opts.placement || 'auto';
    var offset    = opts.offset != null ? opts.offset : 8;

    function open() {
      // Close any existing active instance
      if (_activeInstance && _activeInstance !== _self) {
        _activeInstance.close();
      }

      var node = _ensureSharedNode();

      // Build content
      node.innerHTML = '';
      var content = contentBuilder();
      if (typeof content === 'string') {
        node.innerHTML = content;
      } else if (content && content.nodeType) {
        node.appendChild(content);
      }
      node.style.display = 'block';

      // Position: use getBoundingClientRect for fixed positioning
      var rect = triggerEl.getBoundingClientRect();
      var popW = node.offsetWidth  || 220;
      var popH = node.offsetHeight || 160;
      var vw   = window.innerWidth  || document.documentElement.clientWidth  || 800;
      var vh   = window.innerHeight || document.documentElement.clientHeight || 600;

      // Horizontal placement
      var left;
      if (placement === 'right') {
        left = rect.right + offset;
      } else if (placement === 'left') {
        left = rect.left - popW - offset;
      } else {
        // auto: prefer right of trigger; flip left if clips
        left = rect.left;
        if (left + popW > vw - 8) {
          left = rect.right - popW;
        }
      }
      if (left < 4) left = 4;

      // Vertical placement: below trigger; flip above if clips
      var top = rect.bottom + offset;
      if (top + popH > vh - 8) {
        top = rect.top - popH - offset;
      }
      if (top < 4) top = 4;

      node.style.left = left + 'px';
      node.style.top  = top  + 'px';

      _activeInstance = _self;

      document.addEventListener('mousedown', _onDocMousedown, false);
      document.addEventListener('keydown',   _onDocKeydown,   false);
      window.addEventListener('scroll',      _onScroll,       true);
    }

    function close() {
      if (_activeInstance === _self) {
        _hideShared();
      }
    }

    function destroy() {
      close();
      // Nothing to unbind on the trigger — caller manages trigger lifecycle
    }

    var _self = {
      open:        open,
      close:       close,
      destroy:     destroy,
      _triggerEl:  triggerEl
    };
    return _self;
  }

  MX60.util.Popover = { attach: attach };
  window.MX60 = MX60;

})(window);
