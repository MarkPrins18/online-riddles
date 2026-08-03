import type { Question } from "@/types/question";

export const HINT_DELAY_MS = 3 * 60 * 1000;

/**
 * The moment the silence-timer should count from: the last confirmed (YES)
 * answer, or the start of the round if nobody has gotten a YES yet.
 */
export function getLastYesAt(
  questions: Question[],
  roundStartedAt: string | null
): string | null {
  const yesTimestamps = questions
    .filter((q) => q.answer === "yes" && q.answered_at)
    .map((q) => q.answered_at as string);

  if (yesTimestamps.length === 0) return roundStartedAt;
  return yesTimestamps.reduce((latest, ts) => (ts > latest ? ts : latest));
}

export function shouldShowHint(
  lastYesAt: string | null,
  now: number,
  thresholdMs: number = HINT_DELAY_MS
): boolean {
  if (!lastYesAt) return false;
  return now - new Date(lastYesAt).getTime() >= thresholdMs;
}
