import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Hint } from "@/types/hint";

type Client = SupabaseClient<Database>;

/** Narrator-only, at their own initiative — no automatic hint exists. */
export async function sendHint(
  supabase: Client,
  params: {
    roomId: string;
    puzzleId: string;
    playerId: string;
    playerName: string;
    text: string;
    round: number;
  }
): Promise<Hint> {
  const { data, error } = await supabase
    .from("hints")
    .insert({
      room_id: params.roomId,
      puzzle_id: params.puzzleId,
      player_id: params.playerId,
      player_name: params.playerName,
      text: params.text,
      round: params.round,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Hint;
}

export async function getHintsForPuzzle(
  supabase: Client,
  roomId: string,
  puzzleId: string
): Promise<Hint[]> {
  const { data, error } = await supabase
    .from("hints")
    .select("*")
    .eq("room_id", roomId)
    .eq("puzzle_id", puzzleId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Hint[];
}
