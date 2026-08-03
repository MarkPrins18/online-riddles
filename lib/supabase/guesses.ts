import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Guess } from "@/types/guess";

type Client = SupabaseClient<Database>;

export async function submitGuess(
  supabase: Client,
  params: {
    roomId: string;
    puzzleId: string;
    playerId: string;
    playerName: string;
    text: string;
  }
): Promise<Guess> {
  const { data, error } = await supabase
    .from("guesses")
    .insert({
      room_id: params.roomId,
      puzzle_id: params.puzzleId,
      player_id: params.playerId,
      player_name: params.playerName,
      text: params.text,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Guess;
}

export async function reviewGuess(
  supabase: Client,
  guessId: string,
  status: "correct" | "incorrect"
): Promise<Guess> {
  const { data, error } = await supabase
    .from("guesses")
    .update({ status })
    .eq("id", guessId)
    .select()
    .single();

  if (error) throw error;
  return data as Guess;
}

export async function getGuessesForPuzzle(
  supabase: Client,
  roomId: string,
  puzzleId: string
): Promise<Guess[]> {
  const { data, error } = await supabase
    .from("guesses")
    .select("*")
    .eq("room_id", roomId)
    .eq("puzzle_id", puzzleId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Guess[];
}

/** Every guess submitted this session (all rounds) — for the end-of-game recap. */
export async function getGuessesForRoom(supabase: Client, roomId: string): Promise<Guess[]> {
  const { data, error } = await supabase
    .from("guesses")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Guess[];
}
