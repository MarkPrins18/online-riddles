import { describe, expect, it } from "vitest";
import type { RoundAccusation } from "@/types/roundAccusation";
import {
  ACCUSATION_WINDOW_SECONDS,
  didVoteCorrectly,
  isAccusationTimeUp,
  nextRoundCountdownAnchor,
  secondsUntilAccusationCloses,
  tallyAccusationVotes,
  wasSaboteurIdentified,
} from "./accusation";

function makeAccusation(overrides: Partial<RoundAccusation>): RoundAccusation {
  return {
    id: "a1",
    room_id: "room1",
    round: 1,
    voter_id: "voter1",
    target_id: "target1",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("secondsUntilAccusationCloses / isAccusationTimeUp", () => {
  it("returns null when there is no reveal timestamp", () => {
    expect(secondsUntilAccusationCloses(null, Date.now())).toBeNull();
    expect(isAccusationTimeUp(null, Date.now())).toBe(false);
  });

  it("counts down from the window length", () => {
    const revealedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(revealedAt).getTime() + 5_000;
    expect(secondsUntilAccusationCloses(revealedAt, now)).toBe(ACCUSATION_WINDOW_SECONDS - 5);
  });

  it("is time up once the window has elapsed", () => {
    const revealedAt = "2026-01-01T00:00:00.000Z";
    const now = new Date(revealedAt).getTime() + ACCUSATION_WINDOW_SECONDS * 1000;
    expect(isAccusationTimeUp(revealedAt, now)).toBe(true);
    expect(secondsUntilAccusationCloses(revealedAt, now)).toBe(0);
  });
});

describe("nextRoundCountdownAnchor", () => {
  it("returns the reveal time unchanged when no saboteur round applies", () => {
    const revealedAt = "2026-01-01T00:00:00.000Z";
    expect(nextRoundCountdownAnchor(revealedAt, false)).toBe(revealedAt);
  });

  it("pushes the anchor back by the accusation window when it applies", () => {
    const revealedAt = "2026-01-01T00:00:00.000Z";
    const anchor = nextRoundCountdownAnchor(revealedAt, true);
    expect(new Date(anchor as string).getTime()).toBe(
      new Date(revealedAt).getTime() + ACCUSATION_WINDOW_SECONDS * 1000
    );
  });

  it("passes through null", () => {
    expect(nextRoundCountdownAnchor(null, true)).toBeNull();
  });
});

describe("tallyAccusationVotes", () => {
  it("returns no accused player when there are no votes", () => {
    expect(tallyAccusationVotes([]).accusedPlayerId).toBeNull();
  });

  it("picks the player with strictly the most votes", () => {
    const votes = [
      makeAccusation({ id: "a1", target_id: "p1" }),
      makeAccusation({ id: "a2", target_id: "p1" }),
      makeAccusation({ id: "a3", target_id: "p2" }),
    ];
    expect(tallyAccusationVotes(votes).accusedPlayerId).toBe("p1");
  });

  it("treats a tie for first place as nobody identified", () => {
    const votes = [
      makeAccusation({ id: "a1", target_id: "p1" }),
      makeAccusation({ id: "a2", target_id: "p2" }),
    ];
    expect(tallyAccusationVotes(votes).accusedPlayerId).toBeNull();
  });

  it("reports vote counts per candidate", () => {
    const votes = [
      makeAccusation({ id: "a1", target_id: "p1" }),
      makeAccusation({ id: "a2", target_id: "p1" }),
      makeAccusation({ id: "a3", target_id: "p2" }),
    ];
    const { voteCounts } = tallyAccusationVotes(votes);
    expect(voteCounts.get("p1")).toBe(2);
    expect(voteCounts.get("p2")).toBe(1);
  });
});

describe("wasSaboteurIdentified", () => {
  it("is true when the plurality vote points at the actual saboteur", () => {
    const votes = [
      makeAccusation({ id: "a1", target_id: "sab" }),
      makeAccusation({ id: "a2", target_id: "sab" }),
      makeAccusation({ id: "a3", target_id: "innocent" }),
    ];
    expect(wasSaboteurIdentified(votes, "sab")).toBe(true);
  });

  it("is false when the plurality points elsewhere or ties", () => {
    const wrongGuess = [makeAccusation({ id: "a1", target_id: "innocent" })];
    expect(wasSaboteurIdentified(wrongGuess, "sab")).toBe(false);

    const tie = [
      makeAccusation({ id: "a1", target_id: "sab" }),
      makeAccusation({ id: "a2", target_id: "innocent" }),
    ];
    expect(wasSaboteurIdentified(tie, "sab")).toBe(false);
  });
});

describe("didVoteCorrectly", () => {
  it("checks a single vote against the actual saboteur", () => {
    expect(didVoteCorrectly(makeAccusation({ target_id: "sab" }), "sab")).toBe(true);
    expect(didVoteCorrectly(makeAccusation({ target_id: "innocent" }), "sab")).toBe(false);
  });
});
