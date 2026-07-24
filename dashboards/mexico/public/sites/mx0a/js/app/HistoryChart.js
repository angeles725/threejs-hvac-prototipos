/**
 * HistoryChart.js — SanLuis BMS Dashboard
 * IIFE · SNLS namespace
 *
 * REWRITTEN to use Chart.js for the full-page Histories view,
 * while keeping a native Canvas mini-chart for the RTU detail modal.
 *
 * Full-page chart: powered by NiagaraHistory.js (real Niagara history data).
 * Modal mini-chart: native Canvas 2D with 60-point ring buffer (live polling).
 *
 * ES5 STRICT — no let/const, no arrow functions, no template literals.
 */
(function(window) {
  'use strict';

  var SNLS = window.SNLS || {};

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  var MAX_POINTS = 60;

  var PARAM_LABELS = {
    tempAmbiente: 'Temperatura Ambiente (\u00b0C)',
    humidity:     'Humedad (%)',
    setPointCool: 'Setpoint (\u00b0C)'
  };

  // ---------------------------------------------------------------------------
  // Ring-buffer state (for modal mini-chart only)
  // ---------------------------------------------------------------------------

  var _historyData = {};
  var _currentRTU   = '';
  var _currentParam = 'tempAmbiente';
  var _selectorsReady = false;

  // ---------------------------------------------------------------------------
  // addDataPoint — ring buffer for modal mini-chart
  // ---------------------------------------------------------------------------

  function addDataPoint(rtuKey, data) {
    if (!rtuKey) return;
    if (!_historyData[rtuKey]) _historyData[rtuKey] = [];

    _historyData[rtuKey].push({
      time:         new Date(),
      tempAmbiente: data.tempAmbiente || 0,
      humidity:     data.humidity     || 0,
      setPointCool: data.setPointCool || 0
    });

    if (_historyData[rtuKey].length > MAX_POINTS) {
      _historyData[rtuKey].shift();
    }
  }

  // ---------------------------------------------------------------------------
  // render — full-page Histories view (delegates to NiagaraHistory)
  // ---------------------------------------------------------------------------

  function render(allEquipment) {
    // Populate RTU selector for the live mini-chart section
    _ensureSelectors(allEquipment);

    // The real Niagara history chart is handled by NiagaraHistory.js
    // We just trigger a re-draw of the live mini-chart if visible
    drawChart();
  }

  // ---------------------------------------------------------------------------
  // _ensureSelectors — populate RTU/param selectors for live mini-chart
  // ---------------------------------------------------------------------------

  function _ensureSelectors(allEquipment) {
    var rtuSelect   = document.getElementById('history-rtu-select');
    var paramSelect = document.getElementById('history-param-select');

    if (rtuSelect && !_selectorsReady && allEquipment && allEquipment.length > 0) {
      var html = '';
      for (var i = 0; i < allEquipment.length; i++) {
        var name = allEquipment[i].equipName || allEquipment[i].tag || ('RTU ' + i);
        html += '<option value="' + name + '">' + name + '</option>';
      }
      rtuSelect.innerHTML = html;
      _currentRTU = allEquipment[0].equipName || allEquipment[0].tag || '';

      rtuSelect.addEventListener('change', function() {
        _currentRTU = rtuSelect.value;
        drawChart();
      });
    }

    if (paramSelect && !_selectorsReady) {
      paramSelect.innerHTML =
        '<option value="tempAmbiente">Temp Ambiente</option>' +
        '<option value="humidity">Humedad</option>' +
        '<option value="setPointCool">Setpoint</option>';

      paramSelect.addEventListener('change', function() {
        _currentParam = paramSelect.value;
        drawChart();
      });

      _selectorsReady = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Canvas helpers
  // ---------------------------------------------------------------------------

  function _minMax(arr) {
    var mn = arr[0], mx = arr[0];
    for (var i = 1; i < arr.length; i++) {
      if (arr[i] < mn) mn = arr[i];
      if (arr[i] > mx) mx = arr[i];
    }
    return { min: mn, max: mx };
  }

  function _scaleCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var parent = canvas.parentElement;
    if (!parent) return null;
    var rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { W: rect.width, H: rect.height, ctx: ctx };
  }

  function _drawEmptyMessage(ctx, W, H, msg) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#94a3b8';
    ctx.font = "13px 'Inter', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(msg, W / 2, H / 2);
  }

  function _drawGridAndAxes(ctx, pad, W, H, gridLines, min, yRange, times) {
    var plotW = W - pad.left - pad.right;
    var plotH = H - pad.top - pad.bottom;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#94a3b8';
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'right';

    for (var i = 0; i <= gridLines; i++) {
      var gy = pad.top + (plotH / gridLines) * i;
      var val = (min + yRange) - (yRange / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + plotW, gy);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), pad.left - 8, gy + 4);
    }

    var n = times.length;
    var step = Math.max(1, Math.floor(n / 6));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    for (var j = 0; j < n; j += step) {
      var tx = pad.left + (j / (n - 1)) * plotW;
      ctx.fillText(times[j].toLocaleTimeString().slice(0, 5), tx, H - pad.bottom + 20);
    }
  }

  function _drawSetPointLine(ctx, pad, W, H, spData, min, yRange) {
    var plotW = W - pad.left - pad.right;
    var plotH = H - pad.top - pad.bottom;
    var n = spData.length;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var sx = pad.left + (i / (n - 1)) * plotW;
      var sy = pad.top + (1 - (spData[i] - min) / yRange) * plotH;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function _drawDataLine(ctx, pad, W, H, data, min, yRange) {
    var plotW = W - pad.left - pad.right;
    var plotH = H - pad.top - pad.bottom;
    var n = data.length;
    var points = [];

    for (var i = 0; i < n; i++) {
      points.push({
        x: pad.left + (i / (n - 1)) * plotW,
        y: pad.top + (1 - (data[i] - min) / yRange) * plotH
      });
    }

    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var j = 1; j < points.length; j++) {
      ctx.lineTo(points[j].x, points[j].y);
    }
    ctx.stroke();

    var baseY = pad.top + plotH;
    var lastPt = points[points.length - 1];
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var k = 1; k < points.length; k++) {
      ctx.lineTo(points[k].x, points[k].y);
    }
    ctx.lineTo(lastPt.x, baseY);
    ctx.lineTo(points[0].x, baseY);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, pad.top, 0, baseY);
    grad.addColorStop(0, 'rgba(0,212,170,0.18)');
    grad.addColorStop(1, 'rgba(0,212,170,0.01)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4aa';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---------------------------------------------------------------------------
  // drawChart — live mini-chart (ring buffer, native canvas)
  // ---------------------------------------------------------------------------

  function drawChart() {
    var canvas = document.getElementById('history-chart');
    if (!canvas) return;

    var dims = _scaleCanvas(canvas);
    if (!dims) return;

    var ctx = dims.ctx, W = dims.W, H = dims.H;
    var history = _historyData[_currentRTU] || [];
    var param = _currentParam;

    if (history.length < 2) {
      _drawEmptyMessage(ctx, W, H, 'Recolectando datos... espere unos segundos');
      return;
    }

    var data = [], times = [];
    for (var i = 0; i < history.length; i++) {
      data.push(history[i][param] || 0);
      times.push(history[i].time);
    }

    var mm = _minMax(data);
    var min = mm.min - 1;
    var max = mm.max + 1;
    var yRange = max - min || 1;

    var spData = null;
    if (param === 'tempAmbiente' || param === 'setPointCool') {
      spData = [];
      for (var s = 0; s < history.length; s++) {
        spData.push(history[s].setPointCool || 0);
      }
    }

    var pad = { top: 30, right: 20, bottom: 44, left: 58 };
    ctx.clearRect(0, 0, W, H);
    _drawGridAndAxes(ctx, pad, W, H, 5, min, yRange, times);
    if (spData) _drawSetPointLine(ctx, pad, W, H, spData, min, yRange);
    _drawDataLine(ctx, pad, W, H, data, min, yRange);

    var paramLabel = PARAM_LABELS[param] || param;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = "600 12px 'Inter', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(paramLabel, pad.left, 18);

    if (spData && param !== 'setPointCool') {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      var legendX = pad.left + Math.min(240, (W - pad.left - pad.right) * 0.55);
      ctx.beginPath();
      ctx.moveTo(legendX, 12);
      ctx.lineTo(legendX + 18, 12);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#f59e0b';
      ctx.font = "11px 'Inter', sans-serif";
      ctx.fillText('Set Point', legendX + 22, 16);
    }
  }

  // ---------------------------------------------------------------------------
  // drawModalChart — compact canvas chart in RTU detail modal
  // ---------------------------------------------------------------------------

  function drawModalChart(equip) {
    var canvas = document.getElementById('modal-chart');
    if (!canvas) return;

    var dims = _scaleCanvas(canvas);
    if (!dims) return;

    var ctx = dims.ctx, W = dims.W, H = dims.H;
    var key = equip ? (equip.equipName || equip.tag || '') : '';
    var history = _historyData[key] || [];

    if (history.length < 2) {
      _drawEmptyMessage(ctx, W, H, 'Recolectando datos...');
      return;
    }

    var temps = [], sps = [], allVals = [];
    for (var i = 0; i < history.length; i++) {
      temps.push(history[i].tempAmbiente || 0);
      sps.push(history[i].setPointCool || 0);
      allVals.push(history[i].tempAmbiente || 0);
      allVals.push(history[i].setPointCool || 0);
    }

    var mm = _minMax(allVals);
    var min = mm.min - 1;
    var max = mm.max + 1;
    var yRange = max - min || 1;

    var times = [];
    for (var t = 0; t < history.length; t++) {
      times.push(history[t].time);
    }

    var pad = { top: 26, right: 14, bottom: 34, left: 48 };
    ctx.clearRect(0, 0, W, H);
    _drawGridAndAxes(ctx, pad, W, H, 4, min, yRange, times);
    _drawSetPointLine(ctx, pad, W, H, sps, min, yRange);
    _drawDataLine(ctx, pad, W, H, temps, min, yRange);

    ctx.fillStyle = '#00d4aa';
    ctx.font = "600 10px 'Inter', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText('Temp Return', pad.left, 14);

    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left + 90, 9);
    ctx.lineTo(pad.left + 108, 9);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#f59e0b';
    ctx.font = "10px 'Inter', sans-serif";
    ctx.fillText('Set Point', pad.left + 112, 13);
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  SNLS.HistoryChart = {
    addDataPoint:   addDataPoint,
    render:         render,
    drawChart:      drawChart,
    drawModalChart: drawModalChart,
    setCurrentRTU: function(key) { _currentRTU = key; },
    getCurrentRTU: function() { return _currentRTU; },
    setCurrentParam: function(param) { _currentParam = param; },
    getCurrentParam: function() { return _currentParam; }
  };

  window.SNLS = SNLS;

})(window);
