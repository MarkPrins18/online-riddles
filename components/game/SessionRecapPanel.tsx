"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSessionRecap, type SessionRecap } from "@/lib/game/recap";
import { Card } from "@/components/ui/Card";

/** Fetched once when the session ends — see lib/game/recap.ts for the aggregation. */
export function SessionRecapPanel({
  supabase,
  roomId,
  bare = false,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  // Renders without its own Card chrome — for nesting inside FinalScoreboard's
  // single bordered card instead of stacking a second gold-bordered box.
  bare?: boolean;
}) {
  const [recap, setRecap] = useState<SessionRecap | null>(null);
  const t = useTranslations("SessionRecapPanel");

  useEffect(() => {
    let cancelled = false;
    getSessionRecap(supabase, roomId).then((result) => {
      if (!cancelled) setRecap(result);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, roomId]);

  if (!recap) return null;

  const hasHighlights =
    recap.mvpNarrator || recap.fastestSolve || recap.bestQuestions.length > 0 || recap.mostWrongGuesses;
  if (!hasHighlights) return null;

  const content = (
    <>
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">{t("heading")}</p>
      <ul className="flex flex-col gap-3 font-mono text-sm leading-relaxed text-text-primary">
        {recap.mvpNarrator && (
          <li>
            {t("mvpNarrator", {
              name: recap.mvpNarrator.name,
              count: recap.mvpNarrator.solvedCount,
            })}
          </li>
        )}
        {recap.fastestSolve && (
          <li>
            {t("fastestSolve", {
              name: recap.fastestSolve.solverName,
              title: recap.fastestSolve.puzzleTitle,
              count: recap.fastestSolve.questionsAsked,
            })}
          </li>
        )}
        {recap.bestQuestions.length > 0 && (
          <li>
            {t("bestQuestions", {
              count: recap.bestQuestions.length,
              list: recap.bestQuestions.map((q) => `"${q.text}" (${q.playerName})`).join(", "),
            })}
          </li>
        )}
        {recap.mostWrongGuesses && (
          <li>
            {t("wallOfShame", {
              name: recap.mostWrongGuesses.playerName,
              count: recap.mostWrongGuesses.count,
            })}
          </li>
        )}
      </ul>
    </>
  );

  if (bare) {
    return <div className="mt-8 border-t border-white/5 pt-6">{content}</div>;
  }

  return <Card className="mt-4">{content}</Card>;
}
