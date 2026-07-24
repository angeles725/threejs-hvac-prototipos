/**
 * Mock data para los endpoints REST del módulo SanLuis (sanluis-ux).
 *
 * Contratos respetados (extraídos del UX real):
 *   - EquipmentCard usa: equipName, tag, location, setPointCool, ipAddress,
 *     macAddress, chilledWater, networkConnection, fanOn, online, alarm,
 *     tempAmbiente, humidity.
 *   - Monitor agregado por piso debe tener: total, fanOn, standby, alarms
 *     (los KPIs LEDs del home leen esos exactos).
 */

function jitter(base, amplitude, seed) {
  var sec = Math.floor(Date.now() / 1000);
  var h = Math.sin((sec + (seed || 0)) * 9301 + base * 7) * 10000;
  var n = h - Math.floor(h);
  return base + (n * 2 - 1) * amplitude;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export function snlsConfig() {
  /* sanluis-ux usa window.SNLS_CONFIG hardcodeado en js/config.js,
     este endpoint queda como espejo defensivo (no se llama). */
  return {
    api: {
      config: '/snls/api/config',
      monitor: '/snls/api/monitor/',
      equipment: '/snls/api/equipment/',
      historyList: '/snls/api/history/list',
      historyData: '/snls/api/history/data',
      alarms: '/snls/api/alarms',
      alarmCounts: '/snls/api/alarms/counts',
      schedules: '/snls/api/schedules',
      equipmentHistories: '/snls/api/equipment-histories/',
      setpoint: '/snls/api/setpoint',
    },
    monitorOrds: {},
    floors: [
      { number: 4, name: 'Piso 4', color: '#00d4aa', key: 'piso4' },
      { number: 5, name: 'Piso 5', color: '#00b894', key: 'piso5' },
      { number: 6, name: 'Piso 6', color: '#00a88a', key: 'piso6' },
      { number: 7, name: 'Piso 7', color: '#009e7f', key: 'piso7' },
    ],
    pollInterval: 5000,
    bajaDebounceMs: 300,
    minFetchIntervalMs: 1000,
  };
}

function floorNumber(floorKey) {
  if (floorKey === 'piso4') return 4;
  if (floorKey === 'piso5') return 5;
  if (floorKey === 'piso6') return 6;
  if (floorKey === 'piso7') return 7;
  return 0;
}

/* ── Inventario canónico copiado de sanluis-rt ────────────────────
   Fuente: BSnlsPiso{4,5,6,7}Monitor.RTU_DATA
   Conteo: 23 + 21 + 19 + 22 = 85 RTUs reales.
   Formato: {slotName, equipName, macAddress, ipAddress}
   Las MAC e IP son las REALES del despliegue en SanLuis. */

var RTU_SEEDS = {
  piso4: [
    { slot: 'Rtu01', name: 'RTU 1.4',  mac: '04.7B.CB.80.9E.BC', ip: '10.105.0.214' },
    { slot: 'Rtu02', name: 'RTU 2.4',  mac: '38.7C.76.79.A3.DC', ip: '10.105.0.213' },
    { slot: 'Rtu03', name: 'RTU 3.4',  mac: '04.7B.CB.80.A0.74', ip: '10.105.0.212' },
    { slot: 'Rtu04', name: 'RTU 4.4',  mac: '38.7C.76.75.F8.D8', ip: '10.105.0.211' },
    { slot: 'Rtu05', name: 'RTU 5.4',  mac: '38.7C.76.BA.C9.88', ip: '10.105.0.210' },
    { slot: 'Rtu06', name: 'RTU 6.4',  mac: '38.7C.76.BA.CF.94', ip: '10.105.0.209' },
    { slot: 'Rtu07', name: 'RTU 7.4',  mac: '38.7C.76.BA.D8.BE', ip: '10.105.0.208' },
    { slot: 'Rtu08', name: 'RTU 8.4',  mac: '38.7C.76.BA.CF.89', ip: '10.105.0.207' },
    { slot: 'Rtu09', name: 'RTU 9.4',  mac: '38.7C.76.BA.DA.6A', ip: '10.105.0.206' },
    { slot: 'Rtu10', name: 'RTU 10.4', mac: '38.7C.76.79.76.96', ip: '10.105.0.205' },
    { slot: 'Rtu11', name: 'RTU 11.4', mac: '38.7C.76.79.AB.3C', ip: '10.105.0.204' },
    { slot: 'Rtu12', name: 'RTU 12.4', mac: '38.7C.76.79.67.40', ip: '10.105.0.203' },
    { slot: 'Rtu13', name: 'RTU 13.4', mac: '38.7C.76.79.70.12', ip: '10.105.0.202' },
    { slot: 'Rtu14', name: 'RTU 14.4', mac: '38.7C.76.BA.D8.CE', ip: '10.105.0.201' },
    { slot: 'Rtu15', name: 'RTU 15.4', mac: '38.7C.76.79.71.4A', ip: '10.105.0.200' },
    { slot: 'Rtu16', name: 'RTU 16.4', mac: '04.7B.CB.80.A1.36', ip: '10.105.0.199' },
    { slot: 'Rtu17', name: 'RTU 17.4', mac: '38.7C.76.BA.DA.70', ip: '10.105.0.198' },
    { slot: 'Rtu18', name: 'RTU 18.4', mac: '38.7C.76.79.75.1A', ip: '10.105.0.197' },
    { slot: 'Rtu19', name: 'RTU 19.4', mac: '04.7B.CB.80.E6.C2', ip: '10.105.0.196' },
    { slot: 'Rtu20', name: 'RTU 20.4', mac: '38.7C.76.79.77.02', ip: '10.105.0.195' },
    { slot: 'Rtu21', name: 'RTU 21.4', mac: '38.7C.76.BA.F0.B6', ip: '10.105.0.194' },
    { slot: 'Rtu22', name: 'RTU 22.4', mac: '38.7C.76.BA.EF.E6', ip: '10.105.0.193' },
    { slot: 'Rtu23', name: 'RTU 23.4', mac: '38.7C.76.79.A2.BC', ip: '10.105.0.192' },
  ],
  piso5: [
    { slot: 'Rtu01', name: 'RTU 1.5',  mac: '38.7C.76.79.35.6E', ip: '10.105.0.191' },
    { slot: 'Rtu02', name: 'RTU 2.5',  mac: '38.7C.76.79.6D.CE', ip: '10.105.0.190' },
    { slot: 'Rtu03', name: 'RTU 3.5',  mac: '38.7C.76.79.66.9D', ip: '10.105.0.189' },
    { slot: 'Rtu04', name: 'RTU 4.5',  mac: '38.7C.76.79.35.06', ip: '10.105.0.188' },
    { slot: 'Rtu05', name: 'RTU 5.5',  mac: '38.7C.76.79.35.2C', ip: '10.105.0.187' },
    { slot: 'Rtu06', name: 'RTU 6.5',  mac: '38.7C.76.79.70.36', ip: '10.105.0.186' },
    { slot: 'Rtu07', name: 'RTU 7.5',  mac: '38.7C.76.79.71.A2', ip: '10.105.0.185' },
    { slot: 'Rtu08', name: 'RTU 8.5',  mac: '38.7C.76.79.35.7C', ip: '10.105.0.184' },
    { slot: 'Rtu09', name: 'RTU 9.5',  mac: '38.7C.76.79.70.4A', ip: '10.105.0.183' },
    { slot: 'Rtu10', name: 'RTU 10.5', mac: '38.7C.76.79.71.92', ip: '10.105.0.182' },
    { slot: 'Rtu11', name: 'RTU 11.5', mac: '38.7C.76.BA.CF.96', ip: '10.105.0.181' },
    { slot: 'Rtu12', name: 'RTU 12.5', mac: '38.7C.76.79.70.9C', ip: '10.105.0.180' },
    { slot: 'Rtu13', name: 'RTU 13.5', mac: '38.7C.76.79.93.5C', ip: '10.105.0.179' },
    { slot: 'Rtu14', name: 'RTU 14.5', mac: '38.7C.76.79.66.94', ip: '10.105.0.178' },
    { slot: 'Rtu15', name: 'RTU 15.5', mac: '38.7C.76.79.76.B6', ip: '10.105.0.177' },
    { slot: 'Rtu16', name: 'RTU 16.5', mac: '38.7C.76.79.38.70', ip: '10.105.0.176' },
    { slot: 'Rtu17', name: 'RTU 17.5', mac: '38.7C.76.79.35.2E', ip: '10.105.0.175' },
    { slot: 'Rtu18', name: 'RTU 18.5', mac: '38.7C.76.79.85.8A', ip: '10.105.0.174' },
    { slot: 'Rtu19', name: 'RTU 19.5', mac: '38.7C.76.79.A2.B4', ip: '10.105.0.173' },
    { slot: 'Rtu20', name: 'RTU 20.5', mac: '38.7C.76.79.70.94', ip: '10.105.0.172' },
    { slot: 'Rtu21', name: 'RTU 21.5', mac: '38.7C.76.79.89.B2', ip: '10.105.0.171' },
  ],
  piso6: [
    { slot: 'Rtu01', name: 'RTU 1.6',  mac: '38.7C.76.79.6E.EE', ip: '10.105.0.170' },
    { slot: 'Rtu02', name: 'RTU 2.6',  mac: '38.7C.76.79.35.3A', ip: '10.105.0.169' },
    { slot: 'Rtu03', name: 'RTU 3.6',  mac: '38.7C.76.BA.F0.CA', ip: '10.105.0.168' },
    { slot: 'Rtu04', name: 'RTU 4.6',  mac: '38.7C.76.79.75.08', ip: '10.105.0.167' },
    { slot: 'Rtu05', name: 'RTU 5.6',  mac: '38.7C.76.BB.01.90', ip: '10.105.0.166' },
    { slot: 'Rtu06', name: 'RTU 6.6',  mac: '38.7C.76.79.35.70', ip: '10.105.0.165' },
    { slot: 'Rtu07', name: 'RTU 7.6',  mac: '04.7B.CB.18.DA.34', ip: '10.105.0.164' },
    { slot: 'Rtu08', name: 'RTU 8.6',  mac: '04.7B.CB.18.DC.EA', ip: '10.105.0.163' },
    { slot: 'Rtu09', name: 'RTU 9.6',  mac: '38.7C.76.79.A2.B2', ip: '10.105.0.162' },
    { slot: 'Rtu10', name: 'RTU 10.6', mac: '04.7B.CB.18.D5.3A', ip: '10.105.0.161' },
    { slot: 'Rtu11', name: 'RTU 11.6', mac: '38.7C.76.79.85.7C', ip: '10.105.0.160' },
    { slot: 'Rtu12', name: 'RTU 12.6', mac: '04.7B.CB.18.D4.04', ip: '10.105.0.159' },
    { slot: 'Rtu13', name: 'RTU 13.6', mac: '38.7C.76.79.B1.3A', ip: '10.105.0.158' },
    { slot: 'Rtu14', name: 'RTU 14.6', mac: '38.7C.76.BB.01.8C', ip: '10.105.0.157' },
    { slot: 'Rtu15', name: 'RTU 15.6', mac: '38.7C.76.79.6F.78', ip: '10.105.0.156' },
    { slot: 'Rtu16', name: 'RTU 16.6', mac: '38.7C.76.BB.02.A0', ip: '10.105.0.155' },
    { slot: 'Rtu17', name: 'RTU 17.6', mac: '38.7C.76.79.88.C4', ip: '10.105.0.154' },
    { slot: 'Rtu18', name: 'RTU 18.6', mac: '38.7C.76.79.A2.BE', ip: '10.105.0.153' },
    { slot: 'Rtu19', name: 'RTU 19.6', mac: '38.7B.76.BA.F8.F0', ip: '10.105.0.152' },
  ],
  piso7: [
    { slot: 'Rtu01', name: 'RTU 1.7',  mac: '38.7C.76.BA.F8.7A', ip: '10.105.0.151' },
    { slot: 'Rtu02', name: 'RTU 2.7',  mac: '04.7B.CB.18.D4.D2', ip: '10.105.0.150' },
    { slot: 'Rtu03', name: 'RTU 3.7',  mac: '38.7C.76.BA.F8.96', ip: '10.105.0.149' },
    { slot: 'Rtu04', name: 'RTU 4.7',  mac: '04.7B.CB.80.FF.50', ip: '10.105.0.148' },
    { slot: 'Rtu05', name: 'RTU 5.7',  mac: '38.7C.76.BA.EF.4A', ip: '10.105.0.147' },
    { slot: 'Rtu06', name: 'RTU 6.7',  mac: '38.7C.76.BA.C9.DE', ip: '10.105.0.146' },
    { slot: 'Rtu07', name: 'RTU 7.7',  mac: '04.7B.CB.18.D4.26', ip: '10.105.0.145' },
    { slot: 'Rtu08', name: 'RTU 8.7',  mac: '38.7C.76.BB.05.74', ip: '10.105.0.144' },
    { slot: 'Rtu09', name: 'RTU 9.7',  mac: '04.7B.CB.18.D5.1C', ip: '10.105.0.143' },
    { slot: 'Rtu10', name: 'RTU 10.7', mac: '38.7C.76.BB.05.6E', ip: '10.105.0.142' },
    { slot: 'Rtu11', name: 'RTU 11.7', mac: '38.7C.76.BA.F9.02', ip: '10.105.0.141' },
    { slot: 'Rtu12', name: 'RTU 12.7', mac: '38.7C.76.BA.F8.9C', ip: '10.105.0.140' },
    { slot: 'Rtu13', name: 'RTU 13.7', mac: '38.7C.76.BA.FC.1A', ip: '10.105.0.139' },
    { slot: 'Rtu14', name: 'RTU 14.7', mac: '04.7B.CB.18.F0.60', ip: '10.105.0.138' },
    { slot: 'Rtu15', name: 'RTU 15.7', mac: '38.7C.76.BA.F8.F8', ip: '10.105.0.137' },
    { slot: 'Rtu16', name: 'RTU 16.7', mac: '38.7C.76.BB.03.90', ip: '10.105.0.136' },
    { slot: 'Rtu17', name: 'RTU 17.7', mac: '38.7C.76.BA.F0.C8', ip: '10.105.0.135' },
    { slot: 'Rtu18', name: 'RTU 18.7', mac: '38.7C.76.BA.F8.98', ip: '10.105.0.134' },
    { slot: 'Rtu19', name: 'RTU 19.7', mac: '38.7C.76.79.BA.18', ip: '10.105.0.133' },
    { slot: 'Rtu20', name: 'RTU 20.7', mac: '04.7B.CB.81.05.FC', ip: '10.105.0.132' },
    { slot: 'Rtu21', name: 'RTU 21.7', mac: '38.7C.76.BA.F0.6A', ip: '10.105.0.131' },
    { slot: 'Rtu22', name: 'RTU 22.7', mac: '38.7C.76.BA.DC.24', ip: '10.105.0.130' },
  ],
};

/* Distribución determinística para que la demo se vea variada pero estable. */
function statusFor(idx, floorKey) {
  if (idx % 17 === 4) return 'alarm';
  if (idx % 23 === 7) return 'offline';
  if (idx % 8 === 3) return 'standby';
  if (idx === 0 && floorKey === 'piso6') return 'heating';
  return 'cooling';
}

function fcu(seed, floorKey, idx, status) {
  var floorNum = floorNumber(floorKey);
  return {
    equipName: seed.name,
    tag: seed.slot,
    location: 'Piso ' + floorNum,
    floor: floorKey,
    tempAmbiente: round1(jitter(22, 1.5, idx)),
    setPointCool: 22.0,
    tempAbasto: round1(jitter(16, 1.5, idx + 100)),
    humidity: round1(jitter(48, 6, idx + 200)),
    fanOn: status === 'cooling' || status === 'heating',
    chilledWater: status === 'cooling',
    networkConnection: status !== 'offline',
    online: status !== 'offline',
    alarm: status === 'alarm',
    status: status,
    ipAddress: seed.ip,
    macAddress: seed.mac,
  };
}

function buildFloor(floorKey) {
  var seeds = RTU_SEEDS[floorKey] || [];
  var arr = [];
  for (var i = 0; i < seeds.length; i++) {
    arr.push(fcu(seeds[i], floorKey, i, statusFor(i, floorKey)));
  }
  return arr;
}

export function snlsEquipmentByFloor(floor) {
  return buildFloor(floor);
}

export function snlsMonitorByFloor(floor) {
  var equipment = buildFloor(floor);
  var total = equipment.length;
  var fanOnCount = equipment.filter(function (e) { return e.fanOn; }).length;
  var alarmsCount = equipment.filter(function (e) { return e.alarm; }).length;
  var offlineCount = equipment.filter(function (e) { return !e.online; }).length;
  /* standby = ni encendido, ni en alarma, ni offline */
  var standbyCount = total - fanOnCount - alarmsCount - offlineCount;
  if (standbyCount < 0) standbyCount = 0;

  var totalTemp = equipment.reduce(function (acc, e) { return acc + e.tempAmbiente; }, 0);
  var totalHum = equipment.reduce(function (acc, e) { return acc + e.humidity; }, 0);

  return {
    floor: floor,
    /* KPI LEDs del home (snls leen estos exactos) */
    total: total,
    fanOn: fanOnCount,
    standby: standbyCount,
    alarms: alarmsCount,
    /* Métricas agregadas adicionales */
    online: total - offlineCount,
    offline: offlineCount,
    avgTempAmbiente: round1(totalTemp / total),
    avgHumidity: round1(totalHum / total),
    timestamp: Date.now(),
  };
}

/* ── Alarm adapter — emits Niagara NiagaraAlarms.js contract ─────── */
function toNiagaraAlarmShape(seed) {
  var floor = seed.floor || 'piso4';
  var floorNum = floorNumber(floor);
  var source = '/Drivers/SanLuis/Piso' + floorNum + '/' + seed.equipmentId;
  var sourceState = (seed.severity === 'critical' || seed.severity === 'warning') ? 'offnormal' : 'normal';
  var priority = seed.severity === 'critical' ? 1 : seed.severity === 'warning' ? 3 : 5;
  var ackState = seed.acknowledged ? 'acked' : 'ackPending';
  return {
    uuid:        seed.id,
    source:      source,
    sourceState: sourceState,
    ackState:    ackState,
    msgText:     seed.message,
    priority:    priority,
    timestamp:   new Date(seed.timestamp).toISOString(),
  };
}

var ALARM_SEEDS = [
  {
    id: 'snls-alm-001',
    equipmentId: 'Rtu05',
    floor: 'piso4',
    severity: 'critical',
    message: 'Temperatura ambiente sobre rango — RTU 5.4',
    timestamp: Date.now() - 1000 * 60 * 8,
    acknowledged: false,
  },
  {
    id: 'snls-alm-002',
    equipmentId: 'Rtu05',
    floor: 'piso5',
    severity: 'warning',
    message: 'Humedad elevada (62%) — RTU 5.5',
    timestamp: Date.now() - 1000 * 60 * 25,
    acknowledged: false,
  },
  {
    id: 'snls-alm-003',
    equipmentId: 'Rtu05',
    floor: 'piso6',
    severity: 'critical',
    message: 'Falla de comunicación — RTU 5.6',
    timestamp: Date.now() - 1000 * 60 * 95,
    acknowledged: true,
  },
  {
    id: 'snls-alm-004',
    equipmentId: 'Rtu05',
    floor: 'piso7',
    severity: 'warning',
    message: 'Variación de temperatura fuera de rango (±3 °C) — RTU 5.7',
    timestamp: Date.now() - 1000 * 60 * 180,
    acknowledged: false,
  },
];

export function snlsAlarms() {
  var records = ALARM_SEEDS.map(toNiagaraAlarmShape);
  return { records: records, total: records.length, pageSize: 15 };
}

export function snlsAlarmCounts() {
  return { active: 2, unacked: 2 };
}

export function snlsSchedules() {
  /* Schedules con shape Niagara — cada RTU tiene su propio schedule, MÁS
     schedules por piso + setpoints + modos globales. Total: 85 RTU + 9 piso/setpoint + 3 modos. */
  var list = [];
  var floorKeys = ['piso4', 'piso5', 'piso6', 'piso7'];
  var floorNames = { piso4: 'Piso 4', piso5: 'Piso 5', piso6: 'Piso 6 (Datacenter)', piso7: 'Piso 7' };

  /* 85 schedules — uno por RTU */
  for (var f = 0; f < floorKeys.length; f++) {
    var fk = floorKeys[f];
    var seeds = RTU_SEEDS[fk] || [];
    for (var i = 0; i < seeds.length; i++) {
      var rtu = seeds[i];
      var occ = (i % 13 === 5) ? 'UNOCCUPIED' : (i % 17 === 8 ? 'STANDBY' : 'OCCUPIED');
      list.push({
        displayName: rtu.name + ' Schedule',
        name:        'sch-' + fk + '-' + rtu.slot.toLowerCase(),
        equipLabel:  rtu.name,
        type:        'baja:BWeeklySchedule',
        outValue:    occ,
        outStatus:   'ok',
        parent:      { displayName: floorNames[fk] },
        navOrd:      '/Drivers/SanLuis/' + fk + '/' + rtu.slot,
      });
    }
  }

  /* 5 schedules por piso (4 pisos + datacenter dedicado P6) */
  list.push({ displayName: 'Horario Oficina P4',     name: 'sched-p4', equipLabel: 'Horario Piso 4', type: 'baja:BWeeklySchedule', outValue: 'OCCUPIED',   outStatus: 'ok', parent: { displayName: 'Piso 4' }, navOrd: '' });
  list.push({ displayName: 'Horario Oficina P5',     name: 'sched-p5', equipLabel: 'Horario Piso 5', type: 'baja:BWeeklySchedule', outValue: 'OCCUPIED',   outStatus: 'ok', parent: { displayName: 'Piso 5' }, navOrd: '' });
  list.push({ displayName: 'Datacenter P6 24/7',     name: 'sched-p6', equipLabel: 'Datacenter 24/7', type: 'baja:BWeeklySchedule', outValue: 'OCCUPIED',   outStatus: 'ok', parent: { displayName: 'Piso 6' }, navOrd: '' });
  list.push({ displayName: 'Horario Oficina P7',     name: 'sched-p7', equipLabel: 'Horario Piso 7', type: 'baja:BWeeklySchedule', outValue: 'UNOCCUPIED', outStatus: 'ok', parent: { displayName: 'Piso 7' }, navOrd: '' });

  /* 4 setpoints por piso */
  list.push({ displayName: 'Setpoint Día P4',        name: 'sp-day-p4',   equipLabel: 'Setpoint Día P4',   type: 'baja:BNumericSchedule', outValue: '22.0 °C', outStatus: 'ok', parent: { displayName: 'Piso 4' }, navOrd: '' });
  list.push({ displayName: 'Setpoint Día P5',        name: 'sp-day-p5',   equipLabel: 'Setpoint Día P5',   type: 'baja:BNumericSchedule', outValue: '22.0 °C', outStatus: 'ok', parent: { displayName: 'Piso 5' }, navOrd: '' });
  list.push({ displayName: 'Setpoint Datacenter',    name: 'sp-day-p6',   equipLabel: 'Setpoint Datacenter', type: 'baja:BNumericSchedule', outValue: '20.0 °C', outStatus: 'ok', parent: { displayName: 'Piso 6' }, navOrd: '' });
  list.push({ displayName: 'Setpoint Día P7',        name: 'sp-day-p7',   equipLabel: 'Setpoint Día P7',   type: 'baja:BNumericSchedule', outValue: '22.0 °C', outStatus: 'ok', parent: { displayName: 'Piso 7' }, navOrd: '' });

  /* 3 modos globales */
  list.push({ displayName: 'Modo Mantenimiento',     name: 'maint-mode',       equipLabel: 'Mantenimiento Global', type: 'baja:BEnumSchedule',    outValue: 'OFF',    outStatus: 'ok', parent: { displayName: 'Global' }, navOrd: '' });
  list.push({ displayName: 'Calendario Festivos',    name: 'holiday-override', equipLabel: 'Festivos México',      type: 'baja:BCalendarSchedule', outValue: 'false', outStatus: 'ok', parent: { displayName: 'Global' }, navOrd: '' });
  list.push({ displayName: 'Ventilación Fin de Semana', name: 'vent-weekend',  equipLabel: 'Ventilación Fin de Semana', type: 'baja:BBooleanSchedule', outValue: 'false', outStatus: 'ok', parent: { displayName: 'Global' }, navOrd: '' });

  return list;
}

/* ── History data generator (NiagaraHistory.js contract) ─────────────
   Cadencia adaptativa según rango: 1 min hasta 8 hrs (densidad alta para
   demo), 5 min hasta 24 hrs, 15 min en adelante. */
function lastNHours(hours, baseValue, amplitude, seed) {
  var intervalMs;
  if (hours <= 8)   intervalMs = 60 * 1000;        /* 1 min  →  8h = 480 pts */
  else if (hours <= 24) intervalMs = 5 * 60 * 1000;  /* 5 min  → 24h = 288 pts */
  else              intervalMs = 15 * 60 * 1000;     /* 15 min → 7d = 672 pts */
  var count = Math.floor((hours * 3600 * 1000) / intervalMs);
  var now = Date.now();
  var result = [];
  for (var i = 0; i < count; i++) {
    var ts = now - (count - i) * intervalMs;
    /* Onda compuesta para que la curva tenga "vida": tendencia diurna + ruido */
    var diurnal = Math.sin((ts / (24 * 3600 * 1000)) * 2 * Math.PI) * amplitude * 0.6;
    var noise = Math.sin((i * 9301 + seed) * 0.0001) * amplitude * 0.4;
    var v = baseValue + diurnal + noise;
    result.push([ts, Math.round(v * 10) / 10]);
  }
  return result;
}

var RANGE_HOURS = {
  lastHour: 1,
  last8Hours: 8,
  today: 24,
  last24Hours: 24,
  yesterday: 24,
  last7Days: 168,
  last30Days: 720,
  monthToDate: 720,
};

var HISTORY_CATALOG = [
  { id: 'hist-piso4-fcu-01-temp',  name: 'FCU-P4-01 · Temp Ambiente', units: '°C',  recordCount: 1440, baseValue: 22, amplitude: 1.5, seed: 1 },
  { id: 'hist-piso5-fcu-01-temp',  name: 'FCU-P5-01 · Temp Ambiente', units: '°C',  recordCount: 1440, baseValue: 23, amplitude: 1.8, seed: 2 },
  { id: 'hist-piso6-fcu-01-hum',   name: 'FCU-P6-01 · Humedad',       units: '%RH', recordCount: 1440, baseValue: 48, amplitude: 6,   seed: 3 },
  { id: 'hist-piso7-fcu-01-temp',  name: 'FCU-P7-01 · Temp Ambiente', units: '°C',  recordCount: 1440, baseValue: 21, amplitude: 2.0, seed: 4 },
  { id: 'hist-piso4-fcu-01-hum',   name: 'FCU-P4-01 · Humedad',       units: '%RH', recordCount: 1440, baseValue: 52, amplitude: 5,   seed: 5 },
  { id: 'hist-piso5-fcu-01-hum',   name: 'FCU-P5-01 · Humedad',       units: '%RH', recordCount: 1440, baseValue: 50, amplitude: 4,   seed: 6 },
  { id: 'hist-piso6-fcu-01-temp',  name: 'FCU-P6-01 · Temp Ambiente', units: '°C',  recordCount: 1440, baseValue: 20, amplitude: 1.2, seed: 7 },
  { id: 'hist-piso7-fcu-01-hum',   name: 'FCU-P7-01 · Humedad',       units: '%RH', recordCount: 1440, baseValue: 55, amplitude: 7,   seed: 8 },
];

export function snlsHistoryList() {
  return {
    histories: HISTORY_CATALOG.map(function (h) {
      return { id: h.id, name: h.name, units: h.units, recordCount: h.recordCount };
    }),
  };
}

export function snlsHistoryData(id, range) {
  /* Si no hay rango → default 8 horas (mejor para la demo que 24h) */
  var hours = RANGE_HOURS[range] || 8;
  var entry = null;
  for (var i = 0; i < HISTORY_CATALOG.length; i++) {
    if (HISTORY_CATALOG[i].id === id) { entry = HISTORY_CATALOG[i]; break; }
  }
  if (!entry) {
    entry = HISTORY_CATALOG[0];
  }
  return {
    title: entry.name,
    units: entry.units,
    data:  lastNHours(hours, entry.baseValue, entry.amplitude, entry.seed),
  };
}
