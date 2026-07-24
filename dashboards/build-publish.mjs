#!/usr/bin/env node
/**
 * build-publish.mjs — PUBLISH build for the white-label client folders.
 *
 *   node dashboards/build-publish.mjs            -> every client
 *   node dashboards/build-publish.mjs rotzinger  -> just that one
 *
 * Output goes to ../disenos/cinemex-hvac-lorawan/publish/p/<client>/ — one folder per client, the
 * same three dashboards inside each, wearing that client's brand:
 *
 *   p/<client>/index.html   the folder page (cards for the three dashboards)
 *   p/<client>/energia/     dashboard-energetico (React, built with base=/p/<client>/energia/)
 *   p/<client>/mx0a/        MEXICO site mx0a, served at /snls/ on Vercel
 *   p/<client>/mx60/        MEXICO site mx60
 *
 * WHITE LABEL. The dashboards reference brand-logo.png / brand-logo-inverse.png / brand-mark.png,
 * never a client name. brands/<client>/ holds those three files (plus the client's display name and
 * tagline in CLIENTS below); this script copies them over the defaults after staging each build.
 * The energy dashboard also gets VITE_BRAND_NAME so its logo alt text matches.
 *
 * NO BACKEND. On Vercel the MEXICO dashboards read from `/api/router` (a Vercel edge function) via
 * rewrites in vercel.json. The visor is a static Pages deploy with no functions, so instead:
 *   - src/mocks/browser-shim.js is bundled to `niagara-mock.js` and loaded first on each page; it
 *     runs the SAME tryHandle contract in the browser by patching fetch + XMLHttpRequest.
 *   - the two absolute `<script src="/requirejs/...">` / `<script src="/module/...">` tags, which the
 *     edge function answered with a RequireJS stub, are rewritten to a local `niagara-stub.js` that
 *     this script materializes from the handler's REQUIRE_STUB export.
 * The mock routes are matched by pathname (`/snls/api/…`, `/mx60/api/…`), which the shim reads off
 * the request URL — so they keep working from any mount point.
 *
 * SUBPATH: mx0a hardcodes `<base href="/snls/">`; it is rewritten to this deploy's path. mx60 uses
 * document-relative URLs and needs no rewrite. Every rewrite below asserts its hit count — a silent
 * miss would ship a dashboard that 404s its own assets.
 *
 * GATE: nothing is baked in here. Access is enforced SERVER-SIDE by
 * ../disenos/cinemex-hvac-lorawan/functions/_middleware.js — without a signed cookie the login page
 * is served instead of the folder, for the HTML and every asset. A new client needs its key as a
 * Pages secret named KEY_<CLIENT>; the cookie is scoped to /p/<client>/, so one key opens that
 * client's folder and nothing else. See VISOR.md.
 *
 * SCOPE: this script owns publish/p/<client>/ for the clients listed below. The portal,
 * publish/_headers and the sibling p/<project> trees belong to their own builders.
 *
 * RULE: never edit publish/ by hand. It is generated. Edit the source, rebuild.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));            // dashboards/
const REPO = dirname(ROOT);
const CINEMEX = join(REPO, 'disenos', 'cinemex-hvac-lorawan');
const PUBLISH = join(CINEMEX, 'publish');
const MEXICO = join(ROOT, 'mexico');
const ENERGIA = join(ROOT, 'dashboard-energetico');

/** Clients that get a folder. `id` is also the gate project id and the URL segment. */
const CLIENTS = [
  { id: 'rescom', name: 'RESCOM', tagline: 'Redes y servicios en comunicación.' },
  { id: 'rotzinger', name: 'ROTZINGER', tagline: 'Refrigeración y aire acondicionado.' },
];

/** The three dashboards, in the order they appear on a folder page. */
const DASHBOARDS = [
  {
    slug: 'energia',
    title: 'Centro de Control Energético',
    tag: 'Energía · Multi-zona',
    desc: 'Demanda, costo por banda tarifaria, calidad de energía y huella de carbono en vivo, con gemelo isométrico de la planta.',
  },
  {
    slug: 'mx0a',
    title: 'BMS · Edificio Corporativo — Pisos 4 a 7',
    tag: 'BMS · Building Automation',
    desc: 'Automatización de cuatro pisos: RTUs por zona, alarmas, horarios y planta interactiva del inmueble.',
  },
  {
    slug: 'mx60',
    title: 'BMS · Planta Chihuahua',
    tag: 'BMS · Planta industrial',
    desc: 'Seis naves con equipos, cárcamos y dataloggers de presión, alarmas en vivo y recorrido 3D del parque industrial.',
  },
];

const BRAND_FILES = ['logo.png', 'logo-inverse.png', 'mark.png'];
const REQUIREJS_TAG = '<script src="/requirejs/config.js"></script>';
const MODULE_TAG = '<script src="/module/js/com/tridium/js/ext/require/require.min.js"></script>';

const log = (msg) => console.log(`[build] ${msg}`);

/** Replace exactly `count` occurrences, or fail loud — a missed rewrite ships a broken page. */
function replaceExactly(html, needle, replacement, count, label) {
  const hits = html.split(needle).length - 1;
  if (hits !== count) {
    throw new Error(`${label}: expected ${count}x ${JSON.stringify(needle)}, found ${hits}`);
  }
  return html.split(needle).join(replacement);
}

/** Run a package's local vite binary. */
function vite(cwd, args, env) {
  execFileSync(join(cwd, 'node_modules', '.bin', 'vite'), args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

const requested = process.argv.slice(2);
const clients = requested.length
  ? CLIENTS.filter((c) => requested.includes(c.id))
  : CLIENTS;
if (!clients.length) {
  throw new Error(`unknown client(s): ${requested.join(', ')} — known: ${CLIENTS.map((c) => c.id).join(', ')}`);
}

/* ────────────────────────────────────────────────────────────────────────────
   1. Build MEXICO once — its two sites are static and identical across clients
      except for the brand images, which are swapped per client after staging.
   ──────────────────────────────────────────────────────────────────────────── */
log('building mexico…');
vite(MEXICO, ['build']);

/* ────────────────────────────────────────────────────────────────────────────
   2. Bundle the browser mock shim (IIFE, no module system, loads from <head>)
   ──────────────────────────────────────────────────────────────────────────── */
log('bundling the niagara mock shim…');
const requireFromMexico = createRequire(join(MEXICO, 'package.json'));
const { build } = await import(pathToFileURL(requireFromMexico.resolve('vite')).href);
const SHIM_DIR = join(MEXICO, 'node_modules', '.brand-shim');

await build({
  configFile: false,
  root: MEXICO,
  logLevel: 'warn',
  build: {
    outDir: SHIM_DIR,
    emptyOutDir: true,
    minify: true,
    lib: {
      entry: join(MEXICO, 'src', 'mocks', 'browser-shim.js'),
      formats: ['iife'],
      name: 'NiagaraMockShim',
      fileName: () => 'niagara-mock.js',
    },
  },
});
const shimJs = readFileSync(join(SHIM_DIR, 'niagara-mock.js'), 'utf8');
rmSync(SHIM_DIR, { recursive: true, force: true });

/* The RequireJS/BajaScript stub the edge function used to serve for the two absolute script tags. */
const { REQUIRE_STUB: stubJs } = await import(
  pathToFileURL(join(MEXICO, 'src', 'mocks', 'handler.js')).href
);

/* ────────────────────────────────────────────────────────────────────────────
   3. One folder per client
   ──────────────────────────────────────────────────────────────────────────── */
for (const client of clients) {
  const base = `/p/${client.id}/`;
  const out = join(PUBLISH, 'p', client.id);
  const brand = join(ROOT, 'brands', client.id);
  const thumbs = join(ROOT, 'thumbs', client.id);

  for (const file of BRAND_FILES) {
    if (!existsSync(join(brand, file))) {
      throw new Error(`${client.id}: brands/${client.id}/${file} is missing`);
    }
  }

  log(`building dashboard-energetico for ${client.id}…`);
  vite(ENERGIA, ['build', `--base=${base}energia/`], { VITE_BRAND_NAME: client.name });

  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  cpSync(join(ENERGIA, 'dist'), join(out, 'energia'), { recursive: true });

  const energiaPage = join(out, 'energia', 'index.html');
  writeFileSync(
    energiaPage,
    replaceExactly(
      readFileSync(energiaPage, 'utf8'),
      '<title>Energy Command Center</title>',
      `<title>${client.name} — Energy Command Center</title>`,
      1,
      'energia title',
    ),
  );
  cpSync(join(MEXICO, 'dist', 'sites', 'mx0a'), join(out, 'mx0a'), { recursive: true });
  cpSync(join(MEXICO, 'dist', 'sites', 'mx60'), join(out, 'mx60'), { recursive: true });

  // Brand swap: the staged builds carry the repo's default brand images; overwrite with this
  // client's. Same filenames everywhere, so nothing in the dashboards needs to know the client.
  for (const file of BRAND_FILES) {
    cpSync(join(brand, file), join(out, 'energia', `brand-${file}`));
    cpSync(join(brand, file), join(out, 'mx0a', 'img', `brand-${file}`));
    cpSync(join(brand, file), join(out, 'mx60', 'img', `brand-${file}`));
  }

  for (const slug of ['mx0a', 'mx60']) {
    writeFileSync(join(out, slug, 'niagara-mock.js'), shimJs);
    writeFileSync(join(out, slug, 'niagara-stub.js'), stubJs);

    const page = join(out, slug, 'index.html');
    let html = readFileSync(page, 'utf8');

    if (slug === 'mx0a') {
      html = replaceExactly(html, '<base href="/snls/">', `<base href="${base}mx0a/">`, 1, 'mx0a base');
    }

    // Both tags used to hit the edge function, which answered with the same stub.
    html = replaceExactly(html, REQUIREJS_TAG, '<script src="niagara-stub.js"></script>', 1, `${slug} requirejs`);
    html = replaceExactly(html, MODULE_TAG, '<script src="niagara-stub.js"></script>', 1, `${slug} module`);

    // The logo is two <img alt=""> inside a labelled container — relabel it for this client.
    html = replaceExactly(html, 'aria-label="RESCOM"', `aria-label="${client.name}"`, 1, `${slug} logo label`);

    // Brand-neutral in the source, branded on the way out (tab title + footer).
    if (slug === 'mx60') {
      html = replaceExactly(
        html,
        '<title>MX60 Chihuahua — BMS</title>',
        `<title>MX60 Chihuahua — BMS · ${client.name}</title>`,
        1,
        'mx60 title',
      );
      html = replaceExactly(
        html,
        'BMS &mdash; MX60 Chihuahua',
        `${client.name} BMS &mdash; MX60 Chihuahua`,
        1,
        'mx60 footer',
      );
    }

    // The shim must patch fetch/XHR before any app code runs.
    html = replaceExactly(
      html,
      '</head>',
      '  <script src="niagara-mock.js"></script>\n</head>',
      1,
      `${slug} shim injection`,
    );

    writeFileSync(page, html);
  }

  /* ── folder page ── */
  const cards = DASHBOARDS.map((d) => {
    const thumb = existsSync(join(thumbs, `${d.slug}-thumb.png`))
      ? `<div class="miniatura" style="background-image:url('${d.slug}-thumb.png')"></div>`
      : '<div class="miniatura"></div>';
    return `      <a class="tarjeta" href="${d.slug}/">
        ${thumb}
        <div class="cuerpo">
          <span class="tag">${d.tag}</span>
          <h2>${d.title}</h2>
          <p>${d.desc}</p>
          <span class="abrir">Abrir →</span>
        </div>
      </a>`;
  }).join('\n');

  writeFileSync(join(out, 'index.html'), folderPage(client, cards));
  cpSync(join(brand, 'logo.png'), join(out, 'logo.png'));
  cpSync(join(brand, 'mark.png'), join(out, 'mark.png'));

  // Card previews (thumbs/make-thumbs.py regenerates them from live screenshots).
  let missing = 0;
  for (const { slug } of DASHBOARDS) {
    const file = join(thumbs, `${slug}-thumb.png`);
    if (existsSync(file)) cpSync(file, join(out, `${slug}-thumb.png`));
    else missing += 1;
  }
  if (missing) log(`WARNING ${client.id}: ${missing}/${DASHBOARDS.length} thumbnails missing — cards ship without a preview`);

  // The portal's own card for this folder shows the client logo (thumbs/make-folder-thumb.py).
  // The portal HTML is hand-staged, but its assets are not — stage this one here so a new client
  // cannot end up listed with a missing tile.
  const folderTile = join(thumbs, `${client.id}-folder.png`);
  if (existsSync(folderTile)) cpSync(folderTile, join(PUBLISH, 'assets', `${client.id}-folder.png`));
  else log(`WARNING ${client.id}: no folder tile — run thumbs/make-folder-thumb.py ${client.id}`);

  log(`done -> ${out}`);
}

function folderPage(client, cards) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${client.name} · Dashboards</title>
<link rel="icon" type="image/png" href="mark.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Same tokens as the portal (portal/index.html) so the folder reads as part of the viewer. */
  :root{
    --canvas:#F2F4F8; --card:#FFFFFF; --ink:#1B2430; --dim:#5C6B84; --rule:#E1E6EF;
    --accent:#3B6FF5; --accent-strong:#2E5FE0; --accent-soft:#DCE7FF;
    --sombra:0 8px 24px rgba(20,30,60,.08); --sombra-hover:0 12px 32px rgba(20,30,60,.14);
    --radio:14px;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:var(--canvas);color:var(--ink)}
  body{font-family:"IBM Plex Sans",system-ui,sans-serif;line-height:1.5;min-height:100vh}
  a{color:inherit;text-decoration:none}
  :focus-visible{outline:2px solid var(--accent);outline-offset:2px}

  header.top{background:var(--card);border-bottom:1px solid var(--rule);box-shadow:var(--sombra);
    padding:14px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  header.top img{height:38px;width:auto;display:block}
  header.top .volver{margin-left:auto;font-size:13px;color:var(--dim)}
  header.top .volver:hover{color:var(--accent-strong)}

  main{max-width:1100px;margin:0 auto;padding:32px 24px 56px}
  .intro{margin-bottom:22px}
  .intro h1{font-size:22px;font-weight:600}
  .intro p{color:var(--dim);font-size:14px;margin-top:4px}

  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
  .tarjeta{background:var(--card);border:1px solid var(--rule);border-radius:var(--radio);
    box-shadow:var(--sombra);overflow:hidden;display:flex;flex-direction:column;
    transition:box-shadow .15s ease, transform .15s ease}
  .tarjeta:hover{box-shadow:var(--sombra-hover);transform:translateY(-2px)}
  .tarjeta .miniatura{aspect-ratio:16/10;background:#0e2033 center/cover no-repeat;
    border-bottom:1px solid var(--rule)}
  .tarjeta .cuerpo{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
  .tarjeta .tag{align-self:flex-start;font-family:"IBM Plex Mono",monospace;font-size:11px;font-weight:500;
    text-transform:uppercase;letter-spacing:.05em;color:var(--accent-strong);
    background:var(--accent-soft);border-radius:999px;padding:2px 10px}
  .tarjeta h2{font-size:16px;font-weight:600;margin-top:4px}
  .tarjeta p{font-size:13px;color:var(--dim);flex:1}
  .tarjeta .abrir{margin-top:10px;align-self:flex-start;background:var(--accent-strong);color:#fff;
    font-weight:600;font-size:13px;padding:7px 16px;border-radius:8px}
  .tarjeta:hover .abrir{background:var(--accent)}

  footer{max-width:1100px;margin:0 auto;padding:0 24px 40px;color:var(--dim);font-size:12px}
</style>
</head>
<body>
<header class="top">
  <img src="logo.png" alt="${client.name}">
  <a class="volver" href="../../">← Proyectos</a>
</header>

<main>
  <div class="intro">
    <h1>Dashboards</h1>
    <p>Tableros en vivo de ${client.name}. Elegí uno para abrirlo.</p>
  </div>
  <div class="grid">
${cards}
  </div>
</main>

<footer>Angeles Group · acceso autorizado</footer>
</body>
</html>
`;
}
