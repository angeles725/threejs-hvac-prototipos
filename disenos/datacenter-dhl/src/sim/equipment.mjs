/**
 * P1-2 — single-source deterministic equipment sim for the DHL datacenter room.
 *
 * One model feeds BOTH the room value chips (this phase) and the six detail-view data objects
 * (phase 2 wires them): the hardcoded-pill era where the room said "PDU 142 kW" while the
 * detail said 118 ends here. Conventions follow cinemex src/sim (seeded hash draws, rounded
 * stored values, `createXModel({ tick })` builders returning frozen data).
 *
 * Physics per kind (all values are stored ROUNDED, and every derived value is recomputed from
 * the rounded inputs so the identities close exactly under test):
 *   - rack:   inlet air °C + IT load kW (white-space bands for a contained cold aisle);
 *   - crac:   return = supply + coil deltaT; EC fan %;
 *   - inrow:  sensible-heat identity — loadKw = k · airflow(m³/h) · deltaT, airflow follows
 *             fan %, deltaT recomputed from the rounded load so the triangle is auditable;
 *   - pdu:    kW = kVA · pf · load%, always inside the rating;
 *   - ups:    runtime = 60 · bankKwh · battery% / loadKw;
 *   - dry:    water-out = ambient + approach; the approach falls as the fans work harder.
 *
 * Status is DERIVED from the values via exported thresholds (deriveStatus), never asserted.
 * Value generation places exactly one deterministic unit (warn-ranked hash pick) in its kind's
 * warn band and everyone else safely below, so the room is neither fake-perfect nor
 * fake-alarmed — and the invariant survives the tick waves by margin construction.
 */
import { deterministicUnit, round } from './seed.mjs';

export const SIM_POLICY = Object.freeze({
  seed: 20260716,
  // Site ambient the exterior dry cooler rejects against (hot Mexican afternoon).
  ambientC: 31.5,
  // Sensible heat for air: kW ≈ 0.00034 · m³/h · ΔT (ρ ≈ 1.2 kg/m³, cp ≈ 1.005 kJ/kg·K).
  airKwPerM3hK: 0.00034,
  // One shared slow wave family: values breathe over ticks without crossing status margins.
  wavePeriodTicks: 96,
  kinds: Object.freeze({
    rack: Object.freeze({
      inletC: Object.freeze([22.2, 25.4]),
      warnInletC: Object.freeze([27.6, 28.8]),
      itLoadKw: Object.freeze([4.2, 8.4]),
      waveC: 0.15,
      waveKw: 0.2,
    }),
    crac: Object.freeze({
      supplyC: Object.freeze([15.2, 16.8]),
      deltaTC: Object.freeze([7.4, 8.8]),
      fanPct: Object.freeze([76, 90]),
      warnFanPct: Object.freeze([96, 99]),
      waveC: 0.1,
      wavePct: 1,
    }),
    inrow: Object.freeze({
      supplyC: Object.freeze([17.6, 18.4]),
      fanPct: Object.freeze([58, 74]),
      deltaTC: Object.freeze([13.5, 18.5]),
      warnDeltaTC: Object.freeze([21, 23.5]),
      maxAirflowM3h: 6200,
      waveC: 0.1,
      wavePct: 1,
      waveDeltaTC: 0.3,
    }),
    pdu: Object.freeze({
      ratedKva: 160,
      powerFactor: 0.96,
      loadPct: Object.freeze([52, 76]),
      warnLoadPct: Object.freeze([87, 92]),
      wavePct: 1,
    }),
    ups: Object.freeze({
      capacityKw: 180,
      bankKwh: 58,
      loadPct: Object.freeze([58, 76]),
      warnLoadPct: Object.freeze([87, 92]),
      batteryPct: 100,
      wavePct: 1,
    }),
    dry: Object.freeze({
      fanPct: Object.freeze([58, 80]),
      warnFanPct: Object.freeze([92, 98]),
      // approach = base − gain · fan% (harder fans close the approach) inside the normal band;
      // the warn draw models fouled coils: fans flat out and the approach still blown open.
      approachBaseK: 9.2,
      approachFanGainKPerPct: 0.062,
      warnApproachK: Object.freeze([7.9, 8.7]),
      rangeK: Object.freeze([4.5, 5.5]),
      waveK: 0.12,
      wavePct: 1,
    }),
  }),
});

/** Warn/alarm thresholds per kind, over that kind's status-driving gauge. */
export const STATUS_THRESHOLDS = Object.freeze({
  rack: Object.freeze({ gauge: 'inletTempC', warn: 27, alarm: 31 }),
  crac: Object.freeze({ gauge: 'fanPct', warn: 95, alarm: 100 }),
  inrow: Object.freeze({ gauge: 'deltaTC', warn: 20, alarm: 27 }),
  pdu: Object.freeze({ gauge: 'loadPct', warn: 85, alarm: 96 }),
  ups: Object.freeze({ gauge: 'loadPct', warn: 85, alarm: 96 }),
  dry: Object.freeze({ gauge: 'approachK', warn: 7.5, alarm: 10 }),
});

/**
 * The placement-block registry — index.html walks THIS list when it registers pivots, so the
 * sim, the chips and the click-through detail routes all name the same instances.
 */
export const EQUIPMENT_INSTANCES = Object.freeze([
  Object.freeze({ id: 'crac-01', kind: 'crac', label: 'CRAC 01' }),
  Object.freeze({ id: 'crac-02', kind: 'crac', label: 'CRAC 02' }),
  Object.freeze({ id: 'crac-03', kind: 'crac', label: 'CRAC 03' }),
  Object.freeze({ id: 'inrow-01', kind: 'inrow', label: 'In-row 01' }),
  Object.freeze({ id: 'inrow-02', kind: 'inrow', label: 'In-row 02' }),
  Object.freeze({ id: 'ups-01', kind: 'ups', label: 'UPS 01' }),
  Object.freeze({ id: 'pdu-01', kind: 'pdu', label: 'PDU 01' }),
  Object.freeze({ id: 'dry-01', kind: 'dry', label: 'Dry cooler 01' }),
  Object.freeze({ id: 'rack-01', kind: 'rack', label: 'Rack A-01' }),
  Object.freeze({ id: 'rack-02', kind: 'rack', label: 'Rack A-02' }),
  Object.freeze({ id: 'rack-03', kind: 'rack', label: 'Rack A-03' }),
]);

const lerp = (t, [lo, hi]) => lo + (hi - lo) * t;

/** Deterministic per-unit slow wave: amplitude · sin(2π(tick/period + phase(id))). */
function waveOf(seed, id, field, tick, amplitude) {
  const phase = deterministicUnit(seed, `phase:${field}:${id}`);
  return amplitude * Math.sin(((tick / SIM_POLICY.wavePeriodTicks) + phase) * Math.PI * 2);
}

/** The one deterministic warn unit: highest warn-rank hash wins (ids break impossible ties). */
export function pickWarnId(seed = SIM_POLICY.seed) {
  let bestId = EQUIPMENT_INSTANCES[0].id;
  let bestRank = -1;
  for (const { id } of EQUIPMENT_INSTANCES) {
    const rank = deterministicUnit(seed, `warn-rank:${id}`);
    if (rank > bestRank) { bestRank = rank; bestId = id; }
  }
  return bestId;
}

/** Status honestly derived from the values: threshold check over the kind's gauge. */
export function deriveStatus(kind, values) {
  const { gauge, warn, alarm } = STATUS_THRESHOLDS[kind];
  const reading = values[gauge];
  if (reading >= alarm) return 'alarm';
  if (reading >= warn) return 'warn';
  if (kind === 'ups' && values.batteryPct < 80) return 'warn';
  return 'normal';
}

// --- per-kind value builders (draw → wave → round; derived values from rounded inputs) ------

function buildRack({ seed, id, tick, warn }) {
  const spec = SIM_POLICY.kinds.rack;
  const band = warn ? spec.warnInletC : spec.inletC;
  const inletTempC = round(lerp(deterministicUnit(seed, `inlet:${id}`), band)
    + waveOf(seed, id, 'inlet', tick, spec.waveC));
  const itLoadKw = round(lerp(deterministicUnit(seed, `load:${id}`), spec.itLoadKw)
    + waveOf(seed, id, 'load', tick, spec.waveKw));
  return { inletTempC, itLoadKw };
}

function buildCrac({ seed, id, tick, warn }) {
  const spec = SIM_POLICY.kinds.crac;
  const supplyTempC = round(lerp(deterministicUnit(seed, `supply:${id}`), spec.supplyC)
    + waveOf(seed, id, 'supply', tick, spec.waveC));
  const deltaTC = round(lerp(deterministicUnit(seed, `deltat:${id}`), spec.deltaTC));
  const returnTempC = round(supplyTempC + deltaTC);
  const fanPct = Math.round(lerp(deterministicUnit(seed, `fan:${id}`), warn ? spec.warnFanPct : spec.fanPct)
    + waveOf(seed, id, 'fan', tick, spec.wavePct));
  return { supplyTempC, returnTempC, deltaTC, fanPct };
}

function buildInrow({ seed, id, tick, warn }) {
  const spec = SIM_POLICY.kinds.inrow;
  const supplyTempC = round(lerp(deterministicUnit(seed, `supply:${id}`), spec.supplyC)
    + waveOf(seed, id, 'supply', tick, spec.waveC));
  const fanPct = Math.round(lerp(deterministicUnit(seed, `fan:${id}`), spec.fanPct)
    + waveOf(seed, id, 'fan', tick, spec.wavePct));
  const airflowM3h = Math.round(spec.maxAirflowM3h * (fanPct / 100));
  // The deltaT target drives the load; deltaT is then RECOMPUTED from the rounded load so the
  // sensible-heat triangle (load = k · airflow · deltaT) closes on the stored numbers.
  const deltaTarget = lerp(deterministicUnit(seed, `deltat:${id}`), warn ? spec.warnDeltaTC : spec.deltaTC)
    + waveOf(seed, id, 'deltat', tick, spec.waveDeltaTC);
  const loadKw = round(SIM_POLICY.airKwPerM3hK * airflowM3h * deltaTarget);
  const deltaTC = round(loadKw / (SIM_POLICY.airKwPerM3hK * airflowM3h));
  const returnTempC = round(supplyTempC + deltaTC);
  return { supplyTempC, returnTempC, deltaTC, fanPct, airflowM3h, loadKw };
}

function buildPdu({ seed, id, tick, warn }) {
  const spec = SIM_POLICY.kinds.pdu;
  const loadPct = Math.round(lerp(deterministicUnit(seed, `load:${id}`), warn ? spec.warnLoadPct : spec.loadPct)
    + waveOf(seed, id, 'load', tick, spec.wavePct));
  const loadKw = round(spec.ratedKva * spec.powerFactor * (loadPct / 100));
  return { loadKw, loadPct, ratedKva: spec.ratedKva, powerFactor: spec.powerFactor };
}

function buildUps({ seed, id, tick, warn }) {
  const spec = SIM_POLICY.kinds.ups;
  const loadPct = Math.round(lerp(deterministicUnit(seed, `load:${id}`), warn ? spec.warnLoadPct : spec.loadPct)
    + waveOf(seed, id, 'load', tick, spec.wavePct));
  const loadKw = round(spec.capacityKw * (loadPct / 100));
  const batteryPct = spec.batteryPct;
  const runtimeMin = Math.round((60 * spec.bankKwh * (batteryPct / 100)) / loadKw);
  return { loadPct, loadKw, batteryPct, runtimeMin, capacityKw: spec.capacityKw, bankKwh: spec.bankKwh };
}

function buildDry({ seed, id, tick, warn }) {
  const spec = SIM_POLICY.kinds.dry;
  const fanPct = Math.round(lerp(deterministicUnit(seed, `fan:${id}`), warn ? spec.warnFanPct : spec.fanPct)
    + waveOf(seed, id, 'fan', tick, spec.wavePct));
  const approachK = round((warn
    ? lerp(deterministicUnit(seed, `approach:${id}`), spec.warnApproachK)
    : spec.approachBaseK - spec.approachFanGainKPerPct * fanPct)
    + waveOf(seed, id, 'approach', tick, spec.waveK));
  const waterOutC = round(SIM_POLICY.ambientC + approachK);
  const waterInC = round(waterOutC + lerp(deterministicUnit(seed, `range:${id}`), spec.rangeK));
  return { waterOutC, waterInC, approachK, fanPct, ambientC: SIM_POLICY.ambientC };
}

const BUILDERS = Object.freeze({
  rack: buildRack, crac: buildCrac, inrow: buildInrow, pdu: buildPdu, ups: buildUps, dry: buildDry,
});

// --- chip copy (es-MX, two lines: primary value + secondary; no em dashes) ------------------

const CHIP_FORMATTERS = Object.freeze({
  rack: (v) => ({ primary: `${v.inletTempC.toFixed(1)} °C`, secondary: `${v.itLoadKw.toFixed(1)} kW` }),
  crac: (v) => ({
    primary: `${v.supplyTempC.toFixed(1)}→${v.returnTempC.toFixed(1)} °C`,
    secondary: `VENT ${v.fanPct} %`,
  }),
  inrow: (v) => ({
    primary: `${v.supplyTempC.toFixed(1)} / ${v.returnTempC.toFixed(1)} °C`,
    secondary: `VENT ${v.fanPct} %`,
  }),
  pdu: (v) => ({ primary: `${v.loadKw.toFixed(1)} kW`, secondary: `CARGA ${v.loadPct} %` }),
  ups: (v) => ({ primary: `CARGA ${v.loadPct} %`, secondary: `BAT ${v.batteryPct} %` }),
  dry: (v) => ({ primary: `AGUA ${v.waterOutC.toFixed(1)} °C`, secondary: `VENT ${v.fanPct} %` }),
});

/** The whole room at one tick: frozen unit records plus a byId index. */
export function createEquipmentModel({ seed = SIM_POLICY.seed, tick = 0 } = {}) {
  const warnId = pickWarnId(seed);
  const units = EQUIPMENT_INSTANCES.map((instance) => {
    const values = Object.freeze(BUILDERS[instance.kind]({
      seed, id: instance.id, tick, warn: instance.id === warnId,
    }));
    const status = deriveStatus(instance.kind, values);
    const chip = Object.freeze(CHIP_FORMATTERS[instance.kind](values));
    return Object.freeze({ ...instance, status, chip, values });
  });
  return Object.freeze({
    seed,
    tick,
    warnId,
    units: Object.freeze(units),
    byId: new Map(units.map((unit) => [unit.id, unit])),
  });
}

/** Chip feed shape: id → { primary, secondary, status } (what the scene chips consume). */
export function chipReadingsOf(model) {
  return Object.fromEntries(model.units.map((unit) => [
    unit.id,
    { primary: unit.chip.primary, secondary: unit.chip.secondary, status: unit.status },
  ]));
}
