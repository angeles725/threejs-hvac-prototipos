import { useEffect, useRef, useState } from 'react';
import { FONTS } from '../theme';
import { useTheme } from '../lib/ThemeStore';

/**
 * SiteIframe — embebe un UX Niagara como página completa.
 *
 * Características:
 *   - Loading state hasta onLoad.
 *   - Sync de theme: cuando el wrapper hace toggle, propaga `data-theme`
 *     al documento del iframe (mismo origin → acceso directo permitido).
 *   - Sincroniza localStorage del UX con la key remota antes del FOUC.
 */
export default function SiteIframe({ src, title, themeStorageKey }) {
  var iframeRef = useRef(null);
  var [loaded, setLoaded] = useState(false);
  var [theme] = useTheme();

  /* Propagar theme al iframe cada vez que cambia o cuando termina de cargar */
  useEffect(
    function () {
      var iframe = iframeRef.current;
      if (!iframe || !loaded) return;

      try {
        var doc = iframe.contentDocument;
        if (!doc) return;
        doc.documentElement.setAttribute('data-theme', theme);

        /* Si el UX tiene su propio storage key, sincronizamos para que un
           refresh o navegación interna no revierta al theme cacheado. */
        if (themeStorageKey) {
          try {
            iframe.contentWindow.localStorage.setItem(themeStorageKey, theme);
          } catch (e) {
            /* iframe sandboxed o cross-origin → ignorar */
          }
        }

        /* Dispatch interno: si el UX tiene un listener custom, dejá que
           reaccione (ej: Charts repintar). Si no escucha, no rompe nada. */
        try {
          iframe.contentWindow.dispatchEvent(
            new CustomEvent('niagara-theme-change', { detail: { theme: theme } }),
          );
        } catch (e) {
          /* ignore */
        }
      } catch (e) {
        /* cross-origin → no debería pasar en local */
      }
    },
    [theme, loaded, themeStorageKey],
  );

  return (
    <div className="site-iframe-wrap" style={styles.wrap}>
      {!loaded ? (
        <div style={styles.loader}>
          <div style={styles.spinner} />
          <div style={styles.loaderText}>Cargando dashboard…</div>
          <div style={styles.loaderSub}>
            Inicializando subsistemas y suscripciones a equipos.
          </div>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        style={Object.assign({}, styles.iframe, { opacity: loaded ? 1 : 0 })}
        onLoad={function () {
          setLoaded(true);
        }}
        /* Permitimos same-origin (es local mismo host) — necesario para
           tocar data-theme y localStorage del iframe. */
      />
    </div>
  );
}

var styles = {
  wrap: {
    /* height + position responsivos via .site-iframe-wrap en index.css */
    background: 'var(--bg)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    transition: 'opacity 220ms ease',
    display: 'block',
  },
  loader: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
    background: 'var(--bg)',
    zIndex: 5,
    fontFamily: FONTS.body,
    textAlign: 'center',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 800ms linear infinite',
  },
  loaderText: {
    fontFamily: FONTS.display,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  loaderSub: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    maxWidth: 380,
    lineHeight: 1.5,
  },
};
