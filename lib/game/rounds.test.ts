import { describe, expect, it } from "vitest";
import type { Question } from "@/types/question";
import {
  MAX_ROUNDS_PER_GAME,
  NEXT_ROUND_COUNTDOWN_SECONDS,
  countQuestionsAskedThisRound,
  getRoundDeadline,
  hasMoreRounds,
  isNextRoundTimeUp,
  isRoundTimeUp,
  nextRoundNumber,
  secondsUntilNextRound,
} from "./rounds";

function makeQuestion(round: number): Question {
  return {
    id: `q-${round}-${Math.random()}`,
    room_id: "room1",
    puzzle_id: "puzzle1",
    player_id: "player1",
    player_name: "Alice",
    text: "?",
    answer: null,
    answered_at: null,
    custom_response: null,
    is_best_question: false,
    round,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("hasMoreRounds", () => {
  it("is true below the max and false at/above it", () => {
    expect(hasMoreRounds(1)).toBe(true);
    expect(hasMoreRounds(MAX_ROUNDS_PER_GAME - 1)).toBe(true);
    expect(hasMoreRounds(MAX_ROUNDS_PER_GAME)).toBe(false);
  });

  it("respects a custom max", () => {
    expect(hasMoreRounds(2, 3)).toBe(true);
    expect(hasMoreRounds(3, 3)).toBe(false);
  });
});

describe("nextRoundNumber", () => {
  it("increments by one", () => {
    expect(nextRoundNumber(1)).toBe(2);
  });
});

describe("countQuestionsAskedThisRound", () => {
  it("counts only questions matching the given round", () => {
    const questions = [makeQuestion(1), makeQuestion(1), makeQuestion(2)];
    expect(countQuestionsAskedThisRound(questions, 1)).toBe(2);
    expect(countQuestionsAskedThisRound(questions, 2)).toBe(1);
    expect(countQuestionsAskedThisRound(questions, 3)).toBe(0);
  });
});

describe("getRoundDeadline / isRoundTimeUp", () => {
  it("returns null when there's no round start or no duration limit", () => {
    expect(getRoundDeadline(null, 60)).toBeNull();
    expect(getRoundDeadline("2026-01-01T00:00:00.000Z", null)).toBeNull();
  });

  it("computes the deadline as start + duration", () => {
    const start = "2026-01-01T00:00:00.000Z";
    expect(getRoundDeadline(start, 60)).toBe(new Date(start).getTime() + 60000);
  });

  it("flags time up only once the deadline has passed", () => {
    const start = "2026-01-01T00:00:00.000Z";
    const deadline = new Date(start).getTime() + 60000;
    expect(isRoundTimeUp(start, 60, deadline - 1)).toBe(false);
    expect(isRoundTimeUp(start, 60, deadline)).toBe(true);
  });

  it("is never time up when there's no duration limit", () => {
    expect(isRoundTimeUp("2026-01-01T00:00:00.000Z", null, Date.now())).toBe(false);
  });
});

describe("secondsUntilNextRound / isNextRoundTimeUp", () => {
  it("returns null when there's no reveal timestamp", () => {
    expect(secondsUntilNextRound(null, Date.now())).toBeNull();
    expect(isNextRoundTimeUp(null, Date.now())).toBe(false);
  });

  it("counts down whole seconds and floors at zero", () => {
    const revealedAt = "2026-01-01T00:00:00.000Z";
    const revealedMs = new Date(revealedAt).getTime();
    expect(secondsUntilNextRound(revealedAt, revealedMs)).toBe(
      NEXT_ROUND_COUNTDOWN_SECONDS
    );
    expect(
      secondsUntilNextRound(
        revealedAt,
        revealedMs + NEXT_ROUND_COUNTDOWN_SECONDS * 1000 + 5000
      )
    ).toBe(0);
  });

  it("flags time up once the countdown deadline passes", () => {
    const revealedAt = "2026-01-01T00:00:00.000Z";
    const deadline =
      new Date(revealedAt).getTime() + NEXT_ROUND_COUNTDOWN_SECONDS * 1000;
    expect(isNextRoundTimeUp(revealedAt, deadline - 1)).toBe(false);
    expect(isNextRoundTimeUp(revealedAt, deadline)).toBe(true);
  });
});
