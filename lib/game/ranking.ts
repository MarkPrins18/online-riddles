const MEDALS = ["🥇", "🥈", "🥉"];

/** Zero-indexed rank → medal emoji for the top 3, null otherwise. */
export function medalForRank(rank: number): string | null {
  return MEDALS[rank] ?? null;
}
