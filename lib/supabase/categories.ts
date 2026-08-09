import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Category } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

/** Every category, for a picker (community submission form, admin import). */
export async function listCategories(supabase: Client): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

/**
 * Resolves a category name to its id, creating the category if it doesn't
 * exist yet. Only reachable with the service-role key (import script/admin
 * API) — RLS blocks anyone else from writing to `categories`, so community
 * submissions can only ever pick an existing id via listCategories.
 */
export async function resolveCategoryId(
  supabase: Client,
  name: string
): Promise<string> {
  const { data, error } = await supabase
    .from("categories")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
