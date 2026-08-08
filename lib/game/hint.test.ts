import { describe, expect, it } from "vitest";
import type { Question } from "@/types/question";
import { HINT_DELAY_MS, getLastYesAt, shouldShowHint } from "./hint";

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: "q1",
    room_id: "room1",
    puzzle_id: "puzzle1",
    player_id: "player1",
    player_name: "Alice",
    text: "Is het een mens?",
    answer: null,
    answered_at: null,
    custom_response: null,
    is_best_question: false,
    round: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getLastYesAt", () => {
  it("falls back to the round start when there are no yes answers", () => {
    const questions = [makeQuestion({ answer: "no", answered_at: "2026-01-01T00:01:00.000Z" })];
    expect(getLastYesAt(questions, "2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("returns null when there are no yes answers and no round start", () => {
    expect(getLastYesAt([], null)).toBeNull();
  });

  it("ignores yes answers without an answered_at timestamp", () => {
    const questions = [makeQuestion({ answer: "yes", answered_at: null })];
    expect(getLastYesAt(questions, "2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("returns the most recent yes timestamp among several", () => {
    const questions = [
      makeQuestion({ id: "q1", answer: "yes", answered_at: "2026-01-01T00:01:00.000Z" }),
      makeQuestion({ id: "q2", answer: "yes", answered_at: "2026-01-01T00:05:00.000Z" }),
      makeQuestion({ id: "q3", answer: "no", answered_at: "2026-01-01T00:10:00.000Z" }),
    ];
    expect(getLastYesAt(questions, "2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:05:00.000Z"
    );
  });
});

describe("shouldShowHint", () => {
  it("never shows a hint when there is no reference timestamp", () => {
    expect(shouldShowHint(null, Date.now())).toBe(false);
  });

  it("stays hidden right up until the threshold", () => {
    const lastYesAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(lastYesAt).getTime() + HINT_DELAY_MS - 1;
    expect(shouldShowHint(lastYesAt, now)).toBe(false);
  });

  it("shows once the threshold has elapsed", () => {
    const lastYesAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(lastYesAt).getTime() + HINT_DELAY_MS;
    expect(shouldShowHint(lastYesAt, now)).toBe(true);
  });

  it("respects a custom threshold", () => {
    const lastYesAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(lastYesAt).getTime() + 1000;
    expect(shouldShowHint(lastYesAt, now, 500)).toBe(true);
    expect(shouldShowHint(lastYesAt, now, 2000)).toBe(false);
  });
});
