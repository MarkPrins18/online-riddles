import { describe, expect, it } from "vitest";
import { targetDifficultyForRound } from "./difficulty";

describe("targetDifficultyForRound", () => {
  it("returns medium when there's only one round", () => {
    expect(targetDifficultyForRound(0, 1)).toBe("medium");
  });

  it("skews easy early in the game", () => {
    expect(targetDifficultyForRound(0, 5)).toBe("easy");
  });

  it("skews medium in the middle of the game", () => {
    expect(targetDifficultyForRound(2, 5)).toBe("medium");
  });

  it("skews hard near the end of the game", () => {
    expect(targetDifficultyForRound(4, 5)).toBe("hard");
  });
});
