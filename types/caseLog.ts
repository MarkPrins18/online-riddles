import type { PuzzleDifficulty } from "./puzzle";

export type CaseOutcome = "solved" | "unsolved";

export type CaseLogEntry = {
  id: string;
  room_id: string;
  round: number;
  puzzle_title: string;
  difficulty: PuzzleDifficulty;
  outcome: CaseOutcome;
  solver_name: string | null;
  narrator_name: string | null;
  questions_asked: number;
  created_at: string;
};
