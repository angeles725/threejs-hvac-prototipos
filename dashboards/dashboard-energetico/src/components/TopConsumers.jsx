import React from 'react';
import Panel from './Panel.jsx';
import { heatColor, TEXT, TEXT_DIM, TEXT_MUTED, VOLT } from '../theme.js';

export default function TopConsumers({ data }) {
  const list = data.topConsumers.slice(0, 6);
  const max = list[0]?.kw || 1;

  return (
    <Panel
      eyebrow="RANKING"
      title="Top Consumidores"
      accent={VOLT}
      style={{ minHeight: 260 }}
    >
      <div style={styles.list}>
        {list.map((z, i) => {
          const pct = z.kw / max;
          const color = heatColor(z.ratio);
          return (
            <div key={z.id} style={styles.row}>
              <span style={styles.rank}>#{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.label}>
                  <span style={styles.name}>{z.name}</span>
                  <span style={{ ...styles.kw, color }}>{z.kw.toFixed(1)} kW</span>
                </div>
                <div style={styles.track}>
                  <div style={{
                    ...styles.fill,
                    width: (pct * 100) + '%',
                    background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    boxShadow: '0 0 6px ' + color,
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const styles = {
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  row: { display: 'flex', alignItems: 'center', gap: 10 },
  rank: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: 700,
    width: 30,
    letterSpacing: 0.5,
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  name: {
    fontSize: 12,
    color: TEXT_DIM,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  kw: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
  },
  track: {
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.6s ease',
  },
};
