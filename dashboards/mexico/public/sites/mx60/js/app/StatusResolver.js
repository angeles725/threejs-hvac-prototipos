/**
 * MX60.StatusResolver
 *
 * Single source of truth for the "effective" status of an equipment when
 * latched alarms are active. Any module that displays a badge / pill / class
 * derived from `equip.status` or `equip.state` should call effective() so
 * the alarm condition propagates everywhere consistently.
 *
 * Rule: if MX60.AlarmLatchStore.hasAnyLatched(equip.id) → behaves as alarm.
 *       else → returns the underlying equip.status / equip.state untouched.
 *
 * ⚠️ MOCK INTERLOCK note: this layer disappears when the Niagara station
 * becomes the source of truth — the station already publishes the alarm
 * state on the equip itself; the frontend just reads it.
 */
(function () {
  'use strict';
  if (typeof window.MX60 === 'undefined') window.MX60 = {};

  function _hasAnyLatched(equip) {
    if (!equip || !equip.id) return false;
    var aStore = window.MX60 && window.MX60.AlarmLatchStore;
    return !!(aStore && aStore.hasAnyLatched(equip.id));
  }

  /** Returns equip.status, or 'alarm' when at least one alarm is latched. */
  function effectiveStatus(equip) {
    if (!equip) return '';
    if (_hasAnyLatched(equip)) return 'alarm';
    return equip.status || '';
  }

  /** Returns equip.state, bumped to 2 (danger) when any alarm is latched. */
  function effectiveState(equip) {
    if (!equip) return undefined;
    if (_hasAnyLatched(equip)) return 2;
    return equip.state;
  }

  /** Convenience: returns true when at least one latched alarm exists. */
  function isLatched(equip) { return _hasAnyLatched(equip); }

  window.MX60.StatusResolver = {
    effectiveStatus: effectiveStatus,
    effectiveState:  effectiveState,
    isLatched:       isLatched
  };
})();
