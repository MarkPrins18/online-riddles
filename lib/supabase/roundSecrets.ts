import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { RoundSecret } from "@/types/roundSecret";

type Client = SupabaseClient<Database>;

/** Host-only insert (see RLS) — assigns this round's secret saboteur. */
export async function assignSaboteur(
  supabase: Client,
  params: { roomId: string; round: number; saboteurId: string }
): Promise<void> {
  const { error } = await supabase.from("round_secrets").insert({
    room_id: params.roomId,
    round: params.round,
    saboteur_id: params.saboteurId,
  });

  if (error) throw error;
}

/**
 * Returns this round's secret — but only ever the caller's own row (if
 * they're the saboteur) or, once the accusation vote has closed, everyone's.
 * A plain empty result (not an error) means "not the saboteur, not revealed
 * yet, or no saboteur round this round" — the caller can't tell which.
 */
export async function getRoundSecret(
  supabase: Client,
  roomId: string,
  round: number
): Promise<RoundSecret | null> {
  const { data, error } = await supabase
    .from("round_secrets")
    .select("*")
    .eq("room_id", roomId)
    .eq("round", round)
    .maybeSingle();

  if (error) throw error;
  return data as RoundSecret | null;
}

/** Host-only (see RLS on close_accusation_vote) — tallies votes, applies scoring, reveals the saboteur. */
export async function closeAccusationVote(
  supabase: Client,
  roomId: string,
  round: number
): Promise<void> {
  const { error } = await supabase.rpc("close_accusation_vote", {
    room_id_input: roomId,
    round_input: round,
  });

  if (error) throw error;
}
