"use client";

import { useEffect, useState } from "react";
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
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">
        Hoogtepunten van de avond
      </p>
      <ul className="flex flex-col gap-3 font-mono text-sm leading-relaxed text-text-primary">
        {recap.mvpNarrator && (
          <li>
            MVP Verteller: <span className="text-accent">{recap.mvpNarrator.name}</span> (
            {recap.mvpNarrator.solvedCount}x opgelost)
          </li>
        )}
        {recap.fastestSolve && (
          <li>
            Snelste oplossing: <span className="text-accent">{recap.fastestSolve.solverName}</span>{" "}
            loste &ldquo;{recap.fastestSolve.puzzleTitle}&rdquo; op in{" "}
            {recap.fastestSolve.questionsAsked} vragen
          </li>
        )}
        {recap.bestQuestions.length > 0 && (
          <li>
            Beste vra{recap.bestQuestions.length === 1 ? "ag" : "gen"} van de avond:{" "}
            {recap.bestQuestions.map((q) => `"${q.text}" (${q.playerName})`).join(", ")}
          </li>
        )}
        {recap.mostWrongGuesses && (
          <li>
            Wall of shame: <span className="text-danger">{recap.mostWrongGuesses.playerName}</span>{" "}
            gokte {recap.mostWrongGuesses.count}x mis
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
