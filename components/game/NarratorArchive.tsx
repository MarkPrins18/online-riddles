import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Question } from "@/types/question";
import type { Guess } from "@/types/guess";
import { Badge } from "@/components/ui/Badge";
import { QuestionCard } from "./QuestionCard";

/** Answered questions and reviewed guesses, out of the Verteller's way until they want to look back. */
export function NarratorArchive({
  supabase,
  roomId,
  round,
  questions,
  guesses,
}: {
  supabase: SupabaseClient<Database>;
  roomId: string;
  round: number;
  questions: Question[];
  guesses: Guess[];
}) {
  const answered = [...questions.filter((q) => q.answer !== null)].reverse();
  const resolvedGuesses = [...guesses.filter((g) => g.status !== "pending")].reverse();
  const t = useTranslations("NarratorArchive");

  if (answered.length === 0 && resolvedGuesses.length === 0) {
    return (
      <p className="font-mono text-sm text-text-secondary">{t("empty")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {resolvedGuesses.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("solutionsHeading")}
          </p>
          <ul className="flex flex-col gap-3">
            {resolvedGuesses.map((guess) => (
              <li
                key={guess.id}
                className="flex flex-col gap-2 rounded-md border border-white/10 bg-bg-primary/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-serif text-sm text-text-primary">{guess.text}</p>
                  <p className="font-mono text-xs text-text-secondary">— {guess.player_name}</p>
                </div>
                <Badge tone={guess.status === "correct" ? "accent" : "danger"}>
                  {guess.status === "correct" ? t("correct") : t("incorrect")}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {answered.length > 0 && (
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-secondary">
            {t("questionsHeading")}
          </p>
          <div className="flex flex-col gap-3">
            {answered.map((question) => (
              <QuestionCard
                key={question.id}
                supabase={supabase}
                roomId={roomId}
                round={round}
                question={question}
                narrating
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
