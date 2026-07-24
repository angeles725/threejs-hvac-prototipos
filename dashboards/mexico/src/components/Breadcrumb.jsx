import { FONTS } from '../theme';
import { navigate } from '../lib/HashRouter';
import { useTheme } from '../lib/ThemeStore';

/**
 * Breadcrumb fijo arriba para vistas internas (MX60/HOME, MX0A/HOME).
 * Incluye theme toggle al lado derecho para mantenerlo accesible en
 * toda la app (no solo en el Home).
 */
export default function Breadcrumb({ siteCode, page }) {
  var [theme, toggleTheme] = useTheme();

  return (
    <div className="bc-bar">
      <div className="bc-inner">
        <button
          type="button"
          onClick={function () {
            navigate('/');
          }}
          style={styles.backBtn}
          aria-label="Volver al Home"
          title="Volver al mapa central"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 4L6 8l4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="bc-back-label">HOME</span>
        </button>

        <span style={styles.sep}>/</span>

        <span className="bc-site" style={styles.site}>{siteCode}</span>

        <span style={styles.sep}>/</span>

        <span className="bc-page" style={styles.page}>{page.toUpperCase()}</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="theme-toggle"
            aria-label="Cambiar tema claro/oscuro"
            title={'Cambiar tema (actual: ' + theme + ')'}
            onClick={toggleTheme}
          >
            <svg
              className="theme-icon-sun"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="1" x2="12" y2="4" />
                <line x1="12" y1="20" x2="12" y2="23" />
                <line x1="1" y1="12" x2="4" y2="12" />
                <line x1="20" y1="12" x2="23" y2="12" />
                <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
                <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
                <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
                <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
              </g>
            </svg>
            <svg
              className="theme-icon-moon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

var styles = {
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--accent)',
    padding: '6px 12px',
    borderRadius: 6,
    fontFamily: FONTS.display,
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'background 150ms ease, border-color 150ms ease',
  },
  sep: {
    color: 'var(--text-muted)',
    opacity: 0.5,
  },
  site: {
    color: 'var(--text-secondary)',
    fontWeight: 700,
  },
  page: {
    color: 'var(--text-primary)',
    fontWeight: 800,
  },
  badge: {
    fontFamily: FONTS.mono,
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--warning)',
    background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
    border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)',
    padding: '4px 10px',
    borderRadius: 100,
  },
};
