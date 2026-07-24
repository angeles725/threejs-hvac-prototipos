import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { TreePine, Car, Factory, Droplets, Flame } from 'lucide-react';
import Panel from '../components/Panel.jsx';
import IsoSustainability from '../components/IsoSustainability.jsx';
import { VOLT, SOLAR, PLASMA, OK, WARN, DANGER, COOL, TEXT, TEXT_DIM, TEXT_MUTED, BORDER } from '../theme.js';

export default function Sostenibilidad({ data }) {
  // Equivalencias: 1 kg CO2 ≈ 22.7 km auto, 1 árbol absorbe ~21 kg CO2/año
  const co2_month = data.co2Today * data.now.getDate();
  const co2_year = co2_month * 12;
  const kmEquiv = co2_month * 22.7;
  const treesEquiv = co2_month / 21;
  const flightsEquiv = co2_month / 90; // 90 kg CO2 / vuelo corto

  const selfConsumption = Math.min(100, (data.solarKW / Math.max(data.totalKW, 1)) * 100);
  const renewableShare = data.solarKWHToday / Math.max(1, data.totalKWHToday + data.solarKWHToday);

  return (
    <>
      <div className="r-grid r-row-2-soft" style={{ marginBottom: 16 }}>
        <Panel eyebrow="CONTADOR DEL MES" title="Huella de Carbono" accent={OK} style={{ minHeight: 200 }}>
          <div style={styles.co2Hero}>
            <div>
              <div style={styles.co2Label}>EMISIONES · ABRIL 2026</div>
              <div style={styles.co2Value}>{(co2_month / 1000).toFixed(2)}<span style={styles.co2Unit}>tCO₂e</span></div>
              <div style={styles.co2Sub}>Hoy: {data.co2Today.toFixed(0)} kg · Acumulado Ene–Hoy: {(co2_year / 12 * data.now.getMonth() / 1000).toFixed(1)} t</div>
            </div>
            <div style={styles.progressWrap}>
              <ProgressBar label="Meta 2026" value={75} max={120} color={OK} unit="tCO₂e" />
              <ProgressBar label="Baseline 2025" value={102} max={120} color={TEXT_MUTED} unit="tCO₂e" />
            </div>
          </div>
        </Panel>

        <Panel eyebrow="EQUIVALENCIAS · MES" title="Impacto Traducido" accent={SOLAR} style={{ minHeight: 200 }}>
          <div style={styles.equivGrid}>
            <EquivCard icon={Car} value={Math.round(kmEquiv).toLocaleString()} unit="km auto" color={SOLAR} desc="emisiones equivalentes" />
            <EquivCard icon={TreePine} value={Math.round(treesEquiv).toLocaleString()} unit="árboles" color={OK} desc="para compensar 1 año" />
            <EquivCard icon={Factory} value={Math.round(flightsEquiv)} unit="vuelos corto" color={PLASMA} desc="CDMX-MTY equivalentes" />
            <EquivCard icon={Flame} value={(co2_month / 2.3).toFixed(0)} unit="L diésel" color={DANGER} desc="quemados equivalentes" />
          </div>
        </Panel>
      </div>

      <div style={{ marginBottom: 16 }}>
        <IsoSustainability data={data} />
      </div>

      <div className="r-grid r-row-2" style={{ marginBottom: 16 }}>
        <Panel eyebrow="PRODUCCIÓN SOLAR · HOY" title="Curva Fotovoltaica" accent={PLASMA}>
          <SolarCurve data={data} />
        </Panel>
        <Panel eyebrow="MIX ENERGÉTICO" title="Red vs. Renovable" accent={OK}>
          <RenewableMix data={data} renewableShare={renewableShare} />
        </Panel>
      </div>

      <div className="r-grid r-cols-4">
        <MetricCard label="AUTOCONSUMO SOLAR" value={selfConsumption.toFixed(1)} unit="%" accent={PLASMA} sub="del consumo total actual" />
        <MetricCard label="INTENSIDAD ENERGÉTICA" value={(data.totalKWHToday / 8500).toFixed(2)} unit="kWh/m²" accent={VOLT} sub="Superficie 8,500 m²" />
        <MetricCard label="AGUA · DEMANDA" value={data.waterFlow.toFixed(1)} unit="L/min" accent={COOL} sub="Sistema sanitario + torres" />
        <MetricCard label="GAS NATURAL" value={data.gasFlow.toFixed(1)} unit="m³/h" accent={SOLAR} sub="Cocina + respaldo térmico" />
      </div>
    </>
  );
}

function ProgressBar({ label, value, max, color, unit }) {
  const pct = (value / max) * 100;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.18em', color: TEXT_MUTED }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color, fontWeight: 700 }}>{value} {unit}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, boxShadow: '0 0 8px ' + color, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function EquivCard({ icon: Icon, value, unit, color, desc }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(10,14,32,0.5)', border: '1px solid ' + BORDER }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Icon size={16} color={color} strokeWidth={2} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.22em', color: TEXT_MUTED, textTransform: 'uppercase' }}>{desc}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: "'Syncopate', sans-serif", fontSize: 22, fontWeight: 700, color, letterSpacing: '0.02em', textShadow: `0 0 12px ${color}88` }}>{value}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: TEXT_DIM, letterSpacing: '0.1em' }}>{unit}</span>
      </div>
    </div>
  );
}

function SolarCurve({ data }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();

    const grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, PLASMA + 'BB');
    grad.addColorStop(1, PLASMA + '10');

    const hourNow = data.now.getHours();

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')),
        datasets: [
          {
            label: 'Generación (kW)',
            data: data.solarDaily,
            borderColor: PLASMA,
            backgroundColor: grad,
            fill: true,
            tension: 0.45,
            pointRadius: (_, ctx) => ctx.dataIndex === hourNow ? 6 : 0,
            pointBackgroundColor: PLASMA,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2.4,
          },
        ],
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
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: TEXT_MUTED, font: { size: 9, family: "'JetBrains Mono'" }, callback: v => v + ' kW' } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data.tick]);

  const peak = Math.max(...data.solarDaily);

  return (
    <div>
      <div style={{ height: 200 }}><canvas ref={ref} /></div>
      <div className="r-grid r-cols-4" style={{ gap: 8, marginTop: 12 }}>
        <MiniStat label="ACTUAL" value={data.solarKW.toFixed(0) + ' kW'} color={PLASMA} />
        <MiniStat label="PICO HOY" value={peak.toFixed(0) + ' kW'} color={SOLAR} />
        <MiniStat label="YIELD" value={data.solarKWHToday.toFixed(0) + ' kWh'} color={OK} />
        <MiniStat label="CAPACIDAD" value="240 kWp" color={TEXT_MUTED} />
      </div>
    </div>
  );
}

function RenewableMix({ data, renewableShare }) {
  const ref = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    const fromGrid = Math.max(0, data.totalKW - data.solarKW);
    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Red CFE', 'Solar PV', 'Batería'],
        datasets: [{
          data: [fromGrid, data.solarKW, 8],
          backgroundColor: [DANGER, PLASMA, OK],
          borderColor: '#070A15', borderWidth: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        animation: { duration: 700 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(7,10,21,0.95)', borderColor: PLASMA + '55', borderWidth: 1,
            titleColor: TEXT, bodyColor: TEXT_DIM, padding: 10, cornerRadius: 8,
            callbacks: { label: c => c.parsed.toFixed(1) + ' kW' },
          },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data.tick]);

  const fromGrid = Math.max(0, data.totalKW - data.solarKW);
  const total = fromGrid + data.solarKW + 8;

  return (
    <div className="r-grid r-row-2-balanced" style={{ alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', height: 220 }}>
        <canvas ref={ref} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 22, fontWeight: 700, color: OK, textShadow: '0 0 14px ' + OK + '88' }}>{(renewableShare * 100).toFixed(0)}%</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.22em', marginTop: 2 }}>RENOVABLE</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MixRow color={DANGER} label="Red CFE" value={fromGrid.toFixed(1) + ' kW'} pct={(fromGrid / total) * 100} />
        <MixRow color={PLASMA} label="Solar PV" value={data.solarKW.toFixed(1) + ' kW'} pct={(data.solarKW / total) * 100} />
        <MixRow color={OK} label="Batería (desc.)" value="8.0 kW" pct={(8 / total) * 100} />
      </div>
    </div>
  );
}

function MixRow({ color, label, value, pct }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, boxShadow: '0 0 8px ' + color }} />
          <span style={{ color: TEXT_DIM }}>{label}</span>
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: TEXT, fontWeight: 700 }}>{value} · {pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, boxShadow: '0 0 6px ' + color }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 7, background: 'rgba(10,14,32,0.6)', border: '1px solid ' + BORDER }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.2em', color: TEXT_MUTED }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color, fontWeight: 700, marginTop: 2, letterSpacing: 0.3 }}>{value}</div>
    </div>
  );
}

function MetricCard({ label, value, unit, accent, sub }) {
  return (
    <div className="glass" style={{ padding: '14px 16px', minHeight: 110 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.28em', color: TEXT_MUTED, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span style={{ fontFamily: "'Syncopate', sans-serif", fontSize: 26, fontWeight: 700, color: accent, textShadow: `0 0 14px ${accent}88`, letterSpacing: '0.02em' }}>{value}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TEXT_DIM, letterSpacing: '0.1em' }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

const styles = {
  co2Hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
  },
  co2Label: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 10,
    letterSpacing: '0.28em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  co2Value: {
    fontFamily: "'Syncopate', sans-serif",
    fontSize: 44,
    fontWeight: 700,
    color: OK,
    textShadow: '0 0 22px ' + OK + '66',
    lineHeight: 1.1,
    marginTop: 4,
    letterSpacing: '0.02em',
  },
  co2Unit: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: TEXT_DIM, marginLeft: 6, letterSpacing: '0.1em' },
  co2Sub: { fontSize: 11, color: TEXT_DIM, marginTop: 6 },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, flex: 1 },
  equivGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
};
