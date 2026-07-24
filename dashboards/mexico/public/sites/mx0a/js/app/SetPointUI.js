/**
 * SetPointUI.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * Editable set-point card for the detail view.
 * Provides +/- buttons and direct numeric input (integers only, negatives allowed).
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  function renderCard(coolValue) {
    var intCool = Math.round(parseFloat(coolValue));
    return '<div class="detail-point-card detail-setpoint-card" id="detail-val-sp-card">' +
      '<div class="detail-point-label">Setpoint</div>' +
      '<div class="detail-setpoint-row">' +
        '<button class="detail-sp-btn" onclick="window.SNLS.adjustSetPoint(-1,\'cool\')">-</button>' +
        '<input type="text" id="detail-sp-cool-input" class="detail-sp-input"' +
          ' value="' + intCool + '"' +
          ' onkeydown="window.SNLS.onSpKeyDown(event)"' +
          ' onblur="window.SNLS.submitSetPoint(\'cool\')"' +
          ' inputmode="numeric">' +
        '<span class="detail-point-unit">\u00b0C</span>' +
        '<button class="detail-sp-btn" onclick="window.SNLS.adjustSetPoint(1,\'cool\')">+</button>' +
      '</div>' +
    '</div>';
  }

  function adjust(delta) {
    var input = document.getElementById('detail-sp-cool-input');
    if (!input) return;
    var current = parseInt(input.value, 10) || 22;
    var newVal = current + delta;
    input.value = newVal;
    _send(newVal, 'setPointCool');
  }

  function onKeyDown(e) {
    var key = e.key || '';
    if (key === 'Backspace' || key === 'Delete' || key === 'Tab' ||
        key === 'ArrowLeft' || key === 'ArrowRight' ||
        key === 'Home' || key === 'End') {
      return;
    }
    if (key === '-') {
      if (e.target.selectionStart === 0) return;
      e.preventDefault();
      return;
    }
    if (key >= '0' && key <= '9') return;
    if (key === 'Enter') {
      e.preventDefault();
      e.target.blur();
      return;
    }
    e.preventDefault();
  }

  function submit() {
    var input = document.getElementById('detail-sp-cool-input');
    if (!input) return;
    var val = parseInt(input.value, 10);
    if (isNaN(val)) {
      input.value = '22';
      return;
    }
    input.value = val;
    _send(val, 'setPointCool');
  }

  function _send(newVal, propName) {
    var cfg = window.SNLS_CONFIG;
    if (!cfg || !cfg.api || !cfg.api.setpoint) return;
    var params = SNLS.DashboardApp && SNLS.DashboardApp.getCurrentParams
      ? SNLS.DashboardApp.getCurrentParams() : null;
    if (!params) return;

    var body = JSON.stringify({
      floorKey: params.floorKey,
      equipName: params.equipName,
      property: propName || 'setPointCool',
      value: String(newVal)
    });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', cfg.api.setpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(body);
  }

  function updateValue(setPointCool) {
    var coolInput = document.getElementById('detail-sp-cool-input');
    if (coolInput && document.activeElement !== coolInput) {
      coolInput.value = Math.round(parseFloat(setPointCool));
    }
  }

  // Expose for onclick
  window.SNLS = window.SNLS || {};
  window.SNLS.adjustSetPoint = adjust;
  window.SNLS.submitSetPoint = submit;
  window.SNLS.onSpKeyDown = onKeyDown;

  SNLS.SetPointUI = {
    renderCard: renderCard,
    adjust: adjust,
    onKeyDown: onKeyDown,
    submit: submit,
    updateValue: updateValue
  };

  window.SNLS = SNLS;

})(window);
