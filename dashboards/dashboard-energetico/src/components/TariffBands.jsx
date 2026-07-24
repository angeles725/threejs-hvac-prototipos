import React from 'react';
import Panel from './Panel.jsx';
import { buildTariffBands } from '../hooks/useEnergySimulation.js';
import { TEXT, TEXT_DIM, TEXT_MUTED, SOLAR, OK, DANGER } from '../theme.js';

export default function TariffBands({ data }) {
  const bands = buildTariffBands();
  const currentHour = data.now.getHours();

  return (
    <Panel
      eyebrow="CFE GDMTH · TARIFA DINÁMICA"
      title="Bandas Tarifarias · 24h"
      accent={SOLAR}
      style={{ minHeight: 230 }}
    >
      <div style={styles.wrap}>
       <div className="r-hscroll" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={styles.bandsRow}>
          {bands.map((b, i) => (
            <div
              key={i}
              style={{
                ...styles.band,
                background: b.color,
                opacity: i === currentHour ? 1 : 0.55,
                height: i === currentHour ? 52 : 40,
                boxShadow: i === currentHour ? '0 0 16px ' + b.color : 'none',
              }}
            >
              {i === currentHour && <span style={styles.bandMarker} />}
            </div>
          ))}
        </div>
        <div style={styles.hoursRow}>
          {bands.map((b, i) => (
            <div key={i} style={{
              ...styles.hour,
              color: i === currentHour ? b.color : TEXT_MUTED,
              fontWeight: i === currentHour ? 700 : 500,
            }}>
              {String(i).padStart(2, '0')}
            </div>
          ))}
        </div>
       </div>
        <div style={styles.legend}>
          {[
            { color: '#10B981', label: 'Base', range: '00-06', rate: 1.12 },
            { color: '#eab308', label: 'Intermedia', range: '06-18 · 22-24', rate: 2.10 },
            { color: '#ef4444', label: 'Punta', range: '18-22', rate: 3.85 },
          ].map(l => (
            <div key={l.label} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: l.color }} />
              <div>
                <div style={{ ...styles.legendLabel, color: l.color }}>{l.label}</div>
                <div style={styles.legendRange}>{l.range} · ${l.rate.toFixed(2)}/kWh</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  bandsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(24, 1fr)',
    gap: 2,
    alignItems: 'flex-end',
    height: 56,
  },
  band: {
    borderRadius: 3,
    position: 'relative',
    transition: 'all 0.4s',
  },
  bandMarker: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 6,
    height: 6,
    borderRadius: 3,
    background: 'white',
    boxShadow: '0 0 6px white',
    animation: 'pulseGlow 1.4s infinite',
  },
  hoursRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(24, 1fr)',
    gap: 2,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 8,
    letterSpacing: '0.05em',
  },
  hour: { textAlign: 'center' },
  legend: {
    display: 'flex',
    justifyContent: 'space-around',
    gap: 10,
    padding: '12px 8px 4px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    flexShrink: 0,
    boxShadow: '0 0 8px currentColor',
  },
  legendLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
  },
  legendRange: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.04em',
  },
};
