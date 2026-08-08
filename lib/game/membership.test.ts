import { describe, expect, it } from "vitest";
import type { Player } from "@/types/player";
import { pickNextHost, pickNarratorTakeoverElector, pickRandomOnlineCandidate } from "./membership";

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

describe("pickNextHost", () => {
  it("returns null when the current host is still online", () => {
    const players = [makePlayer({ id: "host" })];
    expect(pickNextHost(players, new Set(["host"]), "host")).toBeNull();
  });

  it("returns null when nobody else is online", () => {
    const players = [makePlayer({ id: "host" }), makePlayer({ id: "p2" })];
    expect(pickNextHost(players, new Set(), "host")).toBeNull();
  });

  it("picks the earliest-joined online, non-spectator candidate", () => {
    const players = [
      makePlayer({ id: "host", joined_at: "2026-01-01T00:00:00.000Z" }),
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
      makePlayer({ id: "p3", joined_at: "2026-01-01T00:01:00.000Z" }),
    ];
    expect(
      pickNextHost(players, new Set(["p2", "p3"]), "host")
    ).toEqual(expect.objectContaining({ id: "p3" }));
  });

  it("skips spectators even if they're online", () => {
    const players = [
      makePlayer({ id: "host" }),
      makePlayer({ id: "p2", is_spectator: true }),
      makePlayer({ id: "p3" }),
    ];
    expect(
      pickNextHost(players, new Set(["p2", "p3"]), "host")?.id
    ).toBe("p3");
  });
});

describe("pickNarratorTakeoverElector", () => {
  it("returns null when there is no narrator", () => {
    const players = [makePlayer({ id: "p1" })];
    expect(pickNarratorTakeoverElector(players, new Set(["p1"]), null)).toBeNull();
  });

  it("returns null when the narrator is still online", () => {
    const players = [makePlayer({ id: "narrator" })];
    expect(pickNarratorTakeoverElector(players, new Set(["narrator"]), "narrator")).toBeNull();
  });

  it("returns null when nobody else is online", () => {
    const players = [makePlayer({ id: "narrator" }), makePlayer({ id: "p2" })];
    expect(pickNarratorTakeoverElector(players, new Set(), "narrator")).toBeNull();
  });

  it("picks the earliest-joined online, non-spectator candidate", () => {
    const players = [
      makePlayer({ id: "narrator", joined_at: "2026-01-01T00:00:00.000Z" }),
      makePlayer({ id: "p2", joined_at: "2026-01-01T00:02:00.000Z" }),
      makePlayer({ id: "p3", joined_at: "2026-01-01T00:01:00.000Z" }),
    ];
    expect(
      pickNarratorTakeoverElector(players, new Set(["p2", "p3"]), "narrator")?.id
    ).toBe("p3");
  });

  it("skips spectators even if they're online", () => {
    const players = [
      makePlayer({ id: "narrator" }),
      makePlayer({ id: "p2", is_spectator: true }),
      makePlayer({ id: "p3" }),
    ];
    expect(
      pickNarratorTakeoverElector(players, new Set(["p2", "p3"]), "narrator")?.id
    ).toBe("p3");
  });
});

describe("pickRandomOnlineCandidate", () => {
  it("returns null when there are no online non-spectator candidates", () => {
    const players = [makePlayer({ id: "narrator" }), makePlayer({ id: "p2", is_spectator: true })];
    expect(
      pickRandomOnlineCandidate(players, new Set(["narrator", "p2"]), "narrator")
    ).toBeNull();
  });

  it("excludes the given id and spectators, and uses randomFn to pick deterministically", () => {
    const players = [
      makePlayer({ id: "narrator" }),
      makePlayer({ id: "p2" }),
      makePlayer({ id: "p3", is_spectator: true }),
      makePlayer({ id: "p4" }),
    ];
    const online = new Set(["narrator", "p2", "p3", "p4"]);

    expect(pickRandomOnlineCandidate(players, online, "narrator", () => 0)?.id).toBe("p2");
    expect(pickRandomOnlineCandidate(players, online, "narrator", () => 0.999)?.id).toBe("p4");
  });
});
