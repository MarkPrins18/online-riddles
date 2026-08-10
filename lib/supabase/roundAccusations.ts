import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { RoundAccusation } from "@/types/roundAccusation";

type Client = SupabaseClient<Database>;

/** Casts (or changes) the caller's own vote for who they think the saboteur is. */
export async function castAccusationVote(
  supabase: Client,
  params: { roomId: string; round: number; voterId: string; targetId: string }
): Promise<RoundAccusation> {
  const { data, error } = await supabase
    .from("round_accusations")
    .upsert(
      {
        room_id: params.roomId,
        round: params.round,
        voter_id: params.voterId,
        target_id: params.targetId,
      },
      { onConflict: "room_id,round,voter_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as RoundAccusation;
}

/** Same "own row, or everyone once revealed" visibility as round_secrets (see RLS). */
export async function getRoundAccusations(
  supabase: Client,
  roomId: string,
  round: number
): Promise<RoundAccusation[]> {
  const { data, error } = await supabase
    .from("round_accusations")
    .select("*")
    .eq("room_id", roomId)
    .eq("round", round);

  if (error) throw error;
  return (data ?? []) as RoundAccusation[];
}
