import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Question, QuestionAnswer } from "@/types/question";

type Client = SupabaseClient<Database>;

export async function askQuestion(
  supabase: Client,
  params: {
    roomId: string;
    puzzleId: string;
    playerId: string;
    playerName: string;
    text: string;
    round: number;
  }
): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .insert({
      room_id: params.roomId,
      puzzle_id: params.puzzleId,
      player_id: params.playerId,
      player_name: params.playerName,
      text: params.text,
      round: params.round,
      answer: null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Question;
}

export async function answerQuestion(
  supabase: Client,
  questionId: string,
  answer: Exclude<QuestionAnswer, "custom">
): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .update({ answer, custom_response: null, answered_at: new Date().toISOString() })
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw error;
  return data as Question;
}

export async function answerQuestionCustom(
  supabase: Client,
  questionId: string,
  responseText: string
): Promise<Question> {
  const { data, error } = await supabase
    .from("questions")
    .update({
      answer: "custom",
      custom_response: responseText,
      answered_at: new Date().toISOString(),
    })
    .eq("id", questionId)
    .select()
    .single();

  if (error) throw error;
  return data as Question;
}

export async function markBestQuestion(
  supabase: Client,
  roomId: string,
  round: number,
  questionId: string
): Promise<void> {
  const { error: clearError } = await supabase
    .from("questions")
    .update({ is_best_question: false })
    .eq("room_id", roomId)
    .eq("round", round);
  if (clearError) throw clearError;

  const { error: setError } = await supabase
    .from("questions")
    .update({ is_best_question: true })
    .eq("id", questionId);
  if (setError) throw setError;
}

export async function unmarkBestQuestion(
  supabase: Client,
  questionId: string
): Promise<void> {
  const { error } = await supabase
    .from("questions")
    .update({ is_best_question: false })
    .eq("id", questionId);
  if (error) throw error;
}

export async function getQuestionsForPuzzle(
  supabase: Client,
  roomId: string,
  puzzleId: string
): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("room_id", roomId)
    .eq("puzzle_id", puzzleId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Question[];
}

/** Every question asked this session (all rounds) — for the end-of-game recap. */
export async function getQuestionsForRoom(
  supabase: Client,
  roomId: string
): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Question[];
}
