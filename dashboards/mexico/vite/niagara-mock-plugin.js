/**
 * niagara-mock-plugin.js — Vite plugin (dev + preview).
 *
 * Convierte el resultado pure de tryHandle a la API Node http
 * (res.statusCode/setHeader/end) que usa Vite middleware.
 */

import { tryHandle } from '../src/mocks/handler.js';

function handle(req, res, next) {
  var url = req.url.split('?')[0];

  /* Rewriting de paths del UX vendoreado. El index.html de sanluis-ux
     declara <base href="/snls/">, lo que fuerza todas las URLs relativas
     a /snls/<x>. En prod, vercel.json hace el mismo rewrite. */
  if (url.startsWith('/snls/') && !url.startsWith('/snls/api/') && url !== '/snls/version.json') {
    req.url = '/sites/mx0a/' + req.url.slice('/snls/'.length);
    return next();
  }
  if (url.startsWith('/mx60/') && !url.startsWith('/mx60/api/') && url !== '/mx60/version.json') {
    req.url = '/sites/mx60/' + req.url.slice('/mx60/'.length);
    return next();
  }

  var result = tryHandle({ method: req.method, url: req.url });
  if (result === null) return next();

  res.statusCode = result.status;
  Object.keys(result.headers).forEach(function (k) {
    res.setHeader(k, result.headers[k]);
  });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(result.body);
}

export default function niagaraMockPlugin() {
  return {
    name: 'niagara-mock',
    configureServer: function (server) {
      server.middlewares.use(function (req, res, next) {
        handle(req, res, next);
      });
    },
    configurePreviewServer: function (server) {
      server.middlewares.use(function (req, res, next) {
        handle(req, res, next);
      });
    },
  };
}
