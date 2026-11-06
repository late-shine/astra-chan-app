import type { RandomInt } from './types';

/** Mulberry32 integer stream with rejection sampling. No ambient randomness. */
export function seededRandom(seed: number): RandomInt {
  if (!Number.isSafeInteger(seed)) throw new RangeError('Seed must be an integer');
  let state = seed >>> 0;
  return max => {
    if (!Number.isInteger(max) || max < 1 || max > 0xffffffff) throw new RangeError('Invalid RNG bound');
    const limit = Math.floor(0x100000000 / max) * max;
    let value: number;
    do {
      state = (state + 0x6d2b79f5) >>> 0;
      let bits = Math.imul(state ^ (state >>> 15), 1 | state);
      bits ^= bits + Math.imul(bits ^ (bits >>> 7), 61 | bits);
      value = (bits ^ (bits >>> 14)) >>> 0;
    } while (value >= limit);
    return value % max;
  };
}
export function draw(rng: RandomInt, max: number): number {
  const value = rng(max);
  if (!Number.isInteger(value) || value < 0 || value >= max) throw new RangeError('RNG returned an invalid integer');
  return value;
}
export function shuffle<T>(items: readonly T[], rng: RandomInt): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = draw(rng, index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
