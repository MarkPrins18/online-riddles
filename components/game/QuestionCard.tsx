"use client";

import { useState } from "react";
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

const ANSWER_LABEL: Record<string, string> = {
  yes: "Ja",
  no: "Nee",
  irrelevant: "N.v.t.",
};

// Flat left-edge color per status — scannable at a glance without reading
// the text, and (unlike the old rotated "pinned note" look) never tilts
// the text itself, which is what made a long list hard to read.
const STATUS_BORDER: Record<string, string> = {
  yes: "border-l-[#3d2609]",
  no: "border-l-[#5a1e13]",
  irrelevant: "border-l-black/25",
  custom: "border-l-[#3d2609]",
  unanswered: "border-l-accent-muted",
};

function AnswerBadge({ answer }: { answer: "yes" | "no" | "irrelevant" }) {
  const styles: Record<typeof answer, string> = {
    yes: "bg-[#3d2609] text-paper",
    no: "bg-[#5a1e13] text-paper",
    irrelevant: "bg-black/15 text-black/70",
  };
  return (
    <span
      className={`shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest ${styles[answer]}`}
    >
      {ANSWER_LABEL[answer]}
    </span>
  );
}

// Single star affordance for "best question" — same icon for everyone, but
// only the narrator can toggle it.
function Star({ isBest, onClick }: { isBest: boolean; onClick?: () => void }) {
  const className = `shrink-0 rounded text-lg leading-none transition-colors ${
    isBest ? "text-accent-muted" : "text-black/25"
  } ${onClick ? "p-1 hover:text-accent-muted" : ""}`;

  if (!onClick) {
    if (!isBest) return null;
    return (
      <span className={className} aria-label="Topvraag">
        ★
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isBest}
      aria-label={isBest ? "Beste vraag (klik om te wissen)" : "Markeer als beste vraag"}
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

  const statusKey = question.answer === "custom" ? "custom" : (question.answer ?? "unanswered");

  return (
    <div
      className={`w-full rounded-md border-l-4 bg-paper p-4 text-ink shadow-sm ${STATUS_BORDER[statusKey]}`}
      style={{ animation: "reveal-in 180ms ease-out" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-black/55">
          — {question.player_name}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {isAnswered && question.answer !== "custom" && (
            <AnswerBadge answer={question.answer as "yes" | "no" | "irrelevant"} />
          )}
          {narrating ? (
            <Star isBest={question.is_best_question} onClick={toggleBestQuestion} />
          ) : (
            <Star isBest={question.is_best_question} />
          )}
        </div>
      </div>
      <p className="mt-1.5 font-serif text-base font-medium leading-snug">{question.text}</p>

      {isAnswered && question.answer === "custom" && (
        <div className="mt-3 border-t border-black/10 pt-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-black/55">Antwoord</p>
          <p className="mt-1 font-serif text-base font-medium italic leading-snug">
            {question.custom_response}
          </p>
        </div>
      )}

      {narrating && !isAnswered && (
        <div className="mt-3 flex flex-col gap-2 border-t border-black/10 pt-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => handleQuickAnswer("yes")}>
              Ja
            </Button>
            <Button variant="danger" onClick={() => handleQuickAnswer("no")}>
              Nee
            </Button>
            <Button variant="secondary" onClick={() => handleQuickAnswer("irrelevant")}>
              N.v.t.
            </Button>
            <Button variant="secondary" onClick={() => setIsWritingCustom((v) => !v)}>
              Eigen antwoord
            </Button>
          </div>
          {isWritingCustom && (
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                value={customDraft}
                onChange={(e) => setCustomDraft(e.target.value)}
                placeholder="Typ een genuanceerd antwoord..."
                aria-label="Genuanceerd antwoord"
                maxLength={200}
                autoFocus
                className="flex-1 rounded-md border border-black/15 bg-white/50 px-3 py-2 font-mono text-sm text-ink placeholder:text-black/40 focus:border-accent-muted"
              />
              <Button type="submit" disabled={!customDraft.trim()}>
                Versturen
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
