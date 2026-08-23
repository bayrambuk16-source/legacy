/** Deterministik RNG (mulberry32) — sistemlere enjekte edilir, testlerde seed'lenir. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min, max) aralığında float. */
export const range = (r: Rng, min: number, max: number): number => min + r() * (max - min);
/** [0, n) aralığında tamsayı. */
export const int = (r: Rng, n: number): number => Math.floor(r() * n);
/** Yüzde şansı (0-100). */
export const chance = (r: Rng, percent: number): boolean => r() * 100 < percent;
