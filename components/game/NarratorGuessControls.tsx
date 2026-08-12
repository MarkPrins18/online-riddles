"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Guess } from "@/types/guess";
import type { Player } from "@/types/player";
import type { Puzzle } from "@/types/puzzle";
import type { Question } from "@/types/question";
import { reviewGuess } from "@/lib/supabase/guesses";
import { incrementScore } from "@/lib/supabase/players";
import { updateRoomStatus, decrementTeamLives } from "@/lib/supabase/rooms";
import { logCaseOutcome } from "@/lib/supabase/caseLog";
import {
  calculateGuessScore,
  calculateNarratorBonus,
  calculateBestQuestionBonus,
  calculateTeamSolveBonus,
  calculateWrongGuessPenalty,
} from "@/lib/game/scoring";
import { Button } from "@/components/ui/Button";

export function NarratorGuessControls({
  supabase,
  roomId,
  round,
  puzzle,
  questions,
  guesses,
  players,
  narratorId,
  hardcoreMode,
  teamLivesRemaining,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  puzzle: Puzzle;
  questions: Question[];
  guesses: Guess[];
  players: Player[];
  narratorId: string | null;
  hardcoreMode: boolean;
  teamLivesRemaining: number | null;
}) {
  const pending = guesses.filter((g) => g.status === "pending");
  // Guards against both a double-click double-awarding one guess, and a
  // second pending guess getting reviewed after the round is already
  // resolved (which would pay out the team bonus twice).
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const narratorPlayer = players.find((p) => p.id === narratorId);
  const narratorName = narratorPlayer?.name ?? null;
  const narratorUserId = narratorPlayer?.user_id ?? null;
  const t = useTranslations("NarratorGuessControls");

  async function handleIncorrect(guess: Guess) {
    setReviewingId(guess.id);
    await reviewGuess(supabase, guess.id, "incorrect");
    await incrementScore(supabase, guess.player_id, -calculateWrongGuessPenalty(), roomId);

    if (hardcoreMode && teamLivesRemaining !== null) {
      const livesLeft = Math.max(0, teamLivesRemaining - 1);
      await decrementTeamLives(supabase, roomId, teamLivesRemaining);

      if (livesLeft === 0) {
        await logCaseOutcome(supabase, {
          roomId,
          round,
          puzzleTitle: puzzle.title,
          difficulty: puzzle.difficulty,
          outcome: "unsolved",
          solverName: null,
          narratorName,
          narratorUserId,
          questionsAsked: questions.length,
        });
      }
    }
    setReviewingId(null);
  }

  async function handleCorrect(guess: Guess) {
    setReviewingId(guess.id);
    await reviewGuess(supabase, guess.id, "correct");

    const solverBonus =
      calculateTeamSolveBonus() + calculateGuessScore(puzzle.difficulty, questions.length);
    await incrementScore(supabase, guess.player_id, solverBonus, roomId);

    for (const player of players) {
      if (player.id === guess.player_id || player.id === narratorId) continue;
      await incrementScore(supabase, player.id, calculateTeamSolveBonus(), roomId);
    }

    if (narratorId) {
      await incrementScore(supabase, narratorId, calculateNarratorBonus(), roomId);
    }

    const bestQuestion = questions.find((q) => q.is_best_question);
    if (bestQuestion) {
      await incrementScore(supabase, bestQuestion.player_id, calculateBestQuestionBonus(), roomId);
    }

    const solverUserId = players.find((p) => p.id === guess.player_id)?.user_id ?? null;
    await logCaseOutcome(supabase, {
      roomId,
      round,
      puzzleTitle: puzzle.title,
      difficulty: puzzle.difficulty,
      outcome: "solved",
      solverName: guess.player_name,
      narratorName,
      solverUserId,
      narratorUserId,
      questionsAsked: questions.length,
    });

    await updateRoomStatus(supabase, roomId, "revealed");
    // Deliberately not clearing reviewingId here: the round is now revealed
    // and this component unmounts (GamePlayClient stops rendering it), so
    // any other still-pending guesses can no longer be reviewed at all.
  }

  if (pending.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("noPending")}</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {pending.map((guess) => (
        <li
          key={guess.id}
          className="flex flex-col gap-2 rounded-md border border-white/10 bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-serif text-sm text-text-primary">{guess.text}</p>
            <p className="font-mono text-xs text-text-secondary">— {guess.player_name}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={() => handleCorrect(guess)}
              disabled={reviewingId !== null}
            >
              {t("correct")}
            </Button>
            <Button
              variant="danger"
              onClick={() => handleIncorrect(guess)}
              disabled={reviewingId !== null}
            >
              {t("incorrect")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
