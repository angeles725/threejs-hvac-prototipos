/**
 * MX60.Confirm
 *
 * Lightweight blocking confirmation dialog. Single instance — calling show()
 * while one is open replaces it (the previous onCancel fires).
 *
 *   MX60.Confirm.show({
 *     title:        'Cambiar setpoint',
 *     message:      '¿Confirmar setpoint a 22.5 °C?',
 *     confirmLabel: 'Confirmar',     // default: 'Confirmar'
 *     cancelLabel:  'Cancelar',      // default: 'Cancelar'
 *     tone:         'neutral',       // 'neutral' (default) | 'danger'
 *     onConfirm:    function () { ... },
 *     onCancel:     function () { ... }
 *   });
 *
 * Keyboard: Enter → confirm, Escape → cancel. Click on backdrop also cancels.
 */
(function () {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  let _root = null;
  let _onConfirm = null;
  let _onCancel = null;
  let _backdrop = null;
  let _confirmBtn = null;
  let _cancelBtn = null;
  let _keyHandler = null;

  function _build() {
    const overlay = document.createElement('div');
    overlay.className = 'mx60-confirm-backdrop';
    overlay.innerHTML =
      '<div class="mx60-confirm-dialog" role="dialog" aria-modal="true">' +
        '<div class="mx60-confirm-title" data-mx60-confirm-title></div>' +
        '<div class="mx60-confirm-message" data-mx60-confirm-message></div>' +
        '<div class="mx60-confirm-actions">' +
          '<button type="button" class="mx60-confirm-btn mx60-confirm-cancel" data-mx60-confirm-cancel>Cancelar</button>' +
          '<button type="button" class="mx60-confirm-btn mx60-confirm-ok" data-mx60-confirm-ok>Confirmar</button>' +
        '</div>' +
      '</div>';
    return overlay;
  }

  function _close(invoke) {
    if (!_root) return;
    const onConfirm = _onConfirm;
    const onCancel = _onCancel;
    _onConfirm = null;
    _onCancel = null;
    if (_keyHandler) {
      document.removeEventListener('keydown', _keyHandler, true);
      _keyHandler = null;
    }
    try { document.body.removeChild(_root); } catch (e) {}
    _root = null;
    _backdrop = null;
    _confirmBtn = null;
    _cancelBtn = null;
    if (invoke === 'confirm' && typeof onConfirm === 'function') {
      try { onConfirm(); } catch (e) {}
    } else if (invoke === 'cancel' && typeof onCancel === 'function') {
      try { onCancel(); } catch (e) {}
    }
  }

  function show(opts) {
    opts = opts || {};
    // Replace any existing open dialog by cancelling it cleanly first.
    if (_root) _close('cancel');

    _root = _build();
    const titleEl   = _root.querySelector('[data-mx60-confirm-title]');
    const msgEl     = _root.querySelector('[data-mx60-confirm-message]');
    _confirmBtn = _root.querySelector('[data-mx60-confirm-ok]');
    _cancelBtn  = _root.querySelector('[data-mx60-confirm-cancel]');

    titleEl.textContent = opts.title || 'Confirmar';
    msgEl.textContent   = opts.message || '';
    _confirmBtn.textContent = opts.confirmLabel || 'Confirmar';
    _cancelBtn.textContent  = opts.cancelLabel  || 'Cancelar';
    if (opts.tone === 'danger') _confirmBtn.classList.add('is-danger');

    _onConfirm = opts.onConfirm || null;
    _onCancel  = opts.onCancel  || null;

    _confirmBtn.addEventListener('click', function () { _close('confirm'); }, false);
    _cancelBtn.addEventListener('click',  function () { _close('cancel');  }, false);
    _root.addEventListener('click', function (e) {
      // Backdrop click cancels (only if click landed on the overlay, not the dialog).
      if (e.target === _root) _close('cancel');
    }, false);

    _keyHandler = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); _close('cancel'); }
      else if (e.key === 'Enter') { e.preventDefault(); _close('confirm'); }
    };
    document.addEventListener('keydown', _keyHandler, true);

    document.body.appendChild(_root);
    // Focus the confirm button on next frame so the dialog reads cleanly to AT.
    requestAnimationFrame(function () {
      if (_confirmBtn) _confirmBtn.focus();
    });
  }

  function isOpen() {
    return _root != null;
  }

  window.MX60.Confirm = {
    show: show,
    isOpen: isOpen
  };
})();
