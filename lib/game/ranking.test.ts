import { describe, expect, it } from "vitest";
import { medalForRank } from "./ranking";

describe("medalForRank", () => {
  it("returns the correct medal for the top three ranks", () => {
    expect(medalForRank(0)).toBe("🥇");
    expect(medalForRank(1)).toBe("🥈");
    expect(medalForRank(2)).toBe("🥉");
  });

  it("returns null outside the top three", () => {
    expect(medalForRank(3)).toBeNull();
    expect(medalForRank(100)).toBeNull();
  });
});
