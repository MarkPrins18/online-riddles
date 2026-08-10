import { describe, expect, it } from "vitest";
import { isSingleEmoji } from "./emoji";

describe("isSingleEmoji", () => {
  it("accepts simple emoji", () => {
    expect(isSingleEmoji("👍")).toBe(true);
    expect(isSingleEmoji("😂")).toBe(true);
    expect(isSingleEmoji("🔥")).toBe(true);
  });

  it("accepts an emoji with a variation selector", () => {
    expect(isSingleEmoji("❤️")).toBe(true);
  });

  it("accepts an emoji with a skin-tone modifier", () => {
    expect(isSingleEmoji("👍🏽")).toBe(true);
  });

  it("accepts a ZWJ-joined family sequence", () => {
    expect(isSingleEmoji("👨‍👩‍👧‍👦")).toBe(true);
  });

  it("accepts a two-letter flag sequence", () => {
    expect(isSingleEmoji("🇳🇱")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isSingleEmoji("  👍  ")).toBe(true);
  });

  it("rejects plain text", () => {
    expect(isSingleEmoji("hallo")).toBe(false);
    expect(isSingleEmoji("a")).toBe(false);
  });

  it("rejects text mixed with an emoji", () => {
    expect(isSingleEmoji("ok👍")).toBe(false);
  });

  it("rejects more than one emoji", () => {
    expect(isSingleEmoji("😱😱")).toBe(false);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isSingleEmoji("")).toBe(false);
    expect(isSingleEmoji("   ")).toBe(false);
  });
});
