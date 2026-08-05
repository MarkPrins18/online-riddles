import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { StoryPack } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

export type UpsertPackInput = {
  slug: string;
  name: string;
  theme: string;
  isPublished?: boolean;
};

/** Insert-or-update by slug, so re-importing a pack updates its metadata. */
export async function upsertPack(
  supabase: Client,
  input: UpsertPackInput
): Promise<StoryPack> {
  const { data, error } = await supabase
    .from("story_packs")
    .upsert(
      {
        slug: input.slug,
        name: input.name,
        theme: input.theme,
        is_published: input.isPublished ?? false,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as StoryPack;
}

export async function getPackBySlug(
  supabase: Client,
  slug: string
): Promise<StoryPack | null> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as StoryPack | null;
}

export async function listPacksWithPuzzleCounts(
  supabase: Client
): Promise<Array<StoryPack & { puzzle_count: number }>> {
  const { data: packs, error } = await supabase
    .from("story_packs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!packs || packs.length === 0) return [];

  const { data: puzzles, error: puzzlesError } = await supabase
    .from("puzzles")
    .select("pack_id");

  if (puzzlesError) throw puzzlesError;

  const counts = new Map<string, number>();
  for (const row of puzzles ?? []) {
    counts.set(row.pack_id, (counts.get(row.pack_id) ?? 0) + 1);
  }

  return (packs as StoryPack[]).map((pack) => ({
    ...pack,
    puzzle_count: counts.get(pack.id) ?? 0,
  }));
}

/** Distinct themes across published packs, for theme-name suggestions when creating a pack. */
export async function getAvailableThemes(supabase: Client): Promise<string[]> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("theme")
    .eq("is_published", true);

  if (error) throw error;
  const themes = new Set((data ?? []).map((row) => row.theme));
  return [...themes].sort();
}

/** Distinct themes across published *official* packs only — the room-settings form's "Thema's" list, kept separate from community packs so it doesn't grow into an unreadable row as those pile up. */
export async function getOfficialThemes(supabase: Client): Promise<string[]> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("theme")
    .eq("is_published", true)
    .eq("is_community", false);

  if (error) throw error;
  const themes = new Set((data ?? []).map((row) => row.theme));
  return [...themes].sort();
}

export async function setPackPublished(
  supabase: Client,
  packId: string,
  isPublished: boolean
): Promise<void> {
  const { error } = await supabase
    .from("story_packs")
    .update({ is_published: isPublished })
    .eq("id", packId);

  if (error) throw error;
}
