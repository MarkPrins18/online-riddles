import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { PlayerStats } from "@/types/playerStats";

type Client = SupabaseClient<Database>;

/**
 * Null both when the caller has no stats row yet (upgraded but hasn't
 * finished a game since) and when they're still anonymous — RLS only lets
 * you read your own row (see schema.sql), so there's no way to distinguish
 * "not upgraded" from "upgraded, zero games" from this query alone; the
 * caller already knows which one it is from auth.getUser()'s is_anonymous.
 */
export async function getPlayerStats(supabase: Client, userId: string): Promise<PlayerStats | null> {
  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as PlayerStats | null;
}
