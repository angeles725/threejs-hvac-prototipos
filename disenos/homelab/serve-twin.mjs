// serve-twin.mjs — one origin for the dashboard AND the twin API.
//
// Why this exists: the board fetches readings from the collector on
// 127.0.0.1:8123. Served straight through a tunnel, a visitor's browser would
// resolve 127.0.0.1 to THEIR OWN machine and get nothing. Publishing the
// collector separately would put an unauthenticated API on the internet.
// So everything is served from a single origin: static files here, and
// /api/* proxied to the collector, which never leaves this machine.
//
//   node serve-twin.mjs [--port 8080] [--api http://127.0.0.1:8123] [--dir .]
//
// Then point the tunnel at http://127.0.0.1:<port>.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

const PORT = Number(arg('port', 8080));
const API = arg('api', 'http://127.0.0.1:8123').replace(/\/$/, '');
// MJPEG relay for the AXIS camera. Same reasoning as the API: embedding
// http://127.0.0.1:8124 straight into the page would resolve to the VISITOR's
// machine through the tunnel, so the stream is proxied under this origin too.
const CAM = arg('cam', 'http://127.0.0.1:8124').replace(/\/$/, '');
const DIR = path.resolve(arg('dir', HERE));
// Read from the environment, never from a file inside the repo, so the key
// cannot be committed by accident.
const GEMINI_KEY = process.env.GEMINI_API_KEY || arg('gemini-key', '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || arg('gemini-model', 'gemini-2.0-flash');
const AI_PER_MIN = Number(arg('ai-per-min', 12));
let aiHits = [];
const WRITER = process.env.TWIN_WRITER || arg('writer', 'http://127.0.0.1:8125').replace(/\/$/, '');
const TOKEN_PATH = process.env.TWIN_WRITE_TOKEN_FILE ||
  arg('writer-token-file', '/mnt/c/Users/equipo/twin-db/.writer/writer.token');
function readWriteToken() {
  try { return fs.readFileSync(TOKEN_PATH, 'utf8').trim(); } catch { return ''; }
}
// Only these collector routes are reachable through the tunnel. The collector
// also accepts POST /recommendation; it is deliberately NOT proxied, so nothing
// reached from outside can write into the twin.
const ALLOW = new Set(['/points', '/current', '/history', '/stats', '/recommendations']);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400).end('bad request'); return; }

  // ---- API proxy -----------------------------------------------------------
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    const sub = url.pathname.replace(/^\/api/, '') || '/';
    if (req.method !== 'GET' || !ALLOW.has(sub)) {
      res.writeHead(405, { 'content-type': 'application/json' })
         .end(JSON.stringify({ error: 'not allowed', path: sub }));
      return;
    }
    const target = API + sub + (url.search || '');
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      const up = await fetch(target, { signal: ctl.signal });
      clearTimeout(t);
      const body = await up.text();
      res.writeHead(up.status, {
        'content-type': up.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      }).end(body);
    } catch (e) {
      // Say the collector is unreachable; never fabricate a reading.
      log('proxy FAIL', sub, e.message);
      res.writeHead(502, { 'content-type': 'application/json' })
         .end(JSON.stringify({ error: 'collector unreachable', detail: String(e.message || e) }));
    }
    return;
  }

  // ---- setpoint writes (LOCAL ONLY) ----------------------------------------
  // twin_writer runs on :8125 and can change real equipment. The backend was
  // explicit that it must never leave the machine, and this board is published
  // openly, so requests that arrived through the tunnel are refused here.
  // cloudflared always stamps cf-ray / cf-connecting-ip, so their presence is
  // the tell — a visitor cannot strip them, they are added by the edge.
  // The write token is read from disk by this server and never sent to a page.
  if (url.pathname.startsWith('/write/')) {
    const viaTunnel = !!(req.headers['cf-ray'] || req.headers['cf-connecting-ip']);
    const peer = req.socket.remoteAddress || '';
    const localPeer = peer.includes('127.0.0.1') || peer === '::1' || peer.includes('::ffff:127.0.0.1');
    if (viaTunnel || !localPeer) {
      log('write REFUSED', url.pathname, viaTunnel ? 'via tunnel' : 'peer ' + peer);
      res.writeHead(403, { 'content-type': 'application/json' }).end(JSON.stringify({
        error: 'solo desde la laptop',
        detail: 'Los cambios de setpoint no se exponen por el túnel. Abre el tablero en http://127.0.0.1:' + PORT + ' para operarlos.'
      }));
      return;
    }
    const token = readWriteToken();
    if (!token) {
      res.writeHead(503, { 'content-type': 'application/json' })
         .end(JSON.stringify({ error: 'sin token', detail: 'no se pudo leer writer.token' }));
      return;
    }
    const sub = url.pathname.replace(/^\/write/, '') || '/';
    if (!['/writable', '/prepare', '/commit', '/audit'].includes(sub)) {
      res.writeHead(404).end('{"error":"ruta no permitida"}'); return;
    }
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 20000);
        const up = await fetch(WRITER + sub + (url.search || ''), {
          method: req.method, signal: ctl.signal,
          headers: { 'content-type': 'application/json', 'X-Twin-Write-Token': token },
          body: req.method === 'GET' ? undefined : (body || '{}')
        });
        clearTimeout(t);
        const txt = await up.text();
        res.writeHead(up.status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(txt);
      } catch (e) {
        log('write FAIL', sub, e.message);
        res.writeHead(502, { 'content-type': 'application/json' })
           .end(JSON.stringify({ error: 'twin_writer no responde', detail: String(e.message || e) }));
      }
    });
    return;
  }

  // ---- Gemini proxy --------------------------------------------------------
  // The API key lives HERE, never in the page. This board is public, so a key
  // embedded in the HTML would be readable by every visitor and spendable on
  // the owner's account. The browser posts a question, the server attaches the
  // key and forwards it to Google.
  if (url.pathname === '/ai/ask') {
    if (req.method !== 'POST') { res.writeHead(405).end('only POST'); return; }
    if (!GEMINI_KEY) {
      res.writeHead(503, { 'content-type': 'application/json' })
         .end(JSON.stringify({ error: 'sin clave', detail: 'GEMINI_API_KEY no está definida en el servidor' }));
      return;
    }
    // The endpoint is reachable by anyone holding the public URL, so it is rate
    // limited: without this, one visitor could drain the account's quota.
    var now = Date.now();
    aiHits = aiHits.filter(t => now - t < 60000);
    if (aiHits.length >= AI_PER_MIN) {
      res.writeHead(429, { 'content-type': 'application/json' })
         .end(JSON.stringify({ error: 'demasiadas consultas', detail: `límite ${AI_PER_MIN}/min` }));
      return;
    }
    aiHits.push(now);

    let body = '';
    req.on('data', c => { body += c; if (body.length > 200_000) req.destroy(); });
    req.on('end', async () => {
      try {
        const ask = JSON.parse(body || '{}');
        const prompt = String(ask.prompt || '').slice(0, 20000);
        if (!prompt) { res.writeHead(400).end('{"error":"prompt vacío"}'); return; }
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 30000);
        const up = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
          { method: 'POST', signal: ctl.signal,
            headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 700 }
            }) });
        clearTimeout(t);
        const j = await up.json();
        if (!up.ok) {
          log('gemini HTTP', up.status, JSON.stringify(j).slice(0, 160));
          res.writeHead(up.status, { 'content-type': 'application/json' })
             .end(JSON.stringify({ error: 'gemini rechazó la consulta', status: up.status,
                                   detail: (j.error && j.error.message) || '' }));
          return;
        }
        const text = ((j.candidates || [])[0]?.content?.parts || []).map(x => x.text || '').join('').trim();
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
           .end(JSON.stringify({ text, model: GEMINI_MODEL }));
      } catch (e) {
        log('gemini FAIL', e.message);
        res.writeHead(502, { 'content-type': 'application/json' })
           .end(JSON.stringify({ error: 'no se pudo consultar a Gemini', detail: String(e.message || e) }));
      }
    });
    return;
  }

  // ---- camera snapshot (single JPEG) ---------------------------------------
  // A continuous MJPEG <img> dies whenever the browser backgrounds the tab or
  // the tile leaves the view, and it never reconnects on its own — reported in
  // the field as "se pone en blanco y ya no vuelve a cargar". Short polled
  // stills survive that: each frame is its own request, so a dropped one costs
  // a frame, not the feed.
  if (url.pathname === '/cam/snapshot') {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      const q = url.searchParams.get('resolution') || '640x360';
      const up = await fetch(`${CAM}/stream?resolution=${encodeURIComponent(q)}&fps=5`, { signal: ctl.signal });
      const reader = up.body.getReader();
      const chunks = [];
      let total = 0, jpeg = null;
      // Read until one complete JPEG (SOI ffd8 … EOI ffd9) has arrived.
      while (total < 4_000_000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); total += value.length;
        const buf = Buffer.concat(chunks);
        const start = buf.indexOf(Buffer.from([0xff, 0xd8]));
        if (start === -1) continue;
        const end = buf.indexOf(Buffer.from([0xff, 0xd9]), start + 2);
        if (end !== -1) { jpeg = buf.subarray(start, end + 2); break; }
      }
      clearTimeout(t);
      try { await reader.cancel(); } catch {}
      if (!jpeg) { res.writeHead(504, { 'content-type': 'text/plain' }).end('no frame'); return; }
      res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'no-store' }).end(jpeg);
    } catch (e) {
      log('snapshot FAIL', e.message);
      res.writeHead(502, { 'content-type': 'text/plain' }).end('camera relay unreachable');
    }
    return;
  }

  // ---- camera relay (streaming) --------------------------------------------
  if (url.pathname === '/cam' || url.pathname.startsWith('/cam/')) {
    const sub = url.pathname.replace(/^\/cam/, '') || '/';
    if (req.method !== 'GET') { res.writeHead(405).end('only GET'); return; }
    try {
      // NO await .text() here: multipart/x-mixed-replace never ends, so buffering
      // it would hang the request forever. The body is piped through instead.
      const up = await fetch(CAM + sub + (url.search || ''));
      res.writeHead(up.status, {
        'content-type': up.headers.get('content-type') || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      const stream = Readable.fromWeb(up.body);
      stream.pipe(res);
      // A viewer closing the tab must tear the upstream read down as well, or
      // each abandoned tab leaves a camera connection running.
      req.on('close', () => stream.destroy());
    } catch (e) {
      log('cam FAIL', sub, e.message);
      res.writeHead(502, { 'content-type': 'text/plain' }).end('camera relay unreachable');
    }
    return;
  }

  // ---- static files --------------------------------------------------------
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/' + path.basename(arg('index', 'Panduit-DC-Ops-Homelab-v2.html'));
  const file = path.resolve(DIR, '.' + rel);
  // Contain every read inside DIR: a crafted path must not walk out of it.
  if (file !== DIR && !file.startsWith(DIR + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found: ' + rel); return; }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(buf);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  log(`sirviendo ${DIR}`);
  log(`  http://127.0.0.1:${PORT}/         → dashboard`);
  log(`  http://127.0.0.1:${PORT}/api/current → proxy a ${API}`);
  log(`  rutas permitidas: ${[...ALLOW].join(' ')} (solo GET)`);
  log(`  http://127.0.0.1:${PORT}/cam/stream → proxy a ${CAM}`);
  log(`  escritura: ${readWriteToken() ? 'token OK · ' + WRITER + ' · SOLO desde 127.0.0.1' : 'sin token (' + TOKEN_PATH + ')'}`);
  log(`  Gemini: ${GEMINI_KEY ? 'clave presente · modelo ' + GEMINI_MODEL + ' · ' + AI_PER_MIN + '/min' : 'SIN CLAVE (define GEMINI_API_KEY)'}`);
});
