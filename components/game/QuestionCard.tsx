"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import {
  answerQuestion,
  answerQuestionCustom,
  markBestQuestion,
  unmarkBestQuestion,
} from "@/lib/supabase/questions";
import { Button } from "@/components/ui/Button";

// Anton label, as on a paperback cover: yellow for yes, red for no, an
// outline for "not relevant". The word itself always carries the meaning,
// never the color alone.
function AnswerBadge({ answer }: { answer: "yes" | "no" | "irrelevant" }) {
  const t = useTranslations("QuestionCard");
  const styles: Record<typeof answer, string> = {
    yes: "bg-accent px-2.5 py-[3px] text-ink",
    no: "bg-danger px-2.5 py-[3px] text-ink",
    irrelevant: "border-2 border-[#5a5a5a] px-2 py-px text-text-secondary",
  };
  const labels: Record<typeof answer, string> = {
    yes: t("answerYes"),
    no: t("answerNo"),
    irrelevant: t("answerIrrelevant"),
  };
  return (
    <span
      className={`shrink-0 font-display text-[15px] uppercase tracking-[0.04em] ${styles[answer]}`}
    >
      {labels[answer]}
    </span>
  );
}

// Single star affordance for "best question" — same icon for everyone, but
// only the narrator can toggle it.
function Star({ isBest, onClick }: { isBest: boolean; onClick?: () => void }) {
  const t = useTranslations("QuestionCard");
  const className = `shrink-0 rounded text-lg leading-none transition-colors ${
    isBest ? "text-accent" : "text-text-secondary/50"
  } ${onClick ? "p-1 hover:text-accent" : ""}`;

  if (!onClick) {
    if (!isBest) return null;
    return (
      <span className={className} aria-label={t("bestQuestionAriaLabel")}>
        ★
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isBest}
      aria-label={isBest ? t("bestQuestionToggleOn") : t("bestQuestionToggleOff")}
      className={className}
    >
      {isBest ? "★" : "☆"}
    </button>
  );
}

/**
 * One entry in the interrogation log — every question asked this round,
 * pinned like a clue the moment it's asked, not only once answered "yes".
 * The single place questions live now (was split across a clues board, a
 * chat-drawer transcript, and a separate narrator-only queue).
 */
export function QuestionCard({
  supabase,
  roomId,
  round,
  question,
  narrating,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  question: Question;
  narrating: boolean;
}) {
  const [customDraft, setCustomDraft] = useState("");
  const [isWritingCustom, setIsWritingCustom] = useState(false);
  const t = useTranslations("QuestionCard");

  const isAnswered = question.answer !== null;

  async function handleQuickAnswer(answer: "yes" | "no" | "irrelevant") {
    await answerQuestion(supabase, question.id, answer);
  }

  async function handleCustomSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!customDraft.trim()) return;
    await answerQuestionCustom(supabase, question.id, customDraft.trim());
    setCustomDraft("");
    setIsWritingCustom(false);
  }

  async function toggleBestQuestion() {
    if (question.is_best_question) {
      await unmarkBestQuestion(supabase, question.id);
    } else {
      await markBestQuestion(supabase, roomId, round, question.id);
    }
  }

  return (
    <div
      className="w-full border-b border-dashed border-[#3a3a3a] py-2.5 text-text-primary last:border-b-0"
      style={{ animation: "reveal-in 180ms ease-out" }}
    >
      <div className="flex items-center gap-3">
        <p
          className={`min-w-0 flex-1 text-base ${
            question.answer === "irrelevant" ? "text-text-secondary" : ""
          }`}
        >
          {question.text}{" "}
          <span className="text-[13px] text-[#8c8578]">— {question.player_name}</span>
        </p>
        {narrating ? (
          <Star isBest={question.is_best_question} onClick={toggleBestQuestion} />
        ) : (
          <Star isBest={question.is_best_question} />
        )}
        {isAnswered && question.answer !== "custom" && (
          <AnswerBadge answer={question.answer as "yes" | "no" | "irrelevant"} />
        )}
        {!isAnswered && (
          <span className="shrink-0 border-2 border-accent px-2 py-px font-display text-[15px] text-accent">
            ?
          </span>
        )}
      </div>

      {isAnswered && question.answer === "custom" && (
        <div className="mt-2 rounded-md bg-bg-primary px-3 py-2">
          <p className="text-xs font-bold text-text-secondary">
            {t("answerHeading")}
          </p>
          <p className="mt-0.5 text-base font-medium leading-snug">
            {question.custom_response}
          </p>
        </div>
      )}

      {narrating && !isAnswered && (
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => handleQuickAnswer("yes")}>
              {t("quickYes")}
            </Button>
            <Button variant="danger" onClick={() => handleQuickAnswer("no")}>
              {t("quickNo")}
            </Button>
            <Button variant="secondary" onClick={() => handleQuickAnswer("irrelevant")}>
              {t("quickIrrelevant")}
            </Button>
            <Button variant="secondary" onClick={() => setIsWritingCustom((v) => !v)}>
              {t("customAnswer")}
            </Button>
          </div>
          {isWritingCustom && (
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder={t("customPlaceholder")}
                aria-label={t("customAriaLabel")}
                maxLength={200}
                autoFocus
                className="flex-1 rounded-lg border-2 border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent"
              />
              <Button type="submit" disabled={!customDraft.trim()}>
                {t("submit")}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
