import React from 'react';
import { VOLT, PLASMA, SOLAR, TEXT, TEXT_DIM, TEXT_MUTED } from '../theme.js';

// Diagrama fasorial V/I trifásico tipo analizador ION.
// phasors: [{ phase, vAngle, iAngle, vMag, iMag }] — ángulos en grados (math, CCW desde +x).
const PHASE_COLOR = { L1: VOLT, L2: PLASMA, L3: SOLAR };

export default function PhasorDiagram({ phasors = [], size = 280 }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 28;
  const maxI = Math.max(1, ...phasors.map(p => p.iMag));

  // (cx + r·cosθ, cy − r·sinθ) — y invertida en SVG.
  const pt = (angleDeg, r) => {
    const a = (angleDeg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: size, height: 'auto', display: 'block', margin: '0 auto' }}
         role="img" aria-label="Diagrama fasorial">
      {/* círculos de referencia */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(0,240,255,0.12)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={R * 0.6} fill="none" stroke="rgba(0,240,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />
      {/* ejes */}
      <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
      <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
      <text x={cx + R + 2} y={cy + 3} style={lbl(8, TEXT_MUTED)}>0°</text>
      <text x={cx - 4} y={cy - R - 4} style={lbl(8, TEXT_MUTED)}>90°</text>

      {phasors.map(p => {
        const color = PHASE_COLOR[p.phase] || VOLT;
        const [vx, vy] = pt(p.vAngle, R * 0.9);
        const [ix, iy] = pt(p.iAngle, R * (0.35 + 0.5 * (p.iMag / maxI)));
        return (
          <g key={p.phase}>
            {/* fasor de tensión (sólido) */}
            <line x1={cx} y1={cy} x2={vx} y2={vy} stroke={color} strokeWidth="2.4" strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
            <Arrow x1={cx} y1={cy} x2={vx} y2={vy} color={color} />
            <text x={vx + (vx > cx ? 6 : -6)} y={vy + (vy > cy ? 12 : -4)}
                  textAnchor={vx > cx ? 'start' : 'end'} style={lbl(10, color, 700)}>{p.phase}</text>

            {/* fasor de corriente (punteado, más corto) */}
            <line x1={cx} y1={cy} x2={ix} y2={iy} stroke={color} strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.8" />
            <circle cx={ix} cy={iy} r="3" fill={color} />
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="3.5" fill={TEXT} />
    </svg>
  );
}

// Cabeza de flecha al final del segmento.
function Arrow({ x1, y1, x2, y2, color }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = 9;
  const spread = 0.4;
  const p1 = [x2 - len * Math.cos(a - spread), y2 - len * Math.sin(a - spread)];
  const p2 = [x2 - len * Math.cos(a + spread), y2 - len * Math.sin(a + spread)];
  return <polygon points={`${x2},${y2} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`} fill={color} />;
}

function lbl(size, color, weight) {
  return {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: size,
    fill: color,
    fontWeight: weight || 500,
  };
}
