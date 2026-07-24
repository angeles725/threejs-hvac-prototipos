import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Panel from './Panel.jsx';
import { VOLT, SOLAR, PLASMA, OK, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED } from '../theme.js';

const PALETTE = [VOLT, SOLAR, PLASMA, OK, DANGER, COOL, '#7df9ff', '#f59e0b'];
const TIER_COLORS = {
  'HVAC': VOLT,
  'Eléctrico': SOLAR,
  'Cargas': PLASMA,
  'Crítica': DANGER,
};

function groupByTier(zones) {
  const map = {};
  zones.forEach(z => {
    if (!map[z.tier]) map[z.tier] = { name: z.tier, kw: 0, zones: [] };
    map[z.tier].kw += z.kw;
    map[z.tier].zones.push(z.id);
  });
  return Object.values(map).sort((a, b) => b.kw - a.kw);
}

const VIEWS = [
  { id: 'system', label: 'Sistema' },
  { id: 'tier', label: 'Tier' },
];

export default function PowerDonut({ data }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const [view, setView] = useState('system');

  const items = view === 'tier'
    ? groupByTier(data.zones)
    : data.zones.map(z => ({ name: z.name, kw: z.kw }));

  const colors = view === 'tier'
    ? items.map(it => TIER_COLORS[it.name] || VOLT)
    : items.map((_, i) => PALETTE[i % PALETTE.length]);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: items.map(it => it.name),
        datasets: [{
          data: items.map(it => it.kw),
          backgroundColor: colors,
          borderColor: '#070A15',
          borderWidth: 3,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { duration: 700, easing: 'easeOutCubic' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)',
            borderColor: VOLT + '55',
            borderWidth: 1,
            titleColor: TEXT,
            bodyColor: TEXT_DIM,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: ctx => ctx.parsed.toFixed(1) + ' kW',
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
    // Rebuild the chart when view switches (label set changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.data.labels = items.map(it => it.name);
    chartRef.current.data.datasets[0].data = items.map(it => it.kw);
    chartRef.current.data.datasets[0].backgroundColor = colors;
    chartRef.current.update('active');
  }, [data.tick, view]);

  const total = data.totalKW;

  return (
    <Panel
      eyebrow={view === 'tier' ? 'AGRUPADO POR TIER' : 'DISTRIBUCIÓN · TIEMPO REAL'}
      title={view === 'tier' ? 'Mix por Categoría' : 'Mix de Consumo por Sistema'}
      accent={SOLAR}
      style={{ height: 360 }}
      actions={
        <div style={chipStyles.wrap}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                ...chipStyles.chip,
                ...(view === v.id ? chipStyles.active : null),
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      }
    >
      <div style={styles.wrap}>
        <div style={styles.chartWrap}>
          <canvas ref={ref} />
          <div style={styles.centerLabel}>
            <div style={styles.centerVal}>{total.toFixed(0)}</div>
            <div style={styles.centerUnit}>kW totales</div>
          </div>
        </div>
        <div style={styles.legend}>
          {items.map((it, i) => {
            const pct = (it.kw / total) * 100;
            return (
              <div key={it.name} style={styles.legendRow}>
                <span style={{ ...styles.legendDot, background: colors[i] }} />
                <span style={styles.legendName}>{it.name}</span>
                <span style={styles.legendVal}>{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

const chipStyles = {
  wrap: {
    display: 'flex',
    gap: 4,
    padding: 3,
    borderRadius: 10,
    background: 'rgba(10,14,32,0.6)',
    border: '1px solid rgba(0,240,255,0.12)',
  },
  chip: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    padding: '5px 10px',
    borderRadius: 7,
    color: TEXT_DIM,
    textTransform: 'uppercase',
    transition: 'all 0.2s',
  },
  active: {
    background: 'linear-gradient(135deg, ' + SOLAR + ', #e8b980)',
    color: '#070A15',
  },
};

const styles = {
  wrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    height: '100%',
    alignItems: 'center',
  },
  chartWrap: {
    position: 'relative',
    height: 240,
  },
  centerLabel: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  centerVal: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: VOLT,
    textShadow: '0 0 18px rgba(0,240,255,0.6)',
    letterSpacing: '0.02em',
  },
  centerUnit: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.24em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 240,
    overflowY: 'auto',
    paddingRight: 4,
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    flexShrink: 0,
    boxShadow: '0 0 8px currentColor',
  },
  legendName: {
    color: TEXT_DIM,
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  legendVal: {
    fontFamily: "'JetBrains Mono', monospace",
    color: TEXT,
    fontWeight: 600,
    letterSpacing: 0.4,
  },
};
