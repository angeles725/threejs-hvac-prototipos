/**
 * Ported from: disenos/cinemex-hvac-lorawan/src/sim/seed.mjs (verbatim helper set).
 *
 * Shared deterministic-hash helpers for the equipment sim modules: FNV-1a string hash plus an
 * integer avalanche mix, so a (seed, key) pair always maps to the same unit value in [0, 1].
 * Copied instead of imported across design dirs (house rule: designs never import each other).
 */

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic unit interval for a (seed, key) pair — the simulation mixing chain. */
export function deterministicUnit(seed, key) {
  let value = (hashString(key) ^ Math.imul(seed + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 0xffffffff;
}

export const round = (value, digits = 1) => Number(value.toFixed(digits));
