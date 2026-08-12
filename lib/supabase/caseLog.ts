import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { CaseLogEntry, CaseOutcome } from "@/types/caseLog";
import type { PuzzleDifficulty } from "@/types/puzzle";

type Client = SupabaseClient<Database>;

const UNIQUE_VIOLATION = "23505";

/**
 * Records how a round ended — the "zaken-archief" entry. Guarded by a
 * (room_id, round) unique constraint and silently no-ops on a duplicate,
 * so a rare double-trigger (e.g. two guesses resolving a round back to
 * back) can't crash the flow or produce two entries for one round.
 */
export async function logCaseOutcome(
  supabase: Client,
  entry: {
    roomId: string;
    round: number;
    puzzleTitle: string;
    difficulty: PuzzleDifficulty;
    outcome: CaseOutcome;
    solverName: string | null;
    narratorName: string | null;
    // Nullable, separate from the display-only names above — feeds the
    // case_log_stats trigger (see schema.sql) that credits rounds_solved/
    // rounds_narrated on player_stats. Left undefined by any caller that
    // doesn't have this on hand rather than making it required, since a
    // missing id just means that round doesn't count toward stats instead
    // of failing the whole insert.
    solverUserId?: string | null;
    narratorUserId?: string | null;
    questionsAsked: number;
  }
): Promise<void> {
  const { error } = await supabase.from("case_log").insert({
    room_id: entry.roomId,
    round: entry.round,
    puzzle_title: entry.puzzleTitle,
    difficulty: entry.difficulty,
    outcome: entry.outcome,
    solver_name: entry.solverName,
    narrator_name: entry.narratorName,
    solver_user_id: entry.solverUserId ?? null,
    narrator_user_id: entry.narratorUserId ?? null,
    questions_asked: entry.questionsAsked,
  });

  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

export async function getCaseLogForRoom(
  supabase: Client,
  roomId: string
): Promise<CaseLogEntry[]> {
  const { data, error } = await supabase
    .from("case_log")
    .select("*")
    .eq("room_id", roomId)
    .order("round", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CaseLogEntry[];
}
