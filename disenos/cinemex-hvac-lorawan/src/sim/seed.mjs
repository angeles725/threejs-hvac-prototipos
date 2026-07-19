/**
 * Shared deterministic-hash helpers for the menu-data sim modules.
 *
 * Same convention as simulation.mjs (FNV-1a string hash + integer avalanche mix): a (seed, key)
 * pair always maps to the same unit value in [0, 1]. Re-declared here instead of exported from
 * simulation.mjs so the gated simulation file stays byte-untouched by this round.
 */

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic unit interval for a (seed, key) pair — the simulation.mjs mixing chain. */
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
