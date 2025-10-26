import { createHash } from "node:crypto";

export type Rng = () => number;

export function createRng(seed: string): Rng {
  let state = createHash("sha256").update(seed).digest();
  let index = 0;
  return () => {
    if (index >= state.length) {
      state = createHash("sha256").update(state).digest();
      index = 0;
    }
    const value = state.readUInt32BE(index);
    index += 4;
    return value / 0xffffffff;
  };
}

export function deterministicShuffle<T>(input: readonly T[], rng: Rng): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
