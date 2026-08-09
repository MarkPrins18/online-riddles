import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Puzzle, PuzzlePreview } from "@/types/puzzle";

const PREVIEW_COLUMNS =
  "id, pack_id, title, scenario, category_id, categories(name), difficulty, hint, created_at, created_by, is_community";

type Client = SupabaseClient<Database>;

export type CommunityPuzzleInput = {
  packId: string;
  title: string;
  scenario: string;
  solution: string;
  categoryId?: string | null;
  difficulty: Puzzle["difficulty"];
  hint?: string | null;
};

/**
 * Row shape of a `puzzles` select with an embedded `categories(name)` join —
 * `database.types.ts` doesn't declare FK relationships, so Supabase can't
 * infer this itself; every embedded select is cast to this shape by hand.
 */
type RawPuzzleWithCategory = Omit<Puzzle, "category"> & { categories: { name: string } | null };

/** Flattens the embedded `categories(name)` select into the flat `category` field the rest of the app expects. */
function withCategoryName(row: RawPuzzleWithCategory): Puzzle {
  const { categories, ...rest } = row;
  return { ...rest, category: categories?.name ?? null };
}

/**
 * Submits a puzzle into one of the caller's own community packs. RLS
 * enforces ownership of the pack, a non-anonymous session, and the
 * per-hour rate limit; the moderation trigger rejects banned words.
 * `categoryId` must be an existing category (see listCategories) — RLS
 * blocks anyone but an admin from creating new ones.
 */
export async function createCommunityPuzzle(
  supabase: Client,
  userId: string,
  input: CommunityPuzzleInput
): Promise<Puzzle> {
  const { data, error } = await supabase
    .from("puzzles")
    .insert({
      pack_id: input.packId,
      title: input.title,
      scenario: input.scenario,
      solution: input.solution,
      category_id: input.categoryId ?? null,
      difficulty: input.difficulty,
      hint: input.hint ?? null,
      is_community: true,
      created_by: userId,
    })
    .select("*, categories(name)")
    .single();

  if (error) throw error;
  return withCategoryName(data as unknown as RawPuzzleWithCategory);
}

export async function updateOwnPuzzle(
  supabase: Client,
  puzzleId: string,
  updates: Partial<CommunityPuzzleInput>
): Promise<Puzzle> {
  const { data, error } = await supabase
    .from("puzzles")
    .update({
      ...(updates.title !== undefined && { title: updates.title }),
      ...(updates.scenario !== undefined && { scenario: updates.scenario }),
      ...(updates.solution !== undefined && { solution: updates.solution }),
      ...(updates.categoryId !== undefined && { category_id: updates.categoryId }),
      ...(updates.difficulty !== undefined && { difficulty: updates.difficulty }),
      ...(updates.hint !== undefined && { hint: updates.hint }),
    })
    .eq("id", puzzleId)
    .select("*, categories(name)")
    .single();

  if (error) throw error;
  return withCategoryName(data as unknown as RawPuzzleWithCategory);
}

export async function deleteOwnPuzzle(supabase: Client, puzzleId: string): Promise<void> {
  const { error } = await supabase.from("puzzles").delete().eq("id", puzzleId);
  if (error) throw error;
}

/**
 * For public browsing (community pack detail page) — deliberately excludes
 * `solution` so nobody can spoil a riddle by reading the network response
 * before playing it. Use listOwnPuzzles for a creator managing their own
 * content, where seeing (and editing) the solution is the point.
 */
export async function listPuzzlesForPack(
  supabase: Client,
  packId: string
): Promise<PuzzlePreview[]> {
  const { data, error } = await supabase
    .from("puzzles")
    .select(PREVIEW_COLUMNS)
    .eq("pack_id", packId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as RawPuzzleWithCategory[]).map(
    withCategoryName
  ) as unknown as PuzzlePreview[];
}

export async function listOwnPuzzles(supabase: Client, userId: string): Promise<Puzzle[]> {
  const { data, error } = await supabase
    .from("puzzles")
    .select("*, categories(name)")
    .eq("is_community", true)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as RawPuzzleWithCategory[]).map(withCategoryName);
}
