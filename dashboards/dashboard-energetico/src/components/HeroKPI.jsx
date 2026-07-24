import React, { useEffect, useRef } from 'react';
import { VOLT, VOLT_GLOW, SOLAR, OK, PLASMA, TEXT, TEXT_DIM, TEXT_MUTED, DANGER } from '../theme.js';

function cloudLabel(arr) {
  const max = Math.max(...arr);
  if (max === 0) return 'Sin irradiación';
  const now = arr[new Date().getHours()];
  const ratio = now / max;
  if (ratio > 0.9) return 'Cielo despejado';
  if (ratio > 0.6) return 'Nubes dispersas';
  if (ratio > 0.3) return 'Nublado parcial';
  if (ratio > 0) return 'Nublado';
  return 'Sin irradiación';
}

export default function HeroKPI({ data }) {
  const { totalKW, totalKWHToday, costToday, co2Today, savedPct, solarKW, powerFactor, tariff } = data;

  const cards = [
    {
      label: 'DEMANDA INSTANTÁNEA',
      value: totalKW.toFixed(0),
      unit: 'kW',
      accent: VOLT,
      sub: 'Potencia total del sitio',
      spark: data.history.map(h => h.demand),
      trend: '+2.4%',
      trendUp: true,
    },
    {
      label: 'ENERGÍA HOY',
      value: (totalKWHToday / 1000).toFixed(2),
      unit: 'MWh',
      accent: SOLAR,
      sub: 'Acumulado desde 00:00',
      spark: data.daily.map(d => d.kwh),
      trend: '-' + Math.abs(savedPct).toFixed(1) + '% vs ayer',
      trendUp: false,
    },
    {
      label: 'COSTO HOY',
      value: '$' + (costToday / 1000).toFixed(1) + 'k',
      unit: 'MXN',
      accent: tariff.color,
      sub: 'Banda actual: ' + tariff.band,
      spark: data.daily.map(d => d.cost),
      trend: 'Tarifa $' + tariff.rate.toFixed(2),
    },
    {
      label: 'HUELLA DE CARBONO',
      value: co2Today.toFixed(0),
      unit: 'kg CO₂e',
      accent: OK,
      sub: 'Factor red: 0.427',
      spark: data.daily.map(d => d.kwh * 0.427),
      trend: '-' + savedPct.toFixed(1) + '%',
      trendUp: true,
    },
    {
      label: 'SOLAR EN VIVO',
      value: solarKW.toFixed(0),
      unit: 'kW',
      accent: PLASMA,
      sub: 'Fotovoltaico PV-A · ' + ((solarKW / Math.max(totalKW, 1)) * 100).toFixed(1) + '% mix',
      spark: data.solarDaily,
      trend: cloudLabel(data.solarDaily),
    },
    {
      label: 'FACTOR DE POTENCIA',
      value: powerFactor.toFixed(3),
      unit: 'pu',
      accent: powerFactor > 0.95 ? OK : powerFactor > 0.92 ? SOLAR : DANGER,
      sub: 'Meta operativa > 0.95',
      spark: data.pfHistory,
      trend: powerFactor > 0.95 ? 'Óptimo' : 'Monitorear',
    },
  ];

  return (
    <div style={styles.grid}>
      {cards.map(c => (
        <KPICard key={c.label} {...c} />
      ))}
    </div>
  );
}

function KPICard({ label, value, unit, accent, sub, spark, trend, trendUp }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !spark || spark.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...spark);
    const max = Math.max(...spark);
    const range = max - min || 1;
    const pts = spark.map((v, i) => ({
      x: (i / (spark.length - 1)) * w,
      y: h - 2 - ((v - min) / range) * (h - 6),
    }));

    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, accent + '66');
    grad.addColorStop(1, accent + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Last point dot
    const last = pts[pts.length - 1];
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(last.x - 1, last.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [spark, accent]);

  return (
    <div className="glass" style={{ ...styles.card, borderColor: accent + '33' }}>
      <div style={{ ...styles.accentGlow, background: accent }} />
      <div style={styles.cardTop}>
        <span style={styles.cardLabel}>{label}</span>
        {trend && (
          <span style={{
            ...styles.trend,
            color: trendUp === true ? OK : trendUp === false ? SOLAR : TEXT_DIM,
          }}>
            {trend}
          </span>
        )}
      </div>
      <div style={styles.valueRow}>
        <span style={{ ...styles.value, color: accent }}>{value}</span>
        <span style={styles.unit}>{unit}</span>
      </div>
      <div style={styles.sub}>{sub}</div>
      <canvas ref={canvasRef} style={styles.spark} />
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 18,
  },
  card: {
    padding: '14px 16px 4px',
    minHeight: 130,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  accentGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    opacity: 0.8,
    filter: 'blur(1px)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.28em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  trend: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    fontWeight: 600,
  },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  value: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '0.02em',
    lineHeight: 1,
    textShadow: '0 0 16px currentColor',
  },
  unit: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: TEXT_DIM,
    letterSpacing: '0.1em',
  },
  sub: {
    fontSize: 11,
    color: TEXT_DIM,
    marginBottom: 8,
  },
  spark: {
    width: '100%',
    height: 36,
    display: 'block',
    marginTop: 'auto',
  },
};
