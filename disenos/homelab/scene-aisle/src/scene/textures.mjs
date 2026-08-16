// Procedural surface detail for the SCENE pass.
//
// DataTexture, not CanvasTexture: a canvas needs a DOM, and these have to be generatable in
// the headless suite as well as in the browser. Nothing is downloaded and nothing is read from
// disk — the offline-first rule applies to textures exactly as it applies to geometry.
//
// Everything here is DETERMINISTIC. Math.random() would make the floor grain reshuffle between
// captures, and two attempts that cannot be compared to each other cannot be judged against
// each other — the same reason the skyline is a fixed table.
import * as THREE from 'three';

// Integer hash, not a PRNG with hidden state: the value at (x, y) must not depend on the order
// the texels happen to be visited in.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

// The mean is stored on the texture because a colour map MULTIPLIES the material colour, so a
// guard that judges m.color alone reads a textured surface as brighter than it renders. Every
// generator here records what it actually does to the albedo.
function makeTexture(size, fill, { repeat = [1, 1], name = 'procedural' } = {}) {
  const data = new Uint8Array(size * size * 4);
  let sum = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = fill(x / size, y / size, x, y);
      const i = (y * size + x) * 4;
      data[i] = Math.round(r * 255); data[i + 1] = Math.round(g * 255);
      data[i + 2] = Math.round(b * 255); data[i + 3] = 255;
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.name = name;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  tex.userData.meanFactor = sum / (size * size);   // what this map does to the albedo
  return tex;
}

// site-01 and site-05 both show the aisle floor as LIGHT WOOD PLANK — long boards running down
// the length of the corridor with visible grain and dark seams. It is an office fit-out, not a
// raised access floor, and modelling 600 mm access tiles here would be importing a datacentre
// convention the photographs plainly contradict.
export function makePlankFloorTexture(planksPerTile = 6) {
  return makeTexture(256, (u, v) => {
    const plank = Math.floor(u * planksPerTile);
    const withinPlank = u * planksPerTile - plank;
    // Boards are staggered so the butt joints do not line up into a visible grid.
    const stagger = hash2(plank, 0) * 0.5;
    const along = (v + stagger) % 1;

    const grain = valueNoise(u * 34, (v + stagger) * 5) * 0.10
                + valueNoise(u * 120, (v + stagger) * 12) * 0.05;
    let shade = 0.88 + (hash2(plank, 7) - 0.5) * 0.09 + grain - 0.07;

    const edge = Math.min(withinPlank, 1 - withinPlank);
    if (edge < 0.018) shade *= 0.70;                     // seam between boards
    if (Math.abs(along - 0.5) > 0.494) shade *= 0.78;    // butt joint across the board
    return [shade * 1.00, shade * 0.975, shade * 0.945]; // warm, bone-coloured wood
  }, { repeat: [4, 8], name: 'plank_floor' });
}

// site-01: the lounge carpet is a loop pile in green-grey, laid in broad directional bands
// rather than a flat colour.
export function makeCarpetTexture() {
  return makeTexture(128, (u, v) => {
    const band = Math.sin(v * Math.PI * 6) * 0.045;
    const pile = valueNoise(u * 90, v * 90) * 0.16 + valueNoise(u * 200, v * 200) * 0.08;
    const shade = 0.84 + band + pile - 0.12;
    return [shade * 0.94, shade * 1.0, shade * 0.92];
  }, { repeat: [6, 5], name: 'lounge_carpet' });
}

// The translucent ceiling panels are not a flat emissive sheet — they are corrugated, and the
// ribs are what read as a panel rather than a light box.
export function makeCeilingPanelTexture() {
  return makeTexture(64, (u) => {
    const rib = 0.90 + Math.abs(Math.sin(u * Math.PI * 16)) * 0.10;
    return [rib, rib * 0.995, rib * 0.98];
  }, { repeat: [8, 1], name: 'ceiling_panel' });
}
