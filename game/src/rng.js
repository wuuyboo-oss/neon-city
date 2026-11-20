// Neon Harbor — deterministic random numbers.
// The city layout uses a seeded generator so every run (and every
// screenshot) sees the same streets and buildings; gameplay randomness
// (traffic, pedestrians) uses Math.random and stays lively.
//
// mulberry32 is the generator: tiny, fast, and good enough for a city
// layout, where the point is reproducibility, not cryptography. The
// seed is fixed (20261117, or ?seed=) so the map never changes
// between runs.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One element of an array, uniformly. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

/** A float in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** An integer in [min, max] — both ends inclusive. */
export function rangeInt(random, min, max) {
  return Math.floor(range(random, min, max + 1));
}
