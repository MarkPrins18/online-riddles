import { describe, expect, it } from "vitest";
import type { ChatMessageReaction } from "@/types/chatMessageReaction";
import { summarizeReactions } from "./chatReactions";

function makeReaction(overrides: Partial<ChatMessageReaction>): ChatMessageReaction {
  return {
    id: "r1",
    room_id: "room1",
    message_id: "msg1",
    player_id: "player1",
    emoji: "👍",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeReactions", () => {
  it("returns nothing for a message with no reactions", () => {
    expect(summarizeReactions([], "msg1", "player1")).toEqual([]);
  });

  it("ignores reactions on other messages", () => {
    const reactions = [makeReaction({ message_id: "other-msg" })];
    expect(summarizeReactions(reactions, "msg1", "player1")).toEqual([]);
  });

  it("counts reactions per emoji and flags the caller's own", () => {
    const reactions = [
      makeReaction({ id: "r1", emoji: "👍", player_id: "alice" }),
      makeReaction({ id: "r2", emoji: "👍", player_id: "bob" }),
      makeReaction({ id: "r3", emoji: "😂", player_id: "bob" }),
    ];
    expect(summarizeReactions(reactions, "msg1", "alice")).toEqual([
      { emoji: "👍", count: 2, reactedByMe: true },
      { emoji: "😂", count: 1, reactedByMe: false },
    ]);
  });

  it("orders emoji by first use, not by count", () => {
    const reactions = [
      makeReaction({ id: "r1", emoji: "😱", player_id: "alice" }),
      makeReaction({ id: "r2", emoji: "👍", player_id: "bob" }),
      makeReaction({ id: "r3", emoji: "👍", player_id: "carol" }),
    ];
    expect(summarizeReactions(reactions, "msg1", "dave").map((s) => s.emoji)).toEqual([
      "😱",
      "👍",
    ]);
  });
});
