import { describe, expect, it } from "vitest";
import type { Player } from "@/types/player";
import type { Question } from "@/types/question";
import { gameReducer, initialGameState } from "./reducer";

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: "p1",
    room_id: "room1",
    user_id: null,
    name: "Alice",
    is_narrator: false,
    score: 0,
    is_host: false,
    is_spectator: false,
    joined_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    id: "q1",
    room_id: "room1",
    puzzle_id: "puzzle1",
    player_id: "p1",
    player_name: "Alice",
    text: "?",
    answer: null,
    answered_at: null,
    custom_response: null,
    is_best_question: false,
    round: 1,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("gameReducer", () => {
  it("returns unchanged state for an unknown action type", () => {
    // @ts-expect-error deliberately invalid action to exercise the default branch
    expect(gameReducer(initialGameState, { type: "NOPE" })).toBe(initialGameState);
  });

  it("HYDRATE merges the partial payload into state", () => {
    const player = makePlayer({});
    const next = gameReducer(initialGameState, {
      type: "HYDRATE",
      payload: { players: [player] },
    });
    expect(next.players).toEqual([player]);
    expect(next.room).toBeNull();
  });

  it("PLAYER_JOINED appends a new player but is idempotent for duplicates", () => {
    const player = makePlayer({ id: "p1" });
    const withPlayer = gameReducer(initialGameState, {
      type: "PLAYER_JOINED",
      payload: player,
    });
    expect(withPlayer.players).toEqual([player]);

    const again = gameReducer(withPlayer, { type: "PLAYER_JOINED", payload: player });
    expect(again).toBe(withPlayer);
  });

  it("PLAYER_UPDATED replaces the matching player only", () => {
    const p1 = makePlayer({ id: "p1", score: 0 });
    const p2 = makePlayer({ id: "p2", score: 0 });
    const state = { ...initialGameState, players: [p1, p2] };
    const updated = { ...p1, score: 100 };
    const next = gameReducer(state, { type: "PLAYER_UPDATED", payload: updated });
    expect(next.players).toEqual([updated, p2]);
  });

  it("PLAYER_LEFT removes the matching player", () => {
    const p1 = makePlayer({ id: "p1" });
    const p2 = makePlayer({ id: "p2" });
    const state = { ...initialGameState, players: [p1, p2] };
    const next = gameReducer(state, {
      type: "PLAYER_LEFT",
      payload: { playerId: "p1" },
    });
    expect(next.players).toEqual([p2]);
  });

  it("QUESTIONS_RELOADED replaces the whole list", () => {
    const state = { ...initialGameState, questions: [makeQuestion({ id: "old" })] };
    const fresh = [makeQuestion({ id: "new" })];
    const next = gameReducer(state, { type: "QUESTIONS_RELOADED", payload: fresh });
    expect(next.questions).toEqual(fresh);
  });

  it("QUESTION_ASKED appends and QUESTION_ANSWERED updates in place", () => {
    const asked = gameReducer(initialGameState, {
      type: "QUESTION_ASKED",
      payload: makeQuestion({ id: "q1", answer: null }),
    });
    expect(asked.questions).toHaveLength(1);

    const answered = gameReducer(asked, {
      type: "QUESTION_ANSWERED",
      payload: makeQuestion({ id: "q1", answer: "yes" }),
    });
    expect(answered.questions[0].answer).toBe("yes");
  });

  it("CASE_LOGGED is idempotent for duplicate entries", () => {
    const entry = {
      id: "c1",
      room_id: "room1",
      round: 1,
      puzzle_title: "De zaak",
      difficulty: "easy" as const,
      outcome: "solved" as const,
      solver_name: "Alice",
      narrator_name: "Bob",
      questions_asked: 5,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const first = gameReducer(initialGameState, { type: "CASE_LOGGED", payload: entry });
    expect(first.caseLog).toEqual([entry]);
    const second = gameReducer(first, { type: "CASE_LOGGED", payload: entry });
    expect(second).toBe(first);
  });

  it("PRESENCE_SYNCED replaces the online player id set", () => {
    const next = gameReducer(initialGameState, {
      type: "PRESENCE_SYNCED",
      payload: new Set(["p1", "p2"]),
    });
    expect(next.onlinePlayerIds).toEqual(new Set(["p1", "p2"]));
  });

  it("ERROR sets the error message", () => {
    const next = gameReducer(initialGameState, { type: "ERROR", payload: "oeps" });
    expect(next.error).toBe("oeps");
  });
});
