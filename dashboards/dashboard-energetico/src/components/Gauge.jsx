import React from 'react';
import { TEXT, TEXT_DIM, TEXT_MUTED, OK, WARN, DANGER } from '../theme.js';

// Arc-gauge circular (270°) con banda nominal opcional.
// props: value, min, max, unit, label, size, nominalMin, nominalMax, color
export default function Gauge({
  value = 0, min = 0, max = 100, unit = '', label = '', size = 150,
  nominalMin, nominalMax, color,
}) {
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));

  let tone = OK;
  if (nominalMin != null && nominalMax != null) {
    if (value < nominalMin || value > nominalMax) {
      const overshoot = value > nominalMax ? (value - nominalMax) : (nominalMin - value);
      const headroom = (nominalMax - nominalMin) * 0.15 || 1;
      tone = overshoot > headroom ? DANGER : WARN;
    }
  }
  const accent = color || tone;

  const r = (size - 22) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const START = -225; // degrees
  const SWEEP = 270;

  function deg2rad(d) { return (d * Math.PI) / 180; }
  function arcPath(startDeg, endDeg) {
    const a0 = deg2rad(startDeg);
    const a1 = deg2rad(endDeg);
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  }

  const endDeg = START + SWEEP * norm;

  // nominal band (if provided) en coords del arco
  let bandStartDeg, bandEndDeg;
  if (nominalMin != null && nominalMax != null) {
    const b0 = (nominalMin - min) / (max - min);
    const b1 = (nominalMax - min) / (max - min);
    bandStartDeg = START + SWEEP * b0;
    bandEndDeg = START + SWEEP * b1;
  }

  // Tick marks
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const tDeg = START + (SWEEP * i) / 10;
    const rad = deg2rad(tDeg);
    const rOuter = r;
    const rInner = r - (i % 5 === 0 ? 8 : 4);
    return (
      <line
        key={i}
        x1={cx + rInner * Math.cos(rad)}
        y1={cy + rInner * Math.sin(rad)}
        x2={cx + rOuter * Math.cos(rad)}
        y2={cy + rOuter * Math.sin(rad)}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={i % 5 === 0 ? 2 : 1}
      />
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={`g-${label}-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={accent} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* track */}
        <path d={arcPath(START, START + SWEEP)} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" strokeLinecap="round" />
        {/* nominal band */}
        {bandStartDeg != null && (
          <path
            d={arcPath(bandStartDeg, bandEndDeg)}
            stroke="rgba(16,185,129,0.25)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="butt"
          />
        )}
        {/* ticks */}
        {ticks}
        {/* value arc */}
        <path
          d={arcPath(START, endDeg)}
          stroke={`url(#g-${label}-${size})`}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${accent})`, transition: 'all 0.6s' }}
        />
        {/* needle dot */}
        <circle cx={cx} cy={cy} r="3.5" fill={accent} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
      </svg>
      <div style={{ textAlign: 'center', marginTop: -size * 0.32, pointerEvents: 'none' }}>
        <div style={{
          fontFamily: "'Syncopate', sans-serif",
          fontSize: size * 0.17,
          fontWeight: 700,
          color: accent,
          textShadow: `0 0 12px ${accent}66`,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {typeof value === 'number' ? value.toFixed(Math.abs(value) < 10 ? 2 : 1) : value}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: TEXT_MUTED,
          letterSpacing: '0.22em',
          marginTop: 2,
          textTransform: 'uppercase',
        }}>{unit}</div>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: TEXT_DIM,
        letterSpacing: '0.18em',
        marginTop: size * 0.16,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>{label}</div>
    </div>
  );
}
