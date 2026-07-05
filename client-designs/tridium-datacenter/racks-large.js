/**
 * C3NTRO Telecom | Data Center Explorer
 * racks-large.js — LARGE configuration (60 racks, ~200 m2)
 * Layout: 6 horizontal rows of 10 racks, 3 cold/hot pairs
 * Enhanced: per-rack metadata for AI workload distribution
 */
window.C3 = window.C3 || {};
window.C3.Data = window.C3.Data || {};

(function() {
  var xPositions = [70, 180, 290, 400, 510, 620, 730, 840, 950, 1060];
  var rackW = 90;
  var rackH = 42;

  // Build rack positions for 6 rows of 10
  var positions = [];
  var rows = [
    { y: 95,  startId: 1 },
    { y: 167, startId: 11 },
    { y: 269, startId: 21 },
    { y: 341, startId: 31 },
    { y: 443, startId: 41 },
    { y: 515, startId: 51 }
  ];

  // Workload types assigned to rack zones
  var zoneWorkloads = [
    'inference',   // Row 1: AI inference cluster
    'inference',   // Row 2: AI inference cluster
    'training',    // Row 3: GPU training cluster
    'training',    // Row 4: GPU training cluster
    'orchestration', // Row 5: orchestration + networking
    'storage'      // Row 6: storage + backup
  ];

  var rowLabels = ['1', '2', '3', '4', '5', '6'];
  for (var r = 0; r < rows.length; r++) {
    for (var c = 0; c < 10; c++) {
      var num = rows[r].startId + c;
      var id = num < 10 ? '0' + num : '' + num;
      positions.push({
        id: id,
        x: xPositions[c],
        y: rows[r].y,
        w: rackW,
        h: rackH,
        row: rowLabels[r],
        col: c,
        zone: zoneWorkloads[r]
      });
    }
  }

  window.C3.Data.large = {
    title: 'ENTERPRISE',
    racks: 60,
    area: '~200 m\u00B2',
    description: 'M\u00E1xima capacidad para operaciones enterprise con orquestaci\u00F3n AI',
    zones: {
      inference:     { label: 'Cl\u00FAster de Inferencia AI', racks: 20, color: '#00F0FF' },
      training:      { label: 'Cl\u00FAster de Entrenamiento GPU', racks: 20, color: '#A855F7' },
      orchestration: { label: 'Orquestaci\u00F3n y Red', racks: 10, color: '#22C55E' },
      storage:       { label: 'Almacenamiento y Backup', racks: 10, color: '#F59E0B' }
    },
    layout: {
      viewBox: '0 0 1200 720',
      roomRect: { x: 50, y: 50, w: 1100, h: 620 },
      aisles: [
        { type: 'cold', x: 50, y: 137, w: 1100, h: 30, label: 'PASILLO FR\u00CDO' },
        { type: 'hot',  x: 50, y: 209, w: 1100, h: 60, label: 'PASILLO CALIENTE' },
        { type: 'cold', x: 50, y: 311, w: 1100, h: 30, label: 'PASILLO FR\u00CDO' },
        { type: 'hot',  x: 50, y: 383, w: 1100, h: 60, label: 'PASILLO CALIENTE' },
        { type: 'cold', x: 50, y: 485, w: 1100, h: 30, label: 'PASILLO FR\u00CDO' }
      ],
      hvac: [
        { cx: 120, cy: 50, r: 22 },
        { cx: 280, cy: 50, r: 22 },
        { cx: 440, cy: 50, r: 22 },
        { cx: 600, cy: 50, r: 22 },
        { cx: 760, cy: 50, r: 22 },
        { cx: 920, cy: 50, r: 22 },
        { cx: 200, cy: 670, r: 22 },
        { cx: 400, cy: 670, r: 22 },
        { cx: 600, cy: 670, r: 22 },
        { cx: 800, cy: 670, r: 22 },
        { cx: 1000, cy: 670, r: 22 }
      ],
      ups: { x: 50, y: 580, w: 200, h: 60, label: 'UPS / BATER\u00CDAS' }
    },
    rackPositions: positions
  };
})();
