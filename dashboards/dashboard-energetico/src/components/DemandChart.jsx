import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Panel from './Panel.jsx';
import { curveAt, tariffAt } from '../hooks/useEnergySimulation.js';
import { VOLT, SOLAR, TEXT, TEXT_DIM, TEXT_MUTED } from '../theme.js';

// Smooth pseudo random — misma forma que en el hook
function n(t, s) {
  return (Math.sin(t * 0.017 + s) + Math.sin(t * 0.043 + s * 1.7) + Math.sin(t * 0.091 + s * 2.3)) / 3;
}

function pad2(v) { return String(v).padStart(2, '0'); }

function buildData(period, tick, daily, now) {
  switch (period) {
    case '1h': {
      // 60 muestras (1 por minuto) hacia atrás desde ahora
      const points = 60;
      const labels = [];
      const kwh = [];
      const cost = [];
      for (let i = 0; i < points; i++) {
        const minutesAgo = points - 1 - i;
        const when = new Date(now.getTime() - minutesAgo * 60_000);
        const hh = when.getHours() + when.getMinutes() / 60;
        const baseKW = curveAt(hh) * 900;
        const wobble = 1 + n(i * 3 + tick * 0.6, 7) * 0.18;
        const kw = baseKW * wobble;
        const kwhMin = kw / 60; // 1 minuto de energía
        const rate = tariffAt(hh).rate;
        labels.push(pad2(when.getHours()) + ':' + pad2(when.getMinutes()));
        kwh.push(kwhMin);
        cost.push(kwhMin * rate);
      }
      return { labels, kwh, cost, demandLabel: 'Consumo (kWh/min)', costLabel: 'Costo (MXN/min)' };
    }
    case '8h': {
      // 48 muestras (cada 10 min) hacia atrás
      const points = 48;
      const stepMin = 10;
      const labels = [];
      const kwh = [];
      const cost = [];
      for (let i = 0; i < points; i++) {
        const minutesAgo = (points - 1 - i) * stepMin;
        const when = new Date(now.getTime() - minutesAgo * 60_000);
        const hh = when.getHours() + when.getMinutes() / 60;
        const baseKW = curveAt(hh) * 900;
        const wobble = 1 + n(i * 5 + tick * 0.4, 23) * 0.12;
        const kw = baseKW * wobble;
        const kwhSlot = kw * (stepMin / 60); // energía del intervalo
        const rate = tariffAt(hh).rate;
        labels.push(pad2(when.getHours()) + ':' + pad2(when.getMinutes()));
        kwh.push(kwhSlot);
        cost.push(kwhSlot * rate);
      }
      return { labels, kwh, cost, demandLabel: 'Consumo (kWh / 10 min)', costLabel: 'Costo (MXN / 10 min)' };
    }
    case 'week': {
      const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const today = (now.getDay() + 6) % 7; // 0 = Lun
      const kwh = labels.map((_, i) => {
        const weekend = i >= 5;
        const isToday = i === today;
        const base = weekend ? 9800 : 17200;
        const wobble = 1 + n(i * 9 + tick * 0.6, 7) * 0.06;
        const todayFactor = isToday ? (now.getHours() / 24) : 1;
        return base * wobble * todayFactor;
      });
      return { labels, kwh, cost: kwh.map(k => k * 2.35), demandLabel: 'Consumo diario (kWh)', costLabel: 'Costo diario (MXN)' };
    }
    case 'month': {
      const daysInMonth = 30;
      const today = now.getDate();
      const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const kwh = labels.map((_, i) => {
        const d = i + 1;
        if (d > today) return 0;
        const dow = (now.getDay() - (today - d) + 7) % 7;
        const weekend = dow === 0 || dow === 6;
        const base = weekend ? 9800 : 17200;
        const wobble = 1 + n(i * 11 + tick * 0.35, 13) * 0.08;
        return base * wobble;
      });
      return { labels, kwh, cost: kwh.map(k => k * 2.35), demandLabel: 'Consumo diario (kWh)', costLabel: 'Costo diario (MXN)' };
    }
    case 'year': {
      const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      // Estacionalidad: verano caliente -> HVAC alto
      const season = [0, 0, 0.05, 0.15, 0.35, 0.55, 0.65, 0.60, 0.40, 0.15, 0.02, 0];
      const thisMonth = now.getMonth();
      const kwh = labels.map((_, i) => {
        if (i > thisMonth) return 0;
        const base = 385000 * (1 + season[i]);
        const wobble = 1 + n(i * 13 + tick * 0.2, 19) * 0.04;
        const partial = i === thisMonth ? (now.getDate() / 30) : 1;
        return base * wobble * partial;
      });
      return { labels, kwh, cost: kwh.map(k => k * 2.35), demandLabel: 'Consumo mensual (kWh)', costLabel: 'Costo mensual (MXN)' };
    }
    case 'day':
    default: {
      const labels = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0') + ':00');
      return {
        labels,
        kwh: daily.map(d => d.kwh),
        cost: daily.map(d => d.cost),
        demandLabel: 'Consumo (kWh)',
        costLabel: 'Costo (MXN)',
      };
    }
  }
}

const PERIODS = [
  { id: '1h', label: '1h' },
  { id: '8h', label: '8h' },
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];

const EYEBROWS = {
  '1h': 'ÚLTIMA HORA · RESOLUCIÓN POR MINUTO',
  '8h': 'ÚLTIMAS 8 HORAS · INTERVALOS DE 10 MIN',
  day: '24 HORAS · RESOLUCIÓN HORARIA',
  week: '7 DÍAS · AGREGACIÓN DIARIA',
  month: '30 DÍAS · AGREGACIÓN DIARIA',
  year: '12 MESES · AGREGACIÓN MENSUAL',
};

export default function DemandChart({ data }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  const [period, setPeriod] = useState('day');

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');

    const pd = buildData(period, data.tick, data.daily, data.now);

    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0, VOLT + 'CC');
    grad.addColorStop(1, VOLT + '10');

    const grad2 = ctx.createLinearGradient(0, 0, 0, 280);
    grad2.addColorStop(0, SOLAR + 'CC');
    grad2.addColorStop(1, SOLAR + '10');

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: pd.labels,
        datasets: [
          {
            label: pd.demandLabel,
            data: pd.kwh,
            backgroundColor: grad,
            borderColor: VOLT,
            borderWidth: 0,
            borderRadius: 4,
            yAxisID: 'y',
            order: 2,
          },
          {
            label: pd.costLabel,
            data: pd.cost,
            type: 'line',
            borderColor: SOLAR,
            backgroundColor: grad2,
            fill: true,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: SOLAR,
            borderWidth: 2.2,
            yAxisID: 'y1',
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutCubic' },
        animations: {
          y: { duration: 700, easing: 'easeOutCubic' },
          numbers: { duration: 700 },
        },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: TEXT_DIM,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              font: { size: 11, family: "'Space Grotesk'" },
              boxWidth: 8,
              boxHeight: 8,
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)',
            borderColor: VOLT + '55',
            borderWidth: 1,
            titleColor: TEXT,
            bodyColor: TEXT_DIM,
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: "'JetBrains Mono'", size: 10, weight: 700 },
            bodyFont: { family: "'Space Grotesk'", size: 12 },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: TEXT_MUTED,
              font: { size: 9, family: "'JetBrains Mono'" },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
            },
          },
          y: {
            position: 'left',
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: TEXT_MUTED,
              font: { size: 9, family: "'JetBrains Mono'" },
              callback: v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0),
            },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            ticks: {
              color: SOLAR + '99',
              font: { size: 9, family: "'JetBrains Mono'" },
              callback: v => v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + v.toFixed(0),
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [period]);

  useEffect(() => {
    if (!chartRef.current) return;
    const pd = buildData(period, data.tick, data.daily, data.now);
    chartRef.current.data.labels = pd.labels;
    chartRef.current.data.datasets[0].data = pd.kwh;
    chartRef.current.data.datasets[0].label = pd.demandLabel;
    chartRef.current.data.datasets[1].data = pd.cost;
    chartRef.current.data.datasets[1].label = pd.costLabel;
    chartRef.current.update('active');
  }, [data.tick, period]);

  return (
    <Panel
      eyebrow={EYEBROWS[period]}
      title="Perfil de Demanda & Costo"
      accent={VOLT}
      style={{ height: 360 }}
      actions={
        <div style={chipStyles.wrap}>
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                ...chipStyles.chip,
                ...(period === p.id ? chipStyles.active : null),
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      <div style={{ position: 'absolute', inset: '6px 18px 18px', height: 'calc(100% - 24px)' }}>
        <canvas ref={ref} />
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
    background: 'linear-gradient(135deg, ' + VOLT + ', #7df9ff)',
    color: '#070A15',
  },
};
