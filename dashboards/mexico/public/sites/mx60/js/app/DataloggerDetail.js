/**
 * MX60.DataloggerDetail
 *
 * Detail renderer for type='datalogger'. Shows:
 *   - Hero image — one of three pre-rendered JPGs per datalogger (VERDE /
 *     NARANJA / ROJO) selected by current pressure reading vs configured
 *     thresholds.
 *   - Reading panel — pressurePsi + pressureBar + status pill.
 *   - Thresholds form — two editable numeric inputs (umbralAdvertencia,
 *     umbralCritico) persisted in MX60.DataloggerThresholdStore. Comparison
 *     is INVERTED (lectura < umbral → degraded).
 *
 * Registered against MX60.EquipmentDetail.registerRenderer('datalogger', mount).
 */
(function (window) {
  'use strict';
  var MX60 = window.MX60 = window.MX60 || {};

  // ----- Helpers ------------------------------------------------------------
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
  function fmtNum(v, digits) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toFixed(digits);
  }
  // SDD mx60-detail-charts-parity WU7: "Ayer" baseline button per chart.
  // Each chart of DataloggerDetail has its own independent baseline toggle
  // (psi and bar do not share state). `chartKey` discriminates which chart
  // the click event targets ('psi' or 'bar').
  function _dtBaselineBtnHtml(chartKey) {
    return '' +
      '<button type="button" class="dt-baseline-btn" data-dt-baseline="' + chartKey + '" title="Mostrar baseline: ayer">' +
        '<svg width="14" height="6" viewBox="0 0 14 6" fill="none" aria-hidden="true">' +
          '<line x1="1" y1="3" x2="13" y2="3" stroke="rgba(255,255,255,0.4)" stroke-width="1.4" stroke-dasharray="3 2" stroke-linecap="round"></line>' +
        '</svg>' +
        'Ayer' +
      '</button>';
  }

  // SDD mx60-detail-charts-parity WU7: baseline parallel — for each current
  // point, return the value from the same time-of-day slot 24h earlier.
  // Duplicated from CarcamoDetail._carcBaselineParallel intentionally — same
  // algorithm, no cross-module coupling. ~20 LOC.
  function _dtBaselineParallel(currentPoints, yesterdayHistory) {
    var dayMs = 24 * 60 * 60 * 1000;
    var result = new Array(currentPoints.length);
    if (!yesterdayHistory || !yesterdayHistory.length) {
      for (var i = 0; i < result.length; i++) result[i] = null;
      return result;
    }
    for (var j = 0; j < currentPoints.length; j++) {
      var target = currentPoints[j].timestamp - dayMs;
      var lo = 0;
      var hi = yesterdayHistory.length - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (yesterdayHistory[mid].timestamp < target) lo = mid + 1;
        else hi = mid;
      }
      var candidate = yesterdayHistory[lo];
      if (candidate && Math.abs(candidate.timestamp - target) < 90 * 1000) {
        result[j] = candidate.value;
      } else {
        result[j] = null;
      }
    }
    return result;
  }

  // SDD mx60-detail-charts-parity WU6: render the 8 range tabs from
  // MX60.HistoryVocabulary.RANGES for a specific chart (`chartKey` = 'psi'
  // or 'bar'). Default active tab is '1h'. Fallback to the legacy 4-tab
  // list when HistoryVocabulary hasn't loaded (transient boot state).
  function _dtRangeTabsHtml(chartKey) {
    var RANGES = (window.MX60 && MX60.HistoryVocabulary)
      ? MX60.HistoryVocabulary.RANGES : null;
    if (!RANGES || !RANGES.length) {
      return '<div class="dt-trends-tabs">' +
        '<button type="button" class="dt-trends-tab dt-trends-tab--active" data-dt-range="' + chartKey + '" data-dt-val="1h">1h</button>' +
        '<button type="button" class="dt-trends-tab" data-dt-range="' + chartKey + '" data-dt-val="8h">8h</button>' +
        '<button type="button" class="dt-trends-tab" data-dt-range="' + chartKey + '" data-dt-val="24h">24h</button>' +
        '<button type="button" class="dt-trends-tab" data-dt-range="' + chartKey + '" data-dt-val="7d">7d</button>' +
        '</div>';
    }
    var html = '<div class="dt-trends-tabs">';
    for (var i = 0; i < RANGES.length; i++) {
      var r = RANGES[i];
      var active = (r.id === '1h') ? ' dt-trends-tab--active' : '';
      html += '<button type="button" class="dt-trends-tab' + active + '" data-dt-range="' + chartKey + '" data-dt-val="' + r.id + '">' + r.label + '</button>';
    }
    html += '</div>';
    return html;
  }

  function isFiniteNumber(n) {
    return typeof n === 'number' && isFinite(n);
  }

  // Color → human-friendly status pill
  var STATUS_TEXT = {
    verde:   { text: 'Operativo',   tone: 'ok'    },
    naranja: { text: 'Advertencia', tone: 'warn'  },
    rojo:    { text: 'Crítico',     tone: 'alarm' }
  };
  // Color → image filename suffix (the JPGs are uppercase)
  var COLOR_SUFFIX = { verde: 'VERDE', naranja: 'NARANJA', rojo: 'ROJO' };

  // Numeric input regex — digits, optional decimal, optional sign forbidden
  var NUMERIC_RE = /^\d*\.?\d*$/;

  // -------------------------------------------------------------------------
  // mount(container, equip) → { destroy }
  // -------------------------------------------------------------------------
  function mount(container, equip) {
    if (!container || !equip) return null;

    var imgVersion = window.MX60_IMG_V || 5;

    // ----- Initial render -------------------------------------------------
    container.innerHTML = _shellHtml(equip);

    var heroImgEl    = container.querySelector('[data-dt-hero-img]');
    var heroStateEl  = container.querySelector('[data-dt-hero-state]');
    var statusPillEl = container.querySelector('[data-dt-status-pill]');
    var psiEl        = container.querySelector('[data-dt-psi]');
    var barEl        = container.querySelector('[data-dt-bar]');
    var advInput     = container.querySelector('[data-dt-umbral="advertencia"]');
    var critInput    = container.querySelector('[data-dt-umbral="critico"]');
    var validationEl = container.querySelector('[data-dt-validation]');

    // Track whether either input is focused so polling does not stomp
    // user-in-progress edits.
    var focused = { advertencia: false, critico: false };

    // ----- Read helpers ---------------------------------------------------
    function _currentEquip() {
      if (MX60.EquipmentData && typeof MX60.EquipmentData.getById === 'function') {
        return MX60.EquipmentData.getById(equip.id) || equip;
      }
      return equip;
    }
    function _currentReading() {
      var eq = _currentEquip();
      var s = eq && eq.summary ? eq.summary : {};
      // AP5 fix: derive status via StatusResolver so latched alarms propagate
      // here exactly as on HomeMap, EquipmentCard, and Configuracion.
      var status = 'standby';
      if (eq) {
        if (window.MX60 && MX60.StatusResolver &&
            typeof MX60.StatusResolver.effectiveStatus === 'function') {
          status = MX60.StatusResolver.effectiveStatus(eq) || eq.status || 'standby';
        } else {
          status = eq.status || 'standby';
        }
      }
      return {
        psi: isFiniteNumber(s.pressurePsi) ? s.pressurePsi : null,
        bar: isFiniteNumber(s.pressureBar) ? s.pressureBar : null,
        status: status
      };
    }
    function _currentThresholds() {
      var store = MX60.DataloggerThresholdStore;
      if (!store) return { adv: null, crit: null };
      return {
        adv:  store.get(equip.id, 'umbralAdvertencia'),
        crit: store.get(equip.id, 'umbralCritico')
      };
    }
    function _currentColor(reading) {
      if (!MX60.DataloggerThresholdStore) return 'verde';
      return MX60.DataloggerThresholdStore.colorForReading(equip.id, reading.psi);
    }

    // ----- Hero + reading panel render -----------------------------------
    function renderHeroAndReading() {
      var reading = _currentReading();
      var color = _currentColor(reading);
      var suffix = COLOR_SUFFIX[color] || 'VERDE';
      var src = 'img/dataloggers/' + escAttr(equip.label) + '-' + suffix + '.jpg?v=' + imgVersion;
      if (heroImgEl) {
        if (heroImgEl.getAttribute('src') !== src) heroImgEl.setAttribute('src', src);
        heroImgEl.setAttribute('alt', equip.label + ' — estado ' + color);
      }
      if (heroStateEl) {
        heroStateEl.className = 'dt-hero-state tone-' + color;
        heroStateEl.textContent = (STATUS_TEXT[color] || STATUS_TEXT.verde).text;
      }
      if (statusPillEl) {
        var st = STATUS_TEXT[color] || STATUS_TEXT.verde;
        statusPillEl.className = 'dt-status-pill tone-' + st.tone;
        statusPillEl.textContent = st.text;
      }
      if (psiEl) psiEl.textContent = fmtNum(reading.psi, 1);
      if (barEl) barEl.textContent = fmtNum(reading.bar, 2);
    }

    // ----- Thresholds form ------------------------------------------------
    function renderThresholdInputs() {
      var t = _currentThresholds();
      if (advInput && !focused.advertencia) {
        advInput.value = (t.adv === null || t.adv === undefined) ? '' : String(t.adv);
      }
      if (critInput && !focused.critico) {
        critInput.value = (t.crit === null || t.crit === undefined) ? '' : String(t.crit);
      }
      _setValidation('');
    }
    function _setValidation(msg) {
      if (!validationEl) return;
      if (msg) {
        validationEl.textContent = msg;
        validationEl.classList.add('is-visible');
      } else {
        validationEl.textContent = '';
        validationEl.classList.remove('is-visible');
      }
    }

    function _readInputValue(inputEl) {
      if (!inputEl) return null;
      var raw = (inputEl.value || '').trim();
      if (raw === '') return null;
      var n = parseFloat(raw);
      return isNaN(n) ? null : n;
    }
    function _writePoint(slot, value) {
      if (!equip.ord) return;
      MX60.writePoint(equip.ord + '/' + slot, value)
        .catch(function() { /* toast already shown by helper */ });
    }

    function commitThreshold(thresholdKey, inputEl) {
      var store = MX60.DataloggerThresholdStore;
      if (!store) return;
      var newVal = _readInputValue(inputEl);

      // Cross-field validation: critico < advertencia (when both set).
      var t = _currentThresholds();
      var adv  = (thresholdKey === 'umbralAdvertencia') ? newVal : t.adv;
      var crit = (thresholdKey === 'umbralCritico')     ? newVal : t.crit;
      if (adv !== null && crit !== null && !(crit < adv)) {
        _setValidation('Crítico debe ser menor que Advertencia.');
        var current = store.get(equip.id, thresholdKey);
        if (inputEl) inputEl.value = (current === null || current === undefined) ? '' : String(current);
        return;
      }
      _setValidation('');

      var prior = store.get(equip.id, thresholdKey);
      // No-op when the typed value matches what's already stored.
      if (newVal === prior) return;

      var label = thresholdKey === 'umbralAdvertencia' ? 'Advertencia' : 'Crítico';
      var message = (newVal === null)
        ? '¿Borrar umbral ' + label + '? Quedará sin protección configurada.'
        : '¿Confirmar umbral ' + label + ' = ' + newVal + ' PSI?';

      function _apply() {
        // D2: Optimistic update — store first, then write. Rollback on failure (REQ-008).
        if (newVal === null) store.remove(equip.id, thresholdKey);
        else store.set(equip.id, thresholdKey, newVal);
        if (equip.ord) {
          MX60.writePoint(equip.ord + '/' + thresholdKey, newVal)
            .catch(function() {
              // Rollback: revert store to prior value and reset input.
              if (prior === null || prior === undefined) store.remove(equip.id, thresholdKey);
              else store.set(equip.id, thresholdKey, prior);
              if (inputEl) inputEl.value = (prior === null || prior === undefined) ? '' : String(prior);
              // Toast already shown by writePoint helper.
            });
        }
      }
      function _revert() {
        if (inputEl) inputEl.value = (prior === null || prior === undefined) ? '' : String(prior);
      }

      if (MX60.Confirm) {
        MX60.Confirm.show({
          title:    'Cambiar umbral',
          message:  message,
          tone:     newVal === null ? 'danger' : 'neutral',
          onConfirm: _apply,
          onCancel:  _revert
        });
      } else {
        _apply();
      }
    }

    // ----- Input event wiring --------------------------------------------
    function onInputType(e) {
      var v = e.target.value;
      if (!NUMERIC_RE.test(v)) {
        e.target.value = v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
      }
    }
    function onInputFocus(key) {
      return function () { focused[key] = true; };
    }
    function onInputBlur(key, thresholdKey, inputEl) {
      return function () {
        focused[key] = false;
        commitThreshold(thresholdKey, inputEl);
      };
    }
    function onInputKeyDown(thresholdKey, inputEl) {
      return function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          inputEl.blur();
        }
      };
    }

    var advFocus  = onInputFocus('advertencia');
    var advBlur   = onInputBlur('advertencia', 'umbralAdvertencia', advInput);
    var advKey    = onInputKeyDown('umbralAdvertencia', advInput);
    var critFocus = onInputFocus('critico');
    var critBlur  = onInputBlur('critico', 'umbralCritico', critInput);
    var critKey   = onInputKeyDown('umbralCritico', critInput);

    if (advInput) {
      advInput.addEventListener('input',   onInputType, false);
      advInput.addEventListener('focus',   advFocus,    false);
      advInput.addEventListener('blur',    advBlur,     false);
      advInput.addEventListener('keydown', advKey,      false);
    }
    if (critInput) {
      critInput.addEventListener('input',   onInputType, false);
      critInput.addEventListener('focus',   critFocus,   false);
      critInput.addEventListener('blur',    critBlur,    false);
      critInput.addEventListener('keydown', critKey,     false);
    }

    // ----- Subscriptions --------------------------------------------------
    function onDataChange() {
      renderHeroAndReading();
    }
    if (MX60.EquipmentData && typeof MX60.EquipmentData.addListener === 'function') {
      MX60.EquipmentData.addListener(onDataChange);
    }

    var unsubscribeThresholds = function () {};
    if (MX60.DataloggerThresholdStore) {
      unsubscribeThresholds = MX60.DataloggerThresholdStore.subscribe(function (evt) {
        if (!evt || evt.equipId !== equip.id) return;
        renderHeroAndReading();
        renderThresholdInputs();
      });
    }

    // Initial paint
    renderHeroAndReading();
    renderThresholdInputs();

    // ----- C5: Trends — UP-pattern (pre-resolve + buffer fallback) ---------
    // Two independent charts (PSI + bar). Each chart owns:
    //   - its own range state (psiRange, barRange)
    //   - its own 60s poll timer
    //   - its own overlay element ("Recolectando datos en vivo…")
    //
    // Replicates UpDetail.js _loadRealHistory pattern:
    //   1. MX60.HistoryIndex.load — cached /api/equipment-histories per session
    //   2. Lookup histMap[equip.id][slot] — resolved BHistoryId from BLink
    //   3. histId present → /api/historyData?id={resolvedId}&range={range}
    //      histId absent  → MX60.LiveHistoryBuffer.getSeries fallback
    //      both empty AND buffer < 5 → overlay
    var psiCanvas     = container.querySelector('[data-dt-chart="psi"]');
    var barCanvas     = container.querySelector('[data-dt-chart="bar"]');
    var psiWrap       = (psiCanvas && psiCanvas.parentNode) ? psiCanvas.parentNode : null;
    var barWrap       = (barCanvas && barCanvas.parentNode) ? barCanvas.parentNode : null;
    var psiRange      = '1h';
    var barRange      = '1h';
    var psiTimer      = null;
    var barTimer      = null;

    // CP3: current theme state — primed once at mount (GATE-1b: never call
    // getTheme inside _drawDtChart or the setInterval ticks).
    var _currentTheme = (window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.getTheme === 'function')
      ? MX60.ThemeStore.getTheme() : 'dark';
    var _dtThemeUnsub = null;
    // SDD mx60-detail-charts-parity WU7: per-chart baseline state
    var psiBaselineActive = false;
    var barBaselineActive = false;

    // SDD mx60-detail-charts-parity WU6: support the 8 ranges (static +
    // dynamic). Static ranges return `hours * 3600000`. Dynamic ranges
    // ('today', 'yesterday', 'mtd') compute the window as the distance
    // from `now` back to the clock-anchored cutoff (same approach as
    // UpDetail._computeRangeCutoff and CarcamoDetail._carcRangeToMs).
    function _dtRangeToMs(rangeId) {
      var RANGES = (window.MX60 && MX60.HistoryVocabulary)
        ? MX60.HistoryVocabulary.RANGES : null;
      if (!RANGES) {
        switch (rangeId) {
          case '1h':  return 1  * 3600000;
          case '8h':  return 8  * 3600000;
          case '24h': return 24 * 3600000;
          case '7d':  return 7  * 24 * 3600000;
          default:    return 24 * 3600000;
        }
      }
      var r = null;
      for (var i = 0; i < RANGES.length; i++) {
        if (RANGES[i].id === rangeId) { r = RANGES[i]; break; }
      }
      if (!r) return 24 * 3600000;
      if (r.dynamic !== true) return r.hours * 3600000;
      var now = Date.now();
      var d = new Date(now);
      if (r.id === 'today') {
        d.setHours(0, 0, 0, 0);
        return now - d.getTime();
      }
      if (r.id === 'yesterday') {
        d.setHours(0, 0, 0, 0);
        return now - (d.getTime() - 24 * 3600000);
      }
      if (r.id === 'mtd') {
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return now - d.getTime();
      }
      return 24 * 3600000;
    }

    function _dtFetchHistoryData(histId, range) {
      return new Promise(function(resolve) {
        var cfg = (MX60.ConfigManager && typeof MX60.ConfigManager.getConfig === 'function')
          ? MX60.ConfigManager.getConfig() : null;
        var base = (cfg && cfg.api && cfg.api.historyData)
          ? cfg.api.historyData : '/mx60/api/historyData';
        // Translate the frontend range id ('1h'..'7d') to the canonical backend
        // key via the shared vocabulary (REQ-1 + spec scenario S-5). A missing
        // entry warns + falls back to 'lastHour' so vocabulary drift is loud.
        var map = (window.MX60 && MX60.HistoryVocabulary)
          ? MX60.HistoryVocabulary.RANGE_TO_BACKEND : null;
        var backendKey = map ? map[range] : null;
        if (!backendKey) {
          console.warn('[DataloggerDetail] unknown range id: ' + range);
          backendKey = 'lastHour';
        }
        var url = base + '?id=' + encodeURIComponent(histId) + '&range=' + encodeURIComponent(backendKey);
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onload = function() {
          try {
            var parsed = JSON.parse(xhr.responseText);
            var raw = parsed.data || [];
            // Backend returns either {data: [[t, value], ...]} or
            // {data: [{t, value}]}. _drawDtChart expects {timestamp, value}.
            var normalized = [];
            for (var i = 0; i < raw.length; i++) {
              var pt = raw[i];
              if (Array.isArray(pt) && pt.length >= 2) {
                normalized.push({ timestamp: pt[0], value: (pt[1] !== null && pt[1] !== undefined) ? pt[1] : null });
              } else if (pt && pt.t !== undefined) {
                normalized.push({ timestamp: pt.t, value: (pt.value !== null && pt.value !== undefined) ? pt.value : null });
              } else if (pt && pt.timestamp !== undefined) {
                normalized.push({ timestamp: pt.timestamp, value: (pt.value !== null && pt.value !== undefined) ? pt.value : null });
              }
            }
            resolve(normalized);
          } catch (e) { resolve([]); }
        };
        xhr.onerror   = function() { resolve([]); };
        xhr.ontimeout = function() { resolve([]); };
        xhr.timeout = 15000;
        xhr.send();
      });
    }

    function _dtLoadSlotHistory(slotName, range) {
      return new Promise(function(resolve) {
        var buf = window.MX60 && MX60.LiveHistoryBuffer;
        var bufCount = buf ? buf.getCount(equip.id) : 0;

        function _useBuffer() {
          var raw    = buf ? buf.getSeries(equip.id, slotName) : [];
          var series = buf ? buf.filterByRange(raw, _dtRangeToMs(range)) : [];
          var data   = [];
          for (var i = 0; i < series.length; i++) {
            data.push({ timestamp: series[i].t, value: series[i].value });
          }
          resolve({ data: data, hasBackend: false, bufferCount: bufCount });
        }

        if (!window.MX60 || !MX60.HistoryIndex || typeof MX60.HistoryIndex.load !== 'function') {
          _useBuffer();
          return;
        }

        MX60.HistoryIndex.load(function() {
          var histMap = MX60.HistoryIndex.get(equip.id) || {};
          var histId  = histMap[slotName];
          if (!histId) { _useBuffer(); return; }
          _dtFetchHistoryData(histId, range).then(function(data) {
            if (data && data.length > 0) {
              resolve({ data: data, hasBackend: true, bufferCount: bufCount });
            } else {
              // Backend resolved histId but returned nothing for this window —
              // fall back to buffer if it has samples.
              var raw    = buf ? buf.getSeries(equip.id, slotName) : [];
              var series = buf ? buf.filterByRange(raw, _dtRangeToMs(range)) : [];
              var fallbackData = [];
              for (var i = 0; i < series.length; i++) {
                fallbackData.push({ timestamp: series[i].t, value: series[i].value });
              }
              resolve({ data: fallbackData, hasBackend: true, bufferCount: bufCount });
            }
          });
        });
      });
    }

    function _dtUpdateOverlay(wrapEl, hasBackend, bufferCount) {
      if (!wrapEl) return;
      var noBackend    = !hasBackend;
      var bufferSparse = bufferCount < 5;
      var showOverlay  = noBackend && bufferSparse;
      var overlayEl = wrapEl.querySelector('.dt-no-history-overlay');
      if (showOverlay) {
        if (!overlayEl) {
          overlayEl = document.createElement('div');
          overlayEl.className = 'dt-no-history-overlay';
          overlayEl.style.cssText = [
            'position:absolute', 'top:0', 'left:0', 'right:0', 'bottom:0',
            'display:flex', 'align-items:center', 'justify-content:center',
            'background:rgba(15,23,42,0.82)', 'border-radius:8px',
            'pointer-events:none', 'z-index:10'
          ].join(';');
          wrapEl.style.position = 'relative';
          wrapEl.appendChild(overlayEl);
        }
        overlayEl.innerHTML = '<span style="color:#94a3b8;font-size:13px;text-align:center;padding:16px">' +
          'Recolectando datos en vivo…</span>';
      } else {
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      }
    }

    function _buildDtChart(canvasEl, slot, rangeVal, unit, color) {
      if (!canvasEl) return;
      var wrapEl = (canvasEl === psiCanvas) ? psiWrap : barWrap;
      var baselineActive = (canvasEl === psiCanvas) ? psiBaselineActive : barBaselineActive;
      _dtLoadSlotHistory(slot, rangeVal).then(function(result) {
        var currentData = result.data || [];
        if (baselineActive && currentData.length) {
          // SDD WU7: fetch yesterday's window in parallel and overlay dashed.
          _dtLoadSlotHistory(slot, 'yesterday').then(function(yres) {
            var baselineValues = _dtBaselineParallel(currentData, yres.data || []);
            _drawDtChart(canvasEl, currentData, unit, color, baselineValues);
            _dtUpdateOverlay(wrapEl, !!result.hasBackend, result.bufferCount || 0);
          });
        } else {
          _drawDtChart(canvasEl, currentData, unit, color);
          _dtUpdateOverlay(wrapEl, !!result.hasBackend, result.bufferCount || 0);
        }
      });
    }

    // SDD mx60-detail-charts-parity WU7: `_drawDtChart` accepts optional
    // `baselineData` (array of values aligned 1:1 with historyData). When
    // present and length-matched, append a second dashed dataset.
    function _drawDtChart(canvasEl, historyData, unit, color, baselineData) {
      if (!canvasEl || !window.Chart) return;
      if (canvasEl._mx60Chart) {
        try { canvasEl._mx60Chart.destroy(); } catch (e) {}
        canvasEl._mx60Chart = null;
      }
      var labels = [];
      var values = [];
      for (var i = 0; i < historyData.length; i++) {
        var pt = historyData[i];
        labels.push(pt.timestamp ? new Date(pt.timestamp) : '');
        values.push(pt.value != null ? pt.value : null);
      }
      var datasets = [{
        label: unit,
        data: values,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', ',0.10)'),
        borderWidth: 1.5,
        pointRadius: values.length > 120 ? 0 : 2,
        tension: 0.3,
        fill: true
      }];
      if (Array.isArray(baselineData) && baselineData.length === values.length) {
        datasets.push({
          label: 'Ayer',
          data: baselineData,
          borderColor: 'rgba(255, 255, 255, 0.55)',
          backgroundColor: 'transparent',
          borderWidth: 1.2,
          borderDash: [4, 3],
          pointRadius: 0,
          tension: 0.3,
          fill: false
        });
      }
      var ch = new window.Chart(canvasEl, {
        type: 'line',
        data: {
          labels: labels,
          datasets: datasets
        },
        // SDD mx60-detail-charts-parity post-smoke fix: replicar styling
        // de UpDetail.chartOptionsFor (visualmente confirmado por operator).
        // CP3: chrome (tooltip + scale colours) now comes from MX60.ChartTheme
        // so dark/light theming is handled centrally.
        options: (function() {
          var _ch = (window.MX60 && MX60.ChartTheme) ? MX60.ChartTheme.chrome(_currentTheme) : null;
          var _tp = _ch ? _ch.tooltip : {};
          var _sc = _ch ? _ch.scales  : {};
          return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            interaction: { intersect: false, mode: 'index' },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: _tp.backgroundColor || 'rgba(12,16,33,0.92)',
                titleColor:      _tp.titleColor      || '#e2e8f0',
                bodyColor:       _tp.bodyColor       || '#94a3b8',
                borderColor:     _tp.borderColor     || 'rgba(0,240,255,0.2)',
                borderWidth:     1,
                titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
                bodyFont:  { family: 'JetBrains Mono, monospace', size: 11 },
                padding: 10,
                callbacks: {
                  label: function(ctx) {
                    if (ctx.parsed == null || ctx.parsed.y == null) return ctx.dataset.label + ': sin dato';
                    return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(2) + ' ' + unit;
                  }
                }
              }
            },
            scales: {
              x: {
                type: 'time',
                time: {
                  tooltipFormat: 'yyyy-MM-dd HH:mm',
                  displayFormats: {
                    millisecond: 'HH:mm:ss',
                    second: 'HH:mm:ss',
                    minute: 'HH:mm',
                    hour: 'HH:mm',
                    day: 'MMM dd',
                    week: 'MMM dd',
                    month: 'MMM yyyy'
                  }
                },
                ticks: {
                  color: (_sc.x && _sc.x.ticks) ? _sc.x.ticks.color : '#64748b',
                  font: { family: 'JetBrains Mono, monospace', size: 10 },
                  maxTicksLimit: 10,
                  maxRotation: 0
                },
                grid:   { color: (_sc.x && _sc.x.grid)   ? _sc.x.grid.color   : 'rgba(255,255,255,0.04)' },
                border: { color: (_sc.x && _sc.x.border) ? _sc.x.border.color : 'rgba(255,255,255,0.08)' }
              },
              y: {
                ticks: {
                  color: (_sc.y && _sc.y.ticks) ? _sc.y.ticks.color : '#64748b',
                  font: { family: 'JetBrains Mono, monospace', size: 10 },
                  callback: function(v) { return v + ' ' + unit; }
                },
                grid:   { color: (_sc.y && _sc.y.grid)   ? _sc.y.grid.color   : 'rgba(255,255,255,0.04)' },
                border: { color: (_sc.y && _sc.y.border) ? _sc.y.border.color : 'rgba(255,255,255,0.08)' }
              }
            }
          };
        }())
      });
      canvasEl._mx60Chart = ch;
      // SDD mx60-detail-charts-parity WU8: subscribe to CursorParity.
      // viewId 'dt-' + equip.id is shared between psi + bar charts of THIS
      // datalogger, so hovering one chart syncs the vertical cursor line on
      // the other (gated by D4 — psi.range must equal bar.range).
      if (window.MX60 && MX60.CursorParity && typeof MX60.CursorParity.attachToChart === 'function') {
        var isPsi = (canvasEl === psiCanvas);
        var getRange = isPsi
          ? function () { return psiRange || 'unknown'; }
          : function () { return barRange || 'unknown'; };
        try {
          ch._cursorUnsub = MX60.CursorParity.attachToChart(
            ch,
            'dt-' + (equip && equip.id ? equip.id : 'unknown'),
            getRange
          );
        } catch (e) { /* plugin optional */ }
      }
    }

    // SDD mx60-detail-charts-parity WU7: baseline toggle click handler.
    // Each chart's baseline is independent (psi state ↮ bar state).
    function _onDtBaselineClick(e) {
      var btn = e.target;
      while (btn && btn !== container && !btn.hasAttribute('data-dt-baseline')) btn = btn.parentNode;
      if (!btn || btn === container) return;
      var chartKey = btn.getAttribute('data-dt-baseline');
      if (chartKey === 'psi') {
        psiBaselineActive = !psiBaselineActive;
        btn.classList.toggle('dt-baseline-btn--active', psiBaselineActive);
        _buildDtChart(psiCanvas, 'pressurePsi', psiRange, 'PSI', 'rgb(255,153,0)');
      } else if (chartKey === 'bar') {
        barBaselineActive = !barBaselineActive;
        btn.classList.toggle('dt-baseline-btn--active', barBaselineActive);
        _buildDtChart(barCanvas, 'pressureBar', barRange, 'bar', 'rgb(25,190,107)');
      }
    }

    // Tab click delegation
    function _onDtTrendsClick(e) {
      var btn = e.target;
      while (btn && btn !== container && !btn.hasAttribute('data-dt-range')) btn = btn.parentNode;
      if (!btn || btn === container) return;
      var chartKey = btn.getAttribute('data-dt-range');
      var rangeVal = btn.getAttribute('data-dt-val');
      if (!chartKey || !rangeVal) return;

      // Update tab active states for this chart only
      var sectionEl = container.querySelector('[data-dt-trends="' + chartKey + '"]');
      if (sectionEl) {
        var tabs = sectionEl.querySelectorAll('[data-dt-range="' + chartKey + '"]');
        for (var i = 0; i < tabs.length; i++) {
          if (tabs[i].getAttribute('data-dt-val') === rangeVal) {
            tabs[i].classList.add('dt-trends-tab--active');
          } else {
            tabs[i].classList.remove('dt-trends-tab--active');
          }
        }
      }

      if (chartKey === 'psi') {
        psiRange = rangeVal;
        _buildDtChart(psiCanvas, 'pressurePsi', psiRange, 'PSI', 'rgb(255,153,0)');
      } else if (chartKey === 'bar') {
        barRange = rangeVal;
        _buildDtChart(barCanvas, 'pressureBar', barRange, 'bar', 'rgb(25,190,107)');
      }
    }

    container.addEventListener('click', _onDtTrendsClick, false);
    // SDD mx60-detail-charts-parity WU7: separate listener for baseline buttons
    container.addEventListener('click', _onDtBaselineClick, false);

    // Initial chart load
    _buildDtChart(psiCanvas, 'pressurePsi', psiRange, 'PSI', 'rgb(255,153,0)');
    _buildDtChart(barCanvas, 'pressureBar', barRange, 'bar', 'rgb(25,190,107)');

    // 60s in-place rebuild
    psiTimer = setInterval(function() { _buildDtChart(psiCanvas, 'pressurePsi', psiRange, 'PSI', 'rgb(255,153,0)'); }, 60000);
    barTimer = setInterval(function() { _buildDtChart(barCanvas, 'pressureBar', barRange, 'bar', 'rgb(25,190,107)'); }, 60000);

    // CP3: subscribe to ThemeStore — update _currentTheme then rebuild both
    // charts so they are born with the correct palette (GATE-1a, GATE-1b,
    // GATE-1c: _buildDtChart is idempotent destroy-then-rebuild).
    if (window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.subscribe === 'function') {
      _dtThemeUnsub = MX60.ThemeStore.subscribe(function (theme) {
        _currentTheme = theme;
        _buildDtChart(psiCanvas, 'pressurePsi', psiRange, 'PSI', 'rgb(255,153,0)');
        _buildDtChart(barCanvas, 'pressureBar', barRange, 'bar', 'rgb(25,190,107)');
      });
    }

    // ----- Destroy --------------------------------------------------------
    function destroy() {
      if (psiTimer) { clearInterval(psiTimer); psiTimer = null; }
      if (barTimer) { clearInterval(barTimer); barTimer = null; }
      // CP3: unsubscribe from ThemeStore (GATE-1a).
      if (_dtThemeUnsub && window.MX60 && MX60.ThemeStore && typeof MX60.ThemeStore.unsubscribe === 'function') {
        MX60.ThemeStore.unsubscribe(_dtThemeUnsub);
        _dtThemeUnsub = null;
      }
      // SDD mx60-detail-charts-parity WU8: unsubscribe CursorParity BEFORE
      // chart.destroy() so the overlay <canvas> + mousemove listeners are
      // removed cleanly without dangling refs.
      if (psiCanvas && psiCanvas._mx60Chart) {
        if (typeof psiCanvas._mx60Chart._cursorUnsub === 'function') {
          try { psiCanvas._mx60Chart._cursorUnsub(); } catch (e) {}
          psiCanvas._mx60Chart._cursorUnsub = null;
        }
        try { psiCanvas._mx60Chart.destroy(); } catch (e) {}
        psiCanvas._mx60Chart = null;
      }
      if (barCanvas && barCanvas._mx60Chart) {
        if (typeof barCanvas._mx60Chart._cursorUnsub === 'function') {
          try { barCanvas._mx60Chart._cursorUnsub(); } catch (e) {}
          barCanvas._mx60Chart._cursorUnsub = null;
        }
        try { barCanvas._mx60Chart.destroy(); } catch (e) {}
        barCanvas._mx60Chart = null;
      }
      // C5: remove overlays if present (defensive — DOM is wiped by parent on unmount)
      if (psiWrap) {
        var psiOv = psiWrap.querySelector('.dt-no-history-overlay');
        if (psiOv && psiOv.parentNode) psiOv.parentNode.removeChild(psiOv);
      }
      if (barWrap) {
        var barOv = barWrap.querySelector('.dt-no-history-overlay');
        if (barOv && barOv.parentNode) barOv.parentNode.removeChild(barOv);
      }
      container.removeEventListener('click', _onDtTrendsClick, false);
      // SDD mx60-detail-charts-parity WU7: baseline button listener cleanup
      container.removeEventListener('click', _onDtBaselineClick, false);
      if (MX60.EquipmentData && typeof MX60.EquipmentData.removeListener === 'function') {
        MX60.EquipmentData.removeListener(onDataChange);
      }
      if (typeof unsubscribeThresholds === 'function') unsubscribeThresholds();
      if (advInput) {
        advInput.removeEventListener('input',   onInputType, false);
        advInput.removeEventListener('focus',   advFocus,    false);
        advInput.removeEventListener('blur',    advBlur,     false);
        advInput.removeEventListener('keydown', advKey,      false);
      }
      if (critInput) {
        critInput.removeEventListener('input',   onInputType, false);
        critInput.removeEventListener('focus',   critFocus,   false);
        critInput.removeEventListener('blur',    critBlur,    false);
        critInput.removeEventListener('keydown', critKey,     false);
      }
    }

    return { destroy: destroy };
  }

  // -------------------------------------------------------------------------
  // Shell HTML
  // -------------------------------------------------------------------------
  function _shellHtml(equip) {
    var label = equip.label || equip.id;
    var planta = (equip.planta != null) ? ('Planta ' + equip.planta) : '';
    return '' +
      '<div class="dt-detail-shell">' +
        '<div class="detail-header">' +
          '<button type="button" class="detail-back" data-action="back" aria-label="Volver">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<polyline points="15 18 9 12 15 6"></polyline>' +
            '</svg>' +
          '</button>' +
          '<div class="detail-title-wrap">' +
            '<span class="detail-type-tag detail-type-datalogger">Datalogger</span>' +
            (planta ? '<span class="detail-planta-tag">' + escHtml(planta) + '</span>' : '') +
            '<h2 class="detail-title">' + escHtml(label) + '</h2>' +
            '<span class="detail-meta-id">' + escHtml(equip.id) + '</span>' +
            '<span class="dt-status-pill" data-dt-status-pill>—</span>' +
          '</div>' +
        '</div>' +

        '<div class="dt-grid">' +
          '<div class="dt-hero">' +
            '<div class="dt-hero-frame">' +
              '<img class="dt-hero-img" data-dt-hero-img src="" alt="" />' +
              '<span class="dt-hero-state" data-dt-hero-state>—</span>' +
            '</div>' +
          '</div>' +

          '<aside class="dt-side">' +
            '<div class="dt-panel dt-reading-panel">' +
              '<div class="dt-panel-title">Lectura</div>' +
              '<div class="dt-readout">' +
                '<div class="dt-readout-row">' +
                  '<span class="dt-readout-value" data-dt-psi>—</span>' +
                  '<span class="dt-readout-unit">PSI</span>' +
                '</div>' +
                '<div class="dt-readout-row dt-readout-row--secondary">' +
                  '<span class="dt-readout-value-sm" data-dt-bar>—</span>' +
                  '<span class="dt-readout-unit-sm">bar</span>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="dt-panel dt-thresholds-panel">' +
              '<div class="dt-panel-title">Umbrales</div>' +
              '<p class="dt-thresholds-help">Lectura &lt; umbral activa el estado degradado. Vacío = sin umbral.</p>' +
              '<label class="dt-threshold-field">' +
                '<span class="dt-threshold-label">Advertencia</span>' +
                '<span class="dt-threshold-input-wrap">' +
                  '<input type="text" inputmode="decimal" autocomplete="off" placeholder="—" data-dt-umbral="advertencia" class="dt-threshold-input" />' +
                  '<span class="dt-threshold-unit">PSI</span>' +
                '</span>' +
              '</label>' +
              '<label class="dt-threshold-field">' +
                '<span class="dt-threshold-label">Crítico</span>' +
                '<span class="dt-threshold-input-wrap">' +
                  '<input type="text" inputmode="decimal" autocomplete="off" placeholder="—" data-dt-umbral="critico" class="dt-threshold-input" />' +
                  '<span class="dt-threshold-unit">PSI</span>' +
                '</span>' +
              '</label>' +
              '<div class="dt-threshold-validation" data-dt-validation></div>' +
            '</div>' +
          '</aside>' +
        '</div>' +

        // C4 D4: trends sections — PSI chart + bar chart (REQ-G10-2)
        // SDD mx60-detail-charts-parity WU6: tabs now sourced from
        // MX60.HistoryVocabulary.RANGES (8 entries) via _dtRangeTabsHtml.
        // WU7: añade botón "Ayer" baseline overlay por chart (independientes).
        '<div class="dt-trends-section" data-dt-trends="psi">' +
          '<div class="dt-trends-header">' +
            '<span class="dt-trends-title">Tendencia: Presión (PSI)</span>' +
            '<div class="dt-trends-controls">' +
              _dtBaselineBtnHtml('psi') +
              _dtRangeTabsHtml('psi') +
            '</div>' +
          '</div>' +
          '<div class="dt-trends-canvas-wrap">' +
            '<canvas class="dt-trends-canvas" data-dt-chart="psi"></canvas>' +
          '</div>' +
        '</div>' +

        '<div class="dt-trends-section" data-dt-trends="bar">' +
          '<div class="dt-trends-header">' +
            '<span class="dt-trends-title">Tendencia: Presión (bar)</span>' +
            '<div class="dt-trends-controls">' +
              _dtBaselineBtnHtml('bar') +
              _dtRangeTabsHtml('bar') +
            '</div>' +
          '</div>' +
          '<div class="dt-trends-canvas-wrap">' +
            '<canvas class="dt-trends-canvas" data-dt-chart="bar"></canvas>' +
          '</div>' +
        '</div>' +

      '</div>';
  }

  // -------------------------------------------------------------------------
  // Register
  // -------------------------------------------------------------------------
  MX60.DataloggerDetail = { mount: mount };
  if (MX60.EquipmentDetail && typeof MX60.EquipmentDetail.registerRenderer === 'function') {
    MX60.EquipmentDetail.registerRenderer('datalogger', mount);
  }
})(window);
