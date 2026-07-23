/**
 * gate.mjs — build-time injector for the shared-key access gate.
 *
 * FRICTION, NOT SECURITY. Read this before trusting it:
 *   - The gated page (HTML + bundle) is still fully downloaded to the browser. The gate only hides
 *     it behind an opaque overlay; view-source, a plain `fetch`, or disabling JavaScript reaches the
 *     content underneath. It keeps honest people out of a client demo — it is not access control.
 *   - The cleartext key NEVER ships: only SHA-256(key + salt) is baked into the page. But a short key
 *     can be brute-forced offline against that hash, and anyone the key is shared with can re-share
 *     it. Real access control is Cloudflare Access; real content protection is payload encryption.
 *     This is neither, by explicit choice (owner asked for a shareable, rotatable passcode).
 *
 * DEFERRED BOOT (why the login feels like a separate screen): the injector rewrites every heavy
 * `<script type="module">` (the three.js boot) into an inert `type="application/ag-deferred"` tag so
 * the browser never loads/runs the 3D while the login is up. The gate boots those scripts ONLY after
 * a correct key (or immediately, if this project was already unlocked). Result: the passcode sits on
 * an empty page, nothing heavy loading behind it — no jank while the visitor types.
 *
 * SHARED-BY-COPY: a byte-identical copy of this file lives in each project dir (cinemex / hotspot /
 * dhl), mirroring publish-hash.mjs. Keep them in sync by hand — build scripts never import across
 * project roots. Only the gate CONFIG (gate-keys.json) is read cross-root, exactly like protection.js.
 *
 * The per-project { salt, hash, title } come from gate-keys.json (written by keygen.mjs). That file
 * carries ONLY salt + hash (safe to publish — they ship to the browser anyway); the cleartext keys
 * live in the gitignored gate-secret.txt for the owner to share and rotate.
 */
import { readFileSync } from 'node:fs';

/** Marker embedded in the injected script so injectGate is idempotent and greppable in output HTML. */
const GATE_MARKER = 'AG_GATE_V2';

/**
 * Read the { projects: { <id>: { salt, hash, title } } } gate config for one project. Fails loud if
 * the file or the project entry is missing — a silent skip would ship an ungated page.
 */
export function loadGateConfig(gateKeysPath, project) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(gateKeysPath, 'utf8'));
  } catch (error) {
    throw new Error(`gate: cannot read ${gateKeysPath} — run keygen.mjs first\n${error.message}`);
  }
  const entry = parsed && parsed.projects && parsed.projects[project];
  if (!entry || !entry.salt || !entry.hash) {
    throw new Error(`gate: gate-keys.json has no { salt, hash } for "${project}" — run keygen.mjs`);
  }
  return { id: project, salt: entry.salt, hash: entry.hash, title: entry.title || project };
}

/**
 * Neutralize the heavy 3D boot: rewrite every `<script type="module"[ src=…]>` into an inert
 * `application/ag-deferred` tag (browsers do not fetch or run an unknown script type). Both shapes
 * are handled: an external `<script type="module" src="./main.js">` keeps its URL in `data-ag-src`,
 * and an inline `<script type="module">…import(…)…</script>` keeps its body verbatim. The gate boots
 * them after unlock. `type="importmap"` and classic scripts are left untouched — the importmap MUST
 * still run at parse time so the promoted module scripts can resolve `three` when they finally load.
 */
function deferModules(html) {
  return html.replace(/<script\s+type="module"(\s+src="([^"]*)")?\s*>/g, (_match, _srcAttr, src) =>
    src
      ? `<script type="application/ag-deferred" data-ag-src="${src}">`
      : '<script type="application/ag-deferred">',
  );
}

/**
 * The browser gate: a self-contained classic script. salt / hash / id / title are injected as one
 * JSON.stringify'd literal so no key character can break out of the string. Runs from <head>, before
 * the page's deferred boot. If the visitor already unlocked this project (localStorage token equals
 * the current hash) it boots straight through — and because the token IS the hash, a key rotation
 * (new hash) auto-invalidates every stored unlock without any per-visitor cleanup.
 */
function gateScript(cfg) {
  const json = JSON.stringify({ id: cfg.id, salt: cfg.salt, hash: cfg.hash, title: cfg.title });
  return `/*${GATE_MARKER}*/(function(){
  "use strict";
  var CFG = ${json};
  var KEYNAME = "agkey:" + CFG.id;
  function onReady(fn){ if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  // Promote every inert ag-deferred script to a live module, in document order — this is what boots
  // the 3D. Only ever called after a correct key (or on an already-unlocked visit).
  function boot(){
    var list = document.querySelectorAll('script[type="application/ag-deferred"]');
    for (var i=0;i<list.length;i++){
      var old = list[i], src = old.getAttribute("data-ag-src"), s = document.createElement("script");
      s.type = "module";
      if (src) s.src = src; else s.textContent = old.textContent;
      old.parentNode.replaceChild(s, old);
    }
  }
  function unlocked(){ try { return localStorage.getItem(KEYNAME) === CFG.hash; } catch(e){ return false; } }
  if (unlocked()){ onReady(boot); return; }
  var enc = new TextEncoder();
  function toHex(buf){ var b = new Uint8Array(buf), s = ""; for (var i=0;i<b.length;i++){ s += b[i].toString(16).padStart(2,"0"); } return s; }
  function digest(text){
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error("no-subtle"));
    return crypto.subtle.digest("SHA-256", enc.encode(text)).then(toHex);
  }
  var CSS = "#ag-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;"
    + "background:#0e1524;color:#e8edf6;font-family:'IBM Plex Sans',system-ui,-apple-system,sans-serif}"
    + "#ag-gate *{box-sizing:border-box}"
    + "#ag-gate .box{width:min(92vw,360px);padding:34px 30px;border:1px solid #24314c;border-radius:14px;"
    + "background:#141d30;box-shadow:0 24px 60px rgba(0,0,0,.5);text-align:center}"
    + "#ag-gate h1{margin:0 0 6px;font-size:18px;font-weight:600;line-height:1.3}"
    + "#ag-gate p{margin:0 0 20px;font-size:13px;color:#8ea0bd}"
    + "#ag-gate input{width:100%;padding:12px 14px;font-size:15px;letter-spacing:2px;text-align:center;"
    + "text-transform:uppercase;border:1px solid #33456a;border-radius:9px;background:#0c1322;color:#e8edf6;"
    + "font-family:'IBM Plex Mono',ui-monospace,monospace}"
    + "#ag-gate input:focus{outline:none;border-color:#3b6ff5}"
    + "#ag-gate button{margin-top:14px;width:100%;padding:12px;font-size:14px;font-weight:600;border:0;"
    + "border-radius:9px;background:#3b6ff5;color:#fff;cursor:pointer}"
    + "#ag-gate button:hover{background:#2f5fe0}"
    + "#ag-gate .err{min-height:16px;margin-top:12px;font-size:12px;color:#ff7a7a}"
    + "#ag-gate.shake .box{animation:agshk .3s}"
    + "@keyframes agshk{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}";
  var st = document.createElement("style");
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
  var g = document.createElement("div");
  g.id = "ag-gate";
  g.innerHTML = '<div class="box"><h1></h1><p>Ingresá la clave de acceso</p>'
    + '<input type="password" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Clave de acceso" maxlength="40">'
    + '<div class="err" role="alert"></div><button type="button">Entrar</button></div>';
  document.documentElement.appendChild(g);
  g.querySelector("h1").textContent = CFG.title;
  var input = g.querySelector("input"), err = g.querySelector(".err"), btn = g.querySelector("button");
  function fail(msg){ err.textContent = msg; g.classList.add("shake"); setTimeout(function(){ g.classList.remove("shake"); }, 320); }
  function submit(){
    var val = (input.value || "").trim().toUpperCase();
    if (!val) return;
    digest(val + CFG.salt).then(function(h){
      if (h === CFG.hash){ try { localStorage.setItem(KEYNAME, CFG.hash); } catch(e){} g.remove(); st.remove(); onReady(boot); }
      else { input.value = ""; fail("Clave incorrecta"); }
    }).catch(function(){ fail("No se pudo verificar en este navegador"); });
  }
  btn.addEventListener("click", submit);
  input.addEventListener("keydown", function(e){ if (e.key === "Enter") submit(); });
  setTimeout(function(){ try { input.focus(); } catch(e){} }, 0);
})();`;
}

/**
 * Inject the gate + defer the heavy boot. Order: neutralize the module scripts first, then insert the
 * gate as an inline classic <script> right before </head> so it runs before anything else. Idempotent
 * (a page already carrying the marker is returned untouched). Fails loud if there is no </head> — the
 * injection point must exist; a silent no-op would ship an OPEN, un-deferred page.
 */
export function injectGate(html, cfg, label) {
  if (html.includes(GATE_MARKER)) return html;
  const deferred = deferModules(html);
  const idx = deferred.indexOf('</head>');
  if (idx === -1) throw new Error(`${label}: </head> not found — cannot inject the access gate`);
  return deferred.slice(0, idx) + `<script>${gateScript(cfg)}</script>\n` + deferred.slice(idx);
}
