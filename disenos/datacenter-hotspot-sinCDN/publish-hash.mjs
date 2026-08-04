/**
 * publish-hash.mjs — pure cache-busting helpers for build-publish.mjs.
 *
 * Permanent cache-busting = the emitted mutable bundles/styles carry a content hash IN THEIR
 * FILENAME, and every HTML reference to them is rewritten to match. A byte change flips the hash,
 * so the filename changes, so a browser can never serve a stale bundle after a deploy — while the
 * hashed files themselves cache immutably (see publish/_headers, owned by the cinemex builder).
 *
 * SHARED-BY-COPY: this is a byte-identical copy of the cinemex sibling's publish-hash.mjs, exactly
 * as the two builders already mirror each other. Keep them in sync by hand — neither imports across
 * project roots.
 *
 * These functions are PURE (no fs, no globals) and unit-tested in tests/publish-hash.test.mjs.
 */
import { createHash } from 'node:crypto';

/** sha256 of the bytes, truncated to the first 8 hex chars — enough to bust a cache, short in a name. */
export function contentHash(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

/** `main` + `js` + `a1b2c3d4` -> `main.a1b2c3d4.js`. The hash sits between name and extension. */
export function hashedName(base, ext, hash) {
  return `${base}.${hash}.${ext}`;
}

/**
 * Rewrite one URL to its hashed name IF its basename is in `map`; otherwise return null (leave it).
 * Absolute URLs (the three CDN, Google Fonts) and protocol-relative URLs are always left alone.
 * A `?query` (e.g. a stale `?v=…` from an old manual patch) is DROPPED for mapped refs — the
 * content hash is the only cache key we want.
 */
function rewriteUrl(url, map) {
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(url) || url.startsWith('//')) return null;
  const queryAt = url.indexOf('?');
  const path = queryAt === -1 ? url : url.slice(0, queryAt);
  const slash = path.lastIndexOf('/');
  const prefix = slash === -1 ? '' : path.slice(0, slash + 1);
  const base = slash === -1 ? path : path.slice(slash + 1);
  const mapped = map[base];
  return mapped ? prefix + mapped : null;
}

/**
 * Rewrite `src="…"`, `href="…"` and `import('…')` references in an HTML string using `map`
 * ({ 'main.js': 'main.<hash>.js', … }). Only references whose basename is a map key change; the
 * `three` importmap entries, CDN font links and unhashed local assets pass through verbatim.
 * Any leftover `?v=` query strings are stripped as part of a mapped rewrite.
 */
export function rewriteRefs(html, map) {
  const REF_RE = /(\b(?:src|href)\s*=\s*)(["'])([^"']+)\2|(\bimport\s*\(\s*)(["'])([^"']+)\5(\s*\))/g;
  return html.replace(REF_RE, (match, attrPre, attrQuote, attrUrl, impPre, impQuote, impUrl, impSuffix) => {
    if (attrUrl !== undefined) {
      const rewritten = rewriteUrl(attrUrl, map);
      return rewritten === null ? match : `${attrPre}${attrQuote}${rewritten}${attrQuote}`;
    }
    const rewritten = rewriteUrl(impUrl, map);
    return rewritten === null ? match : `${impPre}${impQuote}${rewritten}${impQuote}${impSuffix}`;
  });
}
