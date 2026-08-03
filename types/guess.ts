export type GuessStatus = "pending" | "correct" | "incorrect";

export type Guess = {
  id: string;
  room_id: string;
  puzzle_id: string;
  player_id: string;
  player_name: string;
  text: string;
  status: GuessStatus;
  created_at: string;
};
