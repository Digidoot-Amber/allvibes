/**
 * A tiny seeded random number generator.
 *
 * Use this instead of Math.random() when you scatter things (flowers, stones,
 * leaves). It gives the same layout every time the page loads, which keeps the
 * world stable and avoids React hydration mismatches.
 */
export function makeRng(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Random float between min and max. */
export function range(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

/** Pick one item from a list. */
export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}
