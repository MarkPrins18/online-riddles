import type { Question } from "@/types/question";

export const MAX_ROUNDS_PER_GAME = 5;

export function hasMoreRounds(
  currentRound: number,
  maxRounds: number = MAX_ROUNDS_PER_GAME
): boolean {
  return currentRound < maxRounds;
}

export function nextRoundNumber(currentRound: number): number {
  return currentRound + 1;
}

export function countQuestionsAskedThisRound(
  questions: Question[],
  round: number
): number {
  return questions.filter((q) => q.round === round).length;
}

/** Epoch ms the round's time limit expires at, or null if there is no limit. */
export function getRoundDeadline(
  roundStartedAt: string | null,
  durationSeconds: number | null
): number | null {
  if (!roundStartedAt || durationSeconds === null) return null;
  return new Date(roundStartedAt).getTime() + durationSeconds * 1000;
}

export function isRoundTimeUp(
  roundStartedAt: string | null,
  durationSeconds: number | null,
  now: number
): boolean {
  const deadline = getRoundDeadline(roundStartedAt, durationSeconds);
  return deadline !== null && now >= deadline;
}

/** How long the "volgende ronde begint over..." countdown runs after a reveal. */
export const NEXT_ROUND_COUNTDOWN_SECONDS = 10;

function getNextRoundDeadline(revealedAt: string | null): number | null {
  if (!revealedAt) return null;
  return new Date(revealedAt).getTime() + NEXT_ROUND_COUNTDOWN_SECONDS * 1000;
}

/** Whole seconds remaining until the next round auto-starts, or null if not counting down. */
export function secondsUntilNextRound(revealedAt: string | null, now: number): number | null {
  const deadline = getNextRoundDeadline(revealedAt);
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function isNextRoundTimeUp(revealedAt: string | null, now: number): boolean {
  const deadline = getNextRoundDeadline(revealedAt);
  return deadline !== null && now >= deadline;
}
