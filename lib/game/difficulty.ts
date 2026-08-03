import type { PuzzleDifficulty } from "@/types/puzzle";

/**
 * Ramps difficulty across the game night instead of pulling fully random
 * puzzles: early rounds skew easy, later rounds skew hard, so a session
 * has a shape (building tension) rather than random difficulty jumps.
 */
export function targetDifficultyForRound(
  round: number,
  maxRounds: number
): PuzzleDifficulty {
  if (maxRounds <= 1) return "medium";

  const progress = round / (maxRounds - 1);
  if (progress < 0.34) return "easy";
  if (progress < 0.75) return "medium";
  return "hard";
}
