import { describe, expect, it } from "vitest";
import type { Player } from "@/types/player";
import {
  canAskQuestions,
  isNarrator,
  pickNextNarrator,
  resolveNarrator,
} from "./roles";

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

describe("pickNextNarrator", () => {
  it("returns null when there are no eligible players", () => {
    expect(pickNextNarrator([], null)).toBeNull();
    expect(
      pickNextNarrator([makePlayer({ is_spectator: true })], null)
    ).toBeNull();
  });

  it("picks the earliest joiner when there is no current narrator", () => {
    const players = [
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
      makePlayer({ id: "p1", joined_at: "2026-01-01T00:01:00.000Z" }),
    ];
    expect(pickNextNarrator(players, null)?.id).toBe("p1");
  });

  it("rotates to the next player in join order after the current narrator", () => {
    const players = [
      makePlayer({ id: "p1", joined_at: "2026-01-01T00:01:00.000Z" }),
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
      makePlayer({ id: "p3", joined_at: "2026-01-01T00:03:00.000Z" }),
    ];
    expect(pickNextNarrator(players, "p1")?.id).toBe("p2");
  });

  it("wraps back to the first player after the last one", () => {
    const players = [
      makePlayer({ id: "p1", joined_at: "2026-01-01T00:01:00.000Z" }),
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
    ];
    expect(pickNextNarrator(players, "p2")?.id).toBe("p1");
  });

  it("excludes spectators from the rotation", () => {
    const players = [
      makePlayer({ id: "p1", joined_at: "2026-01-01T00:01:00.000Z" }),
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z", is_spectator: true }),
      makePlayer({ id: "p3", joined_at: "2026-01-01T00:03:00.000Z" }),
    ];
    expect(pickNextNarrator(players, "p1")?.id).toBe("p3");
  });

  it("falls back to the first eligible player when the current narrator left", () => {
    const players = [
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
      makePlayer({ id: "p3", joined_at: "2026-01-01T00:03:00.000Z" }),
    ];
    expect(pickNextNarrator(players, "gone")?.id).toBe("p2");
  });
});

describe("resolveNarrator", () => {
  const players = [
    makePlayer({ id: "p1", joined_at: "2026-01-01T00:01:00.000Z" }),
    makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
  ];

  it("returns the explicitly chosen player in manual mode", () => {
    expect(
      resolveNarrator({ mode: "manual", playerId: "p2" }, players, "p1")?.id
    ).toBe("p2");
  });

  it("returns null when the manually chosen player doesn't exist", () => {
    expect(
      resolveNarrator({ mode: "manual", playerId: "missing" }, players, "p1")
    ).toBeNull();
  });

  it("falls back to rotation logic in auto mode", () => {
    expect(resolveNarrator({ mode: "auto" }, players, "p1")?.id).toBe("p2");
  });
});

describe("isNarrator / canAskQuestions", () => {
  const player = makePlayer({ id: "p1" });

  it("isNarrator is true only for a matching, non-null narratorId", () => {
    expect(isNarrator(player, "p1")).toBe(true);
    expect(isNarrator(player, "p2")).toBe(false);
    expect(isNarrator(player, null)).toBe(false);
  });

  it("canAskQuestions is the inverse of isNarrator", () => {
    expect(canAskQuestions(player, "p1")).toBe(false);
    expect(canAskQuestions(player, "p2")).toBe(true);
  });
});
