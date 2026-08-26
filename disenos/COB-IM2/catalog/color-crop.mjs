// catalog/color-crop.mjs — derive a colorTarget crop by PROJECTION, and refuse
// to certify one that is sitting on background.
//
// WHY THIS EXISTS
// A deltaE00Max is only as good as the pixels it is measured over, and a crop is
// the easy thing to get wrong because a wrong one looks fine. Measured on this
// catalog, one material drift (metalness 0.88 -> 0.60) reads:
//     projected crop, on the part       ΔE 6.79   <- caught at any sane threshold
//     hand-placed crop, 91% background  ΔE 1.01   <- invisible at every threshold
//     hue-scanned centroid, on backdrop ΔE 0.00   <- perfectly stable, meaningless
// The last one is the dangerous case: a rock-steady reading that certifies
// nothing. So the crop cannot be hand-authored or found by scanning for a
// colour — it is projected from the part's world position, and then checked.
//
// This is the kit's own §Active ledger rule made executable: "anchor a
// colorTarget crop by projecting the part's world position to pixels ... never
// by scanning the render for a hue. A low standard deviation proves the crop
// does not straddle an edge; it proves nothing about identity."
//
// Usage:
//   node catalog/color-crop.mjs <url> <partName>          emit + verify a crop
//   node catalog/color-crop.mjs <url> <partName> --json   machine-readable
import puppeteer from 'puppeteer-core';

const CHROME = '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const [url, partName] = process.argv.slice(2);
const JSON_OUT = process.argv.includes('--json');
if (!url || !partName) {
  console.error('usage: node catalog/color-crop.mjs <url> <partName> [--json]');
  process.exit(2);
}

// A crop is REJECTED unless the pixels under it actually belong to the subject.
// These are the two ways a crop lies: mostly-backdrop, and entirely-backdrop.
const MIN_SUBJECT_FRACTION = 0.60;   // at least this share must be the part
const BACKDROP_LUMA        = 90;     // below this is the dark board, not metal

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 720, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));

const result = await page.evaluate((name, minFrac, backdrop) => {
  if (typeof window.__parts !== 'function') {
    return { error: 'the page exposes no __parts() hook — a crop cannot be projected ' +
                    'without the part list, and hand-placing one is what this tool exists to prevent' };
  }
  const parts = window.__parts();
  const pk = parts.find(k => k.name === name || k.gen === name);
  if (!pk) return { error: `part not found: ${name}`, available: parts.map(k => k.name) };

  // Project INTERIOR sample points of the part's bounding box. Interior, not
  // corners: a corner projects onto the silhouette edge, where the crop
  // straddles part and backdrop and the mean is a blend of both.
  const box = new THREE.Box3().setFromObject(pk.mesh);
  const v = new THREE.Vector3(); const xs = [], ys = [];
  for (const fx of [0.4, 0.5, 0.6]) for (const fy of [0.45, 0.55]) for (const fz of [0.4, 0.5, 0.6]) {
    v.set(box.min.x + (box.max.x - box.min.x) * fx,
          box.min.y + (box.max.y - box.min.y) * fy,
          box.min.z + (box.max.z - box.min.z) * fz).project(camera);
    xs.push((v.x * 0.5 + 0.5) * innerWidth);
    ys.push((-v.y * 0.5 + 0.5) * innerHeight);
  }
  const crop = { x0: Math.round(Math.min(...xs)), x1: Math.round(Math.max(...xs)),
                 y0: Math.round(Math.min(...ys)), y1: Math.round(Math.max(...ys)) };
  if (crop.x1 - crop.x0 < 4 || crop.y1 - crop.y0 < 4) {
    return { error: 'projected crop is smaller than 4 px — the part is too small ' +
                    'at this framing to colour-gate; frame it closer or gate a bigger part', crop };
  }

  // Read the pixels back from the FRAMEBUFFER, not via drawImage(). A WebGL
  // canvas without preserveDrawingBuffer returns all-black to drawImage once the
  // frame is composited — which produced a confident "ON BACKGROUND" verdict for
  // a crop that was sitting correctly on the part. An instrument that reads black
  // no matter what rejects everything, which looks like strictness and is not.
  const gl = renderer.getContext();
  renderer.render(scene, camera);                 // guarantee a live buffer
  const dpr = renderer.getPixelRatio();
  const X0 = Math.round(crop.x0 * dpr);
  const W  = Math.max(1, Math.round((crop.x1 - crop.x0) * dpr));
  const H  = Math.max(1, Math.round((crop.y1 - crop.y0) * dpr));
  // readPixels' origin is BOTTOM-left; the projection above is top-left.
  const Y0 = Math.round(gl.drawingBufferHeight - crop.y1 * dpr);
  const buf = new Uint8Array(W * H * 4);
  gl.readPixels(X0, Y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  let sum = [0, 0, 0], subject = 0, n = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i], g2 = buf[i+1], b = buf[i+2];
    sum[0] += r; sum[1] += g2; sum[2] += b; n++;
    if ((r + g2 + b) / 3 >= backdrop) subject++;
  }
  const mean = sum.map(v => +(v / n).toFixed(2));
  const frac = subject / n;
  return { part: pk.name, generator: pk.gen, crop, dpr,
           crop_px: { w: W, h: H }, mean_srgb: mean,
           subject_fraction: +frac.toFixed(3),
           verdict: frac >= minFrac ? 'ON THE PART' : 'ON BACKGROUND' };
}, partName, MIN_SUBJECT_FRACTION, BACKDROP_LUMA);

await browser.close();

if (result.error) {
  console.error(`REJECTED — ${result.error}`);
  if (result.available) console.error('available parts: ' + result.available.join(', '));
  process.exit(1);
}
if (JSON_OUT) console.log(JSON.stringify(result, null, 1));
else {
  console.log(`part            ${result.part}  (${result.generator})`);
  console.log(`projected crop  x[${result.crop.x0}, ${result.crop.x1}] y[${result.crop.y0}, ${result.crop.y1}] css` +
              `  -> ${result.crop_px.w}x${result.crop_px.h} device px @ dpr ${result.dpr}`);
  console.log(`mean sRGB       [${result.mean_srgb.join(', ')}]`);
  console.log(`subject pixels  ${(result.subject_fraction * 100).toFixed(1)}%   (must be >= ${MIN_SUBJECT_FRACTION * 100}%)`);
  console.log(`verdict         ${result.verdict}`);
}
// FAIL LOUD. A crop sitting on the backdrop gives a rock-steady reading that
// certifies nothing, and a silent pass here would license exactly that.
if (result.verdict !== 'ON THE PART') {
  console.error('\nREJECTED — this crop measures the backdrop, not the material. ' +
                'A colorTarget written over it would be stable and meaningless.');
  process.exit(1);
}
