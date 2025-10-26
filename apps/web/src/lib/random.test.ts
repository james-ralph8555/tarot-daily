import { describe, it, expect } from "vitest";
import { createRng, deterministicShuffle } from "./random";
import { tarotDeck } from "@daily-tarot/common";

describe("deterministicShuffle", () => {
  it("produces stable ordering for identical seeds", () => {
    const rngA = createRng("seed-123");
    const rngB = createRng("seed-123");
    const shuffleA = deterministicShuffle(tarotDeck, rngA).map((card) => card.id);
    const shuffleB = deterministicShuffle(tarotDeck, rngB).map((card) => card.id);
    expect(shuffleA).toEqual(shuffleB);
  });

  it("varies ordering for different seeds", () => {
    const rngA = createRng("seed-123");
    const rngB = createRng("seed-456");
    const shuffleA = deterministicShuffle(tarotDeck, rngA).map((card) => card.id).slice(0, 5);
    const shuffleB = deterministicShuffle(tarotDeck, rngB).map((card) => card.id).slice(0, 5);
    expect(shuffleA).not.toEqual(shuffleB);
  });
});
