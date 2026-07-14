import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { APP_CONFIG } from '../src/config.mjs';
import { deriveAlarms } from '../src/alarms.mjs';
import { FAULT_IDS, createSimulationState, injectFault, restoreFault } from '../src/simulation.mjs';

const ALARMS_SOURCE = readFileSync(fileURLToPath(new URL('../src/alarms.mjs', import.meta.url)), 'utf8');

/**
 * The alarm list is read by a Spanish (es-MX) audience: `#alarm-list` renders `alarm.message`
 * verbatim. This vocabulary guard is a PROPERTY over the whole message surface, not a snapshot of
 * today's copy — any future English message, of any kind, trips it.
 *
 * Identifiers stay English on purpose (`kind: 'temperature-high'`, `severity: 'alarm'`, device ids),
 * so the guard is applied to message text only.
 */
const ENGLISH_MARKERS = /\b(high|low|temperature|offline|no data|is not|not reaching|stopped|failure|interrupted|link|down|data path|reaching)\b/i;

/** Every `kind:` the module can emit, read from the source so a new kind cannot dodge the guard. */
function declaredAlarmKinds() {
  return new Set([...ALARMS_SOURCE.matchAll(/kind:\s*'([^']+)'/g)].map(([, kind]) => kind));
}

/** Every alarm the module can emit, one fault at a time, keyed by kind. */
function everyEmittableAlarm() {
  const healthy = createSimulationState(APP_CONFIG, { seed: 30 });
  return Object.values(FAULT_IDS)
    .flatMap((faultId) => deriveAlarms(APP_CONFIG, injectFault(APP_CONFIG, healthy, faultId)));
}

test('healthy simulation has no active alarms', () => {
  const state = createSimulationState(APP_CONFIG, { seed: 30, tick: 2 });
  assert.deepEqual(deriveAlarms(APP_CONFIG, state), []);
});

test('high and low temperature faults identify device, zone, severity and Niagara delivery', () => {
  const healthy = createSimulationState(APP_CONFIG, { seed: 30 });
  const high = injectFault(APP_CONFIG, healthy, FAULT_IDS.KITCHEN_HIGH_TEMPERATURE);
  const low = injectFault(APP_CONFIG, healthy, FAULT_IDS.AUDITORIUM_LOW_TEMPERATURE);

  assert.deepEqual(deriveAlarms(APP_CONFIG, high), [{
    id: 'temperature-high:TC300-05',
    kind: 'temperature-high',
    severity: 'alarm',
    deviceId: 'TC300-05',
    zoneId: 'kitchen',
    causeId: 'TC300-05',
    reachesNiagara: true,
    message: 'Temperatura alta en Cocina y preparación (31.2 °C).',
  }]);
  assert.equal(deriveAlarms(APP_CONFIG, low)[0].id, 'temperature-low:TC300-07');
  assert.equal(deriveAlarms(APP_CONFIG, low)[0].reachesNiagara, true);
  assert.match(deriveAlarms(APP_CONFIG, low)[0].message, /^Temperatura baja en /);

  // The literals above are today's copy; this is the invariant they must keep honouring.
  assert.doesNotMatch(deriveAlarms(APP_CONFIG, high)[0].message, ENGLISH_MARKERS);
  assert.doesNotMatch(deriveAlarms(APP_CONFIG, low)[0].message, ENGLISH_MARKERS);
});

test('a TC300 communication loss stops only that device data and clears on restore', () => {
  const healthy = createSimulationState(APP_CONFIG, { seed: 44 });
  const failed = injectFault(APP_CONFIG, healthy, FAULT_IDS.TC300_COMMUNICATION_LOSS);
  const alarms = deriveAlarms(APP_CONFIG, failed);

  assert.equal(alarms.length, 1);
  assert.deepEqual(alarms[0], {
    id: 'communication:TC300-08',
    kind: 'communication',
    severity: 'alarm',
    deviceId: 'TC300-08',
    zoneId: 'sala-3',
    causeId: 'TC300-08',
    reachesNiagara: false,
    message: 'Sin comunicación; sus datos no llegan a Niagara.',
  });
  assert.doesNotMatch(alarms[0].message, ENGLISH_MARKERS);

  assert.deepEqual(
    deriveAlarms(APP_CONFIG, restoreFault(APP_CONFIG, failed, FAULT_IDS.TC300_COMMUNICATION_LOSS)),
    [],
  );
});

test('UC100-B failure propagates reachability alarms only to Sala 1–4 thermostats', () => {
  const healthy = createSimulationState(APP_CONFIG, { seed: 50 });
  const failed = injectFault(APP_CONFIG, healthy, FAULT_IDS.UC100_FAILURE);
  const communicationAlarms = deriveAlarms(APP_CONFIG, failed).filter(({ kind }) => kind === 'reachability');

  assert.deepEqual(communicationAlarms.map(({ deviceId }) => deviceId), [
    'TC300-06', 'TC300-07', 'TC300-08', 'TC300-09',
  ]);
  assert.ok(communicationAlarms.every(({ causeId, reachesNiagara }) => causeId === 'UC100-B' && !reachesNiagara));
  assert.equal(communicationAlarms.some(({ deviceId }) => deviceId === 'TC300-10'), false);
  assert.equal(
    communicationAlarms[0].message,
    'Ruta de datos de TC300-06 interrumpida en UC100-B.',
  );
  assert.ok(communicationAlarms.every(({ message }) => !ENGLISH_MARKERS.test(message)));
});

test('Internet loss marks all thermostat paths unavailable while retaining their local communication', () => {
  const healthy = createSimulationState(APP_CONFIG, { seed: 61 });
  const failed = injectFault(APP_CONFIG, healthy, FAULT_IDS.INTERNET_LOSS);
  const alarms = deriveAlarms(APP_CONFIG, failed).filter(({ kind }) => kind === 'reachability');

  assert.equal(alarms.length, 14);
  assert.ok(alarms.every(({ causeId, reachesNiagara }) => causeId === 'internet' && reachesNiagara === false));
  assert.ok(Object.values(failed.telemetry).every(({ communication }) => communication === 'normal'));
});

test('every alarm kind the module can emit renders its message in Spanish, not English', () => {
  const declared = declaredAlarmKinds();
  const emitted = everyEmittableAlarm();
  const covered = new Set(emitted.map(({ kind }) => kind));

  // The guard is only worth its name if the sample exercises the whole vocabulary.
  assert.ok(declared.size > 0, 'alarms.mjs must declare at least one alarm kind');
  assert.deepEqual(
    [...covered].sort(),
    [...declared].sort(),
    'the fault set must exercise every alarm kind declared in alarms.mjs',
  );

  for (const alarm of emitted) {
    assert.doesNotMatch(
      alarm.message,
      ENGLISH_MARKERS,
      `alarm "${alarm.kind}" leaks English copy into the es-MX UI: ${alarm.message}`,
    );
  }
});

test('no message template in alarms.mjs is written in English', () => {
  // `${...}` holes are code (identifiers stay English by design); their runtime values are covered
  // by the emitted-message guard above. Only the literal copy around them is scanned here.
  const templates = [...ALARMS_SOURCE.matchAll(/message:\s*`([^`]*)`/g)]
    .map(([, template]) => template.replaceAll(/\$\{[^}]*\}/g, ' '));

  assert.equal(templates.length, declaredAlarmKinds().size, 'each alarm kind must carry one message template');
  for (const template of templates) {
    assert.doesNotMatch(template, ENGLISH_MARKERS, `English message template in alarms.mjs: ${template}`);
  }
});
