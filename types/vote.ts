export type VoteValue = 1 | -1;

export type PuzzleVote = {
  id: string;
  puzzle_id: string;
  user_id: string;
  value: VoteValue;
  created_at: string;
};

/** Row shape of the puzzle_vote_totals view. */
export type PuzzleVoteTotals = {
  puzzle_id: string;
  upvotes: number;
  downvotes: number;
  score: number;
};
