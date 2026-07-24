import React from 'react';
import Panel from './Panel.jsx';
import { VOLT, SOLAR, OK, DANGER, TEXT, TEXT_DIM, TEXT_MUTED } from '../theme.js';

export default function BudgetRing({ data }) {
  const progress = Math.min(1.25, data.monthSoFar / data.monthlyBudget);
  const pct = Math.round(progress * 100);
  const onTrack = progress <= 1.0;
  const color = progress > 1.0 ? DANGER : progress > 0.85 ? SOLAR : OK;

  const size = 160;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.min(c, progress * c);

  return (
    <Panel
      eyebrow="CICLO · ABRIL 2026"
      title="Presupuesto Mensual"
      accent={color}
      style={{ minHeight: 260 }}
    >
      <div style={styles.wrap}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} />
                <stop offset="100%" stopColor={color === OK ? '#7df9ff' : color} />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
            <circle
              cx={size / 2} cy={size / 2} r={r}
              stroke="url(#ringGrad)"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - dash}
              style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 0.8s' }}
            />
          </svg>
          <div style={styles.center}>
            <div style={{ ...styles.centerVal, color }}>{pct}%</div>
            <div style={styles.centerLbl}>USADO</div>
          </div>
        </div>
        <div style={styles.stats}>
          <Stat label="Gastado" value={'$' + (data.monthSoFar / 1000).toFixed(1) + 'k'} color={color} />
          <Stat label="Presupuesto" value={'$' + (data.monthlyBudget / 1000).toFixed(0) + 'k'} color={TEXT_DIM} />
          <Stat label="Restante" value={'$' + Math.max(0, (data.monthlyBudget - data.monthSoFar) / 1000).toFixed(1) + 'k'} color={onTrack ? OK : DANGER} />
          <Stat label="Proyección" value={'$' + (data.monthSoFar * 30 / Math.max(1, data.now.getDate()) / 1000).toFixed(0) + 'k'} color={SOLAR} />
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={statStyles.row}>
      <span style={statStyles.label}>{label}</span>
      <span style={{ ...statStyles.value, color }}>{value}</span>
    </div>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  center: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerVal: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textShadow: '0 0 16px currentColor',
  },
  centerLbl: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.3em',
    color: TEXT_MUTED,
    marginTop: 2,
  },
  stats: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
  },
};

const statStyles = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: 6,
    background: 'rgba(10,14,32,0.5)',
  },
  label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.18em',
    color: TEXT_DIM,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.4,
  },
};
