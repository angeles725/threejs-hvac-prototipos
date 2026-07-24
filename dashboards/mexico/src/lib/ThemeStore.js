import { useEffect, useState } from 'react';

/**
 * ThemeStore — gestión persistente de tema dark/light.
 *
 * Patrón heredado del módulo MX60 chihuahua-ux:
 *   - data-theme="dark" | "light" en <html>
 *   - localStorage key "mexico.user.theme"
 *   - FOUC prevention con script inline en index.html
 *   - El CSS usa :root[data-theme="..."] para override de tokens
 *
 * Esto permite que TODA la app (incluidos iframes que hereden el mismo
 * CSS) cambie de tema de forma sincrónica con un solo flip de atributo.
 */

var THEME_KEY = 'mexico.user.theme';

export function getTheme() {
  try {
    var t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch (e) {
    // localStorage bloqueado (modo privado, iframe sandbox) — fallback
  }
  var attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    // ignore
  }
  // Notificar a otros listeners (incluido este mismo hook en otros mounts)
  window.dispatchEvent(new CustomEvent('mexico:theme-change', { detail: { theme: theme } }));
}

export function toggleTheme() {
  var current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/**
 * Hook React: devuelve [theme, toggle] y se mantiene sincronizado
 * cuando otro componente o pestaña cambia el tema.
 */
export function useTheme() {
  var [theme, setLocal] = useState(getTheme);

  useEffect(function () {
    function onChange() {
      setLocal(getTheme());
    }
    window.addEventListener('mexico:theme-change', onChange);
    window.addEventListener('storage', function (e) {
      if (e.key === THEME_KEY) onChange();
    });
    return function () {
      window.removeEventListener('mexico:theme-change', onChange);
    };
  }, []);

  return [theme, toggleTheme];
}
