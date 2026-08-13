import { describe, expect, it } from "vitest";
import { isKnownBoardCursor } from "./useBoardState";
import type { BoardCursor } from "@/types/boardCursor";

function cursor(playerId: string): BoardCursor {
  return { player_id: playerId, name: "Someone", x: 0.5, y: 0.5 };
}

describe("isKnownBoardCursor", () => {
  it("accepts a cursor from a known room member", () => {
    const known = new Set(["alice", "bob"]);
    expect(isKnownBoardCursor(cursor("bob"), known)).toBe(true);
  });

  it("rejects a cursor from a player_id not in the room", () => {
    const known = new Set(["alice", "bob"]);
    expect(isKnownBoardCursor(cursor("mallory"), known)).toBe(false);
  });

  it("rejects every cursor when the known set is empty", () => {
    expect(isKnownBoardCursor(cursor("alice"), new Set())).toBe(false);
  });
});
