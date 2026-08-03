import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { PuzzleVoteTotals, VoteValue } from "@/types/vote";

type Client = SupabaseClient<Database>;

/** Casts or changes the caller's vote on a puzzle. RLS requires a non-anonymous session. */
export async function castVote(
  supabase: Client,
  puzzleId: string,
  userId: string,
  value: VoteValue
): Promise<void> {
  const { error } = await supabase
    .from("puzzle_votes")
    .upsert({ puzzle_id: puzzleId, user_id: userId, value }, { onConflict: "puzzle_id,user_id" });

  if (error) throw error;
}

/** Removes the caller's vote entirely (clicking the same direction again). */
export async function retractVote(
  supabase: Client,
  puzzleId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("puzzle_votes")
    .delete()
    .eq("puzzle_id", puzzleId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function getMyVote(
  supabase: Client,
  puzzleId: string,
  userId: string
): Promise<VoteValue | null> {
  const { data, error } = await supabase
    .from("puzzle_votes")
    .select("value")
    .eq("puzzle_id", puzzleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? null;
}

/** The caller's own votes across a set of puzzles at once, keyed by puzzle_id. */
export async function getMyVotes(
  supabase: Client,
  puzzleIds: string[],
  userId: string
): Promise<Map<string, VoteValue>> {
  if (puzzleIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("puzzle_votes")
    .select("puzzle_id, value")
    .in("puzzle_id", puzzleIds)
    .eq("user_id", userId);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.puzzle_id, row.value]));
}

/** Vote totals keyed by puzzle_id, for a set of puzzles at once (e.g. a pack's list). */
export async function getVoteTotals(
  supabase: Client,
  puzzleIds: string[]
): Promise<Map<string, PuzzleVoteTotals>> {
  if (puzzleIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("puzzle_vote_totals")
    .select("*")
    .in("puzzle_id", puzzleIds);

  if (error) throw error;
  return new Map((data as PuzzleVoteTotals[] ?? []).map((row) => [row.puzzle_id, row]));
}
