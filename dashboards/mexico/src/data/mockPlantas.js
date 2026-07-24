/**
 * Mock data — Honeywell México BMS Multi-Planta
 * Valores 100% simulados para demo de cliente. NO usar como referencia operativa.
 *
 * Estructura: 3 ciudades, 6 plantas, métricas pseudoaleatorias estables por sesión.
 */

export var CITIES = [
  {
    id: 'chihuahua',
    name: 'Chihuahua',
    state: 'CHIH',
    lat: 28.6353,
    lon: -106.0889,
    plantIds: ['MX60'],
  },
  {
    id: 'mexicali',
    name: 'Mexicali',
    state: 'B.C.',
    lat: 32.6245,
    lon: -115.4523,
    plantIds: ['MX29', 'MX80', 'MX292', 'Garret'],
  },
  {
    id: 'san-luis-potosi',
    name: 'San Luis Potosí',
    state: 'S.L.P.',
    lat: 22.1565,
    lon: -100.9855,
    plantIds: ['MX0A'],
  },
];

export var PLANTS = [
  {
    id: 'MX60',
    name: 'MX60',
    fullName: 'Planta MX60 — Chihuahua',
    cityId: 'chihuahua',
    address: 'Parque Industrial Las Américas, Chihuahua, CHIH',
    status: 'operational',
    activePowerKw: 412.8,
    currentA: 624.3,
    temperatureC: 22.4,
    setpointC: 22.0,
    alarms: 0,
    points: 4128,
  },
  {
    id: 'MX0A',
    name: 'MX0A',
    fullName: 'Planta MX0A — San Luis Potosí',
    cityId: 'san-luis-potosi',
    address: 'Zona Industrial WTC, San Luis Potosí, S.L.P.',
    status: 'operational',
    activePowerKw: 286.5,
    currentA: 433.1,
    temperatureC: 23.1,
    setpointC: 22.0,
    alarms: 0,
    points: 3120,
  },
  {
    id: 'MX29',
    name: 'MX29',
    fullName: 'Planta MX29 — Mexicali',
    cityId: 'mexicali',
    address: 'Parque Industrial El Vigía, Mexicali, B.C.',
    status: 'operational',
    activePowerKw: 198.2,
    currentA: 299.7,
    temperatureC: 22.8,
    setpointC: 22.0,
    alarms: 0,
    points: 2960,
  },
  {
    id: 'MX80',
    name: 'MX80',
    fullName: 'Planta MX80 — Mexicali',
    cityId: 'mexicali',
    address: 'Parque Industrial Progreso, Mexicali, B.C.',
    status: 'warning',
    activePowerKw: 354.1,
    currentA: 535.4,
    temperatureC: 25.6,
    setpointC: 22.0,
    alarms: 2,
    points: 3784,
  },
  {
    id: 'MX292',
    name: 'MX292',
    fullName: 'Planta MX292 — Mexicali',
    cityId: 'mexicali',
    address: 'Parque Industrial Silicon Border, Mexicali, B.C.',
    status: 'operational',
    activePowerKw: 221.7,
    currentA: 335.2,
    temperatureC: 21.9,
    setpointC: 22.0,
    alarms: 0,
    points: 3104,
  },
  {
    id: 'Garret',
    name: 'Garret',
    fullName: 'Planta Garret — Mexicali',
    cityId: 'mexicali',
    address: 'Parque Industrial El Sauzal, Mexicali, B.C.',
    status: 'alarm',
    activePowerKw: 478.9,
    currentA: 724.0,
    temperatureC: 28.3,
    setpointC: 22.0,
    alarms: 4,
    points: 5080,
  },
];

export function plantsByCity(cityId) {
  return PLANTS.filter(function (p) {
    return p.cityId === cityId;
  });
}

export function citySummary(cityId) {
  var plants = plantsByCity(cityId);
  var totalKw = plants.reduce(function (acc, p) {
    return acc + p.activePowerKw;
  }, 0);
  var alarms = plants.reduce(function (acc, p) {
    return acc + p.alarms;
  }, 0);
  var operational = plants.filter(function (p) {
    return p.status === 'operational';
  }).length;
  var worstStatus = plants.some(function (p) {
    return p.status === 'alarm';
  })
    ? 'alarm'
    : plants.some(function (p) {
        return p.status === 'warning';
      })
    ? 'warning'
    : 'operational';
  return {
    plantCount: plants.length,
    totalKw: totalKw,
    alarms: alarms,
    operational: operational,
    worstStatus: worstStatus,
  };
}

export function globalSummary() {
  var totalKw = PLANTS.reduce(function (acc, p) {
    return acc + p.activePowerKw;
  }, 0);
  var alarms = PLANTS.reduce(function (acc, p) {
    return acc + p.alarms;
  }, 0);
  var operational = PLANTS.filter(function (p) {
    return p.status === 'operational';
  }).length;
  return {
    cityCount: CITIES.length,
    plantCount: PLANTS.length,
    operational: operational,
    alarms: alarms,
    totalKw: totalKw,
  };
}
