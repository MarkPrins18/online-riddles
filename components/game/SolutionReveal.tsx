"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RevealCard } from "@/components/ui/RevealCard";
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
    <RevealCard
      label={t("caseClosed")}
      title={puzzle.title}
      subtitle={solverName ? t("solvedBy", { name: solverName }) : t("nobodySolved")}
    >
      <p className="text-lg leading-relaxed text-text-primary/90">{puzzle.solution}</p>
      {voteState && (
        <div className="mt-5 flex flex-col gap-3 border-t-2 border-dashed border-[#3a3a3a] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-bold text-text-primary">{t("ratePrompt")}</p>
          <VoteButtons puzzleId={puzzle.id} score={voteState.score} myVote={voteState.myVote} />
        </div>
      )}
    </RevealCard>
  );
}
