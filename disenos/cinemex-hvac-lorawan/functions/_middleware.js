/**
 * _middleware.js — server-side access gate for every project under /p/.
 *
 * This REPLACES the old client-side overlay (gate.mjs), which was friction only: the page and its
 * bundle were already in the browser before the passcode was asked, and the page carried
 * SHA-256(key + salt) in the clear, so the key could be brute-forced offline in under a minute.
 *
 * Here the check happens in Cloudflare's edge, BEFORE any project byte is served:
 *   - No valid cookie -> the request never reaches the asset. The response IS the login page, for
 *     the HTML and for every sub-resource (bundles, textures, JSON). View-source or curl on a
 *     protected URL returns the login markup, nothing else.
 *   - The key never ships to the browser in any form — no hash, no salt. There is nothing to attack
 *     offline; an attacker is reduced to guessing against this endpoint, online, one try at a time.
 *   - Keys live in Pages environment secrets (KEY_<PROJECT>), not in the repo or the bundle.
 *
 * Unlock is per project: the cookie is scoped to /p/<project>/, so a key opens that project (and,
 * for a client folder, its dashboards) and nothing else.
 *
 * The portal itself (/) stays open — it only lists projects.
 */

const COOKIE_TTL_DAYS = 30;
const FAILED_ATTEMPT_DELAY_MS = 400;   // blunt online-guessing brake; see notes at the bottom

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  const match = url.pathname.match(/^\/p\/([a-z0-9-]+)(\/|$)/i);
  if (!match) return next();                      // portal, /assets/*, anything else: open

  const project = match[1].toLowerCase();
  const secret = env[`KEY_${project.toUpperCase().replace(/-/g, '_')}`];
  const signingKey = env.AG_GATE_SECRET;

  // Fail CLOSED. A missing secret means the project is misconfigured, not public.
  if (!secret || !signingKey) {
    return loginResponse(project, 'Este proyecto no está configurado. Avisá a Angeles Group.', 503);
  }

  if (request.method === 'POST') {
    const form = await request.formData().catch(() => null);
    const attempt = form && String(form.get('key') || '');

    if (attempt && (await constantTimeEquals(attempt.trim(), secret.trim()))) {
      const token = await sign(project, signingKey);
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname,
          'Set-Cookie': cookie(project, token),
          'Cache-Control': 'no-store',
        },
      });
    }

    // Slow every wrong answer down. Cheap, and it makes online guessing hopeless.
    await new Promise((resolve) => setTimeout(resolve, FAILED_ATTEMPT_DELAY_MS));
    return loginResponse(project, 'Clave incorrecta.', 401);
  }

  const token = readCookie(request, `ag_${project}`);
  if (token && (await verify(project, token, signingKey))) return next();

  return loginResponse(project, null, 401);
}

/* ── cookie ────────────────────────────────────────────────────────────────── */

function cookie(project, token) {
  const maxAge = COOKIE_TTL_DAYS * 24 * 60 * 60;
  return `ag_${project}=${token}; Path=/p/${project}/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/* ── signing ───────────────────────────────────────────────────────────────── */

/** token = <expiry>.<hex HMAC-SHA256(project + "." + expiry)> */
async function sign(project, signingKey) {
  const expiry = Date.now() + COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return `${expiry}.${await hmac(`${project}.${expiry}`, signingKey)}`;
}

async function verify(project, token, signingKey) {
  const [expiry, signature] = String(token).split('.');
  if (!expiry || !signature) return false;
  if (!Number(expiry) || Number(expiry) < Date.now()) return false;
  const expected = await hmac(`${project}.${expiry}`, signingKey);
  return constantTimeEquals(signature, expected);
}

async function hmac(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compare via HMAC digests rather than the raw values: equal-length digests make the comparison
 * independent of where the inputs differ, and of how long they are.
 */
async function constantTimeEquals(a, b) {
  const salt = crypto.randomUUID();
  const [da, db] = await Promise.all([hmac(a, salt), hmac(b, salt)]);
  let diff = 0;
  for (let i = 0; i < da.length; i++) diff |= da.charCodeAt(i) ^ db.charCodeAt(i);
  return diff === 0;
}

/* ── login page ────────────────────────────────────────────────────────────── */

function loginResponse(project, error, status) {
  return new Response(loginPage(project, error), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      // The login page is the only thing an unauthenticated visitor gets; keep it inert.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function loginPage(project, error) {
  // Deliberately says nothing about the project beyond its id: no title, no description, no preview.
  const message = error
    ? `<p class="error">${escapeHtml(error)}</p>`
    : '<p class="hint">Ingresá la clave de acceso</p>';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Acceso · Angeles Group</title>
<style>
  :root{ color-scheme: dark; }
  *{ margin:0; padding:0; box-sizing:border-box; }
  body{ min-height:100vh; display:grid; place-items:center; background:#0d1220;
        color:#e6ecf5; font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:24px; }
  .caja{ width:100%; max-width:360px; background:#141c2e; border:1px solid #223050;
         border-radius:14px; padding:28px 26px; box-shadow:0 20px 60px rgba(0,0,0,.45); }
  h1{ font-size:16px; font-weight:600; letter-spacing:.02em; text-align:center; }
  .proyecto{ display:block; text-align:center; margin-top:6px; font-size:12px; color:#7c8db0;
             font-family:ui-monospace,SFMono-Regular,monospace; text-transform:uppercase;
             letter-spacing:.14em; }
  .hint,.error{ text-align:center; font-size:13px; margin:18px 0 14px; }
  .hint{ color:#8a9bbd; }
  .error{ color:#ff8b8b; }
  input{ width:100%; padding:12px 14px; border-radius:9px; border:1px solid #2f4370;
         background:#0b1120; color:#e6ecf5; font-size:15px; letter-spacing:.06em;
         font-family:ui-monospace,SFMono-Regular,monospace; }
  input:focus{ outline:2px solid #3b6ff5; outline-offset:1px; border-color:#3b6ff5; }
  button{ width:100%; margin-top:14px; padding:12px; border:0; border-radius:9px;
          background:#2e5fe0; color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
  button:hover{ background:#3b6ff5; }
  footer{ margin-top:18px; text-align:center; font-size:11px; color:#5d6d8c; }
</style>
</head>
<body>
  <form class="caja" method="POST" autocomplete="off">
    <h1>Acceso restringido</h1>
    <span class="proyecto">${escapeHtml(project)}</span>
    ${message}
    <input type="password" name="key" autofocus required aria-label="Clave de acceso" placeholder="••••-••••">
    <button type="submit">Entrar</button>
    <footer>Angeles Group</footer>
  </form>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
