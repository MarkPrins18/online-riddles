"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Guess } from "@/types/guess";
import { QuestionForm } from "./QuestionForm";
import { GuessForm } from "./GuessForm";
import { MyGuessFeedback } from "./MyGuessFeedback";

const SWITCH_BUTTON =
  "cursor-pointer rounded-[10px] border-[3px] px-6 py-[11px] font-display text-[22px] uppercase tracking-[0.03em]";

/**
 * The rader's one action row: ask a yes/no question, or — via "Ik weet
 * het!" — switch the same row to submitting a solution. One input at a
 * time keeps the screen to a single obvious thing to do.
 */
export function CaseActionBar({
  supabase,
  roomId,
  puzzleId,
  playerId,
  playerName,
  round,
  guesses,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  puzzleId: string;
  playerId: string;
  playerName: string;
  round: number;
  guesses: Guess[];
}) {
  const [mode, setMode] = useState<"ask" | "solve">("ask");
  const t = useTranslations("GamePlayClient");
  const formProps = { supabase, roomId, puzzleId, playerId, playerName };

  return (
    <div className="flex flex-col gap-2">
      {mode === "ask" ? (
        <QuestionForm
          {...formProps}
          round={round}
          variant="bar"
          trailing={
            <button
              type="button"
              onClick={() => setMode("solve")}
              className={`${SWITCH_BUTTON} border-danger bg-danger text-ink`}
            >
              {t("iKnowIt")}
            </button>
          }
        />
      ) : (
        <GuessForm
          {...formProps}
          variant="bar"
          trailing={
            <button
              type="button"
              onClick={() => setMode("ask")}
              className={`${SWITCH_BUTTON} border-text-primary bg-transparent text-text-primary hover:bg-text-primary hover:text-ink`}
            >
              {t("backToQuestions")}
            </button>
          }
        />
      )}
      <MyGuessFeedback guesses={guesses} playerId={playerId} />
    </div>
  );
}
