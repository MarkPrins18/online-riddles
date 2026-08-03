import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Profile } from "@/types/profile";

type Client = SupabaseClient<Database>;

export async function getProfile(supabase: Client, userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

/** Bulk lookup for attribution ("door <naam>") on a list of packs/puzzles at once. */
export async function getProfiles(
  supabase: Client,
  userIds: string[]
): Promise<Map<string, Profile>> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.from("profiles").select("*").in("id", uniqueIds);

  if (error) throw error;
  return new Map((data as Profile[] ?? []).map((profile) => [profile.id, profile]));
}

/** Insert-or-update the caller's own profile — RLS only allows id = auth.uid(). */
export async function upsertProfile(
  supabase: Client,
  userId: string,
  displayName: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: displayName }, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
