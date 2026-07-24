/**
 * MX60.Toast — bottom-right toast queue with optional 5s undo window.
 *
 * Pattern: Gmail-style "you did X, undo?" — gives the operator immediate
 * visual feedback that the action took effect AND a short escape hatch in
 * case the action was accidental. Auto-commit fires after `durationMs` if
 * the undo button is not clicked.
 *
 * Only one toast is visible at a time. If `show()` is called while another
 * toast is active, the active one auto-commits immediately (so its onCommit
 * runs and we don't lose state) and is replaced by the new one.
 *
 * API:
 *   MX60.Toast.show({
 *     message:    string,           // visible text
 *     undoLabel:  string,           // button text (default 'Deshacer')
 *     durationMs: number,           // ms before auto-commit (default 5000)
 *     onCommit:   () => void,       // fired after timeout (persist the change)
 *     onUndo:     () => void        // fired on undo click (revert the change)
 *   });
 *
 * If neither onCommit nor onUndo is provided, the toast is purely informational.
 */
(function() {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  var _container = null;
  var _activeToast = null;

  function _ensureContainer() {
    if (_container) return _container;
    _container = document.createElement('div');
    _container.className = 'mx60-toast-container';
    document.body.appendChild(_container);
    return _container;
  }

  function _removeElement(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function _commitActive() {
    if (!_activeToast) return;
    var t = _activeToast;
    _activeToast = null;
    if (t.commitTimer) { clearTimeout(t.commitTimer); t.commitTimer = null; }
    if (t.element) {
      t.element.classList.add('is-leaving');
      setTimeout(function() { _removeElement(t.element); }, 200);
    }
    if (typeof t.onCommit === 'function') {
      try { t.onCommit(); } catch (e) {}
    }
  }

  function show(opts) {
    opts = opts || {};
    // Replace any active toast — commit it first so its persist hook runs.
    if (_activeToast) _commitActive();

    var container = _ensureContainer();
    var duration = (typeof opts.durationMs === 'number' && opts.durationMs > 0) ? opts.durationMs : 5000;

    var toast = document.createElement('div');
    toast.className = 'mx60-toast';
    toast.innerHTML =
      '<div class="mx60-toast-content">' +
        '<span class="mx60-toast-msg"></span>' +
        '<button type="button" class="mx60-toast-undo"></button>' +
      '</div>' +
      '<div class="mx60-toast-progress"></div>';

    toast.querySelector('.mx60-toast-msg').textContent = opts.message || '';
    var undoBtn = toast.querySelector('.mx60-toast-undo');
    undoBtn.textContent = opts.undoLabel || 'Deshacer';
    if (typeof opts.onUndo !== 'function') {
      undoBtn.style.display = 'none';
    }

    var progress = toast.querySelector('.mx60-toast-progress');
    progress.style.transition = 'width ' + duration + 'ms linear';

    container.appendChild(toast);
    // Force reflow before starting the progress animation so it actually animates.
    void toast.offsetWidth;
    progress.style.width = '0%';

    var entry = {
      element: toast,
      onCommit: opts.onCommit,
      commitTimer: null
    };

    function onUndoClick() {
      undoBtn.removeEventListener('click', onUndoClick, false);
      if (entry.commitTimer) { clearTimeout(entry.commitTimer); entry.commitTimer = null; }
      // Only clear _activeToast if we are still the active one — guard against
      // a race where another show() already replaced us.
      if (_activeToast === entry) _activeToast = null;
      toast.classList.add('is-leaving');
      setTimeout(function() { _removeElement(toast); }, 200);
      if (typeof opts.onUndo === 'function') {
        try { opts.onUndo(); } catch (e) {}
      }
    }
    undoBtn.addEventListener('click', onUndoClick, false);

    entry.commitTimer = setTimeout(function() {
      if (_activeToast === entry) _commitActive();
    }, duration);

    _activeToast = entry;
  }

  window.MX60.Toast = { show: show };
})();
