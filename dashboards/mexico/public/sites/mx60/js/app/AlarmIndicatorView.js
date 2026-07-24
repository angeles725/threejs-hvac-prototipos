/**
 * AlarmIndicatorView.js — MX60 namespace
 *
 * SDD mx60-header-alarm-indicator-and-sticky-nav.
 *
 * Mounts a pulsing circular alarm indicator in #mx60-alarm-indicator-mount
 * (last child of .nav-bar-wrap). Long-lived — not route-bound. Mounted once
 * at boot via DashboardApp._bootAlarmIndicator() and never destroyed during
 * the page session (only on hard reload or explicit destroy() call).
 *
 * Visual states:
 *   - Hidden      (display:none)       — total === 0
 *   - Solid red   (quiescent)          — total >= 1, no new alarms in last 60s
 *   - Pulsing red (.is-pulsing)        — new composite key detected vs prev snapshot
 *
 * Click behavior:
 *   - total === 1  → navigate directly to #detail/<sourceId> (equipment detail)
 *   - total >= 2   → toggle popover
 *
 * Popover:
 *   - Header row:  "Total: N  ·  UP: X · Cárcamos: Y · DL: Z"
 *   - List items:  [Px]/[OF] sourceLabel · slotShort · value
 *   - Max-height: 360px; internal scroll only.
 *   - Click item → navigate + close popover.
 *   - ESC / click-outside → close popover.
 *
 * ES5 IIFE strict. var only. No arrow functions. No template literals.
 * No let/const. All handler refs named for removeEventListener.
 *
 * Lifecycle: init(mountEl) + destroy()
 * Designed to mirror _bootAlarmBadge pattern in DashboardApp.
 */
(function(window) {
  'use strict';

  var MX60 = window.MX60 || {};

  // =========================================================================
  // Constants
  // =========================================================================

  /** Map alarm.planta (integer) → badge label text. 0 or missing → '' (omit). */
  var PLANT_BADGE_MAP = {
    1: 'P1',
    2: 'P2',
    3: 'P3',
    4: 'P4',
    5: 'P5',
    6: 'OF'
  };

  /**
   * Maps triggerSlot strings (full match preferred, prefix fallback) to short
   * display labels. Two grammars coexist in this codebase:
   *
   *   1. UP alarmLatches keys (from BChiUp.alarmLatches slot, surfaced via
   *      AlarmLatchStore.latchedKeys): camelCase slot names like
   *      `sobrecargaFan`, `sobrecargaCompresor1`, `antifrezzeSistema2`.
   *
   *   2. Backend ChiAlarmHelper.SLOT_TO_TRIGGER outputs (from /api/alarms
   *      records served by BAlarmDatabase): dotted lowercase like
   *      `amperaje.compresorS1`, `temperatura.succionS1`, `nivel.precaucion`.
   *
   * Keys are sorted by length descending in _shortSlot() so the most-specific
   * match wins (avoids `amperaje.compresorS1` being shadowed by `amperaje`).
   */
  var SLOT_SHORT_MAP = {
    // UP alarmLatches (camelCase from BChiUp slot keys)
    'sobrecargaFan':         'Sobrec Fan',
    'sobrecargaCompresor1':  'Sobrec C1',
    'sobrecargaCompresor2':  'Sobrec C2',
    'sobrecargaAbanicos1':   'Sobrec Ab1',
    'sobrecargaAbanicos2':   'Sobrec Ab2',
    'antifrezzeSistema1':    'Antifrez S1',
    'antifrezzeSistema2':    'Antifrez S2',

    // Carcamo / Datalogger thresholds (latch key)
    'umbralAdvertencia':     'Advertencia',
    'umbralCritico':         'Crítico',

    // Backend SLOT_TO_TRIGGER outputs (dotted lowercase)
    'amperaje.compresorS1':  'Comp1',
    'amperaje.compresorS2':  'Comp2',
    'amperaje.abanicoS1':    'Aban1',
    'amperaje.abanicoS2':    'Aban2',
    'temperatura.abasto':    'Abasto',
    'temperatura.retorno':   'Retorno',
    'temperatura.zona':      'Zona',
    'temperatura.succionS1': 'Succ S1',
    'temperatura.succionS2': 'Succ S2',
    'nivel.precaucion':      'Nivel',
    'presion.precaucion':    'Presión',
    'comunicacion':          'Comms',
    'sensor.falla':          'Sensor',

    // Generic Niagara extension fallbacks
    'fault':                 'Falla',
    'offnormal':             'Fuera-Normal',
    'alarm':                 'Alarma'
  };

  /** Pulse auto-stops after 60s of no new alarm keys. */
  var PULSE_DURATION_MS = 60000;

  /**
   * Whitelist of sourceType values that represent our equipment threshold alarms.
   * Niagara's BAlarmDatabase may surface other alarms (comms, system, services)
   * with sourceType='unknown' or other values — those are NOT counted here.
   * The indicator must only reflect alarms the operator can act on from #detail/<id>.
   */
  var EQUIP_TYPES = { 'up': true, 'carcamo': true, 'datalogger': true };

  /** Return only alarms whose sourceType is in EQUIP_TYPES (equipment threshold alarms). */
  function _filterEquipAlarms(alarms) {
    if (!alarms) return [];
    var out = [];
    for (var i = 0; i < alarms.length; i++) {
      var a = alarms[i];
      if (a && a.sourceType && EQUIP_TYPES[a.sourceType]) {
        out.push(a);
      }
    }
    return out;
  }

  /**
   * Gather synthetic alarm records from AlarmLatchStore for UPs that have at
   * least one latched alarmKey. UP latches are sticky (cleared only by
   * `BChiUp.resetAlarmas()`) and may persist after the matching record was
   * acked-out of /api/alarms. This complements `_filterEquipAlarms()` (which
   * only sees AlarmsManager) so the indicator reflects the operator's actual
   * actionable state.
   */
  function _gatherUpLatchAlarms() {
    if (!window.MX60 || !MX60.EquipmentData || !MX60.AlarmLatchStore) return [];
    if (typeof MX60.EquipmentData.getByType !== 'function') return [];
    if (typeof MX60.AlarmLatchStore.latchedKeys !== 'function') return [];

    var ups = MX60.EquipmentData.getByType('up');
    var out = [];
    for (var i = 0; i < ups.length; i++) {
      var eq = ups[i];
      if (!eq || !eq.id) continue;
      var keys = MX60.AlarmLatchStore.latchedKeys(eq.id);
      if (!keys || !keys.length) continue;
      for (var j = 0; j < keys.length; j++) {
        out.push({
          sourceId:    eq.id,
          sourceType:  'up',
          sourceLabel: eq.label || eq.id,
          planta:      typeof eq.planta === 'number' ? eq.planta : 0,
          triggerSlot: keys[j],
          source:      eq.ord || '',
          value:       null  // not tracked in latch store
        });
      }
    }
    return out;
  }

  /**
   * Merge AlarmsManager alarms (carcamo/datalogger live offnormal + UP unacked
   * records) with AlarmLatchStore synthetic alarms (UP sticky latches). Dedup
   * by composite key `sourceId:triggerSlot`. AlarmsManager records win on
   * collision (they have richer fields like `value`).
   */
  function _gatherMergedAlarms() {
    var fromManager = (MX60.AlarmsManager && typeof MX60.AlarmsManager.getFiltered === 'function')
      ? _filterEquipAlarms(MX60.AlarmsManager.getFiltered({}))
      : [];
    var fromLatches = _gatherUpLatchAlarms();

    var byKey = {};
    var i, k;
    for (i = 0; i < fromManager.length; i++) {
      k = (fromManager[i].sourceId || '') + ':' + (fromManager[i].triggerSlot || '');
      byKey[k] = fromManager[i];
    }
    for (i = 0; i < fromLatches.length; i++) {
      k = (fromLatches[i].sourceId || '') + ':' + (fromLatches[i].triggerSlot || '');
      if (!byKey[k]) byKey[k] = fromLatches[i];
    }
    var out = [];
    for (k in byKey) {
      if (byKey.hasOwnProperty(k)) out.push(byKey[k]);
    }
    return out;
  }

  // =========================================================================
  // Module-private state (all nulled on destroy)
  // =========================================================================

  var _mountEl       = null;  // #mx60-alarm-indicator-mount
  var _btnEl         = null;  // .mx60-alarm-btn
  var _circleEl      = null;  // .mx60-alarm-indicator (count text inside)
  var _ringEl        = null;  // .mx60-pulse-ring
  var _popoverEl     = null;  // .mx60-alarm-popover
  var _listEl        = null;  // .mx60-popover-list
  var _headerEl      = null;  // .mx60-popover-header

  var _pulseTimerId  = null;  // setTimeout handle for pulse auto-stop
  var _prevKeySet    = {};    // hash-object used as diff set (sourceId:triggerSlot keys)
  var _mounted       = false;

  // Named function refs — needed for removeEventListener
  var _onCacheChange         = null;
  var _onBtnClick            = null;
  var _onDocClick            = null;
  var _onDocKeydown          = null;
  var _onPopoverClick        = null;
  var _onPopoverKeydown      = null;

  // AlarmLatchStore subscription returns its own unsubscribe function.
  var _unsubscribeLatchStore = null;

  // =========================================================================
  // destroy() — defined FIRST per tasks risk contract.
  // Must clean up ALL subscriptions, timers, DOM listeners, and DOM nodes.
  // =========================================================================

  function destroy() {
    // 1. Unsubscribe from AlarmsManager
    if (_onCacheChange && MX60.AlarmsManager && typeof MX60.AlarmsManager.removeListener === 'function') {
      MX60.AlarmsManager.removeListener(_onCacheChange);
    }

    // 1b. Unsubscribe from AlarmLatchStore (subscribe returns its own unsub fn)
    if (typeof _unsubscribeLatchStore === 'function') {
      _unsubscribeLatchStore();
      _unsubscribeLatchStore = null;
    }

    // 2. Clear pulse timer
    if (_pulseTimerId !== null) {
      clearTimeout(_pulseTimerId);
      _pulseTimerId = null;
    }

    // 3. Remove document-level event listeners
    if (_onDocClick) {
      document.removeEventListener('click', _onDocClick, false);
    }
    if (_onDocKeydown) {
      document.removeEventListener('keydown', _onDocKeydown, false);
    }

    // 4. Remove button click listener
    if (_btnEl && _onBtnClick) {
      _btnEl.removeEventListener('click', _onBtnClick, false);
    }

    // 5. Remove popover click listener
    if (_popoverEl && _onPopoverClick) {
      _popoverEl.removeEventListener('click', _onPopoverClick, false);
    }
    if (_popoverEl && _onPopoverKeydown) {
      _popoverEl.removeEventListener('keydown', _onPopoverKeydown, false);
    }

    // 6. Empty mount node and null DOM refs
    if (_mountEl) {
      _mountEl.innerHTML = '';
    }

    _btnEl         = null;
    _circleEl      = null;
    _ringEl        = null;
    _popoverEl     = null;
    _listEl        = null;
    _headerEl      = null;
    _mountEl       = null;

    // 7. Null handler refs
    _onCacheChange  = null;
    _onBtnClick     = null;
    _onDocClick     = null;
    _onDocKeydown   = null;
    _onPopoverClick = null;
    _onPopoverKeydown = null;

    // 8. Reset state
    _prevKeySet     = {};
    _mounted        = false;
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Build a hash-object key set keyed by sourceId only (one entry per equipment
   * in alarm). Used for the snapshot diff: pulse fires when a new EQUIPMENT
   * enters alarm state, NOT when an already-alarmed equipment gains another
   * latch. This matches the grouped UX: one item per equipment in the popover.
   * @param {Array} groups  result of _groupByEquip
   * @returns {Object} keys are sourceId strings, values are true
   */
  function _buildEquipKeySet(groups) {
    var keys = {};
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g && g.sourceId) keys[g.sourceId] = true;
    }
    return keys;
  }

  /**
   * Group an alarm array by sourceId. Each output entry represents ONE piece
   * of equipment with one or more active alarms. Slots are de-duplicated and
   * passed through _shortSlot() for display.
   * @param {Array} alarms  merged equipment-type alarms
   * @returns {Array<Object>}  [{ sourceId, sourceType, sourceLabel, planta, source, slots, count }]
   */
  function _groupByEquip(alarms) {
    if (!alarms || !alarms.length) return [];
    var byId = {};
    var order = [];
    for (var i = 0; i < alarms.length; i++) {
      var a = alarms[i];
      if (!a || !a.sourceId) continue;
      var id = a.sourceId;
      if (!byId[id]) {
        byId[id] = {
          sourceId:    id,
          sourceType:  a.sourceType || 'unknown',
          sourceLabel: a.sourceLabel || _shortSource(a.source),
          planta:      typeof a.planta === 'number' ? a.planta : 0,
          source:      a.source || '',
          slots:       [],
          _slotSet:    {}
        };
        order.push(id);
      }
      var slotShort = _shortSlot(a.triggerSlot || '');
      if (slotShort && !byId[id]._slotSet[slotShort]) {
        byId[id]._slotSet[slotShort] = true;
        byId[id].slots.push(slotShort);
      }
    }
    var out = [];
    for (var j = 0; j < order.length; j++) {
      var g = byId[order[j]];
      g.count = g.slots.length;
      delete g._slotSet;
      out.push(g);
    }
    return out;
  }

  /**
   * Shorten a triggerSlot string for display.
   * Tries each key in SLOT_SHORT_MAP as a prefix match.
   * Falls back to the raw slot value (or empty string).
   * @param {string} slot
   * @returns {string}
   */
  function _shortSlot(slot) {
    if (!slot) return '';
    // 1. Exact match wins
    if (SLOT_SHORT_MAP.hasOwnProperty(slot)) return SLOT_SHORT_MAP[slot];
    // 2. Prefix match, longest key first (avoids shadowing of compound slots)
    var keys = Object.keys(SLOT_SHORT_MAP);
    keys.sort(function(a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (slot.indexOf(k) === 0) return SLOT_SHORT_MAP[k];
    }
    return slot;
  }

  /**
   * Get the plant badge label from alarm.planta.
   * Returns '' when planta is 0 or not in the map (defensive collapse).
   * @param {number|undefined} planta
   * @returns {string}
   */
  function _plantaBadge(planta) {
    if (typeof planta === 'undefined' || planta === null) return '';
    var label = PLANT_BADGE_MAP[planta];
    return label || '';
  }

  /**
   * Derive a short source label from alarm.source (long ORD).
   * Takes only the last non-empty segment after '/', strips trailing descriptor.
   * Mirrors AlarmsPage._shortSource logic.
   * @param {string} source  full source ORD string
   * @returns {string}
   */
  function _shortSource(source) {
    if (!source) return '?';
    var segs = source.split('/');
    var last = '';
    for (var i = segs.length - 1; i >= 0; i--) {
      var s = (segs[i] || '').trim();
      if (s) { last = s; break; }
    }
    // Remove common suffixes like .alarm, :alarmHigh etc.
    last = last.replace(/\.(alarm|alarms|point)$/i, '').replace(/:[^:]+$/, '');
    return last || source;
  }

  // =========================================================================
  // Pulse management
  // =========================================================================

  function _startPulse() {
    if (_btnEl) _btnEl.classList.add('is-pulsing');
    if (_pulseTimerId !== null) clearTimeout(_pulseTimerId);
    _pulseTimerId = setTimeout(function() {
      _stopPulse();
    }, PULSE_DURATION_MS);
  }

  function _stopPulse() {
    if (_btnEl) _btnEl.classList.remove('is-pulsing');
    _pulseTimerId = null;
  }

  // =========================================================================
  // Popover
  // =========================================================================

  function _openPopover() {
    if (_popoverEl) _popoverEl.classList.add('is-open');
  }

  function _closePopover() {
    if (_popoverEl) _popoverEl.classList.remove('is-open');
  }

  function _isPopoverOpen() {
    return _popoverEl && _popoverEl.classList.contains('is-open');
  }

  // =========================================================================
  // Rendering
  // =========================================================================

  /**
   * Render (or re-render) the popover header summary row.
   * @param {Array} alarms  merged equipment-type alarms (from _gatherMergedAlarms)
   */
  function _renderHeader(groups) {
    if (!_headerEl) return;
    // Count EQUIPMENT in alarm (one entry per sourceId), not raw alarms.
    // This matches the grouped item rendering and the planta-row led-alarm
    // count (which also counts equipment, not individual latches).
    var up = 0, car = 0, dl = 0;
    if (groups) {
      for (var i = 0; i < groups.length; i++) {
        var st = groups[i] && groups[i].sourceType;
        if (st === 'up') up++;
        else if (st === 'carcamo') car++;
        else if (st === 'datalogger') dl++;
      }
    }
    var t = up + car + dl;
    var equipoTxt = (t === 1) ? 'equipo' : 'equipos';
    _headerEl.innerHTML =
      '<span class="mx60-popover-total">&#9888; ' + t + ' ' + equipoTxt + ' en alarma</span>' +
      '  &middot;  UP: ' + up +
      ' &middot; C&aacute;rcamos: ' + car +
      ' &middot; DL: ' + dl;
  }

  /**
   * Render the flat list of alarms inside the popover.
   * Uses innerHTML for full repaint (acceptable — max ~30 items in practice).
   * @param {Array} alarms
   */
  function _renderList(groups) {
    if (!_listEl) return;
    if (!groups || groups.length === 0) {
      _listEl.innerHTML = '<div style="padding:12px 14px;color:var(--text-muted);font-size:12px;">Sin alarmas activas</div>';
      return;
    }
    var rows = '';
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var badge = _plantaBadge(g.planta);
      var badgeHtml = '';
      if (badge) {
        badgeHtml = '<span class="mx60-alarm-plant-badge">[' + badge + ']</span>';
      }
      var label = g.sourceLabel || _shortSource(g.source);
      var slotsStr = (g.slots && g.slots.length) ? g.slots.join(', ') : '';
      var headerLine, subLine;
      if (g.count > 1) {
        headerLine = label + ' &middot; ' + g.count + ' alarmas';
        subLine = slotsStr;
      } else {
        headerLine = label;
        subLine = slotsStr;
      }
      // data-source-id stores the short sourceId for #detail/<id> equipment navigation
      rows +=
        '<div class="mx60-popover-item" tabindex="0" role="button"' +
        ' data-source-id="' + _escAttr(g.sourceId || '') + '">' +
        badgeHtml +
        '<span class="mx60-alarm-item-label" title="' + _escAttr(g.source || '') + '">' +
        '<span class="mx60-alarm-item-head">' + headerLine + '</span>' +
        (subLine ? '<span class="mx60-alarm-item-sub">' + subLine + '</span>' : '') +
        '</span>' +
        '</div>';
    }
    _listEl.innerHTML = rows;
  }

  /** Escape a string for use in an HTML attribute value (double-quoted). */
  function _escAttr(s) {
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/"/g,  '&quot;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;');
  }

  // =========================================================================
  // Core update logic — called by the AlarmsManager listener
  // =========================================================================

  /**
   * Called when AlarmsManager fires its listener.
   * The argument passed by the listener is the internal _cache reference — we
   * MUST call getFiltered({}) for a defensive copy (never mutate the original).
   */
  function _handleCacheChange() {
    if (!_mounted) return;

    // Merge AlarmsManager (live offnormal + unacked records) with AlarmLatchStore
    // (UP sticky latches that persist post-ack until resetAlarmas). Equipment-type
    // filter (up/carcamo/datalogger) is applied inside the merge.
    var alarms = _gatherMergedAlarms();
    // Group by equipment: 1 item per sourceId. This is the canonical view —
    // counts, pulse diff, click navigation all operate on groups.
    var groups = _groupByEquip(alarms);

    var total = groups.length;

    // Show/hide button
    if (!_btnEl) return;
    if (total === 0) {
      _btnEl.style.display = 'none';
      _closePopover();
      _prevKeySet = {};
      return;
    }
    _btnEl.style.display = 'flex';

    // Update count in circle
    if (_circleEl) {
      _circleEl.textContent = total > 99 ? '99+' : String(total);
    }

    // Snapshot diff — detect NEW EQUIPMENT entering alarm state. We diff by
    // sourceId (not sourceId:triggerSlot) so an already-alarmed equipment that
    // gains another latch does NOT re-pulse the indicator.
    var newKeySet = _buildEquipKeySet(groups);
    var hasNew = false;
    var k;
    for (k in newKeySet) {
      if (newKeySet.hasOwnProperty(k) && !_prevKeySet.hasOwnProperty(k)) {
        hasNew = true;
        break;
      }
    }
    _prevKeySet = newKeySet;

    if (hasNew) {
      _startPulse();
    }

    // If popover is open, re-render its content
    if (_isPopoverOpen()) {
      _renderHeader(groups);
      _renderList(groups);
    }
  }

  // =========================================================================
  // DOM construction
  // =========================================================================

  function _buildDOM(mountEl) {
    // Button wrapper
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mx60-alarm-btn';
    btn.setAttribute('aria-label', 'Indicador de alarmas activas');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.style.display = 'none'; // starts hidden until alarms load

    // Ripple ring (behind the circle)
    var ring = document.createElement('span');
    ring.className = 'mx60-pulse-ring';
    btn.appendChild(ring);

    // Circle with count
    var circle = document.createElement('span');
    circle.className = 'mx60-alarm-indicator';
    circle.textContent = '0';
    btn.appendChild(circle);

    // Popover container — child of the mount div (not the button,
    // so it's positioned relative to the mount which is in normal flow)
    var popover = document.createElement('div');
    popover.className = 'mx60-alarm-popover';
    popover.setAttribute('role', 'listbox');
    popover.setAttribute('aria-label', 'Alarmas activas');

    var header = document.createElement('div');
    header.className = 'mx60-popover-header';
    header.textContent = 'Total: 0';

    var list = document.createElement('div');
    list.className = 'mx60-popover-list';
    list.setAttribute('role', 'group');

    popover.appendChild(header);
    popover.appendChild(list);

    mountEl.appendChild(btn);
    mountEl.appendChild(popover);

    return {
      btn: btn,
      ring: ring,
      circle: circle,
      popover: popover,
      header: header,
      list: list
    };
  }

  // =========================================================================
  // Event wiring
  // =========================================================================

  function _wireEvents(alarms) {
    // Button click handler
    _onBtnClick = function(e) {
      e.stopPropagation();
      // Same merged source as _handleCacheChange, then grouped by equipment.
      // total === 1 fast-path now means "1 EQUIPMENT in alarm" (regardless of
      // how many latches it has) — consistent with the popover view.
      var currentAlarms = _gatherMergedAlarms();
      var currentGroups = _groupByEquip(currentAlarms);
      var total = currentGroups.length;

      if (total === 0) return;

      if (total === 1) {
        // Direct navigation — go to the only equipment in alarm.
        _closePopover();
        if (MX60.Router && typeof MX60.Router.navigate === 'function') {
          MX60.Router.navigate('#detail/' + (currentGroups[0].sourceId || ''));
        }
        return;
      }

      // Toggle popover
      if (_isPopoverOpen()) {
        _closePopover();
        _btnEl.setAttribute('aria-expanded', 'false');
      } else {
        _renderHeader(currentGroups);
        _renderList(currentGroups);
        _openPopover();
        _btnEl.setAttribute('aria-expanded', 'true');
      }
    };
    _btnEl.addEventListener('click', _onBtnClick, false);

    // Popover item click — navigate to equipment detail page
    _onPopoverClick = function(e) {
      var item = e.target;
      while (item && item !== _popoverEl && !item.classList.contains('mx60-popover-item')) {
        item = item.parentNode;
      }
      if (!item || !item.classList || !item.classList.contains('mx60-popover-item')) return;
      var sourceId = item.getAttribute('data-source-id');
      _closePopover();
      _btnEl.setAttribute('aria-expanded', 'false');
      if (sourceId && MX60.Router && typeof MX60.Router.navigate === 'function') {
        MX60.Router.navigate('#detail/' + sourceId);
      }
    };
    _popoverEl.addEventListener('click', _onPopoverClick, false);

    // WARNING-1 fix: popover items are <div role="button" tabindex="0"> — NOT
    // native buttons — so Enter/Space don't auto-fire click. Add an explicit
    // keydown handler to dispatch a synthetic click when the focused item
    // receives Enter or Space.
    _onPopoverKeydown = function(e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.keyCode !== 13 && e.keyCode !== 32) return;
      var item = e.target;
      while (item && item !== _popoverEl && !(item.classList && item.classList.contains('mx60-popover-item'))) {
        item = item.parentNode;
      }
      if (!item || !item.classList || !item.classList.contains('mx60-popover-item')) return;
      e.preventDefault();
      var sourceId = item.getAttribute('data-source-id');
      _closePopover();
      _btnEl.setAttribute('aria-expanded', 'false');
      if (sourceId && MX60.Router && typeof MX60.Router.navigate === 'function') {
        MX60.Router.navigate('#detail/' + sourceId);
      }
    };
    _popoverEl.addEventListener('keydown', _onPopoverKeydown, false);

    // Document-level click — close popover when clicking outside
    _onDocClick = function(e) {
      if (!_isPopoverOpen()) return;
      var target = e.target;
      if (_btnEl && _btnEl.contains(target)) return;
      if (_popoverEl && _popoverEl.contains(target)) return;
      _closePopover();
      if (_btnEl) _btnEl.setAttribute('aria-expanded', 'false');
    };
    document.addEventListener('click', _onDocClick, false);

    // Document-level keydown — close popover on ESC
    _onDocKeydown = function(e) {
      if (e.key === 'Escape' && _isPopoverOpen()) {
        _closePopover();
        if (_btnEl) {
          _btnEl.setAttribute('aria-expanded', 'false');
          _btnEl.focus();
        }
      }
    };
    document.addEventListener('keydown', _onDocKeydown, false);
  }

  // =========================================================================
  // init() — public entry point
  // =========================================================================

  /**
   * Mount the alarm indicator into the given element.
   * Intended to be called once from DashboardApp._bootAlarmIndicator().
   * Idempotent — subsequent calls without a prior destroy() are no-ops.
   *
   * @param {HTMLElement} mountEl  The #mx60-alarm-indicator-mount div.
   */
  function init(mountEl) {
    if (_mounted) return; // guard against double-init

    if (!mountEl) {
      console.warn('[AlarmIndicatorView] init: mountEl not found');
      return;
    }

    if (!MX60.AlarmsManager) {
      console.warn('[AlarmIndicatorView] init: MX60.AlarmsManager not available');
      return;
    }

    _mountEl = mountEl;

    // Build DOM
    var els = _buildDOM(mountEl);
    _btnEl    = els.btn;
    _ringEl   = els.ring;
    _circleEl = els.circle;
    _popoverEl = els.popover;
    _headerEl  = els.header;
    _listEl    = els.list;

    _mounted = true;

    // Wire events
    _wireEvents();

    // Subscribe to AlarmsManager — store named ref for removeListener
    _onCacheChange = function() {
      _handleCacheChange();
    };
    MX60.AlarmsManager.addListener(_onCacheChange);

    // Subscribe to AlarmLatchStore too — UP latches are sticky and may change
    // independently of /api/alarms (e.g. operator resetAlarmas() or seed
    // refresh from /api/equipment polling). subscribe() returns an unsub fn.
    if (MX60.AlarmLatchStore && typeof MX60.AlarmLatchStore.subscribe === 'function') {
      _unsubscribeLatchStore = MX60.AlarmLatchStore.subscribe(function() {
        _handleCacheChange();
      });
    }

    // Initial render — trigger a sync read of the current cache state.
    // Empty prevKeySet means initial alarms will pulse (intentional: spec §REQ-2,
    // smoke S-3 — initial-mount pulse on pre-existing alarms).
    _handleCacheChange();

    console.info('[AlarmIndicatorView] mounted');
  }

  // =========================================================================
  // Public API
  // =========================================================================

  MX60.AlarmIndicatorView = {
    init:    init,
    // WARNING-3: spec required {init, mount, destroy}. mount() is an alias of
    // init() — same signature, same effect, kept distinct names for callers
    // that follow the project's standard mount()/destroy() convention.
    mount:   init,
    destroy: destroy
  };

  window.MX60 = MX60;

})(window);
