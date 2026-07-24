import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Panel from '../components/Panel.jsx';
import { buildTariffBands, tariffAt } from '../hooks/useEnergySimulation.js';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER } from '../theme.js';

export default function TarifasCosto({ data }) {
  const bands = buildTariffBands();
  const now = data.now;
  const hour = now.getHours() + now.getMinutes() / 60;
  const currentBand = tariffAt(hour);

  // Countdown al siguiente cambio de banda
  const nextBandChange = getNextBandChange(hour);

  // Cost by tier
  const byTier = {};
  data.zones.forEach(z => {
    byTier[z.tier] = (byTier[z.tier] || 0) + z.kw * currentBand.rate / 60;
  });
  const tierRows = Object.entries(byTier).sort(([, a], [, b]) => b - a);

  // Sorted zones by cost-at-current-rate
  const rankedZones = [...data.zones]
    .map(z => ({ ...z, costRate: z.kw * currentBand.rate }))
    .sort((a, b) => b.costRate - a.costRate);

  // Monthly projection
  const daysInMonth = 30;
  const dayOfMonth = now.getDate();
  const monthlyProjection = (data.monthSoFar / dayOfMonth) * daysInMonth;

  return (
    <>
      <div className="r-grid r-cols-4" style={{ marginBottom: 16 }}>
        <CurrentBandCard band={currentBand} next={nextBandChange} />
        <BigMetric label="COSTO HOY" value={'$' + (data.costToday / 1000).toFixed(2) + 'k'} accent={SOLAR} sub="Acumulado desde 00:00" />
        <BigMetric label="COSTO MES" value={'$' + (data.monthSoFar / 1000).toFixed(1) + 'k'} accent={VOLT} sub={`Día ${dayOfMonth} de ${daysInMonth}`} />
        <BigMetric label="PROYECCIÓN MES" value={'$' + (monthlyProjection / 1000).toFixed(0) + 'k'} accent={monthlyProjection > data.monthlyBudget ? DANGER : OK} sub={'vs. presupuesto $' + (data.monthlyBudget / 1000).toFixed(0) + 'k'} />
      </div>

      <Panel eyebrow="CFE GDMTH · BANDAS HORARIAS" title="Perfil de Tarifa · 24h" accent={SOLAR} style={{ marginBottom: 16 }}>
        <TariffStrip bands={bands} currentHour={now.getHours()} />
      </Panel>

      <div className="r-grid r-row-2-flip">
        <Panel eyebrow="BREAKDOWN" title="Costo por Tier (kWh acumulado)" accent={VOLT}>
          <TierDonut data={data} rows={tierRows} />
        </Panel>
        <Panel eyebrow="RANKING" title="Zonas Ordenadas por Costo Actual" accent={SOLAR}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ZONA</th>
                <th style={styles.thR}>DEMANDA</th>
                <th style={styles.thR}>TARIFA</th>
                <th style={styles.thR}>COSTO/H</th>
              </tr>
            </thead>
            <tbody>
              {rankedZones.map(z => (
                <tr key={z.id}>
                  <td style={styles.td}>{z.name}</td>
                  <td style={styles.tdR}>{z.kw.toFixed(1)} kW</td>
                  <td style={styles.tdR}>
                    <span style={{ color: currentBand.color, fontWeight: 700 }}>${currentBand.rate.toFixed(2)}</span>
                  </td>
                  <td style={styles.tdR}>
                    <span style={{ color: SOLAR, fontWeight: 700 }}>${z.costRate.toFixed(0)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel eyebrow="HISTÓRICO" title="Consumo Diario · Últimos 30 Días" accent={PLASMA} style={{ marginTop: 16 }}>
        <MonthBars data={data} />
      </Panel>
    </>
  );
}

function getNextBandChange(hour) {
  // Bandas: 0-6 Base, 6-18 Intermedia, 18-22 Punta, 22-24 Intermedia
  const bounds = [0, 6, 18, 22, 24];
  const nextB = bounds.find(b => b > hour);
  const hours = Math.floor(nextB - hour);
  const minutes = Math.floor(((nextB - hour) - hours) * 60);
  const nextBand = tariffAt(nextB + 0.01);
  return { hours, minutes, band: nextBand.band, color: nextBand.color };
}

function CurrentBandCard({ band, next }) {
  return (
    <div className="glass" style={{ ...styles.metricCard, borderColor: band.color + '55' }}>
      <div style={{ ...styles.metricLabel, color: band.color }}>BANDA ACTUAL</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
        <div style={{ ...styles.metricValue, color: band.color }}>{band.band.toUpperCase()}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: TEXT_DIM }}>${band.rate.toFixed(2)}</div>
      </div>
      <div style={styles.metricSub}>
        Próxima: <span style={{ color: next.color, fontWeight: 700 }}>{next.band}</span> en {next.hours}h {next.minutes}m
      </div>
    </div>
  );
}

function BigMetric({ label, value, accent, sub }) {
  return (
    <div className="glass" style={{ ...styles.metricCard, borderColor: accent + '55' }}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{ ...styles.metricValue, color: accent, marginTop: 4 }}>{value}</div>
      <div style={styles.metricSub}>{sub}</div>
    </div>
  );
}

function TariffStrip({ bands, currentHour }) {
  return (
    <div className="r-hscroll">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(22px,1fr))', gap: 3, height: 80 }}>
        {bands.map((b, i) => (
          <div key={i} style={{
            background: b.color,
            borderRadius: 4,
            opacity: i === currentHour ? 1 : 0.45,
            height: i === currentHour ? '100%' : '72%',
            marginTop: i === currentHour ? 0 : 'auto',
            position: 'relative',
            boxShadow: i === currentHour ? '0 0 20px ' + b.color : 'none',
            transition: 'all 0.4s',
          }}>
            {i === currentHour && (
              <span style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                width: 8, height: 8, borderRadius: 4, background: 'white', boxShadow: '0 0 8px white',
                animation: 'pulseGlow 1.4s infinite',
              }} />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(22px,1fr))', gap: 3, marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.04em' }}>
        {bands.map((b, i) => (
          <div key={i} style={{
            textAlign: 'center',
            color: i === currentHour ? b.color : TEXT_MUTED,
            fontWeight: i === currentHour ? 700 : 500,
          }}>{String(i).padStart(2, '0')}</div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8, padding: '16px 6px 0', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 14 }}>
        {[
          { color: '#10B981', label: 'BASE', hours: '00:00 — 06:00', rate: 1.12, desc: 'Nocturna · más barata' },
          { color: '#eab308', label: 'INTERMEDIA', hours: '06:00 — 18:00 · 22:00 — 24:00', rate: 2.10, desc: 'Operativa diurna' },
          { color: '#ef4444', label: 'PUNTA', hours: '18:00 — 22:00', rate: 3.85, desc: 'Hora pico · 3.4× base' },
        ].map(l => (
          <div key={l.label} style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: l.color, boxShadow: '0 0 8px ' + l.color }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: l.color, letterSpacing: '0.16em' }}>{l.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TEXT, fontWeight: 700 }}>${l.rate.toFixed(2)}/kWh</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.08em' }}>{l.hours}</div>
            <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{l.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierDonut({ data, rows }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const colors = { HVAC: VOLT, 'Eléctrico': SOLAR, Cargas: PLASMA, 'Crítica': DANGER };

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: rows.map(([t]) => t),
        datasets: [{
          data: rows.map(([, v]) => v),
          backgroundColor: rows.map(([t]) => colors[t] || VOLT),
          borderColor: '#070A15',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)', borderColor: VOLT + '55', borderWidth: 1,
            titleColor: TEXT, bodyColor: TEXT_DIM, padding: 10, cornerRadius: 8,
            callbacks: { label: c => '$' + c.parsed.toFixed(2) },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data.tick, rows.length]);

  const total = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="r-grid r-row-2-balanced" style={{ alignItems: 'center' }}>
      <div style={{ position: 'relative', height: 220 }}>
        <canvas ref={ref} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 22, fontWeight: 700, color: SOLAR, textShadow: '0 0 16px ' + SOLAR + '88' }}>${total.toFixed(0)}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.24em', marginTop: 2 }}>MXN/HORA</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(([tier, value]) => {
          const pct = (value / total) * 100;
          const c = colors[tier] || VOLT;
          return (
            <div key={tier}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c, boxShadow: '0 0 8px ' + c }} />
                  <span style={{ color: TEXT_DIM }}>{tier}</span>
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT, fontWeight: 700 }}>${value.toFixed(2)} · {pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: c, boxShadow: '0 0 6px ' + c }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthBars({ data }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, PLASMA + 'CC');
    grad.addColorStop(1, PLASMA + '10');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.month.map(m => 'D' + m.day),
        datasets: [{
          label: 'kWh',
          data: data.month.map(m => m.kwh),
          backgroundColor: grad,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)', borderColor: PLASMA + '55', borderWidth: 1,
            titleColor: TEXT, bodyColor: TEXT_DIM, padding: 10, cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, maxTicksLimit: 12 } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, callback: v => (v / 1000).toFixed(0) + 'k' } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data.tick]);

  return <div style={{ height: 240 }}><canvas ref={ref} /></div>;
}

const styles = {
  metricCard: {
    padding: '16px 18px',
    display: 'flex', flexDirection: 'column', gap: 4,
    minHeight: 110,
  },
  metricLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9, letterSpacing: '0.28em',
    color: TEXT_MUTED, textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 28, fontWeight: 700,
    letterSpacing: '0.02em', lineHeight: 1.1,
    textShadow: '0 0 14px currentColor',
  },
  metricSub: {
    fontSize: 11, color: TEXT_DIM, marginTop: 6,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
    color: TEXT_MUTED, letterSpacing: '0.22em', textAlign: 'left',
    padding: '8px 10px', borderBottom: '1px solid ' + BORDER,
  },
  thR: {
    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
    color: TEXT_MUTED, letterSpacing: '0.22em', textAlign: 'right',
    padding: '8px 10px', borderBottom: '1px solid ' + BORDER,
  },
  td: { padding: '8px 10px', color: TEXT, borderBottom: '1px dashed rgba(0,240,255,0.06)' },
  tdR: { padding: '8px 10px', color: TEXT_DIM, textAlign: 'right', borderBottom: '1px dashed rgba(0,240,255,0.06)', fontFamily: "'JetBrains Mono', monospace" },
};
