/**
 * api/router.js — Vercel EDGE Function (no Node serverless).
 *
 * Edge runtime: cold start <50ms, geo-distributed, mucho más rápido que
 * Node serverless functions (~200-500ms cold). Limitación: no se puede
 * usar el API de Node (fs, etc.) — pero nuestros mocks son puro JS.
 *
 * Convierte la salida pure de tryHandle a un Web Response.
 */

import { tryHandle } from '../src/mocks/handler.js';

export const config = {
  runtime: 'edge',
};

export default function handler(req) {
  /* En Edge Runtime req.url es URL ABSOLUTA con host (https://...). Además
     Vercel agrega ?path=... cuando la rewrite usa :path*. Extraemos pathname
     y reconstruimos la URL relativa preservando la query original (sin el
     ?path= sintético que agrega el rewrite). */
  var parsed = new URL(req.url);
  var pathname = parsed.pathname;
  /* Filtrar query params sintéticos del rewrite (path, any) y conservar el resto */
  var sp = new URLSearchParams(parsed.search);
  sp.delete('path');
  sp.delete('any');
  var queryStr = sp.toString();
  var rel = pathname + (queryStr ? '?' + queryStr : '');

  var result = tryHandle({ method: req.method, url: rel });
  if (result === null) {
    return new Response(JSON.stringify({ error: 'mock route not found', url: rel }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  /* Cache hints separados para CDN (Vercel) y browser.
     Vercel-CDN-Cache-Control fuerza cache en el edge incluso para Edge
     Functions con query string. Browser cachea 2s, CDN edge 30s. */
  var headers = Object.assign({}, result.headers, {
    'cache-control': 'public, max-age=2, stale-while-revalidate=30',
    'vercel-cdn-cache-control': 'public, s-maxage=30, stale-while-revalidate=300',
    'cdn-cache-control': 'public, s-maxage=30',
    'access-control-allow-origin': '*',
  });
  return new Response(result.body, {
    status: result.status,
    headers: headers,
  });
}
