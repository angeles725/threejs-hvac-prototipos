(function(window) {
  'use strict';

  /* Application config — SNLS namespace */
  window.SNLS_CONFIG = {
    api: {
      config:      '/snls/api/config',
      monitor:     '/snls/api/monitor/',
      equipment:   '/snls/api/equipment/',
      historyList: '/snls/api/history/list',
      historyData: '/snls/api/history/data',
      alarms:      '/snls/api/alarms',
      alarmCounts: '/snls/api/alarms/counts',
      schedules:   '/snls/api/schedules',
      equipmentHistories: '/snls/api/equipment-histories/',
      setpoint: '/snls/api/setpoint'
    },
    monitorOrds: {
      piso4: 'station:|slot:/Services/SnlsDashboardService/Piso4Monitor',
      piso5: 'station:|slot:/Services/SnlsDashboardService/Piso5Monitor',
      piso6: 'station:|slot:/Services/SnlsDashboardService/Piso6Monitor',
      piso7: 'station:|slot:/Services/SnlsDashboardService/Piso7Monitor'
    },
    floors: [
      { number: 4, name: 'Piso 4', color: '#00d4aa', key: 'piso4' },
      { number: 5, name: 'Piso 5', color: '#00b894', key: 'piso5' },
      { number: 6, name: 'Piso 6', color: '#00a88a', key: 'piso6' },
      { number: 7, name: 'Piso 7', color: '#009e7f', key: 'piso7' }
    ],
    pollInterval: 30000,
    bajaDebounceMs: 300,
    minFetchIntervalMs: 1000
  };

})(window);
