import React from 'react';
import Panel from './Panel.jsx';
import { heatColor, VOLT, SOLAR, TEXT, TEXT_DIM, TEXT_MUTED, PLASMA } from '../theme.js';

// Isometric building — 3 floors, roof solar, mechanical penthouse
// Uses simple SVG transforms, no libs. Each zone has its own polygon.
// Coordinates are in iso (tile) space then projected to screen.

// iso projection helpers
const ISO_W = 30;
const ISO_H = 16;
function iso(x, y, z = 0) {
  return {
    x: (x - y) * ISO_W,
    y: (x + y) * ISO_H - z * 22,
  };
}
const P = (x, y, z) => {
  const p = iso(x, y, z);
  return p.x + ',' + p.y;
};
function poly(pts) { return pts.map(p => P(...p)).join(' '); }

// A "floor slab" - draws top face
function FloorSlab({ x0, y0, x1, y1, z, color, stroke, label, glow }) {
  const pts = poly([
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
  ]);
  const cx = iso((x0 + x1) / 2, (y0 + y1) / 2, z);
  return (
    <g>
      <polygon points={pts} fill={color} stroke={stroke || 'rgba(0,0,0,0.35)'} strokeWidth="1" style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : null} />
      {label && (
        <text x={cx.x} y={cx.y + 3} textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono',monospace" fill="rgba(0,0,0,0.85)" fontWeight="700" letterSpacing="0.5">
          {label}
        </text>
      )}
    </g>
  );
}

// Wall segment from (x0,y0) to (x1,y1), height h
function Wall({ x0, y0, x1, y1, zBase, h, color, side }) {
  const pts = poly([
    [x0, y0, zBase],
    [x1, y1, zBase],
    [x1, y1, zBase + h],
    [x0, y0, zBase + h],
  ]);
  // side: 'left' darker, 'right' lighter
  const shade = side === 'left' ? 0.55 : 0.75;
  return <polygon points={pts} fill={tint(color, shade)} stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />;
}

// Box building (x0-x1, y0-y1, zBase..zTop) with a top face color
function IsoBox({ x0, y0, x1, y1, zBase, zTop, color, topColor, label, glow }) {
  const c = color;
  return (
    <g>
      {/* left wall (y1 side) */}
      <Wall x0={x0} y0={y1} x1={x1} y1={y1} zBase={zBase} h={zTop - zBase} color={c} side="left" />
      {/* right wall (x1 side) */}
      <Wall x0={x1} y0={y0} x1={x1} y1={y1} zBase={zBase} h={zTop - zBase} color={c} side="right" />
      {/* top slab */}
      <FloorSlab x0={x0} y0={y0} x1={x1} y1={y1} z={zTop} color={topColor || c} label={label} glow={glow} />
    </g>
  );
}

function tint(hex, factor) {
  // factor < 1 darkens, > 1 lightens (clamped)
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = v => Math.max(0, Math.min(255, Math.round(v * factor)));
  return '#' + [adj(r), adj(g), adj(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// zone layout inside floor 1 footprint (2 rows x 4 cols logically)
// We split into 4 rectangles labeled by zone id
const ZONE_PLOTS = {
  CHILL:  { x0: 0, y0: 0, x1: 3, y1: 2, floor: 0 },
  AHU:    { x0: 3, y0: 0, x1: 6, y1: 2, floor: 0 },
  LIGHT:  { x0: 0, y0: 2, x1: 3, y1: 4, floor: 0 },
  KITCH:  { x0: 3, y0: 2, x1: 6, y1: 4, floor: 0 },
  DATA:   { x0: 0, y0: 0, x1: 3, y1: 2, floor: 1 },
  OFFICE: { x0: 3, y0: 0, x1: 6, y1: 4, floor: 1 },
  PARK:   { x0: 0, y0: 2, x1: 3, y1: 4, floor: 1 },
  EV:     { x0: 0, y0: 0, x1: 3, y1: 2, floor: 2 },
};

export default function IsoFacility({ data }) {
  // Viewport
  const viewW = 820;
  const viewH = 440;
  // Center building in view
  const cx = viewW / 2;
  const cy = 100;

  const floorH = 1.2;

  const zoneById = Object.fromEntries(data.zones.map(z => [z.id, z]));

  return (
    <Panel
      eyebrow="GEMELO DIGITAL · PLANTA FÍSICA"
      title="Vista Isométrica · Consumo por Zona"
      accent={PLASMA}
      style={{ minHeight: 460 }}
      actions={
        <div style={legendStyles.wrap}>
          {['BAJO', 'MEDIO', 'ALTO', 'PICO'].map((lbl, i) => (
            <span key={lbl} style={{
              ...legendStyles.chip,
              background: heatColor(i / 3),
              color: i < 2 ? '#070A15' : '#070A15',
            }}>{lbl}</span>
          ))}
        </div>
      }
    >
      <div style={{ width: '100%', height: 420, position: 'relative', overflow: 'hidden' }}>
        <svg viewBox={`${-viewW / 2} 0 ${viewW} ${viewH}`} width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <radialGradient id="ground" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(0,240,255,0.08)" />
              <stop offset="100%" stopColor="rgba(0,240,255,0)" />
            </radialGradient>
            <linearGradient id="solarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2C3E90" />
              <stop offset="100%" stopColor="#0A1240" />
            </linearGradient>
            <filter id="pulseFilter">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          <ellipse cx="0" cy="260" rx="360" ry="140" fill="url(#ground)" />

          <g transform={`translate(${cx - viewW / 2} ${cy})`}>
            {/* Ground grid tiles */}
            <g opacity="0.35">
              {Array.from({ length: 8 }).map((_, i) =>
                Array.from({ length: 6 }).map((__, j) => {
                  const pts = poly([
                    [i - 1, j - 1, 0],
                    [i, j - 1, 0],
                    [i, j, 0],
                    [i - 1, j, 0],
                  ]);
                  return <polygon key={i + '-' + j} points={pts} fill="none" stroke="rgba(0,240,255,0.12)" strokeWidth="0.5" />;
                })
              )}
            </g>

            {/* Floor 1 zones */}
            {['CHILL', 'AHU', 'LIGHT', 'KITCH'].map(id => {
              const p = ZONE_PLOTS[id];
              const z = zoneById[id];
              const zBase = p.floor * floorH;
              const zTop = zBase + floorH;
              const color = heatColor(z.ratio);
              return (
                <IsoBox
                  key={id}
                  x0={p.x0} y0={p.y0} x1={p.x1} y1={p.y1}
                  zBase={zBase} zTop={zTop}
                  color={color}
                  topColor={color}
                  glow={z.ratio > 0.7 || z.spiking}
                />
              );
            })}

            {/* Floor 2 zones */}
            {['DATA', 'OFFICE', 'PARK'].map(id => {
              const p = ZONE_PLOTS[id];
              const z = zoneById[id];
              const zBase = p.floor * floorH;
              const zTop = zBase + floorH;
              const color = heatColor(z.ratio);
              return (
                <IsoBox
                  key={id}
                  x0={p.x0} y0={p.y0} x1={p.x1} y1={p.y1}
                  zBase={zBase} zTop={zTop}
                  color={color}
                  topColor={color}
                  glow={z.ratio > 0.7 || z.spiking}
                />
              );
            })}

            {/* Roof / solar + EV */}
            {(() => {
              const p = ZONE_PLOTS.EV;
              const z = zoneById.EV;
              const zBase = p.floor * floorH;
              const zTop = zBase + floorH * 0.6;
              return (
                <IsoBox
                  key="ev-box"
                  x0={p.x0} y0={p.y0} x1={p.x1} y1={p.y1}
                  zBase={zBase} zTop={zTop}
                  color={heatColor(z.ratio)}
                  glow={z.ratio > 0.7}
                />
              );
            })()}

            {/* Solar PV array on right side of roof */}
            <PVArray x0={3} y0={0} x1={6} y1={4} z={2 * floorH} />

            {/* Rooftop mechanical units (chillers) */}
            <MechanicalUnit x={0.4} y={0.3} z={3 * floorH * 0.6} />
            <MechanicalUnit x={1.8} y={0.3} z={3 * floorH * 0.6} />
            <MechanicalUnit x={0.4} y={2.6} z={3 * floorH * 0.6} />

            {/* Live kW labels hovering above each zone */}
            {data.zones.map((z, i) => {
              const plot = ZONE_PLOTS[z.id];
              if (!plot) return null;
              const zBase = plot.floor * floorH;
              const zTop = zBase + floorH + 0.8;
              const cxp = iso((plot.x0 + plot.x1) / 2, (plot.y0 + plot.y1) / 2, zTop);
              const c = heatColor(z.ratio);
              return (
                <g key={z.id}>
                  <line
                    x1={cxp.x}
                    y1={cxp.y + 8}
                    x2={cxp.x}
                    y2={cxp.y + 20}
                    stroke={c}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                  {z.spiking && (
                    <circle cx={cxp.x} cy={cxp.y + 4} r="3" fill={c}>
                      <animate attributeName="r" from="3" to="14" dur="1.2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <g transform={`translate(${cxp.x} ${cxp.y - 2})`}>
                    <rect x="-30" y="-14" width="60" height="18" rx="4" fill="rgba(7,10,21,0.92)" stroke={c} strokeWidth={z.spiking ? '1.6' : '1'} />
                    <text x="0" y="-2" textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono',monospace" fill={c} fontWeight="700" letterSpacing="0.4">
                      {z.kw.toFixed(0)} kW
                    </text>
                  </g>
                  <text x={cxp.x} y={cxp.y + 16} textAnchor="middle" fontSize="8" fontFamily="'JetBrains Mono',monospace" fill={TEXT_MUTED} letterSpacing="0.8">
                    {z.id}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Scan line effect */}
          <ScanLine viewW={viewW} viewH={viewH} />
        </svg>

        {/* overlay key values */}
        <div style={styles.overlayStats}>
          <div style={styles.overlayRow}>
            <span style={styles.overlayLabel}>DEMANDA</span>
            <span style={{ ...styles.overlayVal, color: VOLT }}>{data.totalKW.toFixed(0)} kW</span>
          </div>
          <div style={styles.overlayRow}>
            <span style={styles.overlayLabel}>SOLAR</span>
            <span style={{ ...styles.overlayVal, color: PLASMA }}>{data.solarKW.toFixed(0)} kW</span>
          </div>
          <div style={styles.overlayRow}>
            <span style={styles.overlayLabel}>NETO RED</span>
            <span style={{ ...styles.overlayVal, color: SOLAR }}>{(data.totalKW - data.solarKW).toFixed(0)} kW</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function PVArray({ x0, y0, x1, y1, z }) {
  const rows = 3;
  const cols = 6;
  const dx = (x1 - x0) / cols;
  const dy = (y1 - y0) / rows;
  const cells = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const rx0 = x0 + i * dx + dx * 0.08;
      const ry0 = y0 + j * dy + dy * 0.08;
      const rx1 = x0 + (i + 1) * dx - dx * 0.08;
      const ry1 = y0 + (j + 1) * dy - dy * 0.08;
      cells.push(
        <polygon
          key={i + '-' + j}
          points={poly([[rx0, ry0, z + 0.1], [rx1, ry0, z + 0.1], [rx1, ry1, z + 0.1], [rx0, ry1, z + 0.1]])}
          fill="url(#solarPanel)"
          stroke="#4a5fbd"
          strokeWidth="0.5"
        />
      );
    }
  }
  return <g>{cells}</g>;
}

function MechanicalUnit({ x, y, z }) {
  const s = 0.5;
  const pts = poly([
    [x, y, z],
    [x + s, y, z],
    [x + s, y + s, z],
    [x, y + s, z],
  ]);
  return (
    <g>
      <polygon points={pts} fill="#3a4160" stroke="#1a2040" strokeWidth="0.6" />
      {/* top */}
      <polygon points={poly([[x, y, z + 0.3], [x + s, y, z + 0.3], [x + s, y + s, z + 0.3], [x, y + s, z + 0.3]])} fill="#525a7a" stroke="#1a2040" strokeWidth="0.6" />
      {/* walls */}
      <polygon points={poly([[x + s, y, z], [x + s, y + s, z], [x + s, y + s, z + 0.3], [x + s, y, z + 0.3]])} fill="#3a4160" />
      <polygon points={poly([[x, y + s, z], [x + s, y + s, z], [x + s, y + s, z + 0.3], [x, y + s, z + 0.3]])} fill="#2a304a" />
    </g>
  );
}

function ScanLine({ viewW, viewH }) {
  return (
    <g style={{ mixBlendMode: 'screen', opacity: 0.4 }}>
      <rect x={-viewW / 2} y="0" width={viewW} height="2" fill="url(#scanGrad)" style={{ animation: 'none' }}>
        <animate attributeName="y" from="0" to={viewH} dur="6s" repeatCount="indefinite" />
      </rect>
      <defs>
        <linearGradient id="scanGrad" x1="0%" x2="100%">
          <stop offset="0%" stopColor="rgba(0,240,255,0)" />
          <stop offset="50%" stopColor="rgba(0,240,255,0.6)" />
          <stop offset="100%" stopColor="rgba(0,240,255,0)" />
        </linearGradient>
      </defs>
    </g>
  );
}

const legendStyles = {
  wrap: { display: 'flex', gap: 4 },
  chip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 6,
    letterSpacing: '0.12em',
  },
};

const styles = {
  overlayStats: {
    position: 'absolute',
    top: 10,
    left: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '10px 14px',
    background: 'rgba(5,6,13,0.7)',
    border: '1px solid rgba(0,240,255,0.15)',
    borderRadius: 10,
    backdropFilter: 'blur(8px)',
  },
  overlayRow: { display: 'flex', justifyContent: 'space-between', gap: 16, minWidth: 160 },
  overlayLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.24em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  overlayVal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
};
