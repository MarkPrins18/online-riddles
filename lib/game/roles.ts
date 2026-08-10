import type { Player } from "@/types/player";

/**
 * Determines who narrates next by rotating through players in join order.
 * The player after the current narrator gets the role; if there is no
 * current narrator (first round), the earliest joiner becomes narrator.
 */
export function pickNextNarrator(
  players: Player[],
  currentNarratorId: string | null
): Player | null {
  const eligible = players.filter((p) => !p.is_spectator);
  if (eligible.length === 0) return null;

  const ordered = [...eligible].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  );

  if (!currentNarratorId) return ordered[0];

  const currentIndex = ordered.findIndex((p) => p.id === currentNarratorId);
  if (currentIndex === -1) return ordered[0];

  return ordered[(currentIndex + 1) % ordered.length];
}

export type NarratorSelection = { mode: "auto" } | { mode: "manual"; playerId: string };

/**
 * Resolves a host's narrator choice: either an explicit player, or the
 * automatic rotation based on who narrated last.
 */
export function resolveNarrator(
  selection: NarratorSelection,
  players: Player[],
  currentNarratorId: string | null
): Player | null {
  if (selection.mode === "manual") {
    return players.find((p) => p.id === selection.playerId) ?? null;
  }
  return pickNextNarrator(players, currentNarratorId);
}

export function isNarrator(player: Player, narratorId: string | null): boolean {
  return narratorId !== null && player.id === narratorId;
}

export function canAskQuestions(player: Player, narratorId: string | null): boolean {
  return !isNarrator(player, narratorId);
}

// Below this many total (non-spectator) players there's only one possible
// rader left once the narrator is excluded — "secretly" assigning them as
// saboteur wouldn't be a secret at all, so saboteur mode simply doesn't run
// that round.
export const MIN_PLAYERS_FOR_SABOTEUR_MODE = 4;

export function canAssignSaboteur(players: Player[]): boolean {
  return players.filter((p) => !p.is_spectator).length >= MIN_PLAYERS_FOR_SABOTEUR_MODE;
}

/**
 * Picks a random rader (not the narrator, not a spectator) to secretly be
 * this round's saboteur. `randomFn` is injectable so tests can pin the
 * "random" pick instead of asserting on Math.random output.
 */
export function pickSaboteur(
  players: Player[],
  narratorId: string | null,
  randomFn: () => number = Math.random
): Player | null {
  const eligible = players.filter((p) => !p.is_spectator && p.id !== narratorId);
  if (eligible.length === 0) return null;
  return eligible[Math.floor(randomFn() * eligible.length)];
}
