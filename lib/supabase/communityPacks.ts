import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { StoryPack } from "@/types/puzzle";
import { hydrateStoryPacks } from "./storyPacks";

export type StoryPackWithScore = StoryPack & { score: number };
export type CommunityPackSort = "new" | "top";

type Client = SupabaseClient<Database>;

export const COMMUNITY_PACKS_PAGE_SIZE = 12;

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
  theme: string,
  locale: string
): Promise<StoryPack> {
  const { data: pack, error } = await supabase
    .from("story_packs")
    .insert({
      slug: slugify(name),
      theme,
      is_published: false,
      is_community: true,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: translationError } = await supabase
    .from("story_pack_translations")
    .insert({ pack_id: pack.id, locale, name, status: "reviewed" });

  if (translationError) throw translationError;

  const hydrated = await hydrateStoryPacks(supabase, [pack], locale);
  return hydrated[0];
}

/**
 * One page of published community packs, for the browse page — sorted and
 * paginated in SQL (list_community_packs_newest/_top in schema.sql,
 * backed by pack_vote_totals), not by fetching the entire community
 * library's packs-and-puzzles-and-votes to sort/slice in JS the way this
 * used to. `offset`/`limit` are row counts, not page numbers, so the
 * caller can keep appending pages ("laad meer") without tracking a page
 * index. `hasMore` comes from asking for one extra row past `limit` and
 * checking whether it existed, rather than a separate count query.
 */
export async function listCommunityPacks(
  supabase: Client,
  locale: string,
  sort: CommunityPackSort,
  offset: number = 0,
  limit: number = COMMUNITY_PACKS_PAGE_SIZE
): Promise<{ packs: StoryPackWithScore[]; hasMore: boolean }> {
  const rpcName = sort === "top" ? "list_community_packs_top" : "list_community_packs_newest";
  const { data: ranked, error } = await supabase.rpc(rpcName, {
    limit_input: limit + 1,
    offset_input: offset,
  });
  if (error) throw error;
  if (!ranked || ranked.length === 0) return { packs: [], hasMore: false };

  const hasMore = ranked.length > limit;
  const page = ranked.slice(0, limit);
  const scoreById = new Map(page.map((row) => [row.id, row.score]));

  const { data: packs, error: packsError } = await supabase
    .from("story_packs")
    .select("*")
    .in(
      "id",
      page.map((row) => row.id)
    );
  if (packsError) throw packsError;

  const hydrated = await hydrateStoryPacks(supabase, packs ?? [], locale);
  const hydratedById = new Map(hydrated.map((pack) => [pack.id, pack]));

  // .in() doesn't preserve order — walk the RPC's already-sorted `page`
  // instead of `hydrated` so the SQL ordering survives into the response.
  const ordered = page
    .map((row) => hydratedById.get(row.id))
    .filter((pack): pack is StoryPack => !!pack)
    .map((pack) => ({ ...pack, score: scoreById.get(pack.id) ?? 0 }));

  return { packs: ordered, hasMore };
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
export async function listOwnPacks(supabase: Client, userId: string, locale: string): Promise<StoryPack[]> {
  const { data, error } = await supabase
    .from("story_packs")
    .select("*")
    .eq("is_community", true)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return hydrateStoryPacks(supabase, data ?? [], locale);
}

export async function getOwnPack(supabase: Client, packId: string, locale: string): Promise<StoryPack | null> {
  const { data, error } = await supabase.from("story_packs").select("*").eq("id", packId).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const hydrated = await hydrateStoryPacks(supabase, [data], locale);
  return hydrated[0] ?? null;
}

/** RLS only allows the pack's own creator to flip this. */
export async function setOwnPackPublished(supabase: Client, packId: string, isPublished: boolean): Promise<void> {
  const { error } = await supabase.from("story_packs").update({ is_published: isPublished }).eq("id", packId);

  if (error) throw error;
}
