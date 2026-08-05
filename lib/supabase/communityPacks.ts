import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { StoryPack } from "@/types/puzzle";
import { getVoteTotals } from "./votes";

export type StoryPackWithScore = StoryPack & { score: number };

type Client = SupabaseClient<Database>;

// Combining diacritical marks (U+0300-U+036F) left behind by NFD
// normalization, stripped explicitly by code point to avoid depending on a
// literal non-ASCII character surviving file encoding round-trips.
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "pack"}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Creates a new community pack owned by the caller. Starts unpublished. */
export async function createOwnPack(
  supabase: Client,
  userId: string,
  name: string,
  theme: string
): Promise<StoryPack> {
  const { data, error } = await supabase
    .from("story_packs")
    .insert({
      slug: slugify(name),
      name,
      theme,
      is_published: false,
      is_community: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StoryPack;
}

/**
 * Every published community pack, for the browse page — each with `score`,
 * the summed vote score of its puzzles, so the caller can offer a
 * "populairste" sort alongside "nieuwste" without extra round trips.
 */
export async function listCommunityPacks(supabase: Client): Promise<StoryPackWithScore[]> {
  const { data: packs, error } = await supabase
    .from("story_packs")
    .select("*")
    .eq("is_community", true)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!packs || packs.length === 0) return [];

  const { data: puzzleRows, error: puzzleError } = await supabase
    .from("puzzles")
    .select("id, pack_id")
    .in(
      "pack_id",
      packs.map((p) => p.id)
    );
  if (puzzleError) throw puzzleError;

  const totals = await getVoteTotals(
    supabase,
    (puzzleRows ?? []).map((p) => p.id)
  );

  const scoreByPack = new Map<string, number>();
  for (const row of puzzleRows ?? []) {
    const score = totals.get(row.id)?.score ?? 0;
    scoreByPack.set(row.pack_id, (scoreByPack.get(row.pack_id) ?? 0) + score);
  }

  return (packs as StoryPack[]).map((pack) => ({
    ...pack,
    score: scoreByPack.get(pack.id) ?? 0,
  }));
}

/**
 * Just the count of published community packs, for the room-settings
 * "Community" section — deliberately a `head: true` count query instead of
 * fetching rows, since the picker only ever shows three options (alle/
 * favorieten/geen) and must stay cheap no matter how many packs exist.
 */
export async function countPublishedCommunityPacks(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("story_packs")
    .select("id", { count: "exact", head: true })
    .eq("is_community", true)
    .eq("is_published", true);

  if (error) throw error;
  return count ?? 0;
}

/** The caller's own community packs (published or not), for the "mijn" page. */
export async function listOwnPacks(supabase: Client, userId: string): Promise<StoryPack[]> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("*")
    .eq("is_community", true)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as StoryPack[];
}

export async function getOwnPack(supabase: Client, packId: string): Promise<StoryPack | null> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("*")
    .eq("id", packId)
    .maybeSingle();

  if (error) throw error;
  return data as StoryPack | null;
}

/** RLS only allows the pack's own creator to flip this. */
export async function setOwnPackPublished(
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
