import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Puzzle, PuzzlePreview } from "@/types/puzzle";

const PREVIEW_COLUMNS =
  "id, pack_id, title, scenario, category, difficulty, hint, created_at, created_by, is_community";

type Client = SupabaseClient<Database>;

export type CommunityPuzzleInput = {
  packId: string;
  title: string;
  scenario: string;
  solution: string;
  category?: string | null;
  difficulty: Puzzle["difficulty"];
  hint?: string | null;
};

/**
 * Submits a puzzle into one of the caller's own community packs. RLS
 * enforces ownership of the pack, a non-anonymous session, and the
 * per-hour rate limit; the moderation trigger rejects banned words.
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
      category: input.category ?? null,
      difficulty: input.difficulty,
      hint: input.hint ?? null,
      is_community: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Puzzle;
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
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.difficulty !== undefined && { difficulty: updates.difficulty }),
      ...(updates.hint !== undefined && { hint: updates.hint }),
    })
    .eq("id", puzzleId)
    .select()
    .single();

  if (error) throw error;
  return data as Puzzle;
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
  return (data ?? []) as unknown as PuzzlePreview[];
}

export async function listOwnPuzzles(supabase: Client, userId: string): Promise<Puzzle[]> {
  const { data, error } = await supabase
    .from("puzzles")
    .select("*")
    .eq("is_community", true)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Puzzle[];
}
