import React from 'react';
import Panel from './Panel.jsx';
import { OK, PLASMA, SOLAR, VOLT, TEXT, TEXT_DIM, TEXT_MUTED } from '../theme.js';

// Isométrico de infraestructura sostenible: techo con paneles solares,
// aerogenerador, muro verde, batería de almacenamiento, estación de recarga EV.
// Proyección iso clásica (ISO 30°).

const ISO_W = 28;
const ISO_H = 16;
function iso(x, y, z = 0) {
  return { x: (x - y) * ISO_W, y: (x + y) * ISO_H - z * 24 };
}
const P = (x, y, z) => { const p = iso(x, y, z); return p.x + ',' + p.y; };
const poly = pts => pts.map(p => P(...p)).join(' ');

function tint(hex, factor) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = v => Math.max(0, Math.min(255, Math.round(v * factor)));
  return '#' + [adj(r), adj(g), adj(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function Box({ x0, y0, x1, y1, zBase, zTop, color, topColor, glow }) {
  return (
    <g>
      <polygon points={poly([[x0, y1, zBase], [x1, y1, zBase], [x1, y1, zTop], [x0, y1, zTop]])} fill={tint(color, 0.55)} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      <polygon points={poly([[x1, y0, zBase], [x1, y1, zBase], [x1, y1, zTop], [x1, y0, zTop]])} fill={tint(color, 0.72)} stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
      <polygon points={poly([[x0, y0, zTop], [x1, y0, zTop], [x1, y1, zTop], [x0, y1, zTop]])} fill={topColor || color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" style={glow ? { filter: `drop-shadow(0 0 10px ${color})` } : null} />
    </g>
  );
}

function PVArray({ x0, y0, x1, y1, z, solarRatio }) {
  const rows = 3, cols = 5;
  const dx = (x1 - x0) / cols, dy = (y1 - y0) / rows;
  const cells = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const rx0 = x0 + i * dx + dx * 0.12;
      const ry0 = y0 + j * dy + dy * 0.12;
      const rx1 = x0 + (i + 1) * dx - dx * 0.12;
      const ry1 = y0 + (j + 1) * dy - dy * 0.12;
      cells.push(
        <polygon
          key={i + '-' + j}
          points={poly([[rx0, ry0, z + 0.1], [rx1, ry0, z + 0.1], [rx1, ry1, z + 0.1], [rx0, ry1, z + 0.1]])}
          fill="url(#pvPanel)"
          stroke="#567"
          strokeWidth="0.6"
          style={{ opacity: 0.4 + solarRatio * 0.6, filter: solarRatio > 0.7 ? 'drop-shadow(0 0 6px rgba(192,132,252,0.5))' : 'none' }}
        />
      );
    }
  }
  return <g>{cells}</g>;
}

function WindTurbine({ x, y, spin = 6 }) {
  const base = iso(x, y, 0);
  const top = iso(x, y, 3.4);
  return (
    <g>
      {/* tower */}
      <polygon points={poly([[x - 0.1, y - 0.1, 0], [x + 0.1, y - 0.1, 0], [x + 0.1, y + 0.1, 0], [x - 0.1, y + 0.1, 0], [x - 0.08, y + 0.08, 3.4], [x + 0.08, y + 0.08, 3.4], [x + 0.08, y - 0.08, 3.4], [x - 0.08, y - 0.08, 3.4]])} fill="#d8dde6" />
      <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} stroke="#c5cbd6" strokeWidth="3" strokeLinecap="round" />
      {/* nacelle */}
      <ellipse cx={top.x} cy={top.y} rx="9" ry="4" fill="#e6e8ef" stroke="#89909c" />
      {/* blades — rotating */}
      <g transform={`translate(${top.x} ${top.y})`} style={{ animation: `rotate360 ${spin}s linear infinite`, transformOrigin: 'center' }}>
        {[0, 120, 240].map(deg => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path d="M 0 0 L 0 -28 L 3 -26 L 2 0 Z" fill="#f1f3f7" stroke="#8a92a0" strokeWidth="0.6" />
          </g>
        ))}
        <circle r="2" fill="#9aa2b2" />
      </g>
    </g>
  );
}

function BatteryBank({ x0, y0, x1, y1, z, soc }) {
  const color = soc > 0.6 ? OK : soc > 0.3 ? '#facc15' : '#ef4444';
  return (
    <g>
      <Box x0={x0} y0={y0} x1={x1} y1={y1} zBase={z} zTop={z + 1.1} color="#2b3446" topColor="#3b465d" />
      {/* LED strip */}
      <polygon points={poly([[x0, y0, z + 1.15], [x0 + (x1 - x0) * soc, y0, z + 1.15], [x0 + (x1 - x0) * soc, y1, z + 1.15], [x0, y1, z + 1.15]])} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
    </g>
  );
}

function GreenRoof({ x0, y0, x1, y1, z }) {
  const tiles = [];
  const rows = 4, cols = 4;
  const dx = (x1 - x0) / cols;
  const dy = (y1 - y0) / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const rx0 = x0 + i * dx;
      const ry0 = y0 + j * dy;
      const rx1 = x0 + (i + 1) * dx;
      const ry1 = y0 + (j + 1) * dy;
      const greens = ['#16a34a', '#65a30d', '#22c55e', '#4d7c0f', '#15803d'];
      const c = greens[(i * 7 + j * 3) % greens.length];
      tiles.push(
        <polygon key={i + '-' + j} points={poly([[rx0, ry0, z], [rx1, ry0, z], [rx1, ry1, z], [rx0, ry1, z]])} fill={c} stroke="#0f3d1f" strokeWidth="0.4" />
      );
    }
  }
  return <g>{tiles}</g>;
}

function EVCharger({ x, y, z, active }) {
  const c = active ? OK : '#475569';
  return (
    <g>
      <polygon points={poly([[x, y, z], [x + 0.25, y, z], [x + 0.25, y + 0.25, z], [x, y + 0.25, z], [x, y + 0.25, z + 0.9], [x + 0.25, y + 0.25, z + 0.9], [x + 0.25, y, z + 0.9], [x, y, z + 0.9]])} fill="#e5e7eb" stroke="#6b7280" strokeWidth="0.5" />
      <circle cx={iso(x + 0.125, y + 0.125, z + 0.6).x} cy={iso(x + 0.125, y + 0.125, z + 0.6).y} r="3" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})`, animation: active ? 'pulseGlow 1.4s infinite' : 'none' }} />
    </g>
  );
}

function Tree({ x, y, h = 0.9 }) {
  const p1 = iso(x, y, 0);
  const p2 = iso(x, y, h);
  return (
    <g>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#6b4a2e" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx={p2.x} cy={p2.y - 6} rx="10" ry="8" fill="#16a34a" />
      <ellipse cx={p2.x - 5} cy={p2.y - 2} rx="6" ry="5" fill="#15803d" />
      <ellipse cx={p2.x + 5} cy={p2.y - 2} rx="6" ry="5" fill="#22c55e" />
    </g>
  );
}

export default function IsoSustainability({ data }) {
  const solarRatio = data.solarKW / 240;
  const now = data.now;
  const hour = now.getHours() + now.getMinutes() / 60;
  const windSpeed = 4 + Math.sin((hour / 24) * Math.PI * 2) * 2 + (data.totalKW / 800) * 1.2;
  const batterySoC = 0.45 + Math.sin((hour / 24) * Math.PI) * 0.35;

  const viewW = 900;
  const viewH = 500;
  const anyEvCharging = data.zones.find(z => z.id === 'EV' && z.kw > 60);

  return (
    <Panel
      eyebrow="INFRAESTRUCTURA SOSTENIBLE · GEMELO DIGITAL"
      title="Sistemas Verdes · Vista Isométrica"
      accent={OK}
      style={{ minHeight: 520 }}
      actions={
        <div style={styles.badges}>
          <span style={{ ...styles.badge, background: SOLAR }}>PV {data.solarKW.toFixed(0)} kW</span>
          <span style={{ ...styles.badge, background: PLASMA }}>WIND {(windSpeed * 3.5).toFixed(0)} kW</span>
          <span style={{ ...styles.badge, background: OK }}>SoC {(batterySoC * 100).toFixed(0)}%</span>
        </div>
      }
    >
      <div style={{ width: '100%', height: 460, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox={`${-viewW / 2} 0 ${viewW} ${viewH}`} width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="pvPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#253258" />
              <stop offset="100%" stopColor="#0d1434" />
            </linearGradient>
            <radialGradient id="sky" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(109,139,255,0.15)" />
              <stop offset="100%" stopColor="rgba(109,139,255,0)" />
            </radialGradient>
            <linearGradient id="grass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a4d2e" />
              <stop offset="100%" stopColor="#0f2e1c" />
            </linearGradient>
          </defs>

          <ellipse cx="0" cy="280" rx="420" ry="160" fill="url(#sky)" />

          <g transform={`translate(${-20} ${50})`}>
            {/* Grass base */}
            <polygon points={poly([[-2, -2, 0], [8, -2, 0], [8, 6, 0], [-2, 6, 0]])} fill="url(#grass)" stroke="#083018" strokeWidth="0.4" />

            {/* Edificio principal con techo verde + PV */}
            <Box x0={0} y0={0} x1={5} y1={4} zBase={0} zTop={2.2} color="#334155" />
            <GreenRoof x0={0} y0={0} x1={2.2} y1={4} z={2.2} />
            <PVArray x0={2.3} y0={0} x1={5} y1={4} z={2.2} solarRatio={solarRatio} />

            {/* Banco de baterías detrás */}
            <BatteryBank x0={5.3} y0={0.2} x1={7.2} y1={1.4} z={0} soc={batterySoC} />
            <text x={iso(6.2, 0.8, 1.6).x} y={iso(6.2, 0.8, 1.6).y} textAnchor="middle" fontSize="9" fill={TEXT_DIM} fontFamily="'JetBrains Mono',monospace" letterSpacing="0.3">
              BESS · {(batterySoC * 100).toFixed(0)}%
            </text>

            {/* Estaciones EV */}
            <EVCharger x={5.3} y={2.2} z={0} active={!!anyEvCharging} />
            <EVCharger x={5.9} y={2.2} z={0} active={!!anyEvCharging && Math.random() > 0.5} />
            <EVCharger x={6.5} y={2.2} z={0} active={!!anyEvCharging && data.solarKW > 100} />

            {/* Aerogenerador al fondo */}
            <WindTurbine x={-0.5} y={-0.8} spin={Math.max(3, 10 - windSpeed)} />

            {/* Árboles alrededor */}
            <Tree x={-0.5} y={1.5} />
            <Tree x={-0.5} y={2.8} h={0.8} />
            <Tree x={-0.5} y={4.3} />
            <Tree x={2.0} y={5.2} h={1.0} />
            <Tree x={4.3} y={5.2} />
            <Tree x={6.8} y={3.6} h={0.85} />

            {/* Sol arriba-derecha (si es de día) */}
            {data.solarKW > 5 && (
              <g transform="translate(260, -10)">
                <circle r="26" fill="rgba(255,181,71,0.12)" />
                <circle r="18" fill="rgba(255,181,71,0.28)" />
                <circle r="12" fill="#FFB547" style={{ filter: 'drop-shadow(0 0 16px #FFB547)' }} />
              </g>
            )}

            {/* Datalabels */}
            <g transform={`translate(${iso(3.6, -0.5, 2.6).x}, ${iso(3.6, -0.5, 2.6).y})`}>
              <rect x="-46" y="-16" width="92" height="22" rx="5" fill="rgba(7,10,21,0.92)" stroke={PLASMA} strokeWidth="1" />
              <text x="0" y="-1" textAnchor="middle" fontSize="10" fontFamily="'JetBrains Mono',monospace" fill={PLASMA} fontWeight="700" letterSpacing="0.4">
                PV {data.solarKW.toFixed(0)} kW
              </text>
            </g>
            <g transform={`translate(${iso(1, -0.5, 2.6).x}, ${iso(1, -0.5, 2.6).y})`}>
              <rect x="-48" y="-16" width="96" height="22" rx="5" fill="rgba(7,10,21,0.92)" stroke={OK} strokeWidth="1" />
              <text x="0" y="-1" textAnchor="middle" fontSize="10" fontFamily="'JetBrains Mono',monospace" fill={OK} fontWeight="700" letterSpacing="0.4">
                Techo Verde 88 m²
              </text>
            </g>
          </g>
        </svg>

        {/* overlay */}
        <div style={styles.overlay}>
          <OverlayRow label="GEN. RENOVABLE HOY" value={(data.solarKWHToday).toFixed(0) + ' kWh'} color={PLASMA} />
          <OverlayRow label="AUTOCONSUMO" value={Math.min(100, (data.solarKW / Math.max(data.totalKW, 1) * 100)).toFixed(1) + ' %'} color={OK} />
          <OverlayRow label="EMISIONES EVITADAS" value={(data.solarKWHToday * 0.427).toFixed(0) + ' kg'} color={SOLAR} />
        </div>
      </div>
    </Panel>
  );
}

function OverlayRow({ label, value, color }) {
  return (
    <div style={styles.overlayRow}>
      <span style={styles.overlayLabel}>{label}</span>
      <span style={{ ...styles.overlayValue, color }}>{value}</span>
    </div>
  );
}

const styles = {
  badges: { display: 'flex', gap: 6 },
  badge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 6,
    letterSpacing: '0.12em',
    color: '#070A15',
  },
  overlay: {
    position: 'absolute',
    top: 12,
    left: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 14px',
    background: 'rgba(7,10,21,0.7)',
    border: '1px solid rgba(0,240,255,0.15)',
    borderRadius: 10,
    backdropFilter: 'blur(8px)',
  },
  overlayRow: { display: 'flex', justifyContent: 'space-between', gap: 18, minWidth: 200 },
  overlayLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.22em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  overlayValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
};
