import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type Client = SupabaseClient<Database>;

/** Adds a community pack to the caller's private shortlist. RLS requires a non-anonymous session. */
export async function addFavorite(supabase: Client, packId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("pack_favorites")
    .upsert({ pack_id: packId, user_id: userId }, { onConflict: "pack_id,user_id" });

  if (error) throw error;
}

/** Removes a pack from the caller's shortlist. */
export async function removeFavorite(supabase: Client, packId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("pack_favorites")
    .delete()
    .eq("pack_id", packId)
    .eq("user_id", userId);

  if (error) throw error;
}

/** The caller's favorited pack ids, for both the browse-page star state and the room-settings "Gebruik mijn favorieten" shortcut. */
export async function listFavoritePackIds(supabase: Client, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("pack_favorites")
    .select("pack_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.pack_id));
}
