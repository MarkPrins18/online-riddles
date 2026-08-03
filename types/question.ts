export type QuestionAnswer = "yes" | "no" | "irrelevant" | "custom";

export type Question = {
  id: string;
  room_id: string;
  puzzle_id: string;
  player_id: string;
  player_name: string;
  text: string;
  answer: QuestionAnswer | null;
  answered_at: string | null;
  custom_response: string | null;
  is_best_question: boolean;
  round: number;
  created_at: string;
};
