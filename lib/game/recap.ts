import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getCaseLogForRoom } from "@/lib/supabase/caseLog";
import { getGuessesForRoom } from "@/lib/supabase/guesses";
import { getQuestionsForRoom } from "@/lib/supabase/questions";

type Client = SupabaseClient<Database>;

export type SessionRecap = {
  mostWrongGuesses: { playerName: string; count: number } | null;
  bestQuestions: Array<{ text: string; playerName: string; round: number }>;
  mvpNarrator: { name: string; solvedCount: number } | null;
  fastestSolve: { puzzleTitle: string; solverName: string; questionsAsked: number } | null;
};

/**
 * End-of-session highlights, computed from the same data that's been
 * accumulating all night (case_log, questions, guesses) — a one-time
 * aggregation rather than something tracked live, since it only matters
 * once the game is over.
 */
export async function getSessionRecap(supabase: Client, roomId: string): Promise<SessionRecap> {
  const [caseLog, guesses, questions] = await Promise.all([
    getCaseLogForRoom(supabase, roomId),
    getGuessesForRoom(supabase, roomId),
    getQuestionsForRoom(supabase, roomId),
  ]);

  const wrongCounts = new Map<string, number>();
  for (const guess of guesses) {
    if (guess.status !== "incorrect") continue;
    wrongCounts.set(guess.player_name, (wrongCounts.get(guess.player_name) ?? 0) + 1);
  }
  const wrongEntries = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mostWrongGuesses =
    wrongEntries.length > 0
      ? { playerName: wrongEntries[0][0], count: wrongEntries[0][1] }
      : null;

  const bestQuestions = questions
    .filter((q) => q.is_best_question)
    .map((q) => ({ text: q.text, playerName: q.player_name, round: q.round }));

  const solvedByNarrator = new Map<string, number>();
  for (const entry of caseLog) {
    if (entry.outcome === "solved" && entry.narrator_name) {
      solvedByNarrator.set(
        entry.narrator_name,
        (solvedByNarrator.get(entry.narrator_name) ?? 0) + 1
      );
    }
  }
  const narratorEntries = [...solvedByNarrator.entries()].sort((a, b) => b[1] - a[1]);
  const mvpNarrator =
    narratorEntries.length > 0
      ? { name: narratorEntries[0][0], solvedCount: narratorEntries[0][1] }
      : null;

  const solvedCases = caseLog.filter((entry) => entry.outcome === "solved");
  const fastest =
    solvedCases.length > 0
      ? solvedCases.reduce((best, entry) =>
          entry.questions_asked < best.questions_asked ? entry : best
        )
      : null;
  const fastestSolve =
    fastest && fastest.solver_name
      ? {
          puzzleTitle: fastest.puzzle_title,
          solverName: fastest.solver_name,
          questionsAsked: fastest.questions_asked,
        }
      : null;

  return { mostWrongGuesses, bestQuestions, mvpNarrator, fastestSolve };
}
