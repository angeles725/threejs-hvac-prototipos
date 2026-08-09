// lint-asset-source.mjs — STATIC source linter for disenos/catalog/**/<slug>.html.
// READ-ONLY, no browser, no repo writes. Runs in milliseconds over the whole catalog.
//
// WHY THIS EXISTS — the gap it fills, and the tools it must NOT duplicate:
//   · verify-catalog-asset.mjs  loads the asset and measures the DEFAULT state at runtime.
//   · audit-asset.mjs           inventories the scene and diffs it per button (runtime truth).
//   · hole-probe.mjs            separates a dark panel from a hole (runtime truth).
//   · verify-design-spec.mjs    OWNS design-spec.yaml. This linter deliberately does not read it
//                               for spec completeness — only to look up declared deviations.
// None of them reads the SOURCE. Several contract clauses live only there and are invisible to a
// runtime probe of the default state. The clearest one, and the reason this file exists:
//
//   In render-on-demand (block56) a handler that mutates the scene but never calls requestRender()
//   leaves a toggle that does nothing until some unrelated event forces a frame. The gate screenshots
//   the default state, so it never presses the button; and a state probe that clicks it may still
//   capture a correct-looking frame if its own click triggered a render some other way. Statically it
//   is unambiguous: the handler body either asks for a frame or it does not.
//
// NOISE DISCIPLINE (learned the hard way on this catalog):
//   · The §3.1 band is 0.06–0.84. HANDBOOK §3.1 explicitly ALLOWS 0.85–1.0 (`skidDark`, `coilFrame`),
//     so flagging 0.85 is a false positive. An earlier draft of this linter did exactly that.
//   · A deviation DECLARED in the asset's design-spec.yaml is not a finding. This linter reads the
//     spec looking for `EXCEPTION` and stays quiet. A checker that shouts about a documented decision
//     teaches the fleet to ignore it, which is worse than having no checker.
//   · When a construct cannot be parsed with confidence, it is reported as UNVERIFIABLE, never as a
//     violation. An audit that invents defects costs more than the ones it finds.
//
// STATUS: ADVISORY. Exit 0 always, unless --strict is passed. It is a static reading of source and
// cannot see geometry; a clean run means "the contract clauses expressible in source hold", nothing more.
//
// Usage:  node disenos/catalog/tools/lint-asset-source.mjs [<family> ...] [--strict]
//         (no families = sweep every family under disenos/catalog/)

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');                       // disenos/catalog
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const wanted = args.filter(a => !a.startsWith('--'));

const isDir = p => existsSync(p) && statSync(p).isDirectory();
const families = (wanted.length ? wanted : readdirSync(ROOT).filter(f => isDir(join(ROOT, f)) && f !== 'tools'));

const camel = s => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());

function lintAsset(fam, slug) {
  const dir  = join(ROOT, fam, slug);
  const html = join(dir, `${slug}.html`);
  const spec = join(dir, 'design-spec.yaml');
  const out  = { asset: `${fam}/${slug}`, issues: [], unverifiable: [] };
  if (!existsSync(html)) { out.issues.push(`falta ${slug}.html (el nombre debe coincidir con la carpeta)`); return out; }
  const t = readFileSync(html, 'utf8');
  // A material value RECORDED IN THE SPEC is a declared authoring decision, because the spec is the
  // contract. Only a value that exists solely in code is undeclared. Matching on the word EXCEPTION
  // alone was too literal: automotriz/carroceria justifies its 0.75 under `evidence:` ("the BIW
  // definition forbids paint, and a 0.9 stainless read would make it a chrome show car") and this
  // linter flagged it anyway. Numbers are compared as floats, so 0.7 and 0.70 are the same value.
  const specText   = existsSync(spec) ? readFileSync(spec, 'utf8') : '';
  const specMetals = new Set([...specText.matchAll(/metalness:\s*(\d*\.?\d+)/g)].map(m => parseFloat(m[1])));

  // ---- QA contract: the hooks the probes look for -------------------------------------------
  if (!/data-app-ready/.test(t))   out.issues.push('sin data-app-ready');
  if (!/__qaRenderInfo/.test(t))   out.issues.push('sin __qaRenderInfo');
  if (!t.includes(`__${camel(slug)}App`))
    out.issues.push(`sin globalThis.__${camel(slug)}App (slug con guion -> global camelCase)`);

  // ---- render budget (block54): pure source facts --------------------------------------------
  if (!/shadowMap\.autoUpdate\s*=\s*false/.test(t)) out.issues.push('shadowMap.autoUpdate no está en false (§5-d)');
  for (const m of t.matchAll(/shadow\.mapSize\.set\(\s*(\d+)/g))
    if (+m[1] > 1024) out.issues.push(`shadow mapSize ${m[1]} > 1024 (§5-d)`);
  if (!/setPixelRatio\(\s*Math\.min\(\s*devicePixelRatio\s*,\s*2\s*\)/.test(t))
    out.issues.push('DPR no capado a 2 (§5-b)');

  // ---- render-on-demand (block56) -------------------------------------------------------------
  if (!/needsRender/.test(t)) {
    out.issues.push('sin gate needsRender');
  } else {
    const lines = t.split('\n');
    lines.forEach((ln, i) => {
      if (/renderer\.render\(/.test(ln) && !/needsRender/.test(ln))
        out.issues.push(`renderer.render() fuera del gate (línea ${i + 1})`);
    });
    // every handler must ask for a frame. Two authoring styles are recognised; anything else is
    // reported as unverifiable rather than guessed at.
    // Handler bodies are delimited by BRACE MATCHING, not by a regex looking for `};`.
    // A non-greedy regex cuts the body at the first `};`, which inside a handler is usually an
    // inner object literal — `target = { ...POSES[i] };` — and the truncated body then looks like
    // it never calls requestRender(). That produced a false positive on three robotica assets in
    // this linter's own first run. Counting braces has no such ambiguity.
    const bodyFrom = (src, openIdx) => {
      let depth = 0;
      for (let i = openIdx; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (!depth) return src.slice(openIdx + 1, i); }
      }
      return null;                                   // unbalanced: caller treats as unverifiable
    };
    // A handler may delegate to a helper (`toggle(btn, grp)`, `reframe()`), which is a legitimate
    // third authoring style in this catalog. Resolve one level of indirection before judging.
    const helperAsks = new Map();
    for (const m of t.matchAll(/(?:function\s+(\w+)\s*\([^)]*\)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>)\s*\{/g)) {
      const name = m[1] || m[2];
      const b = bodyFrom(t, t.indexOf('{', m.index + m[0].length - 1));
      if (b !== null) helperAsks.set(name, /requestRender|needsRender\s*=\s*true/.test(b));
    }
    const asksForFrame = body =>
      /requestRender|needsRender\s*=\s*true/.test(body) ||
      [...body.matchAll(/(\w+)\s*\(/g)].some(c => helperAsks.get(c[1]) === true);

    const wired = new Set();
    for (const m of t.matchAll(/(\w+)\.onclick\s*=\s*(?:\([^)]*\)|\w+)\s*=>\s*\{/g)) {
      const name = m[1];
      wired.add(name);
      const body = bodyFrom(t, m.index + m[0].length - 1);
      if (body === null) { out.unverifiable.push(`handler ${name}: llaves desbalanceadas, no lo juzgo`); continue; }
      if (!asksForFrame(body))
        out.issues.push(`handler ${name} no pide render (toggle muerto bajo render-on-demand)`);
    }
    for (const m of t.matchAll(/addEventListener\(\s*'resize'\s*,\s*(?:\([^)]*\)|\w+)\s*=>\s*\{/g)) {
      const body = bodyFrom(t, m.index + m[0].length - 1);
      if (body === null) out.unverifiable.push('handler de resize: llaves desbalanceadas');
      else if (!asksForFrame(body)) out.issues.push('el handler de resize no pide render');
    }
    for (const m of t.matchAll(/id="(btn\w+)"/g)) {
      const id = m[1];
      if (!t.includes(`'${id}'`) && !t.includes(`"${id}"`))
        out.issues.push(`botón ${id} declarado en el HUD pero nunca cableado`);
      else if (!wired.has(id) && !new RegExp(`\\b\\w+\\s*\\(\\s*${id}\\b`).test(t))
        out.unverifiable.push(`handler de ${id}: cableado en un estilo que no reconozco`);
    }
    if (!/addEventListener\(\s*'resize'/.test(t)) out.issues.push('sin handler de resize');
  }

  // ---- HANDBOOK §3.1: near-binary metalness ---------------------------------------------------
  // Banda 0.06-0.84. §3.1 permite 0.85-1.0 (skidDark, coilFrame), así que 0.85 NO es hallazgo.
  for (const m of t.matchAll(/metalness:\s*(0\.\d+)/g)) {
    const v = parseFloat(m[1]);
    if (v >= 0.06 && v <= 0.84 && !specMetals.has(v))
      out.issues.push(`metalness intermedio ${v} que el design-spec no registra (§3.1)`);
  }
  return out;
}

const results = [];
for (const fam of families) {
  const fdir = join(ROOT, fam);
  if (!isDir(fdir)) { console.error(`(familia inexistente: ${fam})`); continue; }
  for (const slug of readdirSync(fdir).filter(s => isDir(join(fdir, s))).sort())
    results.push(lintAsset(fam, slug));
}

const bad = results.filter(r => r.issues.length);
const unk = results.filter(r => r.unverifiable.length);
for (const r of bad) {
  console.log(`── ${r.asset}`);
  const seen = new Set();
  for (const i of r.issues) {
    const k = i.replace(/\d+/g, 'N');
    if (seen.has(k) && !/metalness/.test(i)) continue;
    seen.add(k); console.log(`     ${i}`);
  }
}
for (const r of unk) for (const u of r.unverifiable) console.log(`?? ${r.asset}: ${u}`);
console.log(`\nlint estático: ${results.length} assets · ${bad.length} con hallazgos · ${unk.length} con algo no verificable`);
if (!bad.length) console.log('contrato de fuente OK (esto NO dice nada sobre la geometría: para eso están audit-asset / hole-probe / el PNG)');
process.exit(STRICT && bad.length ? 1 : 0);
