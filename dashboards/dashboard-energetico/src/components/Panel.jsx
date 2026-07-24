import React from 'react';
import { BORDER, TEXT, TEXT_DIM, TEXT_MUTED, VOLT } from '../theme.js';

export default function Panel({ title, eyebrow, actions, children, style, bodyStyle, accent = VOLT }) {
  return (
    <section className="glass" style={{ ...styles.panel, ...style }}>
      {(title || eyebrow || actions) && (
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...styles.accentBar, background: accent, boxShadow: '0 0 10px ' + accent }} />
            <div>
              {eyebrow && <div style={styles.eyebrow}>{eyebrow}</div>}
              {title && <h3 style={styles.title}>{title}</h3>}
            </div>
          </div>
          {actions && <div style={styles.actions}>{actions}</div>}
        </header>
      )}
      <div style={{ ...styles.body, ...bodyStyle }}>{children}</div>
    </section>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px 10px',
    gap: 12,
    flexShrink: 0,
  },
  accentBar: {
    width: 4,
    height: 22,
    borderRadius: 2,
  },
  eyebrow: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 9,
    letterSpacing: '0.28em',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: TEXT,
    letterSpacing: 0.2,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  body: {
    padding: '6px 18px 18px',
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
};
