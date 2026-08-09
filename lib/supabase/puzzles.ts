import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { Puzzle, PublishedPuzzle, PuzzleDifficulty } from "@/types/puzzle";
import { getVoteTotals } from "./votes";
import { resolveCategoryId } from "./categories";

type Client = SupabaseClient<Database>;

// A puzzle needs at least this many votes before its score is trusted for
// anything — below that, a couple of noisy votes (one grumpy friend, one
// biased upvote) would swing it unfairly, and a brand-new puzzle would
// otherwise never get drawn to collect votes in the first place. Only used
// to filter out a clear consensus of "this one's bad" (score at or below
// the threshold), not to boost highly-rated puzzles — with typical vote
// counts that ranking signal is too noisy to act on constructively.
const MIN_VOTES_TO_TRUST_SCORE = 5;
const BAD_SCORE_THRESHOLD = -3;

/**
 * Only pulls from packs that have been published — see published_puzzles
 * view. Excludes `excludeIds` (puzzles this room already played) so a
 * game night doesn't repeat a riddle everyone already knows the answer
 * to; falls back to the full pool once every puzzle has been used.
 * `officialThemes` restricts non-community puzzles to those pack themes
 * (empty = no restriction); `communityPackIds` restricts community puzzles
 * to those specific packs (null = every published community pack, [] =
 * none). `preferredDifficulty` further narrows the result to match the
 * round's target difficulty (see lib/game/difficulty.ts) — every filter
 * falls back to the wider pool if the narrowed set happens to be empty,
 * rather than blocking the game over a combination with zero puzzles.
 */
export async function getRandomPuzzle(
  supabase: Client,
  excludeIds: string[] = [],
  officialThemes: string[] = [],
  communityPackIds: string[] | null = null,
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
  const themeFiltered = puzzles.filter((p) =>
    p.is_community
      ? communityPackIds === null || communityPackIds.includes(p.pack_id)
      : officialThemes.length === 0 || officialThemes.includes(p.theme)
  );
  const themeCandidates = themeFiltered.length > 0 ? themeFiltered : puzzles;

  const difficultyFiltered = preferredDifficulty
    ? themeCandidates.filter((p) => p.difficulty === preferredDifficulty)
    : themeCandidates;
  const candidates = difficultyFiltered.length > 0 ? difficultyFiltered : themeCandidates;

  const voteTotals = await getVoteTotals(
    supabase,
    candidates.map((p) => p.id)
  );
  const wellRated = candidates.filter((p) => {
    const totals = voteTotals.get(p.id);
    if (!totals) return true;
    const voteCount = totals.upvotes + totals.downvotes;
    return voteCount < MIN_VOTES_TO_TRUST_SCORE || totals.score > BAD_SCORE_THRESHOLD;
  });
  const ratingFiltered = wellRated.length > 0 ? wellRated : candidates;

  const unplayed = ratingFiltered.filter((p) => !excludeIds.includes(p.id));
  const pool = unplayed.length > 0 ? unplayed : ratingFiltered;

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
 * (pack, title) pairs skips duplicates instead of erroring. Category names
 * are resolved (and created if new) via resolveCategoryId — only safe here
 * because this runs with the service-role key, which bypasses the RLS that
 * otherwise keeps `categories` admin-write-only.
 */
export async function insertPuzzles(
  supabase: Client,
  packId: string,
  puzzles: NewPuzzleInput[]
): Promise<number> {
  if (puzzles.length === 0) return 0;

  const categoryIds = new Map<string, string>();
  for (const p of puzzles) {
    if (p.category && !categoryIds.has(p.category)) {
      categoryIds.set(p.category, await resolveCategoryId(supabase, p.category));
    }
  }

  const { data, error } = await supabase
    .from("puzzles")
    .upsert(
      puzzles.map((p) => ({
        pack_id: packId,
        title: p.title,
        scenario: p.scenario,
        solution: p.solution,
        category_id: p.category ? (categoryIds.get(p.category) ?? null) : null,
        difficulty: p.difficulty,
        hint: p.hint ?? null,
      })),
      { onConflict: "pack_id,title", ignoreDuplicates: true }
    )
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}
