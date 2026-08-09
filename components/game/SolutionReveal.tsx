"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Puzzle } from "@/types/puzzle";
import type { VoteValue } from "@/types/vote";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getVoteTotals, getMyVote } from "@/lib/supabase/votes";
import { VoteButtons } from "@/components/community/VoteButtons";

export function SolutionReveal({
  supabase,
  puzzle,
  solverName,
}: {
  supabase: SupabaseClient<Database>;
  puzzle: Puzzle;
  solverName?: string;
}) {
  // puzzle_votes/puzzle_vote_totals don't distinguish official from
  // community puzzles — this works for either, and now doubles as a
  // quality signal for official packs, which previously had no feedback
  // mechanism at all.
  const [voteState, setVoteState] = useState<{ score: number; myVote: VoteValue | null } | null>(
    null
  );
  const t = useTranslations("SolutionReveal");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const userId = await ensureAnonymousSession(supabase);
      const [totals, myVote] = await Promise.all([
        getVoteTotals(supabase, [puzzle.id]),
        getMyVote(supabase, puzzle.id, userId),
      ]);
      if (cancelled) return;
      setVoteState({ score: totals.get(puzzle.id)?.score ?? 0, myVote });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, puzzle.id]);

  return (
    <div
      className="redact-reveal rounded-lg border border-accent/40 bg-bg-secondary p-6 shadow-lg shadow-accent/10"
      style={{ animation: "reveal-in 420ms cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        {t("caseClosed")}
      </p>
      <h2 className="mt-2 font-serif text-2xl text-text-primary">{puzzle.title}</h2>
      <p className="mt-1 font-mono text-sm text-accent">
        {solverName ? t("solvedBy", { name: solverName }) : t("nobodySolved")}
      </p>
      <p className="mt-4 font-serif text-base leading-relaxed text-text-primary/90">
        {puzzle.solution}
      </p>
      {voteState && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <p className="font-mono text-xs text-text-secondary">{t("ratePrompt")}</p>
          <VoteButtons puzzleId={puzzle.id} score={voteState.score} myVote={voteState.myVote} />
        </div>
      )}
    </div>
  );
}
