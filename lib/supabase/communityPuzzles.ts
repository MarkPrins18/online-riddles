import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Puzzle, PuzzlePreview } from "@/types/puzzle";
import { hydratePuzzles } from "./puzzles";

type Client = SupabaseClient<Database>;

export type CommunityPuzzleInput = {
  packId: string;
  title: string;
  scenario: string;
  solution: string;
  categoryId?: string | null;
  difficulty: Puzzle["difficulty"];
  hint?: string | null;
  /** Language the submitter wrote this puzzle in. */
  locale: string;
};

/**
 * Submits a puzzle into one of the caller's own community packs. RLS
 * enforces ownership of the pack, a non-anonymous session, and the
 * per-hour rate limit; the moderation trigger rejects banned words.
 * `categoryId` must be an existing category (see listCategories) — RLS
 * blocks anyone but an admin from creating new ones. Inserts the shell
 * `puzzles` row and its one translation as two writes — not wrapped in a
 * single transaction (supabase-js has no client-side multi-statement
 * transaction), matching how the rest of this app already does sequential
 * multi-step writes (see e.g. StartGameButton).
 */
export async function createCommunityPuzzle(
  supabase: Client,
  userId: string,
  input: CommunityPuzzleInput
): Promise<Puzzle> {
  const { data: puzzle, error: puzzleError } = await supabase
    .from("puzzles")
    .insert({
      pack_id: input.packId,
      category_id: input.categoryId ?? null,
      difficulty: input.difficulty,
      is_community: true,
      created_by: userId,
    })
    .select("*")
    .single();

  if (puzzleError) throw puzzleError;

  const { error: translationError } = await supabase.from("puzzle_translations").insert({
    puzzle_id: puzzle.id,
    locale: input.locale,
    title: input.title,
    scenario: input.scenario,
    solution: input.solution,
    hint: input.hint ?? null,
    status: "reviewed",
  });

  if (translationError) throw translationError;

  const hydrated = await hydratePuzzles(supabase, [puzzle], input.locale, true);
  return hydrated[0];
}

/** Updates the shell row (category/difficulty) and the given locale's translation for a puzzle the caller owns. */
export async function updateOwnPuzzle(
  supabase: Client,
  puzzleId: string,
  locale: string,
  updates: Partial<Omit<CommunityPuzzleInput, "packId" | "locale">>
): Promise<Puzzle> {
  const { data: puzzle, error: puzzleError } = await supabase
    .from("puzzles")
    .update({
      ...(updates.categoryId !== undefined && { category_id: updates.categoryId }),
      ...(updates.difficulty !== undefined && { difficulty: updates.difficulty }),
    })
    .eq("id", puzzleId)
    .select("*")
    .single();

  if (puzzleError) throw puzzleError;

  if (
    updates.title !== undefined ||
    updates.scenario !== undefined ||
    updates.solution !== undefined ||
    updates.hint !== undefined
  ) {
    const { error: translationError } = await supabase
      .from("puzzle_translations")
      .update({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.scenario !== undefined && { scenario: updates.scenario }),
        ...(updates.solution !== undefined && { solution: updates.solution }),
        ...(updates.hint !== undefined && { hint: updates.hint }),
      })
      .eq("puzzle_id", puzzleId)
      .eq("locale", locale);

    if (translationError) throw translationError;
  }

  const hydrated = await hydratePuzzles(supabase, [puzzle], locale, true);
  return hydrated[0];
}

export async function deleteOwnPuzzle(supabase: Client, puzzleId: string): Promise<void> {
  const { error } = await supabase.from("puzzles").delete().eq("id", puzzleId);
  if (error) throw error;
}

/**
 * For public browsing (community pack detail page) — deliberately excludes
 * `solution` at the query level (via hydratePuzzles' includeSolution flag)
 * so nobody can spoil a riddle by reading the network response before
 * playing it. Use listOwnPuzzles for a creator managing their own content,
 * where seeing (and editing) the solution is the point.
 */
export async function listPuzzlesForPack(
  supabase: Client,
  packId: string,
  locale: string
): Promise<PuzzlePreview[]> {
  const { data, error } = await supabase
    .from("puzzles")
    .select("*")
    .eq("pack_id", packId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const hydrated = await hydratePuzzles(supabase, data ?? [], locale, false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop solution, hydratePuzzles fills it with "" when includeSolution is false
  return hydrated.map(({ solution, ...preview }) => preview);
}

export async function listOwnPuzzles(supabase: Client, userId: string, locale: string): Promise<Puzzle[]> {
  const { data, error } = await supabase
    .from("puzzles")
    .select("*")
    .eq("is_community", true)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return hydratePuzzles(supabase, data ?? [], locale, true);
}
