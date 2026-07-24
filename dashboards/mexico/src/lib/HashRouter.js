import { useEffect, useState } from 'react';

/**
 * HashRouter — router casero por window.location.hash.
 *
 * Rutas soportadas en la demo:
 *   '#/'       → Home (mapa central)
 *   '#/MX60'   → MX60/HOME
 *   '#/MX0A'   → MX0A/HOME
 *
 * Por qué hash y no history API: cero config en Vercel/static hosting,
 * no necesita rewrites, funciona file:// (útil para demos offline).
 */

function readPath() {
  var raw = window.location.hash || '#/';
  var path = raw.replace(/^#/, '');
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}

export function navigate(path) {
  if (!path.startsWith('/')) path = '/' + path;
  if (window.location.hash !== '#' + path) {
    window.location.hash = path;
  }
}

export function useHashRoute() {
  var [path, setPath] = useState(readPath);

  useEffect(function () {
    function onHashChange() {
      setPath(readPath());
    }
    window.addEventListener('hashchange', onHashChange);
    return function () {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  return path;
}
