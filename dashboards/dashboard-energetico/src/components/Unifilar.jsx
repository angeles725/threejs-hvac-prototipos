import React from 'react';
import { VOLT, SOLAR, OK, WARN, DANGER, TEXT, TEXT_DIM, TEXT_MUTED, BORDER, heatColor } from '../theme.js';

const STATE_COLORS = { run: OK, standby: WARN, fault: DANGER };

// Alimentadores del diagrama unifilar — cada uno cuelga de la barra de BT.
const FEEDERS = [
  { id: 'CCM-01', name: 'CCM-01 · HVAC',        breaker: '52-H', zones: ['CHILL', 'AHU'] },
  { id: 'TAB-A',  name: 'TAB-A · Servicios',    breaker: '52-A', zones: ['LIGHT', 'PARK', 'OFFICE'] },
  { id: 'TAB-B',  name: 'TAB-B · Comercial',    breaker: '52-B', zones: ['KITCH', 'EV'] },
  { id: 'TAB-CR', name: 'TAB-CR · Crítico',     breaker: '52-C', zones: ['DATA'], ups: true },
];

const VB_W = 1000;
const BUS_Y = 232;
const BUS_X0 = 70;
const BUS_X1 = 930;
const FEEDER_TOP = BUS_Y;
const BREAKER_Y = 286;
const LOADS_Y = 332;
const LOAD_H = 52;
const LOAD_GAP = 12;
const LOAD_W = 188;

export default function Unifilar({ data, selectedId, onSelect }) {
  const zoneById = id => data.zones.find(z => z.id === id);
  const stateOf = id => data.zoneStates[id]?.state || 'run';

  const maxLoads = Math.max(...FEEDERS.map(f => f.zones.length));
  const VB_H = LOADS_Y + maxLoads * (LOAD_H + LOAD_GAP) + 24;

  const feederX = i => BUS_X0 + ((i + 0.5) * (BUS_X1 - BUS_X0)) / FEEDERS.length;
  const centerX = VB_W / 2;

  const totalA = (data.phase.iL1 + data.phase.iL2 + data.phase.iL3);

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ width: '100%', minWidth: 720, height: 'auto', display: 'block' }}
        role="img"
        aria-label="Diagrama unifilar de la instalación"
      >
        <defs>
          <linearGradient id="uniBus" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={VOLT} stopOpacity="0.5" />
            <stop offset="50%" stopColor={VOLT} stopOpacity="1" />
            <stop offset="100%" stopColor={VOLT} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* ── Acometida → general → transformador → barra BT ── */}
        <Flow d={`M${centerX} 40 L${centerX} ${BUS_Y}`} />

        {/* Acometida CFE */}
        <g transform={`translate(${centerX}, 30)`}>
          <polygon points="0,-16 13,8 -13,8" fill="none" stroke={SOLAR} strokeWidth="2" />
          <text x="22" y="-6" style={txt(11, SOLAR, 700)}>CFE · 23 kV</text>
          <text x="22" y="9" style={txt(9, TEXT_MUTED)}>ACOMETIDA</text>
        </g>

        {/* Interruptor general MT */}
        <Breaker x={centerX} y={86} label="52-G" closed />
        <text x={centerX + 26} y={90} style={txt(9, TEXT_DIM)}>INT. GENERAL</text>

        {/* Transformador 23kV / 220V */}
        <g transform={`translate(${centerX}, 150)`}>
          <circle cx="0" cy="-9" r="15" fill="none" stroke={VOLT} strokeWidth="2" />
          <circle cx="0" cy="9" r="15" fill="none" stroke={VOLT} strokeWidth="2" />
          <text x="26" y="-6" style={txt(10, TEXT, 700)}>TR-01 · 1600 kVA</text>
          <text x="26" y="9" style={txt(9, TEXT_MUTED)}>23 kV / 220 V · Dyn11</text>
        </g>

        {/* Medición ION en la barra de BT */}
        <g transform={`translate(${BUS_X1 - 4}, ${BUS_Y - 58})`}>
          <line x1="0" y1="58" x2="0" y2="34" stroke={SOLAR} strokeWidth="1.5" strokeDasharray="3 3" />
          <rect x="-58" y="-2" width="116" height="36" rx="6" fill="rgba(212,162,106,0.10)" stroke={SOLAR} strokeWidth="1" />
          <text x="0" y="12" textAnchor="middle" style={txt(10, SOLAR, 700)}>PM · ION9000</text>
          <text x="0" y="26" textAnchor="middle" style={txt(8.5, TEXT_DIM)}>medición primaria</text>
        </g>

        {/* Barra de baja tensión */}
        <line x1={BUS_X0} y1={BUS_Y} x2={BUS_X1} y2={BUS_Y} stroke="url(#uniBus)" strokeWidth="5" strokeLinecap="round" />
        <g transform={`translate(${BUS_X0 + 6}, ${BUS_Y - 14})`}>
          <text x="0" y="0" style={txt(10, VOLT, 700)}>BARRA BT · 220 V</text>
        </g>
        <g transform={`translate(${centerX}, ${BUS_Y - 16})`}>
          <text x="0" y="0" textAnchor="middle" style={txt(13, TEXT, 700)}>
            {data.totalKW.toFixed(0)} <tspan style={txt(9, TEXT_MUTED)}>kW</tspan>
            <tspan dx="14" style={txt(13, TEXT, 700)}>{totalA.toFixed(0)} </tspan><tspan style={txt(9, TEXT_MUTED)}>A</tspan>
            <tspan dx="14" style={txt(13, OK, 700)}>{data.powerFactor.toFixed(3)} </tspan><tspan style={txt(9, TEXT_MUTED)}>FP</tspan>
          </text>
        </g>

        {/* ── Alimentadores ── */}
        {FEEDERS.map((f, i) => {
          const fx = feederX(i);
          const loads = f.zones.map(zoneById).filter(Boolean);
          return (
            <g key={f.id}>
              <Flow d={`M${fx} ${FEEDER_TOP} L${fx} ${BREAKER_Y - 14}`} />
              <Breaker x={fx} y={BREAKER_Y} label={f.breaker} closed />

              {f.ups && (
                <g transform={`translate(${fx}, ${BREAKER_Y + 22})`}>
                  <rect x="-13" y="0" width="26" height="20" rx="3" fill="none" stroke={SOLAR} strokeWidth="1.6" />
                  <text x="0" y="14" textAnchor="middle" style={txt(8, SOLAR, 700)}>UPS</text>
                </g>
              )}

              <line
                x1={fx} y1={f.ups ? BREAKER_Y + 42 : BREAKER_Y + 14}
                x2={fx} y2={LOADS_Y - 6}
                stroke={BORDER} strokeWidth="1.5"
              />
              <text x={fx} y={BREAKER_Y - 22} textAnchor="middle" style={txt(9.5, TEXT_DIM, 600)}>{f.name}</text>

              {loads.map((z, j) => {
                const y = LOADS_Y + j * (LOAD_H + LOAD_GAP);
                const color = heatColor(z.ratio);
                const st = stateOf(z.id);
                const selected = z.id === selectedId;
                return (
                  <g key={z.id} transform={`translate(${fx}, ${y})`} style={{ cursor: 'pointer' }}
                     onClick={() => onSelect && onSelect(z.id)}>
                    {/* conector vertical entre cargas */}
                    {j > 0 && <line x1="0" y1={-LOAD_GAP} x2="0" y2="0" stroke={BORDER} strokeWidth="1.5" />}
                    <rect
                      x={-LOAD_W / 2} y="0" width={LOAD_W} height={LOAD_H} rx="9"
                      fill={selected ? color + '1f' : 'rgba(10,14,32,0.72)'}
                      stroke={selected ? color : color + '55'}
                      strokeWidth={selected ? 2 : 1.2}
                      style={selected ? { filter: `drop-shadow(0 0 10px ${color}88)` } : null}
                    />
                    <circle cx={-LOAD_W / 2 + 16} cy={LOAD_H / 2} r="5" fill={STATE_COLORS[st]}
                            style={{ filter: `drop-shadow(0 0 5px ${STATE_COLORS[st]})` }} />
                    <text x={-LOAD_W / 2 + 30} y="20" style={txt(11, TEXT, 600)}>{z.name}</text>
                    <text x={-LOAD_W / 2 + 30} y="39" style={txt(13, color, 700)}>
                      {z.kw.toFixed(0)} <tspan style={txt(9, TEXT_MUTED)}>kW</tspan>
                    </text>
                    {/* barra de utilización */}
                    <rect x={LOAD_W / 2 - 46} y={LOAD_H / 2 - 3} width="34" height="6" rx="3" fill="rgba(255,255,255,0.06)" />
                    <rect x={LOAD_W / 2 - 46} y={LOAD_H / 2 - 3} width={34 * z.ratio} height="6" rx="3" fill={color}
                          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
                    <text x={LOAD_W / 2 - 8} y={LOAD_H / 2 + 4} textAnchor="end" style={txt(8.5, TEXT_DIM, 600)} dx="-2">
                      {Math.round(z.ratio * 100)}%
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Línea con "corriente fluyendo" (dash animado).
function Flow({ d }) {
  return (
    <>
      <path d={d} fill="none" stroke={VOLT} strokeWidth="2.4" strokeOpacity="0.25" />
      <path
        d={d} fill="none" stroke={VOLT} strokeWidth="2.4"
        strokeDasharray="6 12" strokeLinecap="round"
        style={{ animation: 'dashFlow 0.9s linear infinite', filter: `drop-shadow(0 0 3px ${VOLT})` }}
      />
    </>
  );
}

// Interruptor de potencia (símbolo de palanca abierta/cerrada).
function Breaker({ x, y, label, closed }) {
  const c = closed ? OK : DANGER;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="-14" r="3" fill={c} />
      <circle cx="0" cy="14" r="3" fill={c} />
      <line x1="0" y1="-14" x2={closed ? 0 : 11} y2={closed ? 14 : 12} stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      <text x="-10" y="5" textAnchor="end" style={txt(9, TEXT_MUTED, 600)}>{label}</text>
    </g>
  );
}

function txt(size, color, weight) {
  return {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: size,
    fill: color,
    fontWeight: weight || 500,
    letterSpacing: '0.04em',
  };
}
