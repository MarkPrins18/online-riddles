import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { StoryPack } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

export type UpsertPackInput = {
  slug: string;
  name: string;
  theme: string;
  isPublished?: boolean;
  /** Language `name` is written in. Defaults to Dutch, matching every existing pack file. */
  locale?: string;
};

type RawStoryPackRow = {
  id: string;
  slug: string;
  theme: string;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
  is_community: boolean;
};

/**
 * Joins bare `story_packs` rows (no `name` — that never lived there) against
 * their translations, resolved for `locale` with a fallback to whatever
 * translation the pack *does* have (first Dutch, then anything) — same
 * pattern as lib/supabase/puzzles.ts's hydratePuzzles.
 */
export async function hydrateStoryPacks(
  supabase: Client,
  rows: RawStoryPackRow[],
  locale: string
): Promise<StoryPack[]> {
  if (rows.length === 0) return [];

  const { data: translations, error } = await supabase
    .from("story_pack_translations")
    .select("pack_id, locale, name")
    .in(
      "pack_id",
      rows.map((r) => r.id)
    );
  if (error) throw error;

  const translationsByPack = new Map<string, Array<{ pack_id: string; locale: string; name: string }>>();
  for (const row of translations ?? []) {
    const list = translationsByPack.get(row.pack_id) ?? [];
    list.push(row);
    translationsByPack.set(row.pack_id, list);
  }

  return rows.flatMap((row) => {
    const candidates = translationsByPack.get(row.id) ?? [];
    const translation =
      candidates.find((t) => t.locale === locale) ??
      candidates.find((t) => t.locale === "nl") ??
      candidates[0] ??
      null;
    if (!translation) return [];

    return [
      {
        id: row.id,
        slug: row.slug,
        name: translation.name,
        theme: row.theme,
        is_published: row.is_published,
        created_at: row.created_at,
        created_by: row.created_by,
        is_community: row.is_community,
        locale: translation.locale,
      },
    ];
  });
}

/** Insert-or-update by slug, so re-importing a pack updates its metadata (including its translated name). */
export async function upsertPack(supabase: Client, input: UpsertPackInput): Promise<StoryPack> {
  const locale = input.locale ?? "nl";

  const { data: pack, error } = await supabase
    .from("story_packs")
    .upsert(
      { slug: input.slug, theme: input.theme, is_published: input.isPublished ?? false },
      { onConflict: "slug" }
    )
    .select("*")
    .single();

  if (error) throw error;

  const { error: translationError } = await supabase
    .from("story_pack_translations")
    .upsert({ pack_id: pack.id, locale, name: input.name, status: "reviewed" }, { onConflict: "pack_id,locale" });

  if (translationError) throw translationError;

  const hydrated = await hydrateStoryPacks(supabase, [pack], locale);
  return hydrated[0];
}

export async function getPackBySlug(supabase: Client, slug: string, locale: string): Promise<StoryPack | null> {
  const { data, error } = await supabase.from("story_packs").select("*").eq("slug", slug).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const hydrated = await hydrateStoryPacks(supabase, [data], locale);
  return hydrated[0] ?? null;
}

export async function listPacksWithPuzzleCounts(
  supabase: Client,
  locale: string
): Promise<Array<StoryPack & { puzzle_count: number }>> {
  const { data: packs, error } = await supabase
    .from("story_packs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!packs || packs.length === 0) return [];

  const { data: puzzles, error: puzzlesError } = await supabase.from("puzzles").select("pack_id");

  if (puzzlesError) throw puzzlesError;

  const counts = new Map<string, number>();
  for (const row of puzzles ?? []) {
    counts.set(row.pack_id, (counts.get(row.pack_id) ?? 0) + 1);
  }

  const hydrated = await hydrateStoryPacks(supabase, packs, locale);
  return hydrated.map((pack) => ({
    ...pack,
    puzzle_count: counts.get(pack.id) ?? 0,
  }));
}

/** Distinct themes across published packs, for theme-name suggestions when creating a pack. Theme is never translated (see schema.sql), so this needs no locale. */
export async function getAvailableThemes(supabase: Client): Promise<string[]> {
  const { data, error } = await supabase.from("story_packs").select("theme").eq("is_published", true);

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

export async function setPackPublished(supabase: Client, packId: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from("story_packs").update({ is_published: isPublished }).eq("id", packId);

  if (error) throw error;
}

/**
 * Adds (or updates) a pack's name in one language, without touching its
 * other translations — used by the translate-puzzles script to attach an
 * English name to an already-imported (Dutch) pack.
 */
export async function translatePackName(
  supabase: Client,
  packId: string,
  locale: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from("story_pack_translations")
    .upsert({ pack_id: packId, locale, name, status: "machine" }, { onConflict: "pack_id,locale" });

  if (error) throw error;
}
