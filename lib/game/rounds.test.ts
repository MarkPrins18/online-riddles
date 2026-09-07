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
  it("is true while below the last valid (0-indexed) round, false on/after it", () => {
    expect(hasMoreRounds(1)).toBe(true);
    // MAX_ROUNDS_PER_GAME - 1 is the *last* round for a game of that length
    // (rounds are 0-indexed) — there must be nothing after it.
    expect(hasMoreRounds(MAX_ROUNDS_PER_GAME - 2)).toBe(true);
    expect(hasMoreRounds(MAX_ROUNDS_PER_GAME - 1)).toBe(false);
    expect(hasMoreRounds(MAX_ROUNDS_PER_GAME)).toBe(false);
  });

  it("respects a custom max", () => {
    expect(hasMoreRounds(1, 3)).toBe(true);
    expect(hasMoreRounds(2, 3)).toBe(false);
    expect(hasMoreRounds(3, 3)).toBe(false);
  });

  // Regression for a real off-by-one: with 0-indexed rounds and a
  // host-configured count of N, exactly N rounds (indices 0..N-1) must be
  // played — not N+1. Simulates the full reveal -> hasMoreRounds ->
  // nextRoundNumber loop GamePlayClient runs after every reveal.
  it("drives exactly maxRounds rounds to completion, never one extra", () => {
    const maxRounds = 3;
    let round = 0;
    let roundsPlayed = 1; // round 0 is already "played" once the game starts
    while (hasMoreRounds(round, maxRounds)) {
      round = nextRoundNumber(round);
      roundsPlayed++;
    }
    expect(roundsPlayed).toBe(maxRounds);
    expect(round).toBe(maxRounds - 1);
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
