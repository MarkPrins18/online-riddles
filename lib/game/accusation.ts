import type { RoundAccusation } from "@/types/roundAccusation";

/** How long the post-reveal "who was the saboteur?" vote stays open. */
export const ACCUSATION_WINDOW_SECONDS = 30;

function getAccusationDeadline(revealedAt: string | null): number | null {
  if (!revealedAt) return null;
  return new Date(revealedAt).getTime() + ACCUSATION_WINDOW_SECONDS * 1000;
}

/** Whole seconds remaining in the accusation vote, or null if it isn't running. */
export function secondsUntilAccusationCloses(revealedAt: string | null, now: number): number | null {
  const deadline = getAccusationDeadline(revealedAt);
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function isAccusationTimeUp(revealedAt: string | null, now: number): boolean {
  const deadline = getAccusationDeadline(revealedAt);
  return deadline !== null && now >= deadline;
}

/**
 * The "volgende ronde begint over..." countdown normally starts counting
 * from the reveal itself — but a saboteur round needs the accusation
 * window to run first, so the countdown's effective anchor is pushed back
 * by that window instead. Rounds without a saboteur are unaffected.
 */
export function nextRoundCountdownAnchor(
  revealedAt: string | null,
  saboteurRoundApplies: boolean
): string | null {
  if (!revealedAt || !saboteurRoundApplies) return revealedAt;
  return new Date(new Date(revealedAt).getTime() + ACCUSATION_WINDOW_SECONDS * 1000).toISOString();
}

export type AccusationTally = {
  /** The player with strictly the most votes, or null on a tie/no votes — a tie means nobody was identified. */
  accusedPlayerId: string | null;
  voteCounts: Map<string, number>;
};

export function tallyAccusationVotes(accusations: RoundAccusation[]): AccusationTally {
  const voteCounts = new Map<string, number>();
  for (const accusation of accusations) {
    voteCounts.set(accusation.target_id, (voteCounts.get(accusation.target_id) ?? 0) + 1);
  }

  let topCount = 0;
  let topCandidates: string[] = [];
  for (const [playerId, count] of voteCounts) {
    if (count > topCount) {
      topCount = count;
      topCandidates = [playerId];
    } else if (count === topCount) {
      topCandidates.push(playerId);
    }
  }

  return {
    accusedPlayerId: topCandidates.length === 1 ? topCandidates[0] : null,
    voteCounts,
  };
}

export function wasSaboteurIdentified(accusations: RoundAccusation[], saboteurId: string): boolean {
  return tallyAccusationVotes(accusations).accusedPlayerId === saboteurId;
}

export function didVoteCorrectly(accusation: RoundAccusation, saboteurId: string): boolean {
  return accusation.target_id === saboteurId;
}
