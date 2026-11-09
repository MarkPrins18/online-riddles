"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Player } from "@/types/player";
import type { RoundAccusation } from "@/types/roundAccusation";
import { castAccusationVote } from "@/lib/supabase/roundAccusations";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";

const URGENT_THRESHOLD_SECONDS = 10;

/**
 * The post-reveal "who was the saboteur?" vote — every rader votes,
 * including the saboteur themselves (their own vote is just noise toward
 * the tally, same as anyone else's). Votes are hidden from each other
 * until the window closes (see round_accusations' RLS), so nothing here
 * shows live tallies, only "you voted for X" for your own choice. Voting
 * again before the window closes changes your vote (upsert).
 */
export function AccusationPanel({
  supabase,
  roomId,
  round,
  playerId,
  players,
  narratorId,
  narrating,
  isSpectator,
  myVote,
  secondsLeft,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  playerId: string;
  players: Player[];
  narratorId: string | null;
  narrating: boolean;
  isSpectator: boolean;
  myVote: RoundAccusation | undefined;
  secondsLeft: number | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("AccusationPanel");

  const candidates = players.filter((p) => !p.is_spectator && p.id !== narratorId);
  const isUrgent = secondsLeft !== null && secondsLeft <= URGENT_THRESHOLD_SECONDS;

  async function handleVote(targetId: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      await castAccusationVote(supabase, { roomId, round, voterId: playerId, targetId });
    } catch (err) {
      setError(getErrorMessage(err, t("error")));
    }
    setIsSubmitting(false);
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl uppercase text-accent">{t("heading")}</h2>
        {secondsLeft !== null && (
          <span
            className={`rounded px-2.5 py-0.5 font-display text-lg tabular-nums text-ink ${isUrgent ? "bg-danger" : "bg-accent"}`}
          >
            {isUrgent && "⚠ "}
            {t("secondsLeft", { seconds: secondsLeft })}
          </span>
        )}
      </div>

      {narrating || isSpectator ? (
        <p className="mt-3 text-sm text-text-secondary">
          {narrating ? t("narratorDoesNotVote") : t("spectatorDoesNotVote")}
        </p>
      ) : (
        <>
          <p className="mt-2 text-base text-text-primary/90">{t("instructions")}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {candidates.map((candidate) => {
              const isMyVote = myVote?.target_id === candidate.id;
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => handleVote(candidate.id)}
                    disabled={isSubmitting}
                    aria-pressed={isMyVote}
                    className={`w-full cursor-pointer rounded-lg border-2 px-4 py-3 text-left text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      isMyVote
                        ? "border-accent bg-accent text-ink"
                        : "border-border bg-bg-primary text-text-primary hover:border-accent"
                    }`}
                  >
                    {candidate.name}
                  </button>
                </li>
              );
            })}
          </ul>
          {myVote && (
            <p className="mt-3 text-sm text-text-secondary">
              {t("youVotedFor", {
                name: players.find((p) => p.id === myVote.target_id)?.name ?? "?",
              })}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
