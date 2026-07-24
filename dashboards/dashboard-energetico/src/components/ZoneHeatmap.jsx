import React from 'react';
import { TrendingUp } from 'lucide-react';
import Panel from './Panel.jsx';
import { heatColor, TEXT, TEXT_DIM, TEXT_MUTED, SOLAR } from '../theme.js';

export default function ZoneHeatmap({ data }) {
  return (
    <Panel
      eyebrow="RANKING EN VIVO · POTENCIA RELATIVA"
      title="Mapa de Calor por Zona"
      accent={SOLAR}
      style={{ minHeight: 260 }}
    >
      <div style={styles.grid}>
        {data.zones.map(z => {
          const pct = Math.round(z.ratio * 100);
          const color = heatColor(z.ratio);
          const cellStyle = {
            ...styles.cell,
            borderColor: z.spiking ? color : color + '55',
            boxShadow: z.spiking ? `0 0 0 1px ${color}, 0 0 22px ${color}55` : 'none',
            transform: z.spiking ? 'translateY(-2px)' : 'translateY(0)',
          };
          return (
            <div key={z.id} style={cellStyle}>
              <div style={styles.cellTop}>
                <span style={styles.cellTier}>{z.tier}</span>
                <span style={{ ...styles.cellBadge, background: color, color: '#070A15' }}>
                  {z.spiking && <TrendingUp size={9} strokeWidth={3} style={{ marginRight: 3 }} />}
                  {pct}%
                </span>
              </div>
              <div style={styles.cellName}>{z.name}</div>
              <div style={styles.cellValue}>
                <span style={{ color, transition: 'color 0.3s' }}>{z.kw.toFixed(1)}</span>
                <span style={styles.cellUnit}>kW</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: pct + '%',
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  boxShadow: '0 0 10px ' + color,
                }} />
              </div>
              <div style={styles.cellMeta}>
                <span>ID {z.id}</span>
                <span>PEAK {z.peak} kW</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 10,
  },
  cell: {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(10,14,32,0.5)',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
    cursor: 'default',
  },
  cellTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cellTier: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: '0.24em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  cellBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    letterSpacing: '0.08em',
    display: 'inline-flex',
    alignItems: 'center',
  },
  cellName: {
    fontSize: 12,
    color: TEXT_DIM,
    fontWeight: 500,
  },
  cellValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  cellUnit: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    color: TEXT_MUTED,
    letterSpacing: '0.12em',
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
    marginTop: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.6s ease',
  },
  cellMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    color: TEXT_MUTED,
    letterSpacing: '0.1em',
  },
};
