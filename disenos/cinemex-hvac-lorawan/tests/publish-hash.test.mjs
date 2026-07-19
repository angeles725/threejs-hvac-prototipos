/**
 * publish-hash.test.mjs — pure-function unit tests for the permanent cache-busting helpers used by
 * build-publish.mjs. RED-first: these are the contract for publish-hash.mjs. No builder is executed
 * here — only the pure functions (hash, name shape, HTML ref rewriting) are exercised.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentHash, hashedName, rewriteRefs } from '../publish-hash.mjs';

// ── contentHash ──────────────────────────────────────────────────────────────
test('contentHash is deterministic and returns 8 lowercase hex chars', () => {
  const a = contentHash(Buffer.from('hello world'));
  const b = contentHash(Buffer.from('hello world'));
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{8}$/);
});

test('contentHash changes when the content changes', () => {
  assert.notEqual(contentHash(Buffer.from('main-bundle-v1')), contentHash(Buffer.from('main-bundle-v2')));
});

test('contentHash treats an equivalent string and Buffer identically', () => {
  assert.equal(contentHash('abc'), contentHash(Buffer.from('abc')));
});

// ── hashedName ───────────────────────────────────────────────────────────────
test('hashedName produces base.<hash>.ext', () => {
  assert.equal(hashedName('main', 'js', 'a1b2c3d4'), 'main.a1b2c3d4.js');
  assert.equal(hashedName('styles', 'css', 'deadbeef'), 'styles.deadbeef.css');
  assert.equal(hashedName('dashboard', 'js', '00ff00ff'), 'dashboard.00ff00ff.js');
});

// ── rewriteRefs ──────────────────────────────────────────────────────────────
test('rewriteRefs rewrites the dynamic import() specifier to the hashed name', () => {
  const map = { 'main.js': 'main.a1b2c3d4.js' };
  const html = "import('./main.js').catch(showFatalApplicationError);";
  assert.equal(rewriteRefs(html, map), "import('./main.a1b2c3d4.js').catch(showFatalApplicationError);");
});

test('rewriteRefs rewrites src= and href= attribute references', () => {
  const map = { 'dashboard.js': 'dashboard.11111111.js', 'styles.css': 'styles.22222222.css' };
  const html = '<link rel="stylesheet" href="./styles.css"><script type="module" src="./dashboard.js"></script>';
  const out = rewriteRefs(html, map);
  assert.match(out, /href="\.\/styles\.22222222\.css"/);
  assert.match(out, /src="\.\/dashboard\.11111111\.js"/);
});

test('rewriteRefs strips a stale ?v= query string while rewriting a mapped ref', () => {
  const map = { 'main.js': 'main.abcd1234.js', 'styles.css': 'styles.99998888.css' };
  const html = '<link href="./styles.css?v=20260719a"><script>import(\'./main.js?v=20260719a\')</script>';
  const out = rewriteRefs(html, map);
  assert.ok(out.includes('./styles.99998888.css'), 'styles hashed');
  assert.ok(out.includes("import('./main.abcd1234.js')"), 'main hashed');
  assert.ok(!out.includes('?v='), 'stale version query must be stripped');
});

test('rewriteRefs leaves the three importmap / CDN URLs untouched', () => {
  const map = { 'main.js': 'main.a1b2c3d4.js' };
  const html = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>';
  assert.equal(rewriteRefs(html, map), html);
});

test('rewriteRefs leaves an absolute src= URL untouched', () => {
  const map = { 'main.js': 'main.a1b2c3d4.js' };
  const html = '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono">';
  assert.equal(rewriteRefs(html, map), html);
});

test('rewriteRefs leaves unmapped local references untouched', () => {
  const map = { 'main.js': 'main.a1b2c3d4.js' };
  const html = '<img src="./assets/cinemex-logo.png"><a href="dashboard.html">x</a><a href="/">home</a><a href="#viewer">skip</a>';
  assert.equal(rewriteRefs(html, map), html);
});

test('rewriteRefs preserves the ./ prefix and only swaps the basename', () => {
  const map = { 'main.js': 'main.deadbeef.js' };
  assert.equal(rewriteRefs('src="./main.js"', map), 'src="./main.deadbeef.js"');
});
