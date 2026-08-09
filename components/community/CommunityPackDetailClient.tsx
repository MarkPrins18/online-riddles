"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/authSession";
import { getOwnPack } from "@/lib/supabase/communityPacks";
import { listPuzzlesForPack } from "@/lib/supabase/communityPuzzles";
import { getVoteTotals, getMyVotes } from "@/lib/supabase/votes";
import { getProfiles } from "@/lib/supabase/profiles";
import type { StoryPack, PuzzlePreview } from "@/types/puzzle";
import type { PuzzleVoteTotals, VoteValue } from "@/types/vote";
import { Badge } from "@/components/ui/Badge";
import { RiddleCard } from "@/components/community/RiddleCard";

export function CommunityPackDetailClient({ packId }: { packId: string }) {
  const [pack, setPack] = useState<StoryPack | null | undefined>(undefined);
  const [puzzles, setPuzzles] = useState<PuzzlePreview[]>([]);
  const [totals, setTotals] = useState<Map<string, PuzzleVoteTotals>>(new Map());
  const [myVotes, setMyVotes] = useState<Map<string, VoteValue>>(new Map());
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());
  const t = useTranslations("CommunityPackDetailClient");
  const locale = useLocale();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const userId = await ensureAnonymousSession(supabase);
      const [packRow, puzzleRows] = await Promise.all([
        getOwnPack(supabase, packId, locale),
        listPuzzlesForPack(supabase, packId, locale),
      ]);
      if (cancelled) return;
      setPack(packRow);
      setPuzzles(puzzleRows);

      const ids = puzzleRows.map((p) => p.id);
      const authorIds = puzzleRows.map((p) => p.created_by).filter((id): id is string => !!id);
      const [voteTotals, mine, profiles] = await Promise.all([
        getVoteTotals(supabase, ids),
        getMyVotes(supabase, ids, userId),
        getProfiles(supabase, authorIds),
      ]);
      if (cancelled) return;
      setTotals(voteTotals);
      setMyVotes(mine);
      setAuthorNames(new Map([...profiles].map(([id, profile]) => [id, profile.display_name])));
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [packId, locale]);

  if (pack === undefined) {
    return <p className="font-mono text-sm text-text-secondary">{t("loading")}</p>;
  }

  if (pack === null) {
    return <p className="font-mono text-sm text-text-secondary">{t("notFound")}</p>;
  }

  const sortedPuzzles = [...puzzles].sort(
    (a, b) => (totals.get(b.id)?.score ?? 0) - (totals.get(a.id)?.score ?? 0)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl italic text-text-primary">{pack.name}</h1>
        <div className="mt-2 flex gap-2">
          <Badge tone="accent">{pack.theme}</Badge>
        </div>
      </div>

      {sortedPuzzles.length === 0 ? (
        <p className="font-mono text-sm text-text-secondary">{t("noPuzzles")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sortedPuzzles.map((puzzle) => (
            <RiddleCard
              key={puzzle.id}
              puzzle={puzzle}
              score={totals.get(puzzle.id)?.score ?? 0}
              myVote={myVotes.get(puzzle.id) ?? null}
              authorName={puzzle.created_by ? authorNames.get(puzzle.created_by) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
