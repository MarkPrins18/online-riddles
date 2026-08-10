// A player's current vote for "who is the saboteur this round?" — only
// visible to its own voter until that round's round_secrets is revealed.
export type RoundAccusation = {
  id: string;
  room_id: string;
  round: number;
  voter_id: string;
  target_id: string;
  created_at: string;
};
