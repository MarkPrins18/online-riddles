import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Puzzle, PublishedPuzzle, PuzzleDifficulty } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

/**
 * Only pulls from packs that have been published — see published_puzzles
 * view. Excludes `excludeIds` (puzzles this room already played) so a
 * game night doesn't repeat a riddle everyone already knows the answer
 * to; falls back to the full pool once every puzzle has been used.
 * `themes`, if given, restricts the pool to those pack themes, and
 * `preferredDifficulty` further narrows it to match the round's target
 * difficulty (see lib/game/difficulty.ts) — both fall back to the wider
 * pool if the narrowed set happens to be empty, rather than blocking the
 * game over a combination with zero puzzles.
 */
export async function getRandomPuzzle(
  supabase: Client,
  excludeIds: string[] = [],
  themes: string[] = [],
  preferredDifficulty?: PuzzleDifficulty
): Promise<Puzzle> {
  const { data, error } = await supabase
    .from("published_puzzles")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Geen gepubliceerde puzzels beschikbaar.");
  }

  const puzzles = data as PublishedPuzzle[];
  const themeFiltered =
    themes.length > 0 ? puzzles.filter((p) => themes.includes(p.theme)) : puzzles;
  const themeCandidates = themeFiltered.length > 0 ? themeFiltered : puzzles;

  const difficultyFiltered = preferredDifficulty
    ? themeCandidates.filter((p) => p.difficulty === preferredDifficulty)
    : themeCandidates;
  const candidates = difficultyFiltered.length > 0 ? difficultyFiltered : themeCandidates;

  const unplayed = candidates.filter((p) => !excludeIds.includes(p.id));
  const pool = unplayed.length > 0 ? unplayed : candidates;

  const picked = pool[Math.floor(Math.random() * pool.length)];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop theme, the only field published_puzzles adds over Puzzle
  const { theme, ...puzzle } = picked;
  return puzzle;
}

/**
 * Looks up a room's current puzzle via the get_room_puzzle RPC, which nulls
 * out the solution server-side unless the caller is the room's narrator or
 * the round has already been revealed — the client never receives the
 * solution it isn't allowed to see.
 */
export async function getRoomPuzzle(
  supabase: Client,
  roomId: string
): Promise<Puzzle | null> {
  const { data, error } = await supabase.rpc("get_room_puzzle", {
    room_id_input: roomId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

export type NewPuzzleInput = {
  title: string;
  scenario: string;
  solution: string;
  category?: string | null;
  difficulty: Puzzle["difficulty"];
  hint?: string | null;
};

/**
 * Bulk-imports puzzles into a pack. Idempotent: re-running with the same
 * (pack, title) pairs skips duplicates instead of erroring.
 */
export async function insertPuzzles(
  supabase: Client,
  packId: string,
  puzzles: NewPuzzleInput[]
): Promise<number> {
  if (puzzles.length === 0) return 0;

  const { data, error } = await supabase
    .from("puzzles")
    .upsert(
      puzzles.map((p) => ({
        pack_id: packId,
        title: p.title,
        scenario: p.scenario,
        solution: p.solution,
        category: p.category ?? null,
        difficulty: p.difficulty,
        hint: p.hint ?? null,
      })),
      { onConflict: "pack_id,title", ignoreDuplicates: true }
    )
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
