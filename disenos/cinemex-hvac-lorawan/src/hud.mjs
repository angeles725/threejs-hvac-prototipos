/**
 * The HUD is DERIVED, never declared.
 *
 * The status line (`#app-status`), its severity dot and the alarm list (`#alarm-list`) are three
 * views of ONE fact: the alarms the simulation produced. They read the same `model.alarms` here, so
 * a status line that claims "sin alarmas" while the list shows an active event is not a copy bug the
 * caller can re-introduce — it is unrepresentable.
 *
 * UI copy is es-MX, matching the rest of the application shell.
 */

const NO_ALARMS_TEXT = 'Sistema listo · Sin alarmas';
const EMPTY_LIST_TEXT = 'Sin alarmas activas.';

/**
 * @param {ReturnType<import('./scene/interaction.js').createInteractionModel>} model
 * @returns {{
 *   severity: 'normal' | 'alarm',
 *   alarmCount: number,
 *   stoppedCount: number,
 *   claimsNoAlarms: boolean,
 *   statusText: string,
 *   alarmItems: ReadonlyArray<{ text: string, severity: 'normal' | 'alarm' }>,
 * }}
 */
export function deriveHudModel(model) {
  const alarms = model.alarms ?? [];
  const stopped = model.niagaraDelivery?.stopped ?? [];
  const alarmCount = alarms.length;
  const stoppedCount = stopped.length;
  const severity = alarmCount === 0 ? 'normal' : 'alarm';

  // Delivery is a separate question from alarm: a hot thermostat still reports to Niagara. The copy
  // only claims a Niagara outage when the topology actually stopped a device.
  const statusText = alarmCount === 0
    ? NO_ALARMS_TEXT
    : `Sistema en alarma · ${alarmCount} evento(s)`
      + (stoppedCount > 0
        ? ` · Niagara sin datos de ${stoppedCount} termostato(s)`
        : ' · Niagara sigue recibiendo datos');

  const alarmItems = alarmCount === 0
    ? [Object.freeze({ text: EMPTY_LIST_TEXT, severity: 'normal' })]
    : alarms.map((alarm) => Object.freeze({
      text: `${alarm.deviceId} · ${alarm.message}`,
      severity: 'alarm',
    }));

  return Object.freeze({
    severity,
    alarmCount,
    stoppedCount,
    claimsNoAlarms: alarmCount === 0,
    statusText,
    alarmItems: Object.freeze(alarmItems),
  });
}
