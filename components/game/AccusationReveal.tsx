"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Player } from "@/types/player";
import type { RoundAccusation } from "@/types/roundAccusation";
import { tallyAccusationVotes } from "@/lib/game/accusation";
import {
  ACCUSATION_CORRECT_BONUS,
  ACCUSATION_WRONG_PENALTY,
  calculateSaboteurBonus,
} from "@/lib/game/scoring";
import { Card } from "@/components/ui/Card";

// A short suspenseful beat before the result appears — a jury opening the
// envelope, not the answer flashing on screen instantly.
const REVEAL_DELAY_MS = 1400;

export function AccusationReveal({
  players,
  saboteurId,
  accusations,
  playerId,
  wasSolved,
}: {
  players: Player[];
  saboteurId: string;
  accusations: RoundAccusation[];
  playerId: string;
  wasSolved: boolean;
}) {
  const [counting, setCounting] = useState(true);
  const t = useTranslations("AccusationReveal");

  useEffect(() => {
    const timeout = setTimeout(() => setCounting(false), REVEAL_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (counting) {
    return (
      <Card>
        <p className="font-mono text-sm text-text-secondary">{t("counting")}</p>
      </Card>
    );
  }

  const { accusedPlayerId, voteCounts } = tallyAccusationVotes(accusations);
  const wasIdentified = accusedPlayerId === saboteurId;
  const saboteurName = players.find((p) => p.id === saboteurId)?.name ?? "?";
  const accusedName = accusedPlayerId
    ? (players.find((p) => p.id === accusedPlayerId)?.name ?? "?")
    : null;
  const saboteurBonus = calculateSaboteurBonus(wasSolved, wasIdentified);

  const sortedCounts = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);
  const nearMiss =
    !wasIdentified &&
    sortedCounts.length > 0 &&
    sortedCounts.some(([id]) => id === saboteurId);

  const myVote = accusations.find((a) => a.voter_id === playerId);
  const iAmSaboteur = playerId === saboteurId;

  return (
    <Card
      className="border-accent/40"
      style={{ animation: "reveal-in 300ms ease-out" }}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        {t("heading")}
      </p>

      <p className="mt-2 font-serif text-base text-text-primary">
        {accusedName
          ? t(wasIdentified ? "correctlyAccused" : "wrongfullyAccused", { name: accusedName })
          : t("noConsensus")}
      </p>
      <p className="mt-1 font-serif text-base text-text-primary">
        {t("actualSaboteur", { name: saboteurName })}
      </p>
      {nearMiss && <p className="mt-1 font-mono text-xs text-text-secondary">{t("nearMiss")}</p>}

      {iAmSaboteur ? (
        <p className="mt-3 font-mono text-xs text-text-secondary">
          {t("saboteurOutcome", { points: saboteurBonus })}
        </p>
      ) : (
        myVote && (
          <p className="mt-3 font-mono text-xs text-text-secondary">
            {myVote.target_id === saboteurId
              ? t("yourVoteCorrect", { points: ACCUSATION_CORRECT_BONUS })
              : t("yourVoteWrong", { points: ACCUSATION_WRONG_PENALTY })}
          </p>
        )
      )}
    </Card>
  );
}
